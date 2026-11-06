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

## "Finger of God" mode (v21)

Built as planned, with two changes found in testing:

- **The pocket drifts with the flock.** A pocket fixed in the air did almost nothing: birds at 11 m/s cross it in under a second, and a bird hit dead-centre dropped only 0.3 m. So it now moves at the flock's mean velocity from when it struck.
- **Startle.** Even drifting, the air alone only nudged the formation; the birds' controllers absorb it. So a bird that feels more than 2 m/s of the pocket breaks formation for 0.3–1.2 s, veering sideways and turning away from the centre. Then the usual rules bring it back.

Details:

- **Aiming:** a click picks the bird nearest the cursor on screen. A click more than 60 px from every bird misses. The pocket goes at the point on the click ray closest to that bird.
- **Controls:** *Disturbance strength* (default 10 m/s peak downdraft) and *Disturbance size* (6 m radius) sliders. `fogDuration` (1.2 s), `fogBurst` (5) and `fogCooldown` (8 s of sim time with no clicks) are parameters.
- **Visuals:** a ring spreads on the water under the pocket, a fading shell shows where it struck, and an indicator shows the charges left (or "recharging").
- **Harness:** specs take `"events":[{"t":80,"strength":20,"dx":4}]`, centred on the bird nearest the flock's centroid plus the offset. `recovery[]` reports how far birds stray from their layout at the strike (`layoutDev` at +1…30 s), the biggest drop, whether the flock split, and when it regrouped.

Seed 1, 20 birds, no skims (layout disturbed at +1 / +5 / +10 s):

| Run | Layout disturbed | Split? | Regrouped after |
|---|---|---|---|
| Control, no pocket | 0.5 / 1.7 / 2.5 m | no | — |
| Single hit, strength 10 | 1.9 / 4.3 / 6.1 m | no | — |
| Burst of 5, strength 10 | 2.0 / 8.2 / 4.1 m | yes | ~10 s |
| Burst of 5, strength 20 | 3.1 / 8.2 / 10.6 m | yes (17 m gap) | ~19 s |

With skims on and a strength-20 burst every 20 s for 5 minutes, no bird touched the water (lowest wingtip 0.02 m above it). The closest pair came within 0.16 m once, and the flock split 37% of the time.

Next with this tool: measure *what shape* the flock reforms into after a big burst. Does a scattered flock rebuild a lopsided V, an echelon, or a balanced V, and does it depend on which birds were scattered?

## Wide view and an energy price for catching up (after v21)

**The question.** Why does the sim almost never make a single line? Does a joining bird weigh "catch up to the short arm" against "settle at the back of the long one"?

**How a bird actually chose before this change.**
- It never compared those two options. It only considered birds inside a narrow cone ahead: about 27° each side, up to 30 m.
- A bird behind the tail of a lopsided V couldn't see the short arm's tip or the leader's empty side, so it joined whatever was in front of it.
- Distance cost a flat 0.03 m/s per metre.

**Two new options, both off by default:**
- `viewWide`: the bird sees about 70° each side and up to 60 m, and up to 40 candidate birds.
- `catchupCost`: distance is priced from energy instead of the flat rate.
  - The extra energy to gain d metres on the flock is about 3·Psus/v·d. That's about 15 J/m, and dropping back saves the same amount.
  - On top of that, the bird loses its current upwash for the time it takes to get there, at about 1.5 m/s relative to the flock.
  - The total is spread over `holdTime` (20 s) and divided by m·g. At 1× this comes out about the same size as the old flat rate.

**Results.** Trickle start, 3 seeds, 480 s.

| Lead rotation | View | Catch-up | Result |
|---|---|---|---|
| on | narrow | flat | V's; long-arm share 0.54–0.67 |
| on | wide | flat | V's, more balanced (0.56–0.59) |
| on | narrow | energy 1× | V's (0.59–0.67), one mostly mixed run (0.78) |
| on | wide | energy 1× | V's and filled wedges (0.58–0.60); draft power 47–52 W against 42–47 W |
| on, cluster start | wide | energy 1× | V's 53–73%, filled 26–45%; closest pair 0.28 m |
| off | narrow | flat | (v20) echelon in 5 of 6 runs |
| off | wide | flat | V's in 2 of 3 runs |
| off | wide | energy 1× | V's in 3 of 3 runs, 0.53–0.58 |
| off | wide | energy 3× | **echelon in 3 of 3 runs**, flock intact |
| on | wide | energy 3× | echelons 24–79% of the time, long-arm share 0.77–0.92, but the flock splits 24–100% of the time |

**What this shows.**
- The near-total absence of single lines comes from the **physics of upwash**. The tip of the short arm, or the leader's empty side, really is better air than the tail of the long arm.
- When a bird can see those spots and catching up costs about what the energy estimate says, it goes there. The V's get more balanced, not less.
- In the v20 runs with rotation off, the echelons came mostly from the narrow view.
- Echelons win only when catching up costs about 3× the estimate, roughly a bird expecting to hold its spot for only about 7 s.
  - Without lead changes, that gives a clean echelon every time.
  - With lead changes, the flock tears itself apart: the passers pay the price too.
