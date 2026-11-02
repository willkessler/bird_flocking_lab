# Bird Flocking Lab

![A flock of eight simulated pelicans in V formation descending to skim the surf along a coastline](media/flock-v12.gif)

A browser-based physics lab for studying how **pelican flocks** fly: how individual birds generate thrust from flapping, how they save energy by drafting off one another, and how formations like the V form, hold together, and reorganize.

The whole lab is a single self-contained HTML file built on [three.js](https://threejs.org/). Open `index.html` in a browser; nothing needs installing.

## Why this exists

This is the latest of several attempts I've made over the years to simulate bird flight. Earlier pieces: [pelicans](https://github.com/willkessler/pelicans), a Processing flocking sim, and [springs_and_arms](https://github.com/willkessler/springs_and_arms), a workbench for articulated wing joints.

Classic [Boids](https://en.wikipedia.org/wiki/Boids) gets you convincing flocks from three local rules, but it cheats on the thing that matters most for formation flight: **propulsion**. A boid can step on the gas whenever it likes. A real bird has to pay for every bit of speed and every turn with muscle work, and that cost is the whole reason pelicans and geese fly in Vs: a bird sitting in the wingtip upwash of the bird ahead flies more cheaply.

So the goal here is to build the flock up from honest single-bird physics:

1. **Thrust has to come from the wing motion.** It isn't added as a force.
2. **Drafting has to come from a wake model.** The benefit of flying behind another bird should follow from the physics.
3. **Formation behavior should emerge from individual birds** responding to their own state (fatigue, airflow, neighbors) rather than from a choreographer placing birds in slots.

## What's simulated

**Single-bird aerodynamics (blade-element / strip theory)**
- Each wing is an **articulated two-segment** limb (inner arm plus outer hand) split into spanwise strips. Each strip computes its own local airflow (body motion, rotation, flapping velocity, wind, and wake) and its own lift and drag.
- Forward thrust **emerges** from the plunging downstroke (the Knoller–Betz effect). The wing **folds** at the elbow and wrist on the upstroke, which cuts upstroke drag and inertia.
- Per-segment angle of attack, feathering, wingtip-feather splay, and ground effect.
- **Muscle-driven mode:** the pectoralis and supracoracoideus are torque-limited by strength, length–tension, and Hill force–velocity curves. A bird that is too weak, or one with a rigid wing, can't sustain its wingbeat.
- Mass and bone thickness, head/tail mass distribution, a tail stabilizer, and active pitch/roll stabilization reflexes. Set the reflex gain to 0 to see the raw phugoid.

**Flock**
- **Wingtip-vortex wake model:** a bird outboard of the tip of the bird ahead gets upwash (a lift bonus), and a bird inboard of it gets downwash.
- **Momentum slipstream:** directly behind another bird is a low-drag channel of co-moving air.
- **Intermittent flap-and-glide flight:** each bird decides beat by beat whether to flap or coast.
- **Surface skimming:** the flock periodically drops to ride ground effect just above the water, as pelicans do working a surf line.
- Coastline following, gusty turbulent wind, and headwind and crosswind.

**Viewing:** orbit camera, `1`–`9` to ride a bird's-eye view, `Shift`+`1`–`9` for an over-the-shoulder chase cam (drag to look around), and live telemetry and force charts for the focused bird.

## Repository layout

| Path | What |
|---|---|
| `index.html` | The current version of the lab, which is where iteration happens |
| `versions/` | Every earlier build, kept for reference (see below) |
| `docs/conversation-notes.md` | Notes from the design conversation that produced v1 through v12 |
| `media/` | README assets |

### Version history (`versions/`)

There are two naming series, in chronological order:

- `bird-sim.html`, `bird-sim_1` … `bird-sim_10` (Aug–Sep 2026): the single-bird lab. These cover the blade-element aero, the feathering fix, active stabilization, the articulated folding wing, and the torque-limited muscle model. `_4`, `_5`, and `_6` are identical snapshots.
- `bird-sim-v2` … `bird-sim-v12` (Sep 2026): the multi-bird flock. These add the wake and drafting model, V formation, lead rotation, flap-and-glide station keeping, coastline following, surface skims, turbulence, and camera modes. `v12` is identical to the initial `index.html`.

## Open questions and direction

The v12 flock flies convincingly, but its *formation* is still partly choreographed. Birds are assigned fixed V slots and a fixed arm, and the lead is swapped on a timer in strict round-robin. Real pelicans fly Vs, echelons, single-file strings, and messy mixtures of these, and who leads seems to come out of the birds' own state: who is fresh, who is near the front, and who is tiring. The next stage removes the choreography and asks how much of that behavior a few local rules can produce, as Boids and Conway's Life do.
