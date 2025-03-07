// Zmienne do przechowywania stanu timera
let sessionTimeLeft = 0;
let intervalTimeLeft = 0;
let intervalDuration = 0.5 * 60; // Domyślna wartość
let sessionDuration = 1 * 60; // Domyślna wartość

// Inicjalizacja zmiennych śledzących czas
let startTime = 0;
let isRunning = false;
let timerId = null;
let totalActiveTime = 0;
let totalPausedTime = 0;
let totalTimeCorrection = 0;

// Funkcja do wysyłania logów do głównego wątku
function workerLog(...args) {
    const message = args
        .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

    self.postMessage({
        type: "LOG",
        payload: message,
    });
}

// Funkcja do wysyłania aktualizacji stanu do głównego wątku
function sendStateUpdate(reason) {
    workerLog(`[WORKER][01] Sent update: ${reason}`);

    self.postMessage({
        type: "UPDATE",
        payload: {
            sessionTimeLeft,
            intervalTimeLeft,
            isRunning,
        },
    });
}

// Funkcja do wysyłania aktualizacji ustawień do głównego wątku
function sendSettingsUpdate(reason) {
    self.postMessage({
        type: "SETTINGS_UPDATE",
        payload: {
            sessionDuration,
            intervalDuration,
        },
    });

    workerLog(`[WORKER][02] Sent settings update: ${reason}`);
}

// Obsługa wiadomości od głównego wątku
self.onmessage = (e) => {
    const { type, payload } = e.data;
    workerLog(`[WORKER][03] Received message from MAIN: ${type}`);

    switch (type) {
        case "START":
            isRunning = true;
            if (!timerId) {
                startTimer();
            }
            sendStateUpdate("START command [04]");
            break;

        case "PAUSE":
            isRunning = false;
            sendStateUpdate("PAUSE command [05]");
            break;

        case "RESET":
            isRunning = false;
            sessionTimeLeft = sessionDuration;
            intervalTimeLeft = intervalDuration;
            stopReset();
            sendStateUpdate("RESET to INITIAL values [06]");
            break;

        case "UPDATE_SETTINGS":
            isRunning = false;
            if (payload) {
                if (payload.sessionDuration !== undefined) {
                    sessionDuration = payload.sessionDuration;
                }
                if (payload.intervalDuration !== undefined) {
                    intervalDuration = payload.intervalDuration;
                }
            }
            sessionTimeLeft = sessionDuration;
            intervalTimeLeft = intervalDuration;
            sendStateUpdate("UPDATE_SETTINGS command [07]");
            sendSettingsUpdate("UPDATE_SETTINGS command [08]");
            break;

        case "GET_INITIAL_SETTINGS":
            sendSettingsUpdate("GET_INITIAL_SETTINGS command [09]");
            sendStateUpdate("GET_INITIAL_SETTINGS command [10]");
            break;
    }
};

// Funkcja rozpoczynająca odliczanie
// Dokładność 1 sekunda
function startTimer() {
    workerLog("[WORKER][11] Starting timer");

    startTime = Date.now();
    isRunning = true;
    totalActiveTime = 1000;

    function tick() {
        let expectedTime = startTime + totalActiveTime + totalPausedTime;

        // Uaktualnij czas pauzy
        if (!isRunning) {
            totalPausedTime += 1000;
            scheduleNextTick(tick, calculateTimeCorrection(expectedTime));
            return;
        }

        // Sprawdź, czy sesja się zakończyła
        if (sessionTimeLeft === 0) {
            isRunning = false;
            workerLog("[WORKER][12] Session ended, timer stopped");
            return;
        }

        // Uaktualnij czas aktywny
        totalActiveTime += 1000;

        // Aktualizuj czas sesji
        sessionTimeLeft -= 1;

        // Oblicz czas interwału (z automatycznym resetowaniem)
        intervalTimeLeft === 1
            ? sessionTimeLeft === 0
                ? (intervalTimeLeft -= 1)
                : (intervalTimeLeft = intervalDuration)
            : (intervalTimeLeft -= 1);

        // Wyślij zaktualizowany stan do głównego wątku
        sendStateUpdate("tick [13]");

        scheduleNextTick(tick, calculateTimeCorrection(expectedTime));
    }
    scheduleNextTick(tick, 0);
}

function stopReset() {
    if (timerId) {
        clearTimeout(timerId); // Anuluj zaplanowany tick
        timerId = null;
    }

    startTime = 0;
    isRunning = false;
    totalActiveTime = 0;
    totalPausedTime = 0;
    totalTimeCorrection = 0;
    sessionTimeLeft = sessionDuration;
    intervalTimeLeft = intervalDuration;

    workerLog("[WORKER][14] Timer stopped and reset to initial values");
    sendStateUpdate("Prepare for next session");
}

function calculateTimeCorrection(expectedTime) {
    let timeCorrection = Date.now() - expectedTime;

    totalTimeCorrection += timeCorrection;

    let totalTicks = (totalActiveTime + totalPausedTime) / 1000;
    let averageTimeCorrection =
        totalTicks > 0 ? Math.floor(totalTimeCorrection / totalTicks) : 0;

    workerLog(
        `[WORKER][15] C: ${timeCorrection} ms, Total c: ${totalTimeCorrection}, Average c: ${averageTimeCorrection} | Active: ${
            totalActiveTime / 1000
        } | Paused: ${totalPausedTime / 1000}}`
    );

    return timeCorrection;
}

function scheduleNextTick(tick, timeCorrection) {
    timerId = setTimeout(tick, Math.max(50, 1000 - timeCorrection));
}

// Inicjalizacja workera
workerLog("[WORKER][16] Worker initialized with settings:", {
    sessionDuration,
    intervalDuration,
});
// Inicjalizacja początkowych wartości
sessionTimeLeft = sessionDuration;
intervalTimeLeft = intervalDuration;
