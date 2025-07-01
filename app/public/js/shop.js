// public/js/shop.js
document.addEventListener('DOMContentLoaded', function() {
  const shopContainer = document.getElementById('shop-items-container');
  const myAssetsContainer = document.getElementById('my-assets-container');
  const btnRefresh = document.getElementById('btn-refresh');

  function renderNotInGroupMessage() {
    if (myAssetsContainer) myAssetsContainer.innerHTML = '';
    if (shopContainer) {
      shopContainer.innerHTML = `
        <div class="col-span-full text-center p-5 bg-gray-800 rounded-lg">
          <p class="text-xl text-yellow-400 mb-4">
            برای استفاده از فروشگاه، ابتدا باید عضو یک گروه شوید.
          </p>
          <p class="text-gray-300">
            می‌توانید از بخش "گروه من" یک گروه جدید بسازید یا به گروه دوستانتان ملحق شوید.
          </p>
        </div>
      `;
    }
  }

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

      if (myAssets.notInGroup) {
        renderNotInGroupMessage();
        return;
      }
      
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
              <img src="${c.Currency.image || 'https://placehold.co/40x40/4a5568/ffffff?text=C'}" class="w-8 h-8 rounded-full ml-3" alt="${c.Currency.name}">
              <span class="font-semibold text-white">${c.Currency.name}</span>
            </div>
            <span class="text-sm text-gray-300 font-mono">${c.quantity.toFixed(2)}</span>
          </div>
        `).join('')
      : '<p class="text-gray-400 px-2">هیچ ارزی ندارید.</p>';

    const uniqueItemsHtml = assets.uniqueItems.length
      ? assets.uniqueItems.map(i => `
          <div class="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg border-l-4 border-cyan-500">
            <div class="flex items-center">
              <img src="${i.image || 'https://placehold.co/40x40/4a5568/ffffff?text=I'}" class="w-8 h-8 rounded-full ml-3" alt="${i.name}">
              <span class="font-semibold text-white">${i.name}</span>
            </div>
            <span class="text-xs text-gray-400 font-mono">${i.uniqueIdentifier}</span>
          </div>
        `).join('')
      : '<p class="text-gray-400 px-2">هیچ آیتم خاصی ندارید.</p>';

    myAssetsContainer.innerHTML = `
      <div class="bg-gray-800 p-4 rounded-lg shadow-lg mb-8">
        <h3 class="text-xl font-bold text-white mb-4">دارایی‌های شما</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 bg-gray-700 p-3 rounded-lg flex flex-col items-center justify-center">
            <p class="text-gray-400 text-sm">امتیاز گروه</p>
            <p class="text-2xl font-bold text-green-400">${assets.score}</p>
          </div>
          <div class="lg:col-span-1 space-y-2">
            <h4 class="text-gray-300 font-bold mb-1 text-sm">ارزها:</h4>
            ${currenciesHtml}
          </div>
          <div class="lg:col-span-1 space-y-2">
            <h4 class="text-gray-300 font-bold mb-1 text-sm">آیتم‌های خاص:</h4>
            ${uniqueItemsHtml}
          </div>
        </div>
      </div>
    `;
  }

  function renderShopItems(data, myAssets) {
    let currenciesHtml = '';
    if (data.currencies && data.currencies.length) {
      currenciesHtml = data.currencies.map(c => {
        const userCurrency = myAssets.currencies.find(asset => asset.currencyId === c.id);
        const userQuantity = userCurrency ? userCurrency.quantity.toFixed(2) : '0.00';

        return `
        <div class="shop-card bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col p-4 space-y-3"
             data-price="${c.currentPrice}" id="card-currency-${c.id}">
          <div class="flex items-center">
            <img src="${c.image || 'https://placehold.co/60x60/4a5568/ffffff?text=C'}" alt="${c.name}" class="w-12 h-12 rounded-full object-cover ml-4">
            <div>
              <h4 class="text-xl font-bold text-white">${c.name}</h4>
              <p class="text-sm font-semibold text-green-400" id="price-display-${c.id}">۱ واحد = ${c.currentPrice.toFixed(2)} امتیاز</p>
            </div>
          </div>
          <p class="text-sm text-gray-400 border-t border-b border-gray-700 py-2">${c.description || 'توضیحات موجود نیست.'}</p>
          <p class="text-xs text-gray-400">موجودی شما: ${userQuantity}</p>
          <div class="flex items-center space-x-2 space-x-reverse">
            <input type="number" id="amount-currency-${c.id}" min="0" placeholder="مقدار" oninput="updateCosts(${c.id})" class="input-field w-full text-center appearance-none">
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
        </div>`;
      }).join('');
    } else {
        currenciesHtml = `<p class="text-gray-400 col-span-full">فعلاً ارزی برای معامله وجود ندارد.</p>`;
    }

    let uniqueItemsHtml = '';
    if (data.uniqueItems && data.uniqueItems.length) {
      data.uniqueItems.sort((a, b) => {
        if (a.status === 'in_shop' && b.status !== 'in_shop') return -1;
        if (a.status !== 'in_shop' && b.status === 'in_shop') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      uniqueItemsHtml = data.uniqueItems.map(item => {
        const isOwned = item.status === 'owned';
        const isMyItem = isOwned && item.ownerGroupId === myAssets.groupId;

        let cardClasses = 'shop-card bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col relative';
        if (isMyItem) {
          cardClasses += ' border-2 border-green-500 shadow-lg shadow-green-500/20';
        } else if(isOwned) {
          cardClasses += ' border-2 border-transparent';
        } else {
            cardClasses += ' border-2 border-cyan-500/50';
        }

        let overlayHtml = '';
        if (isOwned && !isMyItem && item.owner) {
          overlayHtml = `<div class="absolute inset-0 bg-black bg-opacity-70 z-10 flex flex-col items-center justify-center p-2">
                           <p class="text-white font-bold text-center">فروخته شد به:</p>
                           <p class="text-amber-400 font-semibold text-center">${item.owner.name}</p>
                         </div>`;
        }
        
        let buttonHtml = '';
        if (item.status === 'in_shop') {
          buttonHtml = `<button class="btn-primary mt-2" onclick="buyUniqueItem(${item.id})">خرید</button>`;
        } else if (isMyItem) {
          const sellPrice = Math.floor(item.purchasePrice * 0.85);
          buttonHtml = `<button class="btn-secondary mt-2" onclick="sellUniqueItem(${item.id})">فروش (بازگشت ${sellPrice} امتیاز)</button>`;
        }

        return `
        <div class="${cardClasses}" id="unique-item-card-${item.id}">
          ${overlayHtml}
          <div class="aspect-square w-full bg-black/20">
            <img src="${item.image || 'https://placehold.co/300x300/2d3748/ffffff?text=Item'}" alt="${item.name}" class="w-full h-full object-contain">
          </div>
          <div class="p-3 flex flex-col flex-grow">
            <h4 class="text-lg font-bold text-white">${item.name}</h4>
            <p class="text-gray-400 text-xs font-mono my-1">${item.uniqueIdentifier}</p>
            <p class="text-gray-300 text-sm mt-2 flex-grow">${item.description || ''}</p>
            <div class="mt-4">
              <p class="text-md font-semibold text-green-400">قیمت: ${item.purchasePrice} امتیاز</p>
              ${buttonHtml}
            </div>
          </div>
        </div>`;
      }).join('');
    } else {
        uniqueItemsHtml = '<p class="text-gray-400 col-span-full">فعلاً آیتم خاصی برای فروش وجود ندارد.</p>';
    }

    shopContainer.innerHTML = `
      <div class="col-span-full">
        <div class="w-full">
          <h3 class="text-2xl font-bold text-yellow-400 mb-4">بازار ارز</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            ${currenciesHtml}
          </div>
          
          <hr class="border-gray-700 my-8">
  
          <h3 class="text-2xl font-bold text-cyan-400 mb-4">آیتم‌های خاص</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            ${uniqueItemsHtml}
          </div>
        </div>
      </div>
    `;
  }
  
  window.updateCosts = function(currencyId) {
    const card = document.getElementById(`card-currency-${currencyId}`);
    const amountInput = document.getElementById(`amount-currency-${currencyId}`);
    const totalCostEl = document.getElementById(`total-cost-${currencyId}`);
    if (!card || !amountInput || !totalCostEl) return;
    const price = parseFloat(card.dataset.price);
    const amount = parseFloat(amountInput.value) || 0;
    totalCostEl.textContent = (price * amount).toFixed(2);
  }
  
  window.buyCurrency = async function(currencyId) {
    const amountInput = document.getElementById(`amount-currency-${currencyId}`);
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) return sendNotification('error', 'لطفاً مقدار معتبری برای خرید وارد کنید.');
    sendConfirmationNotification('confirm', `آیا از خرید ${amount} واحد از این ارز اطمینان دارید؟`, async (confirmed) => {
      if (!confirmed) return;
      setLoadingState(true);
      try {
        await axios.post('/api/shop/currencies/buy', { currencyId, amount });
        sendNotification('success', 'خرید با موفقیت انجام شد!');
        amountInput.value = '';
        updateCosts(currencyId);
        loadShop();
      } catch (err) { sendNotification('error', err.response?.data?.message || 'خطا در انجام خرید'); } finally { setLoadingState(false); }
    });
  };

  window.sellCurrency = async function(currencyId) {
    const amountInput = document.getElementById(`amount-currency-${currencyId}`);
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) return sendNotification('error', 'لطفاً مقدار معتبری برای فروش وارد کنید.');
    sendConfirmationNotification('confirm', `آیا از فروش ${amount} واحد از این ارز اطمینان دارید؟`, async (confirmed) => {
      if (!confirmed) return;
      setLoadingState(true);
      try {
        await axios.post('/api/shop/currencies/sell', { currencyId, amount });
        sendNotification('success', 'فروش با موفقیت انجام شد!');
        amountInput.value = '';
        updateCosts(currencyId);
        loadShop();
      } catch (err) { sendNotification('error', err.response?.data?.message || 'خطا در انجام فروش'); } finally { setLoadingState(false); }
    });
  };

  window.buyUniqueItem = async function(itemId) {
    sendConfirmationNotification('confirm', `آیا از خرید این آیتم خاص اطمینان دارید؟`, async (confirmed) => {
      if (!confirmed) return;
      setLoadingState(true);
      try {
        await axios.post(`/api/shop/unique-items/${itemId}/buy`);
        sendNotification('success', 'آیتم خاص با موفقیت خریداری شد!');
        loadShop();
      } catch (err) { sendNotification('error', err.response?.data?.message || 'خطا در خرید آیتم'); } finally { setLoadingState(false); }
    });
  };

  window.sellUniqueItem = async function(itemId) {
    sendConfirmationNotification('confirm', `آیا از فروش این آیتم به فروشگاه اطمینان دارید؟ (۸۵٪ امتیاز بازگردانده می‌شود)`, async (confirmed) => {
      if (!confirmed) return;
      setLoadingState(true);
      try {
        await axios.post(`/api/shop/unique-items/${itemId}/sell`);
        sendNotification('success', 'آیتم با موفقیت به فروشگاه فروخته شد!');
        loadShop();
      } catch (err) { sendNotification('error', err.response?.data?.message || 'خطا در فروش آیتم'); } finally { setLoadingState(false); }
    });
  };

  // Event Listeners
  document.querySelectorAll('.menu-item[data-section="shop"]').forEach(item => item.addEventListener('click', loadShop));
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => { if (document.querySelector('.content-section.active')?.id === 'shop') loadShop(); });
  }

  // Socket.IO Listeners
  if (window.socket) {
    window.socket.on('shopUpdate', () => { if (document.querySelector('.content-section.active')?.id === 'shop') loadShop(); });
    window.socket.on('priceUpdate', ({ currencyId, newPrice }) => {
      const card = document.getElementById(`card-currency-${currencyId}`);
      if (card) {
        card.dataset.price = newPrice;
        const priceEl = document.getElementById(`price-display-${currencyId}`);
        if (priceEl) priceEl.textContent = `۱ واحد = ${newPrice.toFixed(2)} امتیاز`;
        updateCosts(currencyId);
      }
    });
    window.socket.on('currencyDeleted', ({ currencyId }) => {
      const card = document.getElementById(`card-currency-${currencyId}`);
      if (card) {
        card.style.transition = 'opacity 0.5s';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 500);
      }
    });

    window.socket.on('uniqueItemUpdated', () => {
        if (document.querySelector('.content-section.active')?.id === 'shop') {
          loadShop();
        }
    });
  }

  // Initial Load
  if (document.querySelector('.content-section.active')?.id === 'shop') {
    loadShop();
  }
});