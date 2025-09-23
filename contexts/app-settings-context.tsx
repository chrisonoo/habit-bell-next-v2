"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useParams } from "next/navigation";
import type { Locale } from "@/config";

/**
 * Defines the possible theme types for the application.
 */
export type ThemeType = "light" | "dark";

/**
 * Defines the possible language (locale) types for the application.
 * It is based on the `Locale` type from the application's configuration.
 */
export type LanguageType = Locale;

/**
 * Defines the shape of the App Settings Context.
 * It includes the current theme and language, and functions to update them.
 */
interface AppSettingsContextType {
    /** @property {ThemeType} theme - The current active theme ('light' or 'dark'). */
    theme: ThemeType;
    /** @property {LanguageType} language - The current active language (e.g., 'en', 'pl'). */
    language: LanguageType;
    /**
     * A function to set a new theme.
     * @param {ThemeType} theme - The new theme to apply.
     */
    setTheme: (theme: ThemeType) => void;
    /**
     * A function to set a new language.
     * @param {LanguageType} language - The new language to apply.
     */
    setLanguage: (language: LanguageType) => void;
}

/**
 * The default state for the AppSettingsContext.
 * Provides default values to prevent errors when the context is used without a provider.
 */
const defaultContext: AppSettingsContextType = {
    theme: "dark", // Dark theme is the default
    language: "en",
    setTheme: () => {},
    setLanguage: () => {},
};

/**
 * The React Context object for application settings.
 */
const AppSettingsContext =
    createContext<AppSettingsContextType>(defaultContext);

/**
 * A custom hook to easily access the AppSettingsContext.
 * @returns The app settings context.
 */
export const useAppSettings = () => useContext(AppSettingsContext);

/**
 * Defines the props for the AppSettingsProvider component.
 */
interface AppSettingsProviderProps {
    /** @property {ReactNode} children - The child components that will have access to this context. */
    children: ReactNode;
}

/**
 * The provider component for the AppSettingsContext.
 * It manages the application's theme and language, persisting them to localStorage
 * and synchronizing the language with the URL path.
 */
export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const locale = (params.locale as string) || "en";

    // State for the current theme. Default is 'dark'.
    const [theme, setThemeState] = useState<ThemeType>("dark");
    // State for the current language, initialized from the URL locale.
    const [language, setLanguageState] = useState<LanguageType>(
        locale as LanguageType
    );

    /**
     * An effect hook that runs on component mount and when the locale changes.
     * It loads the theme and language from localStorage.
     * If no settings are found, it defaults the theme to 'dark' and attempts to
     * detect the browser language, updating the URL if necessary.
     */
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Load theme from localStorage or default to 'dark'
        const savedTheme = localStorage.getItem(
            "habit-bell-theme"
        ) as ThemeType | null;
        setThemeState(savedTheme || "dark");

        // Load language from localStorage
        const savedLanguage = localStorage.getItem(
            "habit-bell-language"
        ) as LanguageType | null;

        if (savedLanguage && savedLanguage !== locale) {
            // If a language is saved and it differs from the URL, redirect to the saved language
            const newPathname = pathname.replace(
                `/${locale}`,
                `/${savedLanguage}`
            );
            router.push(newPathname);
        } else if (!savedLanguage) {
            // If no language is saved, detect from browser and set it
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

            // If detected language is different from URL, redirect
            if (detectedLanguage !== locale) {
                const newPathname = pathname.replace(
                    `/${locale}`,
                    `/${detectedLanguage}`
                );
                router.push(newPathname);
            }
        }
    }, [locale, pathname, router]);

    /**
     * An effect hook that applies the current theme to the document.
     * It adds or removes the 'dark' class from the <html> element.
     */
    useEffect(() => {
        if (typeof document === "undefined") return;

        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

    /**
     * Updates the application's theme and saves it to localStorage.
     * @param {ThemeType} newTheme - The new theme to set.
     */
    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
        // Save new theme in localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("habit-bell-theme", newTheme);
        }
    };

    /**
     * Updates the application's language, saves it to localStorage,
     * and updates the URL to reflect the new locale.
     * @param {LanguageType} newLanguage - The new language to set.
     */
    const setLanguage = (newLanguage: LanguageType) => {
        setLanguageState(newLanguage);

        if (typeof window !== "undefined") {
            localStorage.setItem("habit-bell-language", newLanguage);

            // Update the URL path if the locale has changed
            if (newLanguage !== locale) {
                const newPathname = pathname.replace(
                    `/${locale}`,
                    `/${newLanguage}`
                );
                router.push(newPathname);
            }
        }
    };

    // The value provided to the context consumers.
    const value: AppSettingsContextType = {
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
