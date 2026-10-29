import Profile from "@/modules/Profile";
import { Suspense } from "react";
import ProtectedPage from "@/components/auth/ProtectedPage";
import { notFound } from "next/navigation";
import { getProfileUsername } from "@/lib/auth/protected-paths";

async function ProfileRoute({ params }: PageProps<"/[userId]">) {
  const { userId } = await params;
  const username = getProfileUsername(userId);
  if (username === null) notFound();
  return <ProtectedPage><Profile username={username} /></ProtectedPage>;
}

const ProfilePage = (props: PageProps<"/[userId]">) => {
  return (
    <Suspense fallback={null}>
      <ProfileRoute {...props} />
    </Suspense>
  );
};

export default ProfilePage;
