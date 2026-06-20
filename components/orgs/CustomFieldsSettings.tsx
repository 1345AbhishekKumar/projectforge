"use client";

import { useState, useEffect } from "react";
import { Trash2, Tag, Percent, Calendar, Type } from "lucide-react";
import { getCustomFields, createCustomField, deleteCustomField } from "@/actions/customField";
import type { CustomField, CustomFieldType } from "@/types";

type Props = {
  orgId: string;
};

export function CustomFieldsSettings({ orgId }: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const entityType: "TASK" | "PROJECT" = "TASK";
  const [fieldType, setFieldType] = useState<CustomFieldType>("TEXT");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadFields() {
      setLoading(true);
      setError(null);
      const res = await getCustomFields(orgId, "TASK");
      if (res.success && res.data) {
        setFields(res.data as CustomField[]);
      } else {
        setError(res.error || "Failed to load custom fields");
      }
      setLoading(false);
    }
    loadFields();
  }, [orgId]);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    const res = await createCustomField(
      orgId,
      entityType,
      name.trim(),
      fieldType,
      fieldType === "SELECT" ? options : null
    );

    if (res.success && res.data) {
      setFields((prev) => [...prev, res.data as CustomField].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setOptions([]);
      setNewOption("");
    } else {
      setError(res.error || "Failed to create custom field");
    }
    setSubmitting(false);
  };

  const handleDelete = async (fieldId: string) => {
    if (!confirm("Are you sure you want to delete this custom field? This will delete all task/project values associated with it.")) {
      return;
    }

    const res = await deleteCustomField(orgId, fieldId);
    if (res.success) {
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
    } else {
      setError(res.error || "Failed to delete custom field");
    }
  };

  const getFieldIcon = (type: CustomFieldType) => {
    switch (type) {
      case "TEXT":
        return <Type className="h-4 w-4" />;
      case "NUMBER":
        return <Percent className="h-4 w-4" />;
      case "DATE":
        return <Calendar className="h-4 w-4" />;
      case "SELECT":
        return <Tag className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="bg-accent-pink border-2 border-black rounded-sketchy p-4 font-sans text-sm font-semibold shadow-flat-offset-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creator panel */}
        <div className="lg:col-span-1 bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4">
          <h2 className="font-cursive text-2xl font-bold mb-2 underline decoration-accent-yellow decoration-2">
            Create Custom Field
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-sans text-xs font-bold text-secondary">FIELD NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Story Points, Cost Center"
                maxLength={50}
                required
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-sans text-xs font-bold text-secondary">FIELD TYPE</label>
              <select
                value={fieldType}
                onChange={(e) => {
                  setFieldType(e.target.value as CustomFieldType);
                  setOptions([]);
                }}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none cursor-pointer"
              >
                <option value="TEXT">Short Text (TEXT)</option>
                <option value="NUMBER">Number (NUMBER)</option>
                <option value="DATE">Calendar Date (DATE)</option>
                <option value="SELECT">Dropdown Selection (SELECT)</option>
              </select>
            </div>

            {fieldType === "SELECT" && (
              <div className="border-2 border-black rounded-sketchy bg-[#FFF2B2]/10 p-3 flex flex-col gap-3">
                <label className="font-sans text-xs font-bold text-secondary">DROPDOWN OPTIONS</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add choice..."
                    className="flex-1 px-3 py-1.5 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="bg-white hover:bg-neutral-bg border-2 border-black font-sans text-xs font-bold px-3 rounded-full cursor-pointer shadow-flat-offset-xs active:translate-y-0.5"
                  >
                    Add
                  </button>
                </div>

                {options.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {options.map((opt, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-white border border-black rounded px-2 py-0.5 font-sans text-xs"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i)}
                          className="text-accent-pink hover:text-red-700 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="font-sans text-xs text-secondary/60 italic">No options added yet.</span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full mt-2 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Field"}
            </button>
          </form>
        </div>

        {/* List panel */}
        <div className="lg:col-span-2 bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4">
          <h2 className="font-cursive text-2xl font-bold mb-2 underline decoration-accent-blue decoration-2">
            Active Custom Fields
          </h2>

          {loading ? (
            <div className="font-sans text-sm text-secondary italic py-8 text-center">Loading custom fields...</div>
          ) : fields.length === 0 ? (
            <div className="font-sans text-sm text-secondary italic py-12 text-center border-2 border-dashed border-black/20 rounded-sketchy">
              No custom fields configured yet. Create one on the left!
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-4 border-2 border-black rounded-sketchy bg-white hover:bg-neutral-bg/20 shadow-flat-offset-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 border-2 border-black rounded-full bg-accent-blue/30">
                      {getFieldIcon(field.field_type)}
                    </div>
                    <div>
                      <h3 className="font-sans text-sm font-bold">{field.name}</h3>
                      <p className="font-sans text-xs text-secondary/70">
                        Type: {field.field_type}
                        {field.field_type === "SELECT" && field.options && (
                          <span className="ml-2 font-semibold text-secondary">
                            ({field.options.join(", ")})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(field.id)}
                    className="p-2 border-2 border-black rounded-full bg-accent-pink hover:bg-red-300 transition-colors shadow-flat-offset-xs active:translate-y-0.5 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
