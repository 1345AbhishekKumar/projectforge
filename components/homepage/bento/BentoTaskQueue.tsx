"use client";

import React, { useState, useEffect } from "react";

interface TaskItem {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  status: "Review" | "Pending" | "Done";
  time: string;
  color: string;
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: "1",
    title: "Review PR #412 — OAuth login callbacks",
    priority: "High",
    status: "Review",
    time: "2m ago",
    color: "bg-accent-pink",
  },
  {
    id: "2",
    title: "Optimize GSAP scroll trigger performance",
    priority: "High",
    status: "Pending",
    time: "15m ago",
    color: "bg-accent-yellow",
  },
  {
    id: "3",
    title: "Deploy serverless migrations to Vercel",
    priority: "Medium",
    status: "Pending",
    time: "1h ago",
    color: "bg-accent-blue",
  },
  {
    id: "4",
    title: "Verify screen reader aria-labels",
    priority: "Low",
    status: "Done",
    time: "3h ago",
    color: "bg-accent-green",
  },
];

export default function BentoTaskQueue() {
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);

  // Task Auto-sorting Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prevTasks) => {
        const newTasks = [...prevTasks];
        const first = newTasks.shift();
        if (first) {
          const statuses: ("Review" | "Pending" | "Done")[] = ["Review", "Pending", "Done"];
          first.status = statuses[Math.floor(Math.random() * statuses.length)];
          newTasks.splice(Math.floor(Math.random() * (newTasks.length + 1)), 0, first);
        }
        return newTasks;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="bento-card md:col-span-1 md:row-span-2 border-2 rounded-sketchy p-8 flex flex-col justify-between min-h-[500px] transition-[transform,box-shadow] duration-300 bg-white border-black shadow-flat-offset"
    >
      <div>
        <span
          className="text-xs font-mono font-bold tracking-wider uppercase px-3.5 py-1 rounded-full border transition-colors duration-300 bg-slate-100 text-slate-755 border-black"
        >
          Automated Sorting
        </span>
        <h3
          className="font-cursive text-3xl font-bold tracking-tight mt-6 mb-3 transition-colors duration-300 text-slate-900"
        >
          Task Priority Queue
        </h3>
        <p
          className="text-sm mb-6 transition-colors duration-300 text-slate-655"
        >
          Tasks self-arrange based on real-time activity and dependencies. Never lose focus on
          critical blocker items.
        </p>
      </div>

      {/* Dynamic Task List Container */}
      <div className="flex-1 flex flex-col gap-4 min-h-[280px] relative justify-start">
        {tasks.map((task, index) => {
          const rotation = index % 2 === 0 ? "rotate-[1deg]" : "-rotate-[1deg]";
          // Follow Hero.tsx: bg-zinc-850, etc. for light mode
          const cardBgClass = `${task.color} text-black border-black/10`;
          const cardShadow = "shadow-[2px_4px_8px_rgba(0,0,0,0.12)]";
          return (
            <div
              key={task.id}
              style={{ contentVisibility: "auto" }}
              className={`p-4 border-2 border-black rounded-sketchy-sm flex flex-col gap-2 relative group transition-[transform,background-color] duration-300 ${cardBgClass} ${cardShadow} ${rotation}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border bg-white text-black border-black"
                >
                  {task.priority}
                </span>
                <span
                  className="text-[10px] font-mono transition-colors duration-300 text-slate-600"
                >
                  {task.time}
                </span>
              </div>

              <span className="text-xs font-bold leading-tight">{task.title}</span>

              <div
                className="flex items-center justify-between mt-1 pt-1.5 border-t transition-colors duration-300 border-black/10 text-slate-700"
              >
                <span className="text-[10px] font-mono">
                  Status: <strong className="font-bold">{task.status}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  {task.status === "Review" && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse border border-black"
                    ></span>
                  )}
                  {task.status === "Pending" && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black"
                    ></span>
                  )}
                  {task.status === "Done" && (
                    <svg
                      className="w-3.5 h-3.5 text-emerald-700"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
