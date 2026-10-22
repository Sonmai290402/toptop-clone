import { MoveUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const CommentForm = () => {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar>
        <AvatarImage src="https://plus.unsplash.com/premium_photo-1764194629423-2a8f29c825e4?q=80&w=685&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D" />
        <AvatarFallback>User</AvatarFallback>
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
