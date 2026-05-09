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

type Props = {
  name: string;
  industry: string;
  industries: string[];
};

export function CustomerSearchFilter({ name, industry, industries }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const nameRef = useRef<HTMLInputElement>(null);
  const industryRef = useRef<string>(industry);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (nameRef.current?.value) params.set("name", nameRef.current.value);
    if (industryRef.current && industryRef.current !== "all") {
      params.set("industry", industryRef.current);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">顧客名</Label>
        <Input
          id="name"
          type="text"
          defaultValue={name}
          ref={nameRef}
          className="w-48"
          placeholder="部分一致"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="industry">業種</Label>
        <Select
          defaultValue={industry || "all"}
          onValueChange={(v) => {
            industryRef.current = v;
          }}
        >
          <SelectTrigger id="industry" className="w-40">
            <SelectValue placeholder="全業種" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全業種</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit">検索</Button>
    </form>
  );
}
