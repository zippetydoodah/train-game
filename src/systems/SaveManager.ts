import { SaveSlotData, SaveStore, SlotIndex, MAX_SAVE_SLOTS, STORAGE_KEY } from '../types/save';

export class SaveManager {
  static getStore(): SaveStore {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { slots: [null, null, null, null, null] };
    try {
      const parsed = JSON.parse(raw) as SaveStore;
      while (parsed.slots.length < MAX_SAVE_SLOTS) parsed.slots.push(null);
      return parsed;
    } catch {
      return { slots: [null, null, null, null, null] };
    }
  }

  private static setStore(store: SaveStore): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch {
      // localStorage quota exceeded or unavailable
      return false;
    }
  }

  static save(slotIndex: SlotIndex, data: SaveSlotData): boolean {
    const store = this.getStore();
    store.slots[slotIndex] = data;
    return this.setStore(store);
  }

  static load(slotIndex: SlotIndex): SaveSlotData | null {
    return this.getStore().slots[slotIndex];
  }

  static delete(slotIndex: SlotIndex): void {
    const store = this.getStore();
    store.slots[slotIndex] = null;
    this.setStore(store);
  }

  static getAllSlots(): (SaveSlotData | null)[] {
    return this.getStore().slots;
  }
}
