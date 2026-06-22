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
  status: "idle" | "loading" | "success";
  setStatus: (val: "idle" | "loading" | "success") => void;
}

const COLORS = [
  "bg-accent-yellow",
  "bg-accent-pink",
  "bg-accent-blue",
  "bg-accent-green",
  "bg-tertiary",
];

const PARTICLES = [...Array(16)].map((_, i) => ({
  angle: (i * 360) / 16 + ((i * 7 + 13) % 20 - 10),
  distance: 50 + ((i * 17 + 23) % 60),
  color: COLORS[i % COLORS.length],
  delay: (i % 4) * 0.08,
}));

export default function WaitlistForm({ status, setStatus }: WaitlistFormProps) {
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
      className="cta-reveal border-2 p-8 rounded-sketchy-lg relative overflow-hidden transition-[transform,box-shadow] duration-300 bg-white border-black shadow-flat-offset"
    >
      {/* Success Sparkle Confetti Burst */}
      {status === "success" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {PARTICLES.map((p, i) => {
            return (
              <div
                key={i}
                className={`absolute w-3 h-3 rounded-sm border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] ${p.color}`}
                style={{
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  animation: `sparkle-burst 1.2s cubic-bezier(0.1, 0.8, 0.2, 1) ${p.delay}s both`,
                  "--dx": `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
                  "--dy": `${Math.sin((p.angle * Math.PI) / 180) * p.distance}px`,
                } as React.CSSProperties}
              />
            );
          })}
          <style>{`
            @keyframes sparkle-burst {
              0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
              }
              30% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(135deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      )}

      {status !== "success" ? (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-2 relative">
            <label
              htmlFor="cta-email-input"
              className="text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 text-secondary"
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
                className={`w-full px-4 py-3 rounded-sketchy-sm border-2 font-mono text-sm placeholder-secondary/40 transition-[box-shadow,border-color,background-color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black bg-white text-primary border-black focus-visible:ring-tertiary/20 ${errors.email ? "border-accent-pink bg-accent-pink/15" : ""}`}
              />
            </div>

            {/* Inline Error Reporting */}
            {errors.email && (
              <span
                aria-live="polite"
                className="text-xs font-mono font-bold text-rose-600 mt-1"
              >
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Primary Teal Button */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full md:w-auto self-start px-6 py-3.5 rounded-full font-mono text-sm font-bold bg-tertiary border-2 hover:bg-tertiary-hover text-white transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer border-black shadow-flat-offset-sm"
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
            className="w-12 h-12 rounded-full bg-accent-green flex items-center justify-center self-center md:self-start text-emerald-800 mb-2 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]"
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
            className="font-cursive text-3xl font-bold tracking-tight transition-colors duration-300 text-primary"
          >
            Successfully joined waitlist!
          </h3>
          <p
            className="text-sm font-sans leading-relaxed max-w-[45ch] transition-colors duration-300 text-secondary"
          >
            We&rsquo;ve reserved a cluster slot for{" "}
            <strong className="font-mono text-primary">{submittedEmail}</strong>. Check
            your inbox for confirmation details shortly.
          </p>
          <button
            onClick={() => {
              reset();
              setSubmittedEmail("");
              setStatus("idle");
            }}
            className="w-full md:w-auto self-start px-4 py-2 border-2 rounded-full text-xs font-mono font-bold transition-[transform,background-color] duration-200 active:scale-[0.97] bg-white text-secondary border-black hover:bg-neutral-bg"
          >
            Reset Form
          </button>
        </div>
      )}
    </div>
  );
}
