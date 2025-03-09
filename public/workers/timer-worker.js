// Import storage-service.js script
// This gives the worker access to the IndexedDB storage functions
importScripts("./storage-settings-service.js");

// Variables to store timer state
// These are the core state variables that track the current timer status
let sessionTimeLeft = 0; // Remaining time for the current session in seconds
let intervalTimeLeft = 0; // Remaining time for the current interval in seconds
let sessionDuration = 0; // Total session duration in seconds (from settings)
let intervalDuration = 0; // Total interval duration in seconds (from settings)

// Initialize time tracking variables
// These variables help maintain accurate timing despite browser inconsistencies
let startTime = 0; // Timestamp when the timer was started
let isRunning = false; // Flag indicating if the timer is currently running
let timerId = null; // Reference to the setTimeout timer for cancellation
let totalActiveTime = 0; // Total time the timer has been active in milliseconds
let totalPausedTime = 0; // Total time the timer has been paused in milliseconds
let totalTimeCorrection = 0; // Accumulated time drift correction in milliseconds

// Flag indicating if settings have been loaded
// This prevents multiple initialization attempts
let settingsLoaded = false;

/**
 * Function to send logs to the main thread
 * This allows the worker to log messages that appear in the main thread's console
 * @param {...any} args Arguments to log
 */
function workerLog(...args) {
    // Convert all arguments to strings, handling objects specially
    const message = args
        .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

    // Send the log message to the main thread
    self.postMessage({
        type: "LOG",
        payload: message,
    });
}

// Initialize StorageService with logging function
// This allows the storage service to use the same logging mechanism
self.StorageService.setLogFunction(workerLog);

/**
 * Function to send timer state updates to the main thread
 * This is called whenever the timer state changes and needs to be reflected in the UI
 * @param {string} reason Description of why the update is being sent (for logging)
 */
function sendStateUpdate(reason) {
    workerLog(`[WORKER][01] Sent update: ${reason}`);

    // Send the current timer state to the main thread
    self.postMessage({
        type: "UPDATE",
        payload: {
            sessionTimeLeft,
            intervalTimeLeft,
            isRunning,
        },
    });
}

/**
 * Function to send settings updates to the main thread
 * This is called when settings are loaded or changed
 * @param {string} reason Description of why the update is being sent (for logging)
 */
function sendSettingsUpdate(reason) {
    // Send the current settings to the main thread
    self.postMessage({
        type: "SETTINGS_UPDATE",
        payload: {
            sessionDuration,
            intervalDuration,
        },
    });

    workerLog(`[WORKER][02] Sent settings update: ${reason}`);
}

/**
 * Function to initialize the worker
 * This loads settings from IndexedDB and sets up the initial timer state
 * It's called when the worker starts or when settings need to be reloaded
 */
async function initializeWorker() {
    try {
        // Load settings from IndexedDB via the StorageService
        const settings = await self.StorageService.initializeTimerSettings();

        // Update the worker's settings variables
        sessionDuration = settings.sessionDuration;
        intervalDuration = settings.intervalDuration;

        // Initialize timer state based on the loaded settings
        sessionTimeLeft = sessionDuration;
        intervalTimeLeft = intervalDuration;

        // Send updates to the main thread
        sendSettingsUpdate("Worker initialized with settings [03]");
        sendStateUpdate("Worker initialized with timer state [04]");

        // Mark settings as loaded to prevent redundant initialization
        settingsLoaded = true;
    } catch (error) {
        workerLog("[WORKER][05] Error initializing worker:", error);
        // Even if there's an error, mark settings as loaded to prevent infinite retry loops
        settingsLoaded = true;
    }
}

/**
 * Message handler for the worker
 * This processes messages from the main thread and takes appropriate actions
 * It's the main entry point for controlling the timer from the UI
 */
self.onmessage = async (e) => {
    const { type, payload } = e.data;
    workerLog(`[WORKER][06] Received message from MAIN: ${type}`);

    switch (type) {
        case "START":
            // Start the timer
            isRunning = true;
            if (!timerId) {
                startTimer();
            }
            sendStateUpdate("START command [07]");
            break;

        case "PAUSE":
            // Pause the timer
            isRunning = false;
            sendStateUpdate("PAUSE command [08]");
            break;

        case "RESET":
            // Reset the timer to initial values
            isRunning = false;
            // Reset timer values to the current settings
            sessionTimeLeft = sessionDuration;
            intervalTimeLeft = intervalDuration;
            stopReset();
            sendStateUpdate("RESET to INITIAL values [09]");
            break;

        case "UPDATE_SETTINGS":
            // Update timer settings
            isRunning = false;
            if (payload) {
                try {
                    // Update settings in IndexedDB via the StorageService
                    const settings =
                        await self.StorageService.updateTimerSettings(
                            payload.sessionDuration !== undefined
                                ? payload.sessionDuration
                                : sessionDuration,
                            payload.intervalDuration !== undefined
                                ? payload.intervalDuration
                                : intervalDuration
                        );

                    // Update the worker's settings variables
                    sessionDuration = settings.sessionDuration;
                    intervalDuration = settings.intervalDuration;

                    // Reset timer state based on the new settings
                    sessionTimeLeft = sessionDuration;
                    intervalTimeLeft = intervalDuration;

                    // Send updates to the main thread
                    sendStateUpdate("UPDATE_SETTINGS command [10]");
                    sendSettingsUpdate("UPDATE_SETTINGS command [11]");
                } catch (error) {
                    workerLog("[WORKER][12] Error updating settings:", error);
                }
            }
            break;

        case "GET_INITIAL_SETTINGS":
            // Get initial settings (called when the main thread initializes)
            // If settings haven't been loaded yet, load them
            if (!settingsLoaded) {
                await initializeWorker();
            } else {
                // Otherwise, just send the current settings and state
                sendSettingsUpdate("GET_INITIAL_SETTINGS command [13]");
                sendStateUpdate("GET_INITIAL_SETTINGS command [14]");
            }
            break;
    }
};

