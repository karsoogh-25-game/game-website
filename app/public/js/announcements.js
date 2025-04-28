document.addEventListener('DOMContentLoaded', function(){
  const container = document.getElementById('announcements-list');
  const btnRefresh = document.getElementById('btn-refresh');

  async function loadAnnouncements() {
    setLoadingState(true);
    try {
      const res = await axios.get('/api/announcements');
      const data = res.data;

      if (!data.length) {
        container.innerHTML = `<p class="text-gray-400 text-center py-6">هیچ اطلاعیه‌ای موجود نیست.</p>`;
      } else {
        // مرتب‌سازی اطمینان از ترتیب نزولی (اگر سرور مرتب نکرده باشد)
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        container.innerHTML = data.map(a => `
          <div class="announcement bg-gray-700 rounded-lg mb-4 overflow-hidden transition-all duration-300">
            <div class="header flex justify-between items-center p-4 cursor-pointer">
              <div>
                <h3 class="text-white text-lg font-bold">${a.title}</h3>
                ${a.shortDescription ? `<p class="text-gray-300">${a.shortDescription}</p>` : ''}
                <p class="text-gray-400 text-sm mt-1">${new Date(a.createdAt).toLocaleDateString('fa-IR')}</p>
              </div>
              <button class="toggle-btn btn-secondary px-3 py-1 text-sm">باز کن</button>
            </div>
            <div class="details px-4 pb-4 max-h-0 opacity-0 transition-all duration-300 ease-in-out">
              ${a.longDescription ? `<p class="text-gray-200 mb-2">${a.longDescription}</p>` : ''}
              ${a.attachment ? `<a href="${a.attachment}" target="_blank" class="text-blue-400 underline">دانلود فایل پیوست</a>` : ''}
            </div>
          </div>
        `).join('');

        // پس از رندر، نصب هندلر روی دکمه‌ها
        document.querySelectorAll('.announcement').forEach(el => {
          const header = el.querySelector('.header');
          const details = el.querySelector('.details');
          const btn = el.querySelector('.toggle-btn');

          header.addEventListener('click', () => toggleAnnouncement(el, details, btn));
        });
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        container.innerHTML = `<p class="text-gray-400 text-center py-6">هیچ اطلاعیه‌ای موجود نیست.</p>`;
      } else {
        console.error(err);
        sendNotification('error', 'خطا در دریافت اطلاعیه‌ها');
      }
    } finally {
      setLoadingState(false);
    }
  }

  function toggleAnnouncement(el, details, btn) {
    const isOpen = details.classList.contains('opacity-100');
    if (isOpen) {
      // بستن
      details.style.maxHeight = '0px';
      details.classList.replace('opacity-100','opacity-0');
      btn.textContent = 'باز کن';
    } else {
      // باز کردن—اندازه را بر اساس scrollHeight تنظیم کن
      details.style.maxHeight = details.scrollHeight + 'px';
      details.classList.replace('opacity-0','opacity-100');
      btn.textContent = 'ببند';
    }
  }

  // Socket.io events for real-time updates
  const socket = io();
  ['announcementCreated','announcementUpdated','announcementDeleted'].forEach(evt => {
    socket.on(evt, () => {
      if (document.querySelector('.content-section.active').id === 'announcements') {
        loadAnnouncements();
      }
    });
  });

  // رویداد کلیک روی تب اطلاعیه‌ها
  document.querySelector('[data-section="announcements"]')
    .addEventListener('click', () => loadAnnouncements());

  // رفرش با دکمه رفرش
  btnRefresh.addEventListener('click', () => {
    if (document.querySelector('.content-section.active').id === 'announcements') {
      loadAnnouncements();
    }
  });
});
