import { apiFetch } from "./client";
import type { AdminSound, AdminSoundPage, SoundDetails } from "@/lib/admin-sounds";
import type { UploadTicket } from "@/lib/uploads";

export const getAdminSounds = (offset: number, q: string, signal: AbortSignal) => apiFetch<AdminSoundPage>(`/admin/sounds?offset=${offset}&limit=20&q=${encodeURIComponent(q)}`, { signal });
export const createAdminSoundUpload = (file: File, signal: AbortSignal) => apiFetch<{ data: UploadTicket }>("/admin/sounds/uploads", {
  method: "POST", body: JSON.stringify({ mimeType: file.type, size: file.size }), signal,
});
export const completeAdminSoundUpload = (id: string, details: SoundDetails, signal: AbortSignal) => apiFetch<{ data: AdminSound }>(`/admin/sounds/uploads/${id}/complete`, {
  method: "POST", body: JSON.stringify(details), signal,
});
