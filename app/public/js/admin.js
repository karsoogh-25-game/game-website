// public/js/admin.js

const socket = io();

new Vue({
  el: '#adminApp',
  data: {
    users: [],
    mentors: [],
    announcements: [],
    groups: [],
    training: [],                 // ← آرایه‌ای برای نگهداری لیست محتواها
    contentForm: {                // ← فرم ایجاد/ویرایش
      title: '',
      shortDescription: '',
      longDescription: '',
      attachments: [],
      newFiles: []
    },
    editingContentId: null,
    deletedContentIds: [],
    search: '',
    searchMentor: '',
    form: {
      title: '',
      shortDescription: '',
      longDescription: '',
      // ضمائم موجود: هر کدام { id, displayName, path }
      attachments: [],
      // فایل‌های جدید: هر کدام { file: File, displayName }
      newFiles: [],
      // شناسه ضمائم برای حذف
      deletedAttachments: []
    },
    showForm: false,
    showContentForm: false,
    editingId: null,
    activeSection: 'users',
    sections: [
      { key: 'users', label: 'کاربرها' },
      { key: 'mentors', label: 'منتورها' },
      { key: 'announcements', label: 'اطلاعیه‌ها' },
      { key: 'groups', label: 'گروه‌ها' },
      { key: 'items', label: 'آیتم‌ها' },
      { key: 'contents', label: 'محتواها' }
    ]
  },
  created() {
    // لیسنرهای Socket.IO برای اطلاعیه‌ها
    socket.on('announcementCreated', ann => {
      this.announcements.unshift(ann);
    });
    socket.on('announcementUpdated', ann => {
      const idx = this.announcements.findIndex(a => a.id === ann.id);
      if (idx !== -1) this.$set(this.announcements, idx, ann);
    });
    socket.on('announcementDeleted', ({ id }) => {
      this.announcements = this.announcements.filter(a => a.id !== id);
    });

    // لیسنرهای Socket.IO برای گروه‌ها
    socket.on('groupCreated', grp => {
      this.groups.unshift(grp);
    });
    socket.on('groupUpdated', grp => {
      const idx = this.groups.findIndex(g => g.id === grp.id);
      if (idx !== -1) this.$set(this.groups, idx, grp);
    });
    socket.on('groupDeleted', ({ id }) => {
      this.groups = this.groups.filter(g => g.id !== id);
    });

    // لیسنرهای محتوا
    socket.on('contentCreated',  c => this.fetchTraining());
    socket.on('contentUpdated',  c => this.fetchTraining());
    socket.on('contentDeleted', ({id}) => this.fetchTraining());

    // بارگذاری بخش فعال
    this.loadSection();
  },
  mounted() {
    document.getElementById('refresh-btn').addEventListener('click', this.refreshData);
  },
  methods: {
    // تغییر بخش فعال با انیمیشن
    selectSection(key) {
      const current = document.querySelector('.content-section.active');
      if (current) {
        current.classList.replace('fade-in', 'fade-out');
        current.addEventListener('transitionend', () => {
          current.classList.remove('active', 'fade-out');
          this.activeSection = key;
          this.loadSection();
        }, { once: true });
      } else {
        this.activeSection = key;
        this.loadSection();
      }
    },

    // نمایش/مخفی کردن لودینگ
    setLoadingState(on) {
      const el = document.getElementById('loading-spinner');
      if (el) el.style.display = on ? 'flex' : 'none';
    },

    // نمایش پیام موفقیت/خطا
    sendNotification(type, text) {
      const cfgs = {
        success: { color: 'bg-green-500', icon: '✔️' },
        error:   { color: 'bg-red-500',   icon: '❌' }
      };
      const cfg = cfgs[type] || cfgs.success;
      const n = document.createElement('div');
      n.className = `alert-box ${cfg.color} text-white`;
      n.innerHTML = `<span class="ml-2">${cfg.icon}</span><p>${text}</p>`;
      document.getElementById('alert-container').appendChild(n);
      setTimeout(() => n.classList.add('show'), 10);
      setTimeout(() => {
        n.classList.remove('show');
        setTimeout(() => n.remove(), 500);
      }, 3000);
    },

    // رفرش دستی
    async refreshData() {
      this.setLoadingState(true);
      await this.loadSection();
      this.setLoadingState(false);
    },

    // بارگذاری بخش فعال
    async loadSection() {
      this.setLoadingState(true);
      if (this.activeSection === 'users')         await this.fetchUsers();
      if (this.activeSection === 'mentors')       await this.fetchMentors();
      if (this.activeSection === 'announcements') await this.fetchAnnouncements();
      if (this.activeSection === 'groups')        await this.fetchGroups();
      if (this.activeSection === 'contents')      await this.fetchTraining();
      this.setLoadingState(false);
    },

    // ---- کاربران ----
    async fetchUsers() {
      try {
        const res = await axios.get('/admin/api/users');
        this.users = res.data.filter(u =>
          u.role === 'user' &&
          [u.firstName, u.lastName, u.phoneNumber, u.email].join(' ').includes(this.search)
        );
      } catch {
        this.sendNotification('error', 'خطا در دریافت کاربران');
      }
    },
    async updateUser(u) {
      try {
        await axios.put(`/admin/api/users/${u.id}`, u);
        this.sendNotification('success', 'تغییرات کاربر ذخیره شد');
      } catch {
        this.sendNotification('error', 'خطا در ذخیره کاربر');
      }
    },
    async deleteUser(u) {
      if (!confirm(`آیا از حذف کاربر "${u.firstName} ${u.lastName}" مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/users/${u.id}`);
        this.sendNotification('success', 'کاربر حذف شد');
        this.fetchUsers();
      } catch {
        this.sendNotification('error', 'خطا در حذف کاربر');
      }
    },

    // ---- منتورها ----
    async fetchMentors() {
      try {
        const res = await axios.get('/admin/api/users');
        this.mentors = res.data.filter(u =>
          u.role === 'mentor' &&
          [u.firstName, u.lastName, u.phoneNumber, u.email].join(' ').includes(this.searchMentor)
        );
      } catch {
        this.sendNotification('error', 'خطا در دریافت منتورها');
      }
    },

    // ---- اطلاعیه‌ها ----
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
      this.form = {
        title: '',
        shortDescription: '',
        longDescription: '',
        attachments: [],
        newFiles: [],
        deletedAttachments: []
      };
      this.showForm = true;
    },
    openEditForm(a) {
      this.editingId = a.id;
      this.form = {
        title: a.title,
        shortDescription: a.shortDescription,
        longDescription: a.longDescription,
        attachments: (a.attachments || []).map(att => ({
          id: att.id,
          displayName: att.displayName,
          path: att.path
        })),
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
    updateAttachmentName(idx, newName) {
      this.form.attachments[idx].displayName = newName;
    },
    markForDelete(attId) {
      this.form.deletedAttachments.push(attId);
      this.form.attachments = this.form.attachments.filter(att => att.id !== attId);
    },
    removeNewFile(idx) {
      this.form.newFiles.splice(idx, 1);
    },
    closeForm() {
      this.showForm = false;
    },
    async saveAnnouncement() {
      if (!this.form.title.trim()) {
        this.sendNotification('error', 'عنوان را وارد کنید');
        return;
      }
      this.setLoadingState(true);
      try {
        const fd = new FormData();
        fd.append('title', this.form.title);
        fd.append('shortDescription', this.form.shortDescription || '');
        fd.append('longDescription', this.form.longDescription || '');

        // فایل‌های جدید و نام‌شان
        this.form.newFiles.forEach(obj => {
          fd.append('attachments', obj.file);
          fd.append('displayNamesNew', obj.displayName);
        });

        // حذف ضمائم
        this.form.deletedAttachments.forEach(id => {
          fd.append('deletedAttachments', id);
        });

        // نام‌های به‌روز شده ضمائم موجود
        this.form.attachments.forEach(att => {
          fd.append('existingAttachmentIds', att.id);
          fd.append('existingDisplayNames', att.displayName);
        });

        if (this.editingId) {
          await axios.put(`/admin/api/announcements/${this.editingId}`, fd);
          this.sendNotification('success', 'اطلاعیه بروزرسانی شد');
        } else {
          await axios.post('/admin/api/announcements', fd);
          this.sendNotification('success', 'اطلاعیه جدید ایجاد شد');
        }

        this.closeForm();
        await this.fetchAnnouncements();
      } catch {
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

    // ---- گروه‌ها ----
    async fetchGroups() {
      try {
        const res = await axios.get('/admin/api/groups');
        this.groups = res.data;
      } catch {
        this.sendNotification('error', 'خطا در دریافت گروه‌ها');
      }
    },
    async updateGroup(g) {
      try {
        await axios.put(`/admin/api/groups/${g.id}`, {
          name: g.name,
          code: g.code,
          walletCode: g.walletCode,
          score: g.score
        });
        this.sendNotification('success', 'گروه بروزرسانی شد');
      } catch {
        this.sendNotification('error', 'خطا در ذخیره گروه');
      }
    },
    async deleteGroup(g) {
      if (!confirm(`آیا از حذف گروه "${g.name}" مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/groups/${g.id}`);
        this.sendNotification('success', 'گروه حذف شد');
      } catch {
        this.sendNotification('error', 'خطا در حذف گروه');
      }
    },

    // ---- محتواها ----
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
      this.contentForm = { title:'', shortDescription:'', longDescription:'', attachments:[], newFiles:[] };
      this.deletedContentIds = [];
      this.showContentForm = true; // ← اینجا فعال می‌کنی
    },
    openEditContentForm(c) {
      this.editingContentId = c.id;
      this.contentForm = {
        title: c.title,
        shortDescription: c.shortDescription,
        longDescription: c.longDescription,
        attachments: c.attachments.map(a=>({ id:a.id, displayName:a.originalName, path:a.path }))
      };
      this.deletedContentIds = [];
      this.newFiles = [];
      this.showForm = true;
    },
    markContentForDelete(id) {
      this.deletedContentIds.push(id);
      this.contentForm.attachments = this.contentForm.attachments.filter(a=>a.id!==id);
    },
    handleContentFiles(e) {
      Array.from(e.target.files).forEach(f=> this.contentForm.newFiles.push({ file:f, displayName:f.name }));
    },
    async saveContent() {
      if (!this.contentForm.title.trim()) {
        this.sendNotification('error','عنوان را وارد کنید');
        return;
      }
      this.setLoadingState(true);
      try {
        const fd = new FormData();
        fd.append('title', this.contentForm.title);
        fd.append('shortDescription', this.contentForm.shortDescription);
        fd.append('longDescription', this.contentForm.longDescription);
        this.deletedContentIds.forEach(id=> fd.append('deleteIds[]', id));
        this.contentForm.newFiles.forEach(nf=>{
          fd.append('files', nf.file);
          fd.append('displayNamesNew', nf.displayName);
        });
        const url = this.editingContentId
          ? `/admin/api/training/${this.editingContentId}`
          : '/admin/api/training';
        await axios.post(url, fd, { headers:{ 'Content-Type':'multipart/form-data' }});
        this.sendNotification('success','ذخیره شد');
        this.showForm = false;
        await this.fetchTraining();
      } catch {
        this.sendNotification('error','خطا در ذخیره محتوا');
      } finally {
        this.setLoadingState(false);
      }
    },
    async deleteContent(c) {
      if (!confirm(`آیا از حذف "${c.title}" مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/training/${c.id}`);
        this.sendNotification('success','حذف شد');
        this.fetchTraining();
      } catch {
        this.sendNotification('error','خطا در حذف محتوا');
      }
    }
  }
});
