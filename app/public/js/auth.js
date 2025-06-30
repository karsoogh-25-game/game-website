// app/public/js/auth.js

new Vue({
  el: '#app',
  data: {
    mode: null,
    slide: 0,
    firstName: '', lastName: '',
    gender: null,
    phoneNumber: '', nationalId: '', email: '',
    code: '', password: '', password2: '',
    errorMessage: '', errorField: '',
    loading: false
  },
  computed: {
    validEmail()    { return /^\S+@\S+\.\S+$/.test(this.email); },
    validPhone()    { return /^09\d{9}$/.test(this.phoneNumber); },
    validNational() { return /^\d{10}$/.test(this.nationalId); },
    progress()      { return (this.slide - 1) / 4 * 100; }
  },
  methods: {
    selectMode(m) {
      this.mode = m;
      this.slide = 1;
      this.clearError();
    },
    prev() {
      this.clearError();
      if (this.slide > 1) {
        this.slide--;
      } else {
        this.slide = 0;
      }
    },
    async next() {
      this.clearError();
      if (this.loading) return;

      if (this.slide === 1 && (!this.firstName || !this.lastName)) {
        this.error('firstName', 'نام و نام‌خانوادگی الزامی است');
        return;
      }
      if (this.slide === 1 && !this.gender) {
        this.error('gender', 'انتخاب جنسیت الزامی است.');
        return;
      }
      if (this.slide === 2) {
        if (!this.validPhone)    { this.error('phoneNumber', 'شماره موبایل صحیح نیست'); return; }
        if (!this.validNational) { this.error('nationalId', 'کد ملی باید ۱۰ رقم باشد'); return; }
        if (!this.validEmail)    { this.error('email', 'فرمت ایمیل صحیح نیست'); return; }
      }
      if (this.slide === 3 && this.code.length !== 6) {
        this.error('code', 'کد ۶ رقمی را وارد کنید');
        return;
      }
      if (this.slide === 4) {
        if (this.password.length < 6 || !/\d/.test(this.password)) {
          this.error('password', 'رمز حداقل ۶ کاراکتر و شامل عدد باشد');
          return;
        }
        if (this.password !== this.password2) {
          this.error('password2', 'رمزها مطابقت ندارند');
          return;
        }
      }

      // call API
      this.loading = true;
      try {
        if (this.slide === 1) {
          await axios.post('/api/register/step1', {
            firstName: this.firstName,
            lastName: this.lastName,
            gender: this.gender
          });
        }
        else if (this.slide === 2) {
          await axios.post('/api/register/step2', {
            phoneNumber: this.phoneNumber,
            nationalId: this.nationalId,
            email: this.email
          });
        }
        else if (this.slide === 3) {
          await axios.post('/api/register/verify-code', { code: this.code });
        }
        else if (this.slide === 4) {
          await axios.post('/api/register/set-password', { password: this.password });
        }
        this.slide++;
      } catch (e) {
        const msg = e.response?.data?.message || 'خطا در ارتباط با سرور';
        this.errorMessage = msg;
        if (/موبایل/.test(msg))    this.errorField = 'phoneNumber';
        else if (/ملی/.test(msg))  this.errorField = 'nationalId';
        else if (/ایمیل/.test(msg)) this.errorField = 'email';
      }
      this.loading = false;
    },
    goToLogin() {
      this.mode = 'login';
      this.slide = 1;
      this.clearError();
    },
    async login() {
      this.clearError();
      if (this.loading) return;

      if (!this.validPhone) { this.error('loginPhone', 'شماره موبایل صحیح نیست'); return; }
      if (!this.password)   { this.error('loginPass', 'رمز را وارد کنید'); return; }

      this.loading = true;
      try {
        const res = await axios.post('/api/login', {
          phoneNumber: this.phoneNumber,
          password: this.password
        });
        if (res.data.isAdmin)       window.location = '/admin';
        else if (!res.data.isActive) this.errorMessage = 'حساب شما فعال نیست';
        else                         window.location = '/dashboard';
      } catch (e) {
        this.errorMessage = e.response?.data?.message;
      }
      this.loading = false;
    },
    error(field, msg) {
      this.errorField = field;
      this.errorMessage = msg;
    },
    clearError() {
      this.errorField = '';
      this.errorMessage = '';
    }
  }
});