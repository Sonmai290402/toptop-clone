"use client";

import { useParams } from "next/navigation";
import ProfileHeader from "./Components/ProfileHeader";
import type { UserData } from "@/types/user.types";
import ProfileContent from "./Components/ProfileContent";

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  let id = userId;

  try {
    id = decodeURIComponent(userId);
  } catch {
    // Giữ nguyên ID nếu giá trị không phải chuỗi mã hóa URL hợp lệ.
  }

  const userData: UserData = {
    id,
    username: "Leo",
    avatarImg:
      "https://images.unsplash.com/photo-1624307297763-2f6e91b38071?q=80&w=771&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    following: 55,
    follower: 100,
    bio: "lorem picsum",
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1296px] flex-1 space-y-6">
      <ProfileHeader userData={userData} />
      <ProfileContent />
    </div>
  );
};

export default Profile;
