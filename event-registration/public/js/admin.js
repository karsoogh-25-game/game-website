const socket = io();
new Vue({
  el: '#adminApp',
  data: { users:[], search:'', error:'' },
  created() {
    this.fetchUsers();
    socket.on('userUpdated', u => {
      const i=this.users.findIndex(x=>x.id===u.id);
      if(i!==-1) this.$set(this.users,i,u);
    });
  },
  methods: {
    async fetchUsers() {
      try {
        const res=await axios.get('/admin/api/users',{ params:{ search:this.search } });
        this.users=res.data;
      } catch { this.error='خطا در دریافت کاربران'; }
    },
    async updateUser(user) {
      this.error='';
      try {
        await axios.put(`/admin/api/users/${user.id}`, user);
      } catch(e) { this.error=e.response.data.message||'خطا در به‌روزرسانی'; }
    }
  }
});
