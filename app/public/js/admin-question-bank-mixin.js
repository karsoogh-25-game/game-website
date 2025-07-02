// app/public/js/admin-question-bank-mixin.js
const adminQuestionBankMixin = {
  data() {
    return {
      questionForm: {
        id: null,
        name: '',
        points: null,
        color: '#FFB3BA',
        price: null,
        questionImage: null,
        imagePreview: null,
        isActive: true,
      },
      questions: [],
      showQuestionFormModal: false,
      editingQuestion: false,
      pastelColors: [
        { name: 'صورتی', value: '#FFB3BA' }, { name: 'هلویی', value: '#FFDFBA' },
        { name: 'زرد لیمویی', value: '#FFFFBA' }, { name: 'سبز نعنایی', value: '#BAFFC9' },
        { name: 'آبی آسمانی', value: '#BAE1FF' }, { name: 'یاسی', value: '#E0BBE4' },
        { name: 'نارنجی', value: '#FFDAC1' }, { name: 'سبز دریایی', value: '#B5EAD7' },
        { name: 'بنفش', value: '#F0D9FF' }, { name: 'نیلی', value: '#C9C9FF' }
      ],

      questionBankSettings: {
        comboMultiplier: 2,
        sequentialComboMultiplier: 4,
      },

      submissionsForCorrection: [],
      selectedSubmissionForDetails: null,
      showCorrectionModal: false,
      correctionForm: {},
      currentCorrections: [],
    };
  },
  methods: {
    async fetchQuestions() {
      this.setLoadingState(true);
      try {
        const response = await axios.get('/admin/api/question-bank/questions');
        this.questions = response.data;
      } catch (error) {
        this.sendNotification('error', 'خطا در دریافت لیست سوالات: ' + (error.response?.data?.message || error.message));
      } finally {
        this.setLoadingState(false);
      }
    },
    openNewQuestionForm() {
      this.editingQuestion = false;
      this.questionForm = { id: null, name: '', points: null, color: this.pastelColors[0].value, price: null, questionImage: null, imagePreview: null, isActive: true };
      this.showQuestionFormModal = true;
    },
    openEditQuestionForm(question) {
      this.editingQuestion = true;
      this.questionForm = {
        id: question.id,
        name: question.name,
        points: question.points,
        color: question.color,
        price: question.price,
        questionImage: null,
        imagePreview: question.imagePath,
        isActive: question.isActive,
      };
      this.showQuestionFormModal = true;
    },
    handleQuestionImageUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.questionForm.questionImage = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.questionForm.imagePreview = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        this.questionForm.questionImage = null;
        this.questionForm.imagePreview = this.editingQuestion ? this.questions.find(q=>q.id === this.questionForm.id)?.imagePath : null;
      }
    },
    async saveQuestion() {
      if (!this.questionForm.name || !this.questionForm.points || !this.questionForm.color || !this.questionForm.price) {
        this.sendNotification('error', 'تمام ورودی های ستاره‌دار الزامی هستند.');
        return;
      }
      if (!this.editingQuestion && !this.questionForm.questionImage) {
        this.sendNotification('error', 'فایل تصویر سوال الزامی است.');
        return;
      }

      this.setLoadingState(true);
      const formData = new FormData();
      formData.append('name', this.questionForm.name);
      formData.append('points', this.questionForm.points);
      formData.append('color', this.questionForm.color);
      formData.append('price', this.questionForm.price);
      formData.append('isActive', this.questionForm.isActive);
      if (this.questionForm.questionImage) {
        formData.append('questionImage', this.questionForm.questionImage);
      }

      try {
        let response;
        if (this.editingQuestion) {
          response = await axios.put(`/admin/api/question-bank/questions/${this.questionForm.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const index = this.questions.findIndex(q => q.id === response.data.id);
          if (index !== -1) this.$set(this.questions, index, response.data);
          this.sendNotification('success', 'سوال با موفقیت ویرایش شد.');
        } else {
          response = await axios.post('/admin/api/question-bank/questions', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          this.questions.unshift(response.data);
          this.sendNotification('success', 'سوال با موفقیت ایجاد شد.');
        }
        this.showQuestionFormModal = false;
      } catch (error) {
        this.sendNotification('error', 'خطا در ذخیره سوال: ' + (error.response?.data?.message || error.message));
      } finally {
        this.setLoadingState(false);
      }
    },
    async deleteQuestion(question) {
        sendConfirmationNotification('confirm', `آیا از حذف سوال «${question.name}» اطمینان دارید؟ این عمل غیرقابل بازگشت است (مگر اینکه سوال قبلا خریداری شده باشد که در اینصورت غیرفعال خواهد شد).`, async (confirmed) => {
            if(confirmed){
                this.setLoadingState(true);
                try {
                    await axios.delete(`/admin/api/question-bank/questions/${question.id}`);
                    const index = this.questions.findIndex(q => q.id === question.id);
                    this.fetchQuestions();
                    this.sendNotification('success', `سوال «${question.name}» با موفقیت پردازش (حذف/غیرفعال) شد.`);
                } catch (error) {
                    this.sendNotification('error', `خطا در حذف سوال: ` + (error.response?.data?.message || error.message));
                } finally {
                    this.setLoadingState(false);
                }
            }
        });
    },
    async fetchQuestionBankSettings() {
      if (this.userRole !== 'admin' && !this.isAdminUser) {
          console.warn("Attempt to fetch question bank settings by non-admin blocked.");
          return;
      }
      this.setLoadingState(true);
      try {
        const response = await axios.get('/admin/api/question-bank/settings');
        this.questionBankSettings = response.data;
      } catch (error) {
        this.sendNotification('error', 'خطا در دریافت تنظیمات بانک سوالات: ' + (error.response?.data?.message || error.message));
      } finally {
        this.setLoadingState(false);
      }
    },
    async saveQuestionBankSettings() {
      if (this.userRole !== 'admin' && !this.isAdminUser) {
          this.sendNotification('error', 'شما مجاز به تغییر تنظیمات نیستید.');
          return;
      }
      this.setLoadingState(true);
      try {
        await axios.put('/admin/api/question-bank/settings', this.questionBankSettings);
        this.sendNotification('success', 'تنظیمات بانک سوالات با موفقیت ذخیره شد.');
      } catch (error) {
        this.sendNotification('error', 'خطا در ذخیره تنظیمات: ' + (error.response?.data?.message || error.message));
      } finally {
        this.setLoadingState(false);
      }
    },

    async fetchSubmissionsForCorrection() {
      this.setLoadingState(true);
      try {
        const response = await axios.get('/admin/api/question-bank/submissions');
        this.submissionsForCorrection = response.data;
      } catch (error) {
        this.sendNotification('error', 'خطا در دریافت لیست کمبوهای نیازمند تصحیح: ' + (error.response?.data?.message || error.message));
      } finally {
        this.setLoadingState(false);
      }
    },
    async openCorrectionModal(submission) {
      this.setLoadingState(true);
      try {
        const response = await axios.get(`/admin/api/question-bank/submissions/${submission.id}`);
        this.selectedSubmissionForDetails = response.data;
        this.currentCorrections = this.selectedSubmissionForDetails.submittedQuestions.map(sq => ({
          purchasedQuestionId: sq.id,
          questionName: sq.question.name,
          questionImage: sq.question.imagePath,
          answerImage: sq.answerImagePath,
          isCorrect: null,
        }));
        this.showCorrectionModal = true;
      } catch (error) {
        this.sendNotification('error', 'خطا در دریافت جزئیات کمبو: ' + (error.response?.data?.message || error.message));
        this.selectedSubmissionForDetails = null;
      } finally {
        this.setLoadingState(false);
      }
    },
    async submitComboCorrection() {
      const allMarked = this.currentCorrections.every(c => c.isCorrect !== null);
      if (!allMarked) {
        this.sendNotification('error', 'لطفاً وضعیت صحیح یا غلط بودن همه سوالات را مشخص کنید.');
        return;
      }
      const dataToSend = {
        corrections: this.currentCorrections.map(c => ({
            purchasedQuestionId: c.purchasedQuestionId,
            isCorrect: c.isCorrect
        }))
      };

      this.setLoadingState(true);
      try {
        await axios.post(`/admin/api/question-bank/submissions/${this.selectedSubmissionForDetails.id}/correct`, dataToSend);
        this.sendNotification('success', 'تصحیح کمبو با موفقیت ثبت شد.');
        this.showCorrectionModal = false;
        this.selectedSubmissionForDetails = null;
        this.fetchSubmissionsForCorrection();
      } catch (error) {
        this.sendNotification('error', 'خطا در ثبت تصحیح: ' + (error.response?.data?.message || error.message));
      } finally {
        this.setLoadingState(false);
      }
    },
    handleSocketUpdates_QuestionBank() {
        window.socket.on('newQuestionAdded', (question) => {
            if (this.activeSection === 'question_bank_questions' || this.activeSection === 'question_bank_correction') {
                this.questions.unshift(question);
            }
        });
        window.socket.on('questionUpdated', (question) => {
             if (this.activeSection === 'question_bank_questions' || this.activeSection === 'question_bank_correction') {
                const index = this.questions.findIndex(q => q.id === question.id);
                if (index !== -1) this.$set(this.questions, index, question);
            }
        });
        window.socket.on('questionDeleted', ({ id }) => {
            if (this.activeSection === 'question_bank_questions' || this.activeSection === 'question_bank_correction') {
                this.questions = this.questions.filter(q => q.id !== id);
            }
        });
        window.socket.on('questionBankSettingsUpdated', (settings) => {
            if (this.activeSection === 'question_bank_settings') {
                this.questionBankSettings = settings;
            }
        });
        window.socket.on('newComboForCorrection', (combo) => {
            if (this.activeSection === 'question_bank_correction') {
                 this.fetchSubmissionsForCorrection();
            }
            if (this.isAdminUser || this.isMentorUser) {
                this.sendNotification('info', `یک کمبوی جدید با شماره ${combo.id} برای تصحیح ارسال شد.`);
            }
        });
        window.socket.on('comboCorrectedAdmin', (combo) => {
            if (this.activeSection === 'question_bank_correction') {
                this.submissionsForCorrection = this.submissionsForCorrection.filter(s => s.id !== combo.id);
            }
        });
    }
  },
};
