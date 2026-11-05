# V or single file? Notes and next experiments (after v18)

Where the investigation stands after v18, and what to try next. Start here next session.

## The question

Real pelicans at Chrissy Field fly three kinds of formation:

- **Lopsided V's.** One long straight single-file arm (about 13 birds), one short arm (about 5), even spacing, and nothing inside the V.
- **Single-file lines in calm air.** Each bird is almost directly behind the one ahead, slightly offset in altitude.
- **Mixes of the two.**

In v18, at cruise height, the sim forms V's and echelons (a V with only one arm) but almost never single file. Why do real birds sometimes choose a line over a V?

## Results so far (after v18, Nov 2026)

New tools, all in `index.html` and the harness:

- **Seeded runs.** `seedRandom(n)` swaps `Math.random` for a small PRNG. Specs take `"seed": n`, and the page takes `?seed=n`. The same seed gives an identical run, so A/B tests need far fewer repeats.
- **"Join one at a time" start** (`startFormation:'trickle'`, `joinGap` 12 m). Birds start strung out behind each other and scattered sideways, so bird number is join order. Measure after a 180 s warm-up (`"warm":180`, 480 s runs).
- **Cost of overtaking to a spot** (`reachCost`, a slider, default 0). A spot I'd have to fly ahead to reach costs `reachCost` m/s of upwash per 10 m, counting only the first 10 m (`reachCost()` near `flockControl`).
- **Rejoin rule.** A bird with the flock ahead of it past a gap (more than 3 × `followDist`, within `wakeRange`) doesn't take spots behind itself. Without it, the cost made a trailing group's leader drop back behind its own followers every time it got close, and the flock stayed in 4–6 separate groups.
- **Catch-up range and strength** are now parameters (`chaseRange` 150 m, `chaseBoost` 0.12). Raising them to 400 m and 0.3 didn't help, so they stay at the old values.
- **New metrics:**
  - `armLongShare`: share of side birds on the longer arm (0.5 is even; the photo's 13:5 is 0.72).
  - `armRatioMedian`.
  - `sameSideAsPrevPct`: how often bird i sits on the same side as bird i−1.
  - `mainGroupPct`: share of birds in the biggest connected group.
  - `finalSides`: the last sample's sides, per bird.

Results: 20 birds, seeds 1–3, with the rejoin rule.

| Spot cost | Long-arm share, cluster start | Long-arm share, join one at a time | Same side as previous joiner | Main group |
|---|---|---|---|---|
| 0 | 0.65 | 0.61 | 42–78% (chance) | 98–100% |
| 0.15 | 0.72 | 0.72 | 40–77% | 94–99% |
| 0.25 | 0.72 | 0.71 | 65–76% | 90–99% |
| 0.5 | 0.84 (mostly echelons) | 0.86 (echelons 68–92%) | 91–99% | 86–96% |

What this says:

- **Join order alone doesn't make V's lopsided.** With no cost, birds joining one at a time end up as balanced as a random cluster.
- **A cost of overtaking does make them lopsided,** and 0.15–0.25 matches the photo (0.72), from either start.
- **Join order decides which arm a bird takes only when the cost is strong.** At 0.5, 91–99% of joiners take the side of the bird before them, against about 75% by chance at that arm share.
- **The cost isn't the default.** The v18 suite at 0.2 (seed 1) splits the flock 21–49% of the time, against about 1–5% in v18. V's at default fall to 33%, and the closest pair dips to 0.18 m. Birds hang back rather than pay to close up.
- **Next fix:** make closing a gap *within* the flock free, so a hole costs nothing to fill, while still charging for overtaking past birds to a far arm.

### v20: overtaking cost by birds passed, and the role of lead changes

v20 charges for overtaking only: `reachCost` per 4 birds passed on the way to a spot (birds ahead of me, short of the spot, inside the corridor between my track and the spot), capped at 4. Closing a gap with nobody in between is free. The flock now holds together at any cost: main group 92–99%, splits 4–15% at 0.25–0.5.

But the V's are no longer lopsided. Long-arm share is 0.55–0.73 at costs 0.25–0.5 (about 0.63 on average, the same as no cost), and joiners take the same side as the previous joiner only by chance. Cost 1.0 goes back to echelons, with splits of 17–33%. So in v19 the lopsidedness came from charging for *any* forward catch-up, not specifically for overtaking.

The deciding factor turned out to be **lead changes** (seeds 1–3, 20 birds):

| Start | Lead rotation | Result |
|---|---|---|
| Random cluster | off | Balanced V's 100% of the time (long-arm share 0.53–0.63); drafting 29–31 W |
| Join one at a time | off | A single echelon in 5 of 6 runs, every follower on one side (costs 0 and 0.5 alike); one run formed a 0.74 V |
| Join one at a time | on | Lopsided V's: one timeline held 13–14 left against 4–6 right for 300 s while the front swapped between two birds |

The picture:

- **Birds arriving one at a time from behind all extend the same arm,** forming a pure echelon. That's Will's arrival-order idea, in a stronger form than expected.
- **The second arm comes from many birds reaching the front at once** (the cluster start), **or from lead changes.** A tired leader drops back, the spot off the other wingtip opens up, and each change seeds or feeds the short arm. How lopsided a V ends up depends on how often the lead changes compared with how fast birds join.
- **The overtaking cost hardly matters once closing a gap is free.** It stays as a slider, default 0.
- **Lead rotation costs the drafters:** 46 W with rotation against 30 W without, because the passing keeps reshuffling the formation.

Still to try: vary the join interval (`joinGap`) and the pace of fatigue (how often the lead changes) to see whether the arm ratio follows their ratio, and compare against photo counts.

## Hypothesis 1: arrival order sets the shape of the V

This came from Will. A bird that catches up at the **front** finds the lead's left wingtip already taken by #2. It takes the right wingtip, which starts the second arm. A bird that catches up from **behind** slots in at the end of the nearest line, on the same side as #2, #3, #4 and so on. A gap that opens in the middle of a line gets filled by a bird just behind it.

The wake supports this:

- Behind the lead there are two good spots, one off each wingtip.
- Behind a bird on an arm there is effectively only one, on the outside. The inside spot is in the downwash of the bird two places ahead. The sim measured about 1.5 m/s more upwash on the outer side; see rule 8 in the README.
- So the nearest good spot for a late arrival is the end of an arm. Reaching the far arm's tip means overtaking everyone in clean air, which costs extra effort.

**Prediction:** arm lengths reflect the order birds joined in. Birds that leave a roost one at a time and catch up from behind should build one long arm and one short arm, like the photo (13 against 5).

**This explains the lopsided V, not single file.** A bird directly behind another at the same height sits between its wingtip vortices, in downwash. That is the worst place to fly.

What the sim already has:

- Spots already taken are excluded.
- The outer spot wins on air.
- *Same side* (rule 8) breaks ties.
- Rule 2 already treats a gap in an arm as an open spot.

What it lacks is a realistic **cost of getting to a spot**. Spot scoring in `flockControl` (`index.html`, the `score` line with `- 0.03*Math.hypot(sx-st.pos.x, sz-st.pos.z)`, around line 1281) charges only 0.03 m/s of upwash per metre of distance. So a bird arriving at the back will cross to the far arm for slightly better air.

## Hypothesis 2: single file happens when birds aren't drafting for energy

The likely reasons, none tested yet:

1. **Following without drafting.** On a short commute in calm air, saving energy may matter little. Following the bird ahead is a cheap way to navigate and avoid collisions, and a bird can dodge most of the downwash by flying slightly above or below the bird ahead. That matches the altitude stagger seen at Chrissy Field.
   - Supporting evidence: great white pelicans in V formation have measurably lower heart rates (Weimerskirch et al. 2001, *Nature*), so drafting is real when they do it.
   - Also supporting: northern bald ibises directly behind another bird flap out of phase with it, which looks like coping with downwash (Portugal et al. 2014, *Nature*).
2. **Ground effect.** Low over the water the surface cancels much of the wake, so there's little penalty for flying directly behind.
   - In the sim, skimming at 0.5 m made strings about four times more common (v16 numbers).
   - This explains lines over water, but not birds over land.
3. **Wide spacing.** Several body lengths back, the wake has faded and sunk, so no position is clearly better and following straight behind costs nothing.
4. **Viewing angle.** From below or end-on, a shallow echelon looks like a single line, so some "lines" may be echelons.

Updrafts are probably not the answer. v18 makes the wake rise with steady lift, but at 2.5 m spacing it moves only about 0.2 m before reaching the next bird, which is too little to explain the stagger.

**Overall picture to test:**
- Long flights, headwind, energy matters: V's and echelons, with join order setting how lopsided they are.
- Short, easy flights, wide spacing or low over water: lines staggered in height to stay out of the downwash.

## Experiments to try next

1. **A cost for reaching a spot** (tests hypothesis 1). *Done, see Results above; still to do: charge only for overtaking past other birds, not for closing a gap.* Replace the flat distance penalty in spot scoring with the effort of getting there.
   - Distance *ahead* that I must gain costs extra speed in clean air while overtaking.
   - Sideways distance costs less.
   - Expected result: birds arriving from behind take the nearest arm end, and arms grow from their tails.
2. **Birds that join one at a time** (tests hypothesis 1). *Done, see Results above.* Add a `startFormation` option in `resetFlock` (`index.html`, next to the `'V'` and `'line'` cases around line 729): birds launch from behind in sequence, a few seconds apart, and catch up.
   - New metric for `tools/flock-metrics/metrics.js`: arm length ratio (long/short). The existing `armBalance` only gives symmetric, lopsided or one-sided.
   - Compare against the random-cluster start; the prediction is that sequential joining makes V's more lopsided.
   - Bonus: correlate each bird's join order with which arm it ends up on.
3. **A commuting mode** (tests hypothesis 2). Add a parameter, such as an energy-motivation scale, that weights following the bird ahead by sight above riding its upwash.
   - In this mode birds avoid downwash, by stepping up or down, rather than chase upwash.
   - Check whether staggered single file appears on its own; `inlinePct`, `inlineDy` and `string3Cruise` already measure it.
   - Report drafting power against leading power, to see what lines cost.
4. **Wide spacing at cruise.** Raise `followDist` to 5–8 m with `skimEnable` set to 0, and see whether lines replace V's once the wake fades. Partly tried in v16: at cruise, follow strength 0.3 broke up V's, and 8 m drafting cost more than leading.

## Next feature: "finger of God" mode (requested Nov 2026)

A tool for messing with the flock, to test how it reforms.

- **Controls:** a toggle, "Finger of God (click to disturb the flock)", and a *Disturbance strength* slider.
- **Aiming:** a click casts a ray from the camera through the mouse position. The disturbance is centred on the point on that ray closest to the nearest bird. Clicks far from any bird do nothing. Dragging still orbits the camera.
- **The disturbance:** a sudden pocket of air, about 1–1.5 s long and a few wingspans across, that blows outward and down from its centre. It fades with distance and time, so birds near the centre are hit hard and those at the edge barely notice. It's added to `windAt`, so it acts through the aerodynamics and the birds' own controllers have to recover. Rings on the water show where it hit.
- **Rate limit:** a burst of up to 5 disturbances, then a cool-down of about 8 s before all 5 come back. A small charge indicator shows what's left. Burst size and cool-down are settings.
- **Harness hook:** script the same disturbance with a fixed seed, then measure recovery time and the shape the flock reforms into.

## Open issues carried over from v18

- **Branching:** with quirks, a second line branches off an arm more often: 50–74% of the time at 12 birds, against 34–46% in v17. Try a lower default `quirk`, or make the spot-score noise smaller than the side preference.
- **Closest approaches:** the closest pair still dips to about 0.5 m in some gusty and low-skim runs, and close calls (under 1.2 m) happen 1–3% of the time.
- **Strong onshore wind:** at 5 m/s onshore the flock is pushed over the beach most of the time. Birds stay clear of the ground, but the leader can't hold the coast.
- **Low-skim strings** remain weaker than in v16.
- **Noise:** fixed with seeds, but results still vary a lot *between* seeds; V share swings 24–99% at the same setting. Use three or more seeds per variant.
- **Docker memory:** other projects' containers can take most of Docker's RAM; one was using 9.9 of 19.6 GB. Four headless Chromes at once then crash with "Target crashed". Run specs one after another, a few per container.

## How to run things

- Metrics: `tools/flock-metrics/run.sh index.html tools/flock-metrics/specs/v18.json`. It needs Docker.
  - Files are staged through a temp dir, because Docker can't read `~/Documents`.
  - About 5 s per 300 simulated seconds.
- Specs live in `tools/flock-metrics/specs/`: `default.json` (20 birds), `strings.json` (12 birds, skims) and `v18.json` (crosswind, jetties, updraft, quirk 0).
- Results can be compared by eye from the JSON lines. In past sessions a small script printed two runs side by side.
