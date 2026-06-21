import { describe, it, expect } from "vitest";
import { translations, SupportedLocale } from "@/lib/i18n/translations";

function translateClientMock(path: string, locale: SupportedLocale, defaultValue?: string) {
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
}

describe("Multi-Language Support (i18n) Verification", () => {
  it("should resolve correct translations for English (default)", () => {
    const dashboardTitleEn = translateClientMock("sidebar.dashboard", "en");
    expect(dashboardTitleEn).toBe("Dashboard");

    const saveChangesEn = translateClientMock("profile.saveChanges", "en");
    expect(saveChangesEn).toBe("Save Changes");
  });

  it("should resolve correct translations for Spanish", () => {
    const dashboardTitleEs = translateClientMock("sidebar.dashboard", "es");
    expect(dashboardTitleEs).toBe("Tablero");

    const saveChangesEs = translateClientMock("profile.saveChanges", "es");
    expect(saveChangesEs).toBe("Guardar Cambios");
  });

  it("should resolve correct translations for French", () => {
    const dashboardTitleFr = translateClientMock("sidebar.dashboard", "fr");
    expect(dashboardTitleFr).toBe("Tableau de Bord");

    const saveChangesFr = translateClientMock("profile.saveChanges", "fr");
    expect(saveChangesFr).toBe("Enregistrer les Modifications");
  });

  it("should resolve correct translations for German", () => {
    const dashboardTitleDe = translateClientMock("sidebar.dashboard", "de");
    expect(dashboardTitleDe).toBe("Dashboard");

    const saveChangesDe = translateClientMock("profile.saveChanges", "de");
    expect(saveChangesDe).toBe("Änderungen Speichern");
  });

  it("should resolve correct translations for Japanese", () => {
    const dashboardTitleJa = translateClientMock("sidebar.dashboard", "ja");
    expect(dashboardTitleJa).toBe("ダッシュボード");

    const saveChangesJa = translateClientMock("profile.saveChanges", "ja");
    expect(saveChangesJa).toBe("変更を保存");
  });

  it("should fallback to default value or path key if key is missing", () => {
    const missingKey = translateClientMock("sidebar.nonexistentKey", "en");
    expect(missingKey).toBe("sidebar.nonexistentKey");

    const fallbackVal = translateClientMock("sidebar.nonexistentKey", "en", "Fallback Value");
    expect(fallbackVal).toBe("Fallback Value");
  });
});
