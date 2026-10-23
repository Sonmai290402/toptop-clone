# Client API và demo Comments

Frontend dùng `@tanstack/react-query` (đã có trong dependencies) và native `fetch`.
Chỉ tích hợp GET `/api/v1/videos/:videoId/comments`. Feed, profile, auth, like,
save và gửi/xóa bình luận chưa được tích hợp. CommentForm vẫn là UI hiện có.

## Các file

| File | Vai trò |
| --- | --- |
| `src/providers/QueryProvider.tsx` | Cung cấp QueryClient cho các component, được bọc trong root layout |
| `src/lib/query/query-client.ts` | Client ổn định ở browser, riêng biệt khi render trên server; staleTime 60 giây, gcTime 5 phút, không refetch khi focus; retry một lần với lỗi mạng/5xx |
| `src/lib/query/query-keys.ts` | Key cache danh sách comments theo video ID |
| `src/lib/api/client.ts` | Fetch cùng origin, cookie, JSON, AbortSignal và ApiClientError; không cache HTTP |
| `src/lib/api/comments.api.ts` | Gọi endpoint comments với limit 10 và cursor |
| `src/types/api.types.ts` | Response chung và type-only export CommentDto từ contract backend |
| `src/hooks/queries/useComments.ts` | useInfiniteQuery, cursor trang tiếp theo và trạng thái request |
| `src/lib/demo.ts` | ID video dùng chung cho tất cả player demo |
| `src/components/common/Comments.tsx` | Render dữ liệu, loading, empty, lỗi/thử lại và nút xem thêm |

## Xem demo

1. Cấu hình Supabase và migration theo `docs/API.md`.
2. Database cần có video `10000000-0000-4000-8000-000000000003` và bình luận của nó.
   Script seed backend hiện có tạo video này và bình luận “Video đẹp quá!”.
   Nếu đã seed thì không cần chạy lại. Nếu dùng video khác trong database,
   đổi `DEMO_COMMENTS_VIDEO_ID` trong `src/lib/demo.ts` sang UUID đó.
3. Chạy `pnpm dev`, mở trang chủ. Tất cả player truyền cùng ID cho Comments.
4. Mở DevTools → Network, lọc `comments`: endpoint có dạng
   `/api/v1/videos/10000000-0000-4000-8000-000000000003/comments?limit=10`.
   Các panel dùng chung cache và request đang chạy; Strict Mode có thể hủy và
   khởi động lại request lúc mount trong development. Đây không phải bốn bộ dữ liệu riêng.
5. Nếu có hơn 10 bình luận, nút “Xem thêm bình luận” tải trang tiếp theo.
   Danh sách của tất cả panel cùng cập nhật qua cache.

Không tạo comment giả để che lỗi API: thiếu cấu hình, video chưa tồn tại hoặc lỗi
database sẽ hiện thông báo và nút thử lại. Danh sách rỗng có thông báo riêng.
Không yêu cầu đăng nhập để đọc comments của video công khai.

## Khi tích hợp tiếp

- Truyền ID thật từ video feed thay cho hằng số demo.
- Khi ghép auth, phân biệt cache theo tài khoản hoặc xóa cache khi đổi phiên;
  response comments có trường `isOwner` phụ thuộc phiên. Demo chưa dùng trường này.
- Thêm mutation gửi/xóa comment và cập nhật cache sau, không gọi API trong render.
- `apiFetch<T>` mô tả kiểu TypeScript, không phải runtime validation response.

Tham khảo: [TanStack Query với Next.js](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr),
[Infinite queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries).
