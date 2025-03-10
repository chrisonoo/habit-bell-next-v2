export const locales = ["en", "pl", "no"] as const;
export const defaultLocale = "en" as const;

export type Locale = (typeof locales)[number];
