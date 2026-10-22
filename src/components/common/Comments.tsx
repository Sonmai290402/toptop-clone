import { Filter, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CommentForm from "./CommentForm";
import { Card } from "../ui/card";

const Comments = () => {
  return (
    <Card
      aria-label="Comments"
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden py-0"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">Comments</h2>
        <Filter className="size-4 shrink-0" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
        <div className="flex items-start gap-2">
          <Avatar>
            <AvatarImage src="https://plus.unsplash.com/premium_photo-1764194629423-2a8f29c825e4?q=80&w=685&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D" />
            <AvatarFallback>User</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 wrap-anywhere">
            <span className="text-sm font-semibold">Tui ky cuc 543</span>
            <p className="mt-1 text-sm leading-relaxed">
              lorem picsum lorem picsum lorem picsum lorem picsum
            </p>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-xs text-muted-foreground">
                  2 hours ago
                </span>
                <span className="text-xs text-accent-foreground">Reply</span>
              </div>
              <Heart className="size-3 shrink-0" />
            </div>
          </div>
        </div>
      </div>
      <footer className="shrink-0 border-t border-border p-3 sm:p-4">
        <CommentForm />
      </footer>
    </Card>
  );
};

export default Comments;
