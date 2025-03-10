// IndexedDB database configuration
// These constants define the database structure and default values
const DB_NAME = "habit-bell-db"; // Name of the IndexedDB database
const STORE_NAME = "settings"; // Name of the object store (similar to a table)
const DB_VERSION = 2; // Database version
const SETTINGS_KEY = "timer-settings"; // Key used to store/retrieve settings object

// Default settings values - used when no saved settings exist
const DEFAULT_SESSION_DURATION = 30 * 60; // 30 minutes in seconds
const DEFAULT_INTERVAL_DURATION = 5 * 60; // 5 minutes in seconds

// Logging function (will be provided by the worker)
// This allows for consistent logging across the application
let logFunction = console.log;

/**
 * Sets the logging function
 * This allows the worker to inject its own logging mechanism
 * @param {Function} fn Logging function
 */
function setLogFunction(fn) {
    logFunction = fn;
}

/**
 * Opens a connection to the database
 * This is a core function used by all database operations
 * It handles database creation and upgrades automatically
 * @returns {Promise<IDBDatabase>} Database object
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        // Request to open the database - will create it if it doesn't exist
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Error handler - called if the database couldn't be opened
        request.onerror = (event) => {
            logFunction(
                "[STORAGE][01] Error opening database:",
                event.target.error
            );
            reject(event.target.error);
        };

        // Success handler - called when the database is successfully opened
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };

        // Called when the database is being created or upgraded
        // This is where we define the database schema
        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create the settings store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
                logFunction("[STORAGE][02] Created settings store");
            }

            // Add activities store if it doesn't exist
            if (!db.objectStoreNames.contains("activities")) {
                const activityStore = db.createObjectStore("activities", {
                    keyPath: "id",
                    autoIncrement: true,
                });

                // Add indexes for type and date to facilitate activity searches
                activityStore.createIndex("type", "type", { unique: false });
                activityStore.createIndex("date", "date", { unique: false });
                activityStore.createIndex("type_date", ["type", "date"], {
                    unique: false,
                });

                logFunction("[STORAGE][02a] Created activities store");
            }
        };
    });
}

/**
 * Saves settings to IndexedDB
 * This is a low-level function that handles the actual database write operation
 * @param {Object} settings Settings object to save
 * @returns {Promise<void>}
 */
