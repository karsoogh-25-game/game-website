document.addEventListener('DOMContentLoaded', function(){
  // sidebar toggles
  const mobileMenu = document.getElementById('mobile-menu');
  document.getElementById('open-mobile-menu').onclick = () => mobileMenu.classList.replace('translate-x-full','translate-x-0');
  document.getElementById('close-mobile-menu').onclick = () => mobileMenu.classList.replace('translate-x-0','translate-x-full');
});
