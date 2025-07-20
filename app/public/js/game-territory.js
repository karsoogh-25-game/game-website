// Territory Defense Game Logic
document.addEventListener('DOMContentLoaded', () => {
    const territorySection = document.getElementById('territory_defense');
    const loadingDiv = document.getElementById('game-territory-loading');
    const contentDiv = document.getElementById('game-territory-content');

    const currentActiveMap = { id: null, name: '', size: 0, gameLocked: false };
    let userGroupId = null;
    let currentlySelectedBuyableTile = null; // Track the tile selected for purchase

    const showGlobalLoading = (show) => {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = show ? 'flex' : 'none';
    };

    async function fetchUserGroupData() {
        try {
            const response = await axios.get('/api/groups/my'); // Using /my which now returns detailed group info
            if (response.data && response.data.member && response.data.group && response.data.group.id) {
                userGroupId = response.data.group.id;
                console.log("User Group ID fetched for game:", userGroupId);
            } else if (response.data && !response.data.member) {
                 console.warn("کاربر عضو هیچ گروهی نیست. بازی دفاع از قلمرو ممکن است محدود باشد.");
                 sendNotification('info', "شما برای استفاده از تمام قابلیت‌های دفاع از قلمرو باید عضو یک گروه باشید.");
                 userGroupId = null; // Explicitly set to null
            } else {
                 console.warn("پاسخ API برای اطلاعات گروه کاربر، معتبر نبود.");
                 userGroupId = null; // Explicitly set to null
            }
        } catch (error) {
            console.error("Error fetching user group data for game:", error);
            if (error.response && error.response.status === 404) {
                sendNotification('warning', "اطلاعات گروه شما یافت نشد. برای بازی، لطفاً ابتدا به یک گروه بپیوندید یا یک گروه ایجاد کنید.");
            } else {
                sendNotification('error', "خطا در دریافت اطلاعات گروه کاربر.");
            }
            userGroupId = null; // Ensure it's null on error
        }
    }

    async function getActiveMap() {
        try {
            const response = await axios.get('/api/game/map/active');
            if (response.data && response.data.id) {
                currentActiveMap.id = response.data.id;
                currentActiveMap.name = response.data.name;
                currentActiveMap.size = response.data.size;
                currentActiveMap.gameLocked = response.data.gameLocked;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error fetching active map:", error);
            if (error.response && error.response.status === 404) {
                contentDiv.innerHTML = `<p class="text-center text-xl text-yellow-400">${error.response.data.message || 'نقشه فعالی برای بازی یافت نشد.'}</p>`;
            } else {
                contentDiv.innerHTML = `<p class="text-center text-xl text-red-400">خطا در بارگذاری اطلاعات نقشه.</p>`;
            }
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
            return false;
        }
    }

    async function fetchMapState() {
        if (!currentActiveMap.id) {
            loadingDiv.innerText = 'هیچ نقشه فعالی برای بارگذاری وجود ندارد.';
            showGlobalLoading(false);
            return;
        }
        showGlobalLoading(true);
        try {
            const response = await axios.get(`/api/game/map/${currentActiveMap.id}/state`);
            renderMap(response.data);
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        } catch (error) {
            console.error("Error fetching map state:", error);
            contentDiv.innerHTML = `<p class="text-center text-xl text-red-400">خطا در بارگذاری وضعیت نقشه.</p>`;
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        } finally {
            showGlobalLoading(false);
        }
    }

    function renderMap(mapData) {
        if (!mapData || !mapData.tiles) {
            contentDiv.innerHTML = '<p>اطلاعات نقشه ناقص است.</p>';
            return;
        }
        currentActiveMap.gameLocked = mapData.gameLocked;

        let html = `<div class="mb-4 p-4 bg-gray-800 rounded-lg shadow">
                        <h2 class="text-2xl font-bold text-white text-center">${mapData.name} (سایز: ${mapData.size}x${mapData.size})</h2>
                        ${mapData.gameLocked ? '<p class="text-center text-yellow-400 font-semibold">این بازی قفل شده است. امکان خرید ملک جدید، ارتقا یا استقرار مهمات وجود ندارد.</p>' : ''}
                    </div>`;

        if (mapData.attackWaves && mapData.attackWaves.length > 0) {
            const nextAttack = mapData.attackWaves[0];
            html += `<div id="attack-timer-container" class="mb-4 p-3 bg-red-700 text-white rounded-lg text-center">
                        <p class="font-bold">موج حمله بعدی در: <span id="attack-countdown"></span></p>
                        ${nextAttack.isPowerVisible ? `<p>قدرت حمله: ${nextAttack.power}</p>` : ''}
                     </div>`;
            startCountdown(nextAttack.attackTime);
        } else {
            html += `<div id="attack-timer-container" class="mb-4 p-3 bg-gray-600 text-white rounded-lg text-center">
                        <p>در حال حاضر موج حمله فعالی برنامه‌ریزی نشده است.</p>
                     </div>`;
        }
        // Transparent background for the grid container itself
        html += `<div class="overflow-auto scrollable-map-container max-h-[70vh] bg-gray-700 p-2 rounded-lg shadow-inner">
                    <div id="game-grid" class="grid gap-0.5 bg-transparent border-transparent"
                         style="grid-template-columns: repeat(${mapData.size}, minmax(60px, 1fr));
                                width: ${mapData.size * 60}px;">`;

        mapData.tiles.forEach(tile => {
            const ownerColor = tile.ownerGroup ? tile.ownerGroup.color : 'transparent';
            let displayColor = tile.ownerGroup ? ownerColor : '#4a5568';
            const isOwner = tile.OwnerGroupId && tile.OwnerGroupId === userGroupId;
            let tileClasses = "tile aspect-square flex flex-col items-center justify-center relative group";
            let tileContent = "";
            let tileDataAttributes = `data-tile-id="${tile.id}" data-x="${tile.x}" data-y="${tile.y}"`;

            if (tile.isDestroyed) {
                tileClasses += " tile-destroyed";
                displayColor = "transparent";
                tileContent = `<span class="text-xs text-gray-500 pointer-events-none">(نابود شده)</span>`; // pointer-events-none for text
            } else if (tile.OwnerGroupId && tile.walls && tile.walls.length > 0) {
                let totalDefense = 0;
                tile.walls.forEach(wall => {
                    totalDefense += wall.health;
                    wall.deployedAmmunitions.forEach(ammo => totalDefense += ammo.health);
                });
                tileContent += `<div class="wall-representation absolute inset-0 border-2 border-opacity-75 pointer-events-none"
                                     style="border-color: ${isOwner ? 'cyan' : 'orange'};">
                                     <span class="absolute text-xs text-white bg-black bg-opacity-50 px-1 rounded pointer-events-none" style="top: 50%; left: 50%; transform: translate(-50%, -50%);">${totalDefense}</span>
                                 </div>`;
                if (isOwner) {
                    tileContent += `<div class="absolute inset-0 cursor-pointer" data-action="open-wall-modal"></div>`;
                }
                if (tile.ownerGroup) {
                     tileContent += `<div class="absolute bottom-0 left-0 text-xs p-0.5 bg-black bg-opacity-50 text-white rounded-tr-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">${tile.ownerGroup.name}</div>`;
                }
            } else if (!tile.OwnerGroupId && !currentActiveMap.gameLocked) {
                tileClasses += " buyable-tile";
                tileDataAttributes += ` data-price="${tile.price}"`;
                tileContent = ''; // Initially no text, will be added on first click
                // Initial displayColor for buyable tile will be default (e.g. gray), changed on click by 'ready-to-buy' class
            } else if (!tile.OwnerGroupId && currentActiveMap.gameLocked) {
                tileContent = `<span class="text-xs text-yellow-400 pointer-events-none">(قفل)</span>`;
            }

            html += `<div class="${tileClasses}" ${tileDataAttributes} style="background-color: ${displayColor};">`;
            // Only add coordinates and content if the tile is NOT destroyed
            if (!tile.isDestroyed) {
                html += `<div class="absolute top-0 right-0 text-xs p-0.5 bg-black bg-opacity-30 text-white rounded-bl-sm pointer-events-none">${tile.x},${tile.y}</div>`;
                html += `<div class="tile-content-wrapper flex flex-col items-center justify-center w-full h-full">${tileContent}</div>`;
            }
            // If tile.isDestroyed, the div will be empty, styled only by .tile-destroyed class (transparent, border)
            html += `</div>`;
        });

        html += `</div></div>`;
        contentDiv.innerHTML = html;
        attachEventListeners(); // Attach listeners
    }

    function resetBuyableTile(tileElement) {
        if (!tileElement) return;
        tileElement.classList.remove('ready-to-buy');
        const contentWrapper = tileElement.querySelector('.tile-content-wrapper');
        if (contentWrapper) contentWrapper.innerHTML = ''; // Clear "خرید (قیمت)" text
    }

    // Updated tile-destroyed event listener
    function updateTileElementOnDestroyed(tileElement, data) {
        tileElement.className = "tile aspect-square flex flex-col items-center justify-center relative group tile-destroyed"; // Set classes directly
        tileElement.style.backgroundColor = "transparent"; // Should be handled by CSS .tile-destroyed
        tileElement.innerHTML = ''; // Clear ALL content, including coordinates

        // Remove specific data attributes if they cause issues
        tileElement.removeAttribute('data-price');
    }

    function startCountdown(attackTime) {
        const countdownElement = document.getElementById('attack-countdown');
        if (!countdownElement) return;
        if (window.countdownIntervalId) clearInterval(window.countdownIntervalId);

        window.countdownIntervalId = setInterval(() => {
            const now = new Date().getTime();
            const distance = new Date(attackTime).getTime() - now;

            if (distance < 0) {
                clearInterval(window.countdownIntervalId);
                countdownElement.textContent = "زمان حمله فرا رسیده!";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            let countdownText = '';
            if (days > 0) countdownText += `${days} روز `;
            if (hours > 0 || days > 0) countdownText += `${hours} ساعت `;
            countdownText += `${minutes} دقیقه ${seconds} ثانیه`;
            countdownElement.textContent = countdownText;
        }, 1000);
    }

    function attachEventListeners() {
        // Reset currently selected tile when clicking outside
        document.addEventListener('click', function(event) {
            if (currentlySelectedBuyableTile) {
                const tileElement = currentlySelectedBuyableTile;
                // Check if the click is outside the currently selected tile
                if (!tileElement.contains(event.target)) {
                    resetBuyableTile(tileElement);
                    currentlySelectedBuyableTile = null;
                }
            }
        }, true); // Use capture phase to ensure it runs before other click listeners if needed


        const buyableTiles = document.querySelectorAll('.tile.buyable-tile');
        buyableTiles.forEach(tileElement => {
            tileElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent document click listener from immediately resetting this tile

                if (currentActiveMap.gameLocked || tileElement.classList.contains('tile-destroyed')) {
                    sendNotification('error', 'امکان انتخاب این ملک وجود ندارد (قفل یا نابود شده).');
                    if(currentlySelectedBuyableTile){
                        resetBuyableTile(currentlySelectedBuyableTile);
                        currentlySelectedBuyableTile = null;
                    }
                    return;
                }

                const tileId = tileElement.dataset.tileId;
                const price = parseInt(tileElement.dataset.price);
                const contentWrapper = tileElement.querySelector('.tile-content-wrapper');

                if (currentlySelectedBuyableTile === tileElement) { // Second click on the same tile
                    sendConfirmationNotification('confirm', `آیا از خرید این ملک به قیمت ${price} امتیاز مطمئن هستید؟`, async (confirmed) => {
                        if (confirmed) {
                            showGlobalLoading(true);
                            try {
                                await axios.post('/api/game/tile/buy', { tileId, mapId: currentActiveMap.id });
                                // Map will be re-rendered via socket 'map-updated' event
                                // Reset selection after attempting purchase
                                resetBuyableTile(tileElement);
                                currentlySelectedBuyableTile = null;
                            } catch (error) {
                                console.error("Error buying tile:", error);
                                sendNotification('error', error.response?.data?.message || 'خطا در خرید ملک.');
                                // Keep it selected on error to allow retry or deselection
                            } finally {
                                showGlobalLoading(false);
                            }
                        } else {
                             // If user cancels confirmation, keep it selected for now, or deselect:
                            // resetBuyableTile(tileElement);
                            // currentlySelectedBuyableTile = null;
                        }
                    });
                } else { // First click or click on a different buyable tile
                    if (currentlySelectedBuyableTile) {
                        resetBuyableTile(currentlySelectedBuyableTile); // Reset previously selected tile
                    }
                    currentlySelectedBuyableTile = tileElement;
                    tileElement.classList.add('ready-to-buy');
                    if (contentWrapper) {
                        contentWrapper.innerHTML = `<span class="text-xs text-white font-bold pointer-events-none">خرید (${price})</span>`;
                    }
                }
            });
        });

        const wallModalTriggers = document.querySelectorAll('.tile [data-action="open-wall-modal"]');
        wallModalTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                // If a tile was selected for buy, deselect it when opening wall modal
                if (currentlySelectedBuyableTile) {
                    resetBuyableTile(currentlySelectedBuyableTile);
                    currentlySelectedBuyableTile = null;
                }
                const tileElement = e.target.closest('.tile');
                const tileId = tileElement.dataset.tileId;
                openWallManagementModal(tileId);
            });
        });
    }


    async function openWallManagementModal(tileId) {
        // Corrected and restored function body
        showGlobalLoading(true);
        try {
            // If a tile was selected for buy, deselect it when opening wall modal
            if (currentlySelectedBuyableTile) {
                resetBuyableTile(currentlySelectedBuyableTile);
                currentlySelectedBuyableTile = null;
            }

            const response = await axios.get(`/api/game/map/${currentActiveMap.id}/state`);
            const mapData = response.data;
            const tile = mapData.tiles.find(t => t.id == tileId);

            if (!tile || !tile.walls) {
                sendNotification('error', 'اطلاعات ملک برای مدیریت دیوارها یافت نشد.');
                showGlobalLoading(false); // Hide loading on error
                return;
            }

            const invResponse = await axios.get('/api/game/ammunition/inventory');
            const groupInventory = invResponse.data.inventory;

            let modalHtml = `<div id="wall-modal-backdrop" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div class="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-white">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">مدیریت دیوارهای ملک (${tile.x}, ${tile.y})</h3>
                        <button id="close-wall-modal" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>`;

            if (currentActiveMap.gameLocked) {
                modalHtml += `<p class="text-center text-yellow-400 mb-4">بازی قفل شده است. امکان ارتقا یا استقرار مهمات جدید وجود ندارد.</p>`;
            }

            tile.walls.forEach(wall => {
                const wallTypeTranslations = { wood: 'چوبی', stone: 'سنگی', metal: 'فلزی' };
                modalHtml += `<div class="wall-section mb-6 p-4 border border-gray-700 rounded-lg bg-gray-750">
                                <h4 class="text-lg font-semibold mb-2 capitalize">دیوار ${wall.direction} (${wallTypeTranslations[wall.type]}) - سلامت: ${wall.health}</h4>

                                ${!currentActiveMap.gameLocked && wall.type !== 'metal' ? `
                                <div class="mb-3">
                                    <button class="upgrade-wall-btn btn-primary text-sm" data-wall-id="${wall.id}" data-current-type="${wall.type}">ارتقا دیوار</button>
                                    <span class="text-xs text-gray-400 ml-2">هزینه و نوع بعدی بر اساس ماتریس ارتقا</span>
                                </div>` : wall.type === 'metal' ? '<p class="text-sm text-green-400">دیوار در بالاترین سطح است.</p>' : ''}

                                <h5 class="text-md font-medium mt-3 mb-1">مهمات مستقر شده:</h5>`;
                if (wall.deployedAmmunitions && wall.deployedAmmunitions.length > 0) {
                    modalHtml += `<ul class="list-disc list-inside pl-4 text-sm space-y-1">`;
                    wall.deployedAmmunitions.forEach(ammo => {
                        modalHtml += `<li>${ammo.ammunitionDetail.name} (سلامت: ${ammo.health}/${ammo.ammunitionDetail.health})</li>`;
                    });
                    modalHtml += `</ul>`;
                } else {
                    modalHtml += `<p class="text-xs text-gray-400">هیچ مهماتی روی این دیوار مستقر نشده است.</p>`;
                }

                if (!currentActiveMap.gameLocked) {
                    modalHtml += `<div class="mt-3">
                                    <h5 class="text-md font-medium mb-1">افزودن مهمات جدید:</h5>
                                    <select class="deploy-ammo-select input-field bg-gray-700 text-sm w-full mb-2" data-wall-id="${wall.id}">
                                        <option value="">انتخاب مهمات از انبار...</option>`;
                    groupInventory.forEach(invItem => {
                        if (invItem.quantity > 0) {
                             modalHtml += `<option value="${invItem.AmmunitionId}" data-max-per-wall="${invItem.ammunition.maxPerWall}">${invItem.ammunition.name} (موجودی: ${invItem.quantity})</option>`;
                        }
                    });
                    modalHtml += `  </select>
                                    <input type="number" min="1" value="1" class="deploy-ammo-quantity input-field bg-gray-700 text-sm w-24 mr-2" placeholder="تعداد">
                                    <button class="deploy-ammo-btn btn-secondary text-sm" data-wall-id="${wall.id}">افزودن</button>
                                 </div>`;
                }
                modalHtml += `</div>`;
            });

            modalHtml += `</div></div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('close-wall-modal').addEventListener('click', () => {
                document.getElementById('wall-modal-backdrop').remove();
            });

            document.querySelectorAll('.upgrade-wall-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (currentActiveMap.gameLocked) {
                        sendNotification('error', 'بازی قفل شده است.'); return;
                    }
                    const wallId = e.target.dataset.wallId;
                    sendConfirmationNotification('confirm', "آیا از ارتقا این دیوار مطمئن هستید؟ امتیاز از گروه کسر خواهد شد.", async (confirmed) => {
                        if (!confirmed) return;
                        showGlobalLoading(true);
                        try {
                            await axios.post('/api/game/wall/upgrade', { wallId });
                            document.getElementById('wall-modal-backdrop').remove();
                        } catch (error) {
                            sendNotification('error', error.response?.data?.message || 'خطا در ارتقا دیوار.');
                        } finally {
                            showGlobalLoading(false);
                        }
                    });
                });
            });

            document.querySelectorAll('.deploy-ammo-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                     if (currentActiveMap.gameLocked) {
                        sendNotification('error', 'بازی قفل شده است.'); return;
                    }
                    const wallId = e.target.dataset.wallId;
                    const section = e.target.closest('.wall-section');
                    const select = section.querySelector('.deploy-ammo-select');
                    const quantityInput = section.querySelector('.deploy-ammo-quantity');
                    const ammunitionId = select.value;
                    const quantityToDeploy = parseInt(quantityInput.value);

                    if (!ammunitionId || quantityToDeploy <= 0) {
                        sendNotification('warning', 'لطفا مهمات و تعداد معتبر انتخاب کنید.');
                        return;
                    }
                    sendConfirmationNotification('confirm', `آیا از استقرار ${quantityToDeploy} عدد مهمات روی این دیوار مطمئن هستید؟`, async (confirmed) => {
                        if (!confirmed) return;
                        showGlobalLoading(true);
                        try {
                            await axios.post('/api/game/ammunition/deploy', { wallId, ammunitionId, quantityToDeploy });
                            document.getElementById('wall-modal-backdrop').remove();
                        } catch (error) {
                            sendNotification('error', error.response?.data?.message || 'خطا در استقرار مهمات.');
                        } finally {
                            showGlobalLoading(false);
                        }
                    });
                });
            });
        } catch (error) {
            sendNotification('error', error.response?.data?.message || 'خطا در باز کردن مودال مدیریت دیوارها.');
        } finally {
            showGlobalLoading(false);
        }
    }

    if (window.socket) {
        window.socket.on('map-updated', (data) => {
            console.log('Socket event: map-updated', data);
            if (data.map && data.map.id === currentActiveMap.id) {
                renderMap(data.map);
            } else if (data.tileId && data.updatedTile) { // Check if updatedTile exists
                if (data.updatedTile.MapId === currentActiveMap.id) {
                     fetchMapState();
                }
            }
        });

        window.socket.on('tile-lost', (data) => {
            if (data.mapId === currentActiveMap.id) {
                sendNotification('warning', `ملک در (${data.x}, ${data.y}) مالک خود را از دست داد.`);
            }
        });

        window.socket.on('group-eliminated', (data) => {
            if (data.mapId === currentActiveMap.id) {
                sendNotification('error', `گروه ${data.groupName || data.groupId} از بازی حذف شد!`);
            }
        });

        window.socket.on('game-locked', (data) => {
            if (data.mapId === currentActiveMap.id) {
                currentActiveMap.gameLocked = data.gameLocked;
                sendNotification('info', `وضعیت قفل بازی تغییر کرد: ${data.gameLocked ? 'قفل شد' : 'باز شد'}`);
                fetchMapState();
            }
        });

        window.socket.on('attack-imminent', (data) => {
            if (data.mapId === currentActiveMap.id && data.wave) {
                sendNotification('info', 'موج حمله جدیدی تعریف شد یا به‌روز شد!');
                const timerContainer = document.getElementById('attack-timer-container');
                if(timerContainer){
                    let newTimerHtml = `<p class="font-bold">موج حمله بعدی در: <span id="attack-countdown"></span></p>
                                     ${data.wave.isPowerVisible ? `<p>قدرت حمله: ${data.wave.power}</p>` : ''}`;
                    timerContainer.innerHTML = newTimerHtml;
                    startCountdown(data.wave.attackTime);
                }
            }
        });
        window.socket.on('admin-settings-changed', (data) => {
            if (data.event === 'map_created' || data.event === 'map_updated' || data.event === 'tile_price_changed' || data.event === 'game_reset'){
                 if (territorySection && territorySection.classList.contains('active')) {
                    console.log("Admin settings changed, re-initializing game view");
                    initializeGameView();
                }
            }
        });
         window.socket.on('force-reload', (data) => {
            if (territorySection && territorySection.classList.contains('active')) {
                sendNotification('warning', data.message || "تغییرات مهمی از سوی ادمین اعمال شده، صفحه مجدداً بارگذاری می‌شود...");
                setTimeout(() => window.location.reload(), 2000);
            }
        });

        window.socket.on('tile-destroyed', (data) => {
            if (data.mapId === currentActiveMap.id) {
                const tileElement = document.querySelector(`.tile[data-tile-id="${data.tileId}"]`);
                if (tileElement) {
                    tileElement.classList.add('tile-destroyed');
                    tileElement.style.backgroundColor = "transparent"; // یا هر رنگ دیگری برای نابود شده
                    // پاک کردن محتوای داخلی کاشی، به جز مختصات اگر هنوز نمایش داده می‌شود
                    const coordElement = tileElement.querySelector('.absolute.top-0.right-0');
                    tileElement.innerHTML = ''; // پاک کردن همه چیز
                    if (coordElement) tileElement.appendChild(coordElement); // اضافه کردن مجدد مختصات
                    tileElement.insertAdjacentHTML('beforeend', '<span class="text-xs text-gray-500">(نابود شده)</span>');

                    // حذف event listener ها اگر لازم باشد (اگرچه با پاک کردن innerHTML معمولا حذف می‌شوند)
                    // یا غیرفعال کردن امکان کلیک
                    const buyButton = tileElement.querySelector('.buy-tile-btn');
                    if (buyButton) buyButton.remove();
                    const wallModalTrigger = tileElement.querySelector('[data-action="open-wall-modal"]');
                    if (wallModalTrigger) wallModalTrigger.remove();

                    sendNotification('error', `کاشی در (${data.x}, ${data.y}) نابود شد.`);
                }
            }
        });
    }

    async function initializeGameView() {
        showGlobalLoading(true);
        contentDiv.style.display = 'none';
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = 'در حال بارگذاری اطلاعات بازی...';
        await fetchUserGroupData();
        if (await getActiveMap()) {
            await fetchMapState();
        }
        showGlobalLoading(false);
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (territorySection && territorySection.classList.contains('active')) {
                    initializeGameView();
                } else {
                    contentDiv.innerHTML = ''; // Clear content
                    if(window.countdownIntervalId) clearInterval(window.countdownIntervalId); // Clear countdown
                }
            }
        }
    });

    if (territorySection) {
        observer.observe(territorySection, { attributes: true });
        if (territorySection.classList.contains('active')) {
            initializeGameView();
        }
    }
    const refreshButton = document.getElementById('btn-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            if (territorySection && territorySection.classList.contains('active')) {
                sendNotification('info', 'در حال به‌روزرسانی اطلاعات نقشه...');
                initializeGameView();
            }
        });
    }
});
