import { z } from "zod";

export const createCommentSchema = z.object({
  target_type: z.enum(["problem", "plan"], {
    error: "target_type は problem または plan を指定してください",
  }),
  content: z
    .string()
    .min(1, "コメントを入力してください")
    .max(1000, "1000文字以内で入力してください"),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "コメントを入力してください")
    .max(1000, "1000文字以内で入力してください"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
