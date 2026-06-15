"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, Key, User, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"signup" | "verify-otp">("signup");
  const [errorMsg, setErrorMsg] = useState("");

  const isLoading = fetchStatus === "fetching";

  const handleAction = async (e: React.FormEvent, fn: () => Promise<unknown>) => {
    e.preventDefault();
    if (!signUp) return;
    setErrorMsg("");
    try {
      const res = (await fn()) as { error?: { message?: string } } | null | undefined;
      if (res?.error?.message) setErrorMsg(res.error.message);
    } catch (err) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "An error occurred. Please try again.");
    }
  };

  const onSignUpSubmit = (e: React.FormEvent) =>
    handleAction(e, async () => {
      const res = await signUp!.password({ emailAddress: email, password, firstName, lastName });
      if (!res.error) {
        const sendRes = await signUp!.verifications.sendEmailCode();
        if (!sendRes.error) setMode("verify-otp");
        return sendRes;
      }
      return res;
    });

  const onVerifyOTP = (e: React.FormEvent) =>
    handleAction(e, async () => {
      const res = await signUp!.verifications.verifyEmailCode({ code });
      if (signUp?.status === "complete") {
        await signUp.finalize({ navigate: ({ decorateUrl }) => router.push(decorateUrl("/dashboard")) });
      }
      return res;
    });

  const onSSOSignUp = async (strategy: "oauth_google" | "oauth_github") => {
    if (!signUp) return;
    setErrorMsg("");
    try {
      const res = await signUp.sso({
        strategy,
        redirectUrl: "/dashboard",
        redirectCallbackUrl: "/sso-callback",
      });
      if (res?.error) setErrorMsg(res.error.message);
    } catch (err) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "OAuth redirect failed.");
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary relative py-12 px-4">
      <div className="w-full max-w-[440px] bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 flex flex-col relative z-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold shadow-flat-offset-sm">P</div>
          <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
        </div>

        <h1 className="font-cursive text-3xl text-center font-bold tracking-tight mb-2">
          {mode === "verify-otp" ? "Verify Your Email" : "Create Account"}
        </h1>
        <p className="font-sans text-xs text-secondary text-center mb-6">
          {mode === "verify-otp" ? `We sent a sketchy code to ${email}` : "Join the workspace and align strategy with execution"}
        </p>

        {errorMsg && (
          <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-sans font-semibold shadow-flat-offset-sm relative">
            <span className="absolute -top-2 -right-2 bg-black text-white w-5 h-5 rounded-full flex items-center justify-center font-bold cursor-pointer" onClick={() => setErrorMsg("")}>✕</span>
            {errorMsg}
          </div>
        )}

        {mode === "signup" && (
          <form onSubmit={onSignUpSubmit} className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="font-sans text-xs font-bold uppercase tracking-wider text-secondary mb-1 block">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-secondary z-20" />
                  <input type="text" required placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full font-sans text-sm pl-10 pr-4 py-3 bg-neutral-bg border-2 border-black rounded-sketchy-sm focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all" disabled={isLoading} />
                </div>
              </div>
              <div className="flex-1">
                <label className="font-sans text-xs font-bold uppercase tracking-wider text-secondary mb-1 block">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-secondary z-20" />
                  <input type="text" required placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full font-sans text-sm pl-10 pr-4 py-3 bg-neutral-bg border-2 border-black rounded-sketchy-sm focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all" disabled={isLoading} />
                </div>
              </div>
            </div>
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-secondary mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-secondary z-20" />
                <input type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full font-sans text-sm pl-10 pr-4 py-3 bg-neutral-bg border-2 border-black rounded-sketchy-sm focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all" disabled={isLoading} />
              </div>
            </div>
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-secondary mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-secondary z-20" />
                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full font-sans text-sm pl-10 pr-4 py-3 bg-neutral-bg border-2 border-black rounded-sketchy-sm focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all" disabled={isLoading} />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-tertiary text-white font-sans font-bold text-sm py-3 px-6 rounded-full border-2 border-black shadow-flat-offset-sm hover:bg-tertiary-hover active:translate-y-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
            {/* Required for sign-up flows. Clerk's bot sign-up protection is enabled by default */}
            <div id="clerk-captcha" />
          </form>
        )}

        {mode === "verify-otp" && (
          <form onSubmit={onVerifyOTP} className="flex flex-col gap-4">
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-secondary mb-1 block">Verification Code</label>
              <div className="relative">
                <Key className="absolute left-3 top-3.5 h-4 w-4 text-secondary z-20" />
                <input type="text" required maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} className="w-full font-sans text-center text-lg font-bold tracking-widest pl-10 pr-4 py-3 bg-neutral-bg border-2 border-black rounded-sketchy-sm focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all" disabled={isLoading} />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-tertiary text-white font-sans font-bold text-sm py-3 px-6 rounded-full border-2 border-black shadow-flat-offset-sm hover:bg-tertiary-hover active:translate-y-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify Code <ArrowRight className="h-4 w-4" /></>}
            </button>
            <div className="flex justify-between items-center mt-4">
              <button type="button" onClick={() => setMode("signup")} className="text-xs font-semibold text-secondary hover:text-tertiary transition-colors cursor-pointer focus:outline-none">Back to Signup</button>
              <button type="button" onClick={() => signUp?.verifications.sendEmailCode()} disabled={isLoading} className="text-xs font-semibold text-tertiary hover:underline transition-colors cursor-pointer focus:outline-none disabled:opacity-50">Resend Code</button>
            </div>
          </form>
        )}

        {mode !== "verify-otp" && (
          <>
            <div className="flex items-center my-4">
              <div className="flex-1 border-t-2 border-dashed border-primary/10"></div>
              <span className="px-3 text-xs text-secondary font-sans font-semibold">or continue with</span>
              <div className="flex-1 border-t-2 border-dashed border-primary/10"></div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => onSSOSignUp("oauth_google")}
                className="flex items-center justify-center gap-2 font-sans font-semibold text-xs py-2.5 px-4 bg-white hover:bg-neutral-bg border-2 border-black rounded-sketchy-sm shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 w-full"
                disabled={isLoading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => onSSOSignUp("oauth_github")}
                className="flex items-center justify-center gap-2 font-sans font-semibold text-xs py-2.5 px-4 bg-white hover:bg-neutral-bg border-2 border-black rounded-sketchy-sm shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 w-full"
                disabled={isLoading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                GitHub
              </button>
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t-2 border-dashed border-primary/10 text-center">
          <p className="font-sans text-xs text-secondary">Already have an account? <Link href="/sign-in" className="text-tertiary font-bold hover:underline">Sign in</Link></p>
        </div>
      </div>
    </main>
  );
}
