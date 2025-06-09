// این ماژول فقط یک بار اتصال سوکت را برقرار کرده و آن را در اختیار همه قرار می‌دهد.
window.socket = io();

// برای اطمینان از اتصال، یک لاگ در کنسول مرورگر چاپ می‌کنیم.
window.socket.on('connect', () => {
  console.log('Successfully connected to Socket.IO server with ID:', window.socket.id);
});