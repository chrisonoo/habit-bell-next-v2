import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    // Ustawiamy locale dla statycznego renderowania
    setRequestLocale(locale);

    const t = await getTranslations({ locale, namespace: "pages.help" });

    // Pobieramy zawartość jako surowy tekst, bez interpretacji jako format intl
    const content = t.raw("content");

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={`/${locale}`}>
                        <Button variant="ghost" size="icon" className="-ml-3">
                            <ArrowLeft className="!h-6 !w-6" />
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
