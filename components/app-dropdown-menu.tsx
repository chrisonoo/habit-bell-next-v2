"use client";

import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    EllipsisVertical,
    BarChart2,
    Settings,
    HelpCircle,
    Info,
    Sun,
    Moon,
    Languages,
} from "lucide-react";
import {
    useAppSettings,
    type ThemeType,
    type LanguageType,
} from "@/contexts/app-settings-context";
import { useActivityContext } from "@/contexts/activity-context";

interface AppDropdownMenuProps {
    onOpenStatistics: () => void;
    onOpenSettings: () => void;
}

export function AppDropdownMenu({
    onOpenStatistics,
    onOpenSettings,
}: AppDropdownMenuProps) {
    const { theme, language, setTheme, setLanguage } = useAppSettings();
    const { todaySessionCount, todayIntervalCount, todayPauseCount } =
        useActivityContext();
    const [isOpen, setIsOpen] = useState(false);

    // Funkcja do obsługi kliknięcia w opcję menu
    const handleMenuItemClick = (action: () => void) => {
        // Zamknij menu
        setIsOpen(false);
        // Wykonaj akcję
        action();
    };

    // Funkcja do obsługi zmiany motywu
    const handleThemeChange = (newTheme: ThemeType) => {
        setTheme(newTheme);
        setIsOpen(false);
    };

    // Funkcja do obsługi zmiany języka
    const handleLanguageChange = (newLanguage: LanguageType) => {
        setLanguage(newLanguage);
        setIsOpen(false);
    };

    // Funkcja do wyświetlania nazwy języka
    const getLanguageName = (lang: LanguageType): string => {
        switch (lang) {
            case "en":
                return "English";
            case "pl":
                return "Polski";
            case "no":
                return "Norsk";
            default:
                return "English";
        }
    };

    // Funkcja do wyświetlania ikony dla aktualnie wybranego języka
    const getLanguageIcon = () => {
        switch (language) {
            case "en":
                return "🇬🇧";
            case "pl":
                return "🇵🇱";
            case "no":
                return "🇳🇴";
            default:
                return "🇬🇧";
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 lg:h-14 lg:w-14"
                >
                    <EllipsisVertical className="!h-6 !w-6 lg:!h-8 lg:!w-8" />
                    <span className="sr-only">Menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 max-h-[calc(100vh-4rem)] overflow-y-auto bg-background border border-border shadow-lg"
                align="end"
            >
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        onClick={() => handleMenuItemClick(onOpenStatistics)}
                    >
                        <BarChart2 className="mr-2 h-4 w-4" />
                        <span>Statistics</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                            {todaySessionCount}/{todayIntervalCount}/
                            {todayPauseCount}
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleMenuItemClick(onOpenSettings)}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>Help</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                        <Info className="mr-2 h-4 w-4" />
                        <span>About</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Podmenu wyboru języka */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Languages className="mr-2 h-4 w-4" />
                        <span>Language</span>
                        <span className="ml-auto">{getLanguageIcon()}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-background border border-border shadow-lg">
                            <DropdownMenuItem
                                onClick={() => handleLanguageChange("en")}
                            >
                                <span className="mr-2">🇬🇧</span>
                                <span>English</span>
                                {language === "en" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleLanguageChange("pl")}
                            >
                                <span className="mr-2">🇵🇱</span>
                                <span>Polski</span>
                                {language === "pl" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleLanguageChange("no")}
                            >
                                <span className="mr-2">🇳🇴</span>
                                <span>Norsk</span>
                                {language === "no" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* Podmenu wyboru motywu */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        {theme === "light" ? (
                            <Sun className="mr-2 h-4 w-4" />
                        ) : (
                            <Moon className="mr-2 h-4 w-4" />
                        )}
                        <span>Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-background border border-border shadow-lg">
                            <DropdownMenuItem
                                onClick={() => handleThemeChange("light")}
                            >
                                <Sun className="mr-2 h-4 w-4" />
                                <span>Light</span>
                                {theme === "light" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleThemeChange("dark")}
                            >
                                <Moon className="mr-2 h-4 w-4" />
                                <span>Dark</span>
                                {theme === "dark" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
