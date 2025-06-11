require('dotenv').config();

const express = require('express');
const path = require('path');
const http = require('http');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const socketIO = require('socket.io');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize, Admin, GroupMember, FeatureFlag } = require('./models');

// --- START OF EDIT: متغیرهای کلاینت Redis به اسکوپ بالاتر منتقل شد ---
let pubClient;
let subClient;
// --- END OF EDIT ---

const app = express();
const server = http.createServer(app);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'a-default-fallback-secret-for-development',
  store: new SequelizeStore({ db: sequelize }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
});

const io = socketIO(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

app.use(sessionMiddleware);
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

async function setupRedisAdapter() {
  // --- START OF EDIT: کلاینت‌ها به متغیرهای بیرونی مقداردهی می‌شوند ---
  pubClient = createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` });
  subClient = pubClient.duplicate();
  // --- END OF EDIT ---

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));
  console.log('Socket.IO Redis adapter connected successfully.');
}

setupRedisAdapter().catch(err => {
  console.error('FATAL: Failed to connect Redis adapter:', err);
  process.exit(1);
});

app.set('io', io);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function isAdmin(req, res, next) {
  if (req.session.adminId) return next();
  res.redirect('/');
}
function isUser(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/');
}

app.get('/', (req, res) => res.render('auth'));
app.use('/', require('./routes/auth'));

const adminRouter = require('./routes/admin')(io);
app.use('/admin', isAdmin, adminRouter);

const announcementsRouter = require('./routes/announcements')(io);
app.use('/api/announcements', announcementsRouter);
app.use('/admin/api/announcements', isAdmin, announcementsRouter);

const adminGroupsRouter = require('./routes/adminGroups')(io);
app.use('/admin/api/groups', isAdmin, adminGroupsRouter);

const trainingRouter = require('./routes/training')(io);
app.use('/api/training', isUser, trainingRouter);
app.use('/admin/api/training', isAdmin, trainingRouter);

const adminShopRouter = require('./routes/adminShop');
app.use('/admin/api/shop', isAdmin, adminShopRouter);

const adminUniqueItemsRouter = require('./routes/adminUniqueItems');
app.use('/admin/api/unique-items', isAdmin, adminUniqueItemsRouter);

const shopRouter = require('./routes/shop');
app.use('/api/shop', isUser, shopRouter);

const shopUniqueItemsRouter = require('./routes/shopUniqueItems');
app.use('/api/shop/unique-items', isUser, shopUniqueItemsRouter);

const groupRoutes = require('./routes/group');
app.use('/api/groups', isUser, groupRoutes);
app.use('/dashboard', isUser, require('./routes/user'));

app.get('/api/features/initial', isUser, async (req, res) => {
    try {
        const allFlags = await FeatureFlag.findAll({
            attributes: ['name', 'isEnabled']
        });
        const flagsObject = allFlags.reduce((acc, flag) => {
            acc[flag.name] = flag.isEnabled;
            return acc;
        }, {});
        res.json(flagsObject);
    } catch (err) {
        console.error("Error fetching initial feature flags:", err);
        res.status(500).json({ message: "خطا در دریافت تنظیمات اولیه" });
    }
});


io.on('connection', socket => {
  console.log(`Socket connected: ${socket.id}`);

  // --- START of Radio Logic (EDITED for Redis) ---
  socket.on('join-radio', () => {
    socket.join('radio-listeners');
    console.log(`Socket ${socket.id} joined the radio room.`);
  });

  socket.on('leave-radio', () => {
    socket.leave('radio-listeners');
    console.log(`Socket ${socket.id} left the radio room.`);
  });

  socket.on('start-broadcast', async () => {
    await pubClient.set('radio:isLive', 'true'); // ذخیره وضعیت در Redis
    io.emit('radio-started');
    console.log(`Broadcast started by admin (socket ${socket.id})`);
  });

  socket.on('stop-broadcast', async () => {
    await pubClient.del('radio:isLive'); // حذف کلید وضعیت از Redis
    io.emit('radio-stopped');
    console.log(`Broadcast stopped by admin (socket ${socket.id})`);
  });
  
  socket.on('audio-stream', (audioChunk) => {
    io.to('radio-listeners').emit('audio-stream', audioChunk);
  });

  // رویداد جدید برای گرفتن وضعیت فعلی رادیو از Redis
  socket.on('get-radio-status', async (callback) => {
    if (typeof callback === 'function') {
      const status = await pubClient.get('radio:isLive');
      callback(status === 'true'); // ارسال وضعیت خوانده شده از Redis
    }
  });
  // --- END of Radio Logic (EDITED for Redis) ---

  socket.on('joinAdminRoom', () => {
    if (socket.request.session.adminId) {
      socket.join('admins');
      console.log(`Socket ${socket.id} joined room: admins`);
    }
  });

  socket.on('joinGroupRoom', async (groupId) => {
    const userId = socket.request.session.userId;

    if (userId && groupId) {
      try {
        const membership = await GroupMember.findOne({
          where: {
            userId: userId,
            groupId: groupId
          }
        });
        if (membership) {
          socket.join(`group-${groupId}`);
          console.log(`Socket ${socket.id} joined secure room: group-${groupId}`);
        } else {
          console.warn(`Unauthorized attempt by socket ${socket.id} to join room: group-${groupId}`);
        }
      } catch (error) {
        console.error(`Database error on joinGroupRoom for socket ${socket.id}:`, error);
      }
    }
  });
  
  socket.on('leaveGroupRoom', (groupId) => {
    if (groupId) {
      socket.leave(`group-${groupId}`);
      console.log(`Socket ${socket.id} left room: group-${groupId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

async function seedAdmin() {
  const exists = await Admin.findOne({ where: { phoneNumber: '09912807001' } });
  if (!exists) {
    await Admin.create({ phoneNumber: '09912807001', password: 'F@rdad6831' });
  }
}

async function seedFeatureFlags() {
  const features = [
    { name: 'menu_dashboard', displayName: 'منوی داشبورد', isEnabled: true, category: 'menu' },
    { name: 'menu_groups', displayName: 'منوی گروه من', isEnabled: true, category: 'menu' },
    { name: 'menu_scoreboard', displayName: 'منوی جدول امتیازات', isEnabled: true, category: 'menu' },
    { name: 'menu_shop', displayName: 'منوی فروشگاه', isEnabled: true, category: 'menu' },
    { name: 'menu_bank', displayName: 'منوی بانک', isEnabled: true, category: 'menu' },
    { name: 'menu_training', displayName: 'منوی آموزش‌ها', isEnabled: true, category: 'menu' },
    { name: 'menu_announcements', displayName: 'منوی اطلاعیه‌ها', isEnabled: true, category: 'menu' },
    { name: 'menu_radio', displayName: 'منوی رادیو', isEnabled: true, category: 'menu' },
    { name: 'action_group_leave', displayName: 'عملیات خروج از گروه', isEnabled: true, category: 'action' },
    { name: 'action_group_delete', displayName: 'عملیات حذف گروه (توسط سرگروه)', isEnabled: true, category: 'action' }
  ];

  for (const feature of features) {
    await FeatureFlag.findOrCreate({
      where: { name: feature.name },
      defaults: feature
    });
  }
  console.log('Feature flags seeded successfully.');
}

sequelize.sync().then(async () => {
  console.log('Database synced successfully.');
  await seedAdmin();
  await seedFeatureFlags();
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Server is listening on port ${port}`));
}).catch(err => {
    console.error('Failed to sync database:', err);
});