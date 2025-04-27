// app.js

require('dotenv').config();
const express        = require('express');
const path           = require('path');
const http           = require('http');
const socketIO       = require('socket.io');
const session        = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const multer         = require('multer');
const { sequelize, Admin } = require('./models');

const app    = express();
const server = http.createServer(app);
const io     = socketIO(server);

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

// ————— Multer for file uploads —————
const upload = multer({
  dest: path.join(__dirname, 'public', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }  // max 10MB
});
// make it available in req.app.locals.upload
app.locals.upload = upload;

// ————— Routes —————

// Auth routes & page
app.get('/', (req, res) => res.render('auth'));
app.use('/', require('./routes/auth'));

// Admin guard middleware
function isAdmin(req, res, next) {
  if (req.session.adminId) return next();
  res.redirect('/');
}

// Admin routes & announcement-CRUD
const adminRouter = require('./routes/admin')(io);
app.use('/admin', isAdmin, adminRouter);

// Mount announcements routes under admin (uses the same isAdmin guard)
app.use(
  '/admin/api/announcements',
  isAdmin,
  require('./routes/announcements')(io)
);

// User guard middleware
function isUser(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/');
}

// User (dashboard) routes
app.use('/dashboard', isUser, require('./routes/user'));

// Group-routes (panel grouping)
const groupRoutes = require('./routes/group');
app.use('/api/groups', isUser, groupRoutes);

// ————— Socket.IO connection logging —————
io.on('connection', socket => console.log('Socket connected:', socket.id));

// ————— Seed default admin & start server —————
async function seedAdmin() {
  const exists = await Admin.findOne({
    where: { phoneNumber: '09912807001' }
  });
  if (!exists) {
    await Admin.create({
      phoneNumber: '09912807001',
      password: 'F@rdad6831'
    });
  }
}

sequelize.sync().then(async () => {
  await seedAdmin();
  const port = process.env.PORT || 8000;
  server.listen(port, () => console.log(`Listening on port ${port}`));
});
