"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import Link from "next/link";
import { useParams } from "next/navigation";

interface AppDropdownMenuProps {
    onOpenStatistics: () => void;
    onOpenSettings: () => void;
}

export function AppDropdownMenu({
    onOpenStatistics,
    onOpenSettings,
}: AppDropdownMenuProps) {
    const { theme, language, setTheme, setLanguage } = useAppSettings();
    const [isOpen, setIsOpen] = useState(false);
    const params = useParams();
    const locale = params.locale as string;

    const tNav = useTranslations("navigation");
    const tTheme = useTranslations("theme");
    const tLang = useTranslations("language");
    const tAccess = useTranslations("accessibility");

    // Function to handle menu item click
    const handleMenuItemClick = (action: () => void) => {
        // Close menu
        setIsOpen(false);
        // Execute action
        action();
    };

    // Function to handle theme change
    const handleThemeChange = (newTheme: ThemeType) => {
        setTheme(newTheme);
        setIsOpen(false);
    };

    // Function to handle language change
    const handleLanguageChange = (newLanguage: LanguageType) => {
        setLanguage(newLanguage);
        setIsOpen(false);
    };

    // Function to display language name
    const getLanguageName = (lang: LanguageType): string => {
        switch (lang) {
            case "en":
                return tLang("english");
            case "pl":
                return tLang("polish");
            case "no":
                return tLang("norwegian");
            default:
                return tLang("english");
        }
    };

    // Function to display icon for currently selected language
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
                    <span className="sr-only">{tAccess("menu")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-48 max-h-[calc(100vh-4rem)] overflow-y-auto bg-background border border-border shadow-lg"
                align="end"
            >
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        onClick={() => handleMenuItemClick(onOpenStatistics)}
                    >
                        <BarChart2 className="mr-2 h-4 w-4" />
                        <span>{tNav("statistics")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleMenuItemClick(onOpenSettings)}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{tNav("settings")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link
                            href={`/${locale}/help`}
                            onClick={() => setIsOpen(false)}
                        >
                            <HelpCircle className="mr-2 h-4 w-4" />
                            <span>{tNav("help")}</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link
                            href={`/${locale}/about`}
                            onClick={() => setIsOpen(false)}
                        >
                            <Info className="mr-2 h-4 w-4" />
                            <span>{tNav("about")}</span>
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Language selection submenu */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Languages className="mr-2 h-4 w-4" />
                        <span>{tLang("title")}</span>
                        <span className="ml-auto">{getLanguageIcon()}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-background border border-border shadow-lg">
                            <DropdownMenuItem
                                onClick={() => handleLanguageChange("en")}
                            >
                                <span className="mr-2">🇬🇧</span>
                                <span>{tLang("english")}</span>
                                {language === "en" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleLanguageChange("pl")}
                            >
                                <span className="mr-2">🇵🇱</span>
                                <span>{tLang("polish")}</span>
                                {language === "pl" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleLanguageChange("no")}
                            >
                                <span className="mr-2">🇳🇴</span>
                                <span>{tLang("norwegian")}</span>
                                {language === "no" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* Theme selection submenu */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        {theme === "light" ? (
                            <Sun className="mr-2 h-4 w-4" />
                        ) : (
                            <Moon className="mr-2 h-4 w-4" />
                        )}
                        <span>{tTheme("title")}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-background border border-border shadow-lg">
                            <DropdownMenuItem
                                onClick={() => handleThemeChange("light")}
                            >
                                <Sun className="mr-2 h-4 w-4" />
                                <span>{tTheme("light")}</span>
                                {theme === "light" && (
                                    <span className="ml-auto">✓</span>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleThemeChange("dark")}
                            >
                                <Moon className="mr-2 h-4 w-4" />
                                <span>{tTheme("dark")}</span>
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
