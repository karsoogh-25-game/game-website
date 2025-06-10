// public/js/shop.js
document.addEventListener('DOMContentLoaded', function() {
  const shopContainer = document.getElementById('shop-items-container');
  const myAssetsContainer = document.getElementById('my-assets-container');
  const btnRefresh = document.getElementById('btn-refresh');

  async function loadShop() {
    if (!shopContainer) return;
    setLoadingState(true);

    try {
      const [shopRes, assetsRes] = await Promise.all([
        axios.get('/api/shop/data'),
        axios.get('/api/shop/my-assets')
      ]);
      
      const shopData = shopRes.data;
      const myAssets = assetsRes.data;

      renderMyAssets(myAssets);
      renderShopItems(shopData, myAssets);

    } catch (err) {
      console.error('Error loading shop:', err);
      if (shopContainer) {
        shopContainer.innerHTML = `<p class="text-red-400 text-center col-span-full">خطا در بارگذاری فروشگاه.</p>`;
      }
    } finally {
      setLoadingState(false);
    }
  }

  function renderMyAssets(assets) {
    if (!myAssetsContainer) return;
    
    const currenciesHtml = assets.currencies.length
      ? assets.currencies.map(c => `
          <div class="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
            <div class="flex items-center">
              <img src="${c.Currency.image || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded-full ml-3" alt="${c.Currency.name}">
              <span class="font-semibold text-white">${c.Currency.name}</span>
            </div>
            <span class="text-sm text-gray-300 font-mono">${c.quantity.toFixed(2)}</span>
          </div>
        `).join('')
      : '<p class="text-gray-400 px-2">هیچ ارزی ندارید.</p>';

    myAssetsContainer.innerHTML = `
      <div class="bg-gray-800 p-4 rounded-lg shadow-lg mb-8">
        <h3 class="text-xl font-bold text-white mb-4">دارایی‌های شما</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-1 bg-gray-700 p-3 rounded-lg flex flex-col items-center justify-center">
            <p class="text-gray-400 text-sm">امتیاز گروه</p>
            <p class="text-2xl font-bold text-green-400">${assets.score}</p>
          </div>
          <div class="md:col-span-2 space-y-2">
            ${currenciesHtml}
          </div>
        </div>
      </div>
    `;
  }

  function renderShopItems(data, myAssets) {
    let html = '';

    html += '<h3 class="col-span-full text-2xl font-bold text-yellow-400 mb-4">بازار ارز</h3>';
    if (data.currencies.length) {
      html += data.currencies.map(c => {
        const userCurrency = myAssets.currencies.find(asset => asset.currencyId === c.id);
        const userQuantity = userCurrency ? userCurrency.quantity.toFixed(2) : '0.00';

        // --- START of EDIT ---
        return `
        <div class="shop-card bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col p-4 space-y-3"
             data-price="${c.currentPrice}" id="card-currency-${c.id}">
          <div class="flex items-center">
            <img src="${c.image || 'https://via.placeholder.com/60'}" alt="${c.name}" class="w-12 h-12 rounded-full object-cover ml-4">
            <div>
              <h4 class="text-xl font-bold text-white">${c.name}</h4>
              <p class="text-sm font-semibold text-green-400" id="price-display-${c.id}">۱ واحد = ${c.currentPrice.toFixed(2)} امتیاز</p>
            </div>
          </div>

          <p class="text-sm text-gray-400 border-t border-b border-gray-700 py-2">${c.description || 'توضیحات موجود نیست.'}</p>
          
          <p class="text-xs text-gray-400">موجودی شما: ${userQuantity}</p>
          
          <div class="flex items-center space-x-2 space-x-reverse">
            <input type="number" id="amount-currency-${c.id}" min="0" placeholder="مقدار"
                   oninput="updateCosts(${c.id})"
                   class="input-field w-full text-center appearance-none">
            <div class="flex flex-col space-y-2">
              <button class="btn-primary px-3 py-1 text-sm" onclick="buyCurrency(${c.id})">خرید</button>
              <button class="btn-secondary px-3 py-1 text-sm" onclick="sellCurrency(${c.id})">فروش</button>
            </div>
          </div>
          
          <div class="text-center bg-gray-900/50 p-2 rounded mt-2">
            <p class="text-sm text-gray-300">مبلغ کل: 
              <span id="total-cost-${c.id}" class="font-mono text-lg text-yellow-300">0.00</span> امتیاز
            </p>
          </div>
        </div>
      `
      // --- END of EDIT ---
      }).join('');
    }

    html += '<h3 class="col-span-full text-2xl font-bold text-cyan-400 mb-4 mt-8">آیتم‌های خاص</h3>';
    if (data.uniqueItems.length) {
      html += data.uniqueItems.map(i => `
        <div class="shop-card bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 border-cyan-500/50 flex flex-col">
          <img src="${i.image || 'https://via.placeholder.com/300x200'}" alt="${i.name}" class="w-full h-40 object-cover">
          <div class="p-4 flex flex-col flex-grow">
            <h4 class="text-xl font-bold text-white">${i.name}</h4>
            <p class="text-gray-300 mt-2 flex-grow">${i.description || ''}</p>
            <div class="mt-4">
              <p class="text-lg font-semibold text-green-400">قیمت: ${i.purchasePrice} امتیاز</p>
              <button class="btn-secondary w-full mt-2" onclick="alert('خرید در مرحله بعد پیاده‌سازی می‌شود')">خرید</button>
            </div>
          </div>
        </div>
      `).join('');
    } else {
        html += '<p class="text-gray-400 col-span-full">فعلاً آیتم خاصی برای فروش وجود ندارد.</p>';
    }

    shopContainer.innerHTML = html;
  }
  
  window.updateCosts = function(currencyId) {
    const card = document.getElementById(`card-currency-${currencyId}`);
    const amountInput = document.getElementById(`amount-currency-${currencyId}`);
    const totalCostEl = document.getElementById(`total-cost-${currencyId}`);

    if (!card || !amountInput || !totalCostEl) return;

    const price = parseFloat(card.dataset.price);
    const amount = parseFloat(amountInput.value) || 0;

    const total = price * amount;
    
    totalCostEl.textContent = total.toFixed(2);
  }
  
  window.buyCurrency = async function(currencyId) {
    const amountInput = document.getElementById(`amount-currency-${currencyId}`);
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
      return sendNotification('error', 'لطفاً مقدار معتبری برای خرید وارد کنید.');
    }
    
    sendConfirmationNotification('confirm', `آیا از خرید ${amount} واحد از این ارز اطمینان دارید؟`, async (confirmed) => {
      if (!confirmed) return;
      setLoadingState(true);
      try {
        await axios.post('/api/shop/currencies/buy', { currencyId, amount });
        sendNotification('success', 'خرید با موفقیت انجام شد!');
        amountInput.value = '';
        updateCosts(currencyId);
        loadShop();
      } catch (err) {
        sendNotification('error', err.response?.data?.message || 'خطا در انجام خرید');
      } finally {
        setLoadingState(false);
      }
    });
  };

  window.sellCurrency = async function(currencyId) {
    const amountInput = document.getElementById(`amount-currency-${currencyId}`);
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
      return sendNotification('error', 'لطفاً مقدار معتبری برای فروش وارد کنید.');
    }

    sendConfirmationNotification('confirm', `آیا از فروش ${amount} واحد از این ارز اطمینان دارید؟`, async (confirmed) => {
      if (!confirmed) return;
      setLoadingState(true);
      try {
        await axios.post('/api/shop/currencies/sell', { currencyId, amount });
        sendNotification('success', 'فروش با موفقیت انجام شد!');
        amountInput.value = '';
        updateCosts(currencyId);
        loadShop();
      } catch (err) {
        sendNotification('error', err.response?.data?.message || 'خطا در انجام فروش');
      } finally {
        setLoadingState(false);
      }
    });
  };

  // مدیریت رویدادها
  document.querySelectorAll('.menu-item[data-section="shop"]').forEach(item => {
    item.addEventListener('click', loadShop);
  });
  
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      if (document.querySelector('.content-section.active')?.id === 'shop') {
        loadShop();
      }
    });
  }

  // آپدیت لحظه‌ای با سوکت
  if (window.socket) {
    // رویداد کلی برای رفرش کردن، مثلا بعد از خرید و فروش
    window.socket.on('shopUpdate', () => {
      if (document.querySelector('.content-section.active')?.id === 'shop') {
        loadShop();
      }
    });

    // رویداد مخصوص برای آپدیت قیمت یک ارز خاص
    window.socket.on('priceUpdate', ({ currencyId, newPrice }) => {
      const card = document.getElementById(`card-currency-${currencyId}`);
      if (card) {
        card.dataset.price = newPrice;
        const priceEl = document.getElementById(`price-display-${currencyId}`);
        if (priceEl) {
          priceEl.textContent = `۱ واحد = ${newPrice.toFixed(2)} امتیاز`;
        }
        updateCosts(currencyId);
      }
    });

    // رویداد مخصوص برای حذف یک ارز از فروشگاه
    window.socket.on('currencyDeleted', ({ currencyId }) => {
      const card = document.getElementById(`card-currency-${currencyId}`);
      if (card) {
        card.style.transition = 'opacity 0.5s';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 500);
      }
    });
  }

  // بارگذاری اولیه
  if (document.querySelector('.content-section.active')?.id === 'shop') {
    loadShop();
  }
});