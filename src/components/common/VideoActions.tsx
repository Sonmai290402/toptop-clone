import { Bookmark, Heart, MessageCircle, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

const VideoActions = () => {
  const VIDEO_ACTIONS = [
    {
      icon: <Heart fill="white" className="w-5! h-5!" />,
      label: "Like",
    },
    {
      icon: <MessageCircle fill="white" className="w-5! h-5!" />,
      label: "Comment",
    },
    {
      icon: <Bookmark fill="white" className="w-5! h-5!" />,
      label: "Save",
    },
  ];
  return (
    <div className="flex flex-col gap-8 justify-center items-center">
      <div className="relative border border-primary rounded-full background-accent">
        <Avatar size="lg">
          <AvatarImage
            src="https://images.unsplash.com/photo-1791570701394-68b48f39b3a4?q=80&w=745&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
            alt="Logo"
          />
          <AvatarFallback>
            <span className="text-xs">User</span>
          </AvatarFallback>
        </Avatar>
        <Button className="w-5 h-5 rounded-full p-0 absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2">
          <Plus className="h-3! w-3! text-white" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {VIDEO_ACTIONS.map((action) => (
          <Button
            variant="secondary"
            className="w-10 h-10 rounded-full flex items-center justify-center"
            key={action.label}
          >
            {action.icon}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default VideoActions;
