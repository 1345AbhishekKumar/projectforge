import { cookies } from "next/headers";
import { translations, SupportedLocale } from "./translations";

export async function getServerTranslation() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale = (localeCookie && localeCookie in translations ? localeCookie : "en") as SupportedLocale;

  const t = (path: string, defaultValue?: string) => {
    const keys = path.split(".");
    let current: Record<string, unknown> | string = translations[locale];
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key] as Record<string, unknown> | string;
      } else {
        return defaultValue || path;
      }
    }
    return typeof current === "string" ? current : (defaultValue || path);
  };

  return { t, locale };
}
