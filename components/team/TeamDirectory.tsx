import React from "react";
import { User as UserIcon, Briefcase, CheckSquare } from "lucide-react";
import type { TeamMember } from "@/types";

type Props = {
  members: TeamMember[];
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-accent-purple text-white",
  ADMIN: "bg-accent-blue text-primary",
  MEMBER: "bg-accent-green text-primary",
};

function MemberCard({ member }: { member: TeamMember }) {
  const initials = member.full_name
    ? member.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm hover:-translate-y-1 hover:shadow-flat-offset transition-all duration-200 flex flex-col items-center gap-4">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full border-2 border-black bg-neutral-bg flex items-center justify-center overflow-hidden shadow-flat-offset-sm shrink-0">
        {member.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatar_url}
            alt={member.full_name || "Member"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-cursive text-2xl font-bold text-secondary">{initials}</span>
        )}
      </div>

      {/* Name & Role */}
      <div className="text-center w-full">
        <p className="font-cursive text-lg font-bold truncate">
          {member.full_name || "Unknown Member"}
        </p>
        <p className="font-sans text-xs text-secondary/60 truncate mb-2">
          {member.email}
        </p>
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans border border-black/20 ${
            ROLE_COLORS[member.role] || "bg-neutral-bg text-primary"
          }`}
        >
          {member.role}
        </span>
      </div>

      {/* Stats */}
      <div className="w-full grid grid-cols-2 gap-3 pt-2 border-t border-black/10">
        <div className="flex flex-col items-center gap-1 bg-accent-yellow border-2 border-black rounded-sketchy-sm p-3 shadow-flat-offset-sm">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="font-cursive text-xl font-bold leading-none">
            {member.assigned_task_count}
          </span>
          <span className="font-sans text-[10px] text-secondary/70 text-center leading-tight">
            Assigned Tasks
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 bg-accent-blue border-2 border-black rounded-sketchy-sm p-3 shadow-flat-offset-sm">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="font-cursive text-xl font-bold leading-none">
            {member.active_project_count}
          </span>
          <span className="font-sans text-[10px] text-secondary/70 text-center leading-tight">
            Active Projects
          </span>
        </div>
      </div>
    </div>
  );
}

export function TeamDirectory({ members }: Props) {
  if (members.length === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
          <UserIcon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-cursive text-2xl font-bold mb-2">No Members Found</h3>
        <p className="font-sans text-sm text-secondary/70">
          Invite members to this workspace to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {members.map((member) => (
        <MemberCard key={member.user_id} member={member} />
      ))}
    </div>
  );
}
