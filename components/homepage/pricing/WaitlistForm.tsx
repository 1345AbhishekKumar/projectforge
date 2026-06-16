"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .email("Please enter a valid email format (e.g., mail@example.com)."),
});

type WaitlistInput = z.infer<typeof waitlistSchema>;

interface WaitlistFormProps {
  isDarkMode: boolean;
  status: "idle" | "loading" | "success";
  setStatus: (val: "idle" | "loading" | "success") => void;
}

export default function WaitlistForm({ isDarkMode, status, setStatus }: WaitlistFormProps) {
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WaitlistInput>({
    resolver: zodResolver(waitlistSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: WaitlistInput) => {
    setSubmittedEmail(data.email);
    setStatus("loading");

    setTimeout(() => {
      setStatus("success");
    }, 1500);
  };

  return (
    <div
      className={`cta-reveal border-2 p-8 rounded-sketchy-lg relative overflow-hidden transition-all duration-300 ${
        isDarkMode
          ? "bg-zinc-900 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
          : "bg-white border-black shadow-flat-offset"
      }`}
    >
      {status !== "success" ? (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-2 relative">
            <label
              htmlFor="cta-email-input"
              className={`text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 ${
                isDarkMode ? "text-zinc-300" : "text-slate-700"
              }`}
            >
              Email Address
            </label>

            <div className="relative">
              <input
                id="cta-email-input"
                type="text"
                disabled={status === "loading"}
                {...register("email")}
                placeholder="dev@projectforge.com…"
                spellCheck={false}
                className={`w-full px-4 py-3 rounded-none border-2 font-mono text-sm placeholder-slate-400 dark:placeholder-zinc-650 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black ${
                  isDarkMode
                    ? "bg-zinc-950 text-white border-white focus-visible:ring-white/20"
                    : "bg-white text-slate-900 border-black focus-visible:ring-emerald-500/20"
                } ${errors.email ? "border-rose-500 bg-rose-50/20" : ""}`}
              />
            </div>

            {/* Inline Error Reporting */}
            {errors.email && (
              <span
                aria-live="polite"
                className="text-xs font-mono font-bold text-rose-600 dark:text-rose-455 mt-1"
              >
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Primary Teal Button */}
          <button
            type="submit"
            disabled={status === "loading"}
            className={`w-full md:w-auto self-start px-6 py-3.5 rounded-full font-mono text-sm font-bold bg-[#00a099] border-2 hover:bg-[#008B8B] text-white transition-all duration-150 ease-out active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer ${
              isDarkMode
                ? "border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                : "border-black shadow-flat-offset-sm"
            }`}
          >
            {status === "loading" ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-current"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting…
              </>
            ) : (
              "Join Developer Waitlist"
            )}
          </button>
        </form>
      ) : (
        // Success feedback container
        <div aria-live="polite" className="flex flex-col gap-4 text-center md:text-left py-4">
          <div
            className={`w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center self-center md:self-start text-emerald-600 mb-2 border ${
              isDarkMode ? "border-emerald-400" : "border-emerald-500"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3
            className={`font-cursive text-3xl font-bold tracking-tight transition-colors duration-300 ${
              isDarkMode ? "text-[#FAF9F6]" : "text-slate-900"
            }`}
          >
            Successfully joined waitlist!
          </h3>
          <p
            className={`text-sm font-sans leading-relaxed max-w-[45ch] transition-colors duration-300 ${
              isDarkMode ? "text-zinc-400" : "text-slate-655"
            }`}
          >
            We&rsquo;ve reserved a cluster slot for{" "}
            <strong className="font-mono text-slate-900 dark:text-zinc-200">{submittedEmail}</strong>. Check
            your inbox for confirmation details shortly.
          </p>
          <button
            onClick={() => {
              reset();
              setSubmittedEmail("");
              setStatus("idle");
            }}
            className={`w-full md:w-auto self-start px-4 py-2 border-2 rounded-full text-xs font-mono font-bold transition-all duration-300 active:scale-[0.97] ${
              isDarkMode
                ? "bg-zinc-800 text-zinc-300 border-white hover:bg-zinc-700"
                : "bg-white text-slate-700 border-black hover:bg-slate-50"
            }`}
          >
            Reset Form
          </button>
        </div>
      )}
    </div>
  );
}
