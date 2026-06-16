"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter an email address.")
    .email("Please enter a valid email format (e.g., colleague@domain.com)."),
  role: z.enum(["ADMIN", "MEMBER"]),
});

type InviteInput = z.infer<typeof inviteSchema>;

type Props = {
  onInvite: (email: string, role: "ADMIN" | "MEMBER") => Promise<{ success: boolean; error?: string }>;
};

export function InviteModal({ onInvite }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      role: "MEMBER",
    },
  });

  async function onSubmit(data: InviteInput) {
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const result = await onInvite(data.email, data.role);
      if (result.success) {
        setSuccess(true);
        reset({ email: "", role: "MEMBER" });
        // Clear success message after 4 seconds
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(result.error || "Failed to invite collaborator");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-accent-yellow border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 rotate-[0.5deg]">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-flat-offset-sm">
          <UserPlus className="h-4.5 w-4.5" />
        </div>
        <h2 className="font-cursive text-2xl font-bold">Invite Collaborator</h2>
      </div>

      <p className="font-sans text-xs text-secondary mb-6 leading-relaxed">
        Invite an existing ProjectForge user to this workspace. They must have registered an account to join.
      </p>

      {error && (
        <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-accent-green border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-semibold">
          Collaborator successfully added to workspace!
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">
            Email Address
          </label>
          <input
            type="text"
            {...register("email")}
            placeholder="colleague@domain.com"
            className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow ${
              errors.email ? "border-rose-500 bg-rose-50/20" : ""
            }`}
          />
          {errors.email && (
            <span
              aria-live="polite"
              className="text-xs font-mono font-bold text-rose-600 mt-1 block"
            >
              {errors.email.message}
            </span>
          )}
        </div>

        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">
            Workspace Role
          </label>
          <select
            {...register("role")}
            className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer"
          >
            <option value="MEMBER">MEMBER (Read/Write Tasks & Projects)</option>
            <option value="ADMIN">ADMIN (Invite members, edit workspace)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 mt-2 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Inviting…
            </span>
          ) : (
            "Add to Workspace"
          )}
        </button>
      </form>
    </div>
  );
}
