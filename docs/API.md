# Backend API — Toptop

Published media post lists, details and user-specific lists are documented in
[Posts API](./POSTS-API.md). Profile now displays the viewed user's real media posts.

Media uploads are available through `POST /api/v1/uploads`,
`POST /api/v1/uploads/:uploadId/complete` and `GET /api/v1/me/posts`.
See [Upload setup and API](./UPLOADS.md) for the required migration, request examples,
limits, Storage behavior and authenticated page access.

User profile lookup by UUID is available at `GET /api/v1/users/:userId`.
See [User profile API](./USER-API.md) for the response contract, username/current-user
endpoints, client helpers and reusable TanStack Query hooks.

Backend cơ bản sử dụng **Next.js Route Handlers + Supabase PostgreSQL/Auth/Storage + Zod**.
The frontend uses TanStack Query for auth, comments and published Profile posts. The For You feed still uses mock data.
Xem `docs/AUTH.md` cho luồng UI, cấu hình email và role.

## 1. Phạm vi đã triển khai

- Đăng ký, đăng nhập, đăng xuất, đọc session, refresh session và callback xác nhận email.
- Gửi lại email xác nhận, quên/đổi mật khẩu, role ứng dụng `user` và `admin`.
- Feed mới nhất, feed Following, chi tiết video.
- Profile theo username; đọc/sửa profile của chính mình.
- Video theo tác giả; sắp xếp latest/oldest/popular, ghim trước khi phân trang.
- Like/unlike, save/unsave, follow/unfollow.
- Danh sách video đã thích/đã lưu của người đang đăng nhập.
- Đọc, tạo và xóa bình luận của chính mình.
- Cursor pagination, kiểm tra input, phân quyền RLS, lỗi JSON thống nhất.
- Migration và script seed 2 tài khoản, 4 video demo, 1 bình luận.
- Chuẩn bị bucket `videos`, `thumbnails`, `avatars` trong Storage.

**Not implemented:** editing/deleting published media, view tracking, pin management,
username/email changes, comment likes/replies, search, notifications, realtime,
video processing and an admin UI. The new upload page stores posts in `media_posts`;
the For You feed is not connected to this collection yet; Profile uses published media posts.

## 2. Cấu hình Supabase từ đầu

### 2.1. Tạo project và biến môi trường

1. Tạo một project Supabase dành cho development.
2. Lấy Project URL và **publishable key** trong Dashboard. Không dùng secret key làm publishable key.
3. Copy `.env.example` thành `.env.local` và điền:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
APP_URL=http://localhost:3000
```

`APP_URL` là địa chỉ ứng dụng, gồm scheme và port. Khi đổi cổng/deploy phải đổi biến này và restart.
Nếu thiếu cấu hình, API trả `503 BACKEND_NOT_CONFIGURED`; frontend mock vẫn có thể build/chạy.
Không commit `.env.local`. API không dùng secret/service-role key.

### 2.2. Chạy migration

**Cách đơn giản với Supabase Dashboard:** mở SQL Editor, chạy toàn bộ file
`supabase/migrations/20261023000100_backend.sql` **một lần** trên project mới.
File tạo bảng, index, trigger tạo profile khi đăng ký, policy RLS, RPC và bucket.
Sau đó chạy `supabase/migrations/20261023000200_user_roles.sql` một lần để đặt role
mặc định cho tài khoản cũ/mới. Nếu đã có migration đầu, chỉ chạy migration role mới.
Migration không phải script chạy lặp; thay đổi tiếp theo cần migration mới.

**Hoặc dùng Supabase CLI** sau khi cài CLI theo tài liệu chính thức:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Chọn một cách quản lý migration cho project. Nếu đã chạy thủ công trong SQL Editor,
cần đồng bộ lịch sử migration trước khi chuyển sang CLI, không chạy lại file bằng `db push` một cách mù quáng.
Project local có thể dùng `supabase start` nếu đã cài CLI và Docker đang chạy.
`supabase/config.toml` đã có cấu hình development. SQL seed tự động được tắt; dùng script bên dưới.

### 2.3. Cấu hình Auth

Trong Supabase Authentication:

- Bật provider Email/password; nên bật Confirm email.
- Site URL: `http://localhost:3000`.
- Thêm Redirect URL: `http://localhost:3000/api/v1/auth/callback`.
- Thêm Redirect URL reset password: `http://localhost:3000/api/v1/auth/callback?flow=recovery`.
- Khi deploy, cập nhật cả hai sang domain thực.
- Giữ template confirmation dùng `{{ .ConfirmationURL }}` để Supabase hoàn tất xác nhận rồi redirect về callback.
- Khi dùng email ngoài môi trường thử nghiệm, cấu hình SMTP và kiểm tra giới hạn gửi email của project.

