import { getRequestConfig } from "next-intl/server";
import { locales } from "./config";

export default getRequestConfig(async ({ locale }) => {
    // Validate that the incoming locale is valid
    if (!locales.includes(locale as any)) {
        throw new Error(`Locale '${locale}' is not supported`);
    }

    return {
        locale,
        messages: (await import(`./messages/${locale}.json`)).default,
    };
});
