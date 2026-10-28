"use client";

import { useSyncExternalStore } from "react";

const storageKey = "toptop-playback-volume";
const serverSnapshot = { volume: 1, muted: true, ready: false };
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function readVolume() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const value = stored === null || stored.trim() === "" ? 1 : Number(stored);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 1;
  } catch {
    return 1;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent) {
  if (event.key !== storageKey && event.key !== null) return;
  snapshot = { volume: readVolume(), muted: false, ready: true };
  emit();
}

function subscribe(listener: () => void) {
  if (!snapshot.ready) {
    // Restore the volume before playback is enabled. Mute is session-only.
    snapshot = { volume: readVolume(), muted: false, ready: true };
  }
  if (!listeners.size) window.addEventListener("storage", handleStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", handleStorage);
  };
}

function setPlaybackVolume(volume: number, muted: boolean) {
  if (!Number.isFinite(volume)) return;
  const nextVolume = Math.min(1, Math.max(0, volume));
  snapshot = { volume: nextVolume, muted, ready: true };
  try {
    window.localStorage.setItem(storageKey, String(nextVolume));
  } catch {
    // Playback still works when browser storage is unavailable.
  }
  emit();
}

export function usePlaybackVolume() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  return { ...state, setPlaybackVolume };
}
