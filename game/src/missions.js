// The three missions: same plane, same islands, three different jobs.
// Each one tracks its own objective, score and clock, and reports events
// (ring, delivery, pickup, landed, done) for the renderer to announce.

import { MISSIONS, RING, SCORE } from './config.js';

export function createMissions(archipelago) {
  const state = {
    kind: 'rings',
    name: MISSIONS.rings.name,
    timeLeft: MISSIONS.rings.timeLimit,
    score: 0,
    done: false,
    failed: false,
    ringIndex: 0,
    deliveries: 0,
    pickedUp: false,
    rescued: false,
    /** The strip the courier is flying to right now (index into strips). */
    targetStrip: 0,
    /** Text the HUD shows as the current objective. */
    objective: 'Fly through ring 1 of 8',
    /** A short-lived banner event: { text, until } in mission seconds. */
    banner: null,
    elapsed: 0,
  };

  function showBanner(text, seconds = 2.5) {
    state.banner = { text, until: state.elapsed + seconds };
  }

  function start(kind) {
    state.kind = kind;
    state.name = MISSIONS[kind].name;
    state.timeLeft = MISSIONS[kind].timeLimit;
    state.score = 0;
    state.done = false;
    state.failed = false;
    state.ringIndex = 0;
    state.deliveries = 0;
    state.pickedUp = false;
    state.rescued = false;
    state.targetStrip = 0;
    state.elapsed = 0;
    if (kind === 'rings') state.objective = 'Fly through ring 1 of 8';
    if (kind === 'courier') state.objective = 'Pick up the parcel — take off from Kestrel Home';
    if (kind === 'rescue') state.objective = 'Reach the reef — slow below 120 kt under 500 ft to winch';
    state.banner = null;
  }

  /** The ring the pilot is aiming for, or null when the course is done. */
  function nextRing() {
    return state.ringIndex < archipelago.rings.length ? archipelago.rings[state.ringIndex] : null;
  }

  /** The strip the courier is flying to, or null when all parcels are in. */
  function nextStrip() {
    if (state.kind !== 'courier') return null;
    if (state.deliveries >= archipelago.strips.length) return null;
    return archipelago.strips[state.deliveries];
  }

  function ringPassed() {
    if (state.kind !== 'rings') return;
    state.score += SCORE.ring;
    state.timeLeft += RING.timeBonus;
    state.ringIndex += 1;
    if (state.ringIndex >= archipelago.rings.length) {
      state.done = true;
      state.score += Math.round(state.timeLeft) * SCORE.timeLeft;
      state.objective = 'Course clear — fly home and land for the bonus';
      showBanner('COURSE CLEAR!', 3);
    } else {
      state.objective = `Fly through ring ${state.ringIndex + 1} of ${archipelago.rings.length}`;
      showBanner(`RING ${state.ringIndex} OF ${archipelago.rings.length}  +${SCORE.ring}`);
    }
  }

  function delivered(strip) {
    if (state.kind !== 'courier') return;
    state.deliveries += 1;
    state.score += SCORE.delivery;
    if (state.deliveries >= archipelago.strips.length) {
      state.done = true;
      state.score += Math.round(state.timeLeft) * SCORE.timeLeft;
      state.objective = 'All parcels delivered — mission complete';
      showBanner(`ALL DELIVERED  +${SCORE.delivery}`, 3);
    } else {
      const next = archipelago.strips[state.deliveries];
      state.objective = `Parcel ${state.deliveries + 1} of 3 — deliver to ${next.island}`;
      showBanner(`DELIVERED AT ${strip.island.toUpperCase()}  +${SCORE.delivery}`, 3);
    }
  }

  function pickedUp() {
    if (state.kind !== 'rescue' || state.pickedUp) return;
    state.pickedUp = true;
    state.score += SCORE.rescuePickup;
    state.objective = 'Sailor aboard — fly home and land at Kestrel Home';
    showBanner(`SAILOR ABOARD  +${SCORE.rescuePickup}`, 3);
  }

  function landedHome() {
    if (state.kind === 'rescue' && state.pickedUp && !state.rescued) {
      state.rescued = true;
      state.done = true;
      state.score += SCORE.landing + Math.round(state.timeLeft) * SCORE.timeLeft;
      state.objective = 'Rescue complete — sailor safe ashore';
      showBanner('RESCUE COMPLETE', 3);
    } else if (state.kind === 'rings' && state.done) {
      state.score += SCORE.landing;
      state.objective = 'Course clear — landed safe at Kestrel Home';
      showBanner(`LANDED  +${SCORE.landing}`, 3);
    } else if (state.kind === 'courier' && state.done) {
      state.score += SCORE.landing;
      state.objective = 'All parcels delivered — home safe';
      showBanner(`LANDED  +${SCORE.landing}`, 3);
    }
  }

  /**
   * One step: the clock runs, rings are checked by distance, and the
   * rescue winch is checked by a slow low pass over the reef.
   */
  function step(flight, dt) {
    if (state.done && state.kind !== 'rings') return state;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    if (state.timeLeft <= 0 && !state.done) {
      state.failed = true;
      state.objective = 'Out of time — mission failed';
    }
    if (state.banner && state.elapsed > state.banner.until) state.banner = null;

    if (state.kind === 'rings' && !state.done) {
      const ring = nextRing();
      if (ring) {
        const dx = flight.x - ring.x;
        const dy = flight.y - ring.y;
        const dz = flight.z - ring.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < RING.radius + 6) ringPassed();
      }
    }
    if (state.kind === 'rescue' && !state.pickedUp && !state.failed) {
      const r = archipelago.rescue;
      const dx = flight.x - r.x;
      const dz = flight.z - r.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const speedKt = flight.speed * 1.94384;
      if (d < 120 && flight.y < 152 && speedKt < 120) pickedUp();
    }
    return state;
  }

  return { state, start, nextRing, nextStrip, ringPassed, delivered, pickedUp, landedHome, step };
}
