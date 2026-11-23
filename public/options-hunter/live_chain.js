(function(){
'use strict';
const $ = id => document.getElementById(id);
const api = String(window.FOXEL_OPTIONS_API_BASE || '').replace(/\/$/, '');
const status=$('chainStatus'), expiry=$('chainExpiry'), table=$('chainTable'), tbody=table?.querySelector('tbody');
if(!status||!expiry||!tbody)return;
let rows=[],generation=0,page=0,partial=false,quoteStatus='';
const ticker=()=>String($('ticker')?.value||'').toUpperCase();
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const fmt=(x,d=2)=>num(x)!==null?x.toFixed(d):'Not available';
const money=x=>num(x)!==null?'$'+x.toFixed(2):'Not available';
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
  const spot=reference(),range=$('chainDistance').value,position=$('chainPosition').value;
  if((range!=='all'||position!=='all')&&spot===null)return [];
  const selected=rows.filter(item=>{
    if(num(item.strike)===null)return false;
    if(position==='below'&&item.strike>=spot)return false;
    if(position==='above'&&item.strike<=spot)return false;
    if(range!=='all'){
      const pct=distance(item,spot),[low,high]=range.split('-').map(Number);
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
function addCell(tr,value,mono=false){const td=tr.insertCell();td.textContent=String(value);if(mono)td.className='mono';return td;}
function showDetail(item,tr,spot){
  const detail=tbody.insertRow();detail.className='chain-detail-row';
  const cell=detail.insertCell();cell.colSpan=9;
  const bid=num(item.bid),ask=num(item.ask),strike=num(item.strike);
  const valid=bid!==null&&ask!==null&&bid>=0&&ask>=bid;
  const midpoint=valid?(bid+ask)/2:null;
  const intrinsic=spot!==null&&strike!==null?(item.type==='call'?Math.max(spot-strike,0):Math.max(strike-spot,0)):null;
  const timeValue=midpoint!==null&&intrinsic!==null?midpoint-intrinsic:null;
  const rowsText=[
    'Contract: '+(item.symbol||'Not available'),
    'Quote recorded: '+(item.quote_timestamp||'Not available'),
    'Bid / Ask per share: '+money(bid)+' / '+money(ask),
    'Exercise value per share: '+(intrinsic===null?'Enter stock price':money(intrinsic)),
    'Time & volatility value per share (indicative midpoint less exercise value): '+(timeValue===null?'Not available':money(timeValue)),
    timeValue!==null&&timeValue<0?'WARNING: Negative time value indicates an inconsistent/stale price or reference; do not use this estimate.':'',
    'IV: '+(num(item.implied_volatility)===null?'Unavailable from provider':(item.implied_volatility*100).toFixed(1)+'% annualized'),
    'Delta: '+(num(item.delta)===null?'Unavailable from provider':fmt(item.delta,3)),
    'These numbers are indicative, not executable or a profitability forecast.'
  ].filter(Boolean);
  const wrap=document.createElement('div');wrap.style.cssText='padding:12px 10px;line-height:1.7;white-space:pre-line;text-align:left';
  wrap.textContent=rowsText.join('\n');cell.appendChild(wrap);
  tr.setAttribute('aria-expanded','true');
}
function display(){
  const records=filtered(),spot=reference(),limit=Number($('chainMax').value)||40;
  const pages=Math.ceil(records.length/limit);page=Math.max(0,Math.min(page,pages-1));
  const visible=records.slice(page*limit,(page+1)*limit);
  tbody.replaceChildren();
  if(!visible.length){const c=tbody.insertRow().insertCell();c.colSpan=9;c.textContent=rows.length&&spot===null&&($('chainDistance').value!=='all'||$('chainPosition').value!=='all')?'Enter a stock price to apply these filters.':'No matching contracts.';}
  for(const item of visible){
    const bid=num(item.bid),ask=num(item.ask),strike=num(item.strike);
    const valid=bid!==null&&ask!==null&&bid>=0&&ask>=bid;
    const pct=distance(item,spot);
    const tr=tbody.insertRow();
    addCell(tr,item.type);
    addCell(tr,fmt(strike),true);
    addCell(tr,pct===null?'Enter stock price':pct.toFixed(1)+'%');
    addCell(tr,money(bid===null?null:bid*100),true);
    addCell(tr,money(ask===null?null:ask*100),true);
    addCell(tr,valid?money((ask-bid)*100):'Not available');
    addCell(tr,num(item.implied_volatility)===null?'Not available':(item.implied_volatility*100).toFixed(1)+'%');
    addCell(tr,fmt(item.delta,3));
    const cell=tr.insertCell(),btn=document.createElement('button');
    btn.type='button';btn.textContent='View details';btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',()=>{
      const expanded=btn.getAttribute('aria-expanded')==='true';
      if(expanded){const next=tr.nextElementSibling;if(next?.classList.contains('chain-detail-row'))next.remove();btn.setAttribute('aria-expanded','false');btn.textContent='View details';}
      else{showDetail(item,tr,spot);btn.setAttribute('aria-expanded','true');btn.textContent='Hide details';}
    });
    cell.appendChild(btn);
  }
  $('chainPage').textContent='Page '+(pages?page+1:0)+' of '+pages;
  $('chainPrevious').disabled=page<=0;
  $('chainNext').disabled=page>=pages-1;
  $('chainSummary').textContent=records.length+' matching / '+rows.length+' returned contracts'+(partial?' · Chain may be incomplete':'')+(spot===null?' · Enter stock price for distance and valuation':'')+'.';
  const iv=rows.filter(x=>num(x.implied_volatility)!==null).length,delta=rows.filter(x=>num(x.delta)!==null).length;
  $('chainGreeksStatus').textContent='Greeks coverage (entire returned chain): IV '+iv+'/'+rows.length+' · Delta '+delta+'/'+rows.length+(rows.length&&iv===0&&delta===0?' · Provider supplied no usable IV/Delta; inspect later-dated, near-the-money contracts with nonzero bids and asks.':'');
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
    note((r.quote_status||'Indicative')+(r.partial?' | Discovery incomplete':''));
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
    note(quoteStatus+' | '+rows.length+' contracts'+(partial?' | Partial chain; results incomplete':'')+' | Choose a row for quote details');
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
