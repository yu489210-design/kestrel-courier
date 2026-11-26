// The flight model: an arcade plane that still rewards throttle and turn
// discipline. Speed chases the throttle, pitch trades speed for height,
// bank turns the nose, and below stall speed the wing gives up. Fuel and
// damage turn every sortie into decisions; a landing only counts when it
// is slow, low, lined up and on a strip.

import { PLANE, STEP } from './config.js';
import { HOME_RUNWAY } from './islands.js';

const DEG = Math.PI / 180;

export function createFlight(archipelago) {
  const state = {
    x: -2880, z: -2600, y: 6,
    heading: 90, pitch: 0, bank: 0,
    speed: 0, throttle: 0,
    fuel: 100, damage: 0,
    verticalSpeed: 0,
    onGround: true, crashed: false, landed: false,
    stalled: false, warning: '',
  };

  function reset() {
    state.x = -2880; state.z = -2600; state.y = 6;
    state.heading = 90; state.pitch = 0; state.bank = 0;
    state.speed = 0; state.throttle = 0;
    state.fuel = 100; state.damage = 0;
    state.verticalSpeed = 0;
    state.onGround = true; state.crashed = false; state.landed = false;
    state.stalled = false; state.warning = '';
  }

  /** Distance in metres from a point to the centre line of a strip. */
  function stripOffset(strip, x, z) {
    const h = strip.heading * DEG;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const dx = x - strip.x;
    const dz = z - strip.z;
    const along = dx * fx + dz * fz;
    const across = dx * fz - dz * fx;
    return { along, across };
  }

  /** Every strip the plane can land on: home plus the three courier strips. */
  function allStrips() {
    return [
      { ...HOME_RUNWAY, isHome: true },
      ...archipelago.strips.map((s) => ({ ...s, isHome: false })),
    ];
  }

  /** The strip under the plane right now, if this is a good landing. */
  function checkLanding() {
    if (state.y > 12 || state.verticalSpeed < -PLANE.softTouchdown - 1.5) return null;
    for (const strip of allStrips()) {
      const { along, across } = stripOffset(strip, state.x, state.z);
      if (Math.abs(along) > strip.length / 2 || Math.abs(across) > strip.width / 2 + 6) continue;
      let dh = Math.abs(((state.heading - strip.heading + 540) % 360) - 180);
      if (dh > 90) dh = 180 - dh;
      if (dh > 18) continue;
      if (state.speed > 52) continue;
      return strip;
    }
    return null;
  }

  /**
   * One fixed step. `control` is { pitch: -1..1, bank: -1..1, throttle: 0..1 }
   * from the keyboard or the mouse, already smoothed by input.js.
   */
  function step(control, dt = STEP) {
    if (state.crashed) return state;
    state.warning = '';

    if (state.fuel <= 0) state.throttle = 0;
    else state.throttle = control.throttle;

    // Speed chases the throttle target; a heavy bank bleeds a little speed.
    const target = PLANE.minSpeed + state.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    const bleed = Math.abs(state.bank) > 30 ? 2.5 : 0;
    const rate = state.speed < target ? PLANE.accel : PLANE.accel * 1.4;
    state.speed += Math.max(-rate * dt, Math.min(rate * dt, target - bleed - state.speed));

    // Stall: below stall speed the nose drops no matter what the pilot does.
    state.stalled = state.speed < PLANE.stallSpeed && !state.onGround;
    const pitchInput = state.stalled ? -1 : control.pitch;
    const pitchTarget = pitchInput * (pitchInput > 0 ? PLANE.maxPitchUp : -PLANE.maxPitchDown);
    state.pitch += (pitchTarget - state.pitch) * Math.min(1, dt * 2.2);
    if (state.stalled) state.warning = 'STALL — NOSE DOWN, ADD POWER';

    const bankTarget = control.bank * PLANE.maxBank;
    state.bank += (bankTarget - state.bank) * Math.min(1, dt * 3.2);

    // Turn rate grows with bank and shrinks with speed: a tight slow turn.
    const turnRate = (9.81 * Math.tan(state.bank * DEG)) / Math.max(state.speed, 12);
    state.heading = (state.heading + (turnRate / DEG) * dt + 360) % 360;

    // Climb and descent come from pitch times speed; gravity always pulls.
    const climb = Math.sin(state.pitch * DEG) * state.speed * PLANE.climbFactor;
    const sink = state.throttle < 0.15 && !state.onGround ? 2.2 : 0;
    state.verticalSpeed = climb - sink;

    if (state.onGround) {
      // Rolling: keep the plane on the strip until it has flying speed.
      if (state.speed > PLANE.stallSpeed * 0.85 && state.pitch > 2) {
        state.onGround = false;
      } else {
        state.verticalSpeed = 0;
      }
    }
    if (!state.onGround) state.y += state.verticalSpeed * dt;

    const h = state.heading * DEG;
    state.x += Math.sin(h) * state.speed * dt;
    state.z += Math.cos(h) * state.speed * dt;

    // Stay inside the charted archipelago; the sea beyond it turns you back.
    const edge = 5800;
    if (Math.abs(state.x) > edge || Math.abs(state.z) > edge) {
      state.heading = (state.heading + 180) % 360;
      state.x = Math.max(-edge, Math.min(edge, state.x));
      state.z = Math.max(-edge, Math.min(edge, state.z));
      state.warning = 'EDGE OF CHART — TURNING BACK';
    }

    // Fuel burns with throttle; an empty tank means a glide and a decision.
    if (!state.onGround || state.speed > 5) {
      state.fuel = Math.max(0, state.fuel - (PLANE.fuelBurnIdle + state.throttle * PLANE.fuelBurnFull) * dt);
      if (state.fuel <= 0) state.warning = 'FUEL EMPTY — GLIDING';
    }

    // Ground contact: a strip landing, a hard landing, or a crash. A plane
    // climbing away from the strip (vertical speed up) is leaving the
    // ground, not landing on it, so the block only runs while it sinks.
    const ground = archipelago.terrainHeight(state.x, state.z);
    if (!state.onGround && state.y <= ground + 2 && state.verticalSpeed < 1) {
      const strip = checkLanding();
      if (strip) {
        state.onGround = true;
        state.landed = true;
        state.y = strip.elevation;
        state.pitch = 0;
        state.bank = 0;
        if (state.verticalSpeed < -PLANE.softTouchdown) {
          state.damage = Math.min(100, state.damage + PLANE.hardLandingDamage);
          state.warning = 'HARD LANDING';
        }
      } else if (state.y <= ground + 0.5) {
        state.crashed = true;
        state.damage = 100;
        state.warning = ground > 2 ? 'CRASHED INTO TERRAIN' : 'DITCHED IN THE SEA';
      }
    }
    if (state.damage >= 100 && !state.crashed && !state.onGround) {
      state.crashed = true;
      state.warning = 'AIRCRAFT LOST';
    }
    return state;
  }

  return { state, reset, step, stripOffset, allStrips, checkLanding };
}
