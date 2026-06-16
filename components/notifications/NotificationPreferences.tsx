"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, Loader2, Check } from "lucide-react";
import {
  getNotificationPreferences,
  upsertNotificationPreference,
} from "@/actions/notification";
import type { NotificationPreference, NotificationType } from "@/types";

const TYPE_LABELS: Record<NotificationType, { label: string; description: string }> = {
  GENERAL: {
    label: "General",
    description: "System-wide announcements and general updates",
  },
  TASK_OVERDUE: {
    label: "Task Overdue",
    description: "Alerts when your assigned tasks pass their due date",
  },
  SPRINT_STARTED: {
    label: "Sprint Started",
    description: "Notified when a sprint is kicked off in your workspace",
  },
  SPRINT_ENDED: {
    label: "Sprint Ended",
    description: "Notified when a sprint is completed in your workspace",
  },
  MEMBER_INVITED: {
    label: "Member Invited",
    description: "Confirmation when you are added to a workspace",
  },
  PROJECT_COMPLETED: {
    label: "Project Completed",
    description: "Notified when a project is marked as Completed",
  },
};

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label: string;
};

function ToggleSwitch({ checked, onChange, disabled, label }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center border-2 border-black rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary",
        checked ? "bg-accent-green" : "bg-neutral-bg",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:-translate-y-0.5 shadow-flat-offset-sm",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 rounded-full border-2 border-black bg-white shadow-flat-offset-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        ].join(" ")}
      />
    </button>
  );
}

type PrefRow = NotificationPreference & { saving?: boolean; saved?: boolean };

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<PrefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await getNotificationPreferences();
    if (result.success && result.data) {
      setPrefs(result.data);
    } else {
      setError(result.error || "Failed to load preferences");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleToggle = async (
    type: NotificationType,
    field: "in_app" | "email",
    value: boolean
  ) => {
    // Optimistic update + mark saving
    setPrefs((prev) =>
      prev.map((p) =>
        p.type === type
          ? { ...p, [field]: value, saving: true, saved: false }
          : p
      )
    );

    const current = prefs.find((p) => p.type === type);
    if (!current) return;

    const newInApp = field === "in_app" ? value : current.in_app;
    const newEmail = field === "email" ? value : current.email;

    const result = await upsertNotificationPreference(type, newInApp, newEmail);

    if (result.success) {
      setPrefs((prev) =>
        prev.map((p) =>
          p.type === type ? { ...p, saving: false, saved: true } : p
        )
      );
      // Clear "saved" flash after 2s
      setTimeout(() => {
        setPrefs((prev) =>
          prev.map((p) => (p.type === type ? { ...p, saved: false } : p))
        );
      }, 2000);
    } else {
      // Revert on failure
      setPrefs((prev) =>
        prev.map((p) =>
          p.type === type
            ? { ...p, [field]: !value, saving: false, saved: false }
            : p
        )
      );
    }
  };

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center shadow-flat-offset-sm rotate-[1deg] shrink-0">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-cursive text-2xl font-bold leading-tight">
            Notification Preferences
          </h2>
          <p className="font-sans text-xs text-secondary/70">
            Choose which events send you in-app or email notifications.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-tertiary" />
          <span className="font-cursive text-lg text-secondary">Loading preferences...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-4 text-center">
          <p className="font-sans text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2 border-b-2 border-black/20">
            <span className="font-sans text-[10px] font-bold text-secondary uppercase tracking-wider">
              Notification Type
            </span>
            <span className="font-sans text-[10px] font-bold text-secondary uppercase tracking-wider w-16 text-center">
              In App
            </span>
            <span className="font-sans text-[10px] font-bold text-secondary uppercase tracking-wider w-16 text-center">
              Email
            </span>
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-4">
            {prefs.map((pref) => {
              const meta = TYPE_LABELS[pref.type];
              return (
                <div
                  key={pref.type}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-3 border-b border-black/10 last:border-0"
                >
                  {/* Label + description */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-sans text-sm font-bold text-primary">{meta.label}</p>
                      {pref.saving && (
                        <Loader2 className="h-3 w-3 animate-spin text-secondary" />
                      )}
                      {pref.saved && !pref.saving && (
                        <span className="flex items-center gap-0.5 text-[10px] font-sans font-bold text-accent-green">
                          <Check className="h-3 w-3" /> Saved
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-xs text-secondary/60 leading-snug mt-0.5">
                      {meta.description}
                    </p>
                  </div>

                  {/* In-App toggle */}
                  <div className="w-16 flex justify-center">
                    <ToggleSwitch
                      checked={pref.in_app}
                      onChange={(val) => handleToggle(pref.type, "in_app", val)}
                      disabled={pref.saving}
                      label={`Toggle in-app notifications for ${meta.label}`}
                    />
                  </div>

                  {/* Email toggle */}
                  <div className="w-16 flex justify-center">
                    <ToggleSwitch
                      checked={pref.email}
                      onChange={(val) => handleToggle(pref.type, "email", val)}
                      disabled={pref.saving}
                      label={`Toggle email notifications for ${meta.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Email note */}
          <p className="font-sans text-[10px] text-secondary/50 italic border-t border-black/10 pt-3">
            📧 Email delivery requires additional setup. Toggles are saved for when email is
            configured.
          </p>
        </>
      )}
    </div>
  );
}
