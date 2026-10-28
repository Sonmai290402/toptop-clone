# Auth frontend và role

## Google usernames

Apply `20261026000300_google_usernames.sql` with `npx supabase db push` (linked project), or run that migration once in the Supabase SQL Editor before using the updated OAuth callback.

After Google authentication, the server calls `sync_google_username()`. It derives the username from the trusted account email's local part: `tuananh@gmail.com` becomes `tuananh`. Letters are lowercased and characters outside `[a-z0-9_]` become underscores, so `first.last@gmail.com` becomes `first_last`. Names are limited to 30 characters and padded with underscores if shorter than three. Collisions add `_1`, `_2`, etc., under the database unique constraint; after 100 occupied suffixes the existing unique generated name is retained.

Existing Google accounts with the exact generated `user_<UUID prefix>` username are updated on their next Google login. Custom usernames remain unchanged, as do profile IDs and related data. Email/password accounts are not renamed. The RPC accepts no email or user ID from callers, and does not grant clients general username-edit permissions. Google accounts with non-Gmail email addresses use the same local-part rule.

## Phạm vi

- Đăng nhập/đăng ký email và mật khẩu bằng dialog, không rời video đang xem.
- Hiện/ẩn mật khẩu, kiểm tra nhập lại mật khẩu, pending/error, thông báo xác nhận email,
  gửi lại xác nhận, quên mật khẩu, cập nhật mật khẩu và đăng xuất.
- Sidebar khách hiện Đăng nhập/Đăng ký; có phiên hiện tên, username, role, hồ sơ và đăng xuất.
- Xem video, đọc bình luận, xem profile/video công khai không yêu cầu tài khoản.
- Like/save/follow, viết/trả lời/thích bình luận, tab Saved/Liked và Following yêu cầu đăng nhập.
- `/following` có gate khi truy cập trực tiếp. Không dùng UI gate để thay cho kiểm tra API/RLS.
- Auth dùng thật API; feed/profile và các thao tác like/save/follow/gửi comment vẫn chưa nối API.
  Following hiện trang chờ tích hợp feed. Không tạo dữ liệu tương tác giả sau khi đăng nhập.
- Mọi player vẫn đọc cùng comments của video demo như trước.

## File chính

| File | Vai trò |
| --- | --- |
| `src/providers/AuthProvider.tsx` | Query session, đổi/xóa cache khi đăng nhập/đăng xuất, đồng bộ các tab, điều khiển dialog |
| `src/lib/api/auth.api.ts` | Gọi API auth qua cookie cùng origin; không lưu token vào localStorage |
| `src/types/auth.types.ts` | AuthUser, UserRole và request/response |
| `src/components/auth/AuthDialog.tsx` | Form đăng nhập/đăng ký/quên mật khẩu và trạng thái email |
| `src/components/auth/SidebarAccount.tsx` | Giao diện khách/tài khoản trên sidebar |
| `src/components/auth/RequireAuth.tsx` | Gate nội dung riêng tư; vẫn cho phép đóng dialog để tiếp tục xem công khai |
| `src/app/auth/confirmed/page.tsx` | Kết quả callback email |
| `src/app/auth/reset-password/page.tsx` | Form cập nhật mật khẩu sau recovery hoặc khi đã đăng nhập |
| `src/server/modules/auth/authorization.ts` | Role từ metadata đáng tin cậy và helper requireRole |

Session lấy bằng `getUser()` ở server. Route Handler tự cập nhật cookie khi Supabase
refresh token; provider kiểm tra định kỳ 4 phút và khi focus. Khi mất mạng hiển thị lỗi,
không xem lỗi mạng là đăng xuất thành công. Logout lỗi vẫn giữ phiên để người dùng thử lại.
Đổi tài khoản hủy request cũ và xóa cache dữ liệu; query key comments có viewer ID.

## Cấu hình cần làm

