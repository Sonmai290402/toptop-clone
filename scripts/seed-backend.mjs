import { createClient } from "@supabase/supabase-js";

// Explicit, manual development seed. Never imported by the app or run at build.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.SEED_DEMO_PASSWORD;
if (!url || !secret || !password || password.length < 12) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and SEED_DEMO_PASSWORD (at least 12 characters) in .env.local. Use a development project only.");
}
const db = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
function checked({ data, error }) {
  if (error) throw new Error(`Seed failed (${error.code ?? error.status ?? "unknown"}): check migration, permissions and seed configuration.`);
  return data;
}

const users = [];
for (const [username, name] of [["demo_linhchi", "Linh Chi"], ["demo_tuananh", "Tuan Anh"]]) {
  const email = `${username}@example.com`;
  const existing = checked(await db.from("profiles").select("id").eq("username", username).maybeSingle());
  let id;
  if (existing) {
    const { user } = checked(await db.auth.admin.getUserById(existing.id));
    if (user?.email !== email) throw new Error(`Username ${username} belongs to another account. Seed stopped.`);
    id = user.id;
    // Reruns preserve the existing account's password.
  } else {
    const { user } = checked(await db.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { username, display_name: name },
    }));
    id = user.id;
  }
  users.push(id);
}

const ids = [
  "10000000-0000-4000-8000-000000000003",
  "10000000-0000-4000-8000-000000000004",
  "10000000-0000-4000-8000-000000000005",
  "10000000-0000-4000-8000-000000000006",
];
const descriptions = ["A moment in nature.", "Capturing beautiful moments.", "The rhythm of city life.", "A peaceful day."];
checked(await db.from("videos").upsert(ids.map((id, index) => ({
  id, author_id: users[index % 2], video_url: `/demo-videos/demo-video-${index + 3}.mp4`,
  description: descriptions[index], is_pinned: index === 0, view_count: [1000, 2643, 17889, 59][index],
  created_at: `2026-10-${18 + index}T08:00:00Z`,
})), { onConflict: "id" }));
checked(await db.from("comments").upsert({
  id: "20000000-0000-4000-8000-000000000001", video_id: ids[0], author_id: users[1],
  content: "Beautiful video!", created_at: "2026-10-23T08:00:00Z",
}, { onConflict: "id" }));
console.log("Seed complete: 2 demo users, 4 videos, 1 comment.");
console.log("Sign in with demo_linhchi@example.com or demo_tuananh@example.com and the initial SEED_DEMO_PASSWORD.");
console.log("Video files remain in public/demo-videos; this seed does not upload files.");
