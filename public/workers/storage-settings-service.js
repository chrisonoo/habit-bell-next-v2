// Konfiguracja bazy danych IndexedDB
const DB_NAME = "habit-bell-db";
const STORE_NAME = "settings";
const DB_VERSION = 1;
const SETTINGS_KEY = "timer-settings";

// Domyślne wartości ustawień
const DEFAULT_SESSION_DURATION = 30 * 60; // 30 minut
const DEFAULT_INTERVAL_DURATION = 5 * 60; // 5 minut

// Funkcja do logowania (będzie przekazywana z workera)
let logFunction = console.log;

/**
 * Ustawia funkcję logowania
 * @param {Function} fn Funkcja logowania
 */
function setLogFunction(fn) {
    logFunction = fn;
}

/**
 * Otwiera połączenie z bazą danych
 * @returns {Promise<IDBDatabase>} Obiekt bazy danych
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            logFunction(
                "[STORAGE][01] Error opening database:",
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
                logFunction("[STORAGE][02] Created settings store");
            }
        };
    });
}

/**
 * Zapisuje ustawienia do IndexedDB
 * @param {Object} settings Obiekt z ustawieniami
 * @returns {Promise<void>}
 */
async function saveSettings(settings) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put(settings, SETTINGS_KEY);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                logFunction("[STORAGE][03] Settings saved to IndexedDB");
                resolve();
            };

            request.onerror = (event) => {
                logFunction(
                    "[STORAGE][04] Error saving settings to IndexedDB:",
                    event.target.error
                );
                reject(event.target.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        logFunction("[STORAGE][05] Error in saveSettings:", error);
        throw error;
    }
}

/**
 * Ładuje ustawienia z IndexedDB
 * @returns {Promise<Object|null>} Obiekt z ustawieniami lub null
 */
async function loadSettings() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(SETTINGS_KEY);

        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const settings = event.target.result;
                if (settings) {
                    logFunction(
                        "[STORAGE][06] Settings loaded from IndexedDB:",
                        settings
                    );
                    resolve(settings);
                } else {
                    logFunction("[STORAGE][07] No settings found in IndexedDB");
                    resolve(null);
                }
            };

            request.onerror = (event) => {
                logFunction(
                    "[STORAGE][08] Error loading settings from IndexedDB:",
                    event.target.error
                );
                reject(event.target.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        logFunction("[STORAGE][09] Error in loadSettings:", error);
        throw error;
    }
}

/**
 * Zapisuje ustawienia timera do IndexedDB
 * @param {number} sessionDuration Czas trwania sesji w sekundach
 * @param {number} intervalDuration Czas trwania interwału w sekundach
 * @returns {Promise<void>}
 */
async function saveTimerSettings(sessionDuration, intervalDuration) {
    try {
        const settings = {
            sessionDuration,
            intervalDuration,
        };

        await saveSettings(settings);
        logFunction("[STORAGE][10] Timer settings saved successfully");
    } catch (error) {
        logFunction("[STORAGE][11] Error saving timer settings:", error);
    }
}

/**
 * Inicjalizuje ustawienia timera
 * @returns {Promise<{sessionDuration: number, intervalDuration: number, sessionTimeLeft: number, intervalTimeLeft: number}>}
 * Obiekt z ustawieniami timera
 */
async function initializeTimerSettings() {
    try {
        const settings = await loadSettings();

        let sessionDuration = DEFAULT_SESSION_DURATION;
        let intervalDuration = DEFAULT_INTERVAL_DURATION;
        let settingsChanged = false;

        if (settings) {
            // Aktualizuj ustawienia tylko jeśli są różne od domyślnych
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

            if (settingsChanged) {
                logFunction("[STORAGE][12] Settings updated from storage");
            } else {
                logFunction("[STORAGE][13] Using stored settings");
            }
        } else {
            logFunction("[STORAGE][14] No settings found, using defaults");
            // Zapisz domyślne ustawienia
            await saveTimerSettings(sessionDuration, intervalDuration);
        }

        // Zwróć ustawienia i początkowe wartości timera
        return {
            sessionDuration,
            intervalDuration,
            sessionTimeLeft: sessionDuration,
            intervalTimeLeft: intervalDuration,
        };
    } catch (error) {
        logFunction("[STORAGE][15] Error initializing timer settings:", error);

        // W przypadku błędu, zwróć domyślne ustawienia
        return {
            sessionDuration: DEFAULT_SESSION_DURATION,
            intervalDuration: DEFAULT_INTERVAL_DURATION,
            sessionTimeLeft: DEFAULT_SESSION_DURATION,
            intervalTimeLeft: DEFAULT_INTERVAL_DURATION,
        };
    }
}

/**
 * Aktualizuje ustawienia timera
 * @param {number} sessionDuration Czas trwania sesji w sekundach
 * @param {number} intervalDuration Czas trwania interwału w sekundach
 * @returns {Promise<{sessionDuration: number, intervalDuration: number, sessionTimeLeft: number, intervalTimeLeft: number}>}
 * Obiekt z zaktualizowanymi ustawieniami timera
 */
async function updateTimerSettings(sessionDuration, intervalDuration) {
    try {
        let settingsChanged = false;
        const currentSettings = await loadSettings();

        // Jeśli nie ma ustawień lub są różne od obecnych, zapisz nowe
        if (
            !currentSettings ||
            currentSettings.sessionDuration !== sessionDuration ||
            currentSettings.intervalDuration !== intervalDuration
        ) {
            await saveTimerSettings(sessionDuration, intervalDuration);
            settingsChanged = true;
        }

        if (settingsChanged) {
            logFunction("[STORAGE][16] Timer settings updated");
        } else {
            logFunction("[STORAGE][17] Timer settings unchanged");
        }

        // Zwróć zaktualizowane ustawienia i początkowe wartości timera
        return {
            sessionDuration,
            intervalDuration,
            sessionTimeLeft: sessionDuration,
            intervalTimeLeft: intervalDuration,
        };
    } catch (error) {
        logFunction("[STORAGE][18] Error updating timer settings:", error);

        // W przypadku błędu, zwróć przekazane ustawienia
        return {
            sessionDuration,
            intervalDuration,
            sessionTimeLeft: sessionDuration,
            intervalTimeLeft: intervalDuration,
        };
    }
}

// Eksportuj funkcje do globalnego kontekstu, aby były dostępne dla workera
self.StorageService = {
    setLogFunction,
    initializeTimerSettings,
    updateTimerSettings,
};
