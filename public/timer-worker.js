// Zmienne do przechowywania stanu timera
let isRunning = false;
let sessionTimeLeft = 0;
let intervalTimeLeft = 0;
let timerId = null;
let intervalDuration = 5 * 60; // Domyślna wartość
let sessionDuration = 30 * 60; // Domyślna wartość

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
            clearInterval(timerId);
            timerId = null;
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

    // Inicjalizacja zmiennych śledzących czas
    const startTime = Date.now();
    let totalActiveTime = 0;
    let totalPausedTime = 0;
    let totalTimeCorrection = 0;
    let timeCorrection = 0;

    timerId = setInterval(() => {
        // Uaktualnij czas pauzy
        if (!isRunning) {
            totalPausedTime += 1000;
            workerLog(
                `[WORKER][12] Timer paused, total pause: ${
                    totalPausedTime / 1000
                } sec.`
            );

            // Oblicz korektę czasu
            timeCorrection =
                Date.now() -
                (startTime + totalActiveTime + totalPausedTime) -
                totalTimeCorrection;
            workerLog(`[WORKER][13] Time correction: ${timeCorrection} ms`);

            totalTimeCorrection += timeCorrection;
            workerLog(
                `[WORKER][14] Total time correction: ${totalTimeCorrection} ms`
            );

            return;
        }

        // Uaktualnij czas aktywny
        totalActiveTime += 1000;

        // Oblicz korektę czasu
        timeCorrection =
            Date.now() -
            (startTime + totalActiveTime + totalPausedTime) -
            totalTimeCorrection;
        workerLog(`[WORKER][13] Time correction: ${timeCorrection} ms`);

        totalTimeCorrection += timeCorrection;
        workerLog(
            `[WORKER][14] Total time correction: ${totalTimeCorrection} ms`
        );

        // Aktualizuj czas sesji
        const totalActiveSeconds = totalActiveTime / 1000;
        sessionTimeLeft = sessionDuration - totalActiveSeconds;

        // Oblicz czas interwału (z automatycznym resetowaniem)
        const intervalElapsedSeconds = totalActiveSeconds % intervalDuration;
        intervalTimeLeft = intervalDuration - intervalElapsedSeconds;

        // Sprawdź, czy sesja się zakończyła
        if (sessionTimeLeft <= 0) {
            isRunning = false;
            workerLog("[WORKER][15] Session ended, stopping timer");
        }

        // Wyślij zaktualizowany stan do głównego wątku
        sendStateUpdate("tick [16]");
    }, 1000 - timeCorrection);
}

// Inicjalizacja workera
workerLog("[WORKER][17] Worker initialized with settings:", {
    sessionDuration,
    intervalDuration,
});
// Inicjalizacja początkowych wartości
sessionTimeLeft = sessionDuration;
intervalTimeLeft = intervalDuration;
