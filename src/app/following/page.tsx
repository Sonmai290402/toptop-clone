import ProtectedPage from "@/components/auth/ProtectedPage";
import VideoFeed from "@/components/video/VideoFeed";

export default function FollowingPage() {
  return (
    <main className="min-w-0 flex-1">
      <ProtectedPage>
        <VideoFeed feed="following" />
      </ProtectedPage>
    </main>
  );
}
