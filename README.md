# kestrel-courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/yu489210-design/kestrel-courier/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/yu489210-design/kestrel-courier/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Kestrel Courier — a golden-hour flight game over the Coral Archipelago. Fly a small prop plane in chase view over recognisable islands, through golden rings, onto island strips, and out to a reef rescue. Keyboard and mouse, offline, static files only.

Three missions, one plane: **Ring Run** (8 rings against the clock), **Island Courier** (land parcels on 3 island strips), **Reef Rescue** (slow low pass to winch a sailor aboard, then land him home). Throttle and turn discipline matter: the wing stalls, fuel burns, hard landings bend the airframe.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static server. No build step, no network requests, no dependencies. Node 22.18+ for `main.ts` / `serve.ts`; any desktop Chrome for play.

Controls: Arrows / WASD fly, Shift throttle up, Ctrl throttle down, mouse wheel throttle, hold the mouse to steer, 1 / 2 / 3 pick a mission, Space starts, P pauses, M mutes, R restarts.

## Layout

- `main.ts` — the hand-in program (Node 22, standard library only): copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `game/` — the playable game, static files only: `index.html` plus `src/` modules (`config`, `random`, `islands`, `physics`, `missions`, `input`, `audio`, `render`, `instruments`, `shots`, `main`).
- `screenshots/` — 4 real renders of the game's own code in desktop Chrome (see `shots.json` for the staged scenes).
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Test it

```sh
mkdir -p out1 out2
MAKEFUN_OUTPUT_DIR=out1 node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
diff -r out1 out2   # the two runs must be byte-identical
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
