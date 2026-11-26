// A small deterministic random source: every island, ring and cloud in the
// archipelago comes from one seed, so the same seed always builds the same
// world and the screenshots always stage the same flight.

export function createRandom(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  function nextUint32() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  }
  return {
    /** A float in [0, 1). */
    next() {
      return nextUint32() / 4294967296;
    },
    /** A float in [min, max). */
    range(min, max) {
      return min + (max - min) * this.next();
    },
    /** An integer in [min, max]. */
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    /** One element of an array. */
    pick(items) {
      return items[Math.floor(this.next() * items.length)];
    },
  };
}
