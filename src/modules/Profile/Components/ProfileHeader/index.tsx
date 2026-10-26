"use client";

import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ProfileDto } from "@/types/api.types";
import { Forward, Settings } from "lucide-react";
import { useIsMutating } from "@tanstack/react-query";
import { useFollowUser } from "@/hooks/queries/usePostInteractions";

type ProfileHeaderProps = {
  userData: ProfileDto;
};

const ProfileHeader = ({ userData }: ProfileHeaderProps) => {
  const { requireAuth, user, isLoading } = useAuth();
  const isOwner = user?.id === userData.id;
  const follow = useFollowUser(userData.id);
  const followingBusy = useIsMutating({ mutationKey: ["follow-user", userData.id] }) > 0;
  return (
    <section className="flex gap-6 items-center">
      <Avatar className="w-40 h-40">
        <AvatarImage
          src={userData.avatarUrl ?? undefined}
          alt={userData.displayName}
        />
        <AvatarFallback className="text-4xl uppercase">
          {userData.username.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex gap-6 items-center">
          <h1 className="text-2xl font-bold">{userData.displayName}</h1>
          <span className="text-muted-foreground">@{userData.username}</span>
        </div>
        <div className="flex gap-6">
          <div className="flex gap-2">
            <span className="font-bold text-primary">
              {userData.followingCount}
            </span>
            <span>Following</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-primary">
              {userData.followerCount}
            </span>
            <span>Follower</span>
          </div>
        </div>
        <div className="flex gap-4">
          <Button
            disabled={isLoading || followingBusy}
            aria-pressed={isOwner ? undefined : userData.isFollowing}
            onClick={() => {
              if (!requireAuth(isOwner ? "Sign in to edit your profile." : "Sign in to follow this user.")) return;
              if (!isOwner && !followingBusy) follow.mutate(!userData.isFollowing);
            }}
            className="h-10"
          >
            {isOwner ? "Edit Profile" : followingBusy ? "Updating..." : userData.isFollowing ? "Unfollow" : "Follow"}
          </Button>
          {isOwner && (
            <Button
              variant="secondary"
              aria-label="Profile settings"
              onClick={() => requireAuth()}
              className="h-10 px-3"
            >
              <Settings className="w-5! h-5!" />
            </Button>
          )}
          <Button variant="secondary" className="h-10 px-3">
            <Forward className="w-5! h-5!" />
          </Button>
        </div>
        {follow.error && <p role="alert" className="text-sm text-red-400">{follow.error.message}</p>}
        <p>{userData.bio}</p>
      </div>
    </section>
  );
};

export default ProfileHeader;
