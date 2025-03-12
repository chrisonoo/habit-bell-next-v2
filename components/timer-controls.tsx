"use client";

import { Button } from "@/components/ui/button";
import { Play, Pause, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Props for the TimerControls component
 * @interface TimerControlsProps
 * @property {boolean} isRunning - Whether the timer is currently running
 * @property {boolean} isSessionEnded - Whether the session has ended
 * @property {boolean} isPlayingSound - Whether the session has ended
 * @property {function} onToggle - Function to call when the play/pause button is clicked
 * @property {function} onReset - Function to call when the reset button is clicked
 * @property {string} [className] - Optional CSS class name for styling
 */
interface TimerControlsProps {
    isRunning: boolean;
    isSessionEnded: boolean;
    isPlayingSound: boolean; // New property
    onToggle: () => void;
    onReset: () => void;
    className?: string;
}

/**
 * TimerControls Component
 *
 * This component renders the play/pause button for controlling the timer.
 * It maintains a local state that mirrors the isRunning prop to ensure
 * the UI is always in sync with the actual timer state.
 * When the session ends, it displays a reset button instead.
 * The button is disabled during the end sequence playback but enabled during the waiting sequence.
 *
 * @param {TimerControlsProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
export function TimerControls({
    isRunning,
    isSessionEnded,
    isPlayingSound,
    onToggle,
    onReset,
    className,
}: TimerControlsProps) {
    // Get translations
    let t;

    t = useTranslations("timer");

    // Local state to track button state
    // This provides an additional layer of state management to ensure UI consistency
    const [localIsRunning, setLocalIsRunning] = useState(isRunning);

    // Synchronize local state with prop
    // This ensures the button always reflects the actual timer state
    useEffect(() => {
        setLocalIsRunning(isRunning);
    }, [isRunning]);

    // Handle click with additional protection
    // We delegate the actual state change to the parent component via onToggle
    const handleClick = () => {
        if (isSessionEnded) {
            onReset();
        } else {
            onToggle();
        }
        // We don't update local state here - the worker will do that
        // and the change will propagate back through props
    };

    return (
        <div className={className}>
            <Button
                variant="outline"
                size="lg"
                className="rounded-full h-16 w-16"
                onClick={handleClick}
                disabled={isPlayingSound} // Disable button while playing sound
                aria-label={
                    isSessionEnded
                        ? t("reset")
                        : localIsRunning
                        ? t("pause")
                        : t("start")
                }
            >
                {/* Show different icon based on timer state */}
                {isSessionEnded ? (
                    <TimerReset className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                ) : localIsRunning ? (
                    <Pause className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                ) : (
                    <Play className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                )}
            </Button>
        </div>
    );
}
