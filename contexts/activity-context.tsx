"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";

// Interfejs dla pojedynczej aktywności (pauza lub interwał)
export interface ActivityRecord {
    id?: number;
    type: "pause" | "interval"; // Typ aktywności
    timestamp: number; // Unix timestamp
    date: string; // Format YYYY-MM-DD dla łatwiejszego grupowania
}

// Interfejs dla kontekstu aktywności
interface ActivityContextType {
    pauseCount: number;
    todayPauseCount: number;
    intervalCount: number;
    todayIntervalCount: number;
    registerPause: () => void;
    registerInterval: () => void;
}

// Domyślne wartości dla kontekstu
const defaultContext: ActivityContextType = {
    pauseCount: 0,
    todayPauseCount: 0,
    intervalCount: 0,
    todayIntervalCount: 0,
    registerPause: () => {},
    registerInterval: () => {},
};

// Utworzenie kontekstu
const ActivityContext = createContext<ActivityContextType>(defaultContext);

// Hook do używania kontekstu aktywności
export const useActivityContext = () => useContext(ActivityContext);

// Props dla providera kontekstu
interface ActivityProviderProps {
    children: ReactNode;
}

// Provider kontekstu aktywności
export function ActivityProvider({ children }: ActivityProviderProps) {
    // Stan dla liczby wszystkich pauz i pauz z dzisiejszego dnia
    const [pauseCount, setPauseCount] = useState(0);
    const [todayPauseCount, setTodayPauseCount] = useState(0);

    // Stan dla liczby wszystkich interwałów i interwałów z dzisiejszego dnia
    const [intervalCount, setIntervalCount] = useState(0);
    const [todayIntervalCount, setTodayIntervalCount] = useState(0);

    // Funkcja pomocnicza do formatowania daty w formacie YYYY-MM-DD
    const formatDate = (date: Date): string => {
        return date.toISOString().split("T")[0];
    };

    // Funkcja do otwierania bazy danych
    const openDatabase = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("habit-bell-db", 2);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Sprawdź, czy store activities już istnieje
                if (!db.objectStoreNames.contains("activities")) {
                    // Utwórz nowy store dla aktywności z auto-inkrementowanym kluczem
                    const activityStore = db.createObjectStore("activities", {
                        keyPath: "id",
                        autoIncrement: true,
                    });

                    // Dodaj indeksy dla typu i daty, aby ułatwić wyszukiwanie aktywności
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

                // Upewnij się, że store settings istnieje
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

    // Funkcja do rejestrowania nowej aktywności (pauzy lub interwału)
    const registerActivity = async (type: "pause" | "interval") => {
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

                // Aktualizuj odpowiednie liczniki w zależności od typu aktywności
                if (type === "pause") {
                    setPauseCount((prev) => prev + 1);
                    setTodayPauseCount((prev) => prev + 1);
                } else if (type === "interval") {
                    setIntervalCount((prev) => prev + 1);
                    setTodayIntervalCount((prev) => prev + 1);
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

    // Funkcje do rejestrowania konkretnych typów aktywności
    const registerPause = () => registerActivity("pause");
    const registerInterval = () => registerActivity("interval");

    // Efekt do ładowania liczby aktywności przy inicjalizacji
    useEffect(() => {
        const loadActivityCounts = async () => {
            try {
                console.log("[ACTIVITY][DEBUG] Loading activity counts");

                const db = await openDatabase();
                const transaction = db.transaction("activities", "readonly");
                const store = transaction.objectStore("activities");
                const typeIndex = store.index("type");
                const today = formatDate(new Date());

                // Pobierz całkowitą liczbę pauz
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

                    // Pobierz liczbę pauz z dzisiejszego dnia
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

                // Pobierz całkowitą liczbę interwałów
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

                    // Pobierz liczbę interwałów z dzisiejszego dnia
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

    // Wartość kontekstu
    const value = {
        pauseCount,
        todayPauseCount,
        intervalCount,
        todayIntervalCount,
        registerPause,
        registerInterval,
    };

    return (
        <ActivityContext.Provider value={value}>
            {children}
        </ActivityContext.Provider>
    );
}
