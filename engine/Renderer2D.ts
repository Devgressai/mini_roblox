/**
 * Renderer2D - camera and canvas drawing for 2D games (world coords → screen).
 */

export interface Camera2D {
  centerX: number;
  centerY: number;
  pixelsPerUnit: number;
  width: number;
  height: number;
}

export function createCamera(
  width: number,
  height: number,
  pixelsPerUnit: number = 32
): Camera2D {
  return {
    centerX: 0,
    centerY: 0,
    pixelsPerUnit,
    width,
    height,
  };
}

export function worldToScreen(
  cam: Camera2D,
  wx: number,
  wy: number,
  yUp: boolean = true
): { sx: number; sy: number } {
  const sx = cam.width / 2 + (wx - cam.centerX) * cam.pixelsPerUnit;
  const sy = cam.height / 2 - (wy - cam.centerY) * cam.pixelsPerUnit * (yUp ? 1 : -1);
  return { sx, sy };
}

export function drawRect(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  wx: number,
  wy: number,
  w: number,
  h: number,
  style: { fill?: string; stroke?: string; strokeWidth?: number },
  yUp: boolean = true
): void {
  const topLeft = worldToScreen(cam, wx, yUp ? wy + h : wy, yUp);
  const size = { w: w * cam.pixelsPerUnit, h: h * cam.pixelsPerUnit };
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fillRect(topLeft.sx, topLeft.sy, size.w, size.h);
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth ?? 2;
    ctx.strokeRect(topLeft.sx, topLeft.sy, size.w, size.h);
  }
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  wx: number,
  wy: number,
  radius: number,
  style: { fill?: string; stroke?: string; strokeWidth?: number },
  yUp: boolean = true
): void {
  const c = worldToScreen(cam, wx, wy, yUp);
  const r = radius * cam.pixelsPerUnit;
  ctx.beginPath();
  ctx.arc(c.sx, c.sy, r, 0, Math.PI * 2);
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth ?? 2;
    ctx.stroke();
  }
}

export function drawPlayerSideView(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  wx: number,
  wy: number,
  width: number,
  height: number,
  facingRight: boolean
): void {
  const { sx, sy } = worldToScreen(cam, wx, wy, true);
  const w = width * cam.pixelsPerUnit;
  const h = height * cam.pixelsPerUnit;
  const x = sx - w / 2;
  const y = sy - h;

  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2;
  ctx.stroke();

  const headSize = Math.min(w, h) * 0.4;
  const headX = facingRight ? x + w - headSize / 2 : x + headSize / 2;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(headX, y, headSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.stroke();
}

/**
 * Draw rocket with fire exhaust. thrusting = true when boosting (flame larger).
 */
export function drawRocketSideView(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  wx: number,
  wy: number,
  width: number,
  height: number,
  facingRight: boolean,
  thrusting: boolean,
  gameTime: number
): void {
  const { sx, sy } = worldToScreen(cam, wx, wy, true);
  const w = width * cam.pixelsPerUnit;
  const h = height * cam.pixelsPerUnit;
  const x = sx - w / 2;
  const y = sy - h;
  const dir = facingRight ? 1 : -1;

  const noseH = h * 0.35;
  const bodyH = h * 0.5;
  const finH = h * 0.15;

  ctx.save();
  if (!facingRight) {
    ctx.translate(sx, sy);
    ctx.scale(-1, 1);
    ctx.translate(-sx, -sy);
  }

  const l = x;
  const r = x + w;
  const midX = (l + r) / 2;

  ctx.fillStyle = '#94a3b8';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(midX, y + h);
  ctx.lineTo(midX - w * 0.35, y + h - finH);
  ctx.lineTo(midX - w * 0.25, y + bodyH);
  ctx.lineTo(midX - w * 0.2, y + noseH);
  ctx.lineTo(midX, y);
  ctx.lineTo(midX + w * 0.2, y + noseH);
  ctx.lineTo(midX + w * 0.25, y + bodyH);
  ctx.lineTo(midX + w * 0.35, y + h - finH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f97316';
  ctx.strokeStyle = '#ea580c';
  ctx.beginPath();
  ctx.arc(midX, y + noseH * 0.6, w * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const flameLen = thrusting ? h * (0.5 + 0.3 * Math.sin(gameTime * 25)) : h * (0.15 + 0.08 * Math.sin(gameTime * 20));
  const flameW = thrusting ? w * 0.5 : w * 0.3;
  const flicker = 1 + 0.15 * Math.sin(gameTime * 30);
  ctx.fillStyle = `rgba(251, 191, 36, ${0.9 * flicker})`;
  ctx.beginPath();
  ctx.moveTo(midX - flameW * 0.5, y + h);
  ctx.lineTo(midX, y + h + flameLen * (0.6 + 0.2 * Math.sin(gameTime * 22)));
  ctx.lineTo(midX + flameW * 0.5, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(239, 68, 68, ${0.7 * flicker})`;
  ctx.beginPath();
  ctx.moveTo(midX - flameW * 0.35, y + h);
  ctx.lineTo(midX, y + h + flameLen * 0.5);
  ctx.lineTo(midX + flameW * 0.35, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawPlayerTopDown(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  wx: number,
  wy: number,
  radius: number
): void {
  drawCircle(ctx, cam, wx, wy, radius, {
    fill: '#22c55e',
    stroke: '#16a34a',
    strokeWidth: 2,
  }, false);
  const c = worldToScreen(cam, wx, wy, false);
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(c.sx, c.sy, radius * cam.pixelsPerUnit * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  wx: number,
  wy: number,
  radius: number,
  t: number,
  yUp: boolean = false
): void {
  const c = worldToScreen(cam, wx, wy, yUp);
  const r = radius * cam.pixelsPerUnit;
  const bounce = Math.sin(t * 4) * 2;
  const y = c.sy + bounce;

  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.sx, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b45309';
  ctx.font = `${Math.round(r)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', c.sx, y);
}
