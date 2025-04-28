document.addEventListener('DOMContentLoaded', function(){
  // tabs & sections
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  const pageTitle = document.getElementById('page-title');

  function showSection(id){
    const current = document.querySelector('.content-section.active');
    const next    = document.getElementById(id);
    if (current.id === id) return;

    current.classList.remove('fade-in');
    current.classList.add('fade-out');
    current.addEventListener('transitionend', function handler(){
      current.classList.remove('active','fade-out');
      current.removeEventListener('transitionend', handler);
      next.classList.add('active','fade-in');
      pageTitle.textContent = menuItems.find(i => i.dataset.section===id).innerText;
    });
  }

  menuItems.forEach(item=>{
    item.addEventListener('click', e=>{
      e.preventDefault();
      menuItems.forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
      showSection(item.dataset.section);
    });
  });
});
