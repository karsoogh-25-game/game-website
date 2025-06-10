// app/public/js/bank.js
document.addEventListener('DOMContentLoaded', () => {
  const bankArea   = document.getElementById('bank-area');
  const headerRef  = document.getElementById('btn-refresh');

  async function loadBank() {
    setLoadingState(true);
    bankArea.innerHTML = '';
    try {
      const r = await axios.get('/api/groups/my');

      if (!r.data.member && r.data.role === 'mentor') {
        renderMentorBank();
      } else if (r.data.member) {
        renderGroupBank(r.data.group, r.data.role);
      } else {
        bankArea.innerHTML = `
          <div class="text-center p-5 bg-gray-800 rounded-lg">
            <p class="text-xl text-yellow-400 mb-4">
              برای استفاده از بانک، ابتدا باید عضو یک گروه شوید.
            </p>
            <p class="text-gray-300">
              می‌توانید از بخش "گروه من" یک گروه جدید بسازید یا به گروه دوستانتان ملحق شوید.
            </p>
          </div>
        `;
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      bankArea.innerHTML = `<p class="error text-red-400">خطا در بارگذاری بانک: ${msg}</p>`;
      sendNotification('error', 'خطا در بارگذاری بانک: ' + msg);
    } finally {
      setLoadingState(false);
    }
  }

  function renderGroupBank(g, role) {
    bankArea.innerHTML = `
      <div class="bg-gray-600 p-4 rounded space-y-2">
        <p class="text-gray-300">موجودی: <span class="text-white font-bold">${g.score}</span></p>
        <p class="text-gray-300">کد کیف‌پول: <span class="text-white">${g.walletCode}</span></p>
        ${role === 'leader' ? `
          <div class="space-y-2">
            <input id="bank-target-code" class="input-field w-full" placeholder="کد ۴ رقمی مقصد" maxlength="4" />
            <input id="bank-amount" type="number" min="1" class="input-field w-full" placeholder="مبلغ انتقال" />
            <button id="btn-bank-transfer" class="btn-primary w-full py-2">انتقال</button>
            <p id="bank-error" class="error text-red-400"></p>
          </div>` : ``}
      </div>`;
    if (role === 'leader') document.getElementById('btn-bank-transfer').onclick = doTransfer;
  }

  function renderMentorBank() {
    bankArea.innerHTML = `
      <div class="bg-gray-600 p-4 rounded space-y-2">
        <input id="bank-target-code" class="input-field w-full" placeholder="کد ۴ رقمی مقصد" maxlength="4" />
        <input id="bank-amount" type="number" min="1" class="input-field w-full" placeholder="مبلغ انتقال" />
        <button id="btn-bank-transfer" class="btn-primary w-full py-2">انتقال (منتور)</button>
        <p id="bank-error" class="error text-red-400"></p>
      </div>`;
    document.getElementById('btn-bank-transfer').onclick = doTransfer;
  }

  async function doTransfer() {
    const code   = document.getElementById('bank-target-code').value.trim();
    const amount = document.getElementById('bank-amount').value.trim();
    const errEl  = document.getElementById('bank-error');

    errEl.textContent = '';
    if (!code || !amount) {
      errEl.textContent = 'کد مقصد و مبلغ را وارد کنید';
      return sendNotification('error', 'کد مقصد و مبلغ را وارد کنید');
    }

    let groupName = 'نامشخص';
    try {
      const res = await axios.get(`/api/groups/name/${code}`);
      groupName = res.data.name;
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      errEl.textContent = msg;
      return sendNotification('error', 'خطا در دریافت نام گروه: ' + msg);
    }

    sendConfirmationNotification(
      'confirm',
      `آیا از انتقال مبلغ ${amount} به گروه «${groupName}» (کد: ${code}) اطمینان دارید؟`,
      async (confirmed) => {
        if (!confirmed) {
          return sendNotification('info', 'انتقال لغو شد');
        }
        setLoadingState(true);
        try {
          await axios.post('/api/groups/transfer', { targetCode: code, amount });
          sendNotification('success', 'انتقال با موفقیت انجام شد');
          loadBank();
        } catch (e) {
          const msg = e.response?.data?.message || e.message;
          errEl.textContent = msg;
          sendNotification('error', 'خطا در انتقال: ' + msg);
        } finally {
          setLoadingState(false);
        }
      }
    );
  }

  // refresh via header
  headerRef.addEventListener('click', () => {
    if (document.querySelector('.content-section.active').id === 'bank') loadBank();
  });

  // tab click
  document.querySelectorAll('.menu-item').forEach(i => {
    i.addEventListener('click', () => { if (i.dataset.section === 'bank') loadBank(); });
  });

  // real-time
  window.socket.on('bankUpdate', () => {
    if (document.querySelector('.content-section.active').id === 'bank') loadBank();
  });

  // initial
  if (document.querySelector('.menu-item.active')?.dataset.section === 'bank') loadBank();
});