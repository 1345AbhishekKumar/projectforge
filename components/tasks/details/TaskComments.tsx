"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Send, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CommentWithUser } from "@/types";
import { createComment, getTaskComments } from "@/actions/comment";

const commentFormSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be at most 1000 characters"),
});

type CommentFormInput = z.infer<typeof commentFormSchema>;

type Props = {
  taskId: string;
  projectId: string;
  orgId: string;
  comments: CommentWithUser[];
  onCommentAdded: (newComments: CommentWithUser[]) => void;
  loadingComments: boolean;
};

export function TaskComments({ taskId, projectId, orgId, comments, onCommentAdded, loadingComments }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CommentFormInput>({
    resolver: zodResolver(commentFormSchema),
    mode: "onSubmit",
    defaultValues: {
      content: "",
    },
  });

  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  async function onCommentSubmit(data: CommentFormInput) {
    setCommentError("");
    setPostingComment(true);

    try {
      const res = await createComment(taskId, projectId, orgId, data.content);
      if (res.success) {
        reset();
        const commentsRes = await getTaskComments(taskId, orgId);
        if (commentsRes.success) {
          onCommentAdded(commentsRes.data);
        }
      } else {
        setCommentError(res.error || "Failed to post comment");
      }
    } catch {
      setCommentError("An unexpected error occurred");
    } finally {
      setPostingComment(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-6 border-t border-black/10">
      <h3 className="font-cursive text-xl font-bold">Comments</h3>

      {/* Comments List */}
      {loadingComments ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-tertiary" />
        </div>
      ) : comments.length === 0 ? (
        <p className="font-sans text-xs text-secondary/60 italic">No comments posted yet.</p>
      ) : (
        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white border-2 border-black rounded-sketchy p-4 shadow-flat-offset-sm relative"
            >
              <div className="flex items-center gap-2 mb-2">
                {comment.user?.avatar_url ? (
                  <Image
                    src={comment.user.avatar_url}
                    alt={comment.user.full_name || "User"}
                    width={24}
                    height={24}
                    className="rounded-full border border-black"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-accent-blue border border-black flex items-center justify-center font-sans text-[10px] font-bold text-primary uppercase">
                    {comment.user?.full_name?.substring(0, 2) || "ME"}
                  </div>
                )}
                <span className="font-sans text-xs font-bold">
                  {comment.user?.full_name || "Member"}
                </span>
                <span className="font-sans text-[10px] text-secondary ml-auto">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="font-sans text-xs text-primary whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* New Comment Input */}
      {commentError && (
        <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 text-xs font-semibold">
          {commentError}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onCommentSubmit)} className="flex flex-col gap-2 mt-2">
        <div className="flex gap-2 items-start">
          <textarea
            {...register("content")}
            placeholder="Type a comment..."
            rows={2}
            className={`flex-1 px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary resize-none ${
              errors.content ? "border-rose-500 bg-rose-50/20" : ""
            }`}
          />
          <button
            type="submit"
            disabled={postingComment}
            className="p-3 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex-shrink-0"
          >
            {postingComment ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.content && (
          <span aria-live="polite" className="text-xs font-mono font-bold text-rose-600 mt-1 block">
            {errors.content.message}
          </span>
        )}
      </form>
    </div>
  );
}
