// public/js/announcements.js

document.addEventListener('DOMContentLoaded', function() {
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
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        container.innerHTML = data.map(a => {
          const hasDetails     = Boolean(a.longDescription?.trim());
          const hasAttachments = Array.isArray(a.attachments) && a.attachments.length > 0;
          const showToggle     = hasDetails || hasAttachments;
          const id             = `notif-${a.id}`;

          const attachmentsHtml = hasAttachments
            ? `<div class="flex flex-wrap gap-2">
                 ${a.attachments.map(att => `
                   <a href="${att.path}" target="_blank"
                      class="attachment-icon bg-slate-700 hover:bg-blue-600 text-white
                             px-3 py-2 rounded-lg flex items-center gap-2">
                     <i class="fas fa-download"></i>
                     ${att.displayName}
                   </a>
                 `).join('')}
               </div>`
            : '';

          return `
            <div class="notification-item bg-slate-800 rounded-lg shadow-lg overflow-hidden mb-4">
              <div class="px-6 pt-6 pb-3 flex justify-between items-center">
                <div class="text-right">
                  <h3 class="text-xl font-semibold text-green-400">${a.title}</h3>
                  <p class="text-slate-300 mt-2 whitespace-pre-line">${a.shortDescription || ''}</p>
                </div>
                ${showToggle ? `
                  <button onclick="toggleNotification('${id}')"
                          class="toggle-btn text-gray-300 hover:text-white rounded-lg flex items-center gap-2 p-2">
                    <span>${hasDetails ? 'مشاهده جزئیات' : 'مشاهده فایل‌ها'}</span>
                    <svg id="icon-${id}" xmlns="http://www.w3.org/2000/svg"
                         class="h-5 w-5 transition-transform duration-300"
                         viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1
                               1 0 111.414 1.414l-4 4a1 1 0
                               01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clip-rule="evenodd" />
                    </svg>
                  </button>
                ` : ''}
              </div>

              ${showToggle ? `
                <div id="${id}"
                     class="max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out text-right px-6 pb-4">
                  <div class="border-y border-slate-700 py-4 space-y-4">
                    ${hasDetails ? `
                      <div>
                        <h4 class="font-medium text-blue-400 mb-2">جزئیات:</h4>
                        <p class="text-slate-300 leading-relaxed whitespace-pre-line">
                          ${a.longDescription}
                        </p>
                      </div>
                    ` : ''}
                    ${hasAttachments ? `
                      <div>
                        <h4 class="font-medium text-blue-400 mb-2">فایل‌های پیوست:</h4>
                        ${attachmentsHtml}
                      </div>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Error loading announcements:', err);
      sendNotification('error', 'خطا در دریافت اطلاعیه‌ها');
    } finally {
      setLoadingState(false);
    }
  }

  window.toggleNotification = function(id) {
    const details = document.getElementById(id);
    const icon    = document.getElementById(`icon-${id}`);
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

  ['announcementCreated','announcementUpdated','announcementDeleted'].forEach(evt => {
    window.socket.on(evt, () => {
      if (document.querySelector('.content-section.active')?.id === 'announcements') {
        loadAnnouncements();
      }
    });
  });

  document.querySelectorAll('[data-section="announcements"]').forEach(el =>
    el.addEventListener('click', () => loadAnnouncements())
  );
  btnRefresh.addEventListener('click', () => {
    if (document.querySelector('.content-section.active')?.id === 'announcements') {
      loadAnnouncements();
    }
  });

  if (document.querySelector('.content-section.active')?.id === 'announcements') {
    loadAnnouncements();
  }
});