// Конфигурация
const GITHUB_USERNAME = 'YOUR_USERNAME'; // Замените на ваш GitHub username
const REPO_NAME = 'YOUR_REPO_NAME'; // Замените на название репозитория
const DATA_FILE = 'data/participants.json';

class RaffleForm {
    constructor() {
        this.form = document.getElementById('registrationForm');
        this.messageDiv = document.getElementById('message');
        this.submitBtn = document.getElementById('submitBtn');
        this.participantsBody = document.getElementById('participantsBody');
        
        this.init();
    }
    
    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Маска для телефона
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', (e) => this.formatPhone(e.target));
    }
    
    formatPhone(input) {
        // Оставляем только цифры
        let numbers = input.value.replace(/\D/g, '');
        
        // Форматируем номер
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
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const participant = {
            fullName: formData.get('fullName').trim(),
            birthDate: formData.get('birthDate'),
            phone: formData.get('phone').replace(/\D/g, ''), // Сохраняем только цифры
            timestamp: new Date().toISOString(),
            id: Date.now() // Уникальный ID
        };
        
        // Валидация
        if (!this.validateData(participant)) {
            return;
        }
        
        this.setLoading(true);
        
        try {
            // Проверяем существующих участников
            const existingParticipants = await this.loadParticipants();
            
            // Проверка на дубликат по номеру телефона
            const isDuplicate = existingParticipants.some(
                p => p.phone === participant.phone
            );
            
            if (isDuplicate) {
                this.showMessage('Вы уже участвуете в розыгрыше!', 'error');
                return;
            }
            
            // Добавляем номер участника
            participant.participantNumber = existingParticipants.length + 1;
            
            // Сохраняем данные
            const success = await this.saveParticipant(participant);
            
            if (success) {
                this.showMessage(`🎉 Вы успешно зарегистрированы под номером ${participant.participantNumber}!`, 'success');
                this.form.reset();
                await this.loadParticipantsTable(); // Обновляем таблицу
            } else {
                this.showMessage('Ошибка при сохранении данных. Попробуйте еще раз.', 'error');
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Ошибка сети. Попробуйте еще раз.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    validateData(participant) {
        if (participant.fullName.length < 2) {
            this.showMessage('Введите корректное ФИО', 'error');
            return false;
        }
        
        if (!participant.birthDate) {
            this.showMessage('Введите дату рождения', 'error');
            return false;
        }
        
        // Проверка возраста (например, старше 13 лет)
        const birthDate = new Date(participant.birthDate);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        if (age < 13) {
            this.showMessage('Для участия в розыгрыше необходимо быть старше 13 лет', 'error');
            return false;
        }
        
        if (participant.phone.length !== 11) {
            this.showMessage('Введите корректный номер телефона', 'error');
            return false;
        }
        
        return true;
    }
    
    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.submitBtn.textContent = loading ? 
            '⏳ Регистрация...' : 
            '🎯 УЧАСТВОВАТЬ В РОЗЫГРЫШЕ';
    }
    
    showMessage(text, type) {
        this.messageDiv.textContent = text;
        this.messageDiv.className = `message ${type}`;
        this.messageDiv.style.display = 'block';
        
        setTimeout(() => {
            this.messageDiv.style.display = 'none';
        }, 5000);
    }
    
    async loadParticipants() {
        try {
            // В реальном приложении здесь будет запрос к GitHub API
            // Для демо используем localStorage
            const stored = localStorage.getItem('raffleParticipants');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading participants:', error);
            return [];
        }
    }
    
    async saveParticipant(participant) {
        try {
            const existing = await this.loadParticipants();
            const updated = [...existing, participant];
            
            // Сохраняем в localStorage для демо
            localStorage.setItem('raffleParticipants', JSON.stringify(updated));
            
            // В реальном приложении здесь будет отправка через GitHub Actions
            console.log('Participant saved:', participant);
            
            return true;
        } catch (error) {
            console.error('Error saving participant:', error);
            return false;
        }
    }
    
    async loadParticipantsTable() {
        try {
            const participants = await this.loadParticipants();
            
            if (participants.length === 0) {
                this.participantsBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 2rem;">
                            Пока нет участников. Будьте первым!
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Сортируем по дате регистрации (новые сверху)
            const sorted = participants.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            this.participantsBody.innerHTML = sorted.map(participant => `
                <tr>
                    <td>${participant.participantNumber}</td>
                    <td>${this.escapeHtml(participant.fullName)}</td>
                    <td>${this.formatDate(participant.birthDate)}</td>
                    <td>${this.formatPhoneDisplay(participant.phone)}</td>
                    <td>${this.formatDateTime(participant.timestamp)}</td>
                </tr>
            `).join('');
            
        } catch (error) {
            console.error('Error loading table:', error);
            this.participantsBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #e23239;">
                        Ошибка загрузки данных
                    </td>
                </tr>
            `;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ru-RU');
    }
    
    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('ru-RU');
    }
    
    formatPhoneDisplay(phone) {
        const numbers = phone.replace(/\D/g, '');
        if (numbers.length === 11) {
            return `+7 (${numbers.substring(1, 4)}) ${numbers.substring(4, 7)}-${numbers.substring(7, 9)}-${numbers.substring(9, 11)}`;
        }
        return phone;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    new RaffleForm();
});
