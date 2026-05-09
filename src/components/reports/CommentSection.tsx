"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type Comment = {
  id: number;
  commenter_name: string;
  target_type: "problem" | "plan";
  content: string;
  created_at: string;
};

type Props = {
  reportId: number;
  comments: Comment[];
  isManager: boolean;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommentSection({ reportId, comments, isManager }: Props) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<"problem" | "plan">("problem");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError("コメントを入力してください");
      return;
    }
    if (content.length > 1000) {
      setError("1000文字以内で入力してください");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: targetType, content }),
      });

      if (!res.ok) {
        setError("コメントの送信に失敗しました。再度お試しください。");
        return;
      }

      setContent("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-medium">コメント</h2>

      {isManager && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="target-type">コメント対象</Label>
            <Select
              value={targetType}
              onValueChange={(v) => setTargetType(v as "problem" | "plan")}
            >
              <SelectTrigger id="target-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="problem">Problem へのコメント</SelectItem>
                <SelectItem value="plan">Plan へのコメント</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="comment-content">
              コメント内容 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="comment-content"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="コメントを入力してください"
            />
            <div className="flex justify-end">
              <span className="text-muted-foreground text-xs">{content.length} / 1000</span>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              コメントを送信
            </Button>
          </div>
        </form>
      )}

      {comments.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">コメントはありません</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment, index) => (
            <div key={comment.id}>
              {index > 0 && <Separator className="mb-3" />}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{comment.commenter_name}</span>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {comment.target_type === "problem" ? "Problem" : "Plan"}
                    </Badge>
                    <span>{formatDateTime(comment.created_at)}</span>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
