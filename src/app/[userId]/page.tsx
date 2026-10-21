"use client";

import Profile from "@/modules/Profile";
import { Suspense } from "react";

const ProfilePage = () => {
  return (
    <Suspense fallback={null}>
      <Profile />
    </Suspense>
  );
};

export default ProfilePage;
