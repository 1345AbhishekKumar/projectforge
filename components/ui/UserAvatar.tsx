"use client";

import React from "react";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({
  avatarUrl,
  fullName,
  email,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClasses = {
    xs: "w-5 h-5 border text-[8px]",
    sm: "w-6.5 h-6.5 border text-[10px]",
    md: "w-7 h-7 border-2 text-xs",
    lg: "w-8 h-8 border-2 text-sm",
  };

  const iconSizes = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  const imageSizes = {
    xs: 20,
    sm: 26,
    md: 28,
    lg: 32,
  };

  const initials = fullName
    ? fullName.charAt(0).toUpperCase()
    : email
    ? email.charAt(0).toUpperCase()
    : "";

  return (
    <div
      className={`rounded-full border-black bg-white flex items-center justify-center overflow-hidden shrink-0 relative shadow-sm ${sizeClasses[size]} ${className}`}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={fullName || "User avatar"}
          width={imageSizes[size]}
          height={imageSizes[size]}
          unoptimized
          className="w-full h-full object-cover"
        />
      ) : initials ? (
        <span className="font-cursive font-bold text-primary">
          {initials}
        </span>
      ) : (
        <UserIcon className={`${iconSizes[size]} text-secondary/40`} />
      )}
    </div>
  );
}
