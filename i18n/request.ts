import { getRequestConfig } from "next-intl/server";
import { locales } from "../config";

export default getRequestConfig(async ({ locale }) => {
    // Validate that the incoming locale is valid
    if (!locales.includes(locale as any)) {
        throw new Error(`Locale '${locale}' is not supported`);
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
        // Dodajemy timeZone, aby uniknąć problemów z formatowaniem dat
        timeZone: "Europe/Warsaw",
        // Dodajemy now, aby uniknąć problemów z formatowaniem dat
        now: new Date(),
    };
});
