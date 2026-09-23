import {createWorld,decisionContext,applyDecision,upgradeVillage,ACTIONS,isNight,tick,RequestGate} from './village-engine.js';
const $=id=>document.getElementById(id);
const world=createWorld(),gate=new RequestGate();let selected='mira',playing=false,ready=false,view=null,controller=null,epoch=0,cursor=0,lastFrame=0,lastUI=0;
const current=()=>world.villagers.find(v=>v.id===selected);
function budget(){return Math.max(1,Math.min(150,Number($('budget').value)||30));}
function timeString(){const minutes=Math.floor(world.time);return `Day ${Math.floor(minutes/1440)+1} · ${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function journal(message){const li=document.createElement('li'),time=document.createElement('time');time.textContent=timeString().split(' · ')[1];li.append(time,document.createTextNode(message));$('events').prepend(li);while($('events').children.length>40)$('events').lastElementChild.remove();}
function status(text){$('world-status').textContent=text;}
function pause(message='Paused · the village can wait.'){playing=false;epoch++;controller?.abort();world.villagers.forEach(v=>{if(v.status==='thinking'){v.status='idle';v.thought='Decision paused. No new activity was chosen.';}});$('play').textContent='▶ Start village';status(message);updateControls();}
function updateControls(){const key=/^[\x21-\x7e]{8,512}$/.test($('key').value.trim());$('play').disabled=!playing&&(!ready||!view||!key||gate.used>=budget());$('step').disabled=!ready||!view||!key||playing||gate.active||gate.used>=budget();$('used').textContent=gate.used;$('limit').textContent=budget();}
function select(id,open=false){if(open)showPanel('inspector');selected=id;view?.select(id);document.querySelectorAll('[data-resident]').forEach(b=>{b.classList.toggle('selected',b.dataset.resident===id);b.setAttribute('aria-pressed',String(b.dataset.resident===id));});renderInspector(true);}
function renderInspector(full=false){const v=current();$('resident-name').textContent=v.name;$('coins').textContent=v.money+' coins';$('personality').textContent=v.personality;$('activity').textContent=v.status==='thinking'?'A new choice':v.status==='acting'?'Right now':v.status==='walking'?(v.gait==='run'?'On the run':'On the way'):v.status==='idle'?'Taking a moment':'At the door';$('thought').textContent=v.thought;
 for(const [key,title,value] of [['hunger','Hunger · lower is better',v.hunger],['energy','Energy',v.energy],['happiness','Happiness',v.happiness]]){let row=$('need-'+key);if(!row){row=document.createElement('div');row.className='need';row.id='need-'+key;const label=document.createElement('div'),name=document.createElement('span'),num=document.createElement('span'),bar=document.createElement('progress');name.textContent=title;num.id='value-'+key;bar.id='bar-'+key;bar.max=100;bar.setAttribute('aria-label',title);label.append(name,num);row.append(label,bar);$('needs').append(row);}$('value-'+key).textContent=Math.round(value);$('bar-'+key).value=value;}
 const progress=v.status==='acting'?1-v.remaining/ACTIONS[v.action].duration:0;$('activity-progress').value=progress*100;$('activity-progress').hidden=v.status!=='acting';
 if(full){$('probabilities').replaceChildren();$('decision-empty').hidden=!!v.last;$('decision-json').textContent=v.last?JSON.stringify(v.last,null,2):'';$('decision-meta').textContent=v.last?`${v.last.model} · ${v.last.latencyMs} ms · ${Math.round(v.last.confidence*100)}% confidence`:'';if(v.last)for(const [name,p] of Object.entries(v.last.probabilities).sort((a,b)=>b[1]-a[1])){const row=document.createElement('div');row.className='probability';const label=document.createElement('span'),value=document.createElement('span');label.textContent=name;value.textContent=(p*100).toFixed(1)+'%';row.append(label,value);$('probabilities').append(row);}}
}
async function decide(single=false){
 if(gate.active||!ready||!view)return;
 const v=Array.from({length:3},(_,i)=>world.villagers[(cursor+i)%3]).find(v=>v.status==='idle');if(!v){if(single)status('Everyone has an activity. Start the village to let them finish.');return;}
 if(!gate.reserve(performance.now(),budget())){if(gate.used>=budget())pause('Request budget reached. Increase it to continue.');else if(single)status('Please wait five seconds between decisions.');return;}
 cursor=(world.villagers.indexOf(v)+1)%3;const startEpoch=epoch;controller=new AbortController();const signal=controller.signal;const timeout=setTimeout(()=>controller?.abort(),18000);v.status='thinking';v.thought='Jev is choosing from the activities available right now.';updateControls();$('error').hidden=true;
 const context=decisionContext(world,v);
 try {const response=await fetch('/api/decision',{method:'POST',headers:{'Content-Type':'application/json','X-Jev-Key':$('key').value.trim()},body:JSON.stringify({scenario:'village',context}),signal,cache:'no-store',credentials:'omit'});let result;try{result=await response.json();}catch{throw Error('The API backend returned an invalid response.');}if(!response.ok)throw Error(result.error||'Jev request failed.');if(startEpoch!==epoch||signal.aborted)return;if(result.mode!=='live'||result.type!=='choice'||!Number.isFinite(result.confidence))throw Error('Expected a real Jev choice.');v.last={...result,context};
 if(!applyDecision(world,v,result)){v.status='idle';v.thought='That activity is no longer available. Waiting for a fresh Jev decision.';journal(`${v.name}: the world changed; a fresh choice will be requested.`);}
 else{journal(`${v.name} chose ${result.decision} (${Math.round(result.confidence*100)}%).`);status(single?`${v.name} has a plan. Start the village to watch it unfold.`:'Life is unfolding · real Jev decisions');}
 renderInspector(true);
 }catch(error){if(startEpoch===epoch){const timedOut=signal.aborted;v.status='idle';v.thought='Waiting. No fallback decision was made.';pause('Paused · a decision could not be completed.');$('error').textContent=timedOut?'Request timed out. Provider charges may still apply.':error.message;$('error').hidden=false;showPanel('controls');journal(`${v.name}'s request failed. No action was substituted.`);}}
 finally{clearTimeout(timeout);controller=null;gate.finish();updateControls();}
}
$('play').onclick=()=>{if(playing){pause();return;}if(!ready||!view||!$('key').value.trim()||gate.used>=budget())return;playing=true;showPanel(null);$('play').textContent='Ⅱ Pause village';$('error').hidden=true;status('Life is unfolding · real Jev decisions');updateControls();};
$('step').onclick=()=>decide(true);
$('clear-key').onclick=()=>{pause('Key cleared · village paused');$('key').value='';updateControls();};
$('key').oninput=()=>{pause('Ready when you are · press Start village');updateControls();};
$('budget').onchange=()=>{$('budget').value=budget();updateControls();};
function influence(message){epoch++;controller?.abort();world.villagers.forEach(v=>{if(v.status==='thinking'){v.status='idle';v.thought='The world changed. Waiting for a fresh decision.';}});world.version++;journal(message);renderInspector(true);}
$('time-of-day').onclick=()=>{world.time=Math.floor(world.time/1440)*1440+(isNight(world)?8:20)*60;influence(isNight(world)?'Evening settles over Willowglen.':'A new morning lights the village.');renderTown();};
$('weather').onclick=()=>{world.weather=world.weather==='sunny'?'rainy':'sunny';$('weather').textContent=world.weather==='rainy'?'☀ Bring back the sun':'☂ Make it rain';$('weather-icon').textContent=world.weather==='rainy'?'☂':'☀';$('weather-name').textContent=world.weather==='rainy'?'Rainy':'Sunny';influence(world.weather==='rainy'?'Rain arrives. Gardening and pond trips are unavailable.':'The sun is back. Outdoor activities reopen.');};
$('cafe').onclick=()=>{world.cafeOpen=!world.cafeOpen;$('cafe').textContent=world.cafeOpen?'Close the café':'Open the café';$('cafe-state').textContent=world.cafeOpen?'Café open':'Café closed';influence(world.cafeOpen?'The café opens its doors.':'The café closes to new visitors.');};
$('food').onclick=()=>{world.food=Math.min(99999,world.food+3);influence('You added three meals to the café pantry.');};
document.querySelectorAll('[data-resident]').forEach(b=>b.onclick=()=>select(b.dataset.resident,true));
$('rotate-left').onclick=()=>view?.rotate(-.3);$('rotate-right').onclick=()=>view?.rotate(.3);$('zoom-in').onclick=()=>view?.zoom(.15);$('zoom-out').onclick=()=>view?.zoom(-.15);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('Paused while this tab is hidden.');});window.addEventListener('pagehide',()=>{pause();$('key').value='';});
let activePanel='controls';
const panelNames={controls:'Village controls',inspector:'A villager’s day',town:'Our growing village',influence:'Shape their world'};
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
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activePanel)$('close-panel').onclick();});
function renderOverview(){
 let attention=0;
 for(const v of world.villagers){
 const concern=v.hunger>=75?'Hungry':v.energy<=20?'Tired':v.happiness<30?'Feeling low':null;
 if(concern)attention++;
 $('card-'+v.id).classList.toggle('needs-care',!!concern);
 $('mood-'+v.id).textContent=concern||'Doing well';
 $('task-'+v.id).textContent=v.status==='thinking'?'Choosing with Jev…':v.status==='acting'?ACTIONS[v.action].label:['walking','entering','exiting'].includes(v.status)?v.thought:'Waiting for a decision';
 $('hunger-'+v.id).textContent=Math.round(v.hunger);
 $('energy-'+v.id).textContent=Math.round(v.energy);
 $('joy-'+v.id).textContent=Math.round(v.happiness);
 }
 $('overview-summary').textContent=attention?attention+' need'+(attention===1?'s':'')+' a little care':'Everyone is doing well';
}
function renderTown(){
 document.documentElement?.setAttribute('data-night',String(isNight(world)));$('time-of-day').textContent=isNight(world)?'Visit the morning':'Visit the evening';
 renderOverview();
 $('treasury').textContent=world.treasury;
 $('completed').textContent=world.completed;
 const happiness=Math.round(world.villagers.reduce((sum,v)=>sum+v.happiness,0)/3);
 $('town-mood').textContent=happiness>=70?'Thriving':happiness>=40?'Settling in':'Needs some care';
 $('day-phase').textContent=world.time%1440<360||world.time%1440>=1200?'Moonlit hours':world.time%1440<1080?'A new little adventure':'Golden hour';
 for(const [id,cost] of [['garden',12],['lanterns',8]]){const b=$('upgrade-'+id);b.disabled=world.upgrades[id]||world.treasury<cost;b.textContent=world.upgrades[id]?'✓ '+(id==='garden'?'Garden expanded':'Lanterns installed'):(id==='garden'?'Expand garden · 12 coins':'Light the square · 8 coins');}
 const goals=[['A busy little village',world.completed,12],['From garden to table',world.harvests,4],['A happier home',happiness,75]];
 $('goals').replaceChildren(...goals.map(([name,n,target])=>{const row=document.createElement('div');row.className='goal';const label=document.createElement('span');label.textContent=(n>=target?'✓ ':'')+name;const value=document.createElement('b');value.textContent=Math.min(n,target)+' / '+target;row.append(label,value);return row;}));
}
for(const id of ['garden','lanterns'])$('upgrade-'+id).onclick=()=>{if(upgradeVillage(world,id)){journal(id==='garden'?'The village expanded its garden. Each harvest now yields three meals.':'Warm lanterns now light the village square.');renderTown();}};
$('focus-resident').onclick=()=>{const on=$('focus-resident').getAttribute('aria-pressed')!=='true';$('focus-resident').setAttribute('aria-pressed',String(on));view?.follow(on);};
$('reset-camera').onclick=()=>{view?.reset();$('focus-resident').setAttribute('aria-pressed','false');};
function frame(now){const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;if(playing){for(const event of tick(world,dt*Number($('speed').value)))journal(`${event.villager} finished ${event.action}.`);if(gate.used>=budget()){status('Request budget reached · finishing current activities');if(world.villagers.every(v=>v.status==='idle'))pause('Request budget reached. Increase it to continue.');}else if(!gate.active&&now-gate.last>=5000)decide();}view?.draw(now/1000,playing&&!matchMedia('(prefers-reduced-motion: reduce)').matches);if(now-lastUI>200){renderInspector();$('clock').textContent=timeString();$('food-count').textContent=world.food;renderTown();updateControls();lastUI=now;}requestAnimationFrame(frame);}
async function init(){select('mira');try{const module=await import('./village-view.js');view=module.createView($('world-canvas'),world,id=>select(id,true));}catch{const error=$('render-error');error.textContent='The 3D world could not start. Run npm ci, restart the server, and use a browser with WebGL enabled.';error.hidden=false;status('3D renderer unavailable');}
 try{const response=await fetch('/api/status',{signal:AbortSignal.timeout(5000),cache:'no-store'});const data=await response.json();ready=response.ok&&data.ready===true;}catch{ready=false;}$('backend').textContent=ready?'Jev backend ready':'Backend unavailable';if(!ready){$('error').textContent='Start the Node server with npm start, then reload this page.';$('error').hidden=false;}updateControls();requestAnimationFrame(frame);}
renderTown();
init();
