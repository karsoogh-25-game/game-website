// /js/alert.js

function sendNotification(type, text) {
  let alertContainer = document.getElementById('alert-container');
  
  const alerts = {
    info: {
      icon: `<svg class="w-6 h-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
      color: "bg-blue-500"
    },
    error: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
      color: "bg-red-500"
    },
    warning: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>`,
      color: "bg-yellow-500"
    },
    success: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
      color: "bg-green-500"
    }
  };

  let notification = document.createElement("div");
  notification.classList.add('alert-box', alerts[type].color, 'text-white', 'flex', 'items-center', 'rounded-md', 'opacity-0');
  notification.innerHTML = `${alerts[type].icon}<p>${text}</p>`;
  alertContainer.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => alertContainer.removeChild(notification), 500);
  }, 5000);
}

function sendConfirmationNotification(type, text, callback) {
  let alertContainer = document.getElementById('alert-container');
  const alerts = {
    confirm: {
      icon: `<svg class="w-6 h-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>`,
      color: "bg-orange-500"
    }
  };

  let notification = document.createElement("div");
  notification.classList.add('alert-box', alerts.confirm.color, 'text-white', 'flex', 'items-center', 'rounded-md', 'opacity-0', 'relative');
  notification.innerHTML = `${alerts.confirm.icon}<p>${text}</p>`;
  notification.innerHTML += `
    <button class="btn-primary px-3 py-1 text-sm mx-2" id="btn-confirm">تایید</button>
    <button class="btn-secondary px-3 py-1 text-sm mx-2" id="btn-cancel">انصراف</button>
  `;
  alertContainer.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);

  const timeoutId = setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => alertContainer.removeChild(notification), 500);
    callback(false);
  }, 10000);

  document.getElementById('btn-confirm').addEventListener('click', () => {
    clearTimeout(timeoutId);
    notification.classList.remove('show');
    setTimeout(() => alertContainer.removeChild(notification), 500);
    callback(true);
  });
  document.getElementById('btn-cancel').addEventListener('click', () => {
    clearTimeout(timeoutId);
    notification.classList.remove('show');
    setTimeout(() => alertContainer.removeChild(notification), 500);
    callback(false);
  });
}

window.sendNotification = sendNotification;
window.sendConfirmationNotification = sendConfirmationNotification;
