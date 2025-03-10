"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EllipsisVertical } from "lucide-react";

/**
 * Interface for time values (minutes and seconds)
 * This is used for the UI representation of time
 */
interface TimeValue {
    minutes: number; // Minutes component of the time
    seconds: number; // Seconds component of the time
}

/**
 * Props for the TimerSettingsDialog component
 * @interface TimerSettingsDialogProps
 * @property {TimeValue} sessionDuration - Current session duration in minutes and seconds
 * @property {TimeValue} intervalDuration - Current interval duration in minutes and seconds
 * @property {function} onSave - Function to call when settings are saved
 * @property {boolean} [isOpen] - Whether the dialog is currently open
 * @property {function} [onOpenChange] - Function to call when the dialog open state changes
 * @property {function} [onOpen] - Function to call when the dialog is opened
 */
interface TimerSettingsDialogProps {
    sessionDuration: TimeValue;
    intervalDuration: TimeValue;
    onSave: (sessionDuration: TimeValue, intervalDuration: TimeValue) => void;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onOpen?: () => void;
}

/**
 * TimerSettingsDialog Component
 *
 * This component renders a dialog for configuring timer settings.
 * It allows the user to set the duration of sessions and intervals
 * in minutes and seconds.
 *
 * The component maintains local state for the settings while the dialog
 * is open, and only applies the changes when the user clicks Save.
 *
 * @param {TimerSettingsDialogProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
export function TimerSettingsDialog({
    sessionDuration,
    intervalDuration,
    onSave,
    isOpen,
    onOpenChange,
    onOpen,
}: TimerSettingsDialogProps) {
    // Local state for session duration
    // This allows the user to modify the value without immediately applying it
    const [session, setSession] = useState<TimeValue>(sessionDuration);

    // Local state for interval duration
    // This allows the user to modify the value without immediately applying it
    const [interval, setInterval] = useState<TimeValue>(intervalDuration);

    // Update local states when props change
    // This ensures the dialog shows the current settings when opened
    useEffect(() => {
        setSession(sessionDuration);
        setInterval(intervalDuration);
    }, [sessionDuration, intervalDuration]);

    /**
     * Handle save button click
     * This applies the changes and closes the dialog
     */
    const handleSave = () => {
        // Call the onSave callback with the new values
        onSave(session, interval);

        // Close the dialog if onOpenChange is provided
        if (onOpenChange) {
            onOpenChange(false);
        }
    };

    /**
     * Handle dialog open state change
     * This calls the appropriate callbacks based on the new state
     * @param {boolean} open - New open state
     */
    const handleOpenChange = (open: boolean) => {
        // If the dialog is being opened and onOpen is provided, call it
        if (open && onOpen) {
            onOpen();
        }

        // Call the onOpenChange callback if provided
        if (onOpenChange) {
            onOpenChange(open);
        }
    };

    /**
     * Handle session minutes input change
     * This updates the local state with the new value
     * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
     */
    const handleSessionMinutesChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        // Parse the value and clamp it between 0 and 120
        const value = Math.max(0, Math.min(120, Number(e.target.value)));

        // Update the session state, preserving the seconds value
        setSession((prev) => ({ ...prev, minutes: value }));
    };

    /**
     * Handle session seconds input change
     * This updates the local state with the new value
     * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
     */
    const handleSessionSecondsChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        // Parse the value and clamp it between 0 and 59
        const value = Math.max(0, Math.min(59, Number(e.target.value)));

        // Update the session state, preserving the minutes value
        setSession((prev) => ({ ...prev, seconds: value }));
    };

    /**
     * Handle interval minutes input change
     * This updates the local state with the new value
     * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
     */
    const handleIntervalMinutesChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        // Parse the value and clamp it between 0 and 60
        const value = Math.max(0, Math.min(60, Number(e.target.value)));

        // Update the interval state, preserving the seconds value
        setInterval((prev) => ({ ...prev, minutes: value }));
    };

    /**
     * Handle interval seconds input change
     * This updates the local state with the new value
     * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
     */
    const handleIntervalSecondsChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        // Parse the value and clamp it between 0 and 59
        const value = Math.max(0, Math.min(59, Number(e.target.value)));

        // Update the interval state, preserving the minutes value
        setInterval((prev) => ({ ...prev, seconds: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {/* Dialog Trigger Button */}
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 lg:h-14 lg:w-14"
                >
                    <EllipsisVertical className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                    <span className="sr-only">Settings</span>
                </Button>
            </DialogTrigger>

            {/* Dialog Content */}
            <DialogContent className="max-w-[320px] lg:max-w-[360px]">
                <DialogHeader>
                    <DialogTitle>Timer Settings</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>

                {/* Settings Form */}
                <div className="grid gap-4 py-2">
                    {/* Session Duration Settings */}
                    <div className="space-y-2">
                        <Label className="text-base">Session Duration</Label>
                        <div className="flex items-center gap-2">
                            {/* Minutes Input */}
                            <div className="flex-1 flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={session.minutes}
                                    onChange={handleSessionMinutesChange}
                                    className="w-full"
                                />
                                <span className="text-sm">min</span>
                            </div>

                            {/* Seconds Input */}
                            <div className="flex-1 flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={session.seconds}
                                    onChange={handleSessionSecondsChange}
                                    className="w-full"
                                />
                                <span className="text-sm">sec</span>
                            </div>
                        </div>
                    </div>

                    {/* Interval Duration Settings */}
                    <div className="space-y-2">
                        <Label className="text-base">Interval Duration</Label>
                        <div className="flex items-center gap-2">
                            {/* Minutes Input */}
                            <div className="flex-1 flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={interval.minutes}
                                    onChange={handleIntervalMinutesChange}
                                    className="w-full"
                                />
                                <span className="text-sm">min</span>
                            </div>

                            {/* Seconds Input */}
                            <div className="flex-1 flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={interval.seconds}
                                    onChange={handleIntervalSecondsChange}
                                    className="w-full"
                                />
                                <span className="text-sm">sec</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <Button onClick={handleSave} className="w-full">
                    Save Settings
                </Button>
            </DialogContent>
        </Dialog>
    );
}
