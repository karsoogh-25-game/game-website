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

// Session
const sessionStore = new SequelizeStore({ db: sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));
sessionStore.sync();

// view engine & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth routes & page
app.get('/', (req,res)=>res.render('auth'));
app.use('/', require('./routes/auth'));

// Admin guard
function isAdmin(req,res,next){
  if (req.session.adminId) return next();
  res.redirect('/');
}
// Admin routes
app.use('/admin', isAdmin, require('./routes/admin')(io));

// User guard
function isUser(req,res,next){
  if (req.session.userId) return next();
  res.redirect('/');
}
// User (dashboard) routes
app.use('/dashboard', isUser, require('./routes/user'));

// socket
io.on('connection', s=> console.log('Socket:', s.id));

// seed admin & start
async function seedAdmin(){
  const exists = await Admin.findOne({ where:{ phoneNumber:'09912807001' } });
  if (!exists) await Admin.create({ phoneNumber:'09912807001', password:'F@rdad6831' });
}
sequelize.sync().then(async()=>{
  await seedAdmin();
  server.listen(process.env.PORT||3000, ()=>console.log('Listening'));
});
