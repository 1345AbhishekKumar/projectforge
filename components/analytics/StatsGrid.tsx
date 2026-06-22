"use client";

import { FolderKanban, ClipboardList, Users, AlertTriangle } from "lucide-react";

type Props = {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalMembers: number;
};

export function StatsGrid({
  totalProjects,
  activeProjects,
  completedProjects,
  totalTasks,
  completedTasks,
  overdueTasks,
  totalMembers,
}: Props) {
  const stats = [
    {
      title: "Total Projects",
      value: totalProjects,
      description: "Mapped organizational workspaces",
      icon: FolderKanban,
      bgClass: "bg-white",
    },
    {
      title: "Active Projects",
      value: activeProjects,
      description: "Currently actively tracked",
      icon: FolderKanban,
      bgClass: "bg-accent-blue", // Muted Blue
    },
    {
      title: "Completed Projects",
      value: completedProjects,
      description: "Successfully shipped boards",
      icon: FolderKanban,
      bgClass: "bg-accent-green", // Muted Green
    },
    {
      title: "Total Tasks",
      value: totalTasks,
      description: "Mapped execution cards",
      icon: ClipboardList,
      bgClass: "bg-white",
    },
    {
      title: "Completed Tasks",
      value: completedTasks,
      description: "Tasks in DONE status",
      icon: ClipboardList,
      bgClass: "bg-accent-green", // Muted Green
    },
    {
      title: "Overdue Tasks",
      value: overdueTasks,
      description: "Missed target due dates",
      icon: AlertTriangle,
      bgClass: "bg-accent-pink", // Muted Pink
      warning: overdueTasks > 0,
    },
    {
      title: "Team Members",
      value: totalMembers,
      description: "Active collaborators in org",
      icon: Users,
      bgClass: "bg-accent-yellow", // Muted Yellow
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        // Apply slight rotation offset for sketchy look
        const rotations = ["rotate-[-1deg]", "rotate-[1.2deg]", "rotate-[-0.5deg]", "rotate-[0.8deg]"];
        const rot = rotations[idx % rotations.length];

        return (
          <div
            key={stat.title}
            className={`border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm hover:-translate-y-0.5 hover:shadow-flat-offset active:scale-[0.98] transition-[transform,box-shadow] duration-200 ${stat.bgClass} ${rot}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-cursive text-lg font-bold text-secondary">{stat.title}</span>
              <Icon className={`h-5 w-5 ${stat.warning ? "text-accent-pink animate-bounce" : "text-primary"}`} />
            </div>
            
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className={`font-cursive text-4xl font-black ${stat.warning ? "text-primary animate-pulse" : ""}`}>
                {stat.value}
              </span>
            </div>

            <p className="font-sans text-xs text-secondary/70">
              {stat.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
