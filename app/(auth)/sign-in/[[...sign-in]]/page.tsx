"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, Key, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"password" | "otp" | "verify-otp">("password");
  const [errorMsg, setErrorMsg] = useState("");

  const isLoading = fetchStatus === "fetching";

  const handleAction = async (e: React.FormEvent, fn: () => Promise<any>) => {
    e.preventDefault();
    if (!signIn) return;
    setErrorMsg("");
    try {
      const res = await fn();
      if (res?.error) setErrorMsg(res.error.message);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred. Please try again.");
    }
  };

  const finalizeSession = async () => {
    if (signIn?.status === "complete") {
      await signIn.finalize({ navigate: ({ decorateUrl }) => router.push(decorateUrl("/dashboard")) });
    }
  };

  const onPasswordSignIn = (e: React.FormEvent) =>
    handleAction(e, async () => {
      const res = await signIn!.password({ identifier: email, password });
      await finalizeSession();
      return res;
    });

  const onSendOTP = (e: React.FormEvent) =>
    handleAction(e, async () => {
      const res = await signIn!.emailCode.sendCode({ emailAddress: email });
      if (!res.error) setMode("verify-otp");
      return res;
    });

  const onVerifyOTP = (e: React.FormEvent) =>
    handleAction(e, async () => {
      const res = await signIn!.emailCode.verifyCode({ code });
      await finalizeSession();
      return res;
    });

  const onSSOSignIn = async (strategy: "oauth_google" | "oauth_github") => {
    if (!signIn) return;
    setErrorMsg("");
    try {
      const res = await signIn.sso({
        strategy,
        redirectUrl: "/dashboard",
        redirectCallbackUrl: "/sso-callback",
      });
      if (res?.error) setErrorMsg(res.error.message);
    } catch (err: any) {
      setErrorMsg(err.message || "OAuth redirect failed.");
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
          {mode === "verify-otp" ? "Verify Your Email" : "Welcome Back"}
        </h1>
        <p className="font-sans text-xs text-secondary text-center mb-6">
          {mode === "verify-otp" ? `We sent a sketchy code to ${email}` : "Let's align your execution with strategy"}
        </p>

        {errorMsg && (
          <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-sans font-semibold shadow-flat-offset-sm relative">
            <span className="absolute -top-2 -right-2 bg-black text-white w-5 h-5 rounded-full flex items-center justify-center font-bold cursor-pointer" onClick={() => setErrorMsg("")}>✕</span>
            {errorMsg}
          </div>
        )}

        {mode === "password" && (
          <form onSubmit={onPasswordSignIn} className="flex flex-col gap-4">
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
            <button type="button" onClick={() => setMode("otp")} className="text-xs font-semibold text-secondary hover:text-tertiary transition-colors mt-4 text-center cursor-pointer focus:outline-none">Sign in with Email OTP instead</button>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={onSendOTP} className="flex flex-col gap-4">
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-secondary mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-secondary z-20" />
                <input type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full font-sans text-sm pl-10 pr-4 py-3 bg-neutral-bg border-2 border-black rounded-sketchy-sm focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all" disabled={isLoading} />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-tertiary text-white font-sans font-bold text-sm py-3 px-6 rounded-full border-2 border-black shadow-flat-offset-sm hover:bg-tertiary-hover active:translate-y-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send One-Time Code <ArrowRight className="h-4 w-4" /></>}
            </button>
            <button type="button" onClick={() => setMode("password")} className="text-xs font-semibold text-secondary hover:text-tertiary transition-colors mt-4 text-center cursor-pointer focus:outline-none">Sign in with password instead</button>
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
              <button type="button" onClick={() => setMode("otp")} className="text-xs font-semibold text-secondary hover:text-tertiary transition-colors cursor-pointer focus:outline-none">Back to Email</button>
              <button type="button" onClick={onSendOTP} disabled={isLoading} className="text-xs font-semibold text-tertiary hover:underline transition-colors cursor-pointer focus:outline-none disabled:opacity-50">Resend Code</button>
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
                onClick={() => onSSOSignIn("oauth_google")}
                className="flex items-center justify-center gap-2 font-sans font-semibold text-xs py-2.5 px-4 bg-white hover:bg-neutral-bg border-2 border-black rounded-sketchy-sm shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 w-full"
                disabled={isLoading}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => onSSOSignIn("oauth_github")}
                className="flex items-center justify-center gap-2 font-sans font-semibold text-xs py-2.5 px-4 bg-white hover:bg-neutral-bg border-2 border-black rounded-sketchy-sm shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 w-full"
                disabled={isLoading}
              >
                GitHub
              </button>
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t-2 border-dashed border-primary/10 text-center">
          <p className="font-sans text-xs text-secondary">New to ProjectForge? <Link href="/sign-up" className="text-tertiary font-bold hover:underline">Create an account</Link></p>
        </div>
      </div>
    </main>
  );
}
