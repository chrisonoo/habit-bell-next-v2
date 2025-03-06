// Zmienne do przechowywania stanu timera
let isRunning = false;
let sessionTimeLeft = 0;
let intervalTimeLeft = 0;
let timerId = null;
let intervalDuration = 5 * 60; // Domyślna wartość
let sessionDuration = 30 * 60; // Domyślna wartość

// Funkcja do wysyłania logów do głównego wątku
function workerLog(...args) {
    // const message = args
    //     .map((arg) =>
    //         typeof arg === "object" ? JSON.stringify(arg) : String(arg)
    //     )
    //     .join(" ");

    self.postMessage({
        type: "LOG",
        payload: args,
    });

    // Zachowaj również standardowe logowanie w konsoli workera
    //console.log(...args);
}

// Funkcja do wysyłania aktualizacji stanu do głównego wątku
function sendStateUpdate(reason) {
    workerLog(`[WORKER] Sent update: ${reason}`, );

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

    workerLog(`[WORKER] Sent settings update: ${reason}`);
}

// Obsługa wiadomości od głównego wątku
self.onmessage = (e) => {
    const { type, payload } = e.data;
    workerLog(`[WORKER] Received message from MAIN: ${type}`);

    switch (type) {
        case "START":
            isRunning = true;
            if (!timerId) {
                startTimer();
            }
            sendStateUpdate("START command");
            break;

        case "PAUSE":
            isRunning = false;
            sendStateUpdate("PAUSE command");
            break;

        case "RESET":
            isRunning = false;
            sessionTimeLeft = sessionDuration;
            intervalTimeLeft = intervalDuration;
            sendStateUpdate("RESET to INITIAL values");
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
            sendStateUpdate("UPDATE_SETTINGS command");
            sendSettingsUpdate("UPDATE_SETTINGS command");
            break;

        case "GET_INITIAL_SETTINGS":
            sendSettingsUpdate("GET_INITIAL_SETTINGS command");
            sendStateUpdate("GET_INITIAL_SETTINGS command");
            break;
    }
};

// Funkcja rozpoczynająca odliczanie
function startTimer() {
    if (timerId) {
        clearInterval(timerId);
    }

    workerLog("[WORKER] Starting timer");

    // Używamy Date.now() do dokładnego śledzenia czasu
    let lastTickTime = Date.now();

    timerId = setInterval(() => {
        // Aktualizuj czas tylko jeśli timer jest uruchomiony
        if (!isRunning) return;

        const now = Date.now();
        const deltaSeconds = Math.floor((now - lastTickTime) / 1000);
        if (deltaSeconds <= 0) return;

        lastTickTime = now;

        // Aktualizuj czas sesji
        if (sessionTimeLeft > 0) {
            sessionTimeLeft = Math.max(0, sessionTimeLeft - deltaSeconds);
        }

        // Aktualizuj czas interwału
        if (intervalTimeLeft > deltaSeconds) {
            intervalTimeLeft -= deltaSeconds;
        } else {
            // Resetuj interwał, gdy osiągnie zero
            intervalTimeLeft = intervalDuration;
        }

        // Sprawdź, czy sesja się zakończyła
        if (sessionTimeLeft <= 0) {
            isRunning = false;
            workerLog("[WORKER] Session ended, stopping timer");
        }

        // Wyślij zaktualizowany stan do głównego wątku
        sendStateUpdate("tick");
    }, 1000);
}

// Inicjalizacja workera
workerLog("[WORKER] Worker initialized with settings:", {
    sessionDuration,
    intervalDuration,
});
// Inicjalizacja początkowych wartości
sessionTimeLeft = sessionDuration;
intervalTimeLeft = intervalDuration;
