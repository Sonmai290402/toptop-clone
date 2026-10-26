"use client";

import Profile from "@/modules/Profile";
import { Suspense } from "react";
import ProtectedPage from "@/components/auth/ProtectedPage";

const ProfilePage = () => {
  return (
    <Suspense fallback={null}>
      <ProtectedPage><Profile /></ProtectedPage>
    </Suspense>
  );
};

export default ProfilePage;
