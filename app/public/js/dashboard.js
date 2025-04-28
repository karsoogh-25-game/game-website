document.addEventListener('DOMContentLoaded', function(){
  // sidebar toggles
  const mobileMenu = document.getElementById('mobile-menu');
  document.getElementById('open-mobile-menu').onclick = () => mobileMenu.classList.replace('translate-x-full','translate-x-0');
  document.getElementById('close-mobile-menu').onclick = () => mobileMenu.classList.replace('translate-x-0','translate-x-full');

  // tabs & sections
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  const pageTitle = document.getElementById('page-title');

  function showSection(id){
    const current = document.querySelector('.content-section.active');
    const next    = document.getElementById(id);
    if (current.id === id) return;

    current.classList.remove('fade-in');
    current.classList.add('fade-out');
    current.addEventListener('transitionend', function handler(){
      current.classList.remove('active','fade-out');
      current.removeEventListener('transitionend', handler);
      next.classList.add('active','fade-in');
      pageTitle.textContent = menuItems.find(i => i.dataset.section===id).innerText;
    });
  }

  menuItems.forEach(item=>{
    item.addEventListener('click', e=>{
      e.preventDefault();
      menuItems.forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
      showSection(item.dataset.section);
    });
  });

  // dashboard cards
  const cardScore         = document.getElementById('card-score');
  const cardGroup         = document.getElementById('card-group');
  const cardAnnouncements = document.getElementById('card-announcements');

  // group logic
  const groupArea = document.getElementById('group-area');

  async function loadMyGroup(){
    cardScore.textContent = '—';
    cardGroup.textContent = '—';
    setLoadingState(true);  // فعال کردن اسپینر
    try {
      const r = await axios.get('/api/groups/my');
      if (!r.data.member) {
        renderNotMember();
      } else {
        const g = r.data.group;
        cardScore.textContent = g.score;
        cardGroup.textContent = g.name;
        renderGroupDashboard(g, r.data.role);
      }
    } catch(err){
      console.error(err);
      groupArea.innerHTML = `<p class="error text-center">خطا در بارگذاری وضعیت گروه: ${err.response?.data?.message||err.message}</p>`;
      sendNotification('error', 'خطا در بارگذاری وضعیت گروه');
    } finally {
      setLoadingState(false);  // غیرفعال کردن اسپینر
    }
  }

  function renderNotMember(){
    groupArea.innerHTML = `
      <div class="bg-gray-700 rounded-lg p-6 text-center">
        <p class="text-gray-300 mb-4">شما عضو هیچ گروهی نیستید.</p>
        <button id="btn-create" class="btn-primary px-3 py-1 text-sm mx-2">ایجاد گروه</button>
        <button id="btn-join"   class="btn-secondary px-3 py-1 text-sm mx-2">پیوستن</button>
        <p id="group-error" class="error mt-2"></p>
      </div>`;
    document.getElementById('btn-create').onclick = renderCreateForm;
    document.getElementById('btn-join').onclick   = renderJoinForm;
  }

  // نمایش اسپینر قبل از شروع عملیات
  function setLoadingState(isLoading) {
    const spinnerElement = document.getElementById('loading-spinner');
    if (spinnerElement) {  // اطمینان از وجود عنصر
      spinnerElement.style.display = isLoading ? 'flex' : 'none';  // نمایش یا مخفی کردن اسپینر
    }
  }

  function renderCreateForm(){
    groupArea.innerHTML = `
      <div class="bg-gray-700 rounded-lg p-6 max-w-md mx-auto">
        <h3 class="text-white font-bold mb-4">ایجاد گروه</h3>
        <input id="inp-name" class="input-field w-full mb-4" placeholder="نام گروه…" />
        <div class="flex justify-end">
          <button id="btn-cancel-create" class="btn-secondary px-3 py-1 text-sm mx-2">انصراف</button>
          <button id="btn-do-create" class="btn-primary px-3 py-1 text-sm mx-2">بساز</button>
        </div>
        <p id="group-error" class="error mt-2"></p>
      </div>`;
    document.getElementById('btn-do-create').onclick = async () => {
      setLoadingState(true);  // فعال کردن اسپینر
      try {
        const name = document.getElementById('inp-name').value;
        await axios.post('/api/groups/create', { name });
        loadMyGroup();
        sendNotification('success', `گروه "${name}" با موفقیت ایجاد شد.`);
      } catch(e) {
        document.getElementById('group-error').innerText = e.response.data.message;
        sendNotification('error', 'خطا در ایجاد گروه');
      } finally {
        setLoadingState(false);  // غیرفعال کردن اسپینر بعد از اتمام
      }
    };
    document.getElementById('btn-cancel-create').onclick = loadMyGroup;
  }

  function renderJoinForm(){
    groupArea.innerHTML = `
      <div class="bg-gray-700 rounded-lg p-6 max-w-md mx-auto">
        <h3 class="text-white font-bold mb-4">پیوستن به گروه</h3>
        <input id="inp-code" class="input-field w-full mb-4" placeholder="کد ۸ حرفی…" maxlength="8" />
        <div class="flex justify-end">
          <button id="btn-cancel-join" class="btn-secondary px-3 py-1 text-sm mx-2">انصراف</button>
          <button id="btn-do-join"   class="btn-primary px-3 py-1 text-sm mx-2">پیوستن</button>
        </div>
        <p id="group-error" class="error mt-2"></p>
      </div>`;
    document.getElementById('btn-do-join').onclick = async () => {
      setLoadingState(true);  // فعال کردن اسپینر
      try {
        const code = document.getElementById('inp-code').value;
        await axios.post('/api/groups/add-member', { code });
        loadMyGroup();
        sendNotification('success', 'شما با موفقیت به گروه پیوستید!');
      } catch(e) {
        document.getElementById('group-error').innerText = e.response.data.message;
        sendNotification('error', 'خطا در پیوستن به گروه');
      } finally {
        setLoadingState(false);  // غیرفعال کردن اسپینر بعد از اتمام
      }
    };
    document.getElementById('btn-cancel-join').onclick = loadMyGroup;
  }

  function renderGroupDashboard(g, role){
    groupArea.innerHTML = `
      <div class="bg-gray-700 rounded-lg p-6 max-w-2xl mx-auto space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-600 p-4 rounded text-center">
          <div><p class="text-gray-400 text-sm">نام گروه</p><p class="text-white">${g.name}</p></div>
          <div><p class="text-gray-400 text-sm">امتیاز</p><p class="text-white">${g.score}</p></div>
          <div><p class="text-gray-400 text-sm">رتبه</p><p class="text-white">${g.rank}</p></div>
        </div>
        <div class="flex items-center justify-center space-x-2 mx-auto w-max bg-gray-600 p-3 rounded">
          <span class="text-gray-300 text-sm">کد گروه:</span>
          <input id="code-8" type="text" readonly value="${g.code}"
                 class="input-field text-center w-28 text-sm bg-gray-700 border-gray-500" />
          <button class="btn-primary px-2 py-1 text-sm" onclick="navigator.clipboard.writeText('${g.code}')">
            <i class="fas fa-copy ml-1"></i> کپی
          </button>
        </div>
        <h4 class="text-white font-bold">اعضا</h4>
        <table class="min-w-full bg-gray-600 rounded overflow-hidden text-sm">
          <thead><tr class="bg-gray-700 text-gray-300"><th class="px-3 py-1">نام</th><th class="px-3 py-1">نقش</th></tr></thead>
          <tbody>${g.members.map(m=>`
            <tr class="border-b border-gray-500">
              <td class="px-3 py-1 text-white">${m.name}</td>
              <td class="px-3 py-1 text-gray-400">${m.role==='leader'?'سرگروه':'عضو'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="flex justify-center space-x-4">
          <button id="btn-leave" class="btn-secondary px-3 py-1 text-sm mx-2">خروج</button>
          ${role==='leader' ? `<button id="btn-delete" class="btn-primary px-3 py-1 text-sm mx-2">حذف</button>` : ``}
        </div>
        <p id="group-error" class="error text-center"></p>
      </div>`;
  
    document.getElementById('btn-leave').onclick = async () => {
      sendConfirmationNotification('confirm', 'آیا مطمئن هستید که می‌خواهید از گروه خارج شوید؟', async (confirmed) => {
        if (confirmed) {
          try {
            await axios.post('/api/groups/leave',{ groupId:g.id });
            loadMyGroup();
            sendNotification('info', 'از گروه خارج شدید');
          } catch (e) {
            document.getElementById('group-error').innerText = e.response.data.message;
          }
        } else {
          sendNotification('info', 'خروج از گروه لغو شد');
        }
      });
    };
  
    if(role==='leader'){
      document.getElementById('btn-delete').onclick = () => {
        sendConfirmationNotification('confirm', 'آیا مطمئن هستید که می‌خواهید این گروه را حذف کنید؟', async (confirmed) => {
          if (confirmed) {
            try {
              await axios.delete(`/api/groups/${g.id}`);
              loadMyGroup();
              sendNotification('success', 'گروه با موفقیت حذف شد');
            } catch (e) {
              document.getElementById('group-error').innerText = e.response.data.message;
              sendNotification('error', 'خطا در حذف گروه');
            }
          } else {
            sendNotification('info', 'حذف گروه لغو شد');
          }
        });
      };
    }
  }
  

  // real-time via socket.io
  const socket = io();
  socket.on('memberJoined', loadMyGroup);
  socket.on('memberRemoved', loadMyGroup);
  socket.on('groupDeleted', renderNotMember);

  // Notifications button handler
  document.getElementById('btn-notifications').addEventListener('click', e=>{
    e.preventDefault();
    menuItems.forEach(i => i.classList.toggle('active', i.dataset.section==='announcements'));
    showSection('announcements');
  });

  // Refresh button handler
  document.getElementById('btn-refresh').addEventListener('click', e=>{
    e.preventDefault();
    const active = document.querySelector('.content-section.active').id;
    if (active==='groups') loadMyGroup();
    else if (active==='dashboard') {
      if (typeof loadDashboard==='function') loadDashboard();
      else loadMyGroup();
    }
  });
  
  // Refresh button handler
  const btnRefresh = document.getElementById('btn-refresh');
  btnRefresh.addEventListener('click', e=>{
    e.preventDefault();
    const active = document.querySelector('.content-section.active').id;
    if (active==='groups') loadMyGroup();
    else if (active==='dashboard') {
      if (typeof loadDashboard==='function') loadDashboard();
      else loadMyGroup();
    }
  });
  // خودکارسازی کلیک روی دکمه‌ی رفرش
  btnRefresh.click();

  menuItems.forEach(i => i.addEventListener('click', () => {
    if(i.dataset.section==='groups') loadMyGroup();
  }));
});

// helper: fade out an element, return Promise when done
function fadeOutElement(el) {
  return new Promise(resolve => {
    el.classList.remove('fade-in');
    el.classList.add('fade-out');
    el.addEventListener('transitionend', function handler() {
      el.removeEventListener('transitionend', handler);
      resolve();
    });
  });
}

// helper: fade in an element
function fadeInElement(el) {
  el.classList.remove('fade-out');
  el.classList.add('fade-in');
}

// /js/alert.js
function sendNotification(type, text) {
  let alertContainer = document.getElementById('alert-container');
  
  // Define different alert styles
  const alerts = {
    info: {
      icon: `<svg class="w-6 h-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
      color: "bg-blue-500"
    },
    error: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
      color: "bg-red-500"
    },
    warning: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>`,
      color: "bg-yellow-500"
    },
    success: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
      color: "bg-green-500"
    }
  };

  let notification = document.createElement("div");
  notification.classList.add('alert-box', alerts[type].color, 'text-white', 'flex', 'items-center', 'rounded-md', 'opacity-0');
  notification.innerHTML = `${alerts[type].icon}<p>${text}</p>`;
  alertContainer.appendChild(notification);

  // Show the notification with animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Remove the notification after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => alertContainer.removeChild(notification), 500);
  }, 5000);
}

function sendConfirmationNotification(type, text, callback) {
  let alertContainer = document.getElementById('alert-container');
  
  // Define different confirmation alert styles
  const alerts = {
    confirm: {
      icon: `<svg class="w-6 h-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>`,
      color: "bg-orange-500"
    }
  };

  let notification = document.createElement("div");
  notification.classList.add('alert-box', alerts.confirm.color, 'text-white', 'flex', 'items-center', 'rounded-md', 'opacity-0', 'relative');
  notification.innerHTML = `${alerts.confirm.icon}<p>${text}</p>`;
  
  // Add 'confirm' and 'cancel' buttons
  notification.innerHTML += `
    <button class="btn-primary px-3 py-1 text-sm mx-2" id="btn-confirm">تایید</button>
    <button class="btn-secondary px-3 py-1 text-sm mx-2" id="btn-cancel">انصراف</button>
  `;
  alertContainer.appendChild(notification);
  
  // Show the notification with animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove the notification after 10 seconds if no action
  const timeoutId = setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => alertContainer.removeChild(notification), 500);
    // Trigger cancel if no action is taken
    if (callback) callback(false);
  }, 10000);
  
  // Handle the 'confirm' action
  document.getElementById('btn-confirm').addEventListener('click', () => {
    clearTimeout(timeoutId);  // Stop auto cancel
    notification.classList.remove('show');
    setTimeout(() => alertContainer.removeChild(notification), 500);
    if (callback) callback(true); // Trigger the callback with 'true' for confirmation
  });
  
  // Handle the 'cancel' action
  document.getElementById('btn-cancel').addEventListener('click', () => {
    clearTimeout(timeoutId);  // Stop auto cancel
    notification.classList.remove('show');
    setTimeout(() => alertContainer.removeChild(notification), 500);
    if (callback) callback(false); // Trigger the callback with 'false' for cancellation
  });

  // ------------ اعلام کال بک بارگذاری اطلاعیه‌ها ------------
  async function loadAnnouncements() {
    const container = document.getElementById('announcements-list');
    setLoadingState(true);
    try {
      const res = await axios.get('/announcements/');
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

  function toggleDetails(id) {
    const el = document.getElementById(`details-${id}`);
    if (el) el.classList.toggle('hidden');
  }

  // ------------ اتصال رویدادها (Socket.io) ------------
  const socket = io();
  socket.on('announcementCreated', () => {
    if (document.querySelector('.content-section.active').id === 'announcements') {
      loadAnnouncements();
    }
  });
  socket.on('announcementUpdated', () => {
    if (document.querySelector('.content-section.active').id === 'announcements') {
      loadAnnouncements();
    }
  });
  socket.on('announcementDeleted', () => {
    if (document.querySelector('.content-section.active').id === 'announcements') {
      loadAnnouncements();
    }
  });

  // ------------ فراخوانی بار اول و رویداد کلیک ------------
  document.querySelector('[data-section="announcements"]')
    .addEventListener('click', () => loadAnnouncements());

  // در هندلر دکمه رفرش:
  btnRefresh.addEventListener('click', e => {
    const active = document.querySelector('.content-section.active').id;
    if (active === 'announcements') loadAnnouncements();
  });

}
