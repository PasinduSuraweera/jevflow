import {svg,setIcon,face,setFace} from './icons.js';
import {createWorld,decisionContext,applyDecision,recordDecision,upgradeVillage,ACTIONS,UPGRADES,PLACES,HOMES,HATS,PRESETS,OPENABLE,MAX_VILLAGERS,DEFAULT_RULES,WEATHER_NEWS,isNight,isOpen,hourOf,tick,RequestGate,bondOf,addVillager,editVillager,removeVillager,setRule,applyPreset,saveWorld,restoreWorld,councilContext,councilDue,affordableUpgrades,applyCouncil,islandRadius,knownFor} from './village-engine.js';
const $=id=>document.getElementById(id);
const world=createWorld(),gate=new RequestGate();let selected=world.villagers[0].id,playing=false,ready=false,view=null,meetingActive=false,todayKey='',epoch=0,cursor=0,lastFrame=0,lastUI=0,rosterKey='',bondsKey='',editing=null,confirming=null;
const current=()=>world.villagers.find(v=>v.id===selected)||world.villagers[0];
const hex=n=>'#'+(n>>>0).toString(16).padStart(6,'0').slice(-6);
const title=s=>s[0].toUpperCase()+s.slice(1);
const WEATHER_ICON={sunny:'sun',cloudy:'cloud',rainy:'rain',stormy:'storm',snowy:'snow'};
const HAT_NAMES={none:'No hat',straw:'Straw hat',beanie:'Beanie',chef:'Baker\'s hat',flower:'Flower crown'};
function budget(){return Math.max(1,Math.min(300,Number($('budget').value)||30));}
function timeString(){const minutes=Math.floor(world.time);return `Day ${Math.floor(minutes/1440)+1} · ${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function journal(message,icon){const li=document.createElement('li'),time=document.createElement('time');time.textContent=timeString().split(' · ')[1];li.append(time);if(icon)li.append(svg(icon));li.append(document.createTextNode(message));$('events').prepend(li);while($('events').children.length>60)$('events').lastElementChild.remove();}
function status(text){$('world-status').textContent=text;}
function settle(message){world.villagers.forEach(v=>{if(v.status==='thinking'){v.status='idle';v.thought=message;}});}
// Every in-flight request has its own controller so pausing or changing the world cancels all of them.
const inFlight=new Set();
function track(){const c=new AbortController(),timeout=setTimeout(()=>c.abort(),18000);inFlight.add(c);return {signal:c.signal,done(){clearTimeout(timeout);inFlight.delete(c);gate.finish();updateControls();}};}
function abortAll(){for(const c of inFlight)c.abort();}
function pause(message='Paused · the village can wait.'){playing=false;epoch++;abortAll();settle('Decision paused. No new activity was chosen.');setPlay(false);status(message);updateControls();}
function setPlay(on){setIcon($('play-icon'),on?'pause':'play');$('play-label').textContent=on?'Pause village':'Start village';}
const keyReady=()=>/^[\x21-\x7e]{8,512}$/.test($('key').value.trim());
function updateControls(){const key=keyReady(),spent=gate.used>=budget();$('play').disabled=!playing&&(!ready||!view||!key||spent);const full=gate.active>=gate.parallel;$('step').disabled=!ready||!view||!key||playing||full||spent;$('hold-meeting').disabled=!ready||!key||full||meetingActive||spent||!affordableUpgrades(world.treasury,world.upgrades).length;$('used').textContent=gate.used;$('limit').textContent=budget();$('in-flight').textContent=gate.active?`${gate.active} thinking now · up to ${gate.parallel} at once`:`Up to ${gate.parallel} at once`;}
function select(id,open=false){if(open)showPanel('inspector');selected=id;view?.select(id);markSelected();renderInspector(true);}
function markSelected(){for(const v of world.villagers){for(const node of [$('pick-'+v.id),$('card-'+v.id)]){if(!node)continue;node.classList.toggle('selected',v.id===selected);node.setAttribute('aria-pressed',String(v.id===selected));}}}
// Resident buttons and cards are rebuilt only when the roster changes.
function renderRoster(){
 const key=world.villagers.map(v=>v.id+':'+v.name+':'+v.color).join('|');if(key===rosterKey)return;rosterKey=key;
 $('resident-picker').replaceChildren(...world.villagers.map(v=>{const b=document.createElement('button');b.id='pick-'+v.id;b.type='button';b.dataset.resident=v.id;b.append(face(v),document.createTextNode(v.name));b.onclick=()=>select(v.id,true);return b;}));
 $('resident-cards').replaceChildren(...world.villagers.map(v=>{
  const card=document.createElement('button'),head=document.createElement('span'),name=document.createElement('b'),mood=document.createElement('small'),task=document.createElement('span'),meters=document.createElement('span');
  card.id='card-'+v.id;card.type='button';card.className='resident-card';card.dataset.resident=v.id;card.onclick=()=>select(v.id,true);head.className='resident-card-head';name.textContent=v.name;mood.id='mood-'+v.id;const portrait=face(v);portrait.id='face-'+v.id;head.append(portrait,name,mood);
  task.className='resident-task';const taskIcon=document.createElement('i'),taskText=document.createElement('span');taskIcon.id='taskicon-'+v.id;taskIcon.className='glyph';taskText.id='task-'+v.id;task.append(taskIcon,taskText);meters.className='resident-meters';
  for(const [label,key] of [['Hunger','hunger'],['Energy','energy'],['Joy','joy'],['Coins','coins']]){const span=document.createElement('span'),value=document.createElement('strong');value.id=key+'-'+v.id;span.append(document.createTextNode(label+' '),value);meters.append(span);}
  card.append(head,task,meters);return card;}));
 $('resident-count').textContent=world.villagers.length;$('add-resident').disabled=world.villagers.length>=MAX_VILLAGERS;
 markSelected();
}
function fillEditor(v){editing=v.id;$('edit-name').value=v.name;$('edit-personality').value=v.personality;$('edit-goal').value=v.goal||'';$('edit-color').value=hex(v.color);$('edit-hair').value=hex(v.hair??0x75553e);$('edit-hat').value=v.hat||'none';$('edit-home').value=v.home||'home';
 for(const key of ['hunger','energy','happiness']){$('edit-'+key).value=Math.round(v[key]);$('edit-'+key+'-value').textContent=Math.round(v[key]);}$('edit-money').value=v.money;$('edit-skill').value=v.skill||0;$('edit-error').hidden=true;confirming=null;$('edit-remove').textContent='Move away';$('edit-remove').disabled=world.villagers.length<=1;}
function renderInspector(full=false){const v=current();if(!v)return;setFace($('resident-face'),v);$('resident-name').textContent=v.name;$('coins').textContent=v.money+' coins';$('personality').textContent=v.personality;$('goal').textContent=v.goal?'Goal · '+v.goal:'';const role=knownFor(v);$('known-for').textContent=role?`Known around the village as ${role}`:'';
 const counts=v.today?.day===Math.floor(world.time/1440)?v.today.counts:{},entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]),dayKey=v.id+JSON.stringify(entries);
 if(dayKey!==todayKey){todayKey=dayKey;$('today-log').replaceChildren(...(entries.length?entries.map(([id,n])=>{const chip=document.createElement('span');chip.className='today-chip'+(n>=3?' routine':'');chip.title=`${ACTIONS[id].label}: ${n} today`;chip.append(svg(ACTIONS[id].icon),document.createTextNode(n>1?'×'+n:''));return chip;}):[Object.assign(document.createElement('span'),{className:'today-empty',textContent:'Nothing done yet today'})]));}$('skill-stars').textContent='★'.repeat(v.skill||0)+'☆'.repeat(5-(v.skill||0));
 $('activity').textContent=v.status==='thinking'?'A new choice':v.status==='acting'?'Right now':v.status==='walking'?(v.gait==='run'?'On the run':'On the way'):v.status==='idle'?'Taking a moment':'At the door';$('thought').textContent=v.thought;
 for(const [key,title,value] of [['hunger','Hunger · lower is better',v.hunger],['energy','Energy',v.energy],['happiness','Happiness',v.happiness]]){let row=$('need-'+key);if(!row){row=document.createElement('div');row.className='need';row.id='need-'+key;const label=document.createElement('div'),name=document.createElement('span'),num=document.createElement('span'),bar=document.createElement('progress');name.textContent=title;num.id='value-'+key;bar.id='bar-'+key;bar.max=100;bar.setAttribute('aria-label',title);label.append(name,num);row.append(label,bar);$('needs').append(row);}$('value-'+key).textContent=Math.round(value);$('bar-'+key).value=value;}
 const progress=v.status==='acting'?1-v.remaining/ACTIONS[v.action].duration:0;$('activity-progress').value=progress*100;$('activity-progress').hidden=v.status!=='acting';
 const others=world.villagers.filter(x=>x.id!==v.id),key=v.id+others.map(x=>x.name+Math.round(bondOf(world,v.id,x.id))).join();
 if(key!==bondsKey){bondsKey=key;$('bonds').replaceChildren(...others.map(x=>{const row=document.createElement('div'),name=document.createElement('span'),bar=document.createElement('progress'),value=Math.round(bondOf(world,v.id,x.id));row.className='bond';name.append(face(x),document.createTextNode(`${x.name} · ${value>=80?'best friends':value>=60?'close':value>=40?'friendly':'distant'}`));bar.max=100;bar.value=value;bar.setAttribute('aria-label',`Friendship with ${x.name}`);row.append(name,bar);return row;}));}
 if(editing!==v.id)fillEditor(v);
 if(full){$('probabilities').replaceChildren();$('decision-empty').hidden=!!v.last;$('decision-json').textContent=v.last?JSON.stringify(v.last,null,2):'';$('decision-meta').textContent=v.last?`${v.last.model} · ${v.last.latencyMs} ms · ${Math.round(v.last.confidence*100)}% confidence`:'';$('companion-result').textContent=v.last?.companion?`Hoped to see ${v.last.companion.choice} (${Math.round(v.last.companion.confidence*100)}%)`:'';if(v.last)for(const [name,p] of Object.entries(v.last.probabilities).sort((a,b)=>b[1]-a[1])){const row=document.createElement('div');row.className='probability';const label=document.createElement('span'),value=document.createElement('span');if(ACTIONS[name])label.append(svg(ACTIONS[name].icon));label.append(document.createTextNode(name));value.textContent=(p*100).toFixed(1)+'%';row.append(label,value);$('probabilities').append(row);}}
}
async function ask(scenario,context,signal){
 const response=await fetch('/api/decision',{method:'POST',headers:{'Content-Type':'application/json','X-Jev-Key':$('key').value.trim()},body:JSON.stringify({scenario,context}),signal,cache:'no-store',credentials:'omit'});let result;try{result=await response.json();}catch{throw Error('The API backend returned an invalid response.');}if(!response.ok)throw Error(result.error||'Jev request failed.');
 if(result.mode!=='live'||result.type!=='choice'||!Number.isFinite(result.confidence))throw Error('Expected a real Jev choice.');return result;
}
function refuse(single){if(gate.used>=budget())pause('Request budget reached. Increase it to continue.');else if(single)status(gate.active>=gate.parallel?'Every decision slot is busy. One frees up in a moment.':'Pacing requests. Try again in a moment.');}
async function decide(single=false){
 if(!ready||!view)return;
 if(!single&&!meetingActive&&councilDue(world))return meeting();
 const n=world.villagers.length,v=Array.from({length:n},(_,i)=>world.villagers[(cursor+i)%n]).find(v=>v.status==='idle');if(!v){if(single)status('Everyone has an activity. Start the village to let them finish.');return;}
 if(!gate.reserve(performance.now(),budget())){refuse(single);return;}
 cursor=(world.villagers.indexOf(v)+1)%n;const startEpoch=epoch,request=track(),signal=request.signal;v.status='thinking';v.thought='Jev is choosing from the activities available right now.';updateControls();$('error').hidden=true;
 const context=decisionContext(world,v);
 try {const result=await ask('village',context,signal);if(startEpoch!==epoch||signal.aborted)return;v.last={...result,context};
 if(!applyDecision(world,v,result)){v.status='idle';v.thought='That activity is no longer available. Waiting for a fresh Jev decision.';journal(`${v.name}: the world changed; a fresh choice will be requested.`);}
 else{recordDecision(world,v,result);const friend=world.villagers.find(x=>x.id===v.companion);journal(`${v.name} chose ${result.decision} (${Math.round(result.confidence*100)}%)${friend?' hoping to see '+friend.name:''}.`,ACTIONS[result.decision].icon);status(single?`${v.name} has a plan. Start the village to watch it unfold.`:'Life is unfolding · real Jev decisions');}
 renderInspector(true);
 }catch(error){if(startEpoch===epoch){const timedOut=signal.aborted;v.status='idle';v.thought='Waiting. No fallback decision was made.';pause('Paused · a decision could not be completed.');$('error').textContent=timedOut?'Request timed out. Provider charges may still apply.':error.message;$('error').hidden=false;showPanel('controls');journal(`${v.name}'s request failed. No action was substituted.`);}}
 finally{request.done();}
}
// The village council asks Jev which community project to fund. Nothing is bought without a real answer.
async function meeting(){
 if(!ready||meetingActive)return;
 if(!affordableUpgrades(world.treasury,world.upgrades).length){status('The village fund cannot afford a new project yet.');return;}
 if(!gate.reserve(performance.now(),budget())){refuse(true);return;}
 world.council.lastDay=Math.floor(world.time/1440);meetingActive=true;const startEpoch=epoch,request=track(),signal=request.signal;status('The village council is meeting…');$('error').hidden=true;updateControls();
 try{const result=await ask('council',councilContext(world),signal);if(startEpoch!==epoch||signal.aborted)return;const outcome=applyCouncil(world,result),pct=Math.round(result.confidence*100);
  const message=outcome==='save'?`The council chose to keep saving the fund (${pct}%).`:outcome?`The council voted to ${UPGRADES[outcome].name.toLowerCase()} (${pct}%).`:'The council chose a project the fund can no longer afford.';
  journal(message);$('council-result').textContent=message;status(playing?'Life is unfolding · real Jev decisions':'The council has spoken.');renderTown();}
 catch(error){if(startEpoch===epoch){pause('Paused · the council meeting could not finish.');$('error').textContent=signal.aborted?'Request timed out. Provider charges may still apply.':error.message;$('error').hidden=false;showPanel('controls');journal('The council meeting failed. Nothing was bought.');}}
 finally{meetingActive=false;request.done();}
}
$('play').onclick=()=>{if(playing){pause();return;}if(!ready||!view||!$('key').value.trim()||gate.used>=budget())return;playing=true;showPanel(null);setPlay(true);$('error').hidden=true;status('Life is unfolding · real Jev decisions');updateControls();};
$('step').onclick=()=>decide(true);
$('hold-meeting').onclick=()=>meeting();
$('auto-council').onchange=()=>{world.council.auto=$('auto-council').checked;journal(world.council.auto?'The council will meet once a day when a project is affordable.':'The council will only meet when you call it.');};
$('clear-key').onclick=()=>{pause('Key cleared · village paused');$('key').value='';updateControls();};
$('key').oninput=()=>{pause('Ready when you are · press Start village');updateControls();};
$('parallel').onchange=()=>{gate.parallel=Math.max(1,Math.min(8,Number($('parallel').value)||4));updateControls();};
$('budget').onchange=()=>{$('budget').value=budget();updateControls();};
// Any change to the world invalidates in-flight decisions, so Jev always answers for the world as it is.
function influence(message){epoch++;abortAll();settle('The world changed. Waiting for a fresh decision.');world.version++;if(message)journal(message);syncConditions();renderInspector(true);renderTown();updateControls();}
function syncConditions(){
 $('weather-select').value=world.weather;$('season-select').value=world.season;$('auto-weather').checked=world.rules.autoWeather;$('season-days').value=String(world.rules.seasonDays);$('auto-council').checked=world.council.auto;$('bulletin').value=world.note;
 document.querySelectorAll('[data-open]').forEach(input=>input.checked=world.open[input.dataset.open]!==false);document.querySelectorAll('[data-event]').forEach(input=>input.checked=!!world.events[input.dataset.event]);
 for(const key of Object.keys(RULES)){$('rule-'+key).value=world.rules[key];$('rule-'+key+'-value').textContent=RULES[key][1](world.rules[key]);}$('rule-hours').checked=world.rules.hours;
}
document.querySelectorAll('[data-time]').forEach(button=>button.onclick=()=>{const hour=Number(button.dataset.time);world.time=Math.floor(world.time/1440)*1440+hour*60;influence(hour<9?'Dawn breaks over Willowglen.':hour<15?'The sun climbs to noon.':hour<20?'Dusk settles over the village.':'Night falls. Lanterns and stars come out.');});
$('weather-select').onchange=()=>{world.weather=$('weather-select').value;influence(WEATHER_NEWS[world.weather]);};
$('season-select').onchange=()=>{world.season=$('season-select').value;influence(`You turned the season to ${world.season}.`);};
$('auto-weather').onchange=()=>{setRule(world,'autoWeather',$('auto-weather').checked);influence(world.rules.autoWeather?'The weather now changes on its own.':'You hold the weather steady.');};
$('season-days').onchange=()=>{setRule(world,'seasonDays',Number($('season-days').value));influence(world.rules.seasonDays?`Seasons now turn every ${world.rules.seasonDays} day${world.rules.seasonDays>1?'s':''}.`:'The season stays as it is.');};
document.querySelectorAll('[data-open]').forEach(input=>input.onchange=()=>{world.open[input.dataset.open]=input.checked;influence(`${PLACES[input.dataset.open].name} ${input.checked?'opens its doors':'closes to new visitors'}.`);});
document.querySelectorAll('[data-event]').forEach(input=>input.onchange=()=>{world.events[input.dataset.event]=input.checked;influence(input.dataset.event==='festival'?(input.checked?'A festival fills the green with bunting and music.':'The festival packs up for another year.'):(input.checked?'A traveling merchant arrives, paying double for goods.':'The traveling merchant moves on.'));});
document.querySelectorAll('[data-stock]').forEach(button=>button.onclick=()=>{const key=button.dataset.stock,amount=key==='treasury'?5:3;world[key]=Math.min(99999,world[key]+amount);influence({food:'You added three meals to the café pantry.',wood:'You stacked three logs by the workshop.',goods:'You left three crafted goods at the market.',treasury:'You gave five coins to the village fund.'}[key]);});
$('post-bulletin').onclick=()=>{world.note=$('bulletin').value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,300);influence(world.note?`Notice posted: "${world.note}"`:'The bulletin board is empty.');};
$('clear-bulletin').onclick=()=>{world.note='';influence('The bulletin board is empty.');};
$('apply-preset').onclick=()=>{const id=$('preset').value;if(applyPreset(world,id))influence(`Scenario: ${PRESETS[id].name}. ${PRESETS[id].text}`);};
$('preset').onchange=()=>{$('preset-text').textContent=PRESETS[$('preset').value]?.text||'';};
$('preset').replaceChildren(...Object.entries(PRESETS).map(([id,p])=>{const o=document.createElement('option');o.value=id;o.textContent=p.name;return o;}));$('preset-text').textContent=PRESETS.cozy.text;
const coins=n=>n+(n===1?' coin':' coins');
const RULES={hunger:['Hunger pace',n=>'×'+n],energy:['Tiredness pace',n=>'×'+n],mood:['Mood fading',n=>'×'+n],mealPrice:['Café meal price',coins],wage:['Workshop wage',coins],goodsPrice:['Goods price',coins],community:['Village share per shift',coins],clock:['Day length',n=>Math.round(1440/n/60*10)/10+' min']};
for(const [key,[name,format]] of Object.entries(RULES)){const input=$('rule-'+key);input.oninput=()=>{$('rule-'+key+'-value').textContent=format(Number(input.value));};input.onchange=()=>{if(setRule(world,key,Number(input.value)))influence(`Rule: ${name} is now ${format(world.rules[key])}.`);};}
$('rule-hours').onchange=()=>{setRule(world,'hours',$('rule-hours').checked);influence(world.rules.hours?'Shops keep their opening hours again.':'Every shop now stays open around the clock.');};
$('reset-rules').onclick=()=>{world.rules={...DEFAULT_RULES,autoWeather:world.rules.autoWeather,seasonDays:world.rules.seasonDays};influence('The rules of Willowglen are back to normal.');};
// Resident editor.
$('edit-hat').replaceChildren(...HATS.map(h=>{const o=document.createElement('option');o.value=h;o.textContent=HAT_NAMES[h];return o;}));
$('edit-home').replaceChildren(...HOMES.map(h=>{const o=document.createElement('option');o.value=h;o.textContent=PLACES[h].name;return o;}));
for(const key of ['hunger','energy','happiness'])$('edit-'+key).oninput=()=>{$('edit-'+key+'-value').textContent=$('edit-'+key).value;};
$('edit-apply').onclick=()=>{const v=current(),before=v.name;try{editVillager(world,v.id,{name:$('edit-name').value,personality:$('edit-personality').value,goal:$('edit-goal').value,color:parseInt($('edit-color').value.slice(1),16),hair:parseInt($('edit-hair').value.slice(1),16),hat:$('edit-hat').value,home:$('edit-home').value,hunger:Number($('edit-hunger').value),energy:Number($('edit-energy').value),happiness:Number($('edit-happiness').value),money:Number($('edit-money').value),skill:Number($('edit-skill').value)});}catch(error){$('edit-error').textContent=error.message;$('edit-error').hidden=false;return;}
 editing=null;influence(before===v.name?`You reshaped ${v.name}'s circumstances.`:`${before} is now known as ${v.name}.`);renderRoster();};
