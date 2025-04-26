const socket = io();

new Vue({
  el: '#adminApp',
  data: {
    users: [],
    mentors: [],
    search: '',
    searchMentor: '',
    activeSection: 'users',
    sections: [
      { key: 'users',    label: 'کاربرها' },
      { key: 'groups',   label: 'گروه‌ها' },
      { key: 'mentors',  label: 'منتورها' },
      { key: 'items',    label: 'آیتم‌ها' },
      { key: 'contents', label: 'محتواها' },
    ]
  },
  created() {
    // اتصال real-time
    socket.on('userUpdated', updated => {
      let list = updated.role === 'mentor' ? this.mentors : this.users;
      let idx  = list.findIndex(u => u.id === updated.id);
      if (idx !== -1) {
        this.$set(list, idx, updated);
      } else {
        let other = updated.role === 'mentor' ? this.users : this.mentors;
        let j = other.findIndex(u => u.id === updated.id);
        if (j !== -1) other.splice(j, 1);
      }
    });

    // گرفتن اجازه برای نوتیفیکیشن
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    // بارگذاری اولیه
    this.loadSection();
  },
  watch: {
    activeSection() {
      this.loadSection();
    }
  },
  methods: {
    loadSection() {
      if (this.activeSection === 'users')   this.fetchUsers();
      if (this.activeSection === 'mentors') this.fetchMentors();
    },
    showNotification(msg) {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification('پنل ادمین', { body: msg });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('پنل ادمین', { body: msg });
        });
      }
    },
    async fetchUsers() {
      try {
        const res = await axios.get('/admin/api/users');
        this.users = res.data
          .filter(u => u.role === 'user')
          .filter(u => [u.firstName, u.lastName, u.phoneNumber, u.email]
            .some(f => f.includes(this.search))
          );
      } catch {
        this.showNotification('خطا در دریافت کاربران');
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
        this.showNotification('خطا در دریافت منتورها');
      }
    },
    async updateUser(u) {
      try {
        await axios.put(`/admin/api/users/${u.id}`, u);
        this.showNotification('تغییرات ذخیره شد');
        // بعد از آپدیت نقش، بخش مجدد لود بشه
        this.loadSection();
      } catch {
        this.showNotification('خطا در ذخیره تغییرات');
      }
    },
    async deleteUser(u) {
      if (!confirm(`آیا از حذف ${u.firstName} ${u.lastName} مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/users/${u.id}`);
        this.showNotification('کاربر با موفقیت حذف شد');
        this.loadSection(); // بعد حذف، کل دیتا رو دوباره بگیر
      } catch {
        this.showNotification('خطا در حذف کاربر');
      }
    }
  }
});
