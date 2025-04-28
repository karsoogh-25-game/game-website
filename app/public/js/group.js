document.addEventListener('DOMContentLoaded', function(){
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
    const menuItems = Array.from(document.querySelectorAll('.menu-item'));
    menuItems.forEach(i => i.classList.toggle('active', i.dataset.section==='announcements'));
    showSection('announcements');
  });

  // Refresh button handler and auto-click
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
  btnRefresh.click();

  // load group on tab click
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  menuItems.forEach(i => {
    if(i.dataset.section==='groups') i.addEventListener('click', loadMyGroup);
  });
});
