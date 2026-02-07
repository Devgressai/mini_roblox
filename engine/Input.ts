/**
 * Input - keyboard and mouse state for the game engine.
 */

export type KeyMap = Record<string, boolean>;

const keys: KeyMap = {};
const keysJustPressed: KeyMap = {};
const keysJustReleased: KeyMap = {};

let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let mouseJustPressed = false;
let mouseJustReleased = false;

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    if (!keys[e.code]) keysJustPressed[e.code] = true;
    keys[e.code] = true;
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keysJustReleased[e.code] = true;
    keys[e.code] = false;
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  window.addEventListener('mousedown', () => {
    if (!mouseDown) mouseJustPressed = true;
    mouseDown = true;
  });
  window.addEventListener('mouseup', () => {
    mouseJustReleased = true;
    mouseDown = false;
  });
}

export function endInputFrame(): void {
  for (const k of Object.keys(keysJustPressed)) delete keysJustPressed[k];
  for (const k of Object.keys(keysJustReleased)) delete keysJustReleased[k];
  mouseJustPressed = false;
  mouseJustReleased = false;
}

export function isKeyDown(code: string): boolean {
  return !!keys[code];
}

export function isKeyJustPressed(code: string): boolean {
  return !!keysJustPressed[code];
}

export function isKeyJustReleased(code: string): boolean {
  return !!keysJustReleased[code];
}

export function getMouse(): { x: number; y: number; down: boolean; justPressed: boolean; justReleased: boolean } {
  return { x: mouseX, y: mouseY, down: mouseDown, justPressed: mouseJustPressed, justReleased: mouseJustReleased };
}
