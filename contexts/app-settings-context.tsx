"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import type { Locale } from "@/config";

// Types for application settings
export type ThemeType = "light" | "dark";
export type LanguageType = Locale;

// Interface for application settings context
interface AppSettingsContextType {
    theme: ThemeType;
    language: LanguageType;
    setTheme: (theme: ThemeType) => void;
    setLanguage: (language: LanguageType) => void;
}

// Default values for context - setting dark as default
const defaultContext: AppSettingsContextType = {
    theme: "dark",
    language: "en",
    setTheme: () => {},
    setLanguage: () => {},
};

// Create context
const AppSettingsContext =
    createContext<AppSettingsContextType>(defaultContext);

// Hook for using application settings context
export const useAppSettings = () => useContext(AppSettingsContext);

// Props for context provider
interface AppSettingsProviderProps {
    children: ReactNode;
}

// Application settings context provider
export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale() as LanguageType;

    // Initialize state from localStorage or default values
    // We use dark theme by default
    const [theme, setThemeState] = useState<ThemeType>("dark");
    const [language, setLanguageState] = useState<LanguageType>(locale);

    // Effect to load settings from localStorage on initialization
    useEffect(() => {
        // Check if we're in browser environment
        if (typeof window !== "undefined") {
            // Get saved settings from localStorage
            const savedTheme = localStorage.getItem(
                "habit-bell-theme"
            ) as ThemeType | null;
            const savedLanguage = localStorage.getItem(
                "habit-bell-language"
            ) as LanguageType | null;

            // Set state based on saved settings or default values
            if (savedTheme) {
                setThemeState(savedTheme);
            } else {
                // If no saved theme, use dark as default
                setThemeState("dark");
            }

            if (savedLanguage && savedLanguage !== locale) {
                // If saved language differs from URL locale, update URL
                const newPathname = pathname.replace(
                    `/${locale}`,
                    `/${savedLanguage}`
                );
                router.push(newPathname);
            } else if (!savedLanguage) {
                // If no saved language, try to detect browser language
                const browserLanguage = navigator.language.toLowerCase();
                let detectedLanguage: LanguageType = "en";

                if (browserLanguage.startsWith("pl")) {
                    detectedLanguage = "pl";
                } else if (
                    browserLanguage.startsWith("no") ||
                    browserLanguage.startsWith("nb") ||
                    browserLanguage.startsWith("nn")
                ) {
                    detectedLanguage = "no";
                }

                setLanguageState(detectedLanguage);
                localStorage.setItem("habit-bell-language", detectedLanguage);

                if (detectedLanguage !== locale) {
                    const newPathname = pathname.replace(
                        `/${locale}`,
                        `/${detectedLanguage}`
                    );
                    router.push(newPathname);
                }
            }
        }
    }, [locale, pathname, router]);

    // Effect to apply theme
    useEffect(() => {
        // Check if we're in browser environment
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            // Apply dark class to html element if theme is dark
            if (theme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
    }, [theme]);

    // Function to change theme
    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
        // Save new theme in localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("habit-bell-theme", newTheme);
        }
    };

    // Function to change language
    const setLanguage = (newLanguage: LanguageType) => {
        setLanguageState(newLanguage);
        // Save new language in localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("habit-bell-language", newLanguage);

            // Update URL to reflect language change
            if (newLanguage !== locale) {
                const newPathname = pathname.replace(
                    `/${locale}`,
                    `/${newLanguage}`
                );
                router.push(newPathname);
            }
        }
    };

    // Context value
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
