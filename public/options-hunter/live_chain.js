(function(){
'use strict';
const $ = id => document.getElementById(id);
const api = String(window.FOXEL_OPTIONS_API_BASE || '').replace(/\/$/, '');
const status=$('chainStatus'), expiry=$('chainExpiry'), table=$('chainTable'), tbody=table?.querySelector('tbody');
if(!status || !expiry || !tbody) return;
let rows=[], generation=0, page=0, partial=false, quoteStatus='';
const ticker=()=>String($('ticker')?.value||'').toUpperCase();
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const fmt=(x,d=2)=>num(x)!==null?x.toFixed(d):'—';
const reference=()=>{const raw=String($('chainReference').value||'').trim();const n=Number(raw);return raw&&Number.isFinite(n)&&n>0?n:null};
const note=t=>{status.textContent=t};
async function get(path){
  const r=await fetch(api+path,{credentials:'omit',headers:{Accept:'application/json'}});
  let j={};try{j=await r.json()}catch{}
  if(!r.ok)throw Error(typeof j.detail==='string'?j.detail:'HTTP '+r.status);
  return j;
}
const distance=(item,spot)=>spot===null?null:Math.abs(item.strike/spot-1)*100;
function filtered(){
  const spot=reference(), range=$('chainDistance').value, position=$('chainPosition').value;
  if((range!=='all'||position!=='all')&&spot===null)return [];
  const selected=rows.filter(item=>{
    if(num(item.strike)===null)return false;
    if(position==='below'&&item.strike>=spot)return false;
    if(position==='above'&&item.strike<=spot)return false;
    if(range!=='all'){
      const pct=distance(item,spot);const [low,high]=range.split('-').map(Number);
      if(pct===null||pct<low||(range==='25-100'?pct<=25:pct>=high))return false;
    }
    return true;
  });
  const mode=$('chainSort').value;
  selected.sort((a,b)=>{
    if(mode==='strike_up')return a.strike-b.strike;
    if(mode==='strike_down')return b.strike-a.strike;
    if(mode==='bid_down')return (num(b.bid)??-1)-(num(a.bid)??-1);
    if(mode==='spread_up'){
      const width=o=>num(o.bid)!==null&&num(o.ask)!==null&&o.ask>=o.bid?o.ask-o.bid:Infinity;
      return width(a)-width(b);
    }
    return spot!==null?Math.abs(a.strike-spot)-Math.abs(b.strike-spot):a.strike-b.strike;
  });
  return selected;
}
function display(){
  const records=filtered(),spot=reference(),limit=Number($('chainMax').value)||40;
  const pages=Math.ceil(records.length/limit);page=Math.max(0,Math.min(page,pages-1));
  const visible=records.slice(page*limit,(page+1)*limit);
  tbody.replaceChildren();
  if(!visible.length){const c=tbody.insertRow().insertCell();c.colSpan=11;c.textContent=rows.length&&spot===null&&($('chainDistance').value!=='all'||$('chainPosition').value!=='all')?'Enter reference stock price to use selected filters.':'No matching contracts.';}
  for(const item of visible){
    const bid=num(item.bid),ask=num(item.ask),strike=num(item.strike);
    const valid=bid!==null&&ask!==null&&bid>=0&&ask>=bid;
    const midpoint=valid?(bid+ask)/2:null;
    const intrinsic=spot!==null&&strike!==null?(item.type==='call'?Math.max(spot-strike,0):Math.max(strike-spot,0)):null;
    const extrinsic=midpoint!==null&&intrinsic!==null?Math.max(midpoint-intrinsic,0):null;
    const pct=distance(item,spot);
    const tr=tbody.insertRow();
    [item.type,fmt(strike),pct===null?'—':pct.toFixed(1)+'%',fmt(bid),fmt(ask),valid?fmt(ask-bid):'—',bid===null?'—':'$'+fmt(bid*100),fmt(item.implied_volatility,3),fmt(item.delta,3),fmt(intrinsic),fmt(extrinsic)].forEach((value,i)=>{
      const td=tr.insertCell();td.textContent=String(value);if(i===1||i===3||i===4)td.className='mono';
    });
    tr.title=(item.symbol||'')+' | quote: '+(item.quote_timestamp||'unavailable')+' | underlying reference: '+(spot===null?'not supplied':spot);
  }
  $('chainPage').textContent='Page '+(pages?page+1:0)+' of '+pages;
  $('chainPrevious').disabled=page<=0;
  $('chainNext').disabled=page>=pages-1;
  $('chainSummary').textContent=records.length+' matching / '+rows.length+' returned contracts'+(partial?' · Chain may be incomplete':'')+(spot===null?' · Enter underlying price for distance metrics':'')+'.';
}
async function loadDates(){
  const g=++generation,t=ticker();rows=[];partial=false;page=0;display();expiry.replaceChildren(new Option('Loading…',''));
  if(!api){note('Set FOXEL_OPTIONS_API_BASE in frontend config.js');return;}
  note('Loading '+t+' expirations from Alpaca…');
  try{
    const r=await get('/api/options-hunter/expirations?symbol='+encodeURIComponent(t));
    if(g!==generation)return;
    const dates=Array.isArray(r.expirations)?r.expirations:[];
    expiry.replaceChildren(...dates.map(d=>new Option(d,d)));
    if(!dates.length){expiry.add(new Option('No expirations',''));note('No expirations returned (next 45 days)'+(r.partial?' — incomplete listing':''));return;}
    note(r.quote_status+(r.partial?' | Discovery incomplete':''));
    await loadChain(g);
  }catch(e){if(g!==generation)return;expiry.replaceChildren(new Option('Unavailable',''));note(e.message);}
}
async function loadChain(g){
  const requestId=g??++generation,t=ticker(),ex=expiry.value,side=$('chainSide').value;
  if(!ex)return;
  note('Loading '+t+' '+side+' contracts expiring '+ex+'…');
  try{
    const r=await get('/api/options-hunter/chain?symbol='+encodeURIComponent(t)+'&expiration='+encodeURIComponent(ex)+'&side='+encodeURIComponent(side));
    if(requestId!==generation||t!==ticker()||ex!==expiry.value)return;
    rows=Array.isArray(r.contracts)?r.contracts:[];partial=!!r.partial;quoteStatus=r.quote_status||'Indicative';page=0;display();
    note(quoteStatus+' | '+rows.length+' contracts'+(partial?' | Partial chain; results incomplete':'')+' | Hover over rows for quote timestamps');
  }catch(e){if(requestId!==generation)return;rows=[];partial=false;display();note(e.message);}
}
function reFilter(){page=0;display();}
$('ticker')?.addEventListener('change',loadDates);
expiry.addEventListener('change',()=>{const g=++generation;loadChain(g);});
$('chainSide').addEventListener('change',()=>{const g=++generation;loadChain(g);});
for(const id of ['chainReference','chainDistance','chainPosition','chainSort','chainMax'])$(id).addEventListener(id==='chainReference'?'input':'change',reFilter);
$('chainReload').addEventListener('click',loadDates);
$('chainPrevious').addEventListener('click',()=>{page=Math.max(0,page-1);display();});
$('chainNext').addEventListener('click',()=>{page++;display();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadDates);else loadDates();
})();
