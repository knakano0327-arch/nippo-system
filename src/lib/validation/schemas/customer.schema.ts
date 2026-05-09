import { z } from "zod";

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, "顧客名を入力してください")
    .max(100, "顧客名は100文字以内で入力してください"),
  address: z.string().max(255, "住所は255文字以内で入力してください").optional(),
  phone: z
    .string()
    .max(20, "電話番号は20文字以内で入力してください")
    .regex(/^[\d\-]*$/, "電話番号の形式が正しくありません")
    .optional(),
  industry: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
