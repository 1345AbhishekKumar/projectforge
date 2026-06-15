"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganization, checkSlugAvailability } from "@/actions/org";
import { CheckCircle, XCircle, Loader2, ArrowLeft, Building2 } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CreateOrgPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [error, setError] = useState("");

  const checkSlug = useCallback(async (value: string) => {
    if (value.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const result = await checkSlugAvailability(value);
    setSlugStatus(result.available ? "available" : "taken");
  }, []);

  useEffect(() => {
    if (slug.length < 3) {
      return;
    }
    const timer = setTimeout(() => checkSlug(slug), 400);
    return () => clearTimeout(timer);
  }, [slug, checkSlug]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus !== "available" || name.length < 3) return;

    setError("");
    startTransition(async () => {
      const result = await createOrganization(name, slug);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Something went wrong");
      }
    });
  }

  const slugIcon =
    slugStatus === "checking" ? <Loader2 className="h-4 w-4 animate-spin text-secondary" /> :
    slugStatus === "available" ? <CheckCircle className="h-4 w-4 text-[var(--color-accent-green)]" /> :
    slugStatus === "taken" ? <XCircle className="h-4 w-4 text-[var(--color-accent-pink)]" /> :
    null;

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary relative py-12 px-4">
      <div className="w-full max-w-lg">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center shadow-flat-offset-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="font-cursive text-3xl font-bold">Create Workspace</h1>
          </div>

          <p className="font-sans text-sm text-secondary mb-8">
            Set up a new organization workspace. Invite your team and start collaborating on projects.
          </p>

          {error && (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-6">
              <p className="font-sans text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="font-sans text-sm font-semibold mb-1.5 block">
                Workspace Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (!slugEdited) {
                    const generated = slugify(val);
                    setSlug(generated);
                    if (generated.length >= 3) {
                      setSlugStatus("checking");
                    } else {
                      setSlugStatus("idle");
                    }
                  }
                }}
                placeholder="e.g. DevOps Pioneers"
                minLength={3}
                maxLength={50}
                required
                className="w-full px-4 py-3 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary focus:ring-offset-1 transition-shadow"
              />
              <span className="font-sans text-xs text-secondary mt-1 block">
                3–50 characters
              </span>
            </div>

            <div>
              <label className="font-sans text-sm font-semibold mb-1.5 block">
                URL Slug
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    const val = slugify(e.target.value);
                    setSlug(val);
                    if (val.length >= 3) {
                      setSlugStatus("checking");
                    } else {
                      setSlugStatus("idle");
                    }
                  }}
                  placeholder="e.g. devops-pioneers"
                  minLength={3}
                  maxLength={40}
                  required
                  className="w-full px-4 py-3 pr-10 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary focus:ring-offset-1 transition-shadow"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugIcon}
                </span>
              </div>
              <span className="font-sans text-xs text-secondary mt-1 block">
                {slugStatus === "taken"
                  ? "This slug is already taken — try another"
                  : slugStatus === "available"
                  ? "This slug is available!"
                  : "Lowercase letters, numbers, and hyphens only"}
              </span>
            </div>

            <button
              type="submit"
              disabled={isPending || slugStatus !== "available" || name.length < 3}
              className="w-full py-3 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </span>
              ) : (
                "Create Workspace"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
