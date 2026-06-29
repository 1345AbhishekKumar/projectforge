import React from "react";
import { cookies } from "next/headers";
import { LocaleProvider } from "./LocaleProvider";
import type { SupportedLocale } from "@/lib/i18n/translations";

const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "es", "fr", "de", "ja"];

type Props = {
  children: React.ReactNode;
};

export async function DynamicLocaleProvider({ children }: Props) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("locale")?.value;
  const locale: SupportedLocale =
    rawLocale && SUPPORTED_LOCALES.includes(rawLocale as SupportedLocale)
      ? (rawLocale as SupportedLocale)
      : "en";

  return <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>;
}
