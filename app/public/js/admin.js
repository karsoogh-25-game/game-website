// admin.js
const socket = io();

new Vue({
  el: '#adminApp',
  data: {
    users: [], mentors: [], announcements: [], groups: [],
    search: '', searchMentor: '',
    form: { title:'', shortDescription:'', longDescription:'', attachment:null },
    showForm: false, editingId: null,
    activeSection: 'users',
    sections: [
      { key:'users', label:'کاربرها' },
      { key:'mentors', label:'منتورها' },
      { key:'announcements', label:'اطلاعیه‌ها' },
      { key:'groups', label:'گروه‌ها' },
      { key:'items', label:'آیتم‌ها' },
      { key:'contents', label:'محتواها' }
    ]
  },
  created() {
    socket.on('usersData', data => {
      this.users = data.filter(u=>u.role==='user');
      this.mentors = data.filter(u=>u.role==='mentor');
    });
    socket.on('announcementCreated', ann => this.announcements.unshift(ann));
    socket.on('announcementUpdated', ann => {
      const i=this.announcements.findIndex(a=>a.id===ann.id);
      if(i!==-1) this.$set(this.announcements,i,ann);
    });
    socket.on('announcementDeleted', ({id})=> this.announcements=this.announcements.filter(a=>a.id!==id));
    socket.on('groupCreated', grp=>this.groups.unshift(grp));
    socket.on('groupUpdated', grp=>{
      const i=this.groups.findIndex(g=>g.id===grp.id);
      if(i!==-1) this.$set(this.groups,i,grp);
    });
    socket.on('groupDeleted', ({id})=>this.groups=this.groups.filter(g=>g.id!==id));

    // load initial
    this.loadSection();
  },
  mounted() {
    document.getElementById('refresh-btn').addEventListener('click', this.refreshData);
  },
  methods: {
    selectSection(key) {
      const cur = document.querySelector('.content-section.active');
      if(cur) {
        cur.classList.remove('fade-in');
        cur.classList.add('fade-out');
        cur.addEventListener('transitionend', () => {
          cur.classList.remove('active','fade-out');
          this.activeSection = key;
          this.loadSection();
        }, { once:true });
      } else {
        this.activeSection = key;
        this.loadSection();
      }
    },
    setLoadingState(isLoading) {
      const s = document.getElementById('loading-spinner');
      if(s) s.style.display = isLoading ? 'flex' : 'none';
    },
    sendNotification(type,text) {
      const cfgs = { success:{color:'bg-green-500',icon:'✔️'}, error:{color:'bg-red-500',icon:'❌'} };
      const cfg = cfgs[type]||cfgs.success;
      const n = document.createElement('div');
      n.className = `alert-box ${cfg.color} text-white`;
      n.innerHTML = `<span class="ml-2">${cfg.icon}</span><p>${text}</p>`;
      document.getElementById('alert-container').appendChild(n);
      setTimeout(()=>n.classList.add('show'),10);
      setTimeout(()=>{
        n.classList.remove('show');
        setTimeout(()=>n.remove(),500);
      },3000);
    },
    async refreshData() {
      this.setLoadingState(true);
      await this.loadSection();
      this.setLoadingState(false);
    },
    async loadSection() {
      this.setLoadingState(true);
      if(this.activeSection==='users')         await this.fetchUsers();
      if(this.activeSection==='mentors')       await this.fetchMentors();
      if(this.activeSection==='announcements') await this.fetchAnnouncements();
      if(this.activeSection==='groups')        await this.fetchGroups();
      this.setLoadingState(false);
    },
    async fetchUsers() {
      try {
        const res = await axios.get('/admin/api/users');
        this.users = res.data.filter(u=>u.role==='user' && [u.firstName,u.lastName,u.phoneNumber,u.email].some(f=>f.includes(this.search)));
      } catch { this.sendNotification('error','خطا در دریافت کاربران'); }
    },
    async fetchMentors() {
      try {
        const res = await axios.get('/admin/api/users');
        this.mentors = res.data.filter(u=>u.role==='mentor' && [u.firstName,u.lastName,u.phoneNumber,u.email].some(f=>f.includes(this.searchMentor)));
      } catch { this.sendNotification('error','خطا در دریافت منتورها'); }
    },
    async updateUser(u) {
      try {
        await axios.put(`/admin/api/users/${u.id}`,u);
        this.sendNotification('success','تغییرات ذخیره شد');
        this.loadSection();
      } catch { this.sendNotification('error','خطا در ذخیره تغییرات'); }
    },
    async deleteUser(u) {
      if(!confirm(`آیا از حذف ${u.firstName} ${u.lastName} مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/users/${u.id}`);
        this.sendNotification('success','کاربر حذف شد');
        this.loadSection();
      } catch { this.sendNotification('error','خطا در حذف کاربر'); }
    },
    async fetchAnnouncements() {
      try {
        const res = await axios.get('/admin/api/announcements');
        this.announcements = res.data;
      } catch { this.sendNotification('error','خطا در دریافت اطلاعیه‌ها'); }
    },
    openCreateForm() { this.editingId=null; this.form={title:'',shortDescription:'',longDescription:'',attachment:null}; this.showForm=true; },
    openEditForm(a) { this.editingId=a.id; this.form={ title:a.title, shortDescription:a.shortDescription, longDescription:a.longDescription, attachment:null }; this.showForm=true; },
    onFileChange(e) { this.form.attachment=e.target.files[0]; },
    closeForm() { this.showForm=false; },
    async saveAnnouncement() {
      if(!this.form.title) return this.sendNotification('error','عنوان الزامی است');
      this.setLoadingState(true);
      try {
        const data = new FormData();
        data.append('title',this.form.title);
        data.append('shortDescription',this.form.shortDescription||'');
        data.append('longDescription',this.form.longDescription||'');
        if(this.form.attachment) data.append('attachment',this.form.attachment);
        if(this.editingId) {
          await axios.put(`/admin/api/announcements/${this.editingId}`,data);
          this.sendNotification('success','اطلاعیه ویرایش شد');
        } else {
          await axios.post('/admin/api/announcements',data);
          this.sendNotification('success','اطلاعیه جدید ایجاد شد');
        }
        this.closeForm(); await this.fetchAnnouncements();
      } catch { this.sendNotification('error','خطا در ذخیره اطلاعیه'); }
      finally { this.setLoadingState(false); }
    },
    async deleteAnnouncement(a) {
      if(!confirm(`آیا از حذف اطلاعیه "${a.title}" مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/announcements/${a.id}`);
        this.sendNotification('success','اطلاعیه حذف شد');
      } catch { this.sendNotification('error','خطا در حذف اطلاعیه'); }
    },
    async fetchGroups() {
      try {
        const res = await axios.get('/admin/api/groups');
        this.groups = res.data;
      } catch { this.sendNotification('error','خطا در دریافت گروه‌ها'); }
    },
    async updateGroup(g) {
      try {
        await axios.put(`/admin/api/groups/${g.id}`,{ name:g.name, code:g.code, walletCode:g.walletCode, score:g.score });
        this.sendNotification('success','گروه بروزرسانی شد');
      } catch { this.sendNotification('error','خطا در ذخیره گروه'); }
    },
    async deleteGroup(g) {
      if(!confirm(`آیا از حذف گروه "${g.name}" مطمئن هستید؟`)) return;
      try {
        await axios.delete(`/admin/api/groups/${g.id}`);
        this.sendNotification('success','گروه حذف شد');
      } catch { this.sendNotification('error','خطا در حذف گروه'); }
    }
  }
});
