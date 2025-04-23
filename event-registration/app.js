require('dotenv').config();
const express               = require('express');
const path                  = require('path');
const http                  = require('http');
const socketIO              = require('socket.io');
const session               = require('express-session');
const SequelizeStore        = require('connect-session-sequelize')(session.Store);
const { sequelize, Admin }  = require('./models');

const app    = express();
const server = http.createServer(app);
const io     = socketIO(server);

// —— Session store با SQLite ——
const sessionStore = new SequelizeStore({ db: sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 }
}));
sessionStore.sync();

// —— EJS و فایل‌های استاتیک ——
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// —— مسیر اصلی Auth ——
app.get('/', (req, res) => res.render('auth'));

// —— routes ——
app.use('/', require('./routes/auth'));

// —— middleware بررسی Admin ——
function isAdmin(req, res, next) {
  if (req.session.adminId) return next();
  res.redirect('/');
}

// —— Admin routes (با io) ——
app.use('/admin', isAdmin, require('./routes/admin')(io));

// —— Socket.IO ——
io.on('connection', socket => {
  console.log('Socket connected:', socket.id);
});

// —— سینک DB و سیید Admin پیش‌فرض ——
async function seedAdmin() {
  const exists = await Admin.findOne({ where: { phoneNumber: '09912807001' } });
  if (!exists) {
    await Admin.create({ phoneNumber: '09912807001', password: 'F@rdad6831' });
    console.log('Default admin created');
  }
}
sequelize.sync().then(async () => {
  await seedAdmin();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
});
