// Importuj skrypt storage-service.js
importScripts("./storage-settings-service.js");

// Zmienne do przechowywania stanu timera
let sessionTimeLeft = 0;
let intervalTimeLeft = 0;
let sessionDuration = 0;
let intervalDuration = 0;

// Inicjalizacja zmiennych śledzących czas
let startTime = 0;
let isRunning = false;
let timerId = null;
let totalActiveTime = 0;
let totalPausedTime = 0;
let totalTimeCorrection = 0;

// Flaga wskazująca, czy ustawienia zostały już załadowane
let settingsLoaded = false;

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

// Inicjalizacja StorageService z funkcją logowania
self.StorageService.setLogFunction(workerLog);

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

// Funkcja do inicjalizacji workera
async function initializeWorker() {
    try {
        // Pobierz ustawienia z StorageService
        const settings = await self.StorageService.initializeTimerSettings();

        // Aktualizuj zmienne workera
        sessionDuration = settings.sessionDuration;
        intervalDuration = settings.intervalDuration;
        sessionTimeLeft = settings.sessionTimeLeft;
        intervalTimeLeft = settings.intervalTimeLeft;

        // Wyślij aktualizację ustawień i stanu
        sendSettingsUpdate("Worker initialized with settings [03]");
        sendStateUpdate("Worker initialized with timer state [04]");

        settingsLoaded = true;
    } catch (error) {
        workerLog("[WORKER][05] Error initializing worker:", error);
        settingsLoaded = true;
    }
}

// Obsługa wiadomości od głównego wątku
self.onmessage = async (e) => {
    const { type, payload } = e.data;
    workerLog(`[WORKER][06] Received message from MAIN: ${type}`);

    switch (type) {
        case "START":
            isRunning = true;
            if (!timerId) {
                startTimer();
            }
            sendStateUpdate("START command [07]");
            break;

        case "PAUSE":
            isRunning = false;
            sendStateUpdate("PAUSE command [08]");
            break;

        case "RESET":
            isRunning = false;
            // Zresetuj timer do wartości z ustawień
            sessionTimeLeft = sessionDuration;
            intervalTimeLeft = intervalDuration;
            stopReset();
            sendStateUpdate("RESET to INITIAL values [09]");
            break;

        case "UPDATE_SETTINGS":
            isRunning = false;
            if (payload) {
                try {
                    // Aktualizuj ustawienia w StorageService
                    const settings =
                        await self.StorageService.updateTimerSettings(
                            payload.sessionDuration !== undefined
                                ? payload.sessionDuration
                                : sessionDuration,
                            payload.intervalDuration !== undefined
                                ? payload.intervalDuration
                                : intervalDuration
                        );

                    // Aktualizuj zmienne workera
                    sessionDuration = settings.sessionDuration;
                    intervalDuration = settings.intervalDuration;
                    sessionTimeLeft = settings.sessionTimeLeft;
                    intervalTimeLeft = settings.intervalTimeLeft;

                    sendStateUpdate("UPDATE_SETTINGS command [10]");
                    sendSettingsUpdate("UPDATE_SETTINGS command [11]");
                } catch (error) {
                    workerLog("[WORKER][12] Error updating settings:", error);
                }
            }
            break;

        case "GET_INITIAL_SETTINGS":
            // Jeśli ustawienia nie zostały jeszcze załadowane, załaduj je
            if (!settingsLoaded) {
                await initializeWorker();
            } else {
                sendSettingsUpdate("GET_INITIAL_SETTINGS command [13]");
                sendStateUpdate("GET_INITIAL_SETTINGS command [14]");
            }
            break;
    }
};

// Funkcja rozpoczynająca odliczanie
// Dokładność 1 sekunda
function startTimer() {
    workerLog("[WORKER][15] Starting timer");

    startTime = Date.now();
    isRunning = true;
    totalActiveTime = 1000;

    function tick() {
        const expectedTime = startTime + totalActiveTime + totalPausedTime;

        // Uaktualnij czas pauzy
        if (!isRunning) {
            totalPausedTime += 1000;
            scheduleNextTick(tick, calculateTimeCorrection(expectedTime));
            return;
        }

        // Sprawdź, czy sesja się zakończyła
        if (sessionTimeLeft === 0) {
            isRunning = false;
            workerLog("[WORKER][16] Session ended, timer stopped");
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
        sendStateUpdate("tick [17]");

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

    workerLog("[WORKER][18] Timer stopped and reset to initial values");
    sendStateUpdate("Prepare for next session");
}

function calculateTimeCorrection(expectedTime) {
    const timeCorrection = Date.now() - expectedTime;

    totalTimeCorrection += timeCorrection;

    const totalTicks = (totalActiveTime + totalPausedTime) / 1000;
    const averageTimeCorrection =
        totalTicks > 0 ? Math.floor(totalTimeCorrection / totalTicks) : 0;

    workerLog(
        `[WORKER][19] C: ${timeCorrection} ms, Total c: ${totalTimeCorrection}, Average c: ${averageTimeCorrection} | Active: ${
            totalActiveTime / 1000
        } | Paused: ${totalPausedTime / 1000}}`
    );

    return timeCorrection;
}

function scheduleNextTick(tick, timeCorrection) {
    timerId = setTimeout(tick, Math.max(50, 1000 - timeCorrection));
}

// Inicjalizacja workera
workerLog("[WORKER][20] Worker initializing");

// Inicjalizuj worker
initializeWorker();
