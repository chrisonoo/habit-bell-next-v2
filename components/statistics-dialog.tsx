"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    CircleDollarSign,
    CirclePause,
    Flag,
    ArrowUpDown,
    X,
    RotateCcw,
} from "lucide-react";
import {
    useActivityContext,
    type DailyStats,
} from "@/contexts/activity-context";

/**
 * Props for the StatisticsDialog component
 * @interface StatisticsDialogProps
 * @property {boolean} isOpen - Whether the dialog is currently open
 * @property {function} onOpenChange - Function to call when the dialog open state changes
 * @property {string} [key] - Optional key for forcing re-renders
 */
interface StatisticsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    key?: string;
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
    const { getActivityStats, resetActivityStats } = useActivityContext();

    // State for storing the statistics data
    const [stats, setStats] = useState<DailyStats[]>([]);

    // State for tracking the sort direction
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    // State for tracking loading status
    const [isLoading, setIsLoading] = useState(false);

    // State for alert dialog
    const [isAlertOpen, setIsAlertOpen] = useState(false);

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
     * Reset all activity statistics
     */
    const handleResetStats = async () => {
        try {
            setIsLoading(true);
            const success = await resetActivityStats();

            if (success) {
                // Reload stats (should be empty now)
                setStats([]);
            }
        } catch (error) {
            console.error("Error resetting statistics:", error);
        } finally {
            setIsLoading(false);
            setIsAlertOpen(false);
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
            // Ensure we're comparing valid date strings in YYYY-MM-DD format
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
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

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-full h-[100dvh] sm:h-[100dvh] sm:max-h-[100dvh] sm:max-w-[100vw] p-0 flex flex-col rounded-none border-none">
                <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10 flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DialogTitle className="text-xl">
                            Daily Statistics
                        </DialogTitle>
                        <AlertDialog
                            open={isAlertOpen}
                            onOpenChange={setIsAlertOpen}
                        >
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <RotateCcw className="ml-4 h-4 w-4" />
                                    <span className="sr-only">
                                        Reset Statistics
                                    </span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[320px] lg:max-w-[360px]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Reset Statistics
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete all your
                                        activity statistics. This action cannot
                                        be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleResetStats}
                                        className="!bg-destructive !text-destructive-foreground !hover:bg-destructive/90"
                                    >
                                        Reset
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
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
                            {/* Table header - Reduced font size for mobile */}
                            <div className="grid grid-cols-4 gap-2 mb-4 font-semibold border-b pb-2">
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-1 h-auto"
                                        onClick={toggleSortDirection}
                                    >
                                        <span className="text-xs sm:text-sm">
                                            Date
                                        </span>
                                        <ArrowUpDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <CircleDollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm">
                                        Sessions
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm">
                                        Intervals
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <CirclePause className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm">
                                        Pauses
                                    </span>
                                </div>
                            </div>

                            {/* Table rows */}
                            {stats.map((stat) => (
                                <div
                                    key={stat.date}
                                    className="grid grid-cols-4 gap-2 py-3 border-b"
                                >
                                    <div className="flex items-center">
                                        <span className="text-xs sm:text-sm">
                                            {stat.date}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-center text-xs sm:text-sm">
                                        {stat.sessions}
                                    </div>
                                    <div className="flex items-center justify-center text-xs sm:text-sm">
                                        {stat.intervals}
                                    </div>
                                    <div className="flex items-center justify-center text-xs sm:text-sm">
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
