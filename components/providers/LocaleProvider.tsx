"use client";

import React, { createContext, useContext, useState } from "react";
import { SupportedLocale } from "@/lib/i18n/translations";

type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
});

type Props = {
  initialLocale: SupportedLocale;
  children: React.ReactNode;
};

export function LocaleProvider({ initialLocale, children }: Props) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (newLocale: SupportedLocale) => {
    if (typeof document !== "undefined") {
      document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; sameSite=lax`;
    }
    setLocaleState(newLocale);
  };

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextValue {
  return useContext(LocaleContext);
}
