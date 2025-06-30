// app/public/js/admin-unique-items-mixin.js

const adminUniqueItemsMixin = {
  data: {
    unique_items: [],
    uniqueItemForm: {
      id: null,
      name: '',
      description: '',
      purchasePrice: 0,
      image: null
    },
    showUniqueItemForm: false,
    uniqueItemSelectedFile: null
  },
  methods: {
    async fetchUniqueItems() {
      try {
        const res = await axios.get('/admin/api/unique-items');
        this.unique_items = res.data;
      } catch (err) {
        this.sendNotification('error', 'خطا در دریافت لیست آیتم‌های خاص');
        console.error(err);
      }
    },

    openCreateUniqueItemForm() {
      this.editingId = null;
      this.uniqueItemForm = { id: null, name: '', description: '', purchasePrice: 0, image: null };
      this.uniqueItemSelectedFile = null;
      this.showUniqueItemForm = true;
    },

    openEditUniqueItemForm(item) {
      this.editingId = item.id;
      this.uniqueItemForm = { ...item };
      this.uniqueItemSelectedFile = null;
      this.showUniqueItemForm = true;
    },
    
    handleUniqueItemFileSelect(event) {
      this.uniqueItemSelectedFile = event.target.files[0];
    },

    async saveUniqueItem() {
      if (!this.uniqueItemForm.name.trim() || !this.uniqueItemForm.purchasePrice) {
        return this.sendNotification('error', 'نام و قیمت خرید الزامی است.');
      }
      this.setLoadingState(true);
      
      const formData = new FormData();
      formData.append('name', this.uniqueItemForm.name);
      formData.append('description', this.uniqueItemForm.description || '');
      formData.append('purchasePrice', this.uniqueItemForm.purchasePrice);

      if (this.uniqueItemSelectedFile) {
        formData.append('image', this.uniqueItemSelectedFile);
      }
      
      const url = this.editingId
        ? `/admin/api/unique-items/${this.editingId}`
        : '/admin/api/unique-items';
      const method = this.editingId ? 'put' : 'post';

      try {
        await axios[method](url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        this.sendNotification('success', 'آیتم خاص با موفقیت ذخیره شد.');
        this.showUniqueItemForm = false;
        await this.fetchUniqueItems();
      } catch (err) {
        this.sendNotification('error', err.response?.data?.message || 'خطا در ذخیره آیتم خاص');
        console.error(err);
      } finally {
        this.setLoadingState(false);
      }
    },

    async deleteUniqueItem(item) {
      if (!confirm(`آیا از حذف آیتم "${item.name}" مطمئن هستید؟`)) {
        return;
      }
      this.setLoadingState(true);
      try {
        await axios.delete(`/admin/api/unique-items/${item.id}`);
        this.sendNotification('success', 'آیتم خاص با موفقیت حذف شد.');
        await this.fetchUniqueItems();
      } catch (err) {
        this.sendNotification('error', err.response?.data?.message || 'خطا در حذف آیتم خاص');
        console.error(err);
      } finally {
        this.setLoadingState(false);
      }
    }
  },
  watch: {
    activeSection(newSection) {
      if (newSection === 'items') {
        this.fetchUniqueItems();
      }
    }
  }
};