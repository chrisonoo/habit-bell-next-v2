import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async (context) => {
    // Używamy context.locale zamiast destructuring, aby uniknąć ostrzeżenia
    const locale = context.locale;

    // Validate that the incoming locale is valid
    if (!routing.locales.includes(locale as any)) {
        throw new Error(`Locale '${locale}' is not supported`);
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});
