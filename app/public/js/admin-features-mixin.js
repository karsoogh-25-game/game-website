// public/js/admin-features-mixin.js

const adminFeaturesMixin = {
  data: {
    featureFlags: [],
  },
  computed: {
    menuFlags() {
      return this.featureFlags.filter(f => f.category === 'menu');
    },
    actionFlags() {
      return this.featureFlags.filter(f => f.category === 'action');
    }
  },
  methods: {
    async fetchFeatureFlags() {
      try {
        const res = await axios.get('/admin/api/features');
        this.featureFlags = res.data;
      } catch (err) {
        this.sendNotification('error', 'خطا در دریافت لیست قابلیت‌ها');
        console.error(err);
      }
    },
    async saveFeatureFlags() {
      const payload = this.featureFlags.map(f => ({
        name: f.name,
        isEnabled: f.isEnabled
      }));

      this.setLoadingState(true);
      try {
        await axios.put('/admin/api/features', { flags: payload });
        this.sendNotification('success', 'تغییرات با موفقیت ذخیره و اعمال شد.');
      } catch (err) {
        this.sendNotification('error', 'خطا در ذخیره تغییرات');
        console.error(err);
      } finally {
        this.setLoadingState(false);
      }
    },
  }
};