async function saveSettings(settings) {
    try {
        // Open the database connection
        const db = await openDatabase();
        // Start a transaction - required for any database operation
        const transaction = db.transaction(STORE_NAME, "readwrite");
        // Get the object store from the transaction
        const store = transaction.objectStore(STORE_NAME);

        // Put the settings object in the store with the specified key
        // This will overwrite any existing settings with the same key
        const request = store.put(settings, SETTINGS_KEY);

        return new Promise((resolve, reject) => {
            // Success handler for the put operation
            request.onsuccess = () => {
                logFunction("[STORAGE][03] Settings saved to IndexedDB");
                resolve();
            };

            // Error handler for the put operation
            request.onerror = (event) => {
                logFunction(
                    "[STORAGE][04] Error saving settings to IndexedDB:",
                    event.target.error
                );
                reject(event.target.error);
            };

            // Clean up by closing the database when the transaction completes
            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        // Handle any errors that occurred during the database operation
        logFunction("[STORAGE][05] Error in saveSettings:", error);
        throw error;
    }
}

/**
 * Loads settings from IndexedDB
 * This is a low-level function that handles the actual database read operation
 * @returns {Promise<Object|null>} Settings object or null if not found
 */
async function loadSettings() {
    try {
        // Open the database connection
        const db = await openDatabase();
        // Start a read-only transaction
        const transaction = db.transaction(STORE_NAME, "readonly");
        // Get the object store from the transaction
        const store = transaction.objectStore(STORE_NAME);

        // Request the settings object with the specified key
        const request = store.get(SETTINGS_KEY);

        return new Promise((resolve, reject) => {
            // Success handler for the get operation
            request.onsuccess = (event) => {
                const settings = event.target.result;
                if (settings) {
                    // Settings found in the database
                    logFunction(
                        "[STORAGE][06] Settings loaded from IndexedDB:",
                        settings
                    );
                    resolve(settings);
                } else {
                    // No settings found with the specified key
                    logFunction("[STORAGE][07] No settings found in IndexedDB");
                    resolve(null);
                }
            };

            // Error handler for the get operation
            request.onerror = (event) => {
                logFunction(
                    "[STORAGE][08] Error loading settings from IndexedDB:",
                    event.target.error
                );
                reject(event.target.error);
            };

            // Clean up by closing the database when the transaction completes
            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        // Handle any errors that occurred during the database operation
        logFunction("[STORAGE][09] Error in loadSettings:", error);
        throw error;
    }
}

/**
 * Saves timer settings to IndexedDB
 * This is a higher-level function that formats the settings object before saving
 * @param {number} sessionDuration Session duration in seconds
 * @param {number} intervalDuration Interval duration in seconds
 * @returns {Promise<void>}
 */
async function saveTimerSettings(sessionDuration, intervalDuration) {
    try {
        // Create a settings object with the provided values
        const settings = {
            sessionDuration,
            intervalDuration,
        };

        // Save the settings object to the database
        await saveSettings(settings);
        logFunction("[STORAGE][10] Timer settings saved successfully");
    } catch (error) {
        // Handle any errors that occurred during the save operation
        logFunction("[STORAGE][11] Error saving timer settings:", error);
    }
}

/**
 * Initializes timer settings
 * This function is called when the application starts
 * It loads existing settings or creates default ones if none exist
 * @returns {Promise<{sessionDuration: number, intervalDuration: number}>}
 * Timer settings object
 */
async function initializeTimerSettings() {
    try {
        // Try to load existing settings from the database
        const settings = await loadSettings();

        // Start with default values
        let sessionDuration = DEFAULT_SESSION_DURATION;
        let intervalDuration = DEFAULT_INTERVAL_DURATION;
        let settingsChanged = false;

        if (settings) {
            // Settings exist in the database, update values if they're different from defaults
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
            // No settings found, use defaults and save them to the database
            logFunction("[STORAGE][14] No settings found, using defaults");
            await saveTimerSettings(sessionDuration, intervalDuration);
        }

        // Return only the settings values, not the timer state
        return {
            sessionDuration,
            intervalDuration,
        };
    } catch (error) {
        // Handle any errors that occurred during initialization
        logFunction("[STORAGE][15] Error initializing timer settings:", error);

        // In case of error, return default settings to ensure the application can still function
        return {
            sessionDuration: DEFAULT_SESSION_DURATION,
            intervalDuration: DEFAULT_INTERVAL_DURATION,
        };
    }
}

/**
 * Updates timer settings
 * This function is called when the user changes settings in the UI
 * It saves the new settings to the database if they're different from the current ones
 * @param {number} sessionDuration Session duration in seconds
 * @param {number} intervalDuration Interval duration in seconds
 * @returns {Promise<{sessionDuration: number, intervalDuration: number}>}
 * Updated timer settings object
 */
async function updateTimerSettings(sessionDuration, intervalDuration) {
    try {
        let settingsChanged = false;
        // Load current settings to check if they need to be updated
        const currentSettings = await loadSettings();

        // If no settings exist or the new values are different, save them
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

        // Return the updated settings
        return {
            sessionDuration,
            intervalDuration,
        };
    } catch (error) {
        // Handle any errors that occurred during the update
        logFunction("[STORAGE][18] Error updating timer settings:", error);

        // In case of error, return the provided settings to ensure the application can continue
        return {
            sessionDuration,
            intervalDuration,
        };
    }
}

// Export functions to global context to make them available to the worker
// This is necessary because Web Workers have their own global scope
self.StorageService = {
    setLogFunction,
    initializeTimerSettings,
    updateTimerSettings,
};
