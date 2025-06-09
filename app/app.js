// app.js

require('dotenv').config();

const express = require('express');
const path = require('path');
const http = require('http');
const { createClient } = require('redis'); // ایمپورت کردن کلاینت Redis
const { createAdapter } = require('@socket.io/redis-adapter'); // ایمپورت کردن آداپتور
const socketIO = require('socket.io');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize, Admin } = require('./models');

const app = express();
const server = http.createServer(app);

// تعریف Session Middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'a-default-fallback-secret-for-development',
  store: new SequelizeStore({ db: sequelize }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
});

// ساخت سرور Socket.IO
const io = socketIO(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

// به اشتراک‌گذاری Session Middleware با Express و Socket.IO
app.use(sessionMiddleware);
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// ======================= REDIS ADAPTER SETUP =======================
// این تابع آداپتور را به Socket.IO متصل می‌کند
async function setupRedisAdapter() {
  const pubClient = createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` });
  const subClient = pubClient.duplicate();

  // منتظر اتصال هر دو کلاینت به ردیس می‌مانیم
  await Promise.all([pubClient.connect(), subClient.connect()]);

  // آداپتور را به نمونه اصلی io متصل می‌کنیم
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Socket.IO Redis adapter connected successfully.');
}

// اجرای تابع برای فعال‌سازی آداپتور و مدیریت خطا
setupRedisAdapter().catch(err => {
  console.error('FATAL: Failed to connect Redis adapter:', err);
  process.exit(1); // در صورت عدم اتصال، برنامه را متوقف می‌کنیم
});
// ===================== END REDIS ADAPTER SETUP =====================

// ———— make io available in controllers ————
app.set('io', io);

// ————— View engine & static files —————
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ————— Body parsers —————
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ————— Middlewares —————
function isAdmin(req, res, next) {
  if (req.session.adminId) return next();
  res.redirect('/');
}
function isUser(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/');
}

// ————— Routes —————
app.get('/', (req, res) => res.render('auth'));
app.use('/', require('./routes/auth'));

const adminRouter = require('./routes/admin')(io);
app.use('/admin', isAdmin, adminRouter);

const announcementsRouter = require('./routes/announcements')(io);
app.use('/api/announcements', announcementsRouter);
app.use('/admin/api/announcements', isAdmin, announcementsRouter);

const adminGroupsRouter = require('./routes/adminGroups')(io);
app.use('/admin/api/groups', isAdmin, adminGroupsRouter);

const groupRoutes = require('./routes/group');
app.use('/api/groups', isUser, groupRoutes);
app.use('/dashboard', isUser, require('./routes/user'));

const trainingRouter = require('./routes/training')(io);
app.use('/api/training', isUser, trainingRouter);
app.use('/admin/api/training', isAdmin, trainingRouter);


// ————— Socket.IO Room Management —————
io.on('connection', socket => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('joinAdminRoom', () => {
    if (socket.request.session.adminId) {
      socket.join('admins');
      console.log(`Socket ${socket.id} joined room: admins`);
    }
  });

  socket.on('joinGroupRoom', (groupId) => {
    if (socket.request.session.userId && groupId) {
      socket.join(`group-${groupId}`);
      console.log(`Socket ${socket.id} joined room: group-${groupId}`);
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

// ————— Seed & Start —————
async function seedAdmin() {
  const exists = await Admin.findOne({ where: { phoneNumber: '09912807001' } });
  if (!exists) {
    await Admin.create({ phoneNumber: '09912807001', password: 'F@rdad6831' });
  }
}

sequelize.sync().then(async () => {
  console.log('Database synced successfully.');
  await seedAdmin();
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Server is listening on port ${port}`));
}).catch(err => {
    console.error('Failed to sync database:', err);
});
