// Konfiguracja bazy danych
const DB_NAME = "habit-bell-db"; // Ta sama nazwa bazy danych co w storage-settings-service.js
const PAUSE_STORE_NAME = "pauses"; // Nowy store dla pauz
const DB_VERSION = 2; // Zwiększamy wersję bazy danych, aby dodać nowy store

// Funkcja do otwierania połączenia z bazą danych
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            self.postMessage({
                type: "ERROR",
                payload: "Error opening database: " + event.target.error,
            });
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };

        // Obsługa aktualizacji schematu bazy danych
        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Sprawdź, czy store pauz już istnieje
            if (!db.objectStoreNames.contains(PAUSE_STORE_NAME)) {
                // Utwórz nowy store dla pauz z auto-inkrementowanym kluczem
                const pauseStore = db.createObjectStore(PAUSE_STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true,
                });

                // Dodaj indeks dla daty, aby ułatwić wyszukiwanie pauz z danego dnia
                pauseStore.createIndex("date", "date", { unique: false });

                self.postMessage({
                    type: "LOG",
                    payload: "Created pauses store",
                });
            }
        };
    });
}

// Funkcja do zapisywania pauzy w bazie danych
async function savePause(pauseRecord) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(PAUSE_STORE_NAME, "readwrite");
        const store = transaction.objectStore(PAUSE_STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.add(pauseRecord);

            request.onsuccess = () => {
                self.postMessage({
                    type: "PAUSE_SAVED",
                    payload: request.result, // ID zapisanej pauzy
                });
                resolve(request.result);
            };

            request.onerror = (event) => {
                self.postMessage({
                    type: "ERROR",
                    payload: "Error saving pause: " + event.target.error,
                });
                reject(event.target.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        self.postMessage({
            type: "ERROR",
            payload: "Error in savePause: " + error,
        });
        throw error;
    }
}

// Funkcja do pobierania liczby wszystkich pauz
async function getTotalPauseCount() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(PAUSE_STORE_NAME, "readonly");
        const store = transaction.objectStore(PAUSE_STORE_NAME);

        return new Promise((resolve, reject) => {
            const countRequest = store.count();

            countRequest.onsuccess = () => {
                resolve(countRequest.result);
            };

            countRequest.onerror = (event) => {
                self.postMessage({
                    type: "ERROR",
                    payload:
                        "Error getting total pause count: " +
                        event.target.error,
                });
                reject(event.target.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        self.postMessage({
            type: "ERROR",
            payload: "Error in getTotalPauseCount: " + error,
        });
        throw error;
    }
}

// Funkcja do pobierania liczby pauz z dzisiejszego dnia
async function getTodayPauseCount() {
    try {
        const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD

        const db = await openDatabase();
        const transaction = db.transaction(PAUSE_STORE_NAME, "readonly");
        const store = transaction.objectStore(PAUSE_STORE_NAME);
        const index = store.index("date");

        return new Promise((resolve, reject) => {
            const range = IDBKeyRange.only(today);
            const countRequest = index.count(range);

            countRequest.onsuccess = () => {
                resolve(countRequest.result);
            };

            countRequest.onerror = (event) => {
                self.postMessage({
                    type: "ERROR",
                    payload:
                        "Error getting today's pause count: " +
                        event.target.error,
                });
                reject(event.target.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        self.postMessage({
            type: "ERROR",
            payload: "Error in getTodayPauseCount: " + error,
        });
        throw error;
    }
}

// Funkcja do pobierania liczby pauz (całkowitej i dzisiejszej)
async function getPauseCounts() {
    try {
        const totalCount = await getTotalPauseCount();
        const todayCount = await getTodayPauseCount();

        self.postMessage({
            type: "PAUSE_COUNTS",
            payload: {
                totalCount,
                todayCount,
            },
        });
    } catch (error) {
        self.postMessage({
            type: "ERROR",
            payload: "Error getting pause counts: " + error,
        });
    }
}

// Obsługa wiadomości przychodzących
self.onmessage = async (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case "SAVE_PAUSE":
            await savePause(payload);
            break;
        case "GET_PAUSE_COUNTS":
            await getPauseCounts();
            break;
        default:
            self.postMessage({
                type: "ERROR",
                payload: "Unknown message type: " + type,
            });
    }
};

// Inicjalizacja workera
self.postMessage({
    type: "LOG",
    payload: "Pause worker initialized",
});
