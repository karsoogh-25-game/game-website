// app.js
require('dotenv').config();
const express        = require('express');
const path           = require('path');
const http           = require('http');
const socketIO       = require('socket.io');
const session        = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize, Admin } = require('./models');

const app    = express();
const server = http.createServer(app);
const io     = socketIO(server);

// ———— make io available in controllers ————
app.set('io', io);

// ————— Session setup —————
const sessionStore = new SequelizeStore({ db: sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }  // 1 day
}));
sessionStore.sync();

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

// 1. Auth & login page
app.get('/', (req, res) => res.render('auth'));
app.use('/', require('./routes/auth'));

// 2. Admin panel (pages & API)
const adminRouter = require('./routes/admin')(io);
app.use('/admin', isAdmin, adminRouter);

// 3. Announcements router (public & admin)
const announcementsRouter = require('./routes/announcements')(io);
// 3a. Public: list announcements
app.use('/api/announcements', announcementsRouter);
// 3b. Admin: CRUD announcements
app.use('/admin/api/announcements', isAdmin, announcementsRouter);

// 4. Admin Groups CRUD API
const adminGroupsRouter = require('./routes/adminGroups')(io);
app.use('/admin/api/groups', isAdmin, adminGroupsRouter);

// 5. User panel (dashboard & groups)
const groupRoutes = require('./routes/group');
app.use('/api/groups', isUser, groupRoutes);
app.use('/dashboard', isUser, require('./routes/user'));

// ————— 6. training content (public & admin) —————
// برای ثبت GET/POST/DELETE های آموزشی، باید تابع را با io فراخوانی کنیم
const trainingRouter = require('./routes/training')(io);

// 6a. Public API: لیست محتواها
app.use('/api/training', isUser, trainingRouter);

// 6b. Admin API: ایجاد/آپدیت/حذف محتوا (اینجا می‌توان لاگین ادمین را اجباری کرد)
app.use('/admin/api/training', isAdmin, trainingRouter);


// ————— Socket.IO logging —————
io.on('connection', socket => {
  console.log('Socket connected:', socket.id);
});

// ————— Seed default admin & start server —————
async function seedAdmin() {
  const exists = await Admin.findOne({ where: { phoneNumber: '09912807001' } });
  if (!exists) {
    await Admin.create({ phoneNumber: '09912807001', password: 'F@rdad6831' });
  }
}

sequelize.sync().then(async () => {
  await seedAdmin();
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Listening on port ${port}`));
});
