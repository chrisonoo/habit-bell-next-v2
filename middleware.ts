import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./config";

export default createMiddleware({
    // A list of all locales that are supported
    locales,

    // If this locale is matched, pathnames work without a prefix (e.g. `/about`)
    defaultLocale,

    // Optional: Persist the user's selected locale in a cookie
    localeDetection: false, // We'll handle this manually with our existing context
});

export const config = {
    // Skip all paths that should not be internationalized
    matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
