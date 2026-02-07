/**
 * Mini Roblox - entry point: menu and game launcher.
 */

import { renderMenu, type GameEntry } from './ui/Menu.js';
import { startGame1 } from './games/game1.js';
import { startGame2 } from './games/game2.js';

const games: GameEntry[] = [
  { id: 'game1', name: 'Game 1 — Platformer (Arrows + Jump)', start: startGame1 },
  { id: 'game2', name: 'Game 2 — Coin Collector (Arrows)', start: startGame2 },
];

const root = document.getElementById('app');
if (!root) throw new Error('No #app element');

let stopCurrent: (() => void) | null = null;

function showMenu(): void {
  if (stopCurrent) {
    stopCurrent();
    stopCurrent = null;
  }
  renderMenu(root!, games, (game) => {
    if (stopCurrent) stopCurrent();
    stopCurrent = game.start(root!);
    const back = document.createElement('button');
    back.textContent = '← Back to menu';
    back.style.cssText = 'position: fixed; top: 12px; left: 12px; z-index: 100; padding: 8px 12px; cursor: pointer;';
    back.addEventListener('click', () => {
      back.remove();
      showMenu();
    });
    root!.appendChild(back);
  });
}

showMenu();
