"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
 * Defines the props for the StatisticsDialog component.
 */
interface StatisticsDialogProps {
    /** @property {boolean} isOpen - Controls whether the dialog is visible. */
    isOpen: boolean;
    /** @property {(open: boolean) => void} onOpenChange - Callback function invoked when the dialog's open state changes. */
    onOpenChange: (open: boolean) => void;
    /** @property {string} [key] - An optional key to force re-renders of the component. */
    key?: string;
}

/**
 * A fullscreen dialog component that displays historical activity statistics.
 * It fetches data from the `ActivityContext` and presents it in a sortable table.
 * It also provides an option to reset all statistics.
 *
 * @param {StatisticsDialogProps} props - The props for the component.
 */
export function StatisticsDialog({
    isOpen,
    onOpenChange,
}: StatisticsDialogProps) {
    // Hooks for internationalization.
    const t = useTranslations("statistics");
    const tAccess = useTranslations("accessibility");

    // Get functions for interacting with activity data from the context.
    const { getActivityStats, resetActivityStats } = useActivityContext();

    // State to hold the array of daily statistics data.
    const [stats, setStats] = useState<DailyStats[]>([]);
    // State to track the current sorting direction of the table.
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    // State to manage the loading indicator while data is being fetched.
    const [isLoading, setIsLoading] = useState(false);
    // State to control the visibility of the "Reset Statistics" confirmation dialog.
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    /**
     * An effect hook that triggers loading the statistics whenever the dialog is opened.
     */
    useEffect(() => {
        if (isOpen) {
            loadStats();
        }
    }, [isOpen]);

    /**
     * @private Asynchronously loads the statistics from the database via the context,
     * sorts them, and updates the component's state.
     */
    const loadStats = useCallback(async () => {
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
    }, [getActivityStats, sortDirection]);

    /**
     * @private Handles the action of resetting all activity statistics.
     * It calls the context function to clear the data and then resets the local state.
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
     * @private A utility function to sort an array of DailyStats by date.
     *
     * @param {DailyStats[]} data - The array of statistics to sort.
     * @param {"asc" | "desc"} direction - The desired sorting direction.
     * @returns {DailyStats[]} The new sorted array.
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
     * @private Toggles the sorting direction of the statistics table between ascending and descending
     * and re-sorts the data.
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
                            {t("title")}
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
                                        {t("reset")}
                                    </span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[320px] lg:max-w-[360px]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {t("reset")}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t("resetConfirmation")}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        {t("cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleResetStats}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {t("confirmReset")}
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
                        <span className="sr-only">{tAccess("close")}</span>
                    </Button>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <p>{t("loading")}</p>
                        </div>
                    ) : stats.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p>{t("noData")}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="p-1 h-auto"
                                            onClick={toggleSortDirection}
                                        >
                                            <span className="text-xs sm:text-sm">
                                                {t("date")}
                                            </span>
                                            <ArrowUpDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <CircleDollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="text-xs sm:text-sm">
                                                {t("sessions")}
                                            </span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="text-xs sm:text-sm">
                                                {t("intervals")}
                                            </span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <CirclePause className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="text-xs sm:text-sm">
                                                {t("pauses")}
                                            </span>
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.map((stat) => (
                                    <TableRow key={stat.date}>
                                        <TableCell className="text-xs sm:text-sm">
                                            {stat.date}
                                        </TableCell>
                                        <TableCell className="text-center text-xs sm:text-sm">
                                            {stat.sessions}
                                        </TableCell>
                                        <TableCell className="text-center text-xs sm:text-sm">
                                            {stat.intervals}
                                        </TableCell>
                                        <TableCell className="text-center text-xs sm:text-sm">
                                            {stat.pauses}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
