const socket = io();

new Vue({
  el: '#adminApp',
  data: {
    // کاربران و منتورها
    users: [],
    mentors: [],
    // جستجو
    search: '',
    searchMentor: '',
    error: '',
    // منوی کناری
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
    // بارگذاری اولیه بر اساس بخش فعال
    if (this.activeSection === 'users') this.fetchUsers();
    if (this.activeSection === 'mentors') this.fetchMentors();

    socket.on('userUpdated', updatedUser => {
      // به‌روزرسانی real-time
      const list = updatedUser.role === 'mentor' ? this.mentors : this.users;
      const idx = list.findIndex(u => u.id === updatedUser.id);
      if (idx !== -1) this.$set(list, idx, updatedUser);
    });
  },
  watch: {
    activeSection(newSec) {
      if (newSec === 'users') this.fetchUsers();
      if (newSec === 'mentors') this.fetchMentors();
      // بخش‌های دیگه بعدا اضافه میشن
    }
  },
  methods: {
    // کاربران عادی
    async fetchUsers() {
      this.error = '';
      try {
        const res = await axios.get('/admin/api/users');
        this.users = res.data
          .filter(u => u.role === 'user')
          .filter(u => u.firstName.includes(this.search) ||
                       u.lastName.includes(this.search) ||
                       u.phoneNumber.includes(this.search) ||
                       u.email.includes(this.search));
      } catch {
        this.error = 'خطا در دریافت کاربران';
      }
    },
    // منتورها
    async fetchMentors() {
      this.error = '';
      try {
        const res = await axios.get('/admin/api/users');
        this.mentors = res.data
          .filter(u => u.role === 'mentor')
          .filter(u => u.firstName.includes(this.searchMentor) ||
                       u.lastName.includes(this.searchMentor) ||
                       u.phoneNumber.includes(this.searchMentor) ||
                       u.email.includes(this.searchMentor));
      } catch {
        this.error = 'خطا در دریافت منتورها';
      }
    },
    // ذخیره تغییرات
    async updateUser(user) {
      this.error = '';
      try {
        await axios.put(`/admin/api/users/${user.id}`, user);
      } catch (e) {
        this.error = e.response?.data?.message || 'خطا در به‌روزرسانی';
      }
    },
    // حذف با تأیید
    async deleteUser(user) {
      const ok = confirm(`آیا مطمئن هستید که می‌خواهید ${user.firstName} ${user.lastName} را حذف کنید؟`);
      if (!ok) return;
      try {
        await axios.delete(`/admin/api/users/${user.id}`);
        // از لیست محلی هم حذفش کن
        const list = user.role === 'mentor' ? this.mentors : this.users;
        const idx = list.findIndex(u => u.id === user.id);
        if (idx !== -1) list.splice(idx, 1);
      } catch {
        this.error = 'خطا در حذف کاربر';
      }
    }
  }
});
