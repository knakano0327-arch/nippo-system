"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const baseFields = {
  name: z.string().min(1, "氏名を入力してください").max(50, "氏名は50文字以内で入力してください"),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .max(255)
    .email("メールアドレスを正しい形式で入力してください"),
  department: z.string().max(100, "所属部署は100文字以内で入力してください").optional(),
  is_manager: z.boolean(),
};

const createSchema = z.object({
  ...baseFields,
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

const editSchema = z.object({
  ...baseFields,
  password: z
    .string()
    .refine((v) => v === "" || v.length >= 8, "パスワードは8文字以上で入力してください"),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;
type FormValues = CreateValues | EditValues;

type InitialValues = {
  name: string;
  email: string;
  department: string | null;
  is_manager: boolean;
};

type Props = {
  salespersonId?: number;
  initialValues?: InitialValues;
};

export function SalespersonForm({ salespersonId, initialValues }: Props) {
  const router = useRouter();
  const isEditMode = salespersonId !== undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(isEditMode ? editSchema : createSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      email: initialValues?.email ?? "",
      password: "",
      department: initialValues?.department ?? "",
      is_manager: initialValues?.is_manager ?? false,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const body: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        department: values.department || undefined,
        is_manager: values.is_manager,
      };

      if (!isEditMode || values.password) {
        body.password = values.password;
      }

      const res = await fetch(
        isEditMode ? `/api/salespersons/${salespersonId}` : "/api/salespersons",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.error?.code === "DUPLICATE_EMAIL") {
          setApiError("このメールアドレスはすでに登録されています");
        } else {
          setApiError(data?.error?.message ?? "保存に失敗しました。再度お試しください。");
        }
        return;
      }

      router.push("/master/salespersons");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                氏名 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="山田 太郎" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                メールアドレス <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input type="email" placeholder="yamada@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                パスワード{" "}
                {isEditMode ? (
                  <span className="text-muted-foreground text-xs font-normal">
                    （変更する場合のみ入力）
                  </span>
                ) : (
                  <span className="text-destructive">*</span>
                )}
              </FormLabel>
              <FormControl>
                <Input type="password" placeholder="8文字以上" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>所属部署</FormLabel>
              <FormControl>
                <Input placeholder="東京営業部" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_manager"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Checkbox id="is_manager" checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel htmlFor="is_manager" className="cursor-pointer">
                上長フラグ（部下の日報へのコメント・確認が可能）
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        {apiError && <p className="text-destructive text-sm">{apiError}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isEditMode ? "更新" : "登録"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => router.push("/master/salespersons")}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Form>
  );
}
