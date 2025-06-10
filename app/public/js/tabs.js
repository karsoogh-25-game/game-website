document.addEventListener('DOMContentLoaded', function(){
    const pageTitle = document.getElementById('page-title');
    
    // --- START OF FIX: انتخابگرها به طور کامل از هم جدا شدند ---
    // انتخاب آیتم‌های منوی دسکتاپ فقط برای مدیریت کلاس active
    const desktopMenuItems = Array.from(document.querySelectorAll('#desktop-menu .menu-item'));
    
    // انتخاب آیتم‌های منوی موبایل برای مدیریت کلیک و کلاس active
    const mobileMenuItems  = Array.from(document.querySelectorAll('#mobile-menu .menu-item'));

    // تمام آیتم‌ها برای همگام‌سازی کلاس active
    const allMenuItems = [...desktopMenuItems, ...mobileMenuItems];
    // --- END OF FIX ---

    // این تابع مسئولیت جابجایی بین بخش‌ها را دارد و بدون تغییر باقی می‌ماند
    function showSection(id){
        const current = document.querySelector('.content-section.active');
        const next    = document.getElementById(id);
        if (!current || !next || current.id === id) return;

        current.classList.remove('fade-in');
        current.classList.add('fade-out');
        current.addEventListener('transitionend', function handler(){
            current.classList.remove('active','fade-out');
            current.removeEventListener('transitionend', handler);
            
            next.classList.add('active','fade-in');
            const menuItem = allMenuItems.find(i => i.dataset.section === id);
            if (menuItem) {
                pageTitle.textContent = menuItem.innerText;
            }
        }, { once: true });
    }

    // --- START OF FIX: منطق فقط روی آیتم‌های کلیک شده اعمال می‌شود ---
    // به هر آیتم در هر دو منو، event listener اضافه می‌کنیم
    allMenuItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();

            // همگام‌سازی کلاس active در هر دو منو
            allMenuItems.forEach(i => {
                if (i.dataset.section === item.dataset.section) {
                    i.classList.add('active');
                } else {
                    i.classList.remove('active');
                }
            });

            // نمایش بخش مربوطه
            showSection(item.dataset.section);

            // اگر روی منوی موبایل کلیک شد، آن را ببند
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('translate-x-full')) {
                mobileMenu.classList.replace('translate-x-0', 'translate-x-full');
            }
        });
    });
    // --- END OF FIX ---

    // --- START OF FIX: حذف کامل تابع updateMenuView ---
    // دیگر نیازی به این تابع در سمت کلاینت نیست، چون سرور مسئولیت رندر را بر عهده دارد.
    // document.addEventListener('feature-flags-loaded', updateMenuView);
    // --- END OF FIX ---


    // تابع showSection را در دسترس سایر اسکریپت‌ها قرار می‌دهیم
    window.showSection = showSection;

    // در ابتدای بارگذاری، کلاس active را به اولین آیتم قابل مشاهده در منوی دسکتاپ می‌دهیم
    if (desktopMenuItems.length > 0) {
        desktopMenuItems[0].classList.add('active');
        mobileMenuItems.find(m => m.dataset.section === desktopMenuItems[0].dataset.section)?.classList.add('active');
    }
});
