// Главный класс для управления формой
class RaffleForm {
    constructor() {
        this.form = document.getElementById('raffleForm');
        this.messageDiv = document.getElementById('message');
        this.submitBtn = this.form.querySelector('.submit-btn');
        
        // URL вашей Google Forms (просто вставьте ссылку на форму)
        this.googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfT5rz1pJCS1tlPkT26-gtJ_BIK92m65oivdSuWZHBNtW4jKA/viewform';
        
        this.init();
    }
    
    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Маска для телефона
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', (e) => this.formatPhone(e.target));
    }
    
    // Форматирование номера телефона
    formatPhone(input) {
        let numbers = input.value.replace(/\D/g, '');
        
        if (numbers.startsWith('7') || numbers.startsWith('8')) {
            numbers = '7' + numbers.substring(1);
        } else if (numbers.startsWith('9')) {
            numbers = '7' + numbers;
        }
        
        if (numbers.length > 0) {
            let formatted = '+7 ';
            if (numbers.length > 1) {
                formatted += '(' + numbers.substring(1, 4);
            }
            if (numbers.length >= 4) {
                formatted += ') ' + numbers.substring(4, 7);
            }
            if (numbers.length >= 7) {
                formatted += '-' + numbers.substring(7, 9);
            }
            if (numbers.length >= 9) {
                formatted += '-' + numbers.substring(9, 11);
            }
            input.value = formatted;
        }
    }
    
    // Обработка отправки формы
    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const participant = {
            fullName: formData.get('fullName').trim(),
            birthDate: formData.get('birthDate'),
            phone: formData.get('phone').replace(/\D/g, '')
        };
        
        // Валидация данных
        if (!this.validateData(participant)) {
            return;
        }
        
        this.setLoading(true);
        
        try {
            // Просто открываем чистую Google Forms
            // Пользователь сам заполнит данные
            window.open(this.googleFormUrl, '_blank');
            
            this.showMessage('🎉 Форма открыта! Заполните данные и нажмите "Отправить".', 'success');
            this.form.reset();
            
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('🚫 Ошибка. Попробуйте еще раз.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    // Валидация данных
    validateData(participant) {
        if (participant.fullName.length < 2) {
            this.showMessage('✏️ Введите корректное ФИО', 'error');
            return false;
        }
        
        if (!participant.birthDate) {
            this.showMessage('📅 Введите дату рождения', 'error');
            return false;
        }
        
        // Проверка возраста (старше 13 лет)
        const birthDate = new Date(participant.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age < 13) {
            this.showMessage('🔞 Для участия в розыгрыше необходимо быть старше 13 лет', 'error');
            return false;
        }
        
        if (participant.phone.length !== 11) {
            this.showMessage('📱 Введите корректный номер телефона', 'error');
            return false;
        }
        
        return true;
    }
    
    // Установка состояния загрузки
    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.submitBtn.textContent = loading ? 
            '⏳ Открываем форму...' : 
            '🎯 УЧАСТВОВАТЬ В РОЗЫГРЫШЕ';
    }
    
    // Показать сообщение
    showMessage(text, type) {
        this.messageDiv.textContent = text;
        this.messageDiv.className = `message ${type}`;
        this.messageDiv.style.display = 'block';
        
        setTimeout(() => {
            this.messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Инициализация формы
document.addEventListener('DOMContentLoaded', function() {
    new RaffleForm();
});
