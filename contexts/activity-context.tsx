"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";

/**
 * Defines the structure for a single recorded user activity.
 * These records are stored in IndexedDB.
 */
export interface ActivityRecord {
    /** @property {number} [id] - The unique identifier for the record (auto-incremented). */
    id?: number;
    /** @property {"pause" | "interval" | "session"} type - The type of activity recorded. */
    type: "pause" | "interval" | "session";
    /** @property {number} timestamp - The Unix timestamp (in milliseconds) when the activity occurred. */
    timestamp: number;
    /** @property {string} date - The date of the activity in `YYYY-MM-DD` format for easy grouping and querying. */
    date: string;
}

/**
 * Defines the structure for aggregated daily statistics.
 */
export interface DailyStats {
    /** @property {string} date - The date for which the stats are calculated. */
    date: string;
    /** @property {number} sessions - The total number of sessions on that day. */
    sessions: number;
    /** @property {number} intervals - The total number of intervals on that day. */
    intervals: number;
    /** @property {number} pauses - The total number of pauses on that day. */
    pauses: number;
}

/**
 * Defines the shape of the Activity Context.
 * This includes activity counts and functions to interact with the activity data.
 */
interface ActivityContextType {
    /** @property {number} pauseCount - The total number of pauses recorded across all time. */
    pauseCount: number;
    /** @property {number} todayPauseCount - The number of pauses recorded today. */
    todayPauseCount: number;
    /** @property {number} intervalCount - The total number of intervals recorded across all time. */
    intervalCount: number;
    /** @property {number} todayIntervalCount - The number of intervals recorded today. */
    todayIntervalCount: number;
    /** @property {number} sessionCount - The total number of sessions recorded across all time. */
    sessionCount: number;
    /** @property {number} todaySessionCount - The number of sessions recorded today. */
    todaySessionCount: number;
    /** A function to register a new pause event. */
    registerPause: () => void;
    /** A function to register a new interval completion event. */
    registerInterval: () => void;
    /** A function to register a new session completion event. */
    registerSession: () => void;
    /**
     * A function to retrieve and aggregate all activity records into daily statistics.
     * @returns {Promise<DailyStats[]>} A promise that resolves to an array of daily stats.
     */
    getActivityStats: () => Promise<DailyStats[]>;
    /**
     * A function to completely wipe all activity data from the database.
     * @returns {Promise<boolean>} A promise that resolves to `true` if the reset was successful.
     */
    resetActivityStats: () => Promise<boolean>;
}

/**
 * The default state for the ActivityContext.
 * Provides empty functions and zero-counts to prevent errors when the context is used without a provider.
 */
const defaultContext: ActivityContextType = {
    pauseCount: 0,
    todayPauseCount: 0,
    intervalCount: 0,
    todayIntervalCount: 0,
    sessionCount: 0,
    todaySessionCount: 0,
    registerPause: () => {},
    registerInterval: () => {},
    registerSession: () => {},
    getActivityStats: async () => [],
    resetActivityStats: async () => false,
};

/**
 * The React Context object for activity data.
 */
const ActivityContext = createContext<ActivityContextType>(defaultContext);

/**
 * A custom hook to easily access the ActivityContext.
 * This should be used by any component that needs to read activity data or register new activities.
 * @throws {Error} If used outside of an `ActivityProvider`.
 * @returns The activity context.
 */
export const useActivityContext = () => useContext(ActivityContext);

/**
 * Defines the props for the ActivityProvider component.
 */
interface ActivityProviderProps {
    /** @property {ReactNode} children - The child components that will have access to this context. */
    children: ReactNode;
}

/**
 * The provider component for the ActivityContext.
 * It handles all the logic for tracking, storing, and retrieving user activity data
 * using IndexedDB. It should wrap the part of the application that needs access to this data.
 */
