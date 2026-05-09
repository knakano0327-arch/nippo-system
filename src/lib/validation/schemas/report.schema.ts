import { z } from "zod";
import { visitRecordSchema } from "./visitRecord.schema";

export const reportStatusSchema = z.enum(["draft", "submitted", "reviewed"]);

export const createReportSchema = z.object({
  report_date: z
    .string()
    .min(1, "日付を入力してください")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください"),
  problem: z.string().max(2000, "2000文字以内で入力してください").optional(),
  plan: z.string().max(2000, "2000文字以内で入力してください").optional(),
  status: z.enum(["draft", "submitted"]),
  visit_records: z.array(visitRecordSchema).min(1, "訪問記録を1件以上入力してください"),
});

export const updateReportSchema = createReportSchema;

export const updateReportStatusSchema = z.object({
  status: z.literal("reviewed"),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;
