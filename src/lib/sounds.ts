import { z } from "zod";

export const soundSelectionSchema = z.object({
  soundId: z.uuid(),
  startMs: z.number().int().min(0).max(3600000),
  durationMs: z.number().int().min(1000).max(3600000),
  musicVolume: z.number().min(0).max(1),
  originalVolume: z.number().min(0).max(1),
}).strict();

export type SoundSelection = z.infer<typeof soundSelectionSchema>;
export type Sound = { id: string; title: string; artist: string; audioUrl: string; durationMs: number };
export type PostSound = SoundSelection & { sound: Sound };
export type SoundPage = { data: Sound[]; pagination: { hasMore: boolean; nextOffset: number | null } };

export const soundColumns = "sound_id,sound_start_ms,sound_duration_ms,music_volume,original_volume";
export const postSoundFields = {
  sound_id: z.uuid().nullable().optional(),
  sound_start_ms: z.number().optional(),
  sound_duration_ms: z.number().nullable().optional(),
  music_volume: z.number().optional(),
  original_volume: z.number().optional(),
};

