"use client";
import { useTranslations as useUiTranslations } from "next-intl";

import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ProfileDto } from "@/types/api.types";
import { Camera, Forward, Settings } from "lucide-react";
import { useIsMutating } from "@tanstack/react-query";
import { useFollowUser } from "@/hooks/queries/usePostInteractions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { editProfileSchema } from "@/lib/validation/profile";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AvatarDialog from "./AvatarDialog";
import { cn } from "cn";

type ProfileHeaderProps = {
  userData: ProfileDto;
};

const ProfileHeader = ({ userData }: ProfileHeaderProps) => {
  const ui = useUiTranslations("ui");
  const { requireAuth, user, isLoading } = useAuth();
  const isOwner = user?.id === userData.id;
  const follow = useFollowUser(userData.id);
  const followingBusy =
    useIsMutating({ mutationKey: ["follow-user", userData.id] }) > 0;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const updateProfile = useUpdateProfile();
  const form = useForm<
    z.input<typeof editProfileSchema>,
    unknown,
    z.output<typeof editProfileSchema>
  >({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { displayName: "", bio: "", avatarUrl: "" },
  });
  const bio = useWatch({ control: form.control, name: "bio" }) ?? "";
  const { errors } = form.formState;

  return (
    <>
      <section className="flex gap-6 items-center ">
        <button
          type="button"
          aria-label={isOwner ? ui('update_avatar') : ui('view_avatar')}
          className={cn(
            "relative rounded-full overflow-hidden",
            isOwner &&
              "group hover:opacity-80 transition-opacity cursor-pointer",
          )}
          disabled={isLoading}
          onClick={() => {
            if (isOwner || userData.avatarUrl) setIsAvatarModalOpen(true);
          }}
        >
          <Avatar className="w-40 h-40">
            <AvatarImage
              src={userData.avatarUrl ?? undefined}
              alt={userData.displayName}
            />
            <AvatarFallback className="text-4xl uppercase">
              {userData.username.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <Camera className="group-hover:opacity-100 opacity-0 absolute bottom-1/2 right-1/2 rounded-full text-primary-foreground translate-y-1/2 translate-x-1/2" />
        </button>
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
              <span>{ui('following')}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-primary">
                {userData.followerCount}
              </span>
              <span>{ui('follower')}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              disabled={isLoading || followingBusy}
              aria-pressed={isOwner ? undefined : userData.isFollowing}
              onClick={() => {
                if (isOwner) {
                  form.reset({
                    displayName: userData.displayName,
                    bio: userData.bio,
                    avatarUrl: userData.avatarUrl ?? "",
                  });
                  updateProfile.reset();
                  setIsEditModalOpen(true);
                } else if (requireAuth()) {
                  follow.mutate(!userData.isFollowing);
                }
              }}
              className="h-10"
            >
              {isOwner
                ? ui('edit_profile')
                : followingBusy
                  ? ui('updating')
                  : userData.isFollowing
                    ? ui('unfollow')
                    : ui('follow')}
            </Button>
            {isOwner && (
              <Button
                variant="secondary"
                aria-label={ui('profile_settings')}
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
          {follow.error && (
            <p role="alert" className="text-sm text-red-400">
              {follow.error.message}
            </p>
          )}
          <p>{userData.bio}</p>
        </div>
      </section>

      <Dialog
        open={isOwner && isEditModalOpen}
        onOpenChange={(open) => {
          if (!updateProfile.isPending) setIsEditModalOpen(open);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
          showCloseButton={!updateProfile.isPending}
        >
          <DialogTitle>{ui('edit_profile')}</DialogTitle>
          <form
            className="space-y-5"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              if (!isOwner || updateProfile.isPending) return;
              updateProfile.mutate(
                { displayName: values.displayName, bio: values.bio },
                {
                  onSuccess: () => setIsEditModalOpen(false),
                },
              );
            })}
          >
            <fieldset disabled={updateProfile.isPending}>
              <FieldGroup>
                <Field>
                  <Label htmlFor="profile-name">{ui('name')}</Label>
                  <Input
                    id="profile-name"
                    {...form.register("displayName")}
                    aria-invalid={!!errors.displayName}
                    aria-describedby={
                      errors.displayName ? "profile-name-error" : undefined
                    }
                    required
                    maxLength={80}
                  />
                  {errors.displayName && (
                    <p
                      id="profile-name-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {errors.displayName.message}
                    </p>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="profile-bio">{ui('bio')}</Label>
                  <textarea
                    id="profile-bio"
                    {...form.register("bio")}
                    aria-invalid={!!errors.bio}
                    aria-describedby={
                      errors.bio ? "profile-bio-error" : undefined
                    }
                    rows={3}
                    maxLength={160}
                    className="w-full resize-none rounded-md border bg-transparent px-3 py-2"
                  />
                  <span className="text-xs text-muted-foreground">
                    {bio.length}/160
                  </span>
                  {errors.bio && (
                    <p
                      id="profile-bio-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {errors.bio.message}
                    </p>
                  )}
                </Field>
              </FieldGroup>
            </fieldset>
            {updateProfile.error && (
              <p role="alert" className="text-sm text-destructive">
                {updateProfile.error.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={updateProfile.isPending}
                onClick={() => setIsEditModalOpen(false)}
              >
                {ui('cancel')}
              </Button>
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? ui('saving') : ui('save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isOwner && isAvatarModalOpen && (
        <AvatarDialog
          key={userData.id}
          avatarUrl={userData.avatarUrl}
          canEdit={isOwner}
          onClose={() => setIsAvatarModalOpen(false)}
        />
      )}
    </>
  );
};

export default ProfileHeader;
