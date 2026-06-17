"use client";

import React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { MemberListItem } from "@/actions/membership";

interface MembersTabProps {
  loadingMembers: boolean;
  members: MemberListItem[];
  currentUserId?: string;
}

export function MembersTab({
  loadingMembers,
  members,
  currentUserId,
}: MembersTabProps) {
  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
      <h2 className="font-cursive text-2xl font-bold mb-2">Workspace Collaborators</h2>
      <p className="font-sans text-xs text-secondary mb-6">
        Members of the active workspace with permission to collaborate on this board scope.
      </p>

      {loadingMembers ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-tertiary mr-2" />
          <span className="font-cursive text-base">Retrieving members...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 border-2 border-black rounded-sketchy-sm bg-neutral-bg/30 hover:bg-neutral-bg/60 transition-colors"
            >
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.name}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full border-2 border-black object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center font-cursive font-bold text-sm">
                  {member.name.charAt(0)}
                </div>
              )}
              <div>
                <span className="font-semibold block text-sm font-sans flex items-center gap-1.5">
                  {member.name}
                  {member.userId === currentUserId && (
                    <span className="text-[10px] bg-neutral-bg border border-black/10 px-1 py-0.2 rounded text-secondary font-normal font-sans">
                      (you)
                    </span>
                  )}
                </span>
                <span className="text-xs text-secondary block font-sans">{member.email}</span>
              </div>
              <span className="bg-accent-blue border border-black/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ml-auto">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