export function ActivityProvider({ children }: ActivityProviderProps) {
    // State for the total number of pauses recorded across all time.
    const [pauseCount, setPauseCount] = useState(0);
    // State for the number of pauses recorded today.
    const [todayPauseCount, setTodayPauseCount] = useState(0);

    // State for the total number of intervals recorded across all time.
    const [intervalCount, setIntervalCount] = useState(0);
    // State for the number of intervals recorded today.
    const [todayIntervalCount, setTodayIntervalCount] = useState(0);

    // State for the total number of sessions recorded across all time.
    const [sessionCount, setSessionCount] = useState(0);
    // State for the number of sessions recorded today.
    const [todaySessionCount, setTodaySessionCount] = useState(0);

    /**
     * @private A helper function to format a Date object into a `YYYY-MM-DD` string.
     * @param {Date} date - The date to format.
     * @returns {string} The formatted date string.
     */
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    /**
     * @private Opens and sets up the IndexedDB database.
     * This function handles the creation and upgrading of the database schema.
     * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
     */
    const openDatabase = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("habit-bell-db", 2);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Check if activities store already exists
                if (!db.objectStoreNames.contains("activities")) {
                    // Create new store for activities with auto-incremented key
                    const activityStore = db.createObjectStore("activities", {
                        keyPath: "id",
                        autoIncrement: true,
                    });

                    // Add indexes for type and date to facilitate activity searches
                    activityStore.createIndex("type", "type", {
                        unique: false,
                    });
                    activityStore.createIndex("date", "date", {
                        unique: false,
                    });
                    activityStore.createIndex("type_date", ["type", "date"], {
                        unique: false,
                    });

                    console.log("[ACTIVITY][DEBUG] Created activities store");
                }

                // Make sure settings store exists
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings");
                    console.log("[ACTIVITY][DEBUG] Created settings store");
                }
            };

            request.onsuccess = (event) => {
                resolve((event.target as IDBOpenDBRequest).result);
            };

            request.onerror = (event) => {
                console.error(
                    "[ACTIVITY][DEBUG] Error opening database:",
                    event
                );
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    };

    /**
     * Retrieves all activity records from IndexedDB and groups them by date
     * to calculate daily statistics.
     * @returns {Promise<DailyStats[]>} A promise that resolves to an array of daily stats.
     */
    const getActivityStats = async (): Promise<DailyStats[]> => {
        try {
            console.log("[ACTIVITY][DEBUG] Getting activity statistics");

            const db = await openDatabase();
            const transaction = db.transaction("activities", "readonly");
            const store = transaction.objectStore("activities");

            // Get all activities
            return new Promise((resolve, reject) => {
                const request = store.getAll();

                request.onsuccess = () => {
                    const activities = request.result;

                    // Group activities by date
                    const groupedByDate = activities.reduce(
                        (acc: { [key: string]: DailyStats }, activity) => {
                            const { date, type } = activity;

                            if (!acc[date]) {
                                acc[date] = {
                                    date,
                                    sessions: 0,
                                    intervals: 0,
                                    pauses: 0,
                                };
                            }

                            // Increment the appropriate counter
                            switch (type) {
                                case "session":
                                    acc[date].sessions++;
                                    break;
                                case "interval":
                                    acc[date].intervals++;
                                    break;
                                case "pause":
                                    acc[date].pauses++;
                                    break;
                            }

                            return acc;
                        },
                        {}
                    );

                    // Convert the grouped data to an array
                    const stats = Object.values(groupedByDate);
                    console.log("[ACTIVITY][DEBUG] Collected stats:", stats);
                    resolve(stats);
                };

                request.onerror = (event) => {
                    console.error(
                        "[ACTIVITY][DEBUG] Error getting activities:",
                        event
                    );
                    reject(event);
                };

                transaction.oncomplete = () => {
                    db.close();
                };
            });
        } catch (error) {
            console.error(
                "[ACTIVITY][DEBUG] Error getting activity stats:",
                error
            );
            return [];
        }
    };

    /**
     * Clears all activity records from the 'activities' object store in IndexedDB.
     * Also resets all the in-memory state counters to zero.
     * @returns {Promise<boolean>} A promise that resolves to `true` on success and `false` on failure.
     */
    const resetActivityStats = async (): Promise<boolean> => {
        try {
            console.log("[ACTIVITY][DEBUG] Resetting all activity statistics");

            const db = await openDatabase();
            const transaction = db.transaction("activities", "readwrite");
            const store = transaction.objectStore("activities");

            // Clear all records from the object store
            return new Promise((resolve, reject) => {
                const request = store.clear();

                request.onsuccess = () => {
                    console.log(
                        "[ACTIVITY][DEBUG] All activity statistics cleared successfully"
                    );

                    // Reset all state counters
                    setPauseCount(0);
                    setTodayPauseCount(0);
                    setIntervalCount(0);
                    setTodayIntervalCount(0);
                    setSessionCount(0);
                    setTodaySessionCount(0);

                    resolve(true);
                };

                request.onerror = (event) => {
                    console.error(
                        "[ACTIVITY][DEBUG] Error clearing activity statistics:",
                        event
                    );
                    reject(false);
                };

                transaction.oncomplete = () => {
                    db.close();
                };
            });
        } catch (error) {
            console.error(
                "[ACTIVITY][DEBUG] Error resetting activity stats:",
                error
            );
            return false;
        }
    };

    /**
     * @private A generic function to register a new activity.
     * It creates an `ActivityRecord` and saves it to IndexedDB.
     * On successful save, it updates the relevant state counters.
     * @param {"pause" | "interval" | "session"} type - The type of activity to register.
     */
    const registerActivity = async (type: "pause" | "interval" | "session") => {
        try {
            console.log(`[ACTIVITY][DEBUG] Registering new ${type}`);
            const now = new Date();
            const activityRecord: ActivityRecord = {
                type,
                timestamp: now.getTime(),
                date: formatDate(now),
            };

            const db = await openDatabase();
            const transaction = db.transaction("activities", "readwrite");
            const store = transaction.objectStore("activities");

            const addRequest = store.add(activityRecord);

            addRequest.onsuccess = () => {
                console.log(`[ACTIVITY][DEBUG] ${type} saved successfully`);

                // Update appropriate counters based on activity type
                if (type === "pause") {
                    setPauseCount((prev) => prev + 1);
                    setTodayPauseCount((prev) => prev + 1);
                } else if (type === "interval") {
                    setIntervalCount((prev) => prev + 1);
                    setTodayIntervalCount((prev) => prev + 1);
                } else if (type === "session") {
                    setSessionCount((prev) => prev + 1);
                    setTodaySessionCount((prev) => prev + 1);
                }
            };

            addRequest.onerror = (event) => {
                console.error(`[ACTIVITY][DEBUG] Error saving ${type}:`, event);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        } catch (error) {
            console.error(
                `[ACTIVITY][DEBUG] Error registering ${type}:`,
                error
            );
        }
    };

    /** A public-facing function to register a 'pause' activity. */
    const registerPause = () => registerActivity("pause");
    /** A public-facing function to register an 'interval' activity. */
    const registerInterval = () => registerActivity("interval");
    /** A public-facing function to register a 'session' activity. */
    const registerSession = () => registerActivity("session");

    /**
     * An effect hook that runs once on component mount.
     * It loads the initial activity counts (both total and for today) from IndexedDB
     * and populates the component's state.
     */
    useEffect(() => {
        const loadActivityCounts = async () => {
            try {
                console.log("[ACTIVITY][DEBUG] Loading activity counts");

                const db = await openDatabase();
                const transaction = db.transaction("activities", "readonly");
                const store = transaction.objectStore("activities");
                const today = formatDate(new Date());

                // Helper function to get counts for a specific activity type
                const getCounts = (
                    type: "pause" | "interval" | "session",
                    setTotalCount: (count: number) => void,
                    setTodayCount: (count: number) => void
                ) => {
                    const typeIndex = store.index("type");
                    const countRequest = typeIndex.count(IDBKeyRange.only(type));

                    countRequest.onsuccess = () => {
                        const totalCount = countRequest.result;
                        console.log(
                            `[ACTIVITY][DEBUG] Total ${type} count:`,
                            totalCount
                        );
                        setTotalCount(totalCount);

                        const typeDateIndex = store.index("type_date");
                        const todayCountRequest = typeDateIndex.count(
                            IDBKeyRange.only([type, today])
                        );

                        todayCountRequest.onsuccess = () => {
                            const todayCount = todayCountRequest.result;
                            console.log(
                                `[ACTIVITY][DEBUG] Today's ${type} count:`,
                                todayCount
                            );
                            setTodayCount(todayCount);
                        };
                    };
                };

                // Get counts for each activity type
                getCounts("pause", setPauseCount, setTodayPauseCount);
                getCounts("interval", setIntervalCount, setTodayIntervalCount);
                getCounts("session", setSessionCount, setTodaySessionCount);

                transaction.oncomplete = () => {
                    db.close();
                };
            } catch (error) {
                console.error(
                    "[ACTIVITY][DEBUG] Error loading activity counts:",
                    error
                );
            }
        };

        loadActivityCounts();
    }, []);

    // The value provided to the context consumers.
    const value: ActivityContextType = {
        pauseCount,
        todayPauseCount,
        intervalCount,
        todayIntervalCount,
        sessionCount,
        todaySessionCount,
        registerPause,
        registerInterval,
        registerSession,
        getActivityStats,
        resetActivityStats,
    };

    return (
        <ActivityContext.Provider value={value}>
            {children}
        </ActivityContext.Provider>
    );
}
