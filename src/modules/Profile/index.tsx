"use client";

import { useParams } from "next/navigation";
import ProfileHeader from "./Components/ProfileHeader";
import ProfileContent from "./Components/ProfileContent";
import { useProfile } from "@/hooks/queries/useProfile";

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  let id = userId;

  try {
    id = decodeURIComponent(userId);
  } catch {
    // Preserve the route parameter if decoding fails.
  }

  const { data: userData, error, isPending } = useProfile(id);

  if (isPending) {
    return (
      <p role="status" className="p-6">
        Loading profile...
      </p>
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
    return <p className="p-6">Profile not found.</p>;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1296px] flex-1 space-y-6">
      <ProfileHeader userData={userData} />
      <ProfileContent key={userData.id} userId={userData.id} />
    </div>
  );
};

export default Profile;