- So in the sim, a single line means birds that don't plan to stay long, or can't see the rest of the flock.

## Fishing (v23): one bird, the dive itself

Pelicans are plunge-divers. v23 adds the whole feeding cycle for each bird, tuned with one pelican first: fly, see fish, circle, dive, in the water, swim, take off, then circle again or rejoin the flock. Turn on *Go fishing*, or press *Fishing lab* for one hungry pelican and a school 90 m ahead.

**How it's built**
- **Tucked wings stop lifting for real.**
  - The shoulder sweeps the wing back (up to 80°) and the feathers overlap (up to 75% less area).
  - Each strip then only lifts on the flow *across* it (sweep theory); the flow along the span adds only skin friction.
  - Fully tucked, the span lies along the body, so the lift is gone and the fall is ballistic. Nothing is scripted.
- **The dive is three phases.**
  - Roll left past vertical and pull the nose down, with the primaries half spread to shed speed.
  - Wings swept about 50° and raised into a V over the back, steering a little toward the fish (this is in the stills).
  - Below 3 m, fold flat and twist left (the arrow).
  - Attitude is held kinematically along the flight path. The forces stay physical.
- **Aiming.** A bird turns in from its orbit and lines up so that the predicted entry point (ahead and to the left, because of the left roll) falls on the school. After each dive it updates its estimate from where it actually landed.
- **In the water.**
  - Water drag on a streamlined body brings it to a stop about 1 m down.
  - The breath it takes on impact fills the air sacs over a quarter second (*Air-sac buoyancy*, 1.6× weight), so it pops up in about 1 s.
  - Floating, it paddles slowly into the wind, drains its pouch for 6 s and swallows.
- **Takeoff.**
  - The beat is raised 18° and flaps at full amplitude.
  - The feet push at 0.5× weight, fading out by 9 m/s.
  - Buoyancy and hull drag fall as the body rises, and the water's grip (0.35× weight) lets go only once the body is nearly clear.
  - The body skips off the surface with each wingbeat until it lifts off.
- **Circling** uses the same capped steering force as sideways station-keeping in the flock. The bank shows on the body. The yaw damper now damps relative to the turn being flown; without that it held the nose 45° outside the circle.
- **Regression.** With fishing off, seeded runs replay v22 bit for bit. Two things needed care:
  - Strip arithmetic is kept in the same order.
  - three.js draws a random id for every new object, so the feet are built from the unseeded generator and get no shadows.

**Results** (`specs/fishing.json`, seed 1)

One pelican, 300 s:
- 9 dives and 3 fish. Full at 240 s, it climbed back to cruise height.
- Dives started from 12.5–14.7 m and hit the water at 14.9–17.2 m/s (33–38 mph, median 37). The median entry angle was 67° (60–79°).
- Median miss was 2.9 m (the school's radius is 6 m).
- It went 0.95–1.03 m deep and was under for 0.92–0.99 s.
- Takeoff runs took 2.6–4.3 s over 14–29 m, lifting off at 9.2–11.1 m/s.

20 birds, 400 s:
- 120 dives and 62 catches (52%).
- Median entry 16.1 m/s (36 mph) at 69° (59–81°), from a median 13.0 m, landing 1.3 m from where it aimed.
- Median takeoff run 3.1 s (2.1–4.3 s, 11–30 m).
- Every bird caught 2–4 fish; no crashes or NaNs.

Against the video (40 mph from about 40 ft): our entry is about 8% slower. The roll-over airbrake that makes the dive steep costs some speed. A slightly higher circle or a weaker brake would close the gap.

**Next**
- **v24, the flock feeds:**
  - Divers avoid each other (nothing stops two birds diving at the same spot yet).
  - Birds that see a dive go to it (only the spotting cue so far).
  - Schools that sink or scatter when hit hard.
  - Measures: dive rate, success rate, time to full, near misses.
- **v25, leaving and re-forming:**
  - A quorum rule for when the flock leaves.
  - What shape it re-forms into. Full birds rejoin one at a time, which is exactly the v19–v22 join-one-at-a-time question.

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
- Fishing runs: a spec with `"fish":{"dx":90,"z":-6}` puts a school 90 m ahead of bird 0 and reports every dive (height, entry speed and angle, miss, catch, depth, time under, takeoff run) plus mode changes; `"trace":true` adds a 0.1 s trace while birds dive, swim and take off.
- Specs live in `tools/flock-metrics/specs/`: `default.json` (20 birds), `strings.json` (12 birds, skims) and `v18.json` (crosswind, jetties, updraft, quirk 0) and `fishing.json` (one pelican fishing; a flock of 20 fishing).
- Results can be compared by eye from the JSON lines. In past sessions a small script printed two runs side by side.
