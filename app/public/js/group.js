// public/js/group.js

document.addEventListener('DOMContentLoaded', function(){
  // dashboard cards
  const cardScore         = document.getElementById('card-score');
  const cardGroup         = document.getElementById('card-group');
  const cardRank          = document.getElementById('card-rank');
  const cardAnnouncements = document.getElementById('card-announcements');

  // group logic
  const groupArea = document.getElementById('group-area');
  let currentGroupId = null;

  async function loadMyGroup(){
    cardScore.textContent = '—';
    cardGroup.textContent = '—';
    cardRank.textContent = '—';
    cardAnnouncements.textContent = '—';
    setLoadingState(true);

    if (currentGroupId) {
      window.socket.emit('leaveGroupRoom', currentGroupId);
      currentGroupId = null;
    }

    try {
      const r = await axios.get('/api/groups/my');
      if (!r.data.member) {
        if (r.data.role === 'mentor') {
          renderMentorBank();
        } else {
          renderNotMember();
        }
      } else {
        const g = r.data.group;
        cardScore.textContent = g.score;
        cardGroup.textContent = g.name;
        cardRank.textContent  = g.rank;
        renderGroupDashboard(g, r.data.role);

        if (g.id) {
          window.socket.emit('joinGroupRoom', g.id);
          currentGroupId = g.id;
        }
      }

      try {
        const resA = await axios.get('/api/announcements/latest');
        if (resA.data && resA.data.title) {
          cardAnnouncements.textContent = resA.data.title;
        } else {
          cardAnnouncements.textContent = '—';
        }
      } catch (e) {
        console.error('خطا در واکشی آخرین اعلان‌', e);
        cardAnnouncements.textContent = '—';
      }

    } catch(err){
      console.error('Error loading group status:', err);
      groupArea.innerHTML = `<p class="error text-center">خطا در بارگذاری وضعیت گروه: ${err.response?.data?.message || err.message}</p>`;
      sendNotification('error', 'خطا در بارگذاری وضعیت گروه');
    } finally {
      setLoadingState(false);
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
      setLoadingState(true);
      try {
        const name = document.getElementById('inp-name').value;
        await axios.post('/api/groups/create', { name });
        loadMyGroup();
        sendNotification('success', `گروه "${name}" با موفقیت ایجاد شد.`);
      } catch(e) {
        document.getElementById('group-error').innerText = e.response.data.message;
        sendNotification('error', 'خطا در ایجاد گروه');
      } finally {
        setLoadingState(false);
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
      setLoadingState(true);
      try {
        const code = document.getElementById('inp-code').value;
        await axios.post('/api/groups/add-member', { code });
        loadMyGroup();
        sendNotification('success', 'شما با موفقیت به گروه پیوستید!');
      } catch(e) {
        document.getElementById('group-error').innerText = e.response.data.message;
        sendNotification('error', 'خطا در پیوستن به گروه');
      } finally {
        setLoadingState(false);
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
          <span class="text-gray-300 text-sm pl-2">کد گروه:</span>
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
          ${
            window.isFeatureEnabled('action_group_leave') 
            ? `<button id="btn-leave" class="btn-secondary px-3 py-1 text-sm mx-2">خروج</button>` 
            : ''
          }
          ${
            role === 'leader' && window.isFeatureEnabled('action_group_delete') 
            ? `<button id="btn-delete" class="btn-primary px-3 py-1 text-sm mx-2">حذف</button>` 
            : ''
          }
        </div>
        <p id="group-error" class="error text-center"></p>
      </div>`;

    const btnLeave = document.getElementById('btn-leave');
    if (btnLeave) {
      btnLeave.onclick = async () => {
        sendConfirmationNotification('confirm', 'آیا مطمئن هستید که می‌خواهید از گروه خارج شوید؟', async (confirmed) => {
          if (confirmed) {
            try {
              await axios.post('/api/groups/leave',{ groupId:g.id });
              loadMyGroup();
              sendNotification('info', 'از گروه خارج شدید');
            } catch (e) {
              document.getElementById('group-error').innerText = e.response.data.message;
              sendNotification('error', 'خطا در خروج از گروه');
            }
          } else {
            sendNotification('info', 'خروج از گروه لغو شد');
          }
        });
      };
    }

    const btnDelete = document.getElementById('btn-delete');
    if (btnDelete) {
      btnDelete.onclick = () => {
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

  function renderMentorBank(){
    groupArea.innerHTML = `
      <div class="bg-gray-700 rounded-lg p-6 text-center max-w-md mx-auto">
        <p class="text-gray-300 mb-4">شما به عنوان منتور وارد شده‌اید و عضو گروهی نیستید.</p>
        </div>`;
  }

  // real-time via socket.io
  window.socket.on('memberJoined', loadMyGroup);
  window.socket.on('memberRemoved', loadMyGroup);
  window.socket.on('groupDeleted', renderNotMember);
  window.socket.on('bankUpdate', loadMyGroup);

  document.addEventListener('feature-flags-loaded', () => {
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection && activeSection.id === 'groups') {
      loadMyGroup();
    }
  });

  // Notifications button handler
  document.getElementById('btn-notifications').addEventListener('click', e=>{
    e.preventDefault();
    const menuItems = Array.from(document.querySelectorAll('.menu-item'));
    menuItems.forEach(i => i.classList.toggle('active', i.dataset.section==='announcements'));
    showSection('announcements');
  });

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
  
  // Initial load
  loadMyGroup();

  // load group on tab click
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  menuItems.forEach(i => {
    if(i.dataset.section==='groups') i.addEventListener('click', loadMyGroup);
  });
});
