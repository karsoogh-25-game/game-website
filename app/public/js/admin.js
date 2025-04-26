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
    // درخواست اجازه نوتیفیکیشن
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    this.loadSection();

    socket.on('userUpdated', updated => {
      // real-time: اول در لیست فعلی به‌روزرسانی کن
      let list = updated.role === 'mentor' ? this.mentors : this.users;
      let idx  = list.findIndex(u => u.id === updated.id);
      if (idx !== -1) {
        this.$set(list, idx, updated);

      // اگر نقش تغییر کرده باید او را از لیست فعلی حذف کنیم
      } else {
        // حذف از لیست مقابل
        let other = updated.role === 'mentor' ? this.users : this.mentors;
        let j = other.findIndex(u => u.id === updated.id);
        if (j !== -1) other.splice(j, 1);
      }
    });
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
        // نگهداری نقش قبلی برای بررسی تغییر
        const prevRole = u.role;
        await axios.put(`/admin/api/users/${u.id}`, u);
        this.showNotification('تغییرات ذخیره شد');

        // اگر نقش کاربر تغییر کرده، لود مجدد بخش‌ها
        if (this.activeSection === 'users' && u.role === 'mentor') {
          // حذف از users
          this.users = this.users.filter(x => x.id !== u.id);
        }
        if (this.activeSection === 'mentors' && u.role === 'user') {
          this.mentors = this.mentors.filter(x => x.id !== u.id);
        }
      } catch {
        this.showNotification('خطا در ذخیره تغییرات');
      }
    },
    async deleteUser(u) {
      if (!confirm(`آیا از حذف ${u.firstName} ${u.lastName} مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/users/${u.id}`);
        // پاک کردن از لیست محلی
        if (u.role === 'mentor') {
          this.mentors = this.mentors.filter(x => x.id !== u.id);
        } else {
          this.users = this.users.filter(x => x.id !== u.id);
        }
        this.showNotification('کاربر با موفقیت حذف شد');
      } catch {
        this.showNotification('خطا در حذف کاربر');
      }
    }
  }
});
