import { SaveSlotData, SaveStore, SlotIndex, MAX_SAVE_SLOTS, STORAGE_KEY } from '../types/save';

/** Default empty store factory. */
function emptyStore(): SaveStore {
  return { slots: [null, null, null, null, null] };
}

export class SaveManager {
  static getStore(): SaveStore {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.slots)) {
        return emptyStore();
      }
      // Validate each slot and ensure exactly MAX_SAVE_SLOTS entries
      const slots: (SaveSlotData | null)[] = [];
      for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
        const slot = parsed.slots[i];
        if (slot && typeof slot.name === 'string' && typeof slot.seed === 'number') {
          slots.push(slot as SaveSlotData);
        } else {
          slots.push(null);
        }
      }
      return { slots };
    } catch {
      return emptyStore();
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
