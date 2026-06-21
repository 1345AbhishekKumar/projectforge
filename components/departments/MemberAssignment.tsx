import React, { useState } from "react";
import { User, RefreshCw } from "lucide-react";

type Department = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  departmentId?: string | null;
};

type Props = {
  departments: Department[];
  members: Member[];
  onAssign: (membershipId: string, departmentId: string | null) => Promise<{ success: boolean; error?: string }>;
};

export function MemberAssignment({ departments, members, onAssign }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleDepartmentChange = async (membershipId: string, value: string) => {
    setUpdatingId(membershipId);
    try {
      const deptId = value || null;
      const res = await onAssign(membershipId, deptId);
      if (!res.success) {
        alert(res.error || "Failed to assign member to department");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2 px-3 font-cursive text-sm font-bold text-secondary">Member</th>
              <th className="py-2 px-3 font-cursive text-sm font-bold text-secondary">Role</th>
              <th className="py-2 px-3 font-cursive text-sm font-bold text-secondary">Department</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-black/10 hover:bg-neutral-bg/50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-8 h-8 rounded-full border-2 border-black object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-black bg-accent-blue/40 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-sans text-sm font-bold text-primary">{member.name}</span>
                      <span className="font-sans text-xs text-secondary">{member.email}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="font-sans text-xs font-semibold px-2 py-0.5 border border-black rounded-full bg-neutral-bg">
                    {member.role}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {updatingId === member.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-secondary" />
                    ) : (
                      <select
                        value={member.departmentId || ""}
                        onChange={(e) => handleDepartmentChange(member.id, e.target.value)}
                        disabled={updatingId !== null}
                        className="bg-white border-2 border-black rounded-full px-2.5 py-1 font-sans text-xs font-bold shadow-flat-offset-sm focus:outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="">Unassigned</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center font-sans text-sm text-secondary">
                  No members found in this workspace.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
