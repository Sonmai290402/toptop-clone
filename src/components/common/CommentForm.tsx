"use client";

import { MoveUp } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const CommentForm = () => {
  const { user, openAuth, isLoading } = useAuth();
  if (!user) return (
    <Button variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2" disabled={isLoading} onClick={() => openAuth("sign-in", "Đăng nhập để viết bình luận.")}>
      {isLoading ? "Đang kiểm tra đăng nhập..." : "Đăng nhập để bình luận"}
    </Button>
  );
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar>
        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
        <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <Textarea
        aria-label="Thêm bình luận"
        placeholder="Thêm bình luận..."
        rows={1}
        className="h-10 min-h-10 min-w-0 flex-1 resize-none field-sizing-fixed rounded-2xl px-3 py-2 text-sm leading-5"
      />
      <Button
        type="button"
        size="icon"
        aria-label="Gửi bình luận"
        className="size-9 shrink-0 text-white"
      >
        <MoveUp className="size-4" />
      </Button>
    </div>
  );
};

export default CommentForm;
