/**
 * Hotbar - bottom-of-screen UI showing inventory slots and selection.
 */

import type { Inventory, ItemId } from '../engine/Inventory.js';

const SLOT_SIZE = 48;
const PADDING = 4;
const BORDER = 3;

export function createHotbar(container: HTMLElement, inventory: Inventory): () => void {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: ${PADDING}px;
    padding: ${PADDING}px;
    background: rgba(15, 23, 42, 0.9);
    border: ${BORDER}px solid #334155;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    z-index: 50;
  `;

  const slots: HTMLElement[] = [];
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.style.cssText = `
      width: ${SLOT_SIZE}px;
      height: ${SLOT_SIZE}px;
      border-radius: 6px;
      border: 2px solid #475569;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #94a3b8;
      font-weight: bold;
      transition: border-color 0.1s, box-shadow 0.1s;
    `;
    slot.dataset.index = String(i);
    wrap.appendChild(slot);
    slots.push(slot);
  }

  function update(): void {
    const list = inventory.getSlots();
    const selected = inventory.getSelectedIndex();
    for (let i = 0; i < slots.length; i++) {
      const s = list[i];
          const el = slots[i];
      const isSelected = i === selected;
      el.style.borderColor = isSelected ? '#f59e0b' : '#475569';
      el.style.boxShadow = isSelected ? '0 0 0 2px rgba(245,158,11,0.4)' : 'none';
      el.textContent = itemLabel(s.item) + (s.count > 1 ? ` ×${s.count}` : '');
      el.style.background = slotBg(s.item);
    }
  }

  update();
  container.style.position = 'relative';
  container.appendChild(wrap);

  const interval = setInterval(update, 100);

  return () => {
    clearInterval(interval);
    wrap.remove();
  };
}

function itemLabel(item: ItemId): string {
  switch (item) {
    case 'stone': return '🪨';
    case 'wood': return '🪵';
    case 'ice': return '🧊';
    case 'slime': return '🟢';
    case 'glow': return '✨';
    default: return '';
  }
}

function slotBg(item: ItemId): string {
  switch (item) {
    case 'stone': return '#475569';
    case 'wood': return '#a16207';
    case 'ice': return '#7dd3fc';
    case 'slime': return '#22c55e';
    case 'glow': return '#eab308';
    default: return '#1e293b';
  }
}
