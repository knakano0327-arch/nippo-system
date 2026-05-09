"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Salesperson = { id: number; name: string };

type Props = {
  from: string;
  to: string;
  salespersonId: string;
  salespersons: Salesperson[];
  isManager: boolean;
};

export function SearchFilter({ from, to, salespersonId, salespersons, isManager }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const salespersonRef = useRef<string>(salespersonId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (fromRef.current?.value) params.set("from", fromRef.current.value);
    if (toRef.current?.value) params.set("to", toRef.current.value);
    if (isManager && salespersonRef.current && salespersonRef.current !== "all") {
      params.set("salesperson_id", salespersonRef.current);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="from">期間（From）</Label>
        <Input id="from" type="date" defaultValue={from} ref={fromRef} className="w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="to">期間（To）</Label>
        <Input id="to" type="date" defaultValue={to} ref={toRef} className="w-40" />
      </div>
      {isManager && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="salesperson">担当者</Label>
          <Select
            defaultValue={salespersonId || "all"}
            onValueChange={(v) => {
              salespersonRef.current = v;
            }}
          >
            <SelectTrigger id="salesperson" className="w-40">
              <SelectValue placeholder="全員" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全員</SelectItem>
              {salespersons.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit">検索</Button>
    </form>
  );
}