$('edit-remove').onclick=()=>{const v=current();if(world.villagers.length<=1)return;if(confirming!==v.id){confirming=v.id;$('edit-remove').textContent=`Confirm ${v.name} leaves`;return;}if(removeVillager(world,v.id)){selected=world.villagers[0].id;editing=null;influence(`${v.name} packed a bag and moved away.`);renderRoster();select(selected);}};
$('add-resident').onclick=()=>{const v=addVillager(world);if(!v){status(`Willowglen has room for ${MAX_VILLAGERS} residents.`);return;}influence(`${v.name} moved into Willowglen.`);renderRoster();select(v.id,true);$('edit-details').open=true;};
// Saves hold the world only. Keys stay in the password field.
const SAVE_KEY='willowglen-save-v1';
function replaceWorld(next,message){pause('Village loaded · press Start village');for(const key of Object.keys(world))delete world[key];Object.assign(world,next);selected=world.villagers[0].id;cursor=0;editing=null;rosterKey='';bondsKey='';$('council-result').textContent='';renderRoster();influence(message);select(selected);}
function load(data,message){let next;try{next=restoreWorld(data);}catch(error){status(error.message);return;}replaceWorld(next,message);}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save-world').onclick=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(saveWorld(world)));journal('Village saved in this browser. Your key was not saved.');}catch{status('This browser blocked saving. Try Export file instead.');}};
$('load-world').onclick=()=>{let data=null;try{data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}if(!data){status('No saved village in this browser yet.');return;}load(data,'Loaded your saved village.');};
$('export-world').onclick=()=>download('willowglen-village.json',saveWorld(world));
$('export-history').onclick=()=>download('willowglen-decisions.json',{format:'willowglen-decisions',exported:new Date().toISOString(),decisions:world.history});
$('import-world').onclick=()=>$('import-file').click();
$('import-file').onchange=async()=>{const file=$('import-file').files?.[0];$('import-file').value='';if(!file)return;if(file.size>2e6){status('That file is too large to be a Willowglen save.');return;}let data;try{data=JSON.parse(await file.text());}catch{status('That file is not valid JSON.');return;}load(data,`Imported ${file.name}.`);};
$('reset-world').onclick=()=>{if(confirming!=='world'){confirming='world';$('reset-world').textContent='Confirm new village';return;}confirming=null;$('reset-world').textContent='New village';replaceWorld(createWorld(),'A fresh Willowglen begins.');};
$('rotate-left').onclick=()=>view?.rotate(-.3);$('rotate-right').onclick=()=>view?.rotate(.3);$('zoom-in').onclick=()=>view?.zoom(.15);$('zoom-out').onclick=()=>view?.zoom(-.15);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('Paused while this tab is hidden.');});window.addEventListener('pagehide',()=>{pause();$('key').value='';});
let activePanel='controls';
const panelNames={controls:'Village controls',inspector:'A villager’s day',town:'Our growing village',influence:'Shape their world',rules:'Rules of the world'};
function showPanel(id){
 activePanel=id;
 $('hud-panels').hidden=!id;
 for(const name of Object.keys(panelNames))$('panel-'+name).hidden=name!==id;
 if(id)$('panel-title').textContent=panelNames[id];
 document.querySelectorAll('[data-panel]').forEach(button=>button.setAttribute('aria-expanded',String(button.dataset.panel===id)));
}
document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>showPanel(activePanel===button.dataset.panel?null:button.dataset.panel));
$('close-panel').onclick=()=>{const previous=activePanel;showPanel(null);document.querySelectorAll('[data-panel]').forEach(button=>{if(button.dataset.panel===previous)button.focus();});};
$('toggle-news').onclick=()=>{$('events').hidden=!$('events').hidden;$('toggle-news').textContent=$('events').hidden?'Show':'Hide';$('toggle-news').setAttribute('aria-expanded',String(!$('events').hidden));};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('Fullscreen is unavailable in this browser. The world already fills this tab.');}catch{status('Could not enter fullscreen. The world still fills this tab.');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');});
const PAN={arrowup:[0,1],w:[0,1],arrowdown:[0,-1],s:[0,-1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activePanel){$('close-panel').onclick();return;}if(event.target?.closest?.('input,textarea,select,button,summary')||event.ctrlKey||event.metaKey||event.altKey)return;const k=event.key.toLowerCase();
 if(k===' '){event.preventDefault();$('play').onclick();}else if(k==='q')view?.rotate(-.3);else if(k==='e')view?.rotate(.3);else if(k==='+'||k==='=')view?.zoom(.15);else if(k==='-')view?.zoom(-.15);else if(k==='f')$('focus-resident').onclick();else if(PAN[k]){event.preventDefault();unfollow();view?.nudge?.(PAN[k][0]*1.5,PAN[k][1]*1.5);}});
