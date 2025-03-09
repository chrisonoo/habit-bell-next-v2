// Nazwa bazy danych IndexedDB
const DB_NAME = "habit-bell-db";
const STORE_NAME = "settings";
const DB_VERSION = 1;

// Klucze do przechowywania ustawień
const SETTINGS_KEY = "timer-settings";

// Zmienne do przechowywania stanu timera
let sessionTimeLeft = 0;
let intervalTimeLeft = 0;
let intervalDuration = 5 * 60; // Domyślna wartość
let sessionDuration = 30 * 60; // Domyślna wartość

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

// Funkcja do otwierania połączenia z bazą danych
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            workerLog(
                "[WORKER][17] Error opening database:",
                event.target.error
            );
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
                workerLog("[WORKER][18] Created settings store");
            }
        };
    });
}

// Funkcja do zapisywania ustawień do IndexedDB
async function saveSettingsToStorage() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        const settings = {
            sessionDuration,
            intervalDuration,
        };

        const request = store.put(settings, SETTINGS_KEY);

        request.onsuccess = () => {
            workerLog("[WORKER][19] Settings saved to IndexedDB");
        };

        request.onerror = (event) => {
            workerLog(
                "[WORKER][20] Error saving settings to IndexedDB:",
                event.target.error
            );
        };

        transaction.oncomplete = () => {
            db.close();
        };
    } catch (error) {
        workerLog("[WORKER][21] Error in saveSettingsToStorage:", error);
    }
}

// Funkcja do ładowania ustawień z IndexedDB
async function loadSettingsFromStorage() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(SETTINGS_KEY);

        request.onsuccess = (event) => {
            const settings = event.target.result;
            if (settings) {
                workerLog(
                    "[WORKER][22] Settings loaded from IndexedDB:",
                    settings
                );

                // Aktualizuj ustawienia tylko jeśli są różne od obecnych
                let settingsChanged = false;

                if (
                    settings.sessionDuration !== undefined &&
                    settings.sessionDuration !== sessionDuration
                ) {
                    sessionDuration = settings.sessionDuration;
                    settingsChanged = true;
                }

                if (
                    settings.intervalDuration !== undefined &&
                    settings.intervalDuration !== intervalDuration
                ) {
                    intervalDuration = settings.intervalDuration;
                    settingsChanged = true;
                }

                // Zresetuj timer z nowymi ustawieniami
                sessionTimeLeft = sessionDuration;
                intervalTimeLeft = intervalDuration;

                // Wyślij aktualizację ustawień i stanu
                sendSettingsUpdate("Settings loaded from storage [23]");
                sendStateUpdate(
                    "Timer initialized with settings from storage [24]"
                );

                settingsLoaded = true;
            } else {
                workerLog(
                    "[WORKER][25] No settings found in IndexedDB, using defaults"
                );
                // Zapisz domyślne ustawienia
                saveSettingsToStorage();

                // Inicjalizacja początkowych wartości z domyślnymi ustawieniami
                sessionTimeLeft = sessionDuration;
                intervalTimeLeft = intervalDuration;

                sendSettingsUpdate("Using default settings [26]");
                sendStateUpdate("Timer initialized with default settings [27]");

                settingsLoaded = true;
            }
        };

        request.onerror = (event) => {
            workerLog(
                "[WORKER][28] Error loading settings from IndexedDB:",
                event.target.error
            );
            // Inicjalizacja początkowych wartości z domyślnymi ustawieniami
            sessionTimeLeft = sessionDuration;
            intervalTimeLeft = intervalDuration;

            sendSettingsUpdate("Error loading settings, using defaults [29]");
            sendStateUpdate("Timer initialized with default settings [30]");

            settingsLoaded = true;
        };

        transaction.oncomplete = () => {
            db.close();
        };
    } catch (error) {
        workerLog("[WORKER][31] Error in loadSettingsFromStorage:", error);
        // Inicjalizacja początkowych wartości z domyślnymi ustawieniami
        sessionTimeLeft = sessionDuration;
        intervalTimeLeft = intervalDuration;

        sendSettingsUpdate("Error loading settings, using defaults [32]");
        sendStateUpdate("Timer initialized with default settings [33]");

        settingsLoaded = true;
    }
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
                let settingsChanged = false;

                if (
                    payload.sessionDuration !== undefined &&
                    payload.sessionDuration !== sessionDuration
                ) {
                    sessionDuration = payload.sessionDuration;
                    settingsChanged = true;
                }

                if (
                    payload.intervalDuration !== undefined &&
                    payload.intervalDuration !== intervalDuration
                ) {
                    intervalDuration = payload.intervalDuration;
                    settingsChanged = true;
                }

                // Zapisz ustawienia do IndexedDB, jeśli się zmieniły
                if (settingsChanged) {
                    saveSettingsToStorage();
                }
            }
            sessionTimeLeft = sessionDuration;
            intervalTimeLeft = intervalDuration;
            sendStateUpdate("UPDATE_SETTINGS command [07]");
            sendSettingsUpdate("UPDATE_SETTINGS command [08]");
            break;

        case "GET_INITIAL_SETTINGS":
            // Jeśli ustawienia nie zostały jeszcze załadowane, załaduj je
            if (!settingsLoaded) {
                loadSettingsFromStorage();
            } else {
                sendSettingsUpdate("GET_INITIAL_SETTINGS command [09]");
                sendStateUpdate("GET_INITIAL_SETTINGS command [10]");
            }
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
    const timeCorrection = Date.now() - expectedTime;

    totalTimeCorrection += timeCorrection;

    const totalTicks = (totalActiveTime + totalPausedTime) / 1000;
    const averageTimeCorrection =
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
workerLog("[WORKER][16] Worker initialized with default settings:", {
    sessionDuration,
    intervalDuration,
});

// Załaduj ustawienia z IndexedDB przy inicjalizacji
loadSettingsFromStorage();
