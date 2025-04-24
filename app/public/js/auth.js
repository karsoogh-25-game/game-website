new Vue({
  el: '#app',
  data: {
    mode: null, slide: 0,
    firstName:'', lastName:'',
    phoneNumber:'', nationalId:'', email:'',
    code:'', password:'', password2:'',
    error:''
  },
  computed: {
    validEmail() {
      return /^\S+@\S+\.\S+$/.test(this.email);
    },
    validPhone() {
      return /^09\d{9}$/.test(this.phoneNumber);
    },
    validNational() {
      return /^\d{10}$/.test(this.nationalId);
    },
    canNext() {
      if (this.slide===1) return this.firstName && this.lastName;
      if (this.slide===2) return this.validPhone && this.validNational && this.validEmail;
      if (this.slide===3) return this.code.length===6;
      if (this.slide===4) return this.password.length>=6 && /\d/.test(this.password) && this.password===this.password2;
      return false;
    },
    progress() {
      return (this.slide-1)/4*100;
    }
  },
  methods: {
    selectMode(m) {
      this.mode = m; this.slide = 1; this.error='';
    },
    prev() {
      if (this.slide>1) this.slide--;
      else this.slide = 0;
      this.error = '';
    },
    async next() {
      this.error = '';
      try {
        if (this.slide===1) {
          await axios.post('/api/register/step1',{ firstName:this.firstName, lastName:this.lastName });
        }
        else if (this.slide===2) {
          await axios.post('/api/register/step2',{
            phoneNumber:this.phoneNumber,
            nationalId:this.nationalId,
            email:this.email
          });
        }
        else if (this.slide===3) {
          await axios.post('/api/register/verify-code',{ code:this.code });
        }
        else if (this.slide===4) {
          await axios.post('/api/register/set-password',{ password:this.password });
        }
        this.slide++;
      } catch (e) {
        this.error = e.response.data.message || 'خطا در مرحله‌ی ثبت‌نام';
      }
    },
    goToLogin(){
      this.mode='login'; this.slide=1; this.error='';
    },
    async login() {
      this.error = '';
      try {
        const res = await axios.post('/api/login',{
          phoneNumber:this.phoneNumber, password:this.password
        });
        if (res.data.isAdmin) window.location='/admin';
        else if (!res.data.isActive) this.error='حساب شما غیرفعاله';
        else window.location='/dashboard';
      } catch (e) {
        this.error = e.response.data.message;
      }
    }
  }
});
