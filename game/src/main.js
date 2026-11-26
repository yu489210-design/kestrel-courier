// Boot and the one loop: input is read every frame, the flight advances
// in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// missions score the flight, and the renderer and the glass paint what
// is there. The game moves between four screens: title, play, paused and
// game over.
//
// ?seed=N fixes the archipelago. ?shot=start|play|ring|landing (with
// &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, DEFAULT_SEED, STEP } from './config.js';
import { createArchipelago } from './islands.js';
import { createFlight } from './physics.js';
import { createMissions } from './missions.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART,
  ACTION_MISSION_1, ACTION_MISSION_2, ACTION_MISSION_3, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { createInstruments } from './instruments.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : DEFAULT_SEED;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const archipelago = createArchipelago(seed);
const flight = createFlight(archipelago);
const mission = createMissions(archipelago);
const renderer = createRenderer(canvas);
const instruments = createInstruments(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts one visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, flight, mission, archipelago);
  const best = readBest();
  let painted = 0;
  function paint() {
    const view = { flight: flight.state, mission, archipelago, time: 12.5 };
    renderer.draw(view);
    instruments.resize(renderer.width, renderer.height);
    instruments.draw(flight.state, mission, { screen: scene.screen, best: scene.best || best });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clock = 0;
  let lastScore = 0;
  let lastRingIndex = 0;
  let lastDeliveries = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startMission(kind) {
    flight.reset();
    mission.start(kind);
    input.setThrottle(0.55);
    lastScore = 0;
    lastRingIndex = 0;
    lastDeliveries = 0;
    screen = 'play';
    announce(`Flying ${mission.state.name}.`);
  }

  function endGame() {
    screen = 'over';
    if (mission.state.score > best) {
      best = mission.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${mission.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_MISSION_1) startMission('rings');
    else if (actions & ACTION_MISSION_2) startMission('courier');
    else if (actions & ACTION_MISSION_3) startMission('rescue');
    else if (actions & ACTION_CONFIRM && (screen === 'title' || screen === 'over')) startMission('rings');
    else if (actions & ACTION_PAUSE && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === 'paused') {
      screen = 'play';
      announce('Flying.');
    }
    if (actions & ACTION_RESTART && screen !== 'title') startMission(mission.state.kind);
  }

  function step() {
    const wasLanded = flight.state.landed;
    const control = input.control();
    flight.step(control, STEP);
    mission.step(flight.state, STEP);
    audio.update(flight.state);
    // Score events get their sound and their announcement.
    if (mission.state.score !== lastScore) {
      if (mission.state.ringIndex !== lastRingIndex) audio.ring();
      else if (mission.state.deliveries !== lastDeliveries) audio.delivery();
      else if (mission.state.pickedUp) audio.delivery();
      lastScore = mission.state.score;
      lastRingIndex = mission.state.ringIndex;
      lastDeliveries = mission.state.deliveries;
    }
    if (flight.state.landed && !wasLanded) {
      audio.thud();
      mission.landedHome();
    }
    if (flight.state.crashed || mission.state.failed) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += dt;
    last = now;
    clock += dt;
    handleActions();
    if (screen === 'play') {
      while (accumulator >= STEP && screen === 'play') {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    if (screen === 'title') {
      // The title idles over the home strip: slow orbit, engine off.
      flight.state.heading = (flight.state.heading + 0.008) % 360;
    }
    const view = { flight: flight.state, mission, archipelago, time: clock };
    renderer.draw(view);
    instruments.resize(renderer.width, renderer.height);
    instruments.draw(flight.state, mission, { screen, best });
    if (screen === 'play') audio.ensure();
  }

  announce('Kestrel Courier. Press 1, 2 or 3 to pick a mission.');
  mission.start('rings');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
