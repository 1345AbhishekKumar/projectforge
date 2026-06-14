"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  // Form fields state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate email on blur/submit
  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError("Email address is required!");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError("Please enter a valid email address!");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Validate password on blur/submit
  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError("Password is required!");
      return false;
    }
    if (val.length < 8) {
      setPasswordError("Password must be at least 8 characters long!");
      return false;
    }
    setPasswordError("");
    return true;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);
    setLoadingText("Checking credentials...");

    // Simulate authentication processing
    setTimeout(() => {
      // Demo authentication simulation
      if (email === "error@devops.com") {
        setGlobalError("Database sync failed! User profile could not be retrieved.");
        setIsLoading(false);
      } else if (password === "wrongpassword") {
        setGlobalError("Invalid email or password. Please try again.");
        setIsLoading(false);
      } else {
        setLoadingText("Logging you in...");
        setTimeout(() => {
          setIsSuccess(true);
          setIsLoading(false);
          // Simulating redirect
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        }, 1000);
      }
    }, 1500);
  };

  // Handle OAuth Simulation
  const handleOAuth = (provider: string) => {
    setIsLoading(true);
    setLoadingText(`Connecting to ${provider}...`);
    setGlobalError("");

    setTimeout(() => {
      setLoadingText("Verifying credentials...");
      setTimeout(() => {
        setIsSuccess(true);
        setIsLoading(false);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }, 1000);
    }, 1500);
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary relative py-12 px-4">
      {/* Paper grain overlay */}
      <div className="bg-grain" />

      {/* Global Error Banner */}
      {globalError && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-accent-pink border-2 border-black text-black px-4 py-3 rounded-sketchy-sm shadow-flat-offset flex items-center gap-3 z-30 transition-all duration-300 transform translate-y-0 animate-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5 text-black shrink-0" />
          <div className="flex-1 text-sm font-sans font-medium">{globalError}</div>
          <button 
            onClick={() => setGlobalError("")}
            className="text-black hover:font-bold px-1 text-lg font-cursive"
          >
            ×
          </button>
        </div>
      )}

      {/* Login Card */}
      <div className="w-full max-w-[440px] bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 flex flex-col relative z-10">
        
        {/* Success checkmark Overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-white/95 rounded-sketchy z-40 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-accent-green rounded-full border-2 border-black flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-black" />
            </div>
            <h2 className="font-cursive text-3xl font-bold text-center mb-2">Welcome Back!</h2>
            <p className="font-sans text-sm text-secondary text-center">Redirecting to your workspace...</p>
          </div>
        )}

        {/* Title */}
        <div className="mb-8 text-center">
          <Link href="/" className="font-cursive text-4xl font-bold tracking-tight inline-block hover:rotate-[-2deg] transition-transform">
            ProjectForge<span className="text-tertiary">.</span>
          </Link>
          <p className="font-sans text-sm text-secondary mt-2">
            Work, together, right now.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div className="space-y-1">
            <label className="block font-cursive text-lg font-bold text-black pl-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                disabled={isLoading}
                className={`w-full font-sans text-sm pl-10 pr-4 py-3 bg-neutral-bg border-2 border-black rounded-sketchy-sm focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all disabled:opacity-50 ${
                  emailError ? "border-red-500 ring-2 ring-red-500/20" : ""
                }`}
              />
            </div>
            {emailError && (
              <p className="font-sans text-xs text-red-600 pl-1 animate-in slide-in-from-top-1 duration-200">
                {emailError}
              </p>
            )}
          </div>

          {/* Password input */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline pl-1 pr-1">
              <label className="font-cursive text-lg font-bold text-black">
                Password
              </label>
              <Link 
                href="#" 
                className="font-sans text-xs text-tertiary hover:underline hover:text-tertiary-hover"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Forgot password function is out of scope for MVP V1!");
                }}
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) validatePassword(e.target.value);
                }}
                onBlur={(e) => validatePassword(e.target.value)}
                disabled={isLoading}
                className={`w-full font-sans text-sm pl-10 pr-4 py-3 bg-neutral-bg border-2 border-black rounded-sketchy-sm focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all disabled:opacity-50 ${
                  passwordError ? "border-red-500 ring-2 ring-red-500/20" : ""
                }`}
              />
            </div>
            {passwordError && (
              <p className="font-sans text-xs text-red-600 pl-1 animate-in slide-in-from-top-1 duration-200">
                {passwordError}
              </p>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative group bg-tertiary text-white font-sans font-bold text-sm py-3 px-6 rounded-full border-2 border-black shadow-flat-offset-sm hover:bg-tertiary-hover active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{loadingText}</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 border-t border-dashed border-black/20" />
          <span className="relative font-cursive text-sm bg-white px-3 text-secondary select-none">
            or use whiteboard auth
          </span>
        </div>

        {/* OAuth Social Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleOAuth("Google")}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 font-sans font-semibold text-xs py-2.5 px-4 bg-white hover:bg-neutral-bg border-2 border-black rounded-sketchy-sm shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuth("GitHub")}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 font-sans font-semibold text-xs py-2.5 px-4 bg-white hover:bg-neutral-bg border-2 border-black rounded-sketchy-sm shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        {/* Footer info link */}
        <p className="font-sans text-xs text-center text-secondary mt-8 select-none">
          Don't have an account yet?{" "}
          <Link href="/signup" className="text-tertiary font-bold hover:underline hover:text-tertiary-hover">
            Sign Up
          </Link>
        </p>
      </div>
    </main>
  );
}
