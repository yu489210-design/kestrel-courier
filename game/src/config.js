// Every tuning number and colour for Kestrel Courier in one place.
// The world is metres, altitude is metres, speeds are m/s internally;
// the HUD converts to feet and knots for display. The play area is a
// 12000 x 12000 m archipelago; the renderer works in a 1280x720 logical
// frame and scales it to the window, so no rule depends on screen size.

export const STEP = 1 / 60;

/** The seed that stages every screenshot and the default flight. */
export const DEFAULT_SEED = 20261126;

export const WORLD = { size: 12000, half: 6000, seaLevel: 0 };

export const PLANE = {
  /** Stall speed; below it the nose drops and the wing buffets. */
  stallSpeed: 32,
  /** Cruise at full throttle, m/s (~155 kt). */
  maxSpeed: 80,
  /** Speed at idle, m/s (~55 kt). */
  minSpeed: 28,
  /** How fast speed chases the throttle target. */
  accel: 9,
  /** Pitch authority, degrees per second of input. */
  pitchRate: 26,
  maxPitchUp: 20,
  maxPitchDown: -16,
  /** Bank authority, degrees per second of input. */
  bankRate: 70,
  maxBank: 48,
  /** Climb comes from pitch and speed, not from a magic lift number. */
  climbFactor: 0.9,
  /** Fuel units (100 = full tank) burned per second. */
  fuelBurnIdle: 0.22,
  fuelBurnFull: 0.95,
  /** Damage taken from one hard touchdown. */
  hardLandingDamage: 42,
  /** Vertical speed (m/s) a touchdown may have before it is hard. */
  softTouchdown: 3.5,
};

export const RING = {
  count: 8,
  radius: 20,
  /** Points for flying cleanly through the next ring. */
  points: 250,
  /** Seconds added to the clock per ring. */
  timeBonus: 12,
};

export const MISSIONS = {
  rings: { name: 'RING RUN', timeLimit: 300, points: 0 },
  courier: { name: 'ISLAND COURIER', timeLimit: 600, points: 0 },
  rescue: { name: 'REEF RESCUE', timeLimit: 420, points: 0 },
};

export const SCORE = {
  ring: 250,
  delivery: 500,
  rescuePickup: 400,
  landing: 300,
  /** Points per second left on the clock when a mission ends. */
  timeLeft: 5,
};

export const PALETTE = {
  skyTop: '#2e5f8a',
  skyMid: '#e8a56b',
  skyLow: '#f7cf8e',
  sun: '#fff3c4',
  sunCore: '#fffbe8',
  seaDeep: '#14506b',
  seaShallow: '#3f9db0',
  seaGlitter: '#ffe9a8',
  sand: '#e8d29a',
  grass: '#5d8a4a',
  forest: '#3e6b34',
  rock: '#8a7d6b',
  townRoof: '#c65b3f',
  townWall: '#f2e6c8',
  runway: '#3a3f46',
  runwayLine: '#f5f2e4',
  ringNext: '#ffc93c',
  ringDone: '#7dd87d',
  ringFar: '#dfe8ee',
  planeBody: '#e8e2d2',
  planeTrim: '#c6452f',
  planeGlass: '#20344a',
  panel: '#1d2126',
  panelEdge: '#3a3f46',
  instrumentFace: '#10151a',
  amber: '#ffb347',
  green: '#7dd87d',
  red: '#ff6b5e',
  text: '#f2efe4',
  muted: '#b9c2c9',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'kestrel-courier.best';
