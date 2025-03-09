"use client";

import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Props for the TimerControls component
 * @interface TimerControlsProps
 * @property {boolean} isRunning - Whether the timer is currently running
 * @property {function} onToggle - Function to call when the play/pause button is clicked
 * @property {string} [className] - Optional CSS class name for styling
 */
interface TimerControlsProps {
    isRunning: boolean;
    onToggle: () => void;
    className?: string;
}

/**
 * TimerControls Component
 *
 * This component renders the play/pause button for controlling the timer.
 * It maintains a local state that mirrors the isRunning prop to ensure
 * the UI is always in sync with the actual timer state.
 *
 * @param {TimerControlsProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
export function TimerControls({
    isRunning,
    onToggle,
    className,
}: TimerControlsProps) {
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
        onToggle();
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
                aria-label={localIsRunning ? "Pause timer" : "Start timer"}
            >
                {/* Show different icon based on timer state */}
                {localIsRunning ? (
                    <Pause className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                ) : (
                    <Play className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                )}
            </Button>
        </div>
    );
}
