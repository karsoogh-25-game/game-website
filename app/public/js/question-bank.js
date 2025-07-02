// app/public/js/question-bank.js
document.addEventListener('DOMContentLoaded', () => {
    const questionBankSection = document.getElementById('question_bank');
    const purchaseTabContent = document.getElementById('qb-purchase');
    const myQuestionsTabContent = document.getElementById('qb-my-questions');
    const submitComboTabContent = document.getElementById('qb-submit-combo');
    const historyTabContent = document.getElementById('qb-history');
    const tabButtons = document.querySelectorAll('.qb-tab-button');
    const headerRefreshButton = document.getElementById('btn-refresh');

    let currentGroupId = null;
    const pastelColors = [
        { name: 'صورتی', value: '#FFB3BA' }, { name: 'هلویی', value: '#FFDFBA' },
        { name: 'زرد لیمویی', value: '#FFFFBA' }, { name: 'سبز نعنایی', value: '#BAFFC9' },
        { name: 'آبی آسمانی', value: '#BAE1FF' }, { name: 'یاسی', value: '#E0BBE4' },
        { name: 'نارنجی', value: '#FFDAC1' }, { name: 'سبز دریایی', value: '#B5EAD7' },
        { name: 'بنفش', value: '#F0D9FF' }, { name: 'نیلی', value: '#C9C9FF' }
    ];

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active-tab', 'border-blue-500'));
            document.querySelectorAll('.qb-tab-content').forEach(content => content.classList.add('hidden'));

            button.classList.add('active-tab', 'border-blue-500');
            const targetTabId = button.dataset.tab;
            document.getElementById(targetTabId).classList.remove('hidden');

            switch (targetTabId) {
                case 'qb-purchase':
                    loadAvailableQuestions();
                    break;
                case 'qb-my-questions':
                    loadPurchasedQuestions();
                    break;
                case 'qb-submit-combo':
                    loadAnsweredQuestionsForCombo();
                    break;
                case 'qb-history':
                    loadSubmittedCombosHistory();
                    break;
            }
        });
    });

    function showLoading(tabElement, message = "در حال بارگذاری...") {
        tabElement.innerHTML = `<p class="text-gray-300 text-center py-4">${message}</p>`;
    }

    async function loadAvailableQuestions() {
        showLoading(purchaseTabContent, 'در حال بارگذاری سوالات...');
        try {
            const response = await axios.get('/api/question-bank/questions/available');
            const questionsByColor = response.data.reduce((acc, q) => {
                if (!acc[q.color]) acc[q.color] = [];
                acc[q.color].push(q);
                return acc;
            }, {});

            if (Object.keys(questionsByColor).length === 0) {
                purchaseTabContent.innerHTML = '<p class="text-gray-300 text-center py-4">در حال حاضر سوال فعالی برای خرید وجود ندارد.</p>';
                return;
            }

            let html = '';
            for (const color in questionsByColor) {
                const colorName = pastelColors.find(pc => pc.value === color)?.name || color;
                html += `
                    <div class="mb-8">
                        <h3 class="text-xl font-semibold text-white mb-3 border-b-2 pb-1" style="border-color: ${color};">
                            ویترین ${colorName}
                        </h3>
                        <div class="flex overflow-x-auto space-x-4 space-x-reverse py-2 custom-scrollbar">
                            ${questionsByColor[color].map(q => `
                                <div class="question-card flex-shrink-0 w-48 h-64 rounded-lg p-4 shadow-lg text-center flex flex-col justify-between items-center cursor-pointer"
                                     style="background-color: ${q.color};"
                                     data-question-id="${q.id}" data-price="${q.price}">
                                    <div class="w-full h-full flex flex-col justify-center items-center">
                                        <span class="text-5xl font-bold text-black opacity-80">${q.points}</span>
                                        <span class="text-xs text-black opacity-70 mt-1">امتیاز</span>
                                    </div>
                                    <div class="text-xs text-black opacity-60 mt-auto">قیمت: ${q.price} امتیاز</div>
                                    <button class="buy-btn hidden mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm w-full">خرید</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            purchaseTabContent.innerHTML = html;
            addCardClickListeners();
        } catch (error) {
            purchaseTabContent.innerHTML = `<p class="text-red-400 text-center py-4">خطا در بارگذاری سوالات: ${error.response?.data?.message || error.message}</p>`;
        }
    }

    function addCardClickListeners() {
        document.querySelectorAll('.question-card').forEach(card => {
            const buyButton = card.querySelector('.buy-btn');
            card.addEventListener('click', (e) => {
                if (e.target === buyButton) {
                    handlePurchase(card.dataset.questionId, card.dataset.price, card.style.backgroundColor);
                } else {
                    document.querySelectorAll('.question-card .buy-btn').forEach(btn => btn.classList.add('hidden'));
                    buyButton.classList.remove('hidden');
                }
            });
        });
    }

    async function handlePurchase(questionId, price, color) {
        sendConfirmationNotification('confirm', `آیا از خرید این سوال به قیمت ${price} امتیاز اطمینان دارید؟`, async (confirmed) => {
            if (confirmed) {
                setLoadingState(true);
                try {
                    const response = await axios.post('/api/question-bank/questions/purchase', { questionId });
                    sendNotification('success', response.data.message);
                    loadAvailableQuestions();
                } catch (error) {
                    sendNotification('error', `خطا در خرید: ${error.response?.data?.message || error.message}`);
                } finally {
                    setLoadingState(false);
                }
            }
        });
    }

    async function loadPurchasedQuestions() {
        showLoading(myQuestionsTabContent, 'در حال بارگذاری سوالات خریداری شده...');
        try {
            const response = await axios.get('/api/question-bank/questions/purchased');
            const questions = response.data;

            if (questions.length === 0) {
                myQuestionsTabContent.innerHTML = '<p class="text-gray-300 text-center py-4">هنوز سوالی خریداری نکرده‌اید.</p>';
                return;
            }

            myQuestionsTabContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${questions.map(pq => `
                        <div class="purchased-question-item bg-gray-700 p-4 rounded-lg shadow">
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="font-semibold text-lg" style="color: ${pq.question.color};">${pq.question.name}</h4>
                                <span class="text-sm font-bold px-2 py-1 rounded" style="background-color: ${pq.question.color}; color: black;">${pq.question.points} امتیاز</span>
                            </div>
                            <p class="text-xs text-gray-400 mb-1">تاریخ خرید: ${new Date(pq.purchaseDate).toLocaleDateString('fa-IR')}</p>
                            <p class="text-xs text-gray-400 mb-3">وضعیت: ${pq.status === 'purchased' ? 'خریداری شده (بدون جواب)' : 'پاسخ داده شده'}</p>

                            ${pq.answerImagePath ? `
                                <div class="mb-2">
                                    <p class="text-sm text-gray-300">جواب شما:
                                        <a href="${pq.answerImagePath}" target="_blank" class="text-blue-400 hover:underline">مشاهده فایل</a>
                                    </p>
                                </div>
                            ` : ''}

                            <button class="view-question-btn text-sm text-blue-400 hover:text-blue-300" data-purchased-id="${pq.id}">
                                مشاهده سوال و آپلود/تغییر جواب
                            </button>
                        </div>
                    `).join('')}
                </div>

                <!-- Modal for Viewing Question and Uploading Answer -->
                <div id="view-question-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 hidden z-50">
                    <div class="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div id="modal-question-content" class="text-gray-200">
                            <!-- Content will be loaded here -->
                        </div>
                        <button id="close-modal-btn" class="mt-4 btn-secondary px-3 py-1">بستن</button>
                    </div>
                </div>
            `;
            addPurchasedQuestionClickListeners();
        } catch (error) {
            myQuestionsTabContent.innerHTML = `<p class="text-red-400 text-center py-4">خطا در بارگذاری سوالات خریداری شده: ${error.response?.data?.message || error.message}</p>`;
        }
    }

    function addPurchasedQuestionClickListeners() {
        document.querySelectorAll('.view-question-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const purchasedId = button.dataset.purchasedId;
                setLoadingState(true);
                try {
                    const response = await axios.get(`/api/question-bank/questions/purchased/${purchasedId}`);
                    renderQuestionModal(response.data);
                } catch (error) {
                    sendNotification('error', `خطا در دریافت جزئیات سوال: ${error.response?.data?.message || error.message}`);
                } finally {
                    setLoadingState(false);
                }
            });
        });

        document.getElementById('close-modal-btn').addEventListener('click', () => {
            document.getElementById('view-question-modal').classList.add('hidden');
        });
    }

    function renderQuestionModal(purchasedQuestion) {
        const modalContent = document.getElementById('modal-question-content');
        const question = purchasedQuestion.question;
        modalContent.innerHTML = `
            <h3 class="text-2xl font-bold mb-3" style="color: ${question.color};">${question.name}</h3>
            <p class="text-sm text-gray-400 mb-1">امتیاز: ${question.points}</p>
            <img src="${question.imagePath}" alt="تصویر سوال" class="max-w-full h-auto rounded-lg border border-gray-600 my-4">

            <h4 class="text-lg font-semibold mt-6 mb-2">ارسال یا تغییر جواب</h4>
            ${purchasedQuestion.answerImagePath ? `
                <p class="text-sm text-green-400 mb-2">شما قبلا یک جواب آپلود کرده‌اید:
                    <a href="${purchasedQuestion.answerImagePath}" target="_blank" class="hover:underline">مشاهده فایل فعلی</a>
                </p>
                <button id="delete-answer-btn" data-purchased-id="${purchasedQuestion.id}" class="btn-secondary text-red-500 hover:text-red-400 px-3 py-1 text-sm mb-3">حذف جواب فعلی</button>
            ` : '<p class="text-sm text-yellow-400 mb-2">هنوز جوابی برای این سوال آپلود نکرده‌اید.</p>'}

            <input type="file" id="answer-file-input" accept="image/jpeg,image/png,image/jpg,application/pdf" class="input-field w-full mb-2">
            <button id="upload-answer-btn" data-purchased-id="${purchasedQuestion.id}" class="btn-primary w-full py-2">آپلود جواب</button>
            <p id="upload-status" class="text-xs mt-2"></p>
        `;
        document.getElementById('view-question-modal').classList.remove('hidden');

        document.getElementById('upload-answer-btn').addEventListener('click', () => handleAnswerUpload(purchasedQuestion.id));
        if (purchasedQuestion.answerImagePath) {
            document.getElementById('delete-answer-btn').addEventListener('click', () => handleDeleteAnswer(purchasedQuestion.id));
        }
    }

    async function handleAnswerUpload(purchasedQuestionId) {
        const fileInput = document.getElementById('answer-file-input');
        const uploadStatus = document.getElementById('upload-status');
        if (!fileInput.files || fileInput.files.length === 0) {
            uploadStatus.textContent = 'لطفا یک فایل انتخاب کنید.';
            uploadStatus.className = 'text-xs mt-2 text-red-400';
            return;
        }
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('answerFile', file);

        uploadStatus.textContent = 'در حال آپلود...';
        uploadStatus.className = 'text-xs mt-2 text-yellow-400';
        setLoadingState(true);

        try {
            const response = await axios.post(`/api/question-bank/answers/${purchasedQuestionId}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            sendNotification('success', response.data.message);
            uploadStatus.textContent = 'آپلود موفقیت‌آمیز بود.';
            uploadStatus.className = 'text-xs mt-2 text-green-400';
            loadPurchasedQuestions();
            const updatedPq = await axios.get(`/api/question-bank/questions/purchased/${purchasedQuestionId}`);
            renderQuestionModal(updatedPq.data);
        } catch (error) {
            sendNotification('error', `خطا در آپلود: ${error.response?.data?.message || error.message}`);
            uploadStatus.textContent = `خطا: ${error.response?.data?.message || error.message}`;
            uploadStatus.className = 'text-xs mt-2 text-red-400';
        } finally {
            setLoadingState(false);
        }
    }

    async function handleDeleteAnswer(purchasedQuestionId) {
        sendConfirmationNotification('confirm', `آیا از حذف جواب فعلی اطمینان دارید؟`, async (confirmed) => {
            if(confirmed) {
                setLoadingState(true);
                try {
                    await axios.delete(`/api/question-bank/answers/${purchasedQuestionId}/delete`);
                    sendNotification('success', 'جواب با موفقیت حذف شد.');
                    loadPurchasedQuestions();
                    const updatedPq = await axios.get(`/api/question-bank/questions/purchased/${purchasedQuestionId}`);
                    renderQuestionModal(updatedPq.data);
                } catch (error) {
                     sendNotification('error', `خطا در حذف جواب: ${error.response?.data?.message || error.message}`);
                } finally {
                    setLoadingState(false);
                }
            }
        });
    }


    // 3. Submit Combo Tab
    let selectedForCombo = [];
    async function loadAnsweredQuestionsForCombo() {
        showLoading(submitComboTabContent, 'در حال بارگذاری سوالات پاسخ داده شده...');
        selectedForCombo = [];
        try {
            const response = await axios.get('/api/question-bank/combos/answered-questions');
            const questions = response.data;

            if (questions.length === 0) {
                submitComboTabContent.innerHTML = '<p class="text-gray-300 text-center py-4">هنوز سوالی که پاسخ داده باشید و آماده ارسال باشد، وجود ندارد.</p>';
                return;
            }

            submitComboTabContent.innerHTML = `
                <p class="text-gray-300 mb-3">حداکثر 3 سوال را برای ارسال به عنوان کمبو انتخاب کنید:</p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    ${questions.map(pq => `
                        <div class="combo-candidate-card bg-gray-700 p-3 rounded-lg shadow cursor-pointer border-2 border-transparent hover:border-blue-500"
                             data-purchased-id="${pq.id}" data-question-name="${pq.question.name}" style="opacity: 1;">
                            <div class="flex justify-between items-center mb-1">
                                <h5 class="font-semibold" style="color: ${pq.question.color};">${pq.question.name}</h5>
                                <span class="text-xs font-bold px-1 py-0.5 rounded" style="background-color: ${pq.question.color}; color: black;">${pq.question.points} امتیاز</span>
                            </div>
                            <p class="text-xs text-gray-400">پاسخ شما آپلود شده است.</p>
                        </div>
                    `).join('')}
                </div>
                <div id="selected-combo-summary" class="my-4 p-3 bg-gray-700 rounded">
                    <p class="font-semibold text-white">سوالات انتخاب شده برای کمبو:</p>
                    <ul id="selected-list" class="list-disc list-inside pl-4 text-gray-300">
                        <!-- Selected items will be listed here -->
                         <li class="text-gray-500 italic">هنوز سوالی انتخاب نشده.</li>
                    </ul>
                </div>
                <button id="submit-combo-btn" class="btn-primary w-full py-2" disabled>ارسال کمبو</button>
            `;
            addComboCandidateListeners();
        } catch (error) {
            submitComboTabContent.innerHTML = `<p class="text-red-400 text-center py-4">خطا در بارگذاری سوالات: ${error.response?.data?.message || error.message}</p>`;
        }
    }

    function addComboCandidateListeners() {
        const cards = document.querySelectorAll('.combo-candidate-card');
        const submitBtn = document.getElementById('submit-combo-btn');
        const selectedListUl = document.getElementById('selected-list');

        cards.forEach(card => {
            card.addEventListener('click', () => {
                const purchasedId = parseInt(card.dataset.purchasedId);
                const questionName = card.dataset.questionName;

                const index = selectedForCombo.findIndex(item => item.id === purchasedId);

                if (index > -1) {
                    selectedForCombo.splice(index, 1);
                    card.classList.remove('border-green-500', 'selected-for-combo');
                    card.classList.add('border-transparent');
                    card.style.opacity = "1";
                } else {
                    if (selectedForCombo.length < 3) {
                        selectedForCombo.push({id: purchasedId, name: questionName});
                        card.classList.add('border-green-500', 'selected-for-combo');
                        card.classList.remove('border-transparent');
                        card.style.opacity = "0.7";

                    } else {
                        sendNotification('info', 'حداکثر 3 سوال می‌توانید برای کمبو انتخاب کنید.');
                    }
                }
                updateSelectedComboSummary(selectedListUl, submitBtn);
            });
        });

        submitBtn.addEventListener('click', handleSubmitCombo);
    }

    function updateSelectedComboSummary(ulElement, submitBtn) {
        ulElement.innerHTML = '';
        if (selectedForCombo.length === 0) {
            ulElement.innerHTML = '<li class="text-gray-500 italic">هنوز سوالی انتخاب نشده.</li>';
            submitBtn.disabled = true;
        } else {
            selectedForCombo.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item.name;
                ulElement.appendChild(li);
            });
            submitBtn.disabled = false;
        }
    }

    async function handleSubmitCombo() {
        if (selectedForCombo.length === 0) {
            sendNotification('error', 'لطفا حداقل یک سوال برای ارسال انتخاب کنید.');
            return;
        }
        const idsToSubmit = selectedForCombo.map(item => item.id);
        sendConfirmationNotification('confirm', `آیا از ارسال ${selectedForCombo.length} سوال انتخاب شده به عنوان کمبو اطمینان دارید؟ پس از ارسال، دیگر نمی‌توانید جواب‌ها را تغییر دهید.`, async (confirmed) => {
            if(confirmed){
                setLoadingState(true);
                try {
                    const response = await axios.post('/api/question-bank/combos/submit', { purchasedQuestionIds: idsToSubmit });
                    sendNotification('success', response.data.message);
                    selectedForCombo = []; // Clear selection
                    loadAnsweredQuestionsForCombo(); // Refresh this tab
                    loadPurchasedQuestions(); // Refresh "My Questions"
                    loadSubmittedCombosHistory(); // Refresh history
                } catch (error) {
                    sendNotification('error', `خطا در ارسال کمبو: ${error.response?.data?.message || error.message}`);
                } finally {
                    setLoadingState(false);
                }
            }
        });
    }

    async function loadSubmittedCombosHistory() {
        showLoading(historyTabContent, 'در حال بارگذاری تاریخچه کمبوها...');
        try {
            const response = await axios.get('/api/question-bank/combos/history');
            const combos = response.data;

            if (combos.length === 0) {
                historyTabContent.innerHTML = '<p class="text-gray-300 text-center py-4">هنوز هیچ کمبویی ارسال نکرده‌اید.</p>';
                return;
            }

            let html = '<div class="space-y-4">';
            combos.forEach(combo => {
                let statusText = '';
                let statusColor = 'text-yellow-400';
                switch(combo.status) {
                    case 'pending_correction': statusText = 'در انتظار تصحیح'; break;
                    case 'corrected': statusText = `تصحیح شده - امتیاز: ${combo.awardedPoints}`; statusColor = 'text-green-400'; break;
                    case 'partially_correct': statusText = `بخشی صحیح - امتیاز: ${combo.awardedPoints}`; statusColor = 'text-green-300'; break;
                    case 'fully_correct': statusText = `کاملا صحیح - امتیاز: ${combo.awardedPoints}`; statusColor = 'text-green-400'; break;
                    case 'incorrect': statusText = `نادرست - امتیاز: ${combo.awardedPoints}`; statusColor = 'text-red-400'; break;
                    default: statusText = combo.status;
                }

                html += `
                    <div class="bg-gray-700 p-4 rounded-lg shadow">
                        <div class="flex justify-between items-center mb-2">
                            <h5 class="font-semibold text-white">کمبو: ${combo.id}</h5>
                            <span class="text-sm ${statusColor}">${statusText}</span>
                        </div>
                        <p class="text-xs text-gray-400">تاریخ ارسال: ${new Date(combo.submissionDate).toLocaleString('fa-IR')}</p>
                        ${combo.correctionDate ? `<p class="text-xs text-gray-400">تاریخ تصحیح: ${new Date(combo.correctionDate).toLocaleString('fa-IR')}</p>` : ''}
                        <p class="text-sm text-gray-300 mt-2">سوالات این کمبو:</p>
                        <ul class="list-disc list-inside pl-4 text-gray-400 text-xs">
                            ${combo.submittedQuestions.map(sq => {
                                let questionStatus = '';
                                if(combo.status !== 'pending_correction' && sq.correctionStatus){
                                    questionStatus = sq.correctionStatus === 'correct' ? '(صحیح)' : '(غلط)';
                                }
                                return `<li>${sq.question.name} <span style="color:${sq.question.color}">(${sq.question.points} امتیاز)</span> ${questionStatus}</li>`;
                            }).join('')}
                        </ul>
                        ${combo.correctionNotes ? `<div class="mt-2 p-2 bg-gray-600 rounded"><p class="text-xs text-gray-300">یادداشت مصحح: ${combo.correctionNotes}</p></div>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            historyTabContent.innerHTML = html;

        } catch (error) {
            historyTabContent.innerHTML = `<p class="text-red-400 text-center py-4">خطا در بارگذاری تاریخچه: ${error.response?.data?.message || error.message}</p>`;
        }
    }


    function setupSocketListeners() {
        if (!window.socket) return;

        window.socket.on('connect', () => {
            if (currentGroupId) {
                window.socket.emit('joinGroupRoom', currentGroupId);
            }
        });

        document.addEventListener('groupInfoLoaded', (event) => {
            if (event.detail && event.detail.groupId) {
                currentGroupId = event.detail.groupId;
                if (window.socket.connected) {
                    window.socket.emit('joinGroupRoom', currentGroupId);
                }
            }
        });


        window.socket.on('newQuestionAdded', (question) => {
            if (document.getElementById('qb-purchase')?.classList.contains('active-content')) {
                loadAvailableQuestions();
            }
        });
        window.socket.on('questionUpdated', (question) => {
             if (document.getElementById('qb-purchase')?.classList.contains('active-content')) {
                loadAvailableQuestions();
            }
        });
        window.socket.on('questionDeleted', ({ id }) => {
            if (document.getElementById('qb-purchase')?.classList.contains('active-content')) {
                loadAvailableQuestions();
            }
        });

        window.socket.on('questionPurchased', (data) => {
            if (document.getElementById('qb-purchase')?.classList.contains('active-content')) {
                loadAvailableQuestions();
            }
            if (document.getElementById('qb-my-questions')?.classList.contains('active-content')) {
                loadPurchasedQuestions();
            }
            const scoreCard = document.getElementById('card-score');
            if (scoreCard) scoreCard.textContent = data.newScore;
        });

        window.socket.on('answerUploaded', (purchasedQuestion) => {
            if (document.getElementById('qb-my-questions')?.classList.contains('active-content')) {
                loadPurchasedQuestions();
            }
            if (document.getElementById('qb-submit-combo')?.classList.contains('active-content')) {
                loadAnsweredQuestionsForCombo();
            }
            const modal = document.getElementById('view-question-modal');
            if (modal && !modal.classList.contains('hidden')) {
                const uploadBtn = modal.querySelector('#upload-answer-btn');
                if (uploadBtn && parseInt(uploadBtn.dataset.purchasedId) === purchasedQuestion.id) {
                    renderQuestionModal(purchasedQuestion);
                }
            }
        });

        window.socket.on('answerDeleted', (data) => {
             if (document.getElementById('qb-my-questions')?.classList.contains('active-content')) {
                loadPurchasedQuestions();
            }
            if (document.getElementById('qb-submit-combo')?.classList.contains('active-content')) {
                loadAnsweredQuestionsForCombo();
            }
            const modal = document.getElementById('view-question-modal');
            if (modal && !modal.classList.contains('hidden')) {
                const uploadBtn = modal.querySelector('#upload-answer-btn');
                if (uploadBtn && parseInt(uploadBtn.dataset.purchasedId) === data.purchasedQuestionId) {
                     axios.get(`/api/question-bank/questions/purchased/${data.purchasedQuestionId}`)
                        .then(response => renderQuestionModal(response.data))
                        .catch(err => console.error("Error refetching for modal after delete", err));
                }
            }
        });

        window.socket.on('comboSubmitted', (combo) => {
             if (document.getElementById('qb-submit-combo')?.classList.contains('active-content')) {
                loadAnsweredQuestionsForCombo();
            }
            if (document.getElementById('qb-my-questions')?.classList.contains('active-content')) {
                loadPurchasedQuestions();
            }
            if (document.getElementById('qb-history')?.classList.contains('active-content')) {
                loadSubmittedCombosHistory();
            }
        });

        window.socket.on('comboCorrected', (combo) => {
            if (document.getElementById('qb-history')?.classList.contains('active-content')) {
                loadSubmittedCombosHistory();
            }
            const scoreCard = document.getElementById('card-score');
            if (scoreCard && combo.group && typeof combo.group.score !== 'undefined') {
            }
             if (document.getElementById('qb-my-questions')?.classList.contains('active-content')) {
                loadPurchasedQuestions();
            }
            sendNotification('success', `کمبوی شما (ID: ${combo.id}) تصحیح شد و ${combo.awardedPoints} امتیاز کسب کردید!`);
        });
    }


    function initQuestionBank() {
        if (!questionBankSection) return;

        const isActiveOnLoad = document.querySelector('.menu-item.active')?.dataset.section === 'question_bank';
        const currentVisibleTab = questionBankSection.querySelector('.qb-tab-button.active-tab')?.dataset.tab;

        if (isActiveOnLoad && currentVisibleTab) {
            switch (currentVisibleTab) {
                case 'qb-purchase': loadAvailableQuestions(); break;
                case 'qb-my-questions': loadPurchasedQuestions(); break;
                case 'qb-submit-combo': loadAnsweredQuestionsForCombo(); break;
                case 'qb-history': loadSubmittedCombosHistory(); break;
            }
        }

        document.querySelectorAll('.menu-item[data-section="question_bank"]').forEach(item => {
            item.addEventListener('click', () => {
                const activeSubTab = questionBankSection.querySelector('.qb-tab-button.active-tab')?.dataset.tab || 'qb-purchase';
                 switch (activeSubTab) {
                    case 'qb-purchase': loadAvailableQuestions(); break;
                    case 'qb-my-questions': loadPurchasedQuestions(); break;
                    case 'qb-submit-combo': loadAnsweredQuestionsForCombo(); break;
                    case 'qb-history': loadSubmittedCombosHistory(); break;
                }
            });
        });

        headerRefreshButton.addEventListener('click', () => {
            if (document.querySelector('.content-section.active')?.id === 'question_bank') {
                const activeSubTab = questionBankSection.querySelector('.qb-tab-button.active-tab')?.dataset.tab;
                if (activeSubTab) {
                    switch (activeSubTab) {
                        case 'qb-purchase': loadAvailableQuestions(); break;
                        case 'qb-my-questions': loadPurchasedQuestions(); break;
                        case 'qb-submit-combo': loadAnsweredQuestionsForCombo(); break;
                        case 'qb-history': loadSubmittedCombosHistory(); break;
                    }
                }
            }
        });

        setupSocketListeners();
    }
    if (document.getElementById('question_bank')) {
        axios.get('/api/groups/my-group-id')
            .then(response => {
                if (response.data && response.data.groupId) {
                    currentGroupId = response.data.groupId;
                    document.dispatchEvent(new CustomEvent('groupInfoLoaded', { detail: { groupId: currentGroupId } }));
                }
            })
            .catch(err => console.warn("Could not fetch group ID for question bank init:", err.message))
            .finally(() => {
                 initQuestionBank();
            });
    }
});

const style = document.createElement('style');
style.textContent = `
  .custom-scrollbar::-webkit-scrollbar {
    height: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #2d3748; /* bg-gray-800 */
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4a5568; /* bg-gray-600 */
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #718096; /* bg-gray-500 */
  }
  .question-card .buy-btn {
    transition: opacity 0.2s ease-in-out;
  }
  .combo-candidate-card.selected-for-combo {
    /* border-color: #48bb78; /* green-500 */
    box-shadow: 0 0 0 2px #48bb78; /* Simulate thicker border */
  }
  .qb-tab-button.active-tab {
    border-bottom-width: 2px !important; /* Ensure it overrides tailwind */
    border-color: #4299e1 !important; /* blue-500 */
    color: white !important;
  }
`;
document.head.appendChild(style);
