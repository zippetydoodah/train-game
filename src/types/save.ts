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
}

export interface SaveStore {
  slots: (SaveSlotData | null)[];
}

export type SlotIndex = 0 | 1 | 2 | 3 | 4;

export const MAX_SAVE_SLOTS = 5;
export const MAX_SAVE_NAME_LENGTH = 24;
export const STORAGE_KEY = 'railTycoon_saves';
