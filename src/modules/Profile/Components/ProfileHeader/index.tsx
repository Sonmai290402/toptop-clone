"use client";

import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UserData } from "@/types/user.types";
import { Forward, Settings } from "lucide-react";

type ProfileHeaderProps = {
  userData: UserData;
};

const ProfileHeader = ({ userData }: ProfileHeaderProps) => {
  const { requireAuth, user, isLoading } = useAuth();
  const isOwner = !!user && userData.id.replace(/^@/, "") === user.username;
  return (
    <section className="flex gap-6 items-center">
      <Avatar className="w-40 h-40">
        <AvatarImage src={userData.avatarImg} />
        <AvatarFallback>{userData.username.slice(0, 3)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex gap-6 items-center">
          <h1 className="text-2xl font-bold">{userData.username}</h1>
          <span className="text-muted-foreground">{userData.id}</span>
        </div>
        <div className="flex gap-6">
          <div className="flex gap-2">
            <span className="font-bold text-primary">{userData.following}</span>
            <span>Following</span>
          </div>
          <div className="flex gap-2">
            <span className="fold-bold text-primary">{userData.follower}</span>
            <span>Follower</span>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" disabled={isLoading} onClick={() => requireAuth(isOwner ? "Đăng nhập để sửa hồ sơ." : "Đăng nhập để theo dõi.")} className="h-10">
            {isOwner ? "Edit Profile" : "Follow"}
          </Button>
          {isOwner && <Button variant="secondary" aria-label="Cài đặt hồ sơ" onClick={() => requireAuth()} className="h-10 px-3">
            <Settings className="w-5! h-5!" />
          </Button>}
          <Button variant="secondary" className="h-10 px-3">
            <Forward className="w-5! h-5!" />
          </Button>
        </div>
        <p>{userData.bio}</p>
      </div>
    </section>
  );
};

export default ProfileHeader;
