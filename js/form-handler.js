// Конфигурация Google Sheets
const SPREADSHEET_ID = '1DXsuuP97PEVi2bk2JwTogWMRjzm_Y2LbhwmD8JgDs2Y';
const API_KEY = 'YOUR_GOOGLE_API_KEY'; // Нужно получить в Google Cloud Console
const RANGE = 'Sheet1!A:E';

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
        
        // Загружаем таблицу при инициализации
        this.loadParticipantsTable();
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
            phone: formData.get('phone').replace(/\D/g, ''),
            timestamp: new Date().toISOString()
        };
        
        // Валидация данных
        if (!this.validateData(participant)) {
            return;
        }
        
        this.setLoading(true);
        
        try {
            // Проверяем существующих участников
            const existingParticipants = await this.getParticipantsFromSheet();
            
            // Проверка на дубликат по номеру телефона
            const isDuplicate = existingParticipants.some(
                p => p.phone === participant.phone
            );
            
            if (isDuplicate) {
                this.showMessage('❌ Вы уже участвуете в розыгрыше!', 'error');
                return;
            }
            
            // Добавляем номер участника
            participant.participantNumber = existingParticipants.length + 1;
            
            // Сохраняем в Google Sheets
            const success = await this.saveToGoogleSheets(participant);
            
            if (success) {
                this.showMessage(`🎉 Вы успешно зарегистрированы под номером ${participant.participantNumber}!`, 'success');
                this.form.reset();
                await this.loadParticipantsTable();
            } else {
                this.showMessage('⚠️ Ошибка при сохранении данных. Попробуйте еще раз.', 'error');
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('🚫 Ошибка сети. Попробуйте еще раз.', 'error');
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
            '⏳ Регистрация...' : 
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
    
    // Получить данные из Google Sheets
    async getParticipantsFromSheet() {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }
            
            const data = await response.json();
            const rows = data.values || [];
            
            // Пропускаем заголовок и преобразуем в массив объектов
            return rows.slice(1).map((row, index) => ({
                participantNumber: parseInt(row[0]) || index + 1,
                fullName: row[1] || '',
                birthDate: row[2] || '',
                phone: row[3] || '',
                timestamp: row[4] || ''
            }));
            
        } catch (error) {
            console.error('Error loading from sheet:', error);
            return [];
        }
    }
    
    // Сохранить в Google Sheets
    async saveToGoogleSheets(participant) {
        try {
            // Для записи в Google Sheets через API нужна более сложная настройка
            // Временно сохраняем в localStorage и обновляем таблицу вручную
            await this.saveToLocalStorage(participant);
            return true;
            
        } catch (error) {
            console.error('Error saving to sheet:', error);
            return false;
        }
    }
    
    // Временное решение: сохраняем в localStorage
    async saveToLocalStorage(participant) {
        try {
            const existing = await this.getLocalParticipants();
            const updated = [...existing, participant];
            localStorage.setItem('raffleParticipants', JSON.stringify(updated));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }
    
    // Получить данные из localStorage
    async getLocalParticipants() {
        try {
            const stored = localStorage.getItem('raffleParticipants');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }
    
    // Загрузка таблицы участников
    async loadParticipantsTable() {
        try {
            let participants = await this.getParticipantsFromSheet();
            
            // Если не удалось загрузить из Sheets, используем localStorage
            if (participants.length === 0) {
                participants = await this.getLocalParticipants();
            }
            
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
                    <td><strong>${participant.participantNumber}</strong></td>
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
    
    // Экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Форматирование даты
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ru-RU');
    }
    
    // Форматирование даты и времени
    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Форматирование телефона для отображения
    formatPhoneDisplay(phone) {
        const numbers = phone.replace(/\D/g, '');
        if (numbers.length === 11) {
            return `+7 (${numbers.substring(1, 4)}) ${numbers.substring(4, 7)}-${numbers.substring(7, 9)}-${numbers.substring(9, 11)}`;
        }
        return phone;
    }
}

// Создаем глобальный экземпляр
const raffleForm = new RaffleForm();
