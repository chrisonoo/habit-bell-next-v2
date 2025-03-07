"use client";

import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useEffect, useState } from "react";

interface TimerControlsProps {
    isRunning: boolean;
    onToggle: () => void;
    className?: string;
}

export function TimerControls({
    isRunning,
    onToggle,
    className,
}: TimerControlsProps) {
    // Lokalny stan do śledzenia stanu przycisku
    const [localIsRunning, setLocalIsRunning] = useState(isRunning);

    // Synchronizuj lokalny stan z propem
    useEffect(() => {
        setLocalIsRunning(isRunning);
    }, [isRunning]);

    // Obsługa kliknięcia z dodatkowym zabezpieczeniem
    const handleClick = () => {
        onToggle();
        // Nie aktualizujemy lokalnego stanu - to zrobi worker
    };

    return (
        <div className={className}>
            <Button
                variant="outline"
                size="lg"
                className="rounded-full h-16 w-16"
                onClick={handleClick}
                aria-label={localIsRunning ? "Pause timer" : "Start timer"}
            >
                {localIsRunning ? (
                    <Pause className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                ) : (
                    <Play className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                )}
            </Button>
        </div>
    );
}
