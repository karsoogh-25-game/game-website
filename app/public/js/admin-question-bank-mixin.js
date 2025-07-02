// app/public/js/admin-question-bank-mixin.js
const adminQuestionBankMixin = {
  data() {
    return {
      // Data for Question Creation/Editing
      questionForm: {
        id: null,
        name: '',
        points: null,
        color: '#FFB3BA', // Default to the first pastel color
        price: null,
        questionImage: null,
        imagePreview: null,
        isActive: true,
      },
      questions: [],
      showQuestionFormModal: false,
      editingQuestion: false,
      pastelColors: [
        { name: 'صورتی روشن', value: '#FFB3BA' }, { name: 'هلویی روشن', value: '#FFDFBA' },
        { name: 'زرد لیمویی روشن', value: '#FFFFBA' }, { name: 'سبز نعنایی روشن', value: '#BAFFC9' },
        { name: 'آبی آسمانی روشن', value: '#BAE1FF' }, { name: 'یاسی روشن', value: '#E0BBE4' },
        { name: 'نارنجی پاستلی', value: '#FFDAC1' }, { name: 'سبز دریایی پاستلی', value: '#B5EAD7' },
        { name: 'بنفش پاستلی', value: '#F0D9FF' }, { name: 'نیلی پاستلی', value: '#C9C9FF' }
      ],

      // Data for Question Bank Settings (Admin only)
      questionBankSettings: {
        comboMultiplier: 2,
        sequentialComboMultiplier: 4,
      },

      // Data for Combo Correction
      submissionsForCorrection: [],
      selectedSubmissionForDetails: null,
      showCorrectionModal: false,
      correctionForm: { // For submitting individual question corrections within a combo
        // purchasedQuestionId: null, isCorrect: true/false
      },
      currentCorrections: [], // Array of { purchasedQuestionId: X, isCorrect: true }
    };
  },
  methods: {
    // --- Question Management Methods ---
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
        questionImage: null, // Will not pre-fill file input, handled separately
        imagePreview: question.imagePath, // Show current image
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
        this.sendNotification('error', 'تمام فیلدهای ستاره‌دار الزامی هستند.');
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
                    // The backend might return the updated (deactivated) question or a success message
                    // For now, we just refetch or filter locally
                    const index = this.questions.findIndex(q => q.id === question.id);
                    // If the question was deactivated, the backend returns a specific message.
                    // We might need to update it in the list instead of removing.
                    // For a direct delete, we remove it.
                    // Let's assume for now it's deleted or we refetch.
                    // this.questions.splice(index, 1);
                    this.fetchQuestions(); // Refetch to get the latest state
                    this.sendNotification('success', `سوال «${question.name}» با موفقیت پردازش (حذف/غیرفعال) شد.`);
                } catch (error) {
                    this.sendNotification('error', `خطا در حذف سوال: ` + (error.response?.data?.message || error.message));
                } finally {
                    this.setLoadingState(false);
                }
            }
        });
    },

    // --- Settings Management Methods (Admin only) ---
    async fetchQuestionBankSettings() {
      // Ensure this is only called/available if user is admin (check in main admin.js or here)
      if (this.userRole !== 'admin' && !this.isAdminUser) { // Assuming isAdminUser is a prop or computed property indicating admin
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

    // --- Combo Correction Methods ---
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
          questionName: sq.question.name, // For display
          questionImage: sq.question.imagePath, // For display
          answerImage: sq.answerImagePath, // For display
          isCorrect: null, // Default to null, admin must choose
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
        this.fetchSubmissionsForCorrection(); // Refresh list
      } catch (error) {
        this.sendNotification('error', 'خطا در ثبت تصحیح: ' + (error.response?.data?.message || error.message));
      } finally {
        this.setLoadingState(false);
      }
    },
    // Utility to get user role - this might be better as a computed property or passed as a prop
    // For now, it assumes `this.activeUserRole` is available from the main Vue instance if needed.
    // Or, it relies on the main app's session/role check for API calls.
    // The `isAdminUser` computed property in admin.js can be used for UI toggling.

    // Socket listeners for real-time updates (to be added in main admin.js or here if self-contained)
    handleSocketUpdates_QuestionBank() {
        window.socket.on('newQuestionAdded', (question) => {
            if (this.activeSection === 'question_bank_questions' || this.activeSection === 'question_bank_correction') { // Assuming these section keys
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
            if (this.activeSection === 'question_bank_settings') { // Assuming this section key
                this.questionBankSettings = settings;
            }
        });
        window.socket.on('newComboForCorrection', (combo) => {
            // This event is for admin/mentor panel
            if (this.activeSection === 'question_bank_correction') {
                 // Add to list if not already present (or refresh list)
                 this.fetchSubmissionsForCorrection();
            }
             // Potentially show a global notification for admins/mentors
            if (this.isAdminUser || this.isMentorUser) { // Assuming these computed props exist
                this.sendNotification('info', `یک کمبوی جدید با شناسه ${combo.id} برای تصحیح ارسال شد.`);
            }
        });
        window.socket.on('comboCorrectedAdmin', (combo) => { // Specific event for admin panel
            if (this.activeSection === 'question_bank_correction') {
                this.submissionsForCorrection = this.submissionsForCorrection.filter(s => s.id !== combo.id);
            }
        });
    }
  },
  // mounted() {
    // if (this.userRole === 'admin') this.fetchQuestionBankSettings(); // Fetch settings if admin
    // this.fetchQuestions();
    // this.fetchSubmissionsForCorrection();
    // this.handleSocketUpdates_QuestionBank();
  // }
  // The mounted hook logic will be better handled in the main admin.js
  // when this mixin is used, based on the active section.
};
