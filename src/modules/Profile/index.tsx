"use client";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { useTranslations as useUiTranslations } from "next-intl";

import ProfileHeader from "./Components/ProfileHeader";
import ProfileContent from "./Components/ProfileContent";
import { useProfile } from "@/hooks/queries/useProfile";

const Profile = ({ username }: { username: string }) => {
  const ui = useUiTranslations("ui");
  const { data: userData, error, isPending } = useProfile(username);

  if (isPending) {
    return (
      <LoadingSkeleton variant="profile" />
    );
  }

  if (error) {
    return (
      <p role="alert" className="p-6">
        {error.message}
      </p>
    );
  }

  if (!userData) {
    return <p className="p-6">{ui('profile_not_found')}</p>;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1296px] flex-1 space-y-6">
      <ProfileHeader userData={userData} />
      <ProfileContent key={userData.id} userId={userData.id} />
    </div>
  );
};

export default Profile;
