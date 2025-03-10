import { getRequestConfig, requestLocale } from "next-intl/server";
import { locales } from "../config";

export default getRequestConfig(async () => {
    // Get the locale from the request
    const locale = await requestLocale();

    // Validate that the incoming locale is valid
    if (!locales.includes(locale as any)) {
        throw new Error(`Locale '${locale}' is not supported`);
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});
