"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";

// Typy dla ustawień aplikacji
export type ThemeType = "light" | "dark";
export type LanguageType = "en" | "pl" | "no";

// Interfejs dla kontekstu ustawień aplikacji
interface AppSettingsContextType {
    theme: ThemeType;
    language: LanguageType;
    setTheme: (theme: ThemeType) => void;
    setLanguage: (language: LanguageType) => void;
}

// Domyślne wartości dla kontekstu
const defaultContext: AppSettingsContextType = {
    theme: "dark",
    language: "en",
    setTheme: () => {},
    setLanguage: () => {},
};

// Utworzenie kontekstu
const AppSettingsContext =
    createContext<AppSettingsContextType>(defaultContext);

// Hook do używania kontekstu ustawień aplikacji
export const useAppSettings = () => useContext(AppSettingsContext);

// Props dla providera kontekstu
interface AppSettingsProviderProps {
    children: ReactNode;
}

// Provider kontekstu ustawień aplikacji
export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
    // Inicjalizacja stanu z localStorage lub wartości domyślnych
    const [theme, setThemeState] = useState<ThemeType>("dark");
    const [language, setLanguageState] = useState<LanguageType>("en");

    // Efekt do ładowania ustawień z localStorage przy inicjalizacji
    useEffect(() => {
        // Sprawdzamy, czy jesteśmy w środowisku przeglądarki
        if (typeof window !== "undefined") {
            // Pobieramy zapisane ustawienia z localStorage
            const savedTheme = localStorage.getItem(
                "habit-bell-theme"
            ) as ThemeType | null;
            const savedLanguage = localStorage.getItem(
                "habit-bell-language"
            ) as LanguageType | null;

            // Ustawiamy stan na podstawie zapisanych ustawień lub wartości domyślnych
            if (savedTheme) {
                setThemeState(savedTheme);
            } else {
                // Jeśli nie ma zapisanego motywu, sprawdzamy preferencje systemowe
                const prefersDark = window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches;
                setThemeState(prefersDark ? "dark" : "light");
            }

            if (savedLanguage) {
                setLanguageState(savedLanguage);
            } else {
                // Jeśli nie ma zapisanego języka, próbujemy wykryć język przeglądarki
                const browserLanguage = navigator.language.toLowerCase();
                if (browserLanguage.startsWith("pl")) {
                    setLanguageState("pl");
                } else if (
                    browserLanguage.startsWith("no") ||
                    browserLanguage.startsWith("nb") ||
                    browserLanguage.startsWith("nn")
                ) {
                    setLanguageState("no");
                } else {
                    setLanguageState("en");
                }
            }
        }
    }, []);

    // Efekt do aplikowania motywu
    useEffect(() => {
        // Sprawdzamy, czy jesteśmy w środowisku przeglądarki
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            // Aplikujemy klasę dark do elementu html, jeśli motyw jest ciemny
            if (theme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
    }, [theme]);

    // Funkcja do zmiany motywu
    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
        // Zapisujemy nowy motyw w localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("habit-bell-theme", newTheme);
        }
    };

    // Funkcja do zmiany języka
    const setLanguage = (newLanguage: LanguageType) => {
        setLanguageState(newLanguage);
        // Zapisujemy nowy język w localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("habit-bell-language", newLanguage);
        }
    };

    // Wartość kontekstu
    const value = {
        theme,
        language,
        setTheme,
        setLanguage,
    };

    return (
        <AppSettingsContext.Provider value={value}>
            {children}
        </AppSettingsContext.Provider>
    );
}
