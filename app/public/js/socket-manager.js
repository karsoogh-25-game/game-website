// public/js/socket-manager.js

(function() {
  if (window.socket) {
    return;
  }

  console.log('Initializing shared socket connection...');
  
  // ======================= FINAL CLIENT FIX =======================
  // به کلاینت می‌گوییم که فقط از WebSockets استفاده کند.
  // این کار از بروز خطاهای Polling در محیط‌های پروکسی‌شده جلوگیری می‌کند.
  const socket = io({
    transports: ['websocket'] 
  });
  // ===================== END FINAL CLIENT FIX =====================

  window.socket = socket;

  // اضافه کردن لاگ برای مشاهده وضعیت اتصال
  socket.on('connect', () => {
    console.log('Socket successfully connected with transport:', socket.io.engine.transport.name);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

})();