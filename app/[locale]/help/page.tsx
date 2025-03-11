import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Dodajemy konfigurację dynamicznego renderowania
export const dynamic = "force-dynamic";

export async function generateMetadata({
    params: { locale },
}: {
    params: { locale: string };
}) {
    const t = await getTranslations({ locale, namespace: "pages.help" });

    return {
        title: `${t("title")} - Habit Bell`,
    };
}

export default async function HelpPage({
    params: { locale },
}: {
    params: { locale: string };
}) {
    const t = await getTranslations({ locale, namespace: "pages.help" });

    // Pobieramy zawartość jako surowy tekst, bez interpretacji jako format intl
    const content = t.raw("content");

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto py-8 px-4">
                <div className="mb-6">
                    <Link href={`/${locale}`}>
                        <Button variant="ghost" size="icon" className="mr-2">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Back to timer</span>
                        </Button>
                    </Link>
                </div>

                <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
                <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            </div>
        </div>
    );
}