1. `APP_URL` phải khớp địa chỉ đang mở, ví dụ `http://localhost:3000`.
   Không dùng lẫn `localhost` và `127.0.0.1` khi đăng nhập. Restart sau khi sửa env.
2. Chạy migration mới `supabase/migrations/20261023000200_user_roles.sql` một lần.
   Với project đã quản lý bằng CLI: `pnpm exec supabase db push`.
   Với SQL Editor: chỉ chạy file mới nếu đã chạy migration backend trước đó.
3. Trong Supabase Authentication → URL Configuration, đặt Site URL bằng APP_URL;
   cho phép cả hai Redirect URL:
   - `http://localhost:3000/api/v1/auth/callback`
   - `http://localhost:3000/api/v1/auth/callback?flow=recovery`
4. Bật email/password. Có thể giữ template `{{ .ConfirmationURL }}` mặc định:
   PKCE yêu cầu mở link trên cùng trình duyệt đã gửi yêu cầu.

Để link hoạt động cả khi mở trên trình duyệt khác, thay link trong Email Templates:

**Confirm signup:**

```html
<a href="{{ .SiteURL }}/api/v1/auth/callback?token_hash={{ .TokenHash }}&type=email">Xác nhận email</a>
```

**Reset password:**

```html
<a href="{{ .SiteURL }}/api/v1/auth/callback?token_hash={{ .TokenHash }}&type=recovery">Đặt lại mật khẩu</a>
```

Callback chấp nhận code PKCE hoặc token_hash, ghi cookie và redirect về trang giao diện
cố định. Lỗi/hết hạn link có trang hướng dẫn, không trả raw JSON cho browser.
SMTP, hạn mức gửi và chính sách bảo mật mật khẩu vẫn do Supabase cấu hình.
Các thao tác gửi email chịu giới hạn của Supabase; chưa có limiter riêng ở Next.js.

## User roles

The shared TypeScript enum `UserRole` is defined in `src/types/role.types.ts`:
`UserRole.ADMIN = "admin"` and `UserRole.USER = "user"`.
The database stores the role in `public.profiles.role` using the PostgreSQL
`user_role` enum. New profiles default to `user`.

Apply `20261028000100_profile_roles.sql`, then open Supabase Table Editor,
select `public.profiles`, locate the account and change its `role` to `admin`
or `user`. Save and refresh the application to reload the session.
Existing admin assignments are migrated automatically. Auth metadata is no
longer used for authorization. Do not change Supabase's `authenticated` role.

Signup and profile-update APIs reject role input; column privileges prevent
users from changing role through the Data API. Admin pages, API handlers and
database policies read the current profile role. See [Admin setup](./ADMIN.md).

## Kiểm tra

- Khách: trang chủ vẫn phát video/hiện comments; sidebar không hiện tài khoản mock.
- Bấm Like/Save/Follow/Reply/viết comment/Following → dialog đăng nhập đúng ngữ cảnh.
- Đóng dialog tiếp tục lướt; nhập `/following` trực tiếp vẫn có gate.
- Đăng ký có Confirm email → thông báo hộp thư; chưa tạo trạng thái đăng nhập trước xác nhận.
- Đăng nhập tài khoản đã xác nhận → sidebar hiển thị tên/role; tải lại trang vẫn giữ phiên.
- Đăng xuất → sidebar khách; tab khác cũng kiểm tra lại phiên; comments vẫn công khai.
- Quên mật khẩu → mở link email → form mật khẩu mới → đăng nhập bằng mật khẩu mới.
- Đăng ký với JSON `role: "admin"` bị từ chối. `user_metadata.role=admin` không được cấp quyền.
- `pnpm test:backend` kiểm tra route bằng transport stub và migration bằng PostgreSQL nhúng.
  Kiểm tra gửi/nhận email thật cần cấu hình Supabase/SMTP của project.

Tham khảo: [Supabase Users](https://supabase.com/docs/guides/auth/users),
[Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).
