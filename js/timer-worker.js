function createTimerWorker() {
    const workerCode = `
        // 타이머 데이터 저장
        let timers = {};
        
        // 1초마다 타이머 업데이트
        setInterval(() => {
            const now = Date.now();
            let updates = [];
            let toRemove = [];
            
            for (const id in timers) {
                const timer = timers[id];
                const remainingMs = Math.max(0, timer.endTime - now);
                
                if (remainingMs === 0 && !timer.notified) {
                    timer.notified = true;
                    updates.push({
                        id,
                        hours: 0,
                        minutes: 0,
                        seconds: 0,
                        remainingMs: 0,
                        expired: true
                    });
                    toRemove.push(id);
                } else if (!timer.notified) {
                    const totalSeconds = Math.floor(remainingMs / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    
                    updates.push({
                        id,
                        hours,
                        minutes,
                        seconds,
                        remainingMs,
                        expired: false
                    });
                }
            }
            
            if (updates.length > 0) {
                postMessage({ type: 'updates', updates });
            }
            
            if (toRemove.length > 0) {
                postMessage({ type: 'expired', ids: toRemove });
            }
        }, 1000);
        
        // 메인 스레드에서 메시지 수신
        onmessage = (e) => {
            const data = e.data;
            
            if (data.type === 'add') {
                timers[data.id] = {
                    endTime: data.endTime,
                    notified: false
                };
            } else if (data.type === 'remove') {
                delete timers[data.id];
            }
        };
    `;
    
    return new Worker(
        URL.createObjectURL(
            new Blob([workerCode], { type: 'application/javascript' })
        )
    );
}