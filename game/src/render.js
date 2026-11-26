// The chase view: sky, sun, sea, islands, strips, rings and the Kestrel
// herself, all drawn on one 2D canvas with a small perspective projection.
// The camera sits just behind and above the plane; the world is rotated
// by the bank, the horizon slides with the pitch, and everything the
// pilot sees is a real projection of the archipelago — nothing is a
// painted backdrop.

import { PALETTE } from './config.js';
import { HOME_RUNWAY } from './islands.js';

const DEG = Math.PI / 180;
const FOCAL = 950;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1280;
  let H = 720;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(640, Math.floor(rect.width));
    H = Math.max(360, Math.floor(rect.height));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(cam, point) {
    const dx = point.x - cam.x;
    const dy = point.y - cam.y;
    const dz = point.z - cam.z;
    const dF = dx * cam.fx + dz * cam.fz;
    if (dF < 8) return null;
    const dR = dx * cam.rx + dz * cam.rz;
    const scale = FOCAL / dF;
    return { x: cam.cx + dR * scale, y: cam.horizon - dy * scale, s: scale, d: dF };
  }

  function cameraFor(flight) {
    const h = flight.heading * DEG;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const rx = Math.cos(h);
    const rz = -Math.sin(h);
    const cx = W / 2;
    const cy = H * 0.52;
    return {
      x: flight.x - fx * 16,
      y: flight.y + 5,
      z: flight.z - fz * 16,
      fx, fz, rx, rz, cx, cy,
      horizon: cy - flight.pitch * 7,
    };
  }

  function drawSky(cam, time) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.42, PALETTE.skyMid);
    g.addColorStop(0.58, PALETTE.skyLow);
    g.addColorStop(0.6, PALETTE.seaShallow);
    g.addColorStop(1, PALETTE.seaDeep);
    ctx.fillStyle = g;
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }

  function drawSun(cam, time) {
    // Low sun, fixed to the west so the light never jumps around. Drawn
    // after the ridges so its disc is never hidden behind a mountain.
    const sunBearing = 252;
    const rel = ((sunBearing - camHeading(cam) + 540) % 360) - 180;
    if (Math.abs(rel) < 80) {
      const sx = W / 2 + (rel / 80) * (W * 0.62);
      const sy = cam.horizon - 70;
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 190);
      glow.addColorStop(0, PALETTE.sunCore);
      glow.addColorStop(0.25, PALETTE.sun);
      glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, 190, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.sunCore;
      ctx.beginPath();
      ctx.arc(sx, sy, 26, 0, Math.PI * 2);
      ctx.fill();
      // Glitter path on the water under the sun.
      ctx.fillStyle = 'rgba(255, 233, 168, 0.5)';
      for (let i = 0; i < 26; i += 1) {
        const wob = Math.sin(time * 1.3 + i * 2.7) * 14;
        const yy = cam.horizon + 26 + i * 13;
        const ww = 8 + i * 4;
        ctx.fillRect(sx - ww / 2 + wob, yy, ww, 2.5);
      }
    }
  }

  function camHeading(cam) {
    return (Math.atan2(cam.fx, cam.fz) / DEG + 360) % 360;
  }

  function drawRidges(cam) {
    // Two far mountain layers, drawn from the heading so the skyline
    // turns with the pilot instead of sliding like wallpaper.
    for (let layer = 0; layer < 2; layer += 1) {
      const base = layer === 0 ? 20 : 42;
      const amp = layer === 0 ? 28 : 44;
      const k = layer === 0 ? 0.011 : 0.006;
      const phase = camHeading(cam) * 0.05 + layer * 2.1;
      ctx.fillStyle = layer === 0 ? 'rgba(46, 74, 102, 0.55)' : 'rgba(38, 60, 88, 0.8)';
      ctx.beginPath();
      ctx.moveTo(-W, cam.horizon + 2);
      for (let x = -W; x <= W * 2; x += 24) {
        const a = x * k + phase;
        const y = cam.horizon + 2 - base - Math.abs(Math.sin(a) * amp + Math.sin(a * 2.7) * amp * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W * 2, cam.horizon + 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSea(cam, time) {
    ctx.fillStyle = PALETTE.seaDeep;
    ctx.fillRect(-W, cam.horizon, W * 3, H * 3);
    const g = ctx.createLinearGradient(0, cam.horizon, 0, H);
    g.addColorStop(0, PALETTE.seaShallow);
    g.addColorStop(1, PALETTE.seaDeep);
    ctx.fillStyle = g;
    ctx.fillRect(-W, cam.horizon, W * 3, H * 3);
    // Swell lines: long strokes across the water, drifting with time.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 22; i += 1) {
      const yy = cam.horizon + 18 + ((i * 53 + time * 12) % (H - cam.horizon - 20));
      const fade = (yy - cam.horizon) / H;
      ctx.globalAlpha = 0.06 + fade * 0.16;
      ctx.beginPath();
      ctx.moveTo(-W + ((i * 173) % 400), yy);
      ctx.lineTo(W + ((i * 173) % 400) - 260, yy + 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(cam, clouds, time) {
    for (const cloud of clouds) {
      const cx = cloud.x + time * cloud.drift;
      const p = project(cam, { x: cx, y: cloud.y, z: cloud.z });
      if (!p || p.d > 9000) continue;
      const s = cloud.s * p.s * 0.45;
      if (s < 4) continue;
      ctx.fillStyle = 'rgba(255, 244, 224, 0.92)';
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.ellipse(p.x + i * s * 0.55, p.y - Math.abs(i) * s * 0.12, s * 0.62, s * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(232, 165, 107, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + s * 0.22, s * 1.15, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawIsland(cam, island, time) {
    const p = project(cam, { x: island.x, y: 0, z: island.z });
    if (!p || p.d > 9500) return;
    const r = island.r * p.s;
    if (r < 2) return;
    const top = project(cam, { x: island.x, y: island.h, z: island.z });
    const lift = top ? p.y - top.y : island.h * p.s;
    // Sand ring, then grass, then the peak: three stacked ellipses.
    ctx.fillStyle = PALETTE.sand;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.grass;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - lift * 0.25, r * 0.86, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.forest;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - lift * 0.55, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rocky peak for the tall islands, at the island's real peak: a
    // steep two-tone cone, never a wide flat slab on the grass.
    if (island.h > 70 && lift > 20) {
      const apex = project(cam, { x: island.x + island.peakDx, y: island.h, z: island.z + island.peakDz });
      const apexY = apex ? apex.y : p.y - lift * 1.05;
      const apexX = apex ? apex.x : p.x;
      const baseY = p.y - lift * 0.55;
      const half = r * 0.16;
      ctx.fillStyle = '#a89a85';
      ctx.beginPath();
      ctx.moveTo(p.x - half, baseY);
      ctx.lineTo(apexX, apexY);
      ctx.lineTo(p.x, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.rock;
      ctx.beginPath();
      ctx.moveTo(p.x, baseY);
      ctx.lineTo(apexX, apexY);
      ctx.lineTo(p.x + half, baseY);
      ctx.closePath();
      ctx.fill();
    }
    // Palms: little dots with a shadow, only when big enough to see.
    if (r > 26) {
      ctx.fillStyle = '#2c4f26';
      for (const palm of island.palms) {
        const pp = project(cam, { x: island.x + palm.dx, y: island.h * 0.4, z: island.z + palm.dz });
        if (!pp) continue;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, Math.max(1.2, 1.8 * palm.s * p.s), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Harbour town: white walls, terracotta roofs.
    if (island.town && r > 40) {
      for (const house of island.houses) {
        const hp = project(cam, { x: island.x + house.dx, y: island.h * 0.45, z: island.z + house.dz });
        if (!hp) continue;
        const hw = Math.max(3, house.w * p.s * 0.5);
        ctx.fillStyle = PALETTE.townWall;
        ctx.fillRect(hp.x - hw / 2, hp.y - hw * 0.5, hw, hw * 0.5);
        ctx.fillStyle = PALETTE.townRoof;
        ctx.beginPath();
        ctx.moveTo(hp.x - hw / 2, hp.y - hw * 0.5);
        ctx.lineTo(hp.x, hp.y - hw * 0.95);
        ctx.lineTo(hp.x + hw / 2, hp.y - hw * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Lighthouse: a white tower with red bands and a slow sweeping beam,
    // drawn solid only when it is near enough to read as a building.
    if (island.lighthouse && r > 30) {
      const lp = project(cam, { x: island.x + island.r * 0.55, y: island.h * 0.5, z: island.z - island.r * 0.3 });
      if (lp && p.s > 0.9) {
        const lh = Math.max(10, 30 * p.s);
        const lw = Math.max(5, 7 * p.s);
        ctx.fillStyle = '#f2efe4';
        ctx.fillRect(lp.x - lw / 2, lp.y - lh, lw, lh);
        ctx.fillStyle = PALETTE.planeTrim;
        ctx.fillRect(lp.x - lw / 2, lp.y - lh * 0.66, lw, lh * 0.14);
        ctx.fillRect(lp.x - lw / 2, lp.y - lh * 0.3, lw, lh * 0.14);
        const beam = (time * 0.6) % (Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 243, 196, 0.16)';
        ctx.beginPath();
        ctx.moveTo(lp.x, lp.y - lh);
        ctx.lineTo(lp.x + Math.cos(beam) * 160, lp.y - lh + Math.sin(beam) * 30);
        ctx.lineTo(lp.x + Math.cos(beam) * 160, lp.y - lh + Math.sin(beam) * 30 + 18);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function stripCorners(strip) {
    const h = strip.heading * DEG;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const px = Math.cos(h);
    const pz = -Math.sin(h);
    const hl = strip.length / 2;
    const hw = strip.width / 2;
    const y = strip.elevation;
    return [
      { x: strip.x - fx * hl - px * hw, y, z: strip.z - fz * hl - pz * hw },
      { x: strip.x + fx * hl - px * hw, y, z: strip.z + fz * hl - pz * hw },
      { x: strip.x + fx * hl + px * hw, y, z: strip.z + fz * hl + pz * hw },
      { x: strip.x - fx * hl + px * hw, y, z: strip.z - fz * hl + pz * hw },
    ];
  }

  function drawStrip(cam, strip, label) {
    // A strip 2.6 km away is a sliver; drawing its dashes and label
    // across whatever island is in front of it only confuses the pilot.
    const mid0 = project(cam, { x: strip.x, y: strip.elevation, z: strip.z });
    if (!mid0 || mid0.d > 2600) return;
    const corners = stripCorners(strip).map((c) => project(cam, c));
    if (corners.some((c) => !c)) return;
    ctx.fillStyle = PALETTE.runway;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();
    // Centreline dashes, projected point by point so they follow the strip.
    ctx.fillStyle = PALETTE.runwayLine;
    ctx.strokeStyle = PALETTE.runwayLine;
    const h = strip.heading * DEG;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    for (let d = -strip.length / 2 + 30; d < strip.length / 2 - 20; d += 60) {
      const a = project(cam, { x: strip.x + fx * d, y: strip.elevation + 0.4, z: strip.z + fz * d });
      const b = project(cam, { x: strip.x + fx * (d + 28), y: strip.elevation + 0.4, z: strip.z + fz * (d + 28) });
      if (!a || !b) continue;
      ctx.lineWidth = Math.max(1, 1.4 * a.s);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    if (label) {
      const mid = project(cam, { x: strip.x, y: strip.elevation + 4, z: strip.z });
      if (mid && mid.d < 1800) {
        ctx.fillStyle = 'rgba(242, 239, 228, 0.95)';
        ctx.font = `600 ${Math.max(11, Math.min(15, 90 * mid.s))}px ${'system-ui, sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.fillText(label, mid.x, mid.y - 14);
      }
    }
  }

  function drawRing(cam, ring, kind, time) {
    // The ring hangs in a vertical plane facing the pilot's approach:
    // its normal points from the previous ring toward this one.
    const prev = ring.index === 0 ? { x: -2600, z: -3300 } : null;
    void prev;
    const c = project(cam, ring);
    if (!c || c.d > 9000) return;
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const a = (i / 24) * Math.PI * 2;
      // Circle in the plane facing the camera: offset right and up.
      const px = ring.x + Math.cos(a) * 20 * cam.rx + Math.sin(a) * 0;
      const pz = ring.z + Math.cos(a) * 20 * cam.rz;
      const py = ring.y + Math.sin(a) * 20;
      const p = project(cam, { x: px, y: py, z: pz });
      if (p) pts.push(p);
    }
    if (pts.length < 8) return;
    const colour = kind === 'next' ? PALETTE.ringNext : kind === 'done' ? PALETTE.ringDone : PALETTE.ringFar;
    // A stroked ring, so the world shows through its middle: the pilot
    // flies through it, not at a painted disc.
    ctx.globalAlpha = kind === 'next' ? 0.95 : 0.55;
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(4, 3.0 * c.s);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (kind === 'next') {
      const pulse = 1 + Math.sin(time * 4) * 0.06;
      ctx.strokeStyle = 'rgba(255, 201, 60, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 26 * pulse + c.s * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.ringNext;
      ctx.font = `700 13px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(10, 16, 26, 0.9)';
      ctx.shadowBlur = 6;
      ctx.fillText(`RING ${ring.index + 1} — ${Math.round(c.d)} m`, c.x, c.y - 58 - c.s * 4);
      ctx.shadowBlur = 0;
    }
  }

  function drawRescueBuoy(cam, rescue, time) {
    const p = project(cam, { x: rescue.x, y: 2, z: rescue.z });
    if (!p || p.d > 6000) return;
    const bob = Math.sin(time * 2) * 2;
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + bob, Math.max(3, 2.4 * p.s), Math.max(2, 1.1 * p.s), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2efe4';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 1.6 * p.s + bob, Math.max(1.6, 0.9 * p.s), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAircraft(flight) {
    // Chase view from behind and slightly above: tail, fuselage, wings.
    const cx = W / 2;
    const cy = H * 0.62;
    const s = Math.min(W, H) / 720;
    const bob = Math.sin(performance.now() / 480) * 1.5;
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(flight.bank * DEG * 0.9);
    ctx.scale(s, s);
    // Wings: wide, slight dihedral, red tips.
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-150, 6);
    ctx.lineTo(-34, -14);
    ctx.lineTo(34, -14);
    ctx.lineTo(150, 6);
    ctx.lineTo(138, 16);
    ctx.lineTo(-138, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.fillRect(-150, 6, 16, 8);
    ctx.fillRect(134, 6, 16, 8);
    // Nav lights.
    ctx.fillStyle = '#ff5a4e';
    ctx.beginPath();
    ctx.arc(-146, 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5eff8a';
    ctx.beginPath();
    ctx.arc(146, 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Fuselage: tapering toward the nose (up the screen, away from us).
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-26, 34);
    ctx.lineTo(-20, -58);
    ctx.quadraticCurveTo(0, -78, 20, -58);
    ctx.lineTo(26, 34);
    ctx.quadraticCurveTo(0, 44, -26, 34);
    ctx.closePath();
    ctx.fill();
    // Red cheatline down the fuselage.
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.fillRect(-24, 8, 48, 5);
    // Cabin windows and the pilot's headrest, seen from behind.
    ctx.fillStyle = PALETTE.planeGlass;
    ctx.beginPath();
    ctx.ellipse(0, -30, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2f36';
    ctx.beginPath();
    ctx.ellipse(0, -8, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tailplane and fin.
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-44, 26);
    ctx.lineTo(-12, 18);
    ctx.lineTo(12, 18);
    ctx.lineTo(44, 26);
    ctx.lineTo(38, 34);
    ctx.lineTo(-38, 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.beginPath();
    ctx.moveTo(-7, 36);
    ctx.lineTo(-4, -2);
    ctx.lineTo(4, -2);
    ctx.lineTo(7, 36);
    ctx.closePath();
    ctx.fill();
    // Registration on the rear fuselage.
    ctx.fillStyle = '#3a3f46';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N7-KC', 0, 28);
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10, 16, 26, 0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /**
   * Paint one frame. `view` carries the flight, mission, archipelago and
   * clock; `mode` is 'title' | 'play' | 'paused' | 'over' for the overlays
   * the main loop wants on top of the world.
   */
  function draw(view) {
    const { flight, mission, archipelago, time } = view;
    resize();
    const cam = cameraFor(flight);
    ctx.save();
    // The whole world rolls with the bank around the centre of the screen.
    ctx.translate(W / 2, H * 0.52);
    ctx.rotate(-flight.bank * DEG);
    ctx.translate(-W / 2, -H * 0.52);
    drawSky(cam, time);
    drawRidges(cam);
    drawSun(cam, time);
    drawSea(cam, time);
    drawClouds(cam, archipelago.clouds, time);
    const sorted = [...archipelago.islands].sort((a, b) => {
      const da = (a.x - flight.x) ** 2 + (a.z - flight.z) ** 2;
      const db = (b.x - flight.x) ** 2 + (b.z - flight.z) ** 2;
      return db - da;
    });
    for (const island of sorted) drawIsland(cam, island, time);
    drawStrip(cam, { ...HOME_RUNWAY, elevation: 6 }, 'KESTREL HOME');
    for (const strip of archipelago.strips) drawStrip(cam, strip, strip.island.toUpperCase());
    for (const ring of archipelago.rings) {
      const kind = mission.state.kind === 'rings'
        ? ring.index < mission.state.ringIndex ? 'done' : ring.index === mission.state.ringIndex ? 'next' : 'far'
        : 'far';
      drawRing(cam, ring, kind, time);
    }
    if (mission.state.kind === 'rescue' && !mission.state.pickedUp) {
      drawRescueBuoy(cam, archipelago.rescue, time);
    }
    ctx.restore();
    drawAircraft(flight);
    drawVignette();
  }

  return { draw, resize, get width() { return W; }, get height() { return H; } };
}
