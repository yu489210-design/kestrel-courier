// Staged scenes for the screenshots: each one sets the flight and the
// mission to a fixed, seeded state, paints it twice, and sets
// window.__shotReady so the screenshot tool knows the frame is done.
// Nothing here is random: the same seed always stages the same picture.

import { HOME_RUNWAY } from './islands.js';

const DEG = Math.PI / 180;

function placeOnCourse(flight, mission, archipelago, index, offsetM) {
  const ring = archipelago.rings[index];
  const prev = index === 0 ? { x: -2600, z: -3300 } : archipelago.rings[index - 1];
  const dx = ring.x - prev.x;
  const dz = ring.z - prev.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  flight.x = ring.x - ux * offsetM;
  flight.z = ring.z - uz * offsetM;
  flight.y = ring.y;
  flight.heading = (Math.atan2(ux, uz) / DEG + 360) % 360;
  flight.pitch = 2;
  flight.bank = -6;
  flight.speed = 62;
  flight.throttle = 0.72;
  flight.fuel = 78;
  flight.onGround = false;
  mission.state.ringIndex = index;
  mission.state.objective = `Fly through ring ${index + 1} of ${archipelago.rings.length}`;
}

export function stageShot(name, flight, mission, archipelago) {
  const f = flight.state;
  const m = mission.state;
  if (name === 'start') {
    // Parked on the home strip at golden hour, nose to the setting sun
    // over the western sea: the title over the archipelago.
    flight.reset();
    f.heading = 250;
    f.throttle = 0.4;
    f.speed = 0;
    m.objective = 'Fly through ring 1 of 8';
    return { screen: 'title', best: 0 };
  }
  if (name === 'play') {
    // Final ring, over open sea toward the setting sun: the cover —
    // chase view, ring ahead, sun and islands around, HUD and glass lit.
    mission.start('rings');
    placeOnCourse(f, mission, archipelago, 7, 420);
    f.fuel = 78;
    m.score = 1750;
    return { screen: 'play', best: 1250 };
  }
  if (name === 'ring') {
    // Right on top of ring 5, about to fly through it.
    mission.start('rings');
    placeOnCourse(f, mission, archipelago, 4, 90);
    f.fuel = 64;
    m.score = 1000;
    m.ringIndex = 4;
    m.objective = 'Fly through ring 5 of 8';
    return { screen: 'play', best: 1250 };
  }
  if (name === 'landing') {
    // Final approach to Kestrel Home: low, slow, lined up on the runway,
    // close enough that the strip reads as a perspective trapezoid.
    mission.start('courier');
    const strip = HOME_RUNWAY;
    const h = strip.heading * DEG;
    f.x = strip.x - Math.sin(h) * 500;
    f.z = strip.z - Math.cos(h) * 500;
    f.y = 60;
    f.heading = strip.heading;
    f.pitch = -4;
    f.bank = 2;
    f.speed = 46;
    f.throttle = 0.32;
    f.fuel = 41;
    f.onGround = false;
    m.deliveries = 2;
    m.objective = 'Parcel 3 of 3 — land at Kestrel Home';
    return { screen: 'play', best: 1250 };
  }
  return { screen: 'title', best: 0 };
}
