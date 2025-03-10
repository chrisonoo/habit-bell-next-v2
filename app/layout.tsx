import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ActivityProvider } from "@/contexts/activity-context";
import { AppSettingsProvider } from "@/contexts/app-settings-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Habit Bell",
    description: "A Pomodoro-style timer to help build habits",
    generator: "v0.dev",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // Dodajemy klasę dark do html, aby domyślnie używać ciemnego motywu
        <html lang="en" className="dark">
            <body className={inter.className}>
                <AppSettingsProvider>
                    <ActivityProvider>{children}</ActivityProvider>
                </AppSettingsProvider>
            </body>
        </html>
    );
}
