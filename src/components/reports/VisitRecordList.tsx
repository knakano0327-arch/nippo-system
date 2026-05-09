"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Customer = { id: number; name: string };

type Props = {
  customers: Customer[];
};

export function VisitRecordList({ customers }: Props) {
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "visit_records",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">訪問記録</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ customer_id: 0, visit_content: "" })}
        >
          <Plus className="mr-1 h-4 w-4" />
          訪問先を追加
        </Button>
      </div>

      {fields.map((field, index) => (
        <VisitRecordRow
          key={field.id}
          index={index}
          customers={customers}
          isFirst={index === 0}
          onRemove={() => remove(index)}
        />
      ))}
    </div>
  );
}

type RowProps = {
  index: number;
  customers: Customer[];
  isFirst: boolean;
  onRemove: () => void;
};

function VisitRecordRow({ index, customers, isFirst, onRemove }: RowProps) {
  const form = useFormContext();
  const visitContent: string = form.watch(`visit_records.${index}.visit_content`) ?? "";

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">訪問先 {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isFirst}
          className={isFirst ? "invisible" : ""}
          aria-label={`訪問先 ${index + 1} を削除`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name={`visit_records.${index}.customer_id`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                顧客 <span className="text-destructive">*</span>
              </FormLabel>
              <Select
                onValueChange={(v) => field.onChange(Number(v))}
                value={field.value > 0 ? String(field.value) : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="顧客を選択してください" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
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
          name={`visit_records.${index}.visit_content`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                訪問内容 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="訪問内容を入力してください" {...field} />
              </FormControl>
              <div className="flex justify-end">
                <span className="text-muted-foreground text-xs">{visitContent.length} / 1000</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
