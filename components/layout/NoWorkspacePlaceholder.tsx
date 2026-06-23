"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Layout } from "lucide-react";

interface NoWorkspacePlaceholderProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  showCreateButton?: boolean;
}

export function NoWorkspacePlaceholder({
  icon,
  title,
  description,
  showCreateButton = false,
}: NoWorkspacePlaceholderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const defaultIcon = (
    <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
      <Layout className="h-8 w-8 text-primary" />
    </div>
  );

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto flex flex-col items-center gap-4">
      {icon || defaultIcon}
      <h3 className="font-cursive text-2xl font-bold">
        {title || t("dashboard.noOrg.title", "Create or Select a Workspace")}
      </h3>
      <p className="font-sans text-sm text-secondary leading-relaxed">
        {description || t("dashboard.noOrg.description", "You need to select an active organization or create a new one to start tracking projects, sprints, and tasks.")}
      </p>
      {showCreateButton && (
        <button
          onClick={() => router.push("/orgs/create")}
          className="bg-accent-yellow text-primary font-sans font-bold text-sm py-3 px-6 rounded-full border-2 border-black shadow-flat-offset-sm hover:bg-[#FFE680] active:translate-y-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer mt-2"
        >
          ✨ {t("dashboard.noOrg.button", "Create Organization")}
        </button>
      )}
    </div>
  );
}