API đăng ký sử dụng PKCE. Link xác nhận cần mở trong cùng browser/cookie jar đã đăng ký.
Callback trả JSON cho API client; với browser (`Accept: text/html`) điều hướng đến
`/auth/confirmed` hoặc `/auth/reset-password`. Template dùng token hash để mở link
trên thiết bị khác được hướng dẫn trong `docs/AUTH.md`.
Đăng ký bằng Postman rồi mở email ở browser khác sẽ không có cookie PKCE; hãy xác nhận email,
sau đó đăng nhập qua `/auth/sign-in`, hoặc dùng các tài khoản seed đã được xác nhận.

### 2.4. Seed dữ liệu demo (tùy chọn)

Sau migration, thêm vào `.env.local` **chỉ để chạy seed trên project development**:

```dotenv
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
SEED_DEMO_PASSWORD=Your-Own-Strong-Demo-Password
```

Mật khẩu seed tối thiểu 12 ký tự. Chạy:

```bash
pnpm install
pnpm seed:backend
pnpm dev
```

Seed tạo hai tài khoản đã xác nhận email:

| Email | Username |
|---|---|
| `demo_linhchi@example.com` | `demo_linhchi` |
| `demo_tuananh@example.com` | `demo_tuananh` |

Mật khẩu là giá trị `SEED_DEMO_PASSWORD` ở lần tạo đầu tiên. Chạy lại seed **không reset mật khẩu**.
Seed có thể chạy lại để cập nhật video/comment demo theo các ID cố định; không dùng trên production.
Không chỉnh profile có username trùng nhưng thuộc tài khoản khác.
Xóa `SUPABASE_SECRET_KEY` khỏi môi trường ứng dụng khi seed xong; API không cần biến này.

Các video dùng file đang có trong `public/demo-videos`, chưa upload lên Storage:

| Video ID | File | Tác giả |
|---|---|---|
| `10000000-0000-4000-8000-000000000003` | `demo-video-3.mp4` | demo_linhchi |
| `10000000-0000-4000-8000-000000000004` | `demo-video-4.mp4` | demo_tuananh |
| `10000000-0000-4000-8000-000000000005` | `demo-video-5.mp4` | demo_linhchi |
| `10000000-0000-4000-8000-000000000006` | `demo-video-6.mp4` | demo_tuananh |

## 3. Quy ước chung

Base URL development: **`http://localhost:3000/api/v1`**.
Mọi đường dẫn bên dưới nối sau base URL. Dùng UUID thật cho `videoId`, `userId`, `commentId`.
`username` không phải UUID; dấu `@` là phần hiển thị. Route profile chấp nhận cả `demo_linhchi` và `@demo_linhchi`.

### Xác thực

API nghiệp vụ hỗ trợ:

1. **Cookie Supabase**: đăng nhập bằng API, giữ các header `Set-Cookie` trong cookie jar.
2. **Bearer token**: gửi `Authorization: Bearer <accessToken>` lấy từ kết quả đăng nhập.

Bearer có ưu tiên nếu request đồng thời có cookie. Token không hợp lệ trả 401, kể cả ở API đọc công khai;
không tự hạ xuống người dùng ẩn danh. Cookie hết hạn ở API đọc công khai được xử lý như khách;
API yêu cầu đăng nhập vẫn trả 401. User ID của thao tác luôn lấy từ session được Supabase xác thực.

