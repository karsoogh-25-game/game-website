document.addEventListener('DOMContentLoaded', () => {
  const menuItems = document.querySelectorAll('.menu-item');
  const sections = document.querySelectorAll('.content-section');
  const pageTitle = document.getElementById('page-title');
  let currentSection = 'dashboard';

  menuItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const targetId = item.dataset.section;
      const targetLabel = item.textContent.trim();
      if (targetId === currentSection) return;

      const currentEl = document.getElementById(currentSection);
      const targetEl = document.getElementById(targetId);

      // سوئیچ کردن کلاس‌ها
      currentEl.classList.remove('active');
      targetEl.classList.add('active');

      pageTitle.textContent = targetLabel;
      currentSection = targetId;

      // اگر موبایل بود، منو رو هم ببند
      document.getElementById('mobile-menu').classList.remove('open');
    });
  });

  // کنترل منو موبایل
  document.getElementById('open-mobile-menu').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.add('open');
  });
  document.getElementById('close-mobile-menu').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.remove('open');
  });
});
