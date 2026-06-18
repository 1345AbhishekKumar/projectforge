"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    // Log the exception to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary p-6">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-10 text-center max-w-md w-full rotate-[-0.5deg]">
        <div className="w-16 h-16 bg-accent-pink border-2 border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-flat-offset-sm animate-bounce">
          <span className="font-cursive text-3xl font-bold">!</span>
        </div>
        
        <h2 className="font-cursive text-3xl font-bold mb-4">
          Oops, something went wrong!
        </h2>
        
        <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
          An unexpected error occurred while loading this section. Our team has been notified, and we are on it!
        </p>

        {error.digest && (
          <div className="bg-neutral-bg border border-black/10 rounded-sketchy-sm p-2.5 mb-6 font-mono text-[10px] text-secondary/75 break-all">
            Digest: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-accent-yellow border-2 border-black rounded-full text-sm font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2.5 bg-white border-2 border-black rounded-full text-sm font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all text-center"
          >
            Go Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
