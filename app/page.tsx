import { HabitTimer } from "@/components/habit-timer";
import { getTranslations } from "next-intl/server";

// Dodajemy konfigurację dynamicznego renderowania
export const dynamic = "force-dynamic";

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

export default function Home() {
    return (
        <main className="bg-background text-foreground min-h-screen">
            <HabitTimer />
        </main>
    );
}
