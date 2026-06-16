"use client";

import React, { useState } from "react";
import { Paperclip, Loader2, Download, Trash2, File as FileIcon } from "lucide-react";
import { createAttachment, getTaskAttachments, deleteAttachment } from "@/actions/attachment";
import { insforge } from "@/lib/insforge-client";
import type { AttachmentWithUser } from "@/types";

type Props = {
  taskId: string;
  projectId: string;
  orgId: string;
  attachments: AttachmentWithUser[];
  onAttachmentsChanged: (newAttachments: AttachmentWithUser[]) => void;
  loadingAttachments: boolean;
};

export function TaskAttachments({
  taskId,
  projectId,
  orgId,
  attachments,
  onAttachmentsChanged,
  loadingAttachments,
}: Props) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadingFile(true);
    setUploadProgress(0);

    try {
      if (file.size > 20 * 1024 * 1024) {
        setUploadError("File size exceeds 20MB limit");
        setUploadingFile(false);
        return;
      }

      const blockedExtensions = [".exe", ".bat", ".cmd", ".sh", ".js", ".vbs", ".scr", ".msi", ".com"];
      const fileNameLower = file.name.toLowerCase();
      const isBlocked = blockedExtensions.some((ext) => fileNameLower.endsWith(ext));
      if (isBlocked) {
        setUploadError("Dangerous file types (scripts/executables) are blocked");
        setUploadingFile(false);
        return;
      }

      setUploadProgress(10);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 150);

      const storagePath = `${orgId}/${projectId}/${taskId}/${Date.now()}-${file.name}`;
      const { data, error } = await insforge.storage.from("attachments").upload(storagePath, file);

      clearInterval(interval);

      if (error || !data) {
        setUploadError(error?.message || "Failed to upload file to storage");
        setUploadingFile(false);
        return;
      }

      setUploadProgress(100);

      const res = await createAttachment(taskId, projectId, orgId, file.name, file.size, data.url, data.key);

      if (res.success) {
        const attachmentsRes = await getTaskAttachments(taskId, orgId);
        if (attachmentsRes.success) {
          onAttachmentsChanged(attachmentsRes.data);
        }
      } else {
        setUploadError(res.error || "Failed to save file metadata");
      }
    } catch {
      setUploadError("An unexpected error occurred");
    } finally {
      setUploadingFile(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }

  async function handleFileDelete(attachmentId: string) {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    setUploadError("");
    try {
      const res = await deleteAttachment(attachmentId, orgId, projectId);
      if (res.success) {
        const attachmentsRes = await getTaskAttachments(taskId, orgId);
        if (attachmentsRes.success) {
          onAttachmentsChanged(attachmentsRes.data);
        }
      } else {
        setUploadError(res.error || "Failed to delete attachment");
      }
    } catch {
      setUploadError("An unexpected error occurred");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-cursive text-xl font-bold">Attachments</h3>

      {/* Drag & Drop Zone */}
      <label className="border-2 border-dashed border-black rounded-sketchy p-6 text-center hover:bg-neutral-bg/30 transition-all cursor-pointer block relative">
        <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploadingFile} />
        <div className="flex flex-col items-center gap-2">
          <Paperclip className="h-8 w-8 text-secondary" />
          <span className="font-sans text-sm font-bold">Click to attach file</span>
          <span className="font-sans text-xs text-secondary/70">Max size 20MB. Scripts are blocked.</span>
        </div>
      </label>

      {/* Progress Bar */}
      {uploadingFile && (
        <div className="w-full bg-neutral-dot border-2 border-black rounded-full h-4 overflow-hidden relative">
          <div
            className="bg-tertiary h-full transition-all duration-300 border-r-2 border-black"
            style={{ width: `${uploadProgress}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-sans text-[10px] font-bold text-primary">
            Uploading... {uploadProgress}%
          </span>
        </div>
      )}

      {uploadError && (
        <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 text-xs font-semibold">
          {uploadError}
        </div>
      )}

      {/* Attachments List */}
      {loadingAttachments ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-tertiary" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="font-sans text-xs text-secondary/60 italic">No attachments uploaded yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border-2 border-black rounded-sketchy bg-white shadow-flat-offset-sm gap-2"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileIcon className="h-5 w-5 text-tertiary flex-shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="font-sans text-xs font-bold truncate">{file.file_name}</span>
                  <span className="font-sans text-[10px] text-secondary">
                    {formatBytes(file.file_size)} • by {file.user?.full_name || "Member"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={file.file_url}
                  download={file.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 border-2 border-black rounded-full hover:bg-neutral-bg flex items-center justify-center shadow-flat-offset-xs active:translate-y-0.5 transition-all"
                  title="Download file"
                >
                  <Download className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => handleFileDelete(file.id)}
                  className="p-1 border-2 border-black rounded-full hover:bg-accent-pink flex items-center justify-center shadow-flat-offset-xs active:translate-y-0.5 transition-all text-secondary hover:text-primary cursor-pointer"
                  title="Delete file"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
