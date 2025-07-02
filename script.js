class SecureSchedulePlanner {
    constructor() {
        this.events = [];
        this.isViewMode = false;
        this.currentEditingEvent = null;
        this.ownerName = 'My';
        this.password = "mysecret123"; // Default password - change this!
        this.hasPasswordAccess = false;
        
        // Initialize password modal first
        this.initPasswordModal();
        
        // Set up event listeners that will work after password verification
        document.addEventListener('passwordVerified', () => {
            this.init();
            this.loadFromURL();
        });
    }

    initPasswordModal() {
        const modal = document.getElementById('passwordModal');
        modal.style.display = 'block';
        
        document.getElementById('submitPassword').addEventListener('click', () => {
            const enteredPassword = document.getElementById('passwordInput').value;
            const warning = document.getElementById('passwordWarning');
            
            if (enteredPassword === this.password) {
                // Correct password - grant full access
                this.hasPasswordAccess = true;
                modal.style.display = 'none';
                document.getElementById('app').style.display = 'block';
                
                // Dispatch event to continue initialization
                document.dispatchEvent(new Event('passwordVerified'));
                
                this.showNotification("Welcome! You have edit access.");
            } else if (enteredPassword === "") {
                // No password - view only mode
                this.hasPasswordAccess = false;
                this.isViewMode = true;
                modal.style.display = 'none';
                document.getElementById('app').style.display = 'block';
                
                // Hide controls and show view-only mode
                document.getElementById('app').classList.add('view-only');
                document.getElementById('modeToggle').style.display = 'none';
                
                // Dispatch event to continue initialization
                document.dispatchEvent(new Event('passwordVerified'));
                
                this.showNotification("View-only mode activated");
            } else {
                // Wrong password
                warning.style.display = 'block';
                setTimeout(() => {
                    warning.style.display = 'none';
                }, 3000);
            }
        });
    }

    init() {
        this.generateTimeSlots();
        this.bindEvents();
        this.loadFromStorage();
    }

    generateTimeSlots() {
    const currentWeekContainer = document.getElementById('currentWeekRows');
    const nextWeekContainer = document.getElementById('nextWeekRows');
    currentWeekContainer.innerHTML = '';
    nextWeekContainer.innerHTML = '';
    
    // Generate from 6 AM to 11 PM (12-hour format)
    for (let hour = 6; hour < 24; hour++) {
        // Current week row
        const currentWeekRow = document.createElement('div');
        currentWeekRow.className = 'schedule-row';
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = this.formatTime12Hour(hour);
        currentWeekRow.appendChild(timeLabel);
        
        // Next week row
        const nextWeekRow = document.createElement('div');
        nextWeekRow.className = 'schedule-row';
        nextWeekRow.appendChild(timeLabel.cloneNode(true));
        
        // Generate slots for current week (days 0-6)
        for (let day = 0; day < 7; day++) {
            const currentSlot = document.createElement('div');
            currentSlot.className = 'time-slot';
            currentSlot.dataset.day = day;
            currentSlot.dataset.hour = hour;
            currentSlot.dataset.week = 'current';
            currentWeekRow.appendChild(currentSlot);
            
            const nextSlot = document.createElement('div');
            nextSlot.className = 'time-slot';
            nextSlot.dataset.day = day + 7; // Next week days are 7-13
            nextSlot.dataset.hour = hour;
            nextSlot.dataset.week = 'next';
            nextWeekRow.appendChild(nextSlot);
        }
        
        currentWeekContainer.appendChild(currentWeekRow);
        nextWeekContainer.appendChild(nextWeekRow);
    }
}

    bindEvents() {
        document.getElementById('addEvent').addEventListener('click', () => this.addEvent());
        document.getElementById('modeToggle').addEventListener('click', () => this.toggleMode());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAllEvents());
        document.getElementById('exportData').addEventListener('click', () => this.exportSchedule());
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importData').click());
        document.getElementById('importData').addEventListener('change', (e) => this.importSchedule(e));
        document.getElementById('ownerName').addEventListener('input', (e) => this.updateOwnerName(e.target.value));
        document.getElementById('changePassword').addEventListener('click', () => this.showPasswordChangeModal());
        
        // Modal events
        document.getElementById('saveEvent').addEventListener('click', () => this.saveEventEdit());
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeModal());
        document.getElementById('deleteEvent').addEventListener('click', () => this.deleteEventFromModal());
        
        // Close modal when clicking outside
        document.getElementById('eventModal').addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') this.closeModal();
        });
        
        // Time slot clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('time-slot') && !this.isViewMode && this.hasPasswordAccess) {
                this.handleTimeSlotClick(e.target);
            }
            if (e.target.classList.contains('event') && !this.isViewMode && this.hasPasswordAccess) {
                this.editEvent(e.target.dataset.eventId);
            }
            if (e.target.classList.contains('delete-event')) {
                e.stopPropagation();
                this.deleteEvent(e.target.dataset.eventId);
            }
        });
    }

    showPasswordChangeModal() {
        if (!this.hasPasswordAccess) return;
        
        const modal = document.getElementById('passwordChangeModal');
        modal.style.display = 'block';
        
        document.getElementById('cancelPasswordChange').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        document.getElementById('saveNewPassword').addEventListener('click', () => {
            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmNewPassword').value;
            const warning = document.getElementById('passwordChangeWarning');
            
            if (current !== this.password) {
                warning.textContent = "Current password is incorrect";
                warning.style.display = 'block';
                return;
            }
            
            if (newPass !== confirm) {
                warning.textContent = "New passwords don't match";
                warning.style.display = 'block';
                return;
            }
            
            if (newPass.length < 4) {
                warning.textContent = "Password must be at least 4 characters";
                warning.style.display = 'block';
                return;
            }
            
            this.password = newPass;
            modal.style.display = 'none';
            this.showNotification("Password changed successfully");
        });
    }

    addEvent() {
        if (!this.hasPasswordAccess) return;
        
        const title = document.getElementById('eventTitle').value;
        const date = document.getElementById('eventDate').value;
        const startTime = document.getElementById('eventStartTime').value;
        const endTime = document.getElementById('eventEndTime').value;
        const color = document.getElementById('eventColor').value;
        
        if (!title || !date || !startTime || !endTime) {
            alert('Please fill in all fields');
            return;
        }
        
        if (startTime >= endTime) {
            alert('End time must be after start time');
            return;
        }
        
        const event = {
            id: Date.now().toString(),
            title,
            date,
            startTime,
            endTime,
            color,
            description: ''
        };
        
        this.events.push(event);
        this.renderEvents();
        this.saveToStorage();
        this.clearForm();
    }

    handleTimeSlotClick(slot) {
    if (!this.hasPasswordAccess) return;
    
    const dayInWeek = parseInt(slot.dataset.day);
    const week = slot.dataset.week;
    const hour = parseInt(slot.dataset.hour);
    
    // Calculate the date based on which week was clicked
    const today = new Date();
    const targetDate = new Date(today);
    const daysToAdd = week === 'current' ? dayInWeek : dayInWeek + 7;
    targetDate.setDate(today.getDate() + daysToAdd);
    
    document.getElementById('eventDate').value = targetDate.toISOString().split('T')[0];
    document.getElementById('eventStartTime').value = `${hour.toString().padStart(2, '0')}:00`;
    document.getElementById('eventEndTime').value = `${(hour + 1).toString().padStart(2, '0')}:00`;
    document.getElementById('eventTitle').focus();
}

    editEvent(eventId) {
        if (!this.hasPasswordAccess) return;
        
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        this.currentEditingEvent = event;
        
        document.getElementById('modalEventTitle').value = event.title;
        document.getElementById('modalEventDescription').value = event.description || '';
        document.getElementById('modalEventDate').value = event.date;
        document.getElementById('modalEventStartTime').value = event.startTime;
        document.getElementById('modalEventEndTime').value = event.endTime;
        document.getElementById('modalEventColor').value = event.color || '#3498db';
        
        document.getElementById('eventModal').style.display = 'block';
    }

    saveEventEdit() {
        if (!this.currentEditingEvent || !this.hasPasswordAccess) return;
        
        const startTime = document.getElementById('modalEventStartTime').value;
        const endTime = document.getElementById('modalEventEndTime').value;
        
        if (startTime >= endTime) {
            alert('End time must be after start time');
            return;
        }
        
        this.currentEditingEvent.title = document.getElementById('modalEventTitle').value;
        this.currentEditingEvent.description = document.getElementById('modalEventDescription').value;
        this.currentEditingEvent.date = document.getElementById('modalEventDate').value;
        this.currentEditingEvent.startTime = startTime;
        this.currentEditingEvent.endTime = endTime;
        this.currentEditingEvent.color = document.getElementById('modalEventColor').value;
        
        this.renderEvents();
        this.saveToStorage();
        this.closeModal();
    }

    deleteEvent(eventId) {
        if (!this.hasPasswordAccess) return;
        
        this.events = this.events.filter(e => e.id !== eventId);
        this.renderEvents();
        this.saveToStorage();
    }

    deleteEventFromModal() {
        if (this.currentEditingEvent && this.hasPasswordAccess) {
            this.deleteEvent(this.currentEditingEvent.id);
            this.closeModal();
        }
    }

    closeModal() {
        document.getElementById('eventModal').style.display = 'none';
        document.getElementById('passwordChangeModal').style.display = 'none';
        this.currentEditingEvent = null;
    }

    formatTime12Hour(hour) {
        if (hour === 0) return '12:00 AM';
        if (hour === 12) return '12:00 PM';
        if (hour < 12) return `${hour}:00 AM`;
        return `${hour - 12}:00 PM`;
    }

    formatTime12HourFromString(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const minute = minutes;
        
        if (hour === 0) return `12:${minute} AM`;
        if (hour === 12) return `12:${minute} PM`;
        if (hour < 12) return `${hour}:${minute} AM`;
        return `${hour - 12}:${minute} PM`;
    }

    calculateEventDuration(startTime, endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const diffMs = end - start;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours < 1) {
            const minutes = Math.round(diffHours * 60);
            return `${minutes}min`;
        } else if (diffHours === 1) {
            return '1hr';
        } else {
            const hours = Math.floor(diffHours);
            const minutes = Math.round((diffHours - hours) * 60);
            return minutes > 0 ? `${hours}hr ${minutes}min` : `${hours}hr`;
        }
    }

    renderEvents() {
    // Clear existing events and reset time slots
    document.querySelectorAll('.event').forEach(el => el.remove());
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('has-event');
        slot.style.backgroundColor = '';
    });
    
    this.events.forEach(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        const daysDiff = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
        
        // Skip events that are more than 14 days in the future or in the past
        if (daysDiff < 0 || daysDiff > 13) return;
        
        const startHour = parseInt(event.startTime.split(':')[0]);
        const startMinute = parseInt(event.startTime.split(':')[1]);
        const endHour = parseInt(event.endTime.split(':')[0]);
        const endMinute = parseInt(event.endTime.split(':')[1]);
        
        // Calculate duration in hours
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const durationMinutes = endTotalMinutes - startTotalMinutes;
        const durationHours = durationMinutes / 60;
        
        // Find the starting slot
        const weekPrefix = daysDiff < 7 ? 'current' : 'next';
        const dayInWeek = daysDiff % 7;
        const startSlot = document.querySelector(`[data-week="${weekPrefix}"][data-day="${dayInWeek}"][data-hour="${startHour}"]`);
        
        if (startSlot) {
            const eventEl = document.createElement('div');
            eventEl.className = 'event';
            if (durationHours > 1) {
                eventEl.classList.add('multi-hour');
            }
            eventEl.dataset.eventId = event.id;
            eventEl.style.backgroundColor = event.color || '#3498db';
            
            // Calculate height based on duration
            const slotHeight = 60;
            const eventHeight = Math.max(slotHeight * durationHours - 4, 56);
            eventEl.style.height = `${eventHeight}px`;
            
            // Add duration display
            const duration = this.calculateEventDuration(event.startTime, event.endTime);
            
            eventEl.innerHTML = `
                <div class="event-title">${event.title}</div>
                <div class="event-time">${this.formatTime12HourFromString(event.startTime)} - ${this.formatTime12HourFromString(event.endTime)}</div>
                <div class="event-duration">${duration}</div>
                ${this.hasPasswordAccess && !this.isViewMode ? `<button class="delete-event" data-event-id="${event.id}">×</button>` : ''}
            `;
            
            startSlot.appendChild(eventEl);
            
            // Mark affected time slots
            const affectedHours = Math.ceil(durationHours);
            for (let h = 0; h < affectedHours; h++) {
                const affectedSlot = document.querySelector(`[data-week="${weekPrefix}"][data-day="${dayInWeek}"][data-hour="${startHour + h}"]`);
                if (affectedSlot) {
                    affectedSlot.classList.add('has-event');
                    const eventColor = event.color || '#3498db';
                    affectedSlot.style.backgroundColor = this.hexToRgba(eventColor, 0.1);
                }
            }
        }
    });
}

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    toggleMode() {
        if (!this.hasPasswordAccess) return;
        
        this.isViewMode = !this.isViewMode;
        const app = document.getElementById('app');
        const toggle = document.getElementById('modeToggle');
        
        if (this.isViewMode) {
            app.classList.add('view-only');
            toggle.textContent = 'Switch to Edit Mode';
        } else {
            app.classList.remove('view-only');
            toggle.textContent = 'Switch to View Mode';
        }
        
        this.renderEvents();
    }

    clearAllEvents() {
        if (!this.hasPasswordAccess) return;
        
        if (confirm('Are you sure you want to clear all events?')) {
            this.events = [];
            this.renderEvents();
            this.saveToStorage();
        }
    }

    clearForm() {
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventStartTime').value = '';
        document.getElementById('eventEndTime').value = '';
        document.getElementById('eventColor').value = '#3498db';
    }

    updateOwnerName(name) {
        this.ownerName = name || 'My';
        document.querySelector('.header h1').textContent = `${this.ownerName}'s Secure Schedule`;
        this.saveToStorage();
    }

    exportSchedule() {
        if (!this.hasPasswordAccess) return;
        
        const data = {
            events: this.events,
            ownerName: this.ownerName,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schedule-${this.ownerName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importSchedule(event) {
        if (!this.hasPasswordAccess) return;
        
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.events && Array.isArray(data.events)) {
                    this.events = data.events;
                    this.ownerName = data.ownerName || 'My';
                    
                    document.querySelector('.header h1').textContent = `${this.ownerName}'s Secure Schedule`;
                    document.getElementById('ownerName').value = this.ownerName === 'My' ? '' : this.ownerName;
                    
                    this.renderEvents();
                    this.saveToStorage();
                    this.showNotification('Schedule imported successfully!');
                } else {
                    alert('Invalid schedule file format');
                }
            } catch (error) {
                alert('Error reading schedule file');
            }
        };
        reader.readAsText(file);
    }

    async loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const dataFile = urlParams.get('data');
        
        if (dataFile) {
            try {
                // Try to fetch the JSON file from the same directory
                const response = await fetch(dataFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.events && Array.isArray(data.events)) {
                        this.events = data.events;
                        this.ownerName = data.ownerName || 'My';
                        
                        document.querySelector('.header h1').textContent = `${this.ownerName}'s Secure Schedule`;
                        document.getElementById('ownerName').value = this.ownerName === 'My' ? '' : this.ownerName;
                        
                        // Auto-switch to view mode when loading from URL
                        this.isViewMode = true;
                        const app = document.getElementById('app');
                        const toggle = document.getElementById('modeToggle');
                        app.classList.add('view-only');
                        toggle.style.display = 'none';
                        
                        this.renderEvents();
                        
                        this.showNotification(`Loaded ${this.ownerName}'s schedule in view-only mode`);
                    }
                } else {
                    console.warn('Could not load schedule data from URL');
                }
            } catch (error) {
                console.warn('Error loading schedule data from URL:', error);
            }
        }
    }

    saveToStorage() {
        const data = {
            events: this.events,
            ownerName: this.ownerName,
            password: this.password // Note: Storing passwords in localStorage isn't secure for production
        };
        localStorage.setItem('secureScheduleData', JSON.stringify(data));
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('secureScheduleData');
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.events && Array.isArray(parsed.events)) {
                    this.events = parsed.events;
                    this.ownerName = parsed.ownerName || 'My';
                    this.password = parsed.password || "mysecret123"; // Default fallback
                    
                    document.querySelector('.header h1').textContent = `${this.ownerName}'s Secure Schedule`;
                    document.getElementById('ownerName').value = this.ownerName === 'My' ? '' : this.ownerName;
                    
                    this.renderEvents();
                }
            }
        } catch (error) {
            console.warn('Error loading from storage:', error);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the schedule planner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SecureSchedulePlanner();
});