import RequireAuth from "@/components/auth/RequireAuth";

export default function FollowingPage() {
  return (
    <main className="min-w-0 flex-1">
      <RequireAuth message="Đăng nhập để xem các nhà sáng tạo bạn theo dõi.">
        <div className="space-y-3 p-6">
          <h1 className="text-2xl font-bold">Đang theo dõi</h1>
          <p className="text-muted-foreground">Feed Following sẽ được kết nối ở bước tích hợp video tiếp theo.</p>
        </div>
      </RequireAuth>
    </main>
  );
}
