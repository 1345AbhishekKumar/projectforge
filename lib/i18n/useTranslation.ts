"use client";

import { useLocaleStore } from "@/store/localeStore";
import { translations } from "./translations";

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const t = (path: string, defaultValue?: string) => {
    const keys = path.split(".");
    let current: Record<string, unknown> | string = translations[locale] || translations.en;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key] as Record<string, unknown> | string;
      } else {
        return defaultValue || path;
      }
    }
    return typeof current === "string" ? current : (defaultValue || path);
  };

  return { t, locale, setLocale };
}
