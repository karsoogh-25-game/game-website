// app/public/js/admin-users-mixin.js
const adminUsersMixin = {
  data: {
    users: [],
    mentors: [],
    search: '',
    searchMentor: '',
  },
  methods: {
    async fetchUsers() {
      try {
        const res = await axios.get('/admin/api/users');
        this.users = res.data.filter(u =>
          u.role === 'user' &&
          [u.firstName, u.lastName, u.phoneNumber, u.email].join(' ').toLowerCase().includes(this.search.toLowerCase())
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
      } catch {
        this.sendNotification('error', 'خطا در حذف کاربر');
      }
    },
    async fetchMentors() {
      try {
        const res = await axios.get('/admin/api/users');
        this.mentors = res.data.filter(u =>
          u.role === 'mentor' &&
          [u.firstName, u.lastName, u.phoneNumber, u.email].join(' ').toLowerCase().includes(this.searchMentor.toLowerCase())
        );
      } catch {
        this.sendNotification('error', 'خطا در دریافت منتورها');
      }
    },
  }
};