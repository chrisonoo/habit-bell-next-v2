import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { ActivityProvider } from "@/contexts/activity-context";
import { AppSettingsProvider } from "@/contexts/app-settings-context";
import { locales } from "@/config";

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
    // Validate that the incoming `locale` parameter is valid
    if (!locales.includes(locale as any)) {
        notFound();
    }

    return (
        // Add dark class to html to use dark theme by default
        <html lang={locale} className="dark">
            <body className={inter.className}>
                <AppSettingsProvider>
                    <ActivityProvider>{children}</ActivityProvider>
                </AppSettingsProvider>
            </body>
        </html>
    );
}
