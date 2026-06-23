"use client";

import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useToastStore } from "@/store/toastStore";

export function ToastBanner() {
  const { toast } = useToastStore();

  if (!toast) return null;

  return (
    <div
      role="alert"
      className={`fixed top-4 right-4 z-[100] max-w-md border-2 border-black rounded-sketchy p-4 shadow-flat-offset transition-all duration-300 transform ${
        toast.type === "success" ? "bg-accent-green" : "bg-accent-pink"
      }`}
    >
      <div className="flex items-center gap-2 font-sans font-bold text-sm text-primary">
        {toast.type === "success" ? (
          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-primary shrink-0" />
        )}
        <span>{toast.text}</span>
      </div>
    </div>
  );
}
