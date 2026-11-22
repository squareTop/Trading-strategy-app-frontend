(function(){
'use strict';
const $=id=>document.getElementById(id), api=String(window.FOXEL_OPTIONS_API_BASE||'').replace(/\/$/,'');
const status=$('chainStatus'), expiry=$('chainExpiry'), tbl=$('chainTable')?.querySelector('tbody');
if(!status||!expiry||!tbl)return;
let rows=[],generation=0;
const ticker=()=>String($('ticker')?.value||'').toUpperCase();
const fmt=(x,d=2)=>typeof x==='number'&&Number.isFinite(x)?x.toFixed(d):'—';
const note=t=>{status.textContent=t};
async function get(path){const r=await fetch(api+path,{credentials:'omit',headers:{'Accept':'application/json'}});let j={};try{j=await r.json()}catch{};if(!r.ok)throw Error(typeof j.detail==='string'?j.detail:'HTTP '+r.status);return j}
function render(){tbl.replaceChildren();const max=Number($('chainMax')?.value||40);if(!rows.length){const c=tbl.insertRow().insertCell();c.colSpan=10;c.textContent='No contracts returned';return}
for(const item of rows.slice(0,max)){const tr=tbl.insertRow(); const vals=[item.type,fmt(item.strike),fmt(item.bid),fmt(item.ask),fmt(item.implied_volatility,3),fmt(item.delta,3),'—','—','—','—'];vals.forEach((v,i)=>{const cell=tr.insertCell();cell.textContent=String(v);if(i===1)cell.className='mono'});tr.title=item.symbol+' | quote '+(item.quote_timestamp||'not supplied')}
}
async function loadDates(){const g=++generation,t=ticker();rows=[];render();expiry.replaceChildren(new Option('Loading…',''));if(!api){note('Set FOXEL_OPTIONS_API_BASE in frontend config.js');return}note('Loading '+t+' expirations from Alpaca…');try{const r=await get('/api/options-hunter/expirations?symbol='+encodeURIComponent(t));if(g!==generation)return;expiry.replaceChildren(...r.expirations.map(d=>new Option(d,d)));if(!r.expirations.length){expiry.add(new Option('No expirations found',''));note('No expirations returned; discovery window is 45 days'+(r.partial?' (partial)':''));return}note(r.quote_status+(r.partial?' | Incomplete discovery':''));await loadChain(g)}catch(e){if(g!==generation)return;expiry.replaceChildren(new Option('Unavailable',''));note(e.message)}}
async function loadChain(parent){const g=parent??++generation,t=ticker(),ex=expiry.value,side=$('chainSide').value;if(!ex)return;note('Loading '+t+' contracts expiring '+ex+'…');try{const r=await get('/api/options-hunter/chain?symbol='+encodeURIComponent(t)+'&expiration='+encodeURIComponent(ex)+'&side='+side);if(g!==generation||t!==ticker()||ex!==expiry.value)return;rows=r.contracts||[];render();note(r.quote_status+' | '+rows.length+' contracts'+(r.partial?' | Partial chain; narrow your search':'')+' | Quote timestamps: hover over rows')}catch(e){if(g!==generation)return;rows=[];render();note(e.message)}}
$('ticker')?.addEventListener('change',loadDates);
expiry.addEventListener('change',()=>{++generation;loadChain(generation)});
$('chainSide').addEventListener('change',()=>{++generation;loadChain(generation)});
$('chainMax').addEventListener('change',render);
$('chainReload').addEventListener('click',loadDates);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadDates);else loadDates();
})();
