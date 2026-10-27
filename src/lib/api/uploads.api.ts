import { apiFetch } from "./client";
import type { MediaPost, UploadTicket } from "@/lib/uploads";
import type { SoundSelection } from "@/lib/sounds";

export const createUpload = (file: File, signal: AbortSignal) => apiFetch<{ data: UploadTicket }>("/uploads", {
  method: "POST", body: JSON.stringify({ mimeType: file.type, size: file.size }), signal,
});
export const publishUpload = (id: string, caption: string, signal: AbortSignal, sound?: SoundSelection | null) => apiFetch<{ data: MediaPost }>(`/uploads/${id}/complete`, {
  method: "POST", body: JSON.stringify({ caption, sound }), signal,
});
export const getMyPosts = (signal: AbortSignal) => apiFetch<{ data: MediaPost[] }>("/me/posts", { signal });

export function uploadFile(url: string, file: File, signal: AbortSignal, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error?: Error) => {
      signal.removeEventListener("abort", abort);
      if (error) reject(error); else resolve();
    };
    if (signal.aborted) { reject(new DOMException("Upload canceled", "AbortError")); return; }
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300 ? undefined : new Error("Storage rejected the upload. Please try again."));
    xhr.onerror = () => finish(new Error("Upload failed. Check your connection and try again."));
    xhr.ontimeout = () => finish(new Error("Upload timed out. Please try again."));
    xhr.onabort = () => finish(new DOMException("Upload canceled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(file);
  });
}
