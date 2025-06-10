// public/js/socket-manager.js

(function() {
  if (window.socket) {
    return;
  }

  console.log('Initializing shared socket connection...');
  
  const socket = io({
    transports: ['websocket'] 
  });

  window.socket = socket;

  // آبجکت گلوبال برای نگهداری وضعیت قابلیت‌ها.
  window.featureFlags = {};

  // تابع کمکی برای بررسی فعال بودن قابلیت‌ها.
  window.isFeatureEnabled = function(featureName) {
    return !!window.featureFlags[featureName];
  };

  // تابعی برای دریافت وضعیت اولیه فلگ‌ها از API.
  async function fetchInitialFlags() {
    // اگر در صفحه ادمین هستیم، نیازی به دریافت فلگ‌های اولیه نیست.
    if (window.location.pathname.startsWith('/admin')) return;
    try {
      const response = await axios.get('/api/features/initial');
      window.featureFlags = response.data;
      console.log('Feature flags loaded successfully:', window.featureFlags);
      // یک رویداد سفارشی منتشر می‌کنیم تا سایر اسکریپت‌ها (مانند group.js)
      // بدانند که می‌توانند کار خود را شروع کنند.
      document.dispatchEvent(new CustomEvent('feature-flags-loaded'));
    } catch (error) {
      console.error('Failed to fetch initial feature flags:', error);
    }
  }
  
  socket.on('connect', () => {
    console.log('Socket successfully connected with transport:', socket.io.engine.transport.name);
    // در هنگام اتصال، وضعیت اولیه را دریافت می‌کنیم.
    fetchInitialFlags();
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });
  
  // به رویداد 'force-reload' برای آپدیت‌های لحظه‌ای گوش می‌دهیم.
  socket.on('force-reload', (data) => {
    console.log('Force reload command received from server:', data.message);

    // --- START OF FIX: اضافه کردن شرط برای جلوگیری از ریلود ادمین ---
    // اگر آدرس فعلی صفحه با '/admin' شروع شود، از ریلود شدن جلوگیری کن.
    if (window.location.pathname.startsWith('/admin')) {
        console.log('Admin panel detected. Aborting force-reload.');
        return; 
    }
    // --- END OF FIX ---
    
    if (typeof sendNotification === 'function') {
        sendNotification('info', 'تنظیمات سایت توسط ادمین به‌روز شد. صفحه مجدداً بارگذاری می‌شود...');
    }

    setTimeout(() => {
        location.reload(true); 
    }, 1500); 
  });

})();
