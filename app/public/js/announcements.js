// js/announcements.js
document.addEventListener('DOMContentLoaded', function(){
  const container  = document.getElementById('announcements-list');
  const btnRefresh = document.getElementById('btn-refresh');

  async function loadAnnouncements() {
    setLoadingState(true);
    try {
      const res = await axios.get('/api/announcements');
      const data = res.data;
      if (!data.length) {
        container.innerHTML = `<p class="text-gray-400 text-center py-6">هیچ اطلاعیه‌ای موجود نیست.</p>`;
      } else {
        data.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
        container.innerHTML = data.map(a => {
          const hasDetails    = a.longDescription?.trim();
          const hasAttachment = a.attachment?.trim();
          const showToggle    = hasDetails || hasAttachment;
          const id            = `notif-${a.id}`;

          return `
          <div class="notification-item bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div class="p-6 flex justify-between items-center">
              <div>
                <h3 class="text-xl font-semibold text-green-400">${a.title}</h3>
                <p class="text-slate-300 mt-2">${a.shortDescription||''}</p>
              </div>
              ${showToggle ? `
              <button onclick="toggleNotification('${id}')" 
                      class="toggle-btn bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <span>${hasDetails ? 'مشاهده جزئیات' : 'مشاهده فایل‌ها'}</span>
                <svg id="icon-${id}" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" 
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 
                           1 0 111.414 1.414l-4 4a1 1 0 
                           01-1.414 0l-4-4a1 1 0 010-1.414z" 
                        clip-rule="evenodd" />
                </svg>
              </button>` : ''}
            </div>
            ${showToggle ? `
            <div id="${id}" 
                 class="max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out text-right px-6 pb-6">
              <div class="border-t border-slate-700 pt-4 space-y-4">
                ${hasDetails ? `
                <div>
                  <h4 class="font-medium text-blue-400 mb-2">جزئیات:</h4>
                  <p class="text-slate-300 leading-relaxed">${a.longDescription}</p>
                </div>` : ''}
                ${hasAttachment ? `
                <div>
                  <h4 class="font-medium text-blue-400 mb-2">فایل‌های پیوست:</h4>
                  <div class="flex flex-wrap gap-2">
                    <a href="${a.attachment}" target="_blank" 
                       class="attachment-icon bg-slate-700 hover:bg-blue-600 text-white 
                              px-3 py-2 rounded-lg flex items-center gap-2">
                      <i class="fas fa-download"></i>
                      دانلود فایل
                    </a>
                  </div>
                </div>` : ''}
              </div>
            </div>` : ''}
          </div>`;
        }).join('');
      }
    } catch (err) {
      console.error(err);
      sendNotification('error','خطا در دریافت اطلاعیه‌ها');
    } finally {
      setLoadingState(false);
    }
  }

  window.toggleNotification = function(id) {
    const details = document.getElementById(id);
    const icon    = document.getElementById(`icon-${id}`);
    // اگر بسته است
    if (details.classList.contains('max-h-0')) {
      details.classList.replace('max-h-0','max-h-screen');
      details.classList.replace('opacity-0','opacity-100');
      icon.classList.add('rotate-180');
    } else {
      details.classList.replace('max-h-screen','max-h-0');
      details.classList.replace('opacity-100','opacity-0');
      icon.classList.remove('rotate-180');
    }
  };

  // Socket.IO
  const socket = io();
  ['announcementCreated','announcementUpdated','announcementDeleted'].forEach(evt => {
    socket.on(evt, () => {
      if (document.querySelector('.content-section.active').id==='announcements') {
        loadAnnouncements();
      }
    });
  });

  // بارگذاری اولیه و رفرش
  document.querySelector('[data-section="announcements"]')
    .addEventListener('click', () => loadAnnouncements());
  btnRefresh.addEventListener('click', () => {
    if (document.querySelector('.content-section.active').id==='announcements') {
      loadAnnouncements();
    }
  });

  // فراخوانی اولیه
  if (document.querySelector('.content-section.active').id==='announcements') {
    loadAnnouncements();
  }
});
