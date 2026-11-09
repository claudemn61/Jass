const E = require('../engine.js');
let seed=1; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
function playRound(smart, chooser){
  const hands=E.deal(rnd); const start=hands.map(h=>h.slice());
  let t=E.botChooseTrump(hands[chooser],true), pushed=false;
  if(t==='push'){pushed=true;t=E.botChooseTrump(hands[(chooser+2)%4],false);}
  let turn=chooser, played=[], trickPts=[0,0], tricks=[0,0];
  for(let k=0;k<9;k++){ const trick=[];
    for(let i=0;i<4;i++){ const p=(turn+i)%4; const legal=E.legalCards(hands[p],trick,t);
      let c = smart[E.team(p)] ? E.botPlay({hand:hands[p],trick,t,played,p,declarer:chooser}) : legal[Math.floor(rnd()*legal.length)];
      if(!legal.includes(c)) throw new Error('illegal');
      hands[p]=hands[p].filter(x=>x!==c); trick.push({p,c}); }
    const w=trick[E.trickWinnerIdx(trick,t)].p; const pts=trick.reduce((s,e)=>s+E.points(e.c,t),0)+(k===8?5:0);
    trickPts[E.team(w)]+=pts; tricks[E.team(w)]++; played.push(...trick.map(e=>e.c)); turn=w; }
  if(trickPts[0]+trickPts[1]!==157) throw new Error('sum '+trickPts);
  const weis=E.resolveWeis(start,t,chooser); const st=E.findStoeck(start,t);
  return {t,pushed,res:E.scoreRound({trump:t,trickPts,tricks,weis,stoeck:st},'stufe')};
}
for (const smart of [[true,true],[true,false]]) {
  let tot=[0,0], push=0, modes=[0,0,0,0,0,0], matches=0; const N=4000;
  for(let i=0;i<N;i++){ const r=playRound(smart,i%4); tot[0]+=r.res.trick[0];tot[1]+=r.res.trick[1]; if(r.pushed)push++; modes[r.t]++; if(r.res.match!=null)matches++; }
  console.log(smart, 'avg trick pts', tot.map(x=>(x/N).toFixed(1)), 'push%',(100*push/N).toFixed(0),'modes',modes,'matches',matches);
}
// Regeltests
const id=(s,r)=>s*9+r;
console.log('legal buur only trump:', E.legalCards([id(0,5),id(1,0)],[{p:1,c:id(0,8)}],0));
console.log('no undertrump:', E.legalCards([id(0,0),id(2,1)],[{p:1,c:id(1,0)},{p:2,c:id(0,8)}],0));
console.log('weis:', JSON.stringify(E.findWeis([id(1,0),id(1,1),id(1,2),id(1,3),id(0,5),id(1,5),id(2,5),id(3,5)])));
