import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import "../globals.css";
import { ActivityProvider } from "@/contexts/activity-context";
import { AppSettingsProvider } from "@/contexts/app-settings-context";
import { locales } from "@/config";
import { setRequestLocale } from "next-intl/server";

const inter = Inter({ subsets: ["latin"] });

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
    title: "Habit Bell",
    description: "A Pomodoro-style timer to help build habits",
    generator: "v0.dev",
};

export default async function RootLayout({
    children,
    params: { locale },
}: Readonly<{
    children: React.ReactNode;
    params: { locale: string };
}>) {
    // Ustawiamy locale dla statycznego renderowania
    setRequestLocale(locale);

    // Validate that the incoming `locale` parameter is valid
    if (!locales.includes(locale as any)) {
        notFound();
    }

    // Load messages for the current locale
    let messages;
    try {
        messages = (await import(`../../messages/${locale}.json`)).default;
    } catch (error) {
        notFound();
    }

    return (
        // Add dark class to html to use dark theme by default
        <html lang={locale} className="dark">
            <body className={inter.className}>
                <NextIntlClientProvider
                    locale={locale}
                    messages={messages}
                    timeZone="UTC"
                >
                    <AppSettingsProvider>
                        <ActivityProvider>{children}</ActivityProvider>
                    </AppSettingsProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
