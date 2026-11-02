// Injected into the lab page by harness.mjs. Runs the flock physics headless (no rendering) and
// summarizes the structure that emerges: formation shape, who leads and how often that changes,
// what leading vs drafting costs, and basic safety (altitude, spacing, straggling).
//
// opts: { secs, warm, P: {param overrides}, setup: "js run before reset", timeline: N }
window.__run = function(opts){
  const S=__sim, P=S.P;
  Object.assign(P, JSON.parse(JSON.stringify(DEFAULTS)), opts.P||{});   // fresh defaults every run
  if(opts.setup) (new Function(opts.setup))();
  if(opts.reset!==false) S.resetState();
  const dt=1/480, total=opts.secs||120, sampleEvery=0.5, warm=opts.warm||20;
  const n=S.birds.length;
  const frontT=new Array(n).fill(0), pr={solo:[0,0],draft:[0,0]};
  const wasPassing=new Array(n).fill(false);
  let closeCalls=0, passes=0, lastFront=-1, leadChanges=0, t=0, nextS=0, minY=1e9, minPair=1e9, maxSpread=0, samples=0;
  const shape={line:0,V:0,echelon:0,filled:0,mixed:0}, rel={inline:0,stag:0}, relSk={inline:0,stag:0};
  const intPow=[0,0], edgePow=[0,0]; let interiorAcc=0;
  const balance={symmetric:0,lopsided:0,oneSided:0}, stringLen=[0,0,0,0,0,0]; let longestString=1;
  const timeline=[];
  while(t<total){
    S.integrate(dt); t+=dt;
    S.birds.forEach((b,i)=>{ const p=b.passing!=null; if(p&&!wasPassing[i]) passes++; wasPassing[i]=p; });
    if(t<warm) continue;
    for(const b of S.birds) minY=Math.min(minY,b.pos.y);
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
    let L=0,R=0,nInt=0, close=false;
    for(let i=0;i<n;i++){
      for(let j=i+1;j<n;j++){ const d=S.birds[i].pos.distanceTo(S.birds[j].pos); minPair=Math.min(minPair,d); if(d<1.2) close=true; }
      if(i===f) continue;
      const c=C[i]-C[f]; if(c<-0.7) L++; else if(c>0.7) R++;
      // in-line vs staggered relative to the nearest bird ahead
      let best=-1,bd=1e9;
      for(let j=0;j<n;j++){ if(j===i) continue; const da=A[j]-A[i]; if(da<0.3||da>15) continue; const d=Math.hypot(da,C[j]-C[i]); if(d<bd){bd=d;best=j;} }
      if(best>=0){ const Q=(S.skimState==='skim')?relSk:rel; if(Math.abs(C[best]-C[i])<0.7) Q.inline++; else Q.stag++; }
      // interior = birds ahead of me on BOTH sides (inside the formation, not on an arm's outer edge)
      let aL=false, aR=false;
      for(let j=0;j<n;j++){ if(j===i) continue; const da=A[j]-A[i], dc=C[j]-C[i]; if(da>0.5&&da<7){ if(dc<-0.8&&dc>-5) aL=true; if(dc>0.8&&dc<5) aR=true; } }
      const P_=(aL&&aR)?intPow:edgePow; P_[0]+=S.birds[i].pS||0; P_[1]++; if(aL&&aR) nInt++;
    }
    if(close) closeCalls++;
    // arm balance (birds out to each side of the front bird)
    { const mn=Math.min(L,R), mx=Math.max(L,R);
      if(L+R>0){ if(mn===0) balance.oneSided++; else if(mx>=2*mn+1 || mx-mn>=3) balance.lopsided++; else balance.symmetric++; } }
    // single-file strings: longest chain where each bird sits within 0.7 m sideways of the nearest bird ahead
    { const ahead=new Array(n).fill(-1);
      for(let i=0;i<n;i++){ let bd=1e9; for(let j=0;j<n;j++){ if(j===i) continue; const da=A[j]-A[i]; if(da<0.3||da>8) continue; const d=Math.hypot(da,C[j]-C[i]); if(d<bd){bd=d; ahead[i]=j;} } }
      let best=1;
      for(let i=0;i<n;i++){ let k=i, len=1; while(ahead[k]>=0 && Math.abs(C[ahead[k]]-C[k])<0.7 && len<n){ k=ahead[k]; len++; } best=Math.max(best,len); }
      longestString=Math.max(longestString,best); stringLen[Math.min(best,5)]++; }
    maxSpread=Math.max(maxSpread, Math.max(...A)-Math.min(...A));
    // whole-flock shape from the front bird: birds out to its left / right
    const nf=n-1; let cls;
    interiorAcc += nf>0 ? nInt/nf : 0;
    if(nInt >= Math.max(2, Math.round(0.2*nf))) cls='filled';           // diamond / lattice, not a V
    else if(L+R <= Math.max(1,Math.round(nf*0.25))) cls='line';
    else if(L>=Math.max(2,nf*0.25) && R>=Math.max(2,nf*0.25)) cls='V';
    else if(Math.min(L,R)<=1) cls='echelon'; else cls='mixed';
    shape[cls]++;
    if(opts.timeline && samples%opts.timeline===0)
      timeline.push(`${t.toFixed(0)}s front=#${f} L${L}/R${R} ${cls} fatigue=${S.birds.map(b=>(b.fatigue||0).toFixed(2)).join(',')}`);
  }
  const pct=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Math.round(100*v/Math.max(1,samples))]));
  const avg=v=>v&&v[1]>0? +(v[0]/v[1]).toFixed(1) : null;
  return {
    shape:pct(shape), armBalance:pct(balance),
    stringPct:{'2':Math.round(100*stringLen[2]/Math.max(1,samples)),'3':Math.round(100*stringLen[3]/Math.max(1,samples)),'4':Math.round(100*stringLen[4]/Math.max(1,samples)),'5+':Math.round(100*stringLen[5]/Math.max(1,samples))}, longestString,
    interiorPct:Math.round(100*interiorAcc/Math.max(1,samples)),
    powerInterior:intPow[1]?+(intPow[0]/intPow[1]).toFixed(1):null, powerEdge:edgePow[1]?+(edgePow[0]/edgePow[1]).toFixed(1):null,
    inlinePct:Math.round(100*rel.inline/Math.max(1,rel.inline+rel.stag)),
    inlineSkimPct:Math.round(100*relSk.inline/Math.max(1,relSk.inline+relSk.stag)),
    leadChanges, passes, frontShare:frontT.map(v=>Math.round(100*v/(total-warm))),
    powerSolo:avg(pr.solo), powerDraft:avg(pr.draft),
    powerByPhase:Object.fromEntries(Object.entries(pr).filter(([k])=>k.includes('_')).map(([k,v])=>[k,avg(v)])),
    minY:+minY.toFixed(2), minPair:+minPair.toFixed(2), closeCallPct:+(100*closeCalls/Math.max(1,samples)).toFixed(1), maxSpreadAlong:+maxSpread.toFixed(1), timeline};
};
