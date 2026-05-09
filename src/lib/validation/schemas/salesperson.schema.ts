import { z } from "zod";

const baseSchema = z.object({
  name: z.string().min(1, "氏名を入力してください").max(50, "氏名は50文字以内で入力してください"),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .max(255)
    .email("メールアドレスを正しい形式で入力してください"),
  department: z.string().max(100, "所属部署は100文字以内で入力してください").optional(),
  is_manager: z.boolean().optional().default(false),
});

export const createSalespersonSchema = baseSchema.extend({
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

export const updateSalespersonSchema = baseSchema.extend({
  password: z.string().min(8, "パスワードは8文字以上で入力してください").optional(),
});

export type CreateSalespersonInput = z.infer<typeof createSalespersonSchema>;
export type UpdateSalespersonInput = z.infer<typeof updateSalespersonSchema>;
