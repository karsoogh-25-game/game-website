document.addEventListener('DOMContentLoaded', function(){
  async function loadAnnouncements() {
    const container = document.getElementById('announcements-list');
    setLoadingState(true);
    try {
      const res = await axios.get('/api/announcements/');
      const data = res.data;
      if (!data.length) {
        container.innerHTML = `<p class="text-gray-400">هیچ اطلاعیه‌ای موجود نیست.</p>`;
      } else {
        container.innerHTML = data.map(a => `
          <div class="bg-gray-700 p-6 rounded-lg">
            <div class="flex justify-between items-start">
              <div class="max-w-[80%]">
                <h3 class="text-white text-lg font-bold">${a.title}</h3>
                <p class="text-gray-400 text-sm">${new Date(a.createdAt).toLocaleDateString('fa-IR')}</p>
                ${ a.shortDescription 
                  ? `<p class="text-gray-300 mt-2">${a.shortDescription}</p>` 
                  : '' }
              </div>
              <button class="btn-secondary text-sm px-3 py-1" onclick="toggleDetails(${a.id})">
                جزئیات
              </button>
            </div>
            <div id="details-${a.id}" class="mt-4 hidden">
              ${ a.longDescription 
                ? `<p class="text-gray-200">${a.longDescription}</p>` 
                : '' }
              ${ a.attachment 
                ? `<a href="${a.attachment}" target="_blank"
                      class="text-blue-400 underline mt-2 block">
                      دانلود فایل پیوست
                    </a>`
                : '' }
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error(err);
      sendNotification('error', 'خطا در دریافت اطلاعیه‌ها');
    } finally {
      setLoadingState(false);
    }
  }

  window.toggleDetails = function(id) {
    const el = document.getElementById(`details-${id}`);
    if (el) el.classList.toggle('hidden');
  };

  // Socket.io events for announcements
  const socket = io();
  socket.on('announcementCreated', () => {
    if (document.querySelector('.content-section.active').id === 'announcements') loadAnnouncements();
  });
  socket.on('announcementUpdated', () => {
    if (document.querySelector('.content-section.active').id === 'announcements') loadAnnouncements();
  });
  socket.on('announcementDeleted', () => {
    if (document.querySelector('.content-section.active').id === 'announcements') loadAnnouncements();
  });

  // Initial load and refresh handler
  document.querySelector('[data-section="announcements"]')
    .addEventListener('click', () => loadAnnouncements());
  document.getElementById('btn-refresh')
    .addEventListener('click', () => {
      if (document.querySelector('.content-section.active').id === 'announcements') loadAnnouncements();
    });
});
