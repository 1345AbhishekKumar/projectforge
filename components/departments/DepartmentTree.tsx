"use client";

import React, { useState, useEffect } from "react";
import { Edit2, Trash2, User, Users } from "lucide-react";

type Department = {
  id: string;
  name: string;
  parent_department_id: string | null;
  manager_id: string | null;
};

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  departmentId?: string | null;
};

type Props = {
  departments: Department[];
  members: Member[];
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
};

export function DepartmentTree({ departments, members, onEdit, onDelete }: Props) {
  const [isPointerFine, setIsPointerFine] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(pointer: fine)");
      const timer = setTimeout(() => {
        setIsPointerFine(mediaQuery.matches);
      }, 0);
      const handler = (e: MediaQueryListEvent) => setIsPointerFine(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => {
        clearTimeout(timer);
        mediaQuery.removeEventListener("change", handler);
      };
    }
  }, []);
  // Build a parent-child map
  const roots = departments.filter((d) => !d.parent_department_id);
  const childrenMap = new Map<string, Department[]>();
  departments.forEach((d) => {
    if (d.parent_department_id) {
      if (!childrenMap.has(d.parent_department_id)) {
        childrenMap.set(d.parent_department_id, []);
      }
      childrenMap.get(d.parent_department_id)!.push(d);
    }
  });

  const renderNode = (dept: Department) => {
    const children = childrenMap.get(dept.id) || [];
    const manager = members.find((m) => m.userId === dept.manager_id);
    const deptMembers = members.filter((m) => m.departmentId === dept.id);

    return (
      <div key={dept.id} className="flex flex-col gap-2">
        <div className={`flex items-center justify-between p-4 border-2 border-black rounded-sketchy bg-white shadow-flat-offset-sm transition-[transform,background-color,box-shadow,color] duration-150 gap-4 ${
          isPointerFine ? "hover:-translate-y-0.5" : ""
        }`}>
          <div className="flex flex-col gap-1">
            <span className="font-cursive text-lg font-bold text-primary">{dept.name}</span>
            <div className="flex flex-wrap items-center gap-3 text-xs text-secondary font-sans">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-secondary" />
                Manager: <span className="font-semibold text-primary">{manager ? manager.name : "Unassigned"}</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-secondary" />
                Members: <span className="font-semibold text-primary">{deptMembers.length}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(dept)}
              className={`p-1.5 border border-black rounded shadow-flat-offset-xs transition-[transform,background-color,box-shadow] duration-150 cursor-pointer bg-white ${
                isPointerFine ? "hover:bg-neutral-bg" : ""
              }`}
              title="Edit Department"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(dept.id)}
              className={`p-1.5 bg-accent-pink border border-black rounded shadow-flat-offset-xs transition-[transform,background-color,box-shadow] duration-150 cursor-pointer text-primary ${
                isPointerFine ? "hover:bg-opacity-80" : ""
              }`}
              title="Delete Department"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {children.length > 0 && (
          <div className="flex flex-col gap-2 border-l-2 border-dashed border-black/20 pl-4 py-1 ml-4">
            {children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (departments.length === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center">
        <p className="font-sans text-sm text-secondary">
          No departments created yet. Create one to start structuring your organization!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {roots.map((root) => renderNode(root))}
    </div>
  );
}
