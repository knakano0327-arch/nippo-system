import { z } from "zod";

export const visitRecordSchema = z.object({
  customer_id: z
    .number({ error: "顧客を選択してください" })
    .int()
    .positive("顧客を選択してください"),
  visit_content: z
    .string()
    .min(1, "訪問内容を入力してください")
    .max(1000, "1000文字以内で入力してください"),
  sort_order: z.number().int().nonnegative(),
});

export type VisitRecordInput = z.infer<typeof visitRecordSchema>;
