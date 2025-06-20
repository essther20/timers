class TimerManager {
    constructor() {
        this.timers = {};
        this.timerIdCounter = 0;
        this.sortMode = 0; // 0: 등록순, 1: 남은 시간 짧은 순, 2: 남은 시간 긴 순
        this.sortStatusText = ["등록순", "오름차순", "내림차순"];
        this.worker = null;
        
        this.init();
    }
    
    init() {
        // 웹 워커 지원 확인
        if (!window.Worker) {
            alert('이 브라우저는 Web Worker를 지원하지 않습니다. 다른 브라우저를 사용해주세요.');
            return;
        }
        
        // 알림 권한 요청
        this.requestNotificationPermission();
        
        // 웹 워커 생성
        this.worker = createTimerWorker();
        this.setupWorkerMessageHandler();
    }
    
    requestNotificationPermission() {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
    setupWorkerMessageHandler() {
        this.worker.onmessage = (e) => {
            const data = e.data;
            
            if (data.type === 'updates') {
                data.updates.forEach(update => {
                    this.updateTimerDisplay(
                        update.id,
                        update.hours,
                        update.minutes,
                        update.seconds,
                        update.remainingMs
                    );
                    
                    if (update.expired && !this.timers[update.id].notified) {
                        this.timers[update.id].notified = true;
                        this.notifyTimerExpired(update.id);
                    }
                });
            } else if (data.type === 'expired') {
                data.ids.forEach(id => {
                    this.removeTimerFromUI(id);
                });
            }
        };
    }
    
    validateTimeInput(inputValue) {
        // 형식 검증
        if (!/^\d{6}$/.test(inputValue)) {
            throw new Error('여섯자리 숫자를 입력해주세요 (HHMMSS 형식)');
        }
        
        // 값 파싱
        const hours = parseInt(inputValue.substring(0, 2));
        const minutes = parseInt(inputValue.substring(2, 4));
        const seconds = parseInt(inputValue.substring(4, 6));
        
        // 범위 검증
        if (hours > 23 || minutes > 59 || seconds > 59) {
            throw new Error('유효한 시간을 입력해주세요 (시: 0-23, 분: 0-59, 초: 0-59)');
        }
        
        return { hours, minutes, seconds };
    }
    
    registerTimer(inputValue) {
        try {
            const { hours, minutes, seconds } = this.validateTimeInput(inputValue);
            
            // 타이머 ID 생성
            const timerId = this.timerIdCounter++;
            
            // 종료 시간 계산 (입력 시간 + 5분)
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + 5 * 60;
            const endTime = Date.now() + totalSeconds * 1000;
            
            // 타이머 객체 생성
            this.timers[timerId] = {
                originalHours: hours,
                originalMinutes: minutes,
                originalSeconds: seconds,
                endTime: endTime,
                notified: false,
                memo: ''
            };
            
            // 웹 워커에 타이머 추가
            this.worker.postMessage({
                type: 'add',
                id: timerId,
                endTime: endTime
            });
            
            // UI에 타이머 추가
            this.addTimerToUI(timerId, hours, minutes, seconds, totalSeconds * 1000);
            
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    }
    
    deleteTimer(id) {
        // 웹 워커에 타이머 삭제 메시지 전송
        this.worker.postMessage({
            type: 'remove',
            id: id
        });
        
        // UI에서 타이머 제거
        this.removeTimerFromUI(id);
        
        // 타이머 객체에서 삭제
        delete this.timers[id];
    }
    
    toggleSortMode() {
        this.sortMode = (this.sortMode + 1) % 3;
        const sortStatusElement = document.getElementById('sortStatus');
        sortStatusElement.textContent = this.sortStatusText[this.sortMode];
        this.sortTimers();
    }
    
    sortTimers() {
        const timersContainer = document.getElementById('timersContainer');
        const timerCards = Array.from(timersContainer.getElementsByClassName('timer-card'));
        
        if (this.sortMode === 0) {
            // 등록 순서 (id 기준)
            timerCards.sort((a, b) => {
                return parseInt(a.dataset.id) - parseInt(b.dataset.id);
            });
        } else if (this.sortMode === 1) {
            // 남은 시간 짧은 순
            timerCards.sort((a, b) => {
                return parseInt(a.dataset.remainingMs) - parseInt(b.dataset.remainingMs);
            });
        } else {
            // 남은 시간 긴 순
            timerCards.sort((a, b) => {
                return parseInt(b.dataset.remainingMs) - parseInt(a.dataset.remainingMs);
            });
        }
        
        // 재배치
        timerCards.forEach(card => {
            timersContainer.appendChild(card);
        });
    }
    
    addTimerToUI(id, hours, minutes, seconds, remainingMs) {
        const timersContainer = document.getElementById('timersContainer');
        
        // 5분 추가된 시작 시간 계산
        let startMinutes = minutes + 5;
        let startHours = hours;
        
        if (startMinutes >= 60) {
            startHours++;
            startMinutes -= 60;
        }
        
        const timerCard = document.createElement('div');
        timerCard.className = 'timer-card new';
        timerCard.dataset.id = id;
        timerCard.dataset.remainingMs = remainingMs;
        
        timerCard.innerHTML = `
            <button class="delete-btn" data-id="${id}">삭제</button>
            <div class="timer-display" id="timer-${id}">
                ${this.formatTime(startHours, startMinutes, seconds)}
            </div>
            <input type="text" class="timer-memo-input" id="memo-${id}" placeholder="타이머 메모 입력" data-id="${id}">
        `;
        
        timersContainer.prepend(timerCard);
        
        // 삭제 버튼 이벤트 리스너 추가
        timerCard.querySelector('.delete-btn').addEventListener('click', (e) => {
            const timerId = e.target.dataset.id;
            this.deleteTimer(timerId);
        });
        
        // 메모 입력 이벤트 리스너 추가
        timerCard.querySelector('.timer-memo-input').addEventListener('input', (e) => {
            const timerId = e.target.dataset.id;
            this.updateMemo(timerId, e.target.value);
        });
        
        // 애니메이션 클래스 제거
        setTimeout(() => {
            timerCard.classList.remove('new');
        }, 300);
        
        // 현재 정렬 모드에 따라 타이머 정렬
        if (this.sortMode !== 0) {
            this.sortTimers();
        }
    }
    
    removeTimerFromUI(id) {
        const timerCard = document.querySelector(`.timer-card[data-id="${id}"]`);
        if (timerCard) {
            timerCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            timerCard.style.opacity = '0';
            timerCard.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                timerCard.remove();
            }, 300);
        }
    }
    
    updateMemo(id, memo) {
        if (this.timers[id]) {
            this.timers[id].memo = memo;
        }
    }
    
    updateTimerDisplay(id, hours, minutes, seconds, remainingMs) {
        const timerElement = document.getElementById(`timer-${id}`);
        const timerCard = document.querySelector(`.timer-card[data-id="${id}"]`);
        
        if (timerElement && timerCard) {
            // 메모 입력 필드의 현재 포커스 상태와 선택 상태를 저장
            const memoInput = document.getElementById(`memo-${id}`);
            let isFocused = false;
            let selectionStart = 0;
            let selectionEnd = 0;
            
            if (memoInput && document.activeElement === memoInput) {
                isFocused = true;
                selectionStart = memoInput.selectionStart;
                selectionEnd = memoInput.selectionEnd;
            }
            
            // 타이머 시간 표시 업데이트
            timerElement.textContent = this.formatTime(hours, minutes, seconds);
            timerCard.dataset.remainingMs = remainingMs;
            
            // 만료된 타이머 스타일 적용
            if (remainingMs === 0) {
                timerCard.classList.add('expired');
            }
            
            // 포커스와 선택 상태 복원
            if (isFocused && memoInput) {
                memoInput.focus();
                memoInput.setSelectionRange(selectionStart, selectionEnd);
            }
            
            // 현재 정렬 모드에 따라 타이머 정렬
            if (this.sortMode !== 0) {
                this.sortTimers();
            }
        }
    }
    
    formatTime(hours, minutes, seconds) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    notifyTimerExpired(id) {
        if (Notification.permission === 'granted') {
            const timer = this.timers[id];
            const memo = timer.memo.trim() || `${this.formatTime(timer.originalHours, timer.originalMinutes, timer.originalSeconds)}+5분`;
            
            // 브라우저 알림 생성
            const notification = new Notification('타이머 종료!', {
                body: `${memo} 타이머가 종료되었습니다.`,
                icon: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678116-calendar-clock-512.png'
            });
            
            // 10초 후 알림 닫기
            setTimeout(() => {
                notification.close();
            }, 10000);
            
            // 알림 클릭 시 브라우저 포커스
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }
}