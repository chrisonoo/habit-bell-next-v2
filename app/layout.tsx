import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ActivityProvider } from "@/contexts/activity-context";
// Dodaj import dla AppSettingsProvider
import { AppSettingsProvider } from "@/contexts/app-settings-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Habit Bell",
    description: "A Pomodoro-style timer to help build habits",
    generator: "v0.dev",
};

// Zaktualizuj funkcję RootLayout, owijając children w AppSettingsProvider
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AppSettingsProvider>
                    <ActivityProvider>{children}</ActivityProvider>
                </AppSettingsProvider>
            </body>
        </html>
    );
}
