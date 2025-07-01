function setLoadingState(isLoading) {
  const spinnerElement = document.getElementById('loading-spinner');
  if (spinnerElement) {
    spinnerElement.style.display = isLoading ? 'flex' : 'none';
  }
}

function fadeOutElement(el) {
  return new Promise(resolve => {
    el.classList.remove('fade-in');
    el.classList.add('fade-out');
    el.addEventListener('transitionend', function handler() {
      el.removeEventListener('transitionend', handler);
      resolve();
    });
  });
}

function fadeInElement(el) {
  el.classList.remove('fade-out');
  el.classList.add('fade-in');
}

window.setLoadingState = setLoadingState;
window.fadeOutElement = fadeOutElement;
window.fadeInElement = fadeInElement;
