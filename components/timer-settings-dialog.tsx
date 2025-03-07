"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlignJustify } from "lucide-react";

interface TimerSettingsDialogProps {
    sessionDuration: number;
    intervalDuration: number;
    onSave: (sessionDuration: number, intervalDuration: number) => void;
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
    const [session, setSession] = useState(sessionDuration);
    const [interval, setInterval] = useState(intervalDuration);

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

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 z-10 h-14 w-14 "
                >
                    <AlignJustify className="!h-8 !w-8" />
                    <span className="sr-only">Settings</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Timer Settings</DialogTitle>
                    <DialogDescription>
                        Configure your session and interval durations for the
                        Habit Bell timer.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="session" className="col-span-2">
                            Session Duration (minutes)
                        </Label>
                        <Input
                            id="session"
                            type="number"
                            min="1"
                            max="120"
                            value={session}
                            onChange={(e) => setSession(Number(e.target.value))}
                            className="col-span-2"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="interval" className="col-span-2">
                            Interval Duration (minutes)
                        </Label>
                        <Input
                            id="interval"
                            type="number"
                            min="1"
                            max="60"
                            value={interval}
                            onChange={(e) =>
                                setInterval(Number(e.target.value))
                            }
                            className="col-span-2"
                        />
                    </div>
                </div>
                <Button onClick={handleSave}>Save Settings</Button>
            </DialogContent>
        </Dialog>
    );
}
