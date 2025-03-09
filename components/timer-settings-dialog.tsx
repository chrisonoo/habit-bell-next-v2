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

interface TimeValue {
    minutes: number;
    seconds: number;
}

interface TimerSettingsDialogProps {
    sessionDuration: TimeValue;
    intervalDuration: TimeValue;
    onSave: (sessionDuration: TimeValue, intervalDuration: TimeValue) => void;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onOpen?: () => void;
}

export function TimerSettingsDialog({
    sessionDuration,
    intervalDuration,
    onSave,
    isOpen,
    onOpenChange,
    onOpen,
}: TimerSettingsDialogProps) {
    const [session, setSession] = useState<TimeValue>(sessionDuration);
    const [interval, setInterval] = useState<TimeValue>(intervalDuration);

    // Aktualizuj lokalne stany, gdy zmienią się propsy
    useEffect(() => {
        setSession(sessionDuration);
        setInterval(intervalDuration);
    }, [sessionDuration, intervalDuration]);

    const handleSave = () => {
        onSave(session, interval);
        if (onOpenChange) {
            onOpenChange(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (open && onOpen) {
            onOpen();
        }
        if (onOpenChange) {
            onOpenChange(open);
        }
    };

    const handleSessionMinutesChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = Math.max(0, Math.min(120, Number(e.target.value)));
        setSession((prev) => ({ ...prev, minutes: value }));
    };

    const handleSessionSecondsChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = Math.max(0, Math.min(59, Number(e.target.value)));
        setSession((prev) => ({ ...prev, seconds: value }));
    };

    const handleIntervalMinutesChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = Math.max(0, Math.min(60, Number(e.target.value)));
        setInterval((prev) => ({ ...prev, minutes: value }));
    };

    const handleIntervalSecondsChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = Math.max(0, Math.min(59, Number(e.target.value)));
        setInterval((prev) => ({ ...prev, seconds: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            <DialogContent className="max-w-[360px]">
                <DialogHeader>
                    <DialogTitle>Timer Settings</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-base">Session Duration</Label>
                        <div className="flex items-center gap-2">
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
                    <div className="space-y-2">
                        <Label className="text-base">Interval Duration</Label>
                        <div className="flex items-center gap-2">
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
                <Button onClick={handleSave} className="w-full">
                    Save Settings
                </Button>
            </DialogContent>
        </Dialog>
    );
}
