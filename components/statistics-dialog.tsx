"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    CircleDollarSign,
    CirclePause,
    Flag,
    ArrowUpDown,
    X,
} from "lucide-react";
import {
    useActivityContext,
    type DailyStats,
} from "@/contexts/activity-context";
import { cn } from "@/lib/utils";

/**
 * Props for the StatisticsDialog component
 * @interface StatisticsDialogProps
 * @property {boolean} isOpen - Whether the dialog is currently open
 * @property {function} onOpenChange - Function to call when the dialog open state changes
 */
interface StatisticsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * StatisticsDialog Component
 *
 * This component displays a fullscreen dialog with daily statistics
 * including sessions, intervals, and pauses.
 *
 * @param {StatisticsDialogProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
export function StatisticsDialog({
    isOpen,
    onOpenChange,
}: StatisticsDialogProps) {
    // Get the getActivityStats function from the context
    const { getActivityStats } = useActivityContext();

    // State for storing the statistics data
    const [stats, setStats] = useState<DailyStats[]>([]);

    // State for tracking the sort direction
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    // State for tracking loading status
    const [isLoading, setIsLoading] = useState(false);

    // Load statistics data when the dialog is opened
    useEffect(() => {
        if (isOpen) {
            loadStats();
        }
    }, [isOpen]);

    /**
     * Load statistics data from IndexedDB
     */
    const loadStats = async () => {
        try {
            setIsLoading(true);
            const data = await getActivityStats();

            // Sort the data by date
            const sortedData = sortStatsByDate(data, sortDirection);
            setStats(sortedData);
        } catch (error) {
            console.error("Error loading statistics:", error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Sort statistics data by date
     * @param {DailyStats[]} data - The data to sort
     * @param {"asc" | "desc"} direction - The sort direction
     * @returns {DailyStats[]} The sorted data
     */
    const sortStatsByDate = (
        data: DailyStats[],
        direction: "asc" | "desc"
    ): DailyStats[] => {
        return [...data].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return direction === "asc" ? dateA - dateB : dateB - dateA;
        });
    };

    /**
     * Toggle the sort direction
     */
    const toggleSortDirection = () => {
        const newDirection = sortDirection === "asc" ? "desc" : "asc";
        setSortDirection(newDirection);
        setStats(sortStatsByDate(stats, newDirection));
    };

    /**
     * Format a date string to a more readable format
     * @param {string} dateStr - The date string in YYYY-MM-DD format
     * @returns {string} The formatted date string
     */
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    /**
     * Check if a date is today
     * @param {string} dateStr - The date string in YYYY-MM-DD format
     * @returns {boolean} Whether the date is today
     */
    const isToday = (dateStr: string): boolean => {
        const today = new Date();
        const date = new Date(dateStr);
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-full h-full sm:h-[90vh] sm:max-h-[90vh] sm:max-w-[90vw] p-0 flex flex-col">
                <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10 flex-row items-center justify-between">
                    <DialogTitle className="text-xl">
                        Daily Statistics
                    </DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <p>Loading statistics...</p>
                        </div>
                    ) : stats.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p>No statistics available yet.</p>
                        </div>
                    ) : (
                        <div className="w-full">
                            {/* Table header */}
                            <div className="grid grid-cols-4 gap-4 mb-4 font-semibold border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-1 h-auto"
                                        onClick={toggleSortDirection}
                                    >
                                        <span>Date</span>
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <CircleDollarSign className="h-4 w-4" />
                                    <span>Sessions</span>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <Flag className="h-4 w-4" />
                                    <span>Intervals</span>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <CirclePause className="h-4 w-4" />
                                    <span>Pauses</span>
                                </div>
                            </div>

                            {/* Table rows */}
                            {stats.map((stat) => (
                                <div
                                    key={stat.date}
                                    className={cn(
                                        "grid grid-cols-4 gap-4 py-3 border-b",
                                        isToday(stat.date) && "bg-primary/5"
                                    )}
                                >
                                    <div className="flex items-center">
                                        <span
                                            className={cn(
                                                isToday(stat.date) &&
                                                    "font-semibold"
                                            )}
                                        >
                                            {formatDate(stat.date)}
                                            {isToday(stat.date) && " (Today)"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        {stat.sessions}
                                    </div>
                                    <div className="flex items-center justify-center">
                                        {stat.intervals}
                                    </div>
                                    <div className="flex items-center justify-center">
                                        {stat.pauses}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
