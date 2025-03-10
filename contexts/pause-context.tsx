"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";

// Interfejs dla pojedynczej pauzy
export interface PauseRecord {
    id?: number;
    timestamp: number; // Unix timestamp
    date: string; // Format YYYY-MM-DD dla łatwiejszego grupowania
}

// Interfejs dla kontekstu pauz
interface PauseContextType {
    pauseCount: number;
    todayPauseCount: number;
    registerPause: () => void;
}

// Domyślne wartości dla kontekstu
const defaultContext: PauseContextType = {
    pauseCount: 0,
    todayPauseCount: 0,
    registerPause: () => {},
};

// Utworzenie kontekstu
const PauseContext = createContext<PauseContextType>(defaultContext);

// Hook do używania kontekstu pauz
export const usePauseContext = () => useContext(PauseContext);

// Props dla providera kontekstu
interface PauseProviderProps {
    children: ReactNode;
}

// Provider kontekstu pauz
export function PauseProvider({ children }: PauseProviderProps) {
    // Stan dla liczby wszystkich pauz i pauz z dzisiejszego dnia
    const [pauseCount, setPauseCount] = useState(0);
    const [todayPauseCount, setTodayPauseCount] = useState(0);

    // Funkcja pomocnicza do formatowania daty w formacie YYYY-MM-DD
    const formatDate = (date: Date): string => {
        return date.toISOString().split("T")[0];
    };

    // Zmieńmy funkcję registerPause, aby używała bezpośrednio IndexedDB zamiast workera:

    // Funkcja do rejestrowania nowej pauzy
    const registerPause = async () => {
        try {
            console.log("[PAUSE][DEBUG] Registering new pause");
            const now = new Date();
            const pauseRecord: PauseRecord = {
                timestamp: now.getTime(),
                date: formatDate(now),
            };

            // Otwórz bazę danych
            const request = indexedDB.open("habit-bell-db", 2);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Sprawdź, czy store pauz już istnieje
                if (!db.objectStoreNames.contains("pauses")) {
                    // Utwórz nowy store dla pauz z auto-inkrementowanym kluczem
                    const pauseStore = db.createObjectStore("pauses", {
                        keyPath: "id",
                        autoIncrement: true,
                    });

                    // Dodaj indeks dla daty, aby ułatwić wyszukiwanie pauz z danego dnia
                    pauseStore.createIndex("date", "date", { unique: false });

                    console.log("[PAUSE][DEBUG] Created pauses store");
                }
            };

            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const transaction = db.transaction("pauses", "readwrite");
                const store = transaction.objectStore("pauses");

                const addRequest = store.add(pauseRecord);

                addRequest.onsuccess = () => {
                    console.log("[PAUSE][DEBUG] Pause saved successfully");
                    // Aktualizuj liczniki pauz
                    setPauseCount((prev) => prev + 1);
                    setTodayPauseCount((prev) => prev + 1);
                };

                addRequest.onerror = (event) => {
                    console.error("[PAUSE][DEBUG] Error saving pause:", event);
                };

                transaction.oncomplete = () => {
                    db.close();
                };
            };

            request.onerror = (event) => {
                console.error("[PAUSE][DEBUG] Error opening database:", event);
            };
        } catch (error) {
            console.error("[PAUSE][DEBUG] Error registering pause:", error);
        }
    };

    // Zmieńmy również funkcję loadPauseCounts, aby używała bezpośrednio IndexedDB:

    // Efekt do ładowania liczby pauz przy inicjalizacji
    useEffect(() => {
        const loadPauseCounts = async () => {
            try {
                console.log("[PAUSE][DEBUG] Loading pause counts");

                // Otwórz bazę danych
                const request = indexedDB.open("habit-bell-db", 2);

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;

                    // Sprawdź, czy store pauz już istnieje
                    if (!db.objectStoreNames.contains("pauses")) {
                        // Utwórz nowy store dla pauz z auto-inkrementowanym kluczem
                        const pauseStore = db.createObjectStore("pauses", {
                            keyPath: "id",
                            autoIncrement: true,
                        });

                        // Dodaj indeks dla daty, aby ułatwić wyszukiwanie pauz z danego dnia
                        pauseStore.createIndex("date", "date", {
                            unique: false,
                        });

                        console.log("[PAUSE][DEBUG] Created pauses store");
                    }
                };

                request.onsuccess = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    const transaction = db.transaction("pauses", "readonly");
                    const store = transaction.objectStore("pauses");

                    // Pobierz całkowitą liczbę pauz
                    const countRequest = store.count();

                    countRequest.onsuccess = () => {
                        const totalCount = countRequest.result;
                        console.log(
                            "[PAUSE][DEBUG] Total pause count:",
                            totalCount
                        );
                        setPauseCount(totalCount);

                        // Pobierz liczbę pauz z dzisiejszego dnia
                        const today = formatDate(new Date());
                        const index = store.index("date");
                        const todayCountRequest = index.count(
                            IDBKeyRange.only(today)
                        );

                        todayCountRequest.onsuccess = () => {
                            const todayCount = todayCountRequest.result;
                            console.log(
                                "[PAUSE][DEBUG] Today's pause count:",
                                todayCount
                            );
                            setTodayPauseCount(todayCount);
                        };
                    };

                    transaction.oncomplete = () => {
                        db.close();
                    };
                };

                request.onerror = (event) => {
                    console.error(
                        "[PAUSE][DEBUG] Error opening database:",
                        event
                    );
                };
            } catch (error) {
                console.error(
                    "[PAUSE][DEBUG] Error loading pause counts:",
                    error
                );
            }
        };

        loadPauseCounts();
    }, []);

    // Wartość kontekstu
    const value = {
        pauseCount,
        todayPauseCount,
        registerPause,
    };

    return (
        <PauseContext.Provider value={value}>{children}</PauseContext.Provider>
    );
}
