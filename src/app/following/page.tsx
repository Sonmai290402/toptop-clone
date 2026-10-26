import ProtectedPage from "@/components/auth/ProtectedPage";

export default function FollowingPage() {
  return (
    <main className="min-w-0 flex-1">
      <ProtectedPage>
        <div className="space-y-3 p-6">
          <h1 className="text-2xl font-bold">Following</h1>
          <p className="text-muted-foreground">Your following feed will be available soon.</p>
        </div>
      </ProtectedPage>
    </main>
  );
}
