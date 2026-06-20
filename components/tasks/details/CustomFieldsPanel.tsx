"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { getCustomFields, getCustomFieldValues, upsertCustomFieldValue } from "@/actions/customField";
import type { CustomField, CustomFieldValue } from "@/types";

type Props = {
  taskId: string;
  orgId: string;
};

type FieldWithValue = CustomField & { value: string };

export function CustomFieldsPanel({ taskId, orgId }: Props) {
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: fields = [], isLoading: loadingFields } = useQuery<CustomField[]>({
    queryKey: ["customFields", orgId, "TASK"],
    queryFn: async () => {
      const res = await getCustomFields(orgId, "TASK");
      if (!res.success) throw new Error(res.error || "Failed to fetch custom fields");
      return res.data ?? [];
    },
  });

  const { data: rawValues = [], isLoading: loadingValues } = useQuery<CustomFieldValue[]>({
    queryKey: ["customFieldValues", taskId],
    queryFn: async () => {
      const res = await getCustomFieldValues(taskId);
      if (!res.success) throw new Error(res.error || "Failed to fetch field values");
      return res.data ?? [];
    },
  });

  const valueMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of rawValues) {
      map[v.custom_field_id] = v.value;
    }
    return map;
  }, [rawValues]);

  const fieldsWithValues: FieldWithValue[] = useMemo(
    () => fields.map((f) => ({ ...f, value: valueMap[f.id] ?? "" })),
    [fields, valueMap]
  );

  const saveMutation = useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: string }) => {
      const res = await upsertCustomFieldValue(orgId, fieldId, taskId, value);
      if (!res.success) throw new Error(res.error || "Failed to save");
      return { fieldId };
    },
    onSuccess: ({ fieldId }) => {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["customFieldValues", taskId] });
    },
    onError: (err: Error, { fieldId }) => {
      setFieldErrors((prev) => ({ ...prev, [fieldId]: err.message }));
    },
  });

  const handleBlur = useCallback(
    (fieldId: string, value: string) => {
      saveMutation.mutate({ fieldId, value });
    },
    [saveMutation]
  );

  if (loadingFields || loadingValues) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-secondary" />
      </div>
    );
  }

  if (fields.length === 0) return null;

  return (
    <div className="border-2 border-black rounded-sketchy p-4 flex flex-col gap-4 bg-neutral-bg/20 mt-4">
      <div className="flex items-center gap-1.5 font-cursive text-lg font-bold text-primary border-b border-black/10 pb-2">
        <SlidersHorizontal className="h-4 w-4 text-secondary" />
        <span>Custom Fields</span>
      </div>

      <div className="flex flex-col gap-3">
        {fieldsWithValues.map((field) => (
          <FieldRow
            key={field.id + field.value}
            field={field}
            error={fieldErrors[field.id]}
            isSaving={saveMutation.isPending && saveMutation.variables?.fieldId === field.id}
            onBlur={handleBlur}
          />
        ))}
      </div>
    </div>
  );
}

type FieldRowProps = {
  field: FieldWithValue;
  error?: string;
  isSaving: boolean;
  onBlur: (fieldId: string, value: string) => void;
};

function FieldRow({ field, error, isSaving, onBlur }: FieldRowProps) {
  const [localValue, setLocalValue] = useState(field.value);

  const inputBase =
    "w-full px-3 py-1.5 border border-black/20 rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow";

  return (
    <div className="flex flex-col gap-0.5">
      <label className="font-sans text-xs font-semibold flex items-center gap-1">
        {field.name}
        <span className="text-[10px] text-secondary/60 font-normal">({field.field_type.toLowerCase()})</span>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-secondary ml-1" />}
      </label>

      {field.field_type === "SELECT" ? (
        <select
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={(e) => onBlur(field.id, e.target.value)}
          className={inputBase + " cursor-pointer"}
        >
          <option value="">— select —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.field_type === "DATE" ? (
        <input
          type="date"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={(e) => onBlur(field.id, e.target.value)}
          className={inputBase + " cursor-pointer"}
        />
      ) : field.field_type === "NUMBER" ? (
        <input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={(e) => onBlur(field.id, e.target.value)}
          className={inputBase}
          placeholder="0"
        />
      ) : (
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={(e) => onBlur(field.id, e.target.value)}
          className={inputBase}
          placeholder="Enter value..."
        />
      )}

      {error && (
        <span className="text-xs font-mono font-bold text-rose-600">{error}</span>
      )}
    </div>
  );
}