Các endpoint signup/signin/signout/refresh/callback/resend/forgot-password/password dùng cookie, **không nhận header Authorization**.
Endpoint `/auth/session` nhận cả hai kiểu xác thực. Refresh token được giữ trong cookie Supabase,
không trả thành field JSON. API chạy trong Route Handler cập nhật cookie khi refresh;
AuthProvider kiểm tra session khi tải trang, khi focus và định kỳ trong lúc tab hoạt động;
frontend không lưu token vào localStorage. Kiểm tra quyền thật nằm ở API/RLS, không nằm ở UI gate.

### Origin và body

- Với request thay đổi dữ liệu dùng cookie (POST/PUT/PATCH/DELETE), bắt buộc gửi `Origin` trùng `APP_URL`.
- Request Bearer của công cụ như Postman/cURL có thể không có Origin; nếu có thì phải trùng APP_URL.
- Signup/signin/signout/refresh cũng cần Origin. Đây là kiểm tra CSRF, không phải quyền truy cập tài khoản.
- GET không cần Origin. API chưa cấu hình CORS cho frontend khác domain.
- Các endpoint nhận JSON yêu cầu `Content-Type: application/json`; body tối đa 16 KiB.
- Trường JSON/query không được hỗ trợ bị từ chối thay vì bỏ qua âm thầm.
- Tất cả response có `Cache-Control: private, no-store` để không cache chéo session/trạng thái cá nhân.

### Response

Một đối tượng:

```json
{ "data": { "id": "..." } }
```

Một danh sách:

```json
{
  "data": [],
  "pagination": { "hasMore": false, "nextCursor": null }
}
```