function renderOverview(){
 let attention=0;
 for(const v of world.villagers){
 if(!$('card-'+v.id))continue;
 const concern=v.hunger>=75?'Hungry':v.energy<=20?'Tired':v.happiness<30?'Feeling low':null;
 if(concern)attention++;
 $('card-'+v.id).classList.toggle('needs-care',!!concern);
 $('mood-'+v.id).textContent=concern||'Doing well';setFace($('face-'+v.id),v);
 const icon=v.status==='thinking'?'dots':v.action?ACTIONS[v.action].icon:null;if(icon)setIcon($('taskicon-'+v.id),icon);$('taskicon-'+v.id).hidden=!icon;$('task-'+v.id).textContent=v.status==='thinking'?'Choosing with Jev…':v.status==='acting'?ACTIONS[v.action].label:['walking','entering','exiting'].includes(v.status)?v.thought:'Waiting for a decision';
 $('hunger-'+v.id).textContent=Math.round(v.hunger);$('energy-'+v.id).textContent=Math.round(v.energy);$('joy-'+v.id).textContent=Math.round(v.happiness);$('coins-'+v.id).textContent=v.money;
 }
 $('overview-summary').textContent=attention?attention+' need'+(attention===1?'s':'')+' a little care':'Everyone is doing well';
}
function renderUpgrades(){
 if(!$('upgrade-garden'))$('upgrade-list').replaceChildren(...Object.entries(UPGRADES).map(([id,u])=>{const b=document.createElement('button');b.id='upgrade-'+id;b.type='button';b.title=u.text;b.onclick=()=>{if(upgradeVillage(world,id)){journal(`You chose to ${u.name.toLowerCase()}. ${u.text}`);renderTown();}};return b;}));
 for(const [id,u] of Object.entries(UPGRADES)){const b=$('upgrade-'+id);b.disabled=world.upgrades[id]||world.treasury<u.cost;b.textContent=world.upgrades[id]?'✓ '+u.done:`${u.name} · ${u.cost} coins`;}
}
function renderTown(){
 document.documentElement?.setAttribute('data-night',String(isNight(world)));
 renderRoster();renderOverview();renderUpgrades();
 const n=world.villagers.length,happiness=Math.round(world.villagers.reduce((sum,v)=>sum+v.happiness,0)/n),best=Math.round(Math.max(0,...Object.values(world.bonds)));
 $('treasury').textContent=world.treasury;$('completed').textContent=world.completed;$('friend-score').textContent=best;$('food-count').textContent=world.food;$('wood-count').textContent=world.wood;$('goods-count').textContent=world.goods;
 $('town-mood').textContent=happiness>=70?'Thriving':happiness>=40?'Settling in':'Needs some care';
 const minute=world.time%1440;$('day-phase').textContent=(world.events.festival?'Festival day · ':'')+(minute<360||minute>=1200?'Moonlit hours':minute<1080?'A new little adventure':'Golden hour');
 const night=isNight(world),sky=world.weather==='sunny'&&night?'Clear':title(world.weather);setIcon($('weather-icon'),world.weather==='sunny'&&night?'moon':WEATHER_ICON[world.weather]);$('weather-name').textContent=sky;$('season-name').textContent=title(world.season);
 const bought=Object.values(world.upgrades).filter(Boolean).length;
 const goals=[['A busy little village',world.completed,12],['From garden to table',world.harvests,4],['A happier home',happiness,75],['Market days',world.stats.sell||0,5],['Best friends',best,80],['Under the stars',world.stats.stargaze||0,3],['A growing town',bought,6]];
 $('goals').replaceChildren(...goals.map(([name,value,target])=>{const row=document.createElement('div');row.className='goal';const label=document.createElement('span');label.textContent=(value>=target?'✓ ':'')+name;const b=document.createElement('b');b.textContent=Math.min(value,target)+' / '+target;row.append(label,b);return row;}));
 if(world.council.last&&!$('council-result').textContent)$('council-result').textContent=`Last meeting on day ${world.council.last.day}: ${world.council.last.decision==='save'?'saved the fund':UPGRADES[world.council.last.decision]?.name||world.council.last.decision}.`;
}
// A flat north-up map of the whole island. Clicking moves the camera; clicking a dot selects a resident.
const MAP_SPAN=62;
function drawMap(){
 const canvas=$('minimap'),ctx=canvas.getContext?.('2d');if(!ctx)return;const size=canvas.width,s=size/MAP_SPAN,px=x=>(x+MAP_SPAN/2)*s,night=isNight(world);
 ctx.clearRect(0,0,size,size);ctx.fillStyle=world.season==='winter'?'#dfe6e6':night?'#3e5a45':'#a9c486';ctx.beginPath();for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=islandRadius(a);ctx.lineTo(px(Math.cos(a)*r),px(Math.sin(a)*r));}ctx.fill();
 ctx.fillStyle=night?'#6d7b64':'#e4d6b4';ctx.fillRect(px(-.85),px(-13.5),1.7*s,22*s);for(const z of [-12,-4,4])ctx.fillRect(px(-16.5),px(z-.75),33*s,1.5*s);
 ctx.fillStyle='#78b6b6';ctx.beginPath();ctx.ellipse(px(0),px(10),2.7*s,1.9*s,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=night?'#4b6b4c':'#8fb070';ctx.beginPath();ctx.arc(px(-14),px(-17),4.8*s,0,Math.PI*2);ctx.fill();ctx.fillStyle=night?'#2f4a36':'#5d8a5e';ctx.beginPath();ctx.arc(px(14.5),px(-17.5),4.2*s,0,Math.PI*2);ctx.fill();
 for(const [id,p] of Object.entries(PLACES)){if(['square','pond','grove','hill','garden'].includes(id))continue;const open=!OPENABLE.includes(id)||isOpen(world,id);ctx.fillStyle=HOMES.includes(id)?'#c9a77a':open?'#b97d5e':'#8c8478';ctx.fillRect(px(p.x-1.8),px(p.z-3.5),3.6*s,3*s);}
 ctx.fillStyle='#7a6448';ctx.fillRect(px(3),px(4.4),4*s,3.8*s);
 const focus=view?.getFocus?.();if(focus){ctx.strokeStyle=night?'#f1e6b5aa':'#35513aaa';ctx.lineWidth=1.5;const r=Math.max(4,18/focus.zoom)*s;ctx.strokeRect(px(focus.x)-r,px(focus.z)-r*.7,r*2,r*1.4);}
 for(const v of world.villagers){const inside=v.status==='acting'&&ACTIONS[v.action]?.indoor;ctx.globalAlpha=inside?.55:1;ctx.fillStyle=hex(v.color);ctx.beginPath();ctx.arc(px(v.x),px(v.z),v.id===selected?4.5:3.2,0,Math.PI*2);ctx.fill();if(v.id===selected){ctx.strokeStyle='#fff6c8';ctx.lineWidth=2;ctx.stroke();}ctx.globalAlpha=1;}
}
$('minimap').onclick=event=>{const b=$('minimap').getBoundingClientRect(),x=(event.clientX-b.left)/b.width*MAP_SPAN-MAP_SPAN/2,z=(event.clientY-b.top)/b.height*MAP_SPAN-MAP_SPAN/2;const near=world.villagers.find(v=>Math.hypot(v.x-x,v.z-z)<1.8);if(near){select(near.id,true);return;}unfollow();view?.focus?.(x,z);};
function unfollow(){$('focus-resident').setAttribute('aria-pressed','false');}
$('focus-resident').onclick=()=>{const on=$('focus-resident').getAttribute('aria-pressed')!=='true';$('focus-resident').setAttribute('aria-pressed',String(on));view?.follow(on);};
$('reset-camera').onclick=()=>{view?.reset();unfollow();};
function frame(now){const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;if(playing){let changed=false;for(const event of tick(world,dt*Number($('speed').value))){journal(event.text,event.action?ACTIONS[event.action].icon:event.world?'globe':null);changed||=!!event.world;}if(changed)syncConditions();if(gate.used>=budget()){status('Request budget reached · finishing current activities');if(world.villagers.every(v=>v.status==='idle'))pause('Request budget reached. Increase it to continue.');}else if(gate.canReserve(now,budget())&&(!meetingActive&&councilDue(world)||world.villagers.some(v=>v.status==='idle')))decide();}view?.draw(now/1000,playing&&!matchMedia('(prefers-reduced-motion: reduce)').matches);if(now-lastUI>200){renderInspector();$('clock').textContent=timeString();renderTown();drawMap();updateControls();lastUI=now;}requestAnimationFrame(frame);}
async function init(){select(selected);try{const module=await import('./village-view.js');view=module.createView($('world-canvas'),world,id=>select(id,true),{onUnfollow:unfollow,labelLayer:$('world-tags')});}catch{const error=$('render-error');error.textContent='The 3D world could not start. Run npm ci, restart the server, and use a browser with WebGL enabled.';error.hidden=false;status('3D renderer unavailable');}
 try{const response=await fetch('/api/status',{signal:AbortSignal.timeout(5000),cache:'no-store'});const data=await response.json();ready=response.ok&&data.ready===true;}catch{ready=false;}$('backend').textContent=ready?'Jev backend ready':'Backend unavailable';if(!ready){$('error').textContent='Start the Node server with npm start, then reload this page.';$('error').hidden=false;}updateControls();requestAnimationFrame(frame);}
document.querySelectorAll('[data-glyph]').forEach(el=>setIcon(el,el.dataset.glyph));setPlay(false);
renderTown();syncConditions();
init();
