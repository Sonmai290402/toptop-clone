"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function ThumbnailPicker({ src, value, onChange, disabled, onBusyChange }: {
  src: string; value: File | null; onChange: (file: File | null) => void;
  disabled: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const t = useTranslations("thumbnail");
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function encode(source: CanvasImageSource, width: number, height: number) {
    if (!width || !height) throw new Error("Image dimensions unavailable");
    const scale = Math.min(1, 1920 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image encoding failed")), "image/jpeg", 0.85));
    if (blob.size > 3 * 1024 * 1024) throw new Error("Thumbnail too large");
    onChange(new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
    setPreview(URL.createObjectURL(blob));
  }
  async function choose(file?: File) {
    if (busy || disabled) return;
    setBusy(true); onBusyChange(true); setError(false);
    try {
      if (file) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error("Invalid image");
        const bitmap = await createImageBitmap(file);
        try { await encode(bitmap, bitmap.width, bitmap.height); } finally { bitmap.close(); }
      } else {
        const player = video.current;
        if (!player || player.readyState < 2 || player.seeking) throw new Error("Frame unavailable");
        player.pause();
        await encode(player, player.videoWidth, player.videoHeight);
      }
    } catch { setError(true); }
    finally { setBusy(false); onBusyChange(false); }
  }
  return <section className="space-y-3 rounded-xl border p-3" aria-label={t("title")}>
    <p className="font-semibold">{t("title")}</p>
    <p className="text-sm text-muted-foreground">{t("hint")}</p>
    <video ref={video} src={src} controls muted playsInline preload="auto" className="max-h-48 w-full rounded bg-black"
      onLoadedData={() => setReady(true)} onSeeking={() => setReady(false)} onSeeked={() => setReady(true)} onError={() => { setReady(false); setError(true); }} />
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={disabled || busy || !ready} onClick={() => void choose()}>{t("capture")}</Button>
      <label className="block text-sm">{t("upload")}<input aria-label={t("upload")} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy}
        className="block max-w-full text-sm" onChange={event => { const file = event.target.files?.[0]; if (file) void choose(file); event.target.value = ""; }} /></label>
    </div>
    {value && preview && <div className="flex items-center gap-3"><Image src={preview} alt={t("preview")} width={120} height={160} unoptimized className="h-32 w-24 rounded object-cover" />
      <Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => { onChange(null); setPreview(""); }}>{t("remove")}</Button></div>}
    {busy && <p role="status">{t("processing")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{t("error")}</p>}
  </section>;
}
