import { SpeedSetting } from './time';

export interface SaveSlotData {
  name: string;
  seed: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  gameTimeMinutes: number;
  speed: SpeedSetting;
  savedAt: string;
  treasuryBalance?: number;
  infrastructure?: InfrastructureTileCompact[];
}

export interface SaveStore {
  slots: (SaveSlotData | null)[];
}

export type InfrastructureTileCompact = [number, number, number, number, number, number, number, string?];

export type SlotIndex = 0 | 1 | 2 | 3 | 4;

export const MAX_SAVE_SLOTS = 5;
export const MAX_SAVE_NAME_LENGTH = 24;
export const STORAGE_KEY = 'railTycoon_saves';

/** Runtime-checked SlotIndex factory — throws RangeError if out of bounds. */
export function asSlotIndex(i: number): SlotIndex {
  if (i < 0 || i >= MAX_SAVE_SLOTS) {
    throw new RangeError(`Invalid slot index: ${i}`);
  }
  return i as SlotIndex;
}
