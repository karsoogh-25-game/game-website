// public/js/leaderboard.js

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('scoreboard-content');
  const btnRefresh = document.getElementById('btn-refresh');

  // تابع اصلی برای گرفتن و نمایش اطلاعات جدول امتیازات
  // این تابع با فراخوانی، مستقیماً اجرا می‌شود.
  async function loadLeaderboard() {
    setLoadingState(true); // نمایش اسپینر
    if (container) {
      container.innerHTML = ''; // پاک کردن محتوای قبلی برای نمایش لودینگ
    }

    try {
      const res = await axios.get('/api/groups/ranking');
      const groups = res.data;

      if (!container) return;

      if (!Array.isArray(groups) || !groups.length) {
        container.innerHTML = `<p class="text-gray-400 text-center py-6">هنوز گروهی در جدول امتیازات ثبت نشده است.</p>`;
      } else {
        const tableHtml = `
          <div class="overflow-x-auto rounded-lg shadow-lg bg-gray-800">
            <table class="w-full text-sm text-right text-gray-300">
              <thead class="text-xs text-gray-400 uppercase bg-gray-900">
                <tr>
                  <th scope="col" class="px-6 py-3">رتبه</th>
                  <th scope="col" class="px-6 py-3">اسم گروه</th>
                  <th scope="col" class="px-6 py-3">نام سرگروه</th>
                  <th scope="col" class="px-6 py-3">امتیاز</th>
                </tr>
              </thead>
              <tbody>
                ${groups.map(g => {
                  let rowClass = 'bg-gray-800'; // رنگ پیش‌فرض
                  if (g.leaderGender === 'female') {
                    rowClass = 'bg-pastel-pink';
                  } else if (g.leaderGender === 'male') {
                    rowClass = 'bg-pastel-blue';
                  }
                  
                  return `
                    <tr class="border-b border-gray-700 ${rowClass}">
                      <td class="px-6 py-4 font-medium">${g.rank}</td>
                      <td class="px-6 py-4">${g.name}</td>
                      <td class="px-6 py-4">${g.leaderName}</td>
                      <td class="px-6 py-4 font-bold text-lg">${g.score}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
        container.innerHTML = tableHtml;
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      if (container) {
          container.innerHTML = `<p class="text-red-400 text-center py-6">خطا در بارگذاری جدول امتیازات.</p>`;
      }
      sendNotification('error', 'خطا در بارگذاری جدول امتیازات');
    } finally {
      setLoadingState(false); // مخفی کردن اسپینر
    }
  }

  // **مهم: منطق بارگذاری هنگام کلیک روی تب**
  // این کد تضمین می‌کند که با هر بار کلیک روی منو، تابع لودینگ اجرا شود.
  document.querySelectorAll('.menu-item[data-section="scoreboard"]').forEach(item => {
    item.addEventListener('click', loadLeaderboard);
  });

  // **مهم: منطق دکمه رفرش**
  // به دکمه رفرش سراسری گوش می‌دهیم
  if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        const activeSection = document.querySelector('.content-section.active');
        // فقط اگر بخش فعال "جدول امتیازات" بود، تابع بارگذاری را صدا بزن
        if (activeSection && activeSection.id === 'scoreboard') {
          loadLeaderboard();
        }
      });
  }

  // منطق آپدیت لحظه‌ای با سوکت
  if (window.socket) {
    window.socket.on('leaderboardUpdate', () => {
      const activeSection = document.querySelector('.content-section.active');
      // فقط اگر کاربر در حال مشاهده جدول امتیازات است، آن را آپدیت کن
      if (activeSection && activeSection.id === 'scoreboard') {
        loadLeaderboard();
      }
    });
  }
});