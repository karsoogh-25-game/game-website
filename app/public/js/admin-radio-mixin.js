// app/public/js/admin-radio-mixin.js (نسخه نهایی با افکت داخلی و پایدار Web Audio API)

const adminRadioMixin = {
  data: {
    // --- وضعیت‌های مربوط به رادیو ---
    isBroadcasting: false,
    isEffectOn: false,

    // --- آبجکت‌های Web Audio API ---
    localStream: null,
    audioContext: null,
    scriptNode: null,
    sourceNode: null, // نود منبع را در دیتا ذخیره می‌کنیم تا بتوانیم اتصالش را تغییر دهیم

    // --- START OF EDIT: آبجکت‌های جدید برای افکت داخلی مرورگر ---
    effectBiquadFilter: null,  // افکت جدید برای بم کردن صدا
    effectRingModulator: {     // افکت قبلی برای حالت روباتیک
      carrier: null,
      modulator: null,
    },
    // --- END OF EDIT ---

    // --- بافر ارسال (منطق اصلی شما حفظ شده) ---
    sendBuffer: [],
    sendInterval: null,

    // --- ثابت‌ها ---
    VAD_THRESHOLD: 0.02,
    BUFFER_SIZE: 4096,
    SEND_INTERVAL_MS: 250,
  },
  methods: {
    // --- متد اصلی برای روشن/خاموش کردن رادیو ---
    async toggleBroadcast() {
      if (this.isBroadcasting) {
        this.stopBroadcast();
      } else {
        await this.startBroadcast();
      }
    },

    // --- متد برای شروع پخش ---
    async startBroadcast() {
      if (this.localStream) return;
      try {
        // ۱. گرفتن دسترسی به میکروفون
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 }
        });

        // ۲. راه‌اندازی Web Audio API
        this.audioContext = new AudioContext({ sampleRate: 48000 });
        this.sourceNode = this.audioContext.createMediaStreamSource(this.localStream);
        this.scriptNode = this.audioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);

        // --- START OF EDIT: ساخت اجزای افکت ترکیبی (بم و روباتیک) ---
        // فیلتر پایین گذر برای بم شدن صدا
        this.effectBiquadFilter = this.audioContext.createBiquadFilter();
        this.effectBiquadFilter.type = 'lowpass';
        this.effectBiquadFilter.frequency.value = 800; // فرکانس‌های بالای ۸۰۰ هرتز حذف می‌شوند تا صدا بم شود

        // مدولاتور حلقه‌ای برای صدای روباتیک
        this.effectRingModulator.modulator = this.audioContext.createGain();
        this.effectRingModulator.carrier = this.audioContext.createOscillator();
        this.effectRingModulator.carrier.frequency.value = 60; // فرکانس پایین برای افکت بم‌تر
        this.effectRingModulator.carrier.start();
        // --- END OF EDIT ---

        // ۳. اتصال گراف صوتی اولیه (بدون افکت)
        this.sourceNode.connect(this.scriptNode);
        this.scriptNode.connect(this.audioContext.destination); // تا ادمین صدای خود را بشنود

        // ۴. تنظیم تابع پردازش صدا
        this.scriptNode.onaudioprocess = this.processAudio;

        // ۵. شروع بازه زمانی برای ارسال داده‌ها
        this.sendInterval = setInterval(this.sendAudioChunks, this.SEND_INTERVAL_MS);

        this.isBroadcasting = true;
        window.socket.emit('start-broadcast');
        this.sendNotification('success', 'پخش زنده رادیو شروع شد.');
      } catch (err) {
        console.error("Error starting broadcast:", err);
        this.sendNotification('error', 'دسترسی به میکروفون امکان‌پذیر نیست.');
      }
    },

    // --- متد برای توقف پخش ---
    stopBroadcast() {
      if (!this.localStream) return;

      this.localStream.getTracks().forEach(track => track.stop());
      if (this.audioContext) {
        this.audioContext.close();
      }
      clearInterval(this.sendInterval);
      
      // ریست کردن تمام متغیرها
      this.localStream = null;
      this.audioContext = null;
      this.scriptNode = null;
      this.sourceNode = null;
      this.effectBiquadFilter = null; // پاک کردن افکت بم‌کننده
      this.effectRingModulator = { carrier: null, modulator: null }; // پاک کردن افکت روباتیک
      this.sendBuffer = [];
      this.isBroadcasting = false;
      this.isEffectOn = false;
      window.socket.emit('stop-broadcast');
      this.sendNotification('info', 'پخش زنده متوقف شد.');
    },

    // --- تابع پردازش صدا (کاملا بدون تغییر) ---
    processAudio(e) {
      const input = e.inputBuffer.getChannelData(0);
      let processedSamples = input;
      
      if (processedSamples && processedSamples.length > 0) {
          let maxAmp = 0;
          for (let i = 0; i < processedSamples.length; i++) {
            maxAmp = Math.max(maxAmp, Math.abs(processedSamples[i]));
          }
          if (maxAmp > this.VAD_THRESHOLD) {
            this.sendBuffer.push(new Float32Array(processedSamples));
          }
      }
    },
    
    // --- تابع ارسال بسته‌ها (کاملا بدون تغییر) ---
    sendAudioChunks() {
      if (!this.sendBuffer.length) return;

      const totalLen = this.sendBuffer.reduce((sum, a) => sum + a.length, 0);
      const merged = new Float32Array(totalLen);
      let offset = 0;
      for (const arr of this.sendBuffer) {
        merged.set(arr, offset);
        offset += arr.length;
      }
      this.sendBuffer = [];

      const int16 = new Int16Array(merged.length);
      for (let i = 0; i < merged.length; i++) {
        const s = Math.max(-1, Math.min(1, merged[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      window.socket.emit('audio-stream', { buffer: int16.buffer });
    },

    // --- متد فعال/غیرفعال کردن افکت (با استفاده از نودهای داخلی) ---
    toggleVoiceEffect() {
      if (!this.isBroadcasting) return;
      
      this.isEffectOn = !this.isEffectOn;
      
      // قطع تمام اتصالات قبلی از منبع اصلی صدا
      this.sourceNode.disconnect();

      if (this.isEffectOn) {
        // مسیر جدید: میکروفون -> فیلتر بم کننده -> افکت روباتیک -> پردازشگر
        this.sourceNode.connect(this.effectBiquadFilter);
        this.effectBiquadFilter.connect(this.effectRingModulator.modulator);
        this.effectRingModulator.carrier.connect(this.effectRingModulator.modulator.gain);
        this.effectRingModulator.modulator.connect(this.scriptNode);
        
        this.sendNotification('info', 'افکت صدای هکری فعال شد.');
      } else {
        // مسیر اصلی: میکروفون -> پردازشگر
        this.sourceNode.connect(this.scriptNode);
        this.sendNotification('info', 'افکت صدا غیرفعال شد.');
      }
    }
  }
};