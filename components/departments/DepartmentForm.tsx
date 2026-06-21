import React, { useState, useEffect } from "react";
import { Check, X } from "lucide-react";

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
};

type Props = {
  orgId: string;
  members: Member[];
  departments: Department[];
  editingDept: Department | null;
  onSuccess: () => void;
  onCancelEdit: () => void;
  onCreate: (name: string, parentId: string | null, managerId: string | null) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (id: string, name: string, parentId: string | null, managerId: string | null) => Promise<{ success: boolean; error?: string }>;
};

export function DepartmentForm({
  members,
  departments,
  editingDept,
  onSuccess,
  onCancelEdit,
  onCreate,
  onUpdate,
}: Props) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingDept) {
      setName(editingDept.name);
      setParentId(editingDept.parent_department_id || "");
      setManagerId(editingDept.manager_id || "");
      setError(null);
    } else {
      setName("");
      setParentId("");
      setManagerId("");
      setError(null);
    }
  }, [editingDept]);

  // Filter out the editing department and its descendants from the parent list
  // to prevent cycles in client dropdown
  const getAvailableParents = () => {
    if (!editingDept) return departments;

    const childIds = new Set<string>();
    const childrenMap = new Map<string, string[]>();
    departments.forEach((d) => {
      if (d.parent_department_id) {
        if (!childrenMap.has(d.parent_department_id)) {
          childrenMap.set(d.parent_department_id, []);
        }
        childrenMap.get(d.parent_department_id)!.push(d.id);
      }
    });

    const collectChildren = (id: string) => {
      childIds.add(id);
      const children = childrenMap.get(id) || [];
      children.forEach(collectChildren);
    };

    collectChildren(editingDept.id);

    return departments.filter((d) => !childIds.has(d.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Department name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const parentValue = parentId || null;
      const managerValue = managerId || null;

      let res;
      if (editingDept) {
        res = await onUpdate(editingDept.id, name.trim(), parentValue, managerValue);
      } else {
        res = await onCreate(name.trim(), parentValue, managerValue);
      }

      if (res.success) {
        setName("");
        setParentId("");
        setManagerId("");
        onSuccess();
      } else {
        setError(res.error || "An error occurred");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableParents = getAvailableParents();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="font-sans text-xs font-semibold mb-1 block text-primary">
          Department Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineering, Marketing"
          className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black text-primary placeholder:text-secondary/40"
        />
      </div>

      <div>
        <label className="font-sans text-xs font-semibold mb-1 block text-primary">
          Parent Department
        </label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black text-primary cursor-pointer"
        >
          <option value="">None (Root Department)</option>
          {availableParents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-sans text-xs font-semibold mb-1 block text-primary">
          Department Manager
        </label>
        <select
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black text-primary cursor-pointer"
        >
          <option value="">None (Unassigned)</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name} ({m.email})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-accent-pink/20 border border-accent-pink p-3 rounded-sketchy-sm text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <Check className="h-3.5 w-3.5" />
          {editingDept ? "Update" : "Create"}
        </button>

        {editingDept && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 py-2 bg-white hover:bg-neutral-bg text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
