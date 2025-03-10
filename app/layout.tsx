import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PauseProvider } from "@/contexts/pause-context";

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
        <html lang="en">
            <body className={inter.className}>
                <PauseProvider>{children}</PauseProvider>
            </body>
        </html>
    );
}
