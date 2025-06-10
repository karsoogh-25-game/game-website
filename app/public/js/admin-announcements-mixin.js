// app/public/js/admin-announcements-mixin.js
const adminAnnouncementsMixin = {
  data: {
    announcements: [],
    form: {
      title: '',
      shortDescription: '',
      longDescription: '',
      attachments: [],
      newFiles: [],
      deletedAttachments: []
    },
    showForm: false,
  },
  methods: {
    async fetchAnnouncements() {
      try {
        const res = await axios.get('/admin/api/announcements');
        this.announcements = res.data;
      } catch {
        this.sendNotification('error', 'خطا در دریافت اطلاعیه‌ها');
      }
    },
    openCreateForm() {
      this.editingId = null;
      this.form = { title: '', shortDescription: '', longDescription: '', attachments: [], newFiles: [], deletedAttachments: [] };
      this.showForm = true;
    },
    openEditForm(a) {
      this.editingId = a.id;
      this.form = {
        title: a.title,
        shortDescription: a.shortDescription,
        longDescription: a.longDescription,
        attachments: (a.attachments || []).map(att => ({ id: att.id, displayName: att.originalName, path: att.path })),
        newFiles: [],
        deletedAttachments: []
      };
      this.showForm = true;
    },
    onFileChange(e) {
      Array.from(e.target.files).forEach(f => {
        this.form.newFiles.push({ file: f, displayName: f.name });
      });
    },
    removeNewFile(idx) {
      this.form.newFiles.splice(idx, 1);
    },
    markForDelete(attId) {
        this.form.deletedAttachments.push(attId);
        this.form.attachments = this.form.attachments.filter(att => att.id !== attId);
    },
    closeForm() {
      this.showForm = false;
    },
    async saveAnnouncement() {
      if (!this.form.title.trim()) {
        return this.sendNotification('error', 'عنوان را وارد کنید');
      }
      this.setLoadingState(true);
      try {
        const fd = new FormData();
        fd.append('title', this.form.title);
        fd.append('shortDescription', this.form.shortDescription || '');
        fd.append('longDescription', this.form.longDescription || '');
        this.form.newFiles.forEach(obj => fd.append('attachments', obj.file, obj.displayName));
        this.form.deletedAttachments.forEach(id => fd.append('deletedAttachments[]', id));
        
        const url = this.editingId ? `/admin/api/announcements/${this.editingId}` : '/admin/api/announcements';
        const method = this.editingId ? 'put' : 'post';

        await axios[method](url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        
        this.sendNotification('success', 'اطلاعیه با موفقیت ذخیره شد');
        this.closeForm();
        await this.fetchAnnouncements();
      } catch (err) {
        console.error(err);
        this.sendNotification('error', 'خطا در ذخیره اطلاعیه');
      } finally {
        this.setLoadingState(false);
      }
    },
    async deleteAnnouncement(a) {
      if (!confirm(`آیا از حذف اطلاعیه "${a.title}" مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/announcements/${a.id}`);
        this.sendNotification('success', 'اطلاعیه حذف شد');
      } catch {
        this.sendNotification('error', 'خطا در حذف اطلاعیه');
      }
    },
  }
};