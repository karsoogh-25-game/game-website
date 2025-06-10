// public/js/admin-features-mixin.js

const adminFeaturesMixin = {
  data: {
    // آرایه‌ای برای نگهداری تمام قابلیت‌ها که از سرور دریافت می‌شود
    featureFlags: [],
  },
  computed: {
    // فیلتر کردن قابلیت‌ها برای نمایش در دسته‌بندی "کنترل منوها"
    menuFlags() {
      return this.featureFlags.filter(f => f.category === 'menu');
    },
    // فیلتر کردن قابلیت‌ها برای نمایش در دسته‌بندی "کنترل عملیات‌ها"
    actionFlags() {
      return this.featureFlags.filter(f => f.category === 'action');
    }
  },
  methods: {
    // متد برای دریافت لیست قابلیت‌ها از سرور
    async fetchFeatureFlags() {
      try {
        const res = await axios.get('/admin/api/features');
        this.featureFlags = res.data;
      } catch (err) {
        this.sendNotification('error', 'خطا در دریافت لیست قابلیت‌ها');
        console.error(err);
      }
    },
    // متد برای ذخیره تغییرات و ارسال به سرور
    async saveFeatureFlags() {
      // فقط نام و وضعیت هر قابلیت را برای ارسال آماده می‌کنیم
      const payload = this.featureFlags.map(f => ({
        name: f.name,
        isEnabled: f.isEnabled
      }));

      this.setLoadingState(true);
      try {
        await axios.put('/admin/api/features', { flags: payload });
        this.sendNotification('success', 'تغییرات با موفقیت ذخیره و اعمال شد.');
        // نیازی به فراخوانی مجدد fetch نیست چون رویداد socket این کار را می‌کند
      } catch (err) {
        this.sendNotification('error', 'خطا در ذخیره تغییرات');
        console.error(err);
      } finally {
        this.setLoadingState(false);
      }
    },
  }
};