/**
 * Function to start the timer
 * This sets up the timer loop that decrements the time values
 * It uses setTimeout with drift correction for more accurate timing
 */
function startTimer() {
    workerLog("[WORKER][15] Starting timer");

    // Initialize timing variables
    startTime = Date.now();
    isRunning = true;
    totalActiveTime = 1000; // Start at 1 second to account for the first tick

    /**
     * Timer tick function
     * This is called every second to update the timer state
     * It handles pausing, resuming, and completing the timer
     */
    function tick() {
        // Calculate when this tick should have occurred based on start time and elapsed time
        const expectedTime = startTime + totalActiveTime + totalPausedTime;

        // If the timer is paused, update the pause time but don't decrement the timer
        if (!isRunning) {
            totalPausedTime += 1000;
            scheduleNextTick(tick, calculateTimeCorrection(expectedTime));
            return;
        }

        // Check if the session has ended
        if (sessionTimeLeft === 0) {
            isRunning = false;
            workerLog("[WORKER][16] Session ended, timer stopped");
            return;
        }

        // Update the active time
        totalActiveTime += 1000;

        // Decrement the session time
        sessionTimeLeft -= 1;

        // Update the interval time with automatic reset logic
        // This complex conditional handles the interval reset when it reaches zero
        intervalTimeLeft === 1
            ? sessionTimeLeft === 0
                ? (intervalTimeLeft -= 1) // If session is also ending, let interval reach zero
                : (intervalTimeLeft = intervalDuration) // Otherwise reset interval to full duration
            : (intervalTimeLeft -= 1); // Normal case: just decrement interval time

        // Send the updated state to the main thread
        sendStateUpdate("tick [17]");

        // Schedule the next tick with time correction
        scheduleNextTick(tick, calculateTimeCorrection(expectedTime));
    }

    // Start the timer loop with no initial correction
    scheduleNextTick(tick, 0);
}

/**
 * Function to stop and reset the timer
 * This cancels any pending timer and resets all state variables
 */
function stopReset() {
    // Cancel the timer if it's running
    if (timerId) {
        clearTimeout(timerId);
        timerId = null;
    }

    // Reset all timing variables
    startTime = 0;
    isRunning = false;
    totalActiveTime = 0;
    totalPausedTime = 0;
    totalTimeCorrection = 0;

    // Reset timer values to the current settings
    sessionTimeLeft = sessionDuration;
    intervalTimeLeft = intervalDuration;

    workerLog("[WORKER][18] Timer stopped and reset to initial values");
    sendStateUpdate("Prepare for next session");
}

/**
 * Function to calculate time correction for the next tick
 * This helps maintain accurate timing despite browser inconsistencies
 * @param {number} expectedTime When the current tick should have occurred
 * @returns {number} Time correction in milliseconds
 */
function calculateTimeCorrection(expectedTime) {
    // Calculate how far off we are from the expected time
    const timeCorrection = Date.now() - expectedTime;

    // Accumulate total correction for logging and analysis
    totalTimeCorrection += timeCorrection;

    // Calculate average correction per tick for logging
    const totalTicks = (totalActiveTime + totalPausedTime) / 1000;
    const averageTimeCorrection =
        totalTicks > 0 ? Math.floor(totalTimeCorrection / totalTicks) : 0;

    // Log detailed timing information for debugging
    workerLog(
        `[WORKER][19] C: ${timeCorrection} ms, Total c: ${totalTimeCorrection}, Average c: ${averageTimeCorrection} | Active: ${
            totalActiveTime / 1000
        } | Paused: ${totalPausedTime / 1000}}`
    );

    return timeCorrection;
}

/**
 * Function to schedule the next timer tick
 * This adjusts the timeout to account for drift
 * @param {Function} tick The tick function to call
 * @param {number} timeCorrection Time correction in milliseconds
 */
function scheduleNextTick(tick, timeCorrection) {
    // Schedule the next tick, adjusting for any time drift
    // The minimum timeout is 50ms to prevent excessive CPU usage
    timerId = setTimeout(tick, Math.max(50, 1000 - timeCorrection));
}

// Initialize the worker
workerLog("[WORKER][20] Worker initializing");
initializeWorker();
