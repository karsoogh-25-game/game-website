const adminRadioMixin = {
  data: {
    // --- وضعیت‌های مربوط به رادیو ---
    isBroadcasting: false,
    isEffectOn: false,    
    
    // --- آبجکت‌های Web Audio API ---
    localStream: null,
    audioContext: null,
    scriptNode: null,
    
    // --- START OF EDIT: آبجکت جدید برای افکت ---
    pitchShifter: null, // آبجکت کتابخانه Soundtouch
    // --- END OF EDIT ---

    // --- بافر ارسال ---
    sendBuffer: [],
    sendInterval: null,

    // --- ثابت‌ها ---
    VAD_THRESHOLD: 0.02,
    BUFFER_SIZE: 4096,
    // --- START OF EDIT: تغییر بازه زمانی ---
    SEND_INTERVAL_MS: 500, // بازه زمانی به نیم ثانیه افزایش یافت
    // --- END OF EDIT ---
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
      if (this.localStream) return; // جلوگیری از اجرای دوباره
      try {
        // ۱. گرفتن دسترسی به میکروفون
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 }
        });

        // ۲. راه‌اندازی Web Audio API
        this.audioContext = new AudioContext({ sampleRate: 48000 });
        const sourceNode = this.audioContext.createMediaStreamSource(this.localStream);
        this.scriptNode = this.audioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);
        
        // ۳. اتصال گراف صوتی (ساده‌تر شد)
        sourceNode.connect(this.scriptNode);
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
      this.pitchShifter = null; // ریست کردن افکت
      this.sendBuffer = [];
      this.isBroadcasting = false;
      this.isEffectOn = false;
      window.socket.emit('stop-broadcast');
      this.sendNotification('info', 'پخش زنده متوقف شد.');
    },

    // --- START OF EDIT: تابع پردازش صدا با افکت جدید ---
    processAudio(e) {
      const input = e.inputBuffer.getChannelData(0);
      let processedSamples = input;

      // اگر افکت فعال بود، بافر صدا را با کتابخانه پردازش کن
      if (this.isEffectOn) {
        if (!this.pitchShifter) {
          // در اولین استفاده، یک نمونه از افکت PitchShifter با گام ۰.۶ (صدای کلفت) می‌سازیم
          this.pitchShifter = new soundtouch.PitchShifter(this.audioContext.sampleRate, 0.6);
        }
        // ساخت بافر ورودی برای کتابخانه
        const soundtouchBuffer = {
            numChannels: 1,
            sampleRate: this.audioContext.sampleRate,
            length: input.length,
            getChannelData: () => input,
        };
        // پردازش و گرفتن خروجی
        this.pitchShifter.process(soundtouchBuffer);
        processedSamples = this.pitchShifter.extract();
      }
      
      // VAD روی صدای پردازش شده (یا اصلی) اعمال می‌شود
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
    // --- END OF EDIT ---
    
    // --- تابع ارسال بسته‌ها ---
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

    // --- START OF EDIT: متد فعال/غیرفعال کردن افکت ساده‌سازی شد ---
    toggleVoiceEffect() {
      if (!this.isBroadcasting) return;
      this.isEffectOn = !this.isEffectOn;
      
      if (this.isEffectOn) {
        this.sendNotification('info', 'افکت صدا فعال شد.');
      } else {
        // با خاموش شدن افکت، نمونه ساخته شده را پاک می‌کنیم تا پردازش اضافی انجام نشود
        this.pitchShifter = null; 
        this.sendNotification('info', 'افکت صدا غیرفعال شد.');
      }
    }
  }
};