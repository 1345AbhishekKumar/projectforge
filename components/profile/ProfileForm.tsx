"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Image as ImageIcon, Save, XCircle, CheckCircle, Globe } from "lucide-react";
import { updateProfile } from "@/actions/profile";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLocale } from "@/lib/i18n/translations";

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(50, "Full name cannot exceed 50 characters"),
  avatarUrl: z
    .string()
    .trim()
    .url("Please enter a valid URL (e.g., https://example.com/avatar.jpg)")
    .or(z.literal(""))
    .nullable()
    .optional(),
  locale: z.enum(["en", "es", "fr", "de", "ja"]).default("en"),
});

type ProfileInput = z.infer<typeof profileSchema>;

type Props = {
  initialProfile: {
    fullName: string | null;
    avatarUrl: string | null;
    email: string;
    locale: string;
  };
};

export function ProfileForm({ initialProfile }: Props) {
  const { t, setLocale } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: initialProfile.fullName || "",
      avatarUrl: initialProfile.avatarUrl || "",
      locale: (initialProfile.locale as SupportedLocale) || "en",
    },
  });

  const showBanner = (type: "success" | "error", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  async function onSubmit(data: ProfileInput) {
    setLoading(true);
    try {
      const res = await updateProfile(data.fullName, data.avatarUrl || null, data.locale);
      if (res.success) {
        setLocale(data.locale);
        showBanner("success", t("profile.updateSuccess", "Profile updated successfully!"));
      } else {
        showBanner("error", res.error || t("profile.updateError", "Failed to update profile"));
      }
    } catch {
      showBanner("error", t("profile.unexpectedError", "An unexpected error occurred"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-2xl w-full mx-auto relative rotate-[-0.5deg]">
      {/* Toast Notification Banner */}
      {banner && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-[100] max-w-md border-2 border-black rounded-sketchy p-4 shadow-flat-offset transition-all transform ${
            banner.type === "success" ? "bg-accent-green" : "bg-accent-pink"
          }`}
        >
          <div className="flex items-center gap-2 font-sans font-bold text-sm">
            {banner.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-primary" />
            )}
            {banner.text}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center shadow-flat-offset-sm">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-cursive text-3xl font-bold">{t("profile.title", "Edit Profile")}</h2>
          <p className="font-sans text-xs text-secondary">
            {t("profile.description", "Manage your personal profile details.")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div>
          <label className="font-sans text-xs font-semibold mb-1 block text-secondary">
            {t("profile.emailReadOnly", "Email Address (Read-Only)")}
          </label>
          <input
            type="email"
            value={initialProfile.email}
            disabled
            className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-neutral-bg cursor-not-allowed opacity-75 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="fullName" className="font-sans text-xs font-semibold mb-1 block">
            {t("profile.fullName", "Full Name")}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-secondary/50" />
            <input
              id="fullName"
              type="text"
              {...register("fullName")}
              placeholder={t("profile.fullNamePlaceholder", "Your Name")}
              className={`w-full pl-10 pr-4 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow ${
                errors.fullName ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
          </div>
          {errors.fullName && (
            <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
              {errors.fullName.message}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="avatarUrl" className="font-sans text-xs font-semibold mb-1 block">
            {t("profile.avatarUrl", "Avatar Image URL")}
          </label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-secondary/50" />
            <input
              id="avatarUrl"
              type="text"
              {...register("avatarUrl")}
              placeholder={t("profile.avatarUrlPlaceholder", "https://example.com/avatar.jpg")}
              className={`w-full pl-10 pr-4 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow ${
                errors.avatarUrl ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
          </div>
          {errors.avatarUrl && (
            <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
              {errors.avatarUrl.message}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="locale" className="font-sans text-xs font-semibold mb-1 block">
            {t("profile.language", "Preferred Language")}
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-secondary/50 pointer-events-none" />
            <select
              id="locale"
              {...register("locale")}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow appearance-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="es">Español (Spanish)</option>
              <option value="fr">Français (French)</option>
              <option value="de">Deutsch (German)</option>
              <option value="ja">日本語 (Japanese)</option>
            </select>
            <div className="absolute right-3 top-3.5 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-black" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto self-end inline-flex items-center justify-center gap-2 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold px-6 py-2.5 border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("profile.saving", "Saving Changes...")}
            </>
          ) : (
            <>
              <Save className="h-4.5 w-4.5" />
              {t("profile.saveChanges", "Save Changes")}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

