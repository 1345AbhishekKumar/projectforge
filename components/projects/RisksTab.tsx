"use client";

import React, { useState } from "react";
import { Plus, Edit2, CheckCircle, X, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";

import { getOrganizationMembers } from "@/actions/membership";
import { getProjectRisks, deleteProjectRisk } from "@/actions/risk";
import { RiskFormModal } from "@/components/risks/RiskFormModal";
import { useOrgStore } from "@/store/orgStore";
import type { Risk } from "@/types";

interface RisksTabProps {
  projectId: string;
  orgId: string;
}

const probabilities: ("high" | "medium" | "low")[] = ["high", "medium", "low"];
const impacts: ("low" | "medium" | "high")[] = ["low", "medium", "high"];

function getCellColorClass(prob: string, imp: string, isSelected: boolean): string {
  const isHigh =
    (prob === "high" && imp === "high") ||
    (prob === "high" && imp === "medium") ||
    (prob === "medium" && imp === "high");
  const isLow =
    (prob === "low" && imp === "low") ||
    (prob === "low" && imp === "medium") ||
    (prob === "medium" && imp === "low");

  let base = "";
  if (isHigh) base = "bg-accent-pink hover:bg-[#FFB2B2]";
  else if (isLow) base = "bg-accent-green hover:bg-[#B3F2C9]";
  else base = "bg-accent-yellow hover:bg-[#FFF2B2]";

  return `${base} ${isSelected ? "ring-4 ring-black scale-95" : "hover:scale-[1.02]"}`;
}

export function RisksTab({ projectId, orgId }: RisksTabProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrgStore();

  const [activeCell, setActiveCell] = useState<{ probability: string; impact: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);

  const { data: risks = [], isLoading: isRisksLoading } = useQuery<Risk[]>({
    queryKey: ["risks", projectId, orgId],
    queryFn: async () => {
      const result = await getProjectRisks(orgId, projectId);
      if (!result.success) throw new Error(result.error || "Failed to load risks");
      return result.data ?? [];
    },
    enabled: !!orgId && !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => {
      const result = await getOrganizationMembers(orgId);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (riskId: string) => {
      const result = await deleteProjectRisk(orgId, projectId, riskId);
      if (!result.success) throw new Error(result.error || "Failed to resolve risk");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks", projectId, orgId] });
    },
    onError: (err: Error) => {
      alert(err.message || "Failed to resolve risk");
    },
  });

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const canManage = currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";

  const getCellRisks = (prob: string, imp: string) =>
    risks.filter((r) => r.probability === prob && r.impact === imp);

  const filteredRisks = activeCell
    ? risks.filter((r) => r.probability === activeCell.probability && r.impact === activeCell.impact)
    : risks;

  const handleCellClick = (prob: string, imp: string) => {
    if (activeCell?.probability === prob && activeCell?.impact === imp) {
      setActiveCell(null);
    } else {
      setActiveCell({ probability: prob, impact: imp });
    }
  };

  const handleResolve = (riskId: string) => {
    if (confirm("Mark this risk as resolved? It will be permanently removed.")) {
      deleteMutation.mutate(riskId);
    }
  };

  if (isRisksLoading) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
        <span className="font-cursive text-xl">Loading risk register...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-cursive text-2xl font-bold tracking-tight">Risk Register</h2>
              <p className="font-sans text-sm text-secondary mt-1">
                Identify, analyze, and mitigate potential project execution threats on the 3×3 Risk Matrix.
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => { setEditingRisk(null); setIsModalOpen(true); }}
                className="flex items-center gap-1.5 bg-accent-yellow hover:bg-[#FFEAA3] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                Log New Risk
              </button>
            )}
          </div>

          {/* Matrix & Info Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* 3x3 Matrix */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="font-sans text-xs font-bold text-secondary uppercase mb-2">
                Impact (Low ? High)
              </div>
              <div className="flex w-full">
                <div className="flex items-center justify-center font-sans text-xs font-bold text-secondary uppercase mr-2 [writing-mode:vertical-lr] rotate-180">
                  Probability (Low ? High)
                </div>
                <div className="grid grid-cols-3 gap-3 w-full aspect-square max-w-[400px] border-2 border-black p-3 bg-neutral-bg rounded-sketchy-sm">
                  {probabilities.map((prob) =>
                    impacts.map((imp) => {
                      const cellRisks = getCellRisks(prob, imp);
                      const isSelected = activeCell?.probability === prob && activeCell?.impact === imp;
                      return (
                        <button
                          key={`${prob}-${imp}`}
                          onClick={() => handleCellClick(prob, imp)}
                          className={`flex flex-col items-center justify-center p-2 rounded-sketchy-sm border-2 border-black transition-all duration-200 cursor-pointer shadow-flat-offset-sm select-none ${getCellColorClass(prob, imp, isSelected)}`}
                        >
                          <span className="font-cursive text-2xl font-black">{cellRisks.length}</span>
                          <span className="font-sans text-[9px] font-bold uppercase text-primary/80 truncate w-full text-center">
                            {prob[0]}-{imp[0]}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-4 flex-wrap justify-center text-[10px] font-sans font-bold">
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-black bg-accent-green" />Low Risk</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-black bg-accent-yellow" />Medium Risk</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-black bg-accent-pink" />Critical Risk</span>
              </div>
            </div>

            {/* Filter Info */}
            <div className="lg:col-span-5 border-2 border-black rounded-sketchy bg-neutral-bg p-5 flex flex-col gap-4">
              <h3 className="font-cursive text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent-yellow shrink-0" />
                Matrix Filters
              </h3>
              <p className="font-sans text-xs text-secondary leading-relaxed">
                Click any cell to filter the risk table below. High Probability / High Impact cells trigger dashboard warnings.
              </p>
              {activeCell ? (
                <div className="border border-black p-3 bg-white rounded-sketchy-sm flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-xs font-bold text-secondary uppercase">Active filter:</span>
                    <button
                      onClick={() => setActiveCell(null)}
                      className="text-[10px] font-bold text-accent-pink hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <span className="bg-neutral-bg border border-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Prob: {activeCell.probability}
                    </span>
                    <span className="bg-neutral-bg border border-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Impact: {activeCell.impact}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border border-black/10 border-dashed p-3 bg-white/40 text-center rounded-sketchy-sm text-xs font-medium text-secondary">
                  Showing all project risks (no cell filtered)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Risk Registry Table */}
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
          <h2 className="font-cursive text-2xl font-bold mb-4">Risk Registry Table</h2>
          {filteredRisks.length === 0 ? (
            <div className="border-2 border-dashed border-black/10 rounded-sketchy p-8 text-center text-secondary font-cursive">
              No active threats recorded in this matrix coordinate.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sans text-sm">
                <thead>
                  <tr className="border-b-2 border-black text-left text-xs font-bold text-secondary uppercase bg-neutral-bg">
                    <th className="p-3 border-r border-black text-primary">Risk Details</th>
                    <th className="p-3 border-r border-black w-24 text-center text-primary">Probability</th>
                    <th className="p-3 border-r border-black w-24 text-center text-primary">Impact</th>
                    <th className="p-3 border-r border-black text-primary">Mitigation Plan</th>
                    {canManage && <th className="p-3 w-28 text-center text-primary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRisks.map((risk) => (
                    <tr key={risk.id} className="border-b border-black/10 hover:bg-neutral-bg/30">
                      <td className="p-3 border-r border-black/10 font-semibold text-primary">{risk.title}</td>
                      <td className="p-3 border-r border-black/10 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-black text-primary ${risk.probability === "high" ? "bg-accent-pink" : risk.probability === "medium" ? "bg-accent-yellow" : "bg-accent-green"}`}>
                          {risk.probability}
                        </span>
                      </td>
                      <td className="p-3 border-r border-black/10 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-black text-primary ${risk.impact === "high" ? "bg-accent-pink" : risk.impact === "medium" ? "bg-accent-yellow" : "bg-accent-green"}`}>
                          {risk.impact}
                        </span>
                      </td>
                      <td className="p-3 border-r border-black/10 text-xs text-secondary italic whitespace-pre-line max-w-sm">
                        {risk.mitigation_plan || "No mitigation mapped."}
                      </td>
                      {canManage && (
                        <td className="p-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => { setEditingRisk(risk); setIsModalOpen(true); }}
                              className="p-1 border border-black bg-white hover:bg-accent-yellow rounded shadow-flat-offset-sm active:translate-y-0.5 transition-all cursor-pointer text-primary"
                              title="Edit Risk"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleResolve(risk.id)}
                              className="p-1 border border-black bg-white hover:bg-accent-green rounded shadow-flat-offset-sm active:translate-y-0.5 transition-all cursor-pointer text-primary"
                              title="Resolve & Delete"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {activeOrgId && (
        <RiskFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingRisk(null); }}
          editingRisk={editingRisk}
          projectId={projectId}
          activeOrgId={activeOrgId}
        />
      )}
    </>
  );
}
