"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";

// Interface for a single activity (pause, interval or session)
export interface ActivityRecord {
    id?: number;
    type: "pause" | "interval" | "session"; // Activity type
    timestamp: number; // Unix timestamp
    date: string; // YYYY-MM-DD format for easier grouping
}

// Add the DailyStats interface after the ActivityRecord interface
export interface DailyStats {
    date: string;
    sessions: number;
    intervals: number;
    pauses: number;
}

// Zaktualizuj interfejs ActivityContextType, dodając funkcję resetActivityStats
interface ActivityContextType {
    pauseCount: number;
    todayPauseCount: number;
    intervalCount: number;
    todayIntervalCount: number;
    sessionCount: number;
    todaySessionCount: number;
    registerPause: () => void;
    registerInterval: () => void;
    registerSession: () => void;
    getActivityStats: () => Promise<DailyStats[]>;
    resetActivityStats: () => Promise<boolean>; // Dodana nowa funkcja
}

// Zaktualizuj defaultContext, dodając pustą implementację resetActivityStats
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
    resetActivityStats: async () => false, // Dodana nowa funkcja
};

// Create context
const ActivityContext = createContext<ActivityContextType>(defaultContext);

// Hook for using activity context
export const useActivityContext = () => useContext(ActivityContext);

// Props for context provider
interface ActivityProviderProps {
    children: ReactNode;
}

// Activity context provider
export function ActivityProvider({ children }: ActivityProviderProps) {
    // State for total pause count and today's pause count
    const [pauseCount, setPauseCount] = useState(0);
    const [todayPauseCount, setTodayPauseCount] = useState(0);

    // State for total interval count and today's interval count
    const [intervalCount, setIntervalCount] = useState(0);
    const [todayIntervalCount, setTodayIntervalCount] = useState(0);

    // State for total session count and today's session count
    const [sessionCount, setSessionCount] = useState(0);
    const [todaySessionCount, setTodaySessionCount] = useState(0);

    // Helper function to format date in YYYY-MM-DD format
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Function to open database
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

    // Add the getActivityStats function to the ActivityProvider
    // Add this function inside the ActivityProvider component before the value declaration
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

    // Dodaj implementację funkcji resetActivityStats w komponencie ActivityProvider
    // Dodaj tę funkcję przed deklaracją value
    const resetActivityStats = async (): Promise<boolean> => {
        try {
            console.log("[ACTIVITY][DEBUG] Resetting all activity statistics");

            const db = await openDatabase();
            const transaction = db.transaction("activities", "readwrite");
            const store = transaction.objectStore("activities");

            // Usuń wszystkie rekordy aktywności
            return new Promise((resolve, reject) => {
                const request = store.clear();

                request.onsuccess = () => {
                    console.log(
                        "[ACTIVITY][DEBUG] All activity statistics cleared successfully"
                    );

                    // Zresetuj liczniki
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

    // Function to register new activity (pause, interval or session)
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

    // Functions to register specific activity types
    const registerPause = () => registerActivity("pause");
    const registerInterval = () => registerActivity("interval");
    const registerSession = () => registerActivity("session");

    // Effect to load activity counts on initialization
    useEffect(() => {
        const loadActivityCounts = async () => {
            try {
                console.log("[ACTIVITY][DEBUG] Loading activity counts");

                const db = await openDatabase();
                const transaction = db.transaction("activities", "readonly");
                const store = transaction.objectStore("activities");
                const typeIndex = store.index("type");
                const today = formatDate(new Date());

                // Get total pause count
                const pauseCountRequest = typeIndex.count(
                    IDBKeyRange.only("pause")
                );

                pauseCountRequest.onsuccess = () => {
                    const totalPauseCount = pauseCountRequest.result;
                    console.log(
                        "[ACTIVITY][DEBUG] Total pause count:",
                        totalPauseCount
                    );
                    setPauseCount(totalPauseCount);

                    // Get today's pause count
                    const typeDateIndex = store.index("type_date");
                    const todayPauseCountRequest = typeDateIndex.count(
                        IDBKeyRange.only(["pause", today])
                    );

                    todayPauseCountRequest.onsuccess = () => {
                        const todayPauseCount = todayPauseCountRequest.result;
                        console.log(
                            "[ACTIVITY][DEBUG] Today's pause count:",
                            todayPauseCount
                        );
                        setTodayPauseCount(todayPauseCount);
                    };
                };

                // Get total interval count
                const intervalCountRequest = typeIndex.count(
                    IDBKeyRange.only("interval")
                );

                intervalCountRequest.onsuccess = () => {
                    const totalIntervalCount = intervalCountRequest.result;
                    console.log(
                        "[ACTIVITY][DEBUG] Total interval count:",
                        totalIntervalCount
                    );
                    setIntervalCount(totalIntervalCount);

                    // Get today's interval count
                    const typeDateIndex = store.index("type_date");
                    const todayIntervalCountRequest = typeDateIndex.count(
                        IDBKeyRange.only(["interval", today])
                    );

                    todayIntervalCountRequest.onsuccess = () => {
                        const todayIntervalCount =
                            todayIntervalCountRequest.result;
                        console.log(
                            "[ACTIVITY][DEBUG] Today's interval count:",
                            todayIntervalCount
                        );
                        setTodayIntervalCount(todayIntervalCount);
                    };
                };

                // Get total session count
                const sessionCountRequest = typeIndex.count(
                    IDBKeyRange.only("session")
                );

                sessionCountRequest.onsuccess = () => {
                    const totalSessionCount = sessionCountRequest.result;
                    console.log(
                        "[ACTIVITY][DEBUG] Total session count:",
                        totalSessionCount
                    );
                    setSessionCount(totalSessionCount);

                    // Get today's session count
                    const typeDateIndex = store.index("type_date");
                    const todaySessionCountRequest = typeDateIndex.count(
                        IDBKeyRange.only(["session", today])
                    );

                    todaySessionCountRequest.onsuccess = () => {
                        const todaySessionCount =
                            todaySessionCountRequest.result;
                        console.log(
                            "[ACTIVITY][DEBUG] Today's session count:",
                            todaySessionCount
                        );
                        setTodaySessionCount(todaySessionCount);
                    };
                };

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

    // Zaktualizuj obiekt value, dodając funkcję resetActivityStats
    const value = {
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
        resetActivityStats, // Dodana nowa funkcja
    };

    return (
        <ActivityContext.Provider value={value}>
            {children}
        </ActivityContext.Provider>
    );
}
