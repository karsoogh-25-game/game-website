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

  window.featureFlags = {};

  window.isFeatureEnabled = function(featureName) {
    return !!window.featureFlags[featureName];
  };

  async function fetchInitialFlags() {
    if (window.location.pathname.startsWith('/admin')) return;
    try {
      const response = await axios.get('/api/features/initial');
      window.featureFlags = response.data;
      console.log('Feature flags loaded successfully:', window.featureFlags);
      document.dispatchEvent(new CustomEvent('feature-flags-loaded'));
    } catch (error) {
      console.error('Failed to fetch initial feature flags:', error);
    }
  }
  
  socket.on('connect', () => {
    console.log('Socket successfully connected with transport:', socket.io.engine.transport.name);
    fetchInitialFlags();
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });
  
  socket.on('force-reload', (data) => {
    console.log('Force reload command received from server:', data.message);

    if (window.location.pathname.startsWith('/admin')) {
        console.log('Admin panel detected. Aborting force-reload.');
        return; 
    }
    
    if (typeof sendNotification === 'function') {
        sendNotification('info', 'تنظیمات سایت توسط ادمین به‌روز شد. صفحه مجدداً بارگذاری می‌شود...');
    }

    setTimeout(() => {
        location.reload(true); 
    }, 1500); 
  });

  socket.on('radio-started', () => {
    if (window.location.pathname.startsWith('/admin')) {
        return;
    }
    
    if (typeof sendNotification === 'function') {
        sendNotification('info', 'پخش زنده رادیو شروع شد! برای شنیدن به بخش رادیو بروید.');
    }
  });

})();