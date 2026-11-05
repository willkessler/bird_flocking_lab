// Injected into the lab page by harness.mjs. Runs the flock physics headless (no rendering) and
// summarizes the structure that emerges: formation shape, who leads and how often that changes,
// what leading vs drafting costs, and basic safety (altitude, spacing, straggling).
//
// opts: { secs, warm, seed, P: {param overrides}, setup: "js run before reset", timeline: N }
// events: [{t, strength, radius, dx, dy, dz}] drop a Finger-of-God air pocket at time t, centred on the
//   bird nearest the flock's centroid plus (dx,dy,dz) m; reported as recovery[] (time to regroup and to re-form its shape).
// seed: a number makes the run repeatable (same seed, same page, same result); omit for fresh randomness.
window.__run = function(opts){
  const S=__sim, P=S.P;
  Object.assign(P, JSON.parse(JSON.stringify(DEFAULTS)), opts.P||{});   // fresh defaults every run
  if(opts.setup) (new Function(opts.setup))();
  if(S.seedRandom) S.seedRandom(opts.seed!=null ? opts.seed : null);
  if(opts.reset!==false) S.resetState();
  const dt=1/480, total=opts.secs||120, sampleEvery=0.5, warm=opts.warm||20;
  const n=S.birds.length;
  const frontT=new Array(n).fill(0), pr={solo:[0,0],draft:[0,0]};
  const wasPassing=new Array(n).fill(false);
  let lastCls=null, minPairNow=1e9, gapNow=0;
  const recOut=r=>({at:+r.t0.toFixed(0), before:r.before, layoutDev:r.dev, maxDrop:+(r.preY-r.minY).toFixed(2), split:r.everSplit, regroupS:r.regroup, lostShape:r.lostShape, reshapeS:r.reshape, maxGap:+r.maxGap.toFixed(1), minPair:+r.minPair.toFixed(2)});
  let closeCalls=0, passes=0, lastFront=-1, leadChanges=0, t=0, nextS=0, minY=1e9, minPair=1e9, maxSpread=0, samples=0;
  const shape={line:0,V:0,echelon:0,filled:0,mixed:0}, rel={inline:0,stag:0}, relSk={inline:0,stag:0};
  const intPow=[0,0], edgePow=[0,0], inDy=[0,0]; let ends=0, branched=0; let interiorAcc=0;
  const balance={symmetric:0,lopsided:0,oneSided:0}, stringLen=[0,0,0,0,0,0]; let longestString=1, skimSamples=0, skimStr3=0, cruiseSamples=0, cruiseStr3=0;
  let vArm=[0,0,0], sideSame=[0,0], lastSides=''; const ratios=[];
  let mainAcc=0, obsN=0, obsHit=0, minObs=1e9, splitN=0, fDy=[0,0];
  const timeline=[]; let minTip=1e9, tipTouch=0, skimSteps=0, skimY=0, skimSpd=0, skimFlap=0, skimSpacing=[0,0];
  const evs=(opts.events||[]).map(e=>({...e, fired:false})), recovery=[]; let rec=null;
  while(t<total){
    for(const e of evs) if(!e.fired && t>=e.t){ e.fired=true;
      let cx=0,cy=0,cz=0; for(const b of S.birds){cx+=b.pos.x;cy+=b.pos.y;cz+=b.pos.z;} const m=S.birds.length;
      // centre on the bird nearest the centroid (a V's centroid is empty air inside it), plus the offset
      let nb=S.birds[0], nd=1e9; for(const b of S.birds){ const d=Math.hypot(b.pos.x-cx/m,b.pos.y-cy/m,b.pos.z-cz/m); if(d<nd){nd=d;nb=b;} }
      S.disturb(nb.pos.x+(e.dx||0), nb.pos.y+(e.dy||0), nb.pos.z+(e.dz||0), {force:true, strength:e.strength, radius:e.radius});
      if(!rec) rec={t0:t, before:lastCls, preY:S.birds.reduce((p,b)=>p+b.pos.y,0)/m, snap:null, dev:{}, regroup:null, reshape:null, okRun:0, shRun:0, everSplit:false, lostShape:false, minPair:1e9, minY:1e9, maxGap:0}; }
    S.integrate(dt); t+=dt;
    S.birds.forEach((b,i)=>{ const p=b.passing!=null; if(p&&!wasPassing[i]) passes++; wasPassing[i]=p; });
    if(t<warm) continue;
    for(const b of S.birds) minY=Math.min(minY,b.pos.y);
    // while skimming: wingtip clearance, body height, airspeed, fraction of time flapping
    if(S.skimState==='skim'){ skimSteps++;
      for(const b of S.birds){ const ly=b.tel.lowY; if(ly!=null){ minTip=Math.min(minTip,ly); if(ly<0) tipTouch++; }
        skimY+=b.pos.y; skimSpd+=Math.hypot(b.vel.x,b.vel.z); skimFlap+=b.flapping?1:0; } }
    // power by role: leading (no bird ahead to draft) vs drafting, overall and per skim phase
    for(const b of S.birds){
      const r=(b.target==null)?'solo':'draft', k=S.skimState+'_'+r, p=b.tel.power||0;
      (pr[k]=pr[k]||[0,0]); pr[k][0]+=p*dt; pr[k][1]+=dt; pr[r][0]+=p*dt; pr[r][1]+=dt;
    }
    if(t<nextS) continue;
    nextS=t+sampleEvery; samples++;
    // flock frame: along = mean heading, across = perpendicular
    let hx=0,hz=0; for(const b of S.birds){hx+=b.vel.x;hz+=b.vel.z;} const hn=Math.hypot(hx,hz)||1; hx/=hn; hz/=hn;
    const A=S.birds.map(b=>b.pos.x*hx+b.pos.z*hz), C=S.birds.map(b=>-b.pos.x*hz+b.pos.z*hx);
    let f=0; for(let i=1;i<n;i++) if(A[i]>A[f]) f=i;
    frontT[f]+=sampleEvery; if(f!==lastFront){ if(lastFront>=0) leadChanges++; lastFront=f; }
    let L=0,R=0,nInt=0, close=false; minPairNow=1e9;
    for(let i=0;i<n;i++){
      for(let j=i+1;j<n;j++){ const d=S.birds[i].pos.distanceTo(S.birds[j].pos); minPair=Math.min(minPair,d); minPairNow=Math.min(minPairNow,d); if(d<1.2) close=true; }
      if(i===f) continue;
      const c=C[i]-C[f]; if(c<-0.7) L++; else if(c>0.7) R++;
      // in-line vs staggered relative to the nearest bird ahead
      let best=-1,bd=1e9;
      for(let j=0;j<n;j++){ if(j===i) continue; const da=A[j]-A[i]; if(da<0.3||da>15) continue; const d=Math.hypot(da,C[j]-C[i]); if(d<bd){bd=d;best=j;} }
      if(best>=0){ const Q=(S.skimState==='skim')?relSk:rel; if(Math.abs(C[best]-C[i])<0.7){ Q.inline++; inDy[0]+=Math.abs(S.birds[best].pos.y-S.birds[i].pos.y); inDy[1]++; } else Q.stag++; }
      // interior = birds ahead of me on BOTH sides (inside the formation, not on an arm's outer edge)
      let aL=false, aR=false;
      for(let j=0;j<n;j++){ if(j===i) continue; const da=A[j]-A[i], dc=C[j]-C[i]; if(da>0.5&&da<7){ if(dc<-0.8&&dc>-5) aL=true; if(dc>0.8&&dc<5) aR=true; } }
      const P_=(aL&&aR)?intPow:edgePow; P_[0]+=S.birds[i].pS||0; P_[1]++; if(aL&&aR) nInt++;
    }
    if(close) closeCalls++;
    // arm lengths in V-shaped samples: share of side birds on the longer arm (0.5 = even), long:short ratio
    if(L>=1 && R>=1){ const mx=Math.max(L,R), mn=Math.min(L,R); vArm[0]+=mx/(L+R); vArm[1]++; ratios.push(mx/mn); }
    // join order vs arm: does bird i sit on the same side of the front bird as bird i-1?
    { const sd=C.map((c,i)=> i===f ? 0 : (c-C[f]<-0.7 ? -1 : c-C[f]>0.7 ? 1 : 0));
      for(let i=2;i<n;i++) if(i!==f && i-1!==f && sd[i] && sd[i-1]){ sideSame[1]++; if(sd[i]===sd[i-1]) sideSame[0]++; }
      lastSides=sd.map((v,i)=> i===f?'F':v<0?'L':v>0?'R':'|').join(''); }
    // obstacles (jetties, hills): body height above whatever is under it, where there is something
    if(typeof obstacleH==='function') for(const b of S.birds){ const h=obstacleH(b.pos.x,b.pos.z); if(h>0.01){ obsN++; const cl=b.pos.y-h; minObs=Math.min(minObs,cl); if(cl<0.5) obsHit++; } }
    // split: biggest along-gap between consecutive birds; height of each follower above the bird it follows
    { const s=[...A].sort((p,q)=>p-q); let g=0, run=1, big=1; for(let i=1;i<n;i++){ const d=s[i]-s[i-1]; g=Math.max(g,d); run = d>3*P.followDist ? 1 : run+1; big=Math.max(big,run); } if(g>3*P.followDist) splitN++; mainAcc+=big/n; gapNow=g;
      for(const b of S.birds) if(b.target!=null){ fDy[0]+=b.pos.y-S.birds[b.target].pos.y; fDy[1]++; } }
    // follow graph: arm ends = birds nobody follows (clean V: 2, echelon: 1); branched = some bird other
    // than the front one has 2+ followers (a second line splitting off an arm)
    { const fol=new Array(n).fill(0); for(const b of S.birds) if(b.target!=null) fol[b.target]++;
      ends+=fol.filter(x=>x===0).length; if(fol.some((x,i)=>x>=2 && S.birds[i].target!=null)) branched++; }
    // arm balance (birds out to each side of the front bird)
    { const mn=Math.min(L,R), mx=Math.max(L,R);
      if(L+R>0){ if(mn===0) balance.oneSided++; else if(mx>=2*mn+1 || mx-mn>=3) balance.lopsided++; else balance.symmetric++; } }
    // single-file strings: longest chain where each bird sits within 0.7 m sideways of the nearest bird ahead
    { const ahead=new Array(n).fill(-1);
      for(let i=0;i<n;i++){ let bd=1e9; for(let j=0;j<n;j++){ if(j===i) continue; const da=A[j]-A[i]; if(da<0.3||da>8) continue; const d=Math.hypot(da,C[j]-C[i]); if(d<bd){bd=d; ahead[i]=j;} } }
      let best=1;
      for(let i=0;i<n;i++){ let k=i, len=1; while(ahead[k]>=0 && Math.abs(C[ahead[k]]-C[k])<0.7 && len<n){ k=ahead[k]; len++; } best=Math.max(best,len); }
      longestString=Math.max(longestString,best); stringLen[Math.min(best,5)]++;
      if(S.skimState==='skim'){ skimSamples++; if(best>=3) skimStr3++; } else if(S.skimState==='cruise'){ cruiseSamples++; if(best>=3) cruiseStr3++; } }
    maxSpread=Math.max(maxSpread, Math.max(...A)-Math.min(...A));
    // whole-flock shape from the front bird: birds out to its left / right
    const nf=n-1; let cls;
    interiorAcc += nf>0 ? nInt/nf : 0;
    if(nInt >= Math.max(2, Math.round(0.2*nf))) cls='filled';           // diamond / lattice, not a V
    else if(L+R <= Math.max(1,Math.round(nf*0.25))) cls='line';
    else if(L>=Math.max(2,nf*0.25) && R>=Math.max(2,nf*0.25)) cls='V';
    else if(Math.min(L,R)<=1) cls='echelon'; else cls='mixed';
    shape[cls]++; lastCls=cls;
    // disturbance recovery: how far the birds stray from the layout they had when the (first) pocket struck,
    // in the flock's own frame (along, across, height relative to its centroid), sampled over the next 30 s
    if(rec){ const tr=t-rec.t0;
      const cA=A.reduce((p,q)=>p+q,0)/n, cC=C.reduce((p,q)=>p+q,0)/n, cY=S.birds.reduce((p,b)=>p+b.pos.y,0)/n;
      const lay=S.birds.map((b,i)=>[A[i]-cA, C[i]-cC, b.pos.y-cY]);
      if(!rec.snap){ rec.snap=lay; }
      const dev=lay.reduce((p,q,i)=>p+Math.hypot(q[0]-rec.snap[i][0], q[1]-rec.snap[i][1], q[2]-rec.snap[i][2]),0)/n;
      for(const m of [1,2,5,10,20,30]) if(rec.dev[m]==null && tr>=m) rec.dev[m]=+dev.toFixed(2);
      rec.minPair=Math.min(rec.minPair, minPairNow); rec.minY=Math.min(rec.minY, ...S.birds.map(b=>b.pos.y)); rec.maxGap=Math.max(rec.maxGap, gapNow);
      if(gapNow>3*P.followDist) rec.everSplit=true;
      if(cls!==rec.before) rec.lostShape=true;
      if(rec.everSplit){ rec.okRun = gapNow<=3*P.followDist ? rec.okRun+sampleEvery : 0; if(rec.regroup==null && rec.okRun>=5) rec.regroup=+(tr-rec.okRun+sampleEvery).toFixed(1); }
      if(rec.lostShape){ rec.shRun = cls===rec.before ? rec.shRun+sampleEvery : 0; if(rec.reshape==null && rec.shRun>=5) rec.reshape=+(tr-rec.shRun+sampleEvery).toFixed(1); }
      if(tr>=30.2 && !evs.some(e=>!e.fired)){ recovery.push(recOut(rec)); rec=null; } }
    if(opts.timeline && samples%opts.timeline===0)
      timeline.push(`${t.toFixed(0)}s front=#${f} L${L}/R${R} ${cls} fatigue=${S.birds.map(b=>(b.fatigue||0).toFixed(2)).join(',')}`);
  }
  if(rec) recovery.push({...recOut(rec), unfinished:true});
  const pct=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Math.round(100*v/Math.max(1,samples))]));
  const avg=v=>v&&v[1]>0? +(v[0]/v[1]).toFixed(1) : null;
  return {
    shape:pct(shape), armBalance:pct(balance),
    stringPct:{'2':Math.round(100*stringLen[2]/Math.max(1,samples)),'3':Math.round(100*stringLen[3]/Math.max(1,samples)),'4':Math.round(100*stringLen[4]/Math.max(1,samples)),'5+':Math.round(100*stringLen[5]/Math.max(1,samples))}, longestString, string3Cruise:Math.round(100*cruiseStr3/Math.max(1,cruiseSamples)), string3Skim:Math.round(100*skimStr3/Math.max(1,skimSamples)),
    armEnds:+(ends/Math.max(1,samples)).toFixed(1), branchedPct:Math.round(100*branched/Math.max(1,samples)),
    interiorPct:Math.round(100*interiorAcc/Math.max(1,samples)),
    powerInterior:intPow[1]?+(intPow[0]/intPow[1]).toFixed(1):null, powerEdge:edgePow[1]?+(edgePow[0]/edgePow[1]).toFixed(1):null,
    inlinePct:Math.round(100*rel.inline/Math.max(1,rel.inline+rel.stag)),
    inlineDy:inDy[1]?+(inDy[0]/inDy[1]).toFixed(2):null,  // mean height offset (m) of an in-line bird from the one ahead
    inlineSkimPct:Math.round(100*relSk.inline/Math.max(1,relSk.inline+relSk.stag)),
    leadChanges, passes, frontShare:frontT.map(v=>Math.round(100*v/(total-warm))),
    powerSolo:avg(pr.solo), powerDraft:avg(pr.draft),
    powerByPhase:Object.fromEntries(Object.entries(pr).filter(([k])=>k.includes('_')).map(([k,v])=>[k,avg(v)])),
    skim: skimSteps? {minTip:+minTip.toFixed(2), tipTouchPct:+(100*tipTouch/(skimSteps*n)).toFixed(2), meanY:+(skimY/(skimSteps*n)).toFixed(2), meanSpeed:+(skimSpd/(skimSteps*n)).toFixed(1), flapPct:Math.round(100*skimFlap/(skimSteps*n))} : null,
    armLongShare: vArm[1]? +(vArm[0]/vArm[1]).toFixed(2) : null,
    armRatioMedian: ratios.length? +ratios.sort((p,q)=>p-q)[ratios.length>>1].toFixed(2) : null,
    sameSideAsPrevPct: sideSame[1]? Math.round(100*sideSame[0]/sideSame[1]) : null,
    finalSides: lastSides,
    recovery,
    mainGroupPct:Math.round(100*mainAcc/Math.max(1,samples)),   // share of the birds in the biggest connected group
    splitPct:Math.round(100*splitN/Math.max(1,samples)), followDy:fDy[1]?+(fDy[0]/fDy[1]).toFixed(2):null,
    obstacle: obsN? {overPct:+(100*obsN/(samples*n)).toFixed(1), minClear:+minObs.toFixed(2), hitPct:+(100*obsHit/obsN).toFixed(1)} : null,
    minY:+minY.toFixed(2), minPair:+minPair.toFixed(2), closeCallPct:+(100*closeCalls/Math.max(1,samples)).toFixed(1), maxSpreadAlong:+maxSpread.toFixed(1), timeline};
};
