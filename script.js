let timers = [];
let sortOrder = 'asc'; // 정렬 기준

document.getElementById('setTimerBtn').onclick = addTimer;
document.getElementById('timerInput').onkeypress = function (event) {
    if (event.key === 'Enter') {
        addTimer();
    }
};

function addTimer() {
    const input = document.getElementById('timerInput');
    const timeInput = input.value;

    if (timeInput.length === 6) {
        const seconds = parseInt(timeInput.substr(0, 2)) * 3600 +
            parseInt(timeInput.substr(2, 2)) * 60 +
            parseInt(timeInput.substr(4, 2)) + 300; // 5분 추가

        const timerId = Date.now();
        const timer = { id: timerId, seconds: seconds, memo: '' };
        timers.push(timer);
        input.value = '';
        renderTimers();
        startTimer(timer); // 타이머 시작
    } else {
        alert("6자리 숫자를 입력해주세요.");
    }
}

function renderTimers() {
    const timersContainer = document.getElementById('timers');
    timersContainer.innerHTML = '';

    timers.forEach(timer => {
        const timerDiv = document.createElement('div');
        timerDiv.classList.add('timer-item');
        timerDiv.innerHTML = `
            <div class="timer-memo">
                <span id="timer-${timer.id}">${formatTime(timer.seconds)}</span>
                <input type="text" placeholder="메모" value="${timer.memo}" oninput="updateMemo(event, ${timer.id})">
            </div>
            <button onclick="deleteTimer(${timer.id})">삭제</button>
        `;
        timersContainer.appendChild(timerDiv);
    });
}

function startTimer(timer) {
    const updateTimer = () => {
        if (timer.seconds <= 0) {
            notifyUser(timer.memo);
            deleteTimer(timer.id);
        } else {
            timer.seconds--;
            const timerElement = document.getElementById(`timer-${timer.id}`);
            if (timerElement) {
                timerElement.innerText = formatTime(timer.seconds);
            }
            setTimeout(updateTimer, 1000); // 1초 후에 다시 호출
        }
    };
    updateTimer(); // 첫 호출
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function deleteTimer(timerId) {
    const timerIndex = timers.findIndex(timer => timer.id === timerId);
    if (timerIndex !== -1) {
        timers.splice(timerIndex, 1); // 타이머 삭제
        renderTimers();
    }
}

function updateMemo(event, timerId) {
    const memo = event.target.value;
    const timer = timers.find(t => t.id === timerId);
    if (timer) {
        timer.memo = memo; // 메모 업데이트
    }
}

document.getElementById('sortBtn').onclick = function () {
    // 정렬 기준에 따라 메모를 유지한 채로 정렬
    if (sortOrder === 'asc') {
        timers.sort((a, b) => a.seconds - b.seconds);
        sortOrder = 'desc';
    } else if (sortOrder === 'desc') {
        timers.sort((a, b) => b.seconds - a.seconds);
        sortOrder = 'input';
    } else {
        timers.sort((a, b) => a.id - b.id); // 입력 순서로 정렬
        sortOrder = 'asc';
    }
    renderTimers(); // 메모가 유지되도록 다시 렌더링
};

function notifyUser(memo) {
    const message = memo ? `${memo} 타이머 종료!` : '타이머 종료!';
    if (Notification.permission === "granted") {
        new Notification(message);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(message);
            }
        });
    }
}

// 알림 권한 요청
if (Notification.permission === "default") {
    Notification.requestPermission();
}
