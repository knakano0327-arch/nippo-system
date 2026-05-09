"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INDUSTRIES = [
  "商社",
  "製造業",
  "電機・電子",
  "IT・情報通信",
  "金融・保険",
  "不動産",
  "建設・土木",
  "小売・流通",
  "医療・福祉",
  "教育・研究",
  "その他",
];

const customerFormSchema = z.object({
  name: z
    .string()
    .min(1, "顧客名を入力してください")
    .max(100, "顧客名は100文字以内で入力してください"),
  industry: z.string().optional(),
  phone: z
    .string()
    .max(20, "電話番号は20文字以内で入力してください")
    .regex(/^[\d\-]*$/, "電話番号の形式が正しくありません")
    .optional()
    .or(z.literal("")),
  address: z.string().max(255, "住所は255文字以内で入力してください").optional(),
});

type FormValues = z.infer<typeof customerFormSchema>;

type InitialValues = {
  name: string;
  industry: string | null;
  phone: string | null;
  address: string | null;
};

type Props = {
  customerId?: number;
  initialValues?: InitialValues;
};

export function CustomerForm({ customerId, initialValues }: Props) {
  const router = useRouter();
  const isEditMode = customerId !== undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      industry: initialValues?.industry ?? "",
      phone: initialValues?.phone ?? "",
      address: initialValues?.address ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const body = {
        name: values.name,
        industry: values.industry || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
      };

      const res = await fetch(isEditMode ? `/api/customers/${customerId}` : "/api/customers", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setApiError(data?.error?.message ?? "保存に失敗しました。再度お試しください。");
        return;
      }

      router.push("/master/customers");
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
                顧客名 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="株式会社〇〇" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>業種</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="業種を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>電話番号</FormLabel>
              <FormControl>
                <Input placeholder="03-1234-5678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>住所</FormLabel>
              <FormControl>
                <Input placeholder="東京都千代田区〇〇" {...field} />
              </FormControl>
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
            onClick={() => router.push("/master/customers")}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Form>
  );
}
