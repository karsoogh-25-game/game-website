// app/public/js/admin-radio-mixin.js (نسخه نهایی با افکت داخلی و پایدار Web Audio API)

const adminRadioMixin = {
  data: {
    isBroadcasting: false,
    isEffectOn: false,

    localStream: null,
    audioContext: null,
    scriptNode: null,
    sourceNode: null,

    effectBiquadFilter: null, 
    effectRingModulator: {    
      carrier: null,
      modulator: null,
    },

    // --- بافر ارسال ---
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
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 }
        });

        this.audioContext = new AudioContext({ sampleRate: 48000 });
        this.sourceNode = this.audioContext.createMediaStreamSource(this.localStream);
        this.scriptNode = this.audioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);

        this.effectBiquadFilter = this.audioContext.createBiquadFilter();
        this.effectBiquadFilter.type = 'lowpass';
        this.effectBiquadFilter.frequency.value = 800; 

        this.effectRingModulator.modulator = this.audioContext.createGain();
        this.effectRingModulator.carrier = this.audioContext.createOscillator();
        this.effectRingModulator.carrier.frequency.value = 60;
        this.effectRingModulator.carrier.start();
        this.sourceNode.connect(this.scriptNode);
        this.scriptNode.connect(this.audioContext.destination);

        this.scriptNode.onaudioprocess = this.processAudio;

        this.sendInterval = setInterval(this.sendAudioChunks, this.SEND_INTERVAL_MS);

        this.isBroadcasting = true;
        window.socket.emit('start-broadcast');
        this.sendNotification('success', 'پخش زنده رادیو شروع شد.');
      } catch (err) {
        console.error("Error starting broadcast:", err);
        this.sendNotification('error', 'دسترسی به میکروفون امکان‌پذیر نیست.');
      }
    },

    stopBroadcast() {
      if (!this.localStream) return;

      this.localStream.getTracks().forEach(track => track.stop());
      if (this.audioContext) {
        this.audioContext.close();
      }
      clearInterval(this.sendInterval);
      
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

    toggleVoiceEffect() {
      if (!this.isBroadcasting) return;
      
      this.isEffectOn = !this.isEffectOn;
      
      this.sourceNode.disconnect();

      if (this.isEffectOn) {
        this.sourceNode.connect(this.effectBiquadFilter);
        this.effectBiquadFilter.connect(this.effectRingModulator.modulator);
        this.effectRingModulator.carrier.connect(this.effectRingModulator.modulator.gain);
        this.effectRingModulator.modulator.connect(this.scriptNode);
        
        this.sendNotification('info', 'افکت صدای هکری فعال شد.');
      } else {
        this.sourceNode.connect(this.scriptNode);
        this.sendNotification('info', 'افکت صدا غیرفعال شد.');
      }
    }
  }
};