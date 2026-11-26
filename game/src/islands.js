// The archipelago: where the islands sit, how high the ground is under any
// point, where the rings hang, and which strips a courier can land on.
// Everything is built from the seed, so the world never changes shape
// between runs with the same seed.

import { createRandom } from './random.js';

/** The home strip: heading 90 deg (east), flat, on the big home island. */
export const HOME_RUNWAY = {
  x: -2600, z: -2600, heading: 90, length: 620, width: 34, elevation: 6,
};

function buildIslands(random) {
  const islands = [
    // Home island: the big one with the runway and the little harbour town.
    // Its peak sits south of the strip, so both runway ends are clear air.
    { x: -2600, z: -2600, r: 950, h: 68, peakDx: 0, peakDz: 700, town: true, lighthouse: true, name: 'Kestrel Home' },
    { x: -900, z: -1800, r: 520, h: 54, peakDx: 0, peakDz: 0, town: false, lighthouse: false, name: 'Gull Rock' },
    { x: 600, z: -2400, r: 640, h: 88, peakDx: 322, peakDz: -270, town: true, lighthouse: false, name: 'Mara Bay' },
    { x: 2200, z: -1400, r: 430, h: 46, peakDx: 0, peakDz: 0, town: false, lighthouse: true, name: 'Lantern Point' },
    { x: -1800, z: -400, r: 700, h: 96, peakDx: 0, peakDz: 0, town: false, lighthouse: false, name: 'Twin Peaks' },
    { x: 200, z: 200, r: 560, h: 60, peakDx: -270, peakDz: -322, town: true, lighthouse: false, name: 'Coral Town' },
    { x: 2400, z: 600, r: 760, h: 110, peakDx: 0, peakDz: 0, town: false, lighthouse: false, name: 'High Ridge' },
    { x: -600, z: 2200, r: 480, h: 52, peakDx: 0, peakDz: 0, town: false, lighthouse: true, name: 'South Light' },
    { x: 1400, z: 2600, r: 620, h: 74, peakDx: 73, peakDz: -413, town: true, lighthouse: false, name: 'Palm Shore' },
    { x: -2800, z: 2400, r: 540, h: 58, peakDx: 0, peakDz: 0, town: false, lighthouse: false, name: 'West Reef' },
  ];
  // A scatter of palm clusters and houses per island, placed by the seed.
  for (const island of islands) {
    island.palms = [];
    const count = island.town ? 14 : 9;
    for (let i = 0; i < count; i += 1) {
      const a = random.range(0, Math.PI * 2);
      const d = random.range(island.r * 0.15, island.r * 0.8);
      island.palms.push({ dx: Math.cos(a) * d, dz: Math.sin(a) * d, s: random.range(0.7, 1.4) });
    }
    island.houses = [];
    if (island.town) {
      for (let i = 0; i < 10; i += 1) {
        const a = random.range(0, Math.PI * 2);
        const d = random.range(island.r * 0.2, island.r * 0.62);
        island.houses.push({ dx: Math.cos(a) * d, dz: Math.sin(a) * d, w: random.range(14, 26) });
      }
    }
  }
  return islands;
}

function buildRings() {
  // One golden-hour course: eight rings threading the islands, climbing
  // from the home strip out to High Ridge and back toward the reef.
  // Every ring hangs over open sea, never over an island's peak, so the
  // pilot always sees water below and the ring against the sky.
  const stops = [
    { x: -1500, z: -2900, y: 90 },
    { x: -300, z: -1500, y: 120 },
    { x: 1300, z: -2600, y: 150 },
    { x: 1600, z: -1600, y: 110 },
    { x: 2200, z: -400, y: 170 },
    { x: 1500, z: 900, y: 130 },
    { x: 3100, z: 1200, y: 200 },
    { x: 300, z: 1500, y: 140 },
  ];
  return stops.map((stop, i) => ({ ...stop, index: i }));
}

function buildStrips() {
  // The three courier strips: short grass strips on three far islands.
  return [
    { x: 600, z: -2400, heading: 40, length: 420, width: 26, elevation: 8, island: 'Mara Bay' },
    { x: 200, z: 200, heading: 130, length: 420, width: 26, elevation: 8, island: 'Coral Town' },
    { x: 1400, z: 2600, heading: 80, length: 460, width: 26, elevation: 8, island: 'Palm Shore' },
  ];
}

function buildClouds(random) {
  const clouds = [];
  for (let i = 0; i < 16; i += 1) {
    clouds.push({
      x: random.range(-5500, 5500),
      z: random.range(-5500, 5500),
      y: random.range(320, 520),
      s: random.range(90, 260),
      drift: random.range(2, 6),
    });
  }
  return clouds;
}

export function createArchipelago(seed) {
  const random = createRandom(seed);
  const islands = buildIslands(random);
  const rings = buildRings();
  const strips = buildStrips();
  const clouds = buildClouds(random);
  const rescue = { x: -2800, z: 2400, y: 30, island: 'West Reef' };

  /** Ground height in metres at a world point; 0 is the sea. */
  function terrainHeight(x, z) {
    let height = 0;
    for (const island of islands) {
      // The bump is centred on the island's peak, which sits off to one
      // side on strip islands so the runway axis stays clear air.
      const dx = x - (island.x + island.peakDx);
      const dz = z - (island.z + island.peakDz);
      const d = Math.sqrt(dx * dx + dz * dz) / island.r;
      if (d < 1.6) {
        const bump = Math.exp(-d * d * 2.2);
        // A flattened top near the middle, so strips sit on level ground.
        const flat = d < 0.45 ? 1 : 1 - (d - 0.45) * 0.55;
        height = Math.max(height, island.h * bump * Math.max(flat, 0.55));
      }
    }
    // Strips are graded flat: the ground falls to the strip's elevation
    // near it, so a plane on a strip never sits inside its own island.
    for (const strip of [HOME_RUNWAY, ...strips]) {
      const h = (strip.heading * Math.PI) / 180;
      const fx = Math.sin(h);
      const fz = Math.cos(h);
      const dx = x - strip.x;
      const dz = z - strip.z;
      const along = dx * fx + dz * fz;
      const across = dx * fz - dz * fx;
      const outside = Math.hypot(
        Math.max(Math.abs(along) - strip.length / 2, 0),
        Math.max(Math.abs(across) - strip.width / 2, 0),
      );
      if (outside < 140) {
        const t = Math.min(1, outside / 140);
        const flat = strip.elevation + (height - strip.elevation) * t * t * (3 - 2 * t);
        height = Math.min(height, flat);
      }
    }
    return height;
  }

  /** True when a point is over dry land (not sea). */
  function isLand(x, z) {
    return terrainHeight(x, z) > 2;
  }

  return { islands, rings, strips, clouds, rescue, terrainHeight, isLand };
}
