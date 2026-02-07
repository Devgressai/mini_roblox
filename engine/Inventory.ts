/**
 * Inventory - slots and selection for place/break sandbox. Used by Hotbar UI.
 */

export type ItemId = 'stone' | 'wood' | 'ice' | 'slime' | 'glow' | 'empty';

export interface InventorySlot {
  item: ItemId;
  count: number;
}

export const SLOT_COUNT = 5;
const DEFAULT_SLOTS: InventorySlot[] = [
  { item: 'stone', count: 99 },
  { item: 'wood', count: 99 },
  { item: 'ice', count: 99 },
  { item: 'slime', count: 99 },
  { item: 'glow', count: 99 },
];

export class Inventory {
  private slots: InventorySlot[] = DEFAULT_SLOTS.map((s) => ({ ...s, count: s.count }));
  private selectedIndex = 0;

  getSlots(): ReadonlyArray<InventorySlot> {
    return this.slots;
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  setSelectedIndex(index: number): void {
    this.selectedIndex = Math.max(0, Math.min(SLOT_COUNT - 1, index));
  }

  getSelectedSlot(): InventorySlot {
    return this.slots[this.selectedIndex];
  }

  getSelectedItem(): ItemId {
    return this.slots[this.selectedIndex].item;
  }

  addItem(item: ItemId, count: number = 1): boolean {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].item === item) {
        this.slots[i].count += count;
        return true;
      }
    }
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].item === 'empty') {
        this.slots[i].item = item;
        this.slots[i].count = count;
        return true;
      }
    }
    return false;
  }

  consumeSelected(count: number = 1): boolean {
    const s = this.slots[this.selectedIndex];
    if (s.item === 'empty' || s.count < count) return false;
    s.count -= count;
    if (s.count <= 0) {
      s.item = 'empty';
      s.count = 0;
    }
    return true;
  }

  hasPlaceableSelected(): boolean {
    const item = this.slots[this.selectedIndex].item;
    return item !== 'empty' && this.slots[this.selectedIndex].count > 0;
  }
}
