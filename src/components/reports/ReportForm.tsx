"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VisitRecordList } from "./VisitRecordList";

type Customer = { id: number; name: string };

type InitialValues = {
  report_date: string;
  problem: string;
  plan: string;
  visit_records: Array<{ customer_id: number; visit_content: string }>;
};

type Props = {
  authorName: string;
  customers: Customer[];
  reportId?: number;
  initialValues?: InitialValues;
};

const visitRecordItemSchema = z.object({
  customer_id: z
    .number({ error: "顧客を選択してください" })
    .int()
    .positive("顧客を選択してください"),
  visit_content: z
    .string()
    .min(1, "訪問内容を入力してください")
    .max(1000, "1000文字以内で入力してください"),
});

const reportFormSchema = z.object({
  report_date: z
    .string()
    .min(1, "日付を入力してください")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください"),
  problem: z.string().max(2000, "2000文字以内で入力してください"),
  plan: z.string().max(2000, "2000文字以内で入力してください"),
  visit_records: z.array(visitRecordItemSchema).min(1),
});

type FormValues = z.infer<typeof reportFormSchema>;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReportForm({ authorName, customers, reportId, initialValues }: Props) {
  const router = useRouter();
  const isEditMode = reportId !== undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: initialValues ?? {
      report_date: todayString(),
      problem: "",
      plan: "",
      visit_records: [{ customer_id: 0, visit_content: "" }],
    },
  });

  async function submit(data: FormValues, status: "draft" | "submitted") {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const url = isEditMode ? `/api/reports/${reportId}` : "/api/reports";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_date: data.report_date,
          problem: data.problem || undefined,
          plan: data.plan || undefined,
          status,
          visit_records: data.visit_records.map((vr, i) => ({
            customer_id: vr.customer_id,
            visit_content: vr.visit_content,
            sort_order: i + 1,
          })),
        }),
      });

      if (!isEditMode && res.status === 409) {
        form.setError("report_date", {
          message: "この日付の日報はすでに作成されています",
        });
        return;
      }

      if (!res.ok) {
        setApiError("送信に失敗しました。再度お試しください。");
        return;
      }

      const saved = await res.json();
      const savedId = reportId ?? saved.id;
      if (status === "draft") {
        router.push("/");
      } else {
        router.push(`/reports/${savedId}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDraft = form.handleSubmit((data) => submit(data, "draft"));
  const handleSubmit = form.handleSubmit((data) => submit(data, "submitted"));

  const problemValue = form.watch("problem") ?? "";
  const planValue = form.watch("plan") ?? "";

  return (
    <Form {...form}>
      <div className="flex flex-col gap-6">
        {/* ヘッダー部 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="report_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  日付 <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-2">
            <Label>作成者</Label>
            <Input value={authorName} readOnly className="bg-muted cursor-default" />
          </div>
        </div>

        {/* 訪問記録部 */}
        <VisitRecordList customers={customers} />

        {/* Problem */}
        <FormField
          control={form.control}
          name="problem"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Problem（今の課題・相談）</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder="課題や上長への相談を記入してください" {...field} />
              </FormControl>
              <div className="flex justify-end">
                <span className="text-muted-foreground text-xs">{problemValue.length} / 2000</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Plan */}
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan（明日やること）</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder="翌日の行動計画を記入してください" {...field} />
              </FormControl>
              <div className="flex justify-end">
                <span className="text-muted-foreground text-xs">{planValue.length} / 2000</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {apiError && <p className="text-destructive text-sm">{apiError}</p>}

        {/* アクションボタン */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleDraft} disabled={isSubmitting}>
            一時保存
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            提出
          </Button>
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" disabled={isSubmitting}>
                キャンセル
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? "編集を中止しますか？" : "作成を中止しますか？"}
                </DialogTitle>
                <DialogDescription>未保存のデータはすべて失われます。</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">続ける</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setCancelOpen(false);
                    router.push("/");
                  }}
                >
                  中止する
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Form>
  );
}
