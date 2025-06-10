// app/public/js/admin-contents-mixin.js
const adminContentsMixin = {
  data: {
    training: [],
    contentForm: {
      title: '',
      shortDescription: '',
      longDescription: '',
      attachments: [],
      newFiles: []
    },
    editingContentId: null,
    deletedContentIds: [],
    showContentForm: false,
  },
  methods: {
    async fetchTraining() {
      try {
        const res = await axios.get('/admin/api/training');
        this.training = res.data;
      } catch {
        this.sendNotification('error', 'خطا در دریافت محتواها');
      }
    },
    openCreateContentForm() {
      this.editingContentId = null;
      this.contentForm = { title: '', shortDescription: '', longDescription: '', attachments: [], newFiles: [] };
      this.deletedContentIds = [];
      this.showContentForm = true;
    },
    openEditContentForm(c) {
      this.editingContentId = c.id;
      this.contentForm = {
        title: c.title,
        shortDescription: c.shortDescription,
        longDescription: c.longDescription,
        attachments: c.attachments.map(a => ({ id: a.id, displayName: a.originalName, path: a.path }))
      };
      this.deletedContentIds = [];
      this.contentForm.newFiles = [];
      this.showContentForm = true;
    },
    markContentForDelete(id) {
      this.deletedContentIds.push(id);
      this.contentForm.attachments = this.contentForm.attachments.filter(a => a.id !== id);
    },
    handleContentFiles(e) {
      Array.from(e.target.files).forEach(f => this.contentForm.newFiles.push({ file: f, displayName: f.name }));
    },
    async saveContent() {
      if (!this.contentForm.title.trim()) {
        return this.sendNotification('error', 'عنوان را وارد کنید');
      }
      this.setLoadingState(true);
      try {
        const fd = new FormData();
        fd.append('title', this.contentForm.title);
        fd.append('shortDescription', this.contentForm.shortDescription || '');
        fd.append('longDescription', this.contentForm.longDescription || '');
        this.deletedContentIds.forEach(id => fd.append('deleteIds[]', id));
        this.contentForm.newFiles.forEach(nf => fd.append('files', nf.file));

        const url = this.editingContentId ? `/admin/api/training/${this.editingContentId}` : '/admin/api/training';
        await axios.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        
        this.sendNotification('success', 'محتوا با موفقیت ذخیره شد');
        this.showContentForm = false;
        await this.fetchTraining();
      } catch (err) {
        console.error(err);
        this.sendNotification('error', 'خطا در ذخیره محتوا');
      } finally {
        this.setLoadingState(false);
      }
    },
    async deleteContent(c) {
      if (!confirm(`آیا از حذف "${c.title}" مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/training/${c.id}`);
        this.sendNotification('success', 'حذف شد');
      } catch {
        this.sendNotification('error', 'خطا در حذف محتوا');
      }
    },
  }
};