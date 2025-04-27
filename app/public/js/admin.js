const socket = io();

new Vue({
  el: '#adminApp',
  data: {
    users: [],
    mentors: [],
    announcements: [],
    groups: [],
    search: '',
    searchMentor: '',
    form: {
      title: '',
      shortDescription: '',
      longDescription: '',
      attachment: null
    },
    showForm: false,
    editingId: null,
    activeSection: 'users',
    sections: [
      { key: 'users',         label: 'کاربرها' },
      { key: 'mentors',       label: 'منتورها' },
      { key: 'announcements', label: 'اطلاعیه‌ها' },
      { key: 'groups',        label: 'گروه‌ها' },
      { key: 'items',         label: 'آیتم‌ها' },
      { key: 'contents',      label: 'محتواها' }
    ]
  },
  created() {
    // دریافت اولیه با سوکت (کاربر و منتور)
    socket.on('usersData', data => {
      this.users   = data.filter(u => u.role === 'user');
      this.mentors = data.filter(u => u.role === 'mentor');
      this.setLoadingState(false);
    });

    // سوکت رویدادهای اطلاعیه
    socket.on('announcementCreated', ann => this.announcements.unshift(ann));
    socket.on('announcementUpdated', ann => {
      const i = this.announcements.findIndex(a => a.id === ann.id);
      if (i !== -1) this.$set(this.announcements, i, ann);
    });
    socket.on('announcementDeleted', ({ id }) => {
      this.announcements = this.announcements.filter(a => a.id !== id);
    });

    // سوکت رویدادهای گروه
    socket.on('groupCreated', grp => this.groups.unshift(grp));
    socket.on('groupUpdated', grp => {
      const i = this.groups.findIndex(g => g.id === grp.id);
      if (i !== -1) this.$set(this.groups, i, grp);
    });
    socket.on('groupDeleted', ({ id }) => {
      this.groups = this.groups.filter(g => g.id !== id);
    });

    this.loadSection();
  },
  mounted() {
    document.getElementById('refresh-btn')
            .addEventListener('click', this.refreshData);
  },
  watch: {
    activeSection() {
      this.loadSection();
    }
  },
  methods: {
    // spinner
    setLoadingState(isLoading) {
      const s = document.getElementById('loading-spinner');
      if (s) s.style.display = isLoading ? 'flex' : 'none';
    },

    // نوتیفیکیشن
    sendNotification(type, text) {
      const colors = { success: 'bg-green-500', error: 'bg-red-500' };
      const n = document.createElement('div');
      n.className = `rounded p-3 text-white ${colors[type]} mb-2 shadow-lg`;
      n.innerText = text;
      document.getElementById('alert-container').appendChild(n);
      setTimeout(() => n.remove(), 3000);
    },

    // refresh via socket
    refreshData() {
      this.setLoadingState(true);
      socket.emit('refreshData');
    },

    // بارگذاری هر بخش
    loadSection() {
      if (this.activeSection === 'users')         this.fetchUsers();
      if (this.activeSection === 'mentors')       this.fetchMentors();
      if (this.activeSection === 'announcements') this.fetchAnnouncements();
      if (this.activeSection === 'groups')        this.fetchGroups();
    },

    // === Users & Mentors ===
    async fetchUsers() {
      try {
        const res = await axios.get('/admin/api/users');
        this.users = res.data
          .filter(u => u.role === 'user')
          .filter(u => [u.firstName, u.lastName, u.phoneNumber, u.email]
            .some(f => f.includes(this.search))
          );
      } catch {
        this.sendNotification('error', 'خطا در دریافت کاربران');
      }
    },
    async fetchMentors() {
      try {
        const res = await axios.get('/admin/api/users');
        this.mentors = res.data
          .filter(u => u.role === 'mentor')
          .filter(u => [u.firstName, u.lastName, u.phoneNumber, u.email]
            .some(f => f.includes(this.searchMentor))
          );
      } catch {
        this.sendNotification('error', 'خطا در دریافت منتورها');
      }
    },
    async updateUser(u) {
      try {
        await axios.put(`/admin/api/users/${u.id}`, u);
        this.sendNotification('success', 'تغییرات ذخیره شد');
        this.loadSection();
      } catch {
        this.sendNotification('error', 'خطا در ذخیره تغییرات');
      }
    },
    async deleteUser(u) {
      if (!confirm(`آیا از حذف ${u.firstName} ${u.lastName} مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/users/${u.id}`);
        this.sendNotification('success', 'کاربر حذف شد');
        this.loadSection();
      } catch {
        this.sendNotification('error', 'خطا در حذف کاربر');
      }
    },

    // === Announcements ===
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
      this.form = { title: '', shortDescription: '', longDescription: '', attachment: null };
      this.showForm = true;
    },
    openEditForm(a) {
      this.editingId = a.id;
      this.form = {
        title: a.title,
        shortDescription: a.shortDescription,
        longDescription: a.longDescription,
        attachment: null
      };
      this.showForm = true;
    },
    onFileChange(e) {
      this.form.attachment = e.target.files[0];
    },
    closeForm() {
      this.showForm = false;
    },
    async saveAnnouncement() {
      if (!this.form.title) {
        return this.sendNotification('error', 'عنوان الزامی است');
      }
      this.setLoadingState(true);
      try {
        const data = new FormData();
        data.append('title', this.form.title);
        data.append('shortDescription', this.form.shortDescription || '');
        data.append('longDescription', this.form.longDescription || '');
        if (this.form.attachment) {
          data.append('attachment', this.form.attachment);
        }
        if (this.editingId) {
          await axios.put(`/admin/api/announcements/${this.editingId}`, data);
          this.sendNotification('success', 'اطلاعیه ویرایش شد');
        } else {
          await axios.post('/admin/api/announcements', data);
          this.sendNotification('success', 'اطلاعیه جدید ایجاد شد');
        }
        this.closeForm();
        this.fetchAnnouncements();
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

    // === Groups ===
    async fetchGroups() {
      try {
        const res = await axios.get('/admin/api/groups');
        this.groups = res.data; // انتظار: هر شی شامل members array و leader object
      } catch {
        this.sendNotification('error', 'خطا در دریافت گروه‌ها');
      }
    },
    async updateGroup(g) {
      try {
        await axios.put(`/admin/api/groups/${g.id}`, {
          name:       g.name,
          code:       g.code,
          walletCode: g.walletCode,
          score:      g.score
        });
        this.sendNotification('success', 'گروه بروز شد');
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
    }
  }
});
