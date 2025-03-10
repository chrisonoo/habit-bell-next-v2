import { getTranslations } from "next-intl/server";

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

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
            <div className="prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: t("content") }} />
            </div>
        </div>
    );
}
