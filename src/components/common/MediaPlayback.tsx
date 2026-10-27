"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PostSound } from "@/lib/sounds";

type Props = {
  src: string;
  mediaType: "video" | "image";
  title: string;
  soundtrack?: PostSound | null;
  active?: boolean;
  autoPlay?: boolean;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number, muted: boolean) => void;
  onDimensions?: (width: number, height: number) => void;
  onDuration?: (seconds: number) => void;
};

const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function MediaPlayback({ src, mediaType, title, soundtrack, active = true, autoPlay = false, volume, muted, onVolumeChange, onDimensions, onDuration }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const commands = useRef<{ play: () => void; pause: () => void; seek: (time: number) => void }>({ play: () => {}, pause: () => {}, seek: () => {} });
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notice, setNotice] = useState("");
  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = position; }, [position]);
  const start = (soundtrack?.startMs ?? 0) / 1000;
  const length = (soundtrack?.durationMs ?? 0) / 1000;
  const audioUrl = soundtrack?.sound.audioUrl;
  const originalVolume = soundtrack?.originalVolume ?? 1;
  const musicVolume = soundtrack?.musicVolume ?? 1;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    const update = () => {
      if (disposed || video.readyState < 1) return;
      const seconds = Number.isFinite(video.duration) ? video.duration : 0;
      setDuration(seconds);
      onDimensions?.(video.videoWidth, video.videoHeight);
      onDuration?.(seconds);
    };
    video.addEventListener("loadedmetadata", update);
    // Cached media may have loaded before hydration attached the listeners.
    queueMicrotask(update);
    return () => { disposed = true; video.removeEventListener("loadedmetadata", update); };
  }, [src, mediaType, onDimensions, onDuration]);

  useEffect(() => {
    if (videoRef.current) { videoRef.current.volume = volume * originalVolume; videoRef.current.muted = muted; }
    if (audioRef.current) { audioRef.current.volume = volume * musicVolume; audioRef.current.muted = muted; }
  }, [volume, muted, originalVolume, musicVolume, src, audioUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    let disposed = false;
    let buffering = false;
    let requestedPlay = false;
    let visible = document.visibilityState === "visible";
    let inView = true;
    let audioPending = false;
    let audioFailed = false;
    let audioBlocked = false;
    const listeners: (() => void)[] = [];
    function listen(target: EventTarget, event: string, handler: () => void) {
      target.addEventListener(event, handler);
      listeners.push(() => target.removeEventListener(event, handler));
    }
    const allowed = () => !disposed && active && visible && inView && requestedPlay;
    const setAudioTime = (time: number) => {
      if (audio && Number.isFinite(time) && audio.readyState >= 1) audio.currentTime = time;
    };
    function startAudio() {
      if (!audio || audioFailed || audioBlocked || audioPending || !audio.paused || !allowed()) return;
      audioPending = true;
      void audio.play().then(() => {
        if (!allowed() || (video && (video.paused || buffering || video.currentTime >= length))) audio.pause();
        else { setNotice(""); if (!video) setPlaying(true); }
      }).catch((error: DOMException) => {
        if (!disposed && error.name !== "AbortError") {
          audioBlocked = true;
          setNotice("Sound could not start. Press Play or Enable sound to retry.");
          if (!video) setPlaying(false);
        }
      }).finally(() => { audioPending = false; });
    }
    function sync() {
      if (!audio || audioFailed) return;
      if (video) {
        if (!allowed() || video.paused || video.seeking || buffering || video.currentTime >= length) { audio.pause(); return; }
        const target = start + video.currentTime;
        audio.playbackRate = video.playbackRate;
        if (Math.abs(audio.currentTime - target) > 0.2) setAudioTime(target);
        startAudio();
      } else if (allowed()) {
        if (audio.currentTime < start || audio.currentTime >= start + length - 0.03 || audio.ended) setAudioTime(start);
        setPosition(Math.max(0, audio.currentTime - start));
        startAudio();
      }
    }
    function pause() {
      requestedPlay = false;
      video?.pause(); audio?.pause(); setPlaying(false);
    }
    function play() {
      if (!active || !visible || !inView) return;
      window.dispatchEvent(new CustomEvent("toptop-media-play", { detail: hostRef.current }));
      requestedPlay = true;
      audioBlocked = false;
      if (video) {
        if (audio) setAudioTime(start + Math.min(video.currentTime, length));
        void video.play().catch(() => { if (!disposed) { setPlaying(false); setNotice("Press Play to start playback."); } });
      } else { setAudioTime(start + Math.min(positionRef.current, Math.max(0, length - 0.05))); }
      // Start within the user's gesture as well as on subsequent playing events.
      if (!video || video.currentTime < length) startAudio();
    }
    commands.current = {
      play, pause,
      seek(time) {
        if (video) video.currentTime = time;
        setAudioTime(start + Math.min(time, length));
        setPosition(time);
        sync();
      },
    };
    if (video) {
      listen(video, "play", () => { requestedPlay = true; window.dispatchEvent(new CustomEvent("toptop-media-play", { detail: hostRef.current })); });
      listen(video, "playing", () => { buffering = false; if (!allowed()) video.pause(); else { setPlaying(true); sync(); } });
      listen(video, "pause", () => { if (active && visible && inView && !buffering) requestedPlay = false; audio?.pause(); setPlaying(false); });
      listen(video, "waiting", () => { buffering = true; audio?.pause(); });
      listen(video, "seeking", () => audio?.pause());
      listen(video, "seeked", () => { buffering = false; sync(); });
      listen(video, "ratechange", sync);
      listen(video, "timeupdate", () => { setPosition(video.currentTime); sync(); });
    }
    if (audio) {
      if (!video) {
        listen(audio, "pause", () => setPlaying(false));
        listen(audio, "playing", () => setPlaying(allowed()));
      }
      listen(audio, "loadedmetadata", () => {
        if (audio.duration + 0.1 < start + length) { audioFailed = true; audio.pause(); setNotice("The sound file is shorter than the selected segment."); return; }
        setAudioTime(start + (video?.currentTime ?? 0)); sync();
      });
      listen(audio, "timeupdate", sync);
      listen(audio, "ended", sync);
      listen(audio, "error", () => { audioFailed = true; setNotice("Sound unavailable. The original media can still be viewed."); });
    }
    listen(document, "visibilitychange", () => {
      visible = document.visibilityState === "visible";
      if (!visible) { video?.pause(); audio?.pause(); setPlaying(false); }
      else if (requestedPlay) play();
    });
    const otherPlayback = (event: Event) => { if ((event as CustomEvent).detail !== hostRef.current) pause(); };
    window.addEventListener("toptop-media-play", otherPlayback);
    // Upload previews and recent uploads also stop when scrolled out of view.
    const observer = new IntersectionObserver(entries => {
      inView = entries[0]?.isIntersecting ?? true;
      if (!inView) { video?.pause(); audio?.pause(); setPlaying(false); }
      else if (requestedPlay) play();
    });
    if (hostRef.current) observer.observe(hostRef.current);
    if (active && autoPlay) play();
    else { video?.pause(); audio?.pause(); }
    const interval = active && audio ? window.setInterval(sync, 150) : undefined;
    return () => {
      disposed = true; observer.disconnect(); clearInterval(interval);
      window.removeEventListener("toptop-media-play", otherPlayback);
      listeners.forEach(remove => remove()); video?.pause(); audio?.pause();
    };
  }, [src, mediaType, audioUrl, start, length, active, autoPlay]);

  const total = mediaType === "video" ? duration : length;
  const hasCustomControls = !!soundtrack;
  return <div ref={hostRef} className="relative h-full w-full">
    {mediaType === "image" ? <Image src={src} alt={title} fill unoptimized sizes="(min-width: 1024px) 65vw, 100vw" className="object-contain"
      onLoad={event => onDimensions?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />
      : <video ref={videoRef} src={src} aria-label={title} controls={!hasCustomControls} playsInline loop preload="metadata" muted={muted}
        onVolumeChange={event => {
          if (!hasCustomControls && active && (event.currentTarget.volume !== volume || event.currentTarget.muted !== muted)) onVolumeChange(event.currentTarget.volume, event.currentTarget.muted);
        }}
        className="block h-full w-full object-contain" />}
    {audioUrl && <audio ref={audioRef} src={audioUrl} preload={active ? "metadata" : "none"} />}
    {hasCustomControls && <div className="absolute inset-x-0 bottom-0 z-20 space-y-1 bg-black/75 p-2 text-xs text-white">
      <div className="flex items-center gap-2">
        <button type="button" className="shrink-0 rounded px-2 py-1 hover:bg-white/20" onClick={() => playing ? commands.current.pause() : commands.current.play()}>{playing ? "Pause" : "Play"}</button>
        <span className="shrink-0 tabular-nums">{timeLabel(position)} / {timeLabel(total)}</span>
        <input aria-label="Playback position" type="range" min={0} max={total || 1} step={0.1} value={Math.min(position, total)} onChange={event => commands.current.seek(Number(event.target.value))} className="min-w-0 flex-1 accent-primary" />
        <button type="button" aria-label="Fullscreen" onClick={() => void hostRef.current?.requestFullscreen().catch(() => setNotice("Fullscreen is unavailable."))} className="rounded p-1 hover:bg-white/20">⛶</button>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="shrink-0 rounded px-2 py-1 hover:bg-white/20" onClick={() => { onVolumeChange(volume, !muted); if (muted) commands.current.play(); }}>{muted ? "Enable sound" : "Mute"}</button>
        <input aria-label="Playback volume" type="range" min={0} max={1} step={0.05} value={volume} onChange={event => onVolumeChange(Number(event.target.value), false)} className="min-w-0 flex-1 accent-primary" />
      </div>
    </div>}
    {notice && <p role="status" className="absolute inset-x-2 top-2 z-20 rounded bg-black/80 p-2 text-xs text-white">{notice}</p>}
  </div>;
}
