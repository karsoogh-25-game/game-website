// app/public/js/admin-shop-mixin.js

const shopAdminMixin = {
  data: {
    currencies: [],
    unique_items: [],
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
    selectedFile: null
  },
  methods: {

    async fetchCurrencies() {
      try {
        const res = await axios.get('/admin/api/shop/currencies');
        this.currencies = res.data;
      } catch (err) {
        this.sendNotification('error', 'خطا در دریافت لیست ارزها');
        console.error(err);
      }
    },

    openCreateCurrencyForm() {
      this.editingId = null;
      this.currencyForm = {
        id: null, name: '', description: '', image: '',
        basePrice: 1.0, priceCoefficient: 0.01, adminModifier: 1.0
      };
      this.selectedFile = null;
      this.showCurrencyForm = true;
    },

    openEditCurrencyForm(currency) {
      this.editingId = currency.id;
      this.currencyForm = { ...currency };
      this.selectedFile = null;
      this.showCurrencyForm = true;
    },

    handleFileSelect(event) {
        this.selectedFile = event.target.files[0];
    },
    async saveCurrency() {
      if (!this.currencyForm.name.trim() || this.currencyForm.basePrice === undefined) {
        return this.sendNotification('error', 'نام و قیمت پایه الزامی است.');
      }
      this.setLoadingState(true);
      
      const formData = new FormData();

      formData.append('name', this.currencyForm.name);
      formData.append('description', this.currencyForm.description || '');
      formData.append('basePrice', this.currencyForm.basePrice);
      formData.append('priceCoefficient', this.currencyForm.priceCoefficient);

      if (this.selectedFile) {
        formData.append('image', this.selectedFile);
      }
      
      const url = this.editingId
        ? `/admin/api/shop/currencies/${this.editingId}`
        : '/admin/api/shop/currencies';
      const method = this.editingId ? 'put' : 'post';

      try {
        await axios[method](url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        this.sendNotification('success', 'ارز با موفقیت ذخیره شد.');
        this.showCurrencyForm = false;
        await this.fetchCurrencies();
      } catch (err) {
        this.sendNotification('error', 'خطا در ذخیره ارز');
        console.error(err);
      } finally {
        this.setLoadingState(false);
      }
    },
    async applyModifier(currency) {
      const newModifier = prompt(`ضریب جدید را برای ارز "${currency.name}" وارد کنید:`, currency.adminModifier);
      if (newModifier === null || isNaN(parseFloat(newModifier))) {
        return;
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

    async deleteCurrency(currency) {
        if (!confirm(`آیا از حذف ارز "${currency.name}" مطمئن هستید؟\nتمام دارایی کاربران از این ارز به امتیاز تبدیل و به حسابشان بازگردانده خواهد شد.`)) {
            return;
        }
        this.setLoadingState(true);
        try {
            await axios.delete(`/admin/api/shop/currencies/${currency.id}`);
            this.sendNotification('success', 'ارز با موفقیت حذف شد.');
            await this.fetchCurrencies();
        } catch (err) {
            this.sendNotification('error', err.response?.data?.message || 'خطا در حذف ارز');
            console.error(err);
        } finally {
            this.setLoadingState(false);
        }
    },
  },
  watch: {
    activeSection(newSection) {
      if (newSection === 'items') {
        this.fetchCurrencies();
      }
    }
  }
};