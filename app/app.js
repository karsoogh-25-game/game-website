// app.js

// با این دستور، متغیرهای تعریف شده در فایل .env یا secret های داکر
// در process.env در دسترس قرار می‌گیرند
require('dotenv').config();

const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize, Admin } = require('./models');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// ———— make io available in controllers ————
app.set('io', io);

// ————— Session setup —————
const sessionStore = new SequelizeStore({ db: sequelize });
app.use(session({
  // اگر متغیر محیطی تعریف نشده بود، از یک مقدار پیش‌فرض امن استفاده کن
  secret: process.env.SESSION_SECRET || 'a-default-fallback-secret-for-development',
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

// صبر می‌کنیم تا اتصال به دیتابیس و همگام‌سازی جداول با موفقیت انجام شود
// و سپس سرور را اجرا می‌کنیم
sequelize.sync().then(async () => {
  console.log('Database synced successfully.');
  await seedAdmin();
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Server is listening on port ${port}`));
}).catch(err => {
    // اگر اتصال به دیتابیس با خطا مواجه شد، آن را در لاگ نمایش بده
    console.error('Failed to sync database:', err);
});