"use client";

import { useLocale } from "next-intl";
import { createSharedPathnamesNavigation } from "next-intl/navigation";
import { locales } from "../config";

export const usePathname = createSharedPathnamesNavigation({
    locales,
}).usePathname;
export const useRouter = createSharedPathnamesNavigation({ locales }).useRouter;

export function useCurrentLocale() {
    return useLocale();
}
