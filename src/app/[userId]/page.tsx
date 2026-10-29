import Profile from "@/modules/Profile";
import { Suspense } from "react";
import ProtectedPage from "@/components/auth/ProtectedPage";
import { notFound } from "next/navigation";
import { isProfileSegment } from "@/lib/auth/protected-paths";

async function ProfileRoute({ params }: PageProps<"/[userId]">) {
  const { userId } = await params;
  if (!isProfileSegment(userId)) notFound();
  return <ProtectedPage><Profile /></ProtectedPage>;
}

const ProfilePage = (props: PageProps<"/[userId]">) => {
  return (
    <Suspense fallback={null}>
      <ProfileRoute {...props} />
    </Suspense>
  );
};

export default ProfilePage;