Lỗi:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Dữ liệu không hợp lệ.",
    "details": [{ "field": "content", "message": "..." }]
  }
}
```

`details` chỉ có khi phù hợp. Ngày giờ trả về ISO 8601; các số đếm là number.
Frontend tự format ngày giờ và số như `1.2K`. HTTP 204 không có JSON body.

### Phân trang và sắp xếp

- `limit`: mặc định 10, từ 1 đến 50.
- `cursor`: lấy nguyên `pagination.nextCursor` của response trước. Trang đầu không gửi cursor.
- Dừng khi `hasMore=false`. Không tự tạo/giải mã cursor ở frontend.
- Cursor gắn với bộ lọc/sort và, với video, người đang xem. Đổi bộ lọc hoặc tài khoản phải bắt đầu trang đầu.
- Feed: mới nhất trước, ID làm khóa phụ khi cùng timestamp.
- Profile: ghim trước, sau đó theo `latest` (mới), `oldest` (cũ), `popular` (viewCount giảm dần).
- Saved/Liked: sort theo thuộc tính **video**, không phải ngày thích/lưu; không ưu tiên ghim.
- Comment: mới nhất trước, ID làm khóa phụ.
- Không trả total cho danh sách. Like/comment/follow count trong DTO là số đếm hiện tại.
- Nếu thay đổi ghim/viewCount trong lúc phân trang, thứ tự có thể thay đổi; refresh từ trang đầu.

## 4. Auth API

### POST `/auth/sign-up`

Không cần đăng nhập. Header Origin và Content-Type bắt buộc.

```json
{
  "email": "your-email@example.com",
  "password": "Your-Strong-Password",
  "username": "new_user",
  "displayName": "Người dùng mới"
}
```

- Username: 3–30 chữ thường/số/`_`; input được trim và chuyển chữ thường.
- Display name: 1–80 ký tự sau trim; password: 8–128 ký tự.
- Thành công: **201**, `{data:{user,session,requiresEmailConfirmation}}`.
- Nếu bật xác nhận email: `session=null`, `requiresEmailConfirmation=true`. Kiểm tra email trước khi signin.
- Username đã tồn tại: 409. Email trùng được xử lý theo cơ chế chống dò tài khoản của Supabase;
  không dùng signup response làm API kiểm tra email đã tồn tại.

### POST `/auth/sign-in`

Body `{ "email": "demo_linhchi@example.com", "password": "Your-Own-Strong-Demo-Password" }`.
Thành công **200**, kèm cookie:

```json
{
  "data": {
    "user": { "id": "UUID", "email": "demo_linhchi@example.com", "username": "demo_linhchi", "displayName": "Linh Chi", "avatarUrl": null, "role": "user" },
    "session": { "accessToken": "ACCESS_TOKEN", "tokenType": "bearer", "expiresAt": 1790000000 }
  }
}
```

Sai thông tin: 401; chưa xác nhận email: 403; vượt giới hạn Supabase Auth: 429.

### GET `/auth/session`

Trả **200** `{data:{user:{id,email,username,displayName,avatarUrl,role}}}` sau khi xác thực session với Supabase.
Không có session/cookie hết hạn: `{data:{user:null}}`. Bearer không hợp lệ: 401.

### POST `/auth/refresh`

Gửi cookie jar và Origin, không cần body. Refresh session của cookie jar và ghi cookie mới.
Trả **200**, cùng cấu trúc signin. Thiếu/hết hạn refresh token: lỗi 400 `AUTH_ERROR`, cần đăng nhập lại.

### POST `/auth/sign-out`

Gửi cookie jar và Origin, không cần body. Xóa session hiện tại với scope `local`, không đăng xuất thiết bị khác.
Thành công **204**. Access token đã phát hành có thể còn hiệu lực đến khi hết hạn;
client phải bỏ bản token đang giữ sau khi logout.

### GET `/auth/callback?code=...`

Dành cho Supabase redirect sau xác nhận email. Cần cookie PKCE của lần signup.
Đổi code lấy session, ghi cookie, trả **200** cùng cấu trúc signin cho API client. Code dùng một lần.
Browser nhận 303 đến `/auth/confirmed` (hoặc `/auth/reset-password` khi `flow=recovery`).
Lỗi browser chuyển đến `/auth/confirmed?error=1`. Không hỗ trợ redirect tùy ý.
Cũng nhận `?token_hash=...&type=email|signup|recovery` cho template email tùy chỉnh.

### POST `/auth/resend`

JSON `{ "email": "ban@example.com" }`, không cần đăng nhập, cần Origin.
Gửi lại email xác nhận đăng ký. Trả **200** `{data:{message}}`, lỗi giới hạn gửi **429**.

### POST `/auth/forgot-password`

JSON `{ "email": "ban@example.com" }`, không cần đăng nhập, cần Origin.
Gửi liên kết khôi phục. Trả **200** `{data:{message}}` với thông báo chung để tránh xác nhận email có tài khoản.
Mở liên kết email để tạo phiên recovery trước khi cập nhật mật khẩu.

### POST `/auth/password`

JSON `{ "password": "MatKhauMoiDu8KyTu" }`, cần cookie đăng nhập/recovery hợp lệ và Origin.
Mật khẩu 8–128 ký tự. Trả **200** `{data:{message}}`; chưa xác thực trả **401**.
Endpoint này cũng cho phép người đang đăng nhập đổi mật khẩu của chính mình.

### Role ứng dụng

Role lấy từ `auth.users.raw_app_meta_data.app_role`, chỉ giá trị `admin` được xem là admin;
thiếu/giá trị khác mặc định `user`. Không dùng `user_metadata.role` hoặc JWT database role.
Form đăng ký không nhận role. Chỉ SQL Editor/server có quyền quản trị được gán admin.
Không có endpoint tự đổi role hay quyền admin vượt qua ownership trong API hiện tại.
Helper `requireRole` dành cho các endpoint quản trị khi xây dựng sau; không thay thế RLS.
Thiếu code: 400. Không gọi API này như API đăng nhập thông thường.

## 5. Video và profile API

| Method | Đường dẫn | Auth | Cách dùng / kết quả |
|---|---|---|---|
| GET | `/videos?feed=latest&limit=10&cursor=...` | Không | Danh sách Video, phân trang. `feed` mặc định latest. |
| GET | `/videos?feed=following&limit=10` | Có | Video của những người đang follow; chưa follow ai trả mảng rỗng. |
| GET | `/videos/:videoId` | Không | `{data: Video}`; không tồn tại/chưa công khai trả 404. |
| GET | `/users/by-username/:username` | Không | `{data: Profile}`; không tồn tại trả 404. |
| GET | `/users/:userId/videos?sort=latest&limit=10&cursor=...` | Không | Video của tác giả, sort latest/oldest/popular, ghim trước. |
| GET | `/me` | Có | `{data: Profile}` của người đang đăng nhập. |
| PATCH | `/me` | Có | Sửa profile bằng JSON dưới đây, trả `{data: Profile}` mới. |
| GET | `/me/liked-videos?sort=latest&limit=10&cursor=...` | Có | Video đã thích của chính mình. |
| GET | `/me/saved-videos?sort=latest&limit=10&cursor=...` | Có | Video đã lưu của chính mình. |

PATCH `/me`: gửi ít nhất một trường, các trường khác không thay đổi:

```json
{ "displayName": "Tên mới", "bio": "Giới thiệu ngắn", "avatarUrl": "https://example.com/avatar.jpg" }
```

`bio` tối đa 160 ký tự, dùng `""` để xóa; `avatarUrl` HTTPS, tối đa 2048 ký tự, dùng `null` để xóa.
Đây là cập nhật URL ảnh, không tải/upload file. Chưa cho sửa username.
Không nhận `id`, `email`, `followerCount`, `viewCount` hoặc trường nội bộ.

Profile DTO:

```json
{
  "id": "UUID",
  "username": "demo_linhchi",
  "displayName": "Linh Chi",
  "avatarUrl": null,
  "bio": "",
  "createdAt": "2026-10-23T08:00:00+00:00",
  "followingCount": 0,
  "followerCount": 0,
  "likeCount": 0,
  "isFollowing": false
}
```

`likeCount` của profile là tổng lượt thích nhận được trên các video công khai của tác giả.

Video DTO:

```json
{
  "id": "10000000-0000-4000-8000-000000000003",
  "videoUrl": "/demo-videos/demo-video-3.mp4",
  "posterUrl": null,
  "description": "Một khoảnh khắc giữa thiên nhiên.",
  "createdAt": "2026-10-18T08:00:00+00:00",
  "isPinned": true,
  "viewCount": 1000,
  "author": { "id": "UUID", "username": "demo_linhchi", "displayName": "Linh Chi", "avatarUrl": null },
  "likeCount": 0,
  "commentCount": 1,
  "isLiked": false,
  "isSaved": false,
  "isFollowing": false
}
```

`isLiked`, `isSaved`, `isFollowing` phản ánh người đang gửi request; khách nhận false.
Không có API xem Saved/Liked của người khác. Không trả email trong profile công khai.

## 6. Tương tác

Tất cả cần đăng nhập. PUT/DELETE không cần body. Gửi lặp lại cùng trạng thái không tạo bản ghi trùng.

| Method | Đường dẫn | Response 200 |
|---|---|---|
| PUT | `/videos/:videoId/like` | `{data:{isLiked:true,likeCount:1}}` |
| DELETE | `/videos/:videoId/like` | `{data:{isLiked:false,likeCount:0}}` |
| PUT | `/videos/:videoId/save` | `{data:{isSaved:true}}` |
| DELETE | `/videos/:videoId/save` | `{data:{isSaved:false}}` |
| PUT | `/users/:userId/follow` | `{data:{isFollowing:true,followerCount:1}}` |
| DELETE | `/users/:userId/follow` | `{data:{isFollowing:false,followerCount:0}}` |

Các số đếm trong ví dụ chỉ minh họa. Tự follow chính mình trả 400 `SELF_FOLLOW`.
Đối tượng không tồn tại trả 404. Không nhận userId người thao tác trong body.

## 7. Bình luận

### GET `/videos/:videoId/comments?limit=10&cursor=...`

Không cần đăng nhập. Trả danh sách Comment và pagination, mới nhất trước.
Video tồn tại nhưng chưa có bình luận: mảng rỗng. Video không tồn tại: 404.

### POST `/videos/:videoId/comments`

Cần đăng nhập. Body:

```json
{ "content": "Video đẹp quá!" }
```

Nội dung được trim, dài 1–1000 ký tự. Thành công **201**, `{data: Comment}`:

```json
{
  "id": "UUID",
  "videoId": "10000000-0000-4000-8000-000000000003",
  "content": "Video đẹp quá!",
  "createdAt": "2026-10-23T08:00:00+00:00",
  "isOwner": true,
  "author": { "id": "UUID", "username": "demo_tuananh", "displayName": "Tuấn Anh", "avatarUrl": null }
}
```

POST bình luận không idempotent: gửi hai lần tạo hai bình luận. Frontend sau này cần chặn submit lặp.

### DELETE `/comments/:commentId`

Cần đăng nhập; chỉ xóa bình luận mình viết. Thành công **204**, không có body.
Xóa của người khác trả 403; ID không tồn tại/không nhìn thấy trả 404.
Chủ video chưa có quyền kiểm duyệt/xóa bình luận của người khác trong bản này.

## 8. Ví dụ gọi API

Ví dụ JavaScript để chạy thủ công trong Console ở origin của ứng dụng hoặc một client thử nghiệm;
chưa được đưa vào code frontend:

```js
const response = await fetch('/api/v1/auth/sign-in', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo_linhchi@example.com', password: 'YOUR_DEMO_PASSWORD' }),
});
const result = await response.json();
// Browser tự gửi Origin; không tự gán header Origin bằng JavaScript.

