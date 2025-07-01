// app/public/js/radio-listener.js

document.addEventListener('DOMContentLoaded', () => {
  // --- State Management ---
  let isRadioOn = false;
  let isBroadcastLive = false;
  let audioContext = null;
  const audioQueue = [];
  let isPlaying = false;
  let nextPlayTime = 0;

  // --- متغیرهای جدید برای منطق پیشرفته ---
  let isBuffering = true;
  const PACKETS_TO_BUFFER = 4;
  let inactivityTimer = null;
  const INACTIVITY_TIMEOUT_MS = 1200;

  // --- UI Elements ---
  const radioSection = document.getElementById('radio');
  const btnRefresh = document.getElementById('btn-refresh');
  let radioToggleBtn, radioStatusText;

  // تابع loadRadio برای بارگذاری اولیه UI و وضعیت
  function loadRadio() {
    if (!radioToggleBtn) {
      initializeUI();
    }
    fetchAndUpdateStatus();
  }

  // استعلام وضعیت از سرور
  function fetchAndUpdateStatus() {
    setLoadingState(true);
    window.socket.emit('get-radio-status', (isLive) => {
      if (isLive) {
        setBroadcastLive();
      } else {
        setBroadcastOffline();
      }
      setLoadingState(false);
    });
  }

  // ایجاد UI رادیو
  function initializeUI() {
    if (!radioSection) return;
    radioSection.innerHTML = `
      <div class="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 text-center">
        <h2 class="text-2xl font-bold text-yellow-400 mb-4">رادیو زنده</h2>
        <p id="radio-status-text" class="text-gray-400 mb-6 h-6"></p>
        <button id="radio-toggle-btn" class="text-white font-bold py-3 px-6 rounded-lg text-lg w-full transition-all duration-300"></button>
      </div>
    `;
    radioToggleBtn = document.getElementById('radio-toggle-btn');
    radioStatusText = document.getElementById('radio-status-text');
    radioToggleBtn.addEventListener('click', toggleRadio);
  }

  // --- تابع اصلی روشن/خاموش کردن رادیو ---
  function toggleRadio() {
    if (!isBroadcastLive) return;
    isRadioOn = !isRadioOn;

    if (isRadioOn) {
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext({ sampleRate: 48000 });
        nextPlayTime = audioContext.currentTime;
      }
      
      audioQueue.length = 0;
      isBuffering = true;
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = null;

      window.socket.emit('join-radio');
      updateButtonUI();
      sendNotification('success', 'رادیو روشن شد.');
    } else {
      window.socket.emit('leave-radio');
      audioQueue.length = 0;
      updateButtonUI();
      sendNotification('info', 'رادیو خاموش شد.');
    }
  }

  // --- تابع جدید برای تخلیه اجباری بافر ---
  function forceFlushBuffer() {
    if (isBuffering && audioQueue.length > 0) {
      console.log('Inactivity detected. Forcing playback for stranded packets.');
      isBuffering = false;
      playNextInQueue();
    }
  }

  // --- تابع اصلی پخش با منطق نهایی ---
  function playNextInQueue() {
    if (isPlaying || !audioQueue.length || !isRadioOn) {
      return;
    }

    if (isBuffering) {
      if (audioQueue.length >= PACKETS_TO_BUFFER) {
        isBuffering = false;
        // sendNotification('info', 'بافر کامل شد، پخش شروع می‌شود!');
      } else {
        return;
      }
    }

    isPlaying = true;
    const int16Buffer = audioQueue.shift();
    const float32Buffer = new Float32Array(int16Buffer.length);
    for (let i = 0; i < int16Buffer.length; i++) {
      float32Buffer[i] = int16Buffer[i] / (int16Buffer[i] < 0 ? 0x8000 : 0x7FFF);
    }
    const audioBuffer = audioContext.createBuffer(1, float32Buffer.length, 48000);
    audioBuffer.getChannelData(0).set(float32Buffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    const playTime = Math.max(nextPlayTime, audioContext.currentTime);
    source.start(playTime);
    nextPlayTime = playTime + audioBuffer.duration;

    source.onended = () => {
      isPlaying = false;
      
      if (audioQueue.length === 0) {
        isBuffering = true;
        console.log("Playback queue empty. Re-buffering for next utterance...");
      }
      
      playNextInQueue();
    };
  }
  
  // --- توابع UI (بدون تغییر) ---
  function updateButtonUI() {
    if (!radioToggleBtn) return;
    const icon = '<i class="fas fa-power-off ml-2"></i>';
    if (isRadioOn) {
      radioToggleBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
      radioToggleBtn.classList.add('bg-red-600', 'hover:bg-red-700');
      radioToggleBtn.innerHTML = `${icon}<span>خاموش کردن رادیو</span>`;
    } else {
      radioToggleBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
      radioToggleBtn.classList.add('bg-green-600', 'hover:bg-green-700');
      radioToggleBtn.innerHTML = `${icon}<span>روشن کردن رادیو</span>`;
    }
  }

  function setBroadcastLive() {
    isBroadcastLive = true;
    if (!radioStatusText || !radioToggleBtn) return;
    radioStatusText.textContent = 'پخش زنده فعال است';
    radioStatusText.classList.add('text-green-400');
    radioToggleBtn.disabled = false;
    radioToggleBtn.classList.remove('bg-gray-600', 'cursor-not-allowed');
    updateButtonUI();
  }

  function setBroadcastOffline() {
    isBroadcastLive = false;
    isRadioOn = false;
    audioQueue.length = 0;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (!radioStatusText || !radioToggleBtn) return;
    radioStatusText.textContent = 'پخش زنده متوقف است';
    radioStatusText.classList.remove('text-green-400');
    radioToggleBtn.disabled = true;
    radioToggleBtn.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-red-600', 'hover:bg-red-700');
    radioToggleBtn.classList.add('bg-gray-600', 'cursor-not-allowed');
    radioToggleBtn.innerHTML = `<i class="fas fa-power-off ml-2"></i><span>روشن کردن رادیو</span>`;
  }
  
  // --- Socket.IO Listeners ---
  if (window.socket) {
    socket.on('radio-started', setBroadcastLive);
    socket.on('radio-stopped', setBroadcastOffline);

    socket.on('audio-stream', ({ buffer }) => {
      if (isRadioOn) {
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
        }
        inactivityTimer = setTimeout(forceFlushBuffer, INACTIVITY_TIMEOUT_MS);

        audioQueue.push(new Int16Array(buffer));
        playNextInQueue();
      }
    });
  }

  // --- Initial Setup ---
  document.querySelectorAll('.menu-item[data-section="radio"]').forEach(item => {
    item.addEventListener('click', loadRadio);
  });
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      if (document.querySelector('.content-section.active')?.id === 'radio') {
        loadRadio();
      }
    });
  }
});