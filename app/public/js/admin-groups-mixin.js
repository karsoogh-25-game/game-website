// app/public/js/admin-groups-mixin.js
const adminGroupsMixin = {
  data: {
    groups: [],
  },
  methods: {
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
        await axios.put(`/admin/api/groups/${g.id}`, { name: g.name, code: g.code, walletCode: g.walletCode, score: g.score });
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
  }
};