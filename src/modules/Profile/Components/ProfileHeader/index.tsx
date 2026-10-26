"use client";

import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ProfileDto } from "@/types/api.types";
import { Forward, Settings } from "lucide-react";

type ProfileHeaderProps = {
  userData: ProfileDto;
};

const ProfileHeader = ({ userData }: ProfileHeaderProps) => {
  const { requireAuth, user, isLoading } = useAuth();
  const isOwner = user?.id === userData.id;
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
            disabled={isLoading}
            onClick={() =>
              requireAuth(
                isOwner
                  ? "Sign in to edit your profile."
                  : "Sign in to follow this user.",
              )
            }
            className="h-10"
          >
            {isOwner ? "Edit Profile" : "Follow"}
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
        <p>{userData.bio}</p>
      </div>
    </section>
  );
};

export default ProfileHeader;