const feed = await fetch('/api/v1/videos?limit=2', { credentials: 'include' }).then(r => r.json());
const videoId = feed.data[0].id;
await fetch(`/api/v1/videos/${videoId}/like`, { method: 'PUT', credentials: 'include' });
await fetch(`/api/v1/videos/${videoId}/comments`, {
  method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Xin chào!' }),
});
if (feed.pagination.hasMore) {
  const nextPage = await fetch(`/api/v1/videos?limit=2&cursor=${encodeURIComponent(feed.pagination.nextCursor)}`).then(r => r.json());
  console.log(nextPage);
}
```

PowerShell (dùng tài khoản seed, giữ cookie trong WebSession):

```powershell
$baseUrl = 'http://localhost:3000/api/v1'
$headers = @{ Origin = 'http://localhost:3000' }
$credentials = Get-Credential -UserName 'demo_linhchi@example.com' -Message 'Nhập mật khẩu demo'
$payload = @{ email = $credentials.UserName; password = $credentials.GetNetworkCredential().Password } | ConvertTo-Json
$login = Invoke-RestMethod "$baseUrl/auth/sign-in" -Method Post -Headers $headers -ContentType 'application/json' -Body $payload -SessionVariable demoSession
$feed = Invoke-RestMethod "$baseUrl/videos?limit=2" -WebSession $demoSession
$videoId = $feed.data[0].id
Invoke-RestMethod "$baseUrl/videos/$videoId/like" -Method Put -Headers $headers -WebSession $demoSession
Invoke-RestMethod "$baseUrl/me/liked-videos" -WebSession $demoSession
Invoke-RestMethod "$baseUrl/auth/sign-out" -Method Post -Headers $headers -WebSession $demoSession
```

Postman: signin với Origin + JSON, bật cookie jar. Với API nghiệp vụ có thể dùng Authorization → Bearer Token
và dán `data.session.accessToken`; không gửi Bearer vào signup/signin/signout/refresh/callback.

## 9. Lỗi thường gặp

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 400 | `INVALID_INPUT`, `INVALID_JSON`, `INVALID_CURSOR` | Params/body/query/cursor không hợp lệ |
| 400 | `SELF_FOLLOW` | Tự follow chính mình |
| 400 | `COOKIE_AUTH_REQUIRED` | Gửi Bearer vào endpoint auth chỉ dùng cookie |
| 400 | `AUTH_ERROR` | Auth callback/refresh/signup không hoàn tất |
| 401 | `UNAUTHENTICATED`, `INVALID_SESSION`, `INVALID_TOKEN`, `INVALID_CREDENTIALS` | Chưa đăng nhập hoặc xác thực sai |
| 403 | `FORBIDDEN`, `INVALID_ORIGIN`, `EMAIL_NOT_CONFIRMED` | Không có quyền, Origin sai hoặc chưa xác nhận email |
| 404 | `USER_NOT_FOUND`, `VIDEO_NOT_FOUND`, `COMMENT_NOT_FOUND`, `NOT_FOUND` | Đối tượng không tồn tại/không công khai |
| 409 | `USERNAME_TAKEN`, `CONFLICT` | Trùng dữ liệu |
| 413 | `BODY_TOO_LARGE` | JSON vượt 16 KiB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Không gửi application/json |
| 429 | `RATE_LIMITED` | Giới hạn của Supabase Auth |
| 500 | `INTERNAL_ERROR` | Lỗi ngoài dự kiến; xem server log |
| 503 | `BACKEND_NOT_CONFIGURED`, `DATABASE_UNAVAILABLE`, `AUTH_UNAVAILABLE` | Thiếu cấu hình, migration hoặc dịch vụ chưa sẵn sàng |

## 10. Tổ chức source và phân quyền

```text
src/app/api/v1/          HTTP handlers, parse request, trả JSON
src/server/modules/     Auth/users/videos/comments/interactions services và Zod schemas
src/server/shared/      Error handling, CSRF, body limit, cursor pagination
src/lib/supabase/       Client phía server theo cookie/token từng request
supabase/migrations/    Schema, index, RLS, RPC và buckets
scripts/seed-backend.mjs Manual demo seed; quyền admin chỉ nằm ở script này
tests/backend/          HTTP validation và SQL/RLS tests
```

RLS vẫn bảo vệ dữ liệu nếu người dùng gọi Supabase Data API trực tiếp:
profile public chỉ chứa thông tin công khai; video chỉ đọc khi `is_published=true`;
like/save/follow chỉ thấy các quan hệ của mình; comment chỉ ghi với author của mình.
Column grants không cho client ghi ID, timestamp, viewCount hoặc đổi username tùy ý.
Các read RPC `api_*` dùng `security definer` có search_path cố định và lọc visibility tường minh,
để trả số đếm tổng mà không lộ danh sách like/save của người khác. Không có write RPC quyền admin.

Storage bucket hiện public: ai có URL có thể đọc file. Nếu sau này có video riêng tư cần bucket/policy riêng;
ẩn bản ghi database không làm URL file public trở nên riêng tư.

## 11. Kiểm thử và giới hạn hiện tại

```bash
pnpm test:backend
pnpm lint:backend
pnpm build
```

Test SQL chạy migration thật bằng PostgreSQL nhúng PGlite; `auth.users`, `auth.uid()` và `storage.buckets`
được dựng tối thiểu để kiểm tra trigger, SQL, RLS, quyền theo cột, uniqueness, sort và cursor.
Test HTTP kiểm tra input, CSRF, JSON body cap, cursor và lỗi khi thiếu cấu hình.
Test Route Handlers dùng Supabase HTTP stub để kiểm tra truyền Bearer, từ chối token sai,
ownership khi tạo/xóa comment, PUT like lặp và ghi cookie khi signin.
Đây không phải kiểm thử end-to-end với Supabase Auth/PostgREST/Storage đang chạy.

Trước khi dùng project cloud, cần kiểm tra thực tế: email confirmation, cookie refresh,
đăng nhập hai user, quyền xóa comment, phân trang, like/save/follow và logout.
Chưa cấu hình giới hạn spam nghiệp vụ phân tán, monitoring/backup production, hoặc xử lý video.
Giới hạn Auth hiện do Supabase cung cấp; limit/body cap không thay thế rate limiting nghiệp vụ.
Nếu deploy nhiều instance, tránh rate limiter chỉ lưu trong RAM của từng instance.

Tài liệu tham khảo: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Database migrations](https://supabase.com/docs/guides/deployment/database-migrations),
[Storage](https://supabase.com/docs/guides/storage).
