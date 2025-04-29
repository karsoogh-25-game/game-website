// public/js/training.js

document.addEventListener('DOMContentLoaded', function() {
  const container  = document.getElementById('training-list');

  async function loadTraining() {
    container.innerHTML = `<p class="text-gray-400">در حال بارگذاری محتواها…</p>`;
    try {
      const res = await axios.get('/api/training');
      const data = res.data;
      if (!data.length) {
        container.innerHTML = `<p class="text-gray-400 text-center py-6">هیچ محتوایی موجود نیست.</p>`;
      } else {
        data.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        container.innerHTML = data.map(c=>`
          <div class="bg-slate-800 rounded-lg shadow-lg p-4">
            <h3 class="text-xl font-semibold text-green-400">${c.title}</h3>
            <p class="text-slate-300 mt-2">${c.shortDescription||''}</p>
            <p class="text-slate-400 mt-2 whitespace-pre-line">${c.longDescription||''}</p>
            ${c.attachments.length ? `
              <div class="flex flex-wrap gap-2 mt-3">
                ${c.attachments.map(att=>`
                  <a href="${att.path}" target="_blank"
                     class="attachment-icon px-3 py-2 rounded-lg flex items-center gap-2">
                    <i class="fas fa-download"></i>${att.originalName}
                  </a>`).join('')}
              </div>` : ''}
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Error loading training:', err);
      container.innerHTML = `<p class="text-red-400">خطا در بارگذاری محتواها</p>`;
    }
  }

  // هنگام کلیک روی تبِ training
  document.querySelectorAll('[data-section="training"]').forEach(el=>
    el.addEventListener('click', loadTraining)
  );
  // اگر داشبورد باز است و training فعال است
  if (document.querySelector('.content-section.active')?.id==='training') {
    loadTraining();
  }
});
