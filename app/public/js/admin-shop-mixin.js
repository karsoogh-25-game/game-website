// app/public/js/admin-shop-mixin.js

const shopAdminMixin = {
  data: {
    // داده‌های مربوط به فروشگاه
    currencies: [],
    unique_items: [], // برای مراحل بعدی
    
    // فرم ایجاد/ویرایش ارز
    currencyForm: {
      id: null,
      name: '',
      description: '',
      image: '',
      basePrice: 0,
      priceCoefficient: 0.01,
      adminModifier: 1.0
    },

    showCurrencyForm: false,
  },
  methods: {
    // --- متدهای مدیریت ارزها ---

    // دریافت لیست ارزها از سرور
    async fetchCurrencies() {
      try {
        const res = await axios.get('/admin/api/shop/currencies');
        this.currencies = res.data;
      } catch (err) {
        this.sendNotification('error', 'خطا در دریافت لیست ارزها');
        console.error(err);
      }
    },

    // باز کردن فرم برای ایجاد ارز جدید
    openCreateCurrencyForm() {
      this.editingId = null;
      this.currencyForm = {
        id: null, name: '', description: '', image: '',
        basePrice: 1.0, priceCoefficient: 0.01, adminModifier: 1.0
      };
      this.showCurrencyForm = true;
    },

    // باز کردن فرم برای ویرایش ارز موجود
    openEditCurrencyForm(currency) {
      this.editingId = currency.id;
      // کپی کردن اطلاعات ارز به فرم
      this.currencyForm = { ...currency };
      this.showCurrencyForm = true;
    },

    // ذخیره ارز (ایجاد یا ویرایش)
    async saveCurrency() {
      if (!this.currencyForm.name.trim() || !this.currencyForm.basePrice) {
        return this.sendNotification('error', 'نام و قیمت پایه الزامی است.');
      }
      this.setLoadingState(true);
      
      const url = this.editingId
        ? `/admin/api/shop/currencies/${this.editingId}`
        // START of EDIT: متد برای ویرایش و آپدیت ارز
        : '/admin/api/shop/currencies';
      const method = this.editingId ? 'put' : 'post';
      // END of EDIT

      try {
        await axios[method](url, this.currencyForm);
        this.sendNotification('success', 'ارز با موفقیت ذخیره شد.');
        this.showCurrencyForm = false;
        await this.fetchCurrencies(); // بازخوانی لیست
      } catch (err) {
        this.sendNotification('error', 'خطا در ذخیره ارز');
        console.error(err);
      } finally {
        this.setLoadingState(false);
      }
    },

    // اعمال ضریب باف/نرف
    async applyModifier(currency) {
      const newModifier = prompt(`ضریب جدید را برای ارز "${currency.name}" وارد کنید:`, currency.adminModifier);
      if (newModifier === null || isNaN(parseFloat(newModifier))) {
        return; // لغو توسط کاربر یا ورودی نامعتبر
      }
      this.setLoadingState(true);
      try {
        await axios.put(`/admin/api/shop/currencies/${currency.id}/modifier`, {
          modifier: parseFloat(newModifier)
        });
        this.sendNotification('success', 'ضریب با موفقیت اعمال شد.');
        await this.fetchCurrencies();
      } catch (err) {
        this.sendNotification('error', 'خطا در اعمال ضریب');
        console.error(err);
      } finally {
        this.setLoadingState(false);
      }
    },

    // --- متدهای مدیریت آیتم‌های خاص (در آینده) ---
    // ...
  },
  // این تابع زمانی اجرا می‌شود که بخش آیتم‌ها فعال شود
  watch: {
    activeSection(newSection) {
      if (newSection === 'items') {
        this.fetchCurrencies();
        // this.fetchUniqueItems(); // در آینده اضافه می‌شود
      }
    }
  }
};