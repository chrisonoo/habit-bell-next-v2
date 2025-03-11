import { HabitTimer } from "@/components/habit-timer";
import { getTranslations } from "next-intl/server";
import { locales } from "@/config";
import { setRequestLocale } from "next-intl/server";

// Generujemy statyczne parametry dla wszystkich obsługiwanych języków
export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
    params: { locale },
}: {
    params: { locale: string };
}) {
    const t = await getTranslations({ locale, namespace: "app" });

    return {
        title: t("title"),
        description: t("description"),
    };
}

export default function Home({
    params: { locale },
}: {
    params: { locale: string };
}) {
    // Ustawiamy locale dla statycznego renderowania
    setRequestLocale(locale);

    return (
        <main className="bg-background text-foreground min-h-screen">
            <HabitTimer />
        </main>
    );
}
