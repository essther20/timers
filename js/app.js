// app.js - 메인 애플리케이션 스크립트

class TimerApp {
    constructor() {
        this.timerManager = null;
        this.init();
    }
    
    init() {
        // DOM 로드 완료 확인
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // 타이머 매니저 초기화
        this.timerManager = new TimerManager();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 초기 UI 설정
        this.setupInitialUI();
    }
    
    setupEventListeners() {
        const timeInput = document.getElementById('timeInput');
        const registerBtn = document.getElementById('registerBtn');
        const sortBtn = document.getElementById('sortBtn');
        
        // 타이머 등록 버튼 클릭
        registerBtn.addEventListener('click', () => this.handleTimerRegistration());
        
        // Enter 키로 타이머 등록
        timeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleTimerRegistration();
            }
        });
        
        // 입력 필드 포맷팅
        timeInput.addEventListener('input', (e) => this.handleTimeInputFormatting(e));
        
        // 정렬 버튼 클릭
        sortBtn.addEventListener('click', () => {
            this.timerManager.toggleSortMode();
        });
        
        // 페이지 언로드 시 워커 정리
        window.addEventListener('beforeunload', () => {
            if (this.timerManager && this.timerManager.worker) {
                this.timerManager.worker.terminate();
            }
        });
    }
    
    setupInitialUI() {
        // 초기 포커스 설정
        const timeInput = document.getElementById('timeInput');
        if (timeInput) {
            timeInput.focus();
        }
    }
    
    handleTimerRegistration() {
        const timeInput = document.getElementById('timeInput');
        const inputValue = timeInput.value.trim();
        
        if (this.timerManager.registerTimer(inputValue)) {
            // 성공 시 입력 필드 초기화
            timeInput.value = '';
            timeInput.focus();
            
            // 성공 피드백 (선택사항)
            this.showSuccessMessage();
        }
    }
    
    handleTimeInputFormatting(e) {
        const input = e.target;
        let value = input.value.replace(/\D/g, ''); // 숫자만 남기기
        
        // 6자리로 제한
        if (value.length > 6) {
            value = value.substring(0, 6);
        }
        
        input.value = value;
    }
    
    showSuccessMessage() {
        // 간단한 성공 피드백
        const registerBtn = document.getElementById('registerBtn');
        const originalText = registerBtn.textContent;
        
        registerBtn.textContent = '등록됨!';
        registerBtn.style.backgroundColor = '#5cb85c';
        
        setTimeout(() => {
            registerBtn.textContent = originalText;
            registerBtn.style.backgroundColor = '';
        }, 1000);
    }
}

// 애플리케이션 시작
const app = new TimerApp();