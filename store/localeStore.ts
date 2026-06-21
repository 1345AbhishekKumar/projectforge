import { create } from "zustand";
import { SupportedLocale } from "@/lib/i18n/translations";

type LocaleState = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

const getCookieLocale = (): SupportedLocale => {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/locale=([^;]+)/);
  if (match && ["en", "es", "fr", "de", "ja"].includes(match[1])) {
    return match[1] as SupportedLocale;
  }
  return "en";
};

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getCookieLocale(),
  setLocale: (locale) => {
    if (typeof document !== "undefined") {
      document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; sameSite=lax`;
    }
    set({ locale });
  },
}));
