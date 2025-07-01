document.addEventListener('DOMContentLoaded', function(){
    const pageTitle = document.getElementById('page-title');
    
    const desktopMenuItems = Array.from(document.querySelectorAll('#desktop-menu .menu-item'));
    
    const mobileMenuItems  = Array.from(document.querySelectorAll('#mobile-menu .menu-item'));

    const allMenuItems = [...desktopMenuItems, ...mobileMenuItems];

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

    allMenuItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();

            allMenuItems.forEach(i => {
                if (i.dataset.section === item.dataset.section) {
                    i.classList.add('active');
                } else {
                    i.classList.remove('active');
                }
            });

            showSection(item.dataset.section);

            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('translate-x-full')) {
                mobileMenu.classList.replace('translate-x-0', 'translate-x-full');
            }
        });
    });

    window.showSection = showSection;

    if (desktopMenuItems.length > 0) {
        desktopMenuItems[0].classList.add('active');
        mobileMenuItems.find(m => m.dataset.section === desktopMenuItems[0].dataset.section)?.classList.add('active');
    }
});
