import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスを正しい形式で入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export type LoginInput = z.infer<typeof loginSchema>;
