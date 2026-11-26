// Keyboard and mouse, smoothed into one control each frame. The plane is
// steered with arrows or WASD (pitch and bank), throttle with W/S or the
// mouse wheel, and the mouse itself can fly the plane: hold the left
// button and the nose follows the cursor. Space confirms, P pauses,
// M mutes, R restarts.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;
export const ACTION_MISSION_1 = 16;
export const ACTION_MISSION_2 = 32;
export const ACTION_MISSION_3 = 64;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let throttle = 0.55;
  let wheelDelta = 0;

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
    if (event.key === 'm' || event.key === 'M') actions |= ACTION_MUTE;
    if (event.key === 'r' || event.key === 'R') actions |= ACTION_RESTART;
    if (event.key === '1') actions |= ACTION_MISSION_1;
    if (event.key === '2') actions |= ACTION_MISSION_2;
    if (event.key === '3') actions |= ACTION_MISSION_3;
  }

  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) / rect.width - 0.5;
    mouseY = (event.clientY - rect.top) / rect.height - 0.5;
  }

  function onMouseDown(event) {
    mouseDown = true;
    onMouseMove(event);
  }

  function onMouseUp() {
    mouseDown = false;
  }

  function onWheel(event) {
    event.preventDefault();
    wheelDelta -= Math.sign(event.deltaY) * 0.06;
  }

  function onBlur() {
    keys.clear();
    mouseDown = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function held(...names) {
    return names.some((n) => keys.has(n));
  }

  /**
   * The smoothed control for this frame: pitch -1..1 (up positive),
   * bank -1..1 (right positive), throttle 0..1.
   */
  function control() {
    let pitch = 0;
    let bank = 0;
    if (held('arrowup', 'w')) pitch += 1;
    if (held('arrowdown', 's')) pitch -= 1;
    if (held('arrowleft', 'a')) bank -= 1;
    if (held('arrowright', 'd')) bank += 1;
    if (mouseDown) {
      bank += Math.max(-1, Math.min(1, mouseX * 2.4));
      pitch += Math.max(-1, Math.min(1, -mouseY * 2.4));
    }
    if (held('shift')) throttle = Math.min(1, throttle + 0.008);
    if (held('control')) throttle = Math.max(0, throttle - 0.008);
    throttle = Math.max(0, Math.min(1, throttle + wheelDelta));
    wheelDelta = 0;
    return {
      pitch: Math.max(-1, Math.min(1, pitch)),
      bank: Math.max(-1, Math.min(1, bank)),
      throttle,
    };
  }

  function setThrottle(value) {
    throttle = Math.max(0, Math.min(1, value));
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  return { control, setThrottle, takeActions };
}
