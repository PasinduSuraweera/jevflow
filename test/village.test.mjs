import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,legalActions,startAction,tick,decisionContext,RequestGate,applyDecision,upgradeVillage,ACTIONS,bondOf,addVillager,editVillager,removeVillager,saveWorld,restoreWorld,applyPreset,setRule,councilContext,councilDue,applyCouncil,isOpen,MAX_VILLAGERS} from '../dist/village-engine.js';
import {buildRequest,normalizeResponse} from '../server/decisions.mjs';
import {createApp} from '../server/index.mjs';
import {once} from 'node:events';
const run=(w,seconds,step=.5)=>{for(let t=0;t<seconds;t+=step)tick(w,step);};
const criteria=(w,v)=>Object.keys(buildRequest({scenario:'village',context:decisionContext(w,v)}).questions.decision.criteria);
test('world starts idle with no fabricated decisions or autonomous movement',()=>{const w=createWorld();for(const v of w.villagers){assert.equal(v.last,null);assert.equal(v.action,null);const x=v.x;tick(w,1);assert.equal(v.x,x);}});
test('only legal actions enter provider answer space',()=>{const w=createWorld(),v=w.villagers[0];w.weather='rainy';w.open.cafe=false;w.open.library=false;v.energy=1;v.money=2;assert.deepEqual(criteria(w,v),['rest']);});
test('cannot apply unsupported or unavailable action',()=>{const w=createWorld(),v=w.villagers[0];assert.equal(startAction(w,v,'fly'),false);assert.equal(startAction(w,v,'toString'),false);w.open.cafe=false;assert.equal(startAction(w,v,'eat'),false);assert.equal(v.money,9);});
test('food and money reserve once before movement and rewards follow arrival',()=>{const w=createWorld(),v=w.villagers[0];assert.equal(startAction(w,v,'eat'),true);assert.equal(w.food,7);assert.equal(v.money,6);assert.equal(startAction(w,v,'eat'),false);assert.equal(w.food,7);for(let i=0;i<60;i++)tick(w,1);assert.equal(v.status,'idle');assert.equal(v.x,5);assert.equal(v.z,-4);assert.ok(v.hunger<30);assert.equal(v.memory[0],'Shared a warm meal at The Honeycup.');});
test('closing cafe after reservation does not erase the paid meal',()=>{const w=createWorld(),v=w.villagers[0];startAction(w,v,'eat');w.open.cafe=false;for(let i=0;i<40;i++)tick(w,1);assert.equal(w.stats.eat,1);});
test('work earns coins and gardening replenishes shared food',()=>{const w=createWorld();startAction(w,w.villagers[0],'work');startAction(w,w.villagers[1],'garden');for(let i=0;i<60;i++)tick(w,1);assert.equal(w.villagers[0].money,17);assert.equal(w.food,10);});
test('server rechecks eligibility independently of supplied option lists',()=>{const w=createWorld(),v=w.villagers[0];const c=decisionContext(w,v);c.food=0;c.allowed=['eat'];const req=buildRequest({scenario:'village',context:c});assert.ok(!Object.hasOwn(req.questions.decision.criteria,'eat'));assert.throws(()=>normalizeResponse({answers:{decision:{type:'choice',choice:'eat',confidence:.9,probabilities:{eat:1}}}},req,'village'));});
test('invalid village context rejected before provider call',()=>{
 const w=createWorld(),c=decisionContext(w,w.villagers[0]);
 for(const bad of [{money:-1},{energy:'full'},{weather:'hail'},{season:'monsoon'},{wood:1.5},{skill:9},{time:1440},{places_open:{cafe:true}},{places_open:{...c.places_open,castle:true}},{prices:{...c.prices,meal:0}},{upgrades:{rocket:true}},{events:{festival:'yes'}},{neighbors:[{name:'Rowan',activity:'work',friendship:50},{name:'rowan',activity:'rest',friendship:40}]},{neighbors:[{name:'Mira',activity:'rest',friendship:40}]},{goal:'x'.repeat(301)},{bulletin:7},{clock:'9pm'},{time_of_day:'brunch'}])
  assert.throws(()=>buildRequest({scenario:'village',context:{...c,...bad}}),JSON.stringify(bad));
});
test('request gate allows parallel decisions within spacing, per-minute and budget limits',()=>{
 const gate=new RequestGate({parallel:2,spacing:400,perMinute:3});
 assert.ok(gate.reserve(0,10));assert.equal(gate.reserve(100,10),false);assert.ok(gate.reserve(500,10));assert.equal(gate.active,2);
 assert.equal(gate.reserve(1000,10),false);gate.finish();assert.ok(gate.reserve(1000,10));gate.finish();assert.equal(gate.reserve(2000,10),false);assert.ok(gate.reserve(61000,10));
 const budget=new RequestGate();assert.ok(budget.reserve(0,1));budget.finish();assert.equal(budget.reserve(9999,1),false);assert.equal(budget.used,1);
});
test('villagers remember their own day and routine wears thin',()=>{
 const w=createWorld(),v=w.villagers[1];v.energy=100;
 const happy=()=>v.happiness;let before=happy();assert.ok(startAction(w,v,'garden'));run(w,40);assert.ok(happy()>=before+3);assert.match(v.memory.at(-1),/nice change of pace/);
 let req=buildRequest({scenario:'village',context:decisionContext(w,v)});assert.match(req.questions.decision.criteria.garden,/Done once today\. You just did this/);assert.match(req.questions.decision.criteria.fish,/Not done yet today/);assert.doesNotMatch(req.questions.decision.criteria.rest,/today/);
 v.energy=100;assert.ok(startAction(w,v,'garden'));run(w,40);
 req=buildRequest({scenario:'village',context:decisionContext(w,v)});assert.match(req.questions.decision.criteria.garden,/Done 2 times today: starting to feel routine \(-4 happiness\)/);
 v.energy=100;before=happy();assert.ok(startAction(w,v,'garden'));run(w,40);assert.match(v.memory.at(-1),/same old routine/);assert.ok(happy()<before);
 const life=decisionContext(w,v).life;assert.deepEqual(life.today,{garden:3});assert.deepEqual(life.in_a_row,{activity:'garden',times:3});assert.equal(life.known_for,'the gardener');assert.equal(life.last_activity,'garden');assert.ok(life.minutes_since_last>=0);
 w.time+=1440;assert.deepEqual(decisionContext(w,v).life.today,{});assert.equal(decisionContext(w,v).life.lifetime.garden,3);
 const back=restoreWorld(JSON.parse(JSON.stringify(saveWorld(w)))).villagers[1];assert.equal(back.lifetime.garden,3);assert.equal(back.streak.count,3);
 const c=decisionContext(w,v);for(const bad of [{today:{fly:1}},{in_a_row:{activity:'fly',times:1}},{met_today:'Mira'},{happiness_change_today:500}])assert.throws(()=>buildRequest({scenario:'village',context:{...c,life:{...c.life,...bad}}}),JSON.stringify(bad));
});
test('meeting a friend on the green is remembered in today\'s life',()=>{
 const w=createWorld(),[mira,rowan]=w.villagers;assert.ok(startAction(w,mira,'socialize'));mira.companion='rowan';startAction(w,rowan,'socialize');run(w,30);
 assert.deepEqual(decisionContext(w,mira).life.met_today,['Rowan']);assert.deepEqual(decisionContext(w,rowan).life.met_today,['Mira']);
});
test('village HTTP response comes from provider and serves local 3D assets',async t=>{let called=false;const server=createApp({fetchImpl:async(_url,init)=>{called=true;const q=JSON.parse(init.body).questions.decision;const labels=Object.keys(q.criteria);return new Response(JSON.stringify({model:'jev-test',answers:{decision:{type:'choice',choice:'rest',confidence:.9,probabilities:Object.fromEntries(labels.map(k=>[k,k==='rest'?.9:.1/(labels.length-1)]))}}}));}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections()}));const url=`http://127.0.0.1:${server.address().port}`;const w=createWorld();const res=await fetch(url+'/api/decision',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json','X-Jev-Key':'not-a-real-key'},body:JSON.stringify({scenario:'village',context:decisionContext(w,w.villagers[0])})});assert.equal(res.status,200);const body=await res.json();assert.equal(body.decision,'rest');assert.equal(body.companion,undefined);assert.ok(called);for(const path of ['/','/lab','/world.js','/village-view.js','/icons.js','/vendor/three.module.js','/vendor/three.core.js'])assert.equal((await fetch(url+path)).status,200,path);assert.equal((await fetch(url+'/node_modules/three/package.json')).status,404);});

test('low-confidence real decision starts Rowan without interrupting Mira',()=>{
 const w=createWorld(),[mira,rowan]=w.villagers;
 startAction(w,mira,'garden');tick(w,1);const before=mira.z;
 assert.equal(applyDecision(w,rowan,{mode:'live',type:'choice',decision:'work',confidence:.24}),true);
 tick(w,1);assert.notEqual(mira.z,before);assert.equal(rowan.action,'work');assert.equal(mira.action,'garden');
});
test('malformed or simulated results cannot start activities',()=>{
 const w=createWorld(),v=w.villagers[0];
 for(const r of [{mode:'demo',type:'choice',confidence:.9},{mode:'live',type:'choice',confidence:NaN},{mode:'live',type:'choice',confidence:2}])assert.throws(()=>applyDecision(w,v,r));
 assert.equal(applyDecision(w,v,{mode:'live',type:'choice',confidence:.3,decision:'fly'}),false);assert.equal(v.action,null);
});
test('community upgrades require earned funds and cannot be bought twice',()=>{
 const w=createWorld();assert.equal(upgradeVillage(w,'garden'),false);assert.equal(upgradeVillage(w,'unknown'),false);assert.equal(upgradeVillage(w,'constructor'),false);
 startAction(w,w.villagers[0],'work');for(let i=0;i<60;i++)tick(w,1);assert.equal(w.treasury,2);assert.equal(w.completed,1);
 w.treasury=20;assert.equal(upgradeVillage(w,'garden'),true);assert.equal(w.treasury,8);assert.equal(upgradeVillage(w,'garden'),false);assert.equal(upgradeVillage(w,'lanterns'),true);assert.equal(w.treasury,0);
 const req=buildRequest({scenario:'village',context:decisionContext(w,w.villagers[0])});assert.match(req.questions.decision.criteria.garden,/3 meals/);
 const food=w.food;startAction(w,w.villagers[0],'garden');for(let i=0;i<60;i++)tick(w,1);assert.equal(w.food,food+3);assert.equal(w.harvests,1);
});
test('activities have legal provider options and distinct resource outcomes',()=>{
 for(const [action,food,money,wood,goods] of [['fish',2,0,0,0],['forage',1,2,0,0],['cook',3,0,0,0],['read',0,0,0,0],['exercise',0,0,0,0],['chop',0,0,3,0],['craft',0,0,-2,2],['bake',4,0,-1,0],['explore',0,0,0,0]]){
 const w=createWorld(),v=w.villagers[0];const before={food:w.food,money:v.money,wood:w.wood,goods:w.goods,energy:v.energy,happiness:v.happiness};
 assert.ok(criteria(w,v).includes(action),action);
 assert.ok(startAction(w,v,action));run(w,60);
 assert.equal(v.status,'idle',action);assert.equal(w.food,before.food+food,action);assert.equal(v.money,before.money+money,action);assert.equal(w.wood,before.wood+wood,action);assert.equal(w.goods,before.goods+goods,action);assert.equal(w.completed,1,action);
 if(action==='read')assert.ok(v.energy>before.energy);if(action==='exercise'||action==='fish')assert.ok(v.happiness>before.happiness);
 }
 const w=createWorld(),v=w.villagers[0];w.weather='rainy';w.open.cafe=false;
 for(const action of ['fish','forage','cook','read','exercise','swim','garden','explore'])assert.ok(!legalActions(w,v).includes(action),action);
});
test('seasons, weather and time of day change what Jev may choose',()=>{
 const w=createWorld(),v=w.villagers[0];v.energy=100;v.money=50;
 assert.ok(legalActions(w,v).includes('swim'));assert.ok(!legalActions(w,v).includes('sleep'));assert.ok(!legalActions(w,v).includes('stargaze'));assert.ok(!legalActions(w,v).includes('supper'));
 w.season='winter';assert.ok(!legalActions(w,v).includes('garden'));assert.ok(!legalActions(w,v).includes('swim'));w.upgrades.greenhouse=true;assert.ok(legalActions(w,v).includes('garden'));
 w.weather='snowy';assert.ok(!legalActions(w,v).includes('fish'));assert.ok(legalActions(w,v).includes('chop'));w.weather='stormy';assert.ok(!legalActions(w,v).includes('chop'));assert.ok(!legalActions(w,v).includes('socialize'));
 w.weather='sunny';w.time=23*60;const night=legalActions(w,v);assert.ok(night.includes('sleep'));assert.ok(night.includes('stargaze'));assert.ok(night.includes('supper'));assert.ok(!night.includes('sell'));assert.ok(!night.includes('study'));assert.ok(!night.includes('swim'));assert.ok(!night.includes('read'));
 w.weather='cloudy';assert.ok(!legalActions(w,v).includes('stargaze'));
 w.time=10*60;w.goods=3;assert.ok(legalActions(w,v).includes('sell'));w.open.market=false;assert.ok(!legalActions(w,v).includes('sell'));
 setRule(w,'hours',false);w.time=23*60;assert.ok(isOpen(w,'library'));w.open.library=false;assert.ok(!isOpen(w,'library'));
});
test('server offers the same options as the client for every condition',()=>{
 const w=createWorld(),v=w.villagers[0];v.energy=60;v.money=20;w.goods=2;w.wood=1;
 for(const weather of ['sunny','cloudy','rainy','stormy','snowy'])for(const season of ['spring','summer','autumn','winter'])for(const hour of [3,10,17,22]){w.weather=weather;w.season=season;w.time=hour*60;assert.deepEqual(criteria(w,v),legalActions(w,v),`${weather} ${season} ${hour}`);}
});
test('selling reserves goods and pays the merchant rate',()=>{
 const w=createWorld(),v=w.villagers[1];w.goods=3;w.events.merchant=true;assert.ok(startAction(w,v,'sell'));assert.equal(w.goods,1);run(w,60);assert.equal(v.money,4+2*12);assert.equal(w.treasury,1);assert.equal(w.stats.sell,1);
});
test('studying raises skill and skill raises wages',()=>{
 const w=createWorld(),v=w.villagers[1];assert.ok(startAction(w,v,'study'));run(w,90);assert.equal(v.skill,1);assert.match(criteria(w,v).join(),/work/);
 const req=buildRequest({scenario:'village',context:decisionContext(w,v)});assert.match(req.questions.decision.criteria.work,/earn 9 coins/);
 const money=v.money;startAction(w,v,'work');run(w,60);assert.equal(v.money,money+9);
});
test('Jev chooses a companion and meeting on the green deepens friendship',()=>{
 const w=createWorld(),[mira,rowan]=w.villagers;const before=bondOf(w,'mira','rowan');
 const req=buildRequest({scenario:'village',context:decisionContext(w,mira)});assert.deepEqual(Object.keys(req.questions.companion.criteria),['Rowan','Pip','Juniper','Oswin']);
 const probabilities=labels=>Object.fromEntries(labels.map((k,i)=>[k,i?.1/(labels.length-1):.9]));
 const labels=Object.keys(req.questions.decision.criteria),social=['socialize',...labels.filter(l=>l!=='socialize')];
 const result=normalizeResponse({answers:{decision:{type:'choice',choice:'socialize',confidence:.9,probabilities:probabilities(social)},companion:{type:'choice',choice:'Rowan',confidence:.9,probabilities:probabilities(['Rowan','Pip','Juniper','Oswin'])}}},req,'village');
 assert.equal(result.companion.choice,'Rowan');
 assert.throws(()=>normalizeResponse({answers:{decision:{type:'choice',choice:'socialize',confidence:.9,probabilities:probabilities(social)},companion:{type:'choice',choice:'Stranger',confidence:.9,probabilities:{Stranger:1}}}},req,'village'));
 assert.ok(applyDecision(w,mira,{...result,mode:'live'}));assert.equal(mira.companion,'rowan');startAction(w,rowan,'socialize');
 run(w,40);assert.ok(bondOf(w,'mira','rowan')>=before+12);assert.match(mira.memory.at(-1),/lovely chat with Rowan/);
});
test('stormy weather hides the companion question',()=>{const w=createWorld();w.weather='stormy';assert.equal(buildRequest({scenario:'village',context:decisionContext(w,w.villagers[0])}).questions.companion,undefined);});
test('indoor visits pass through entering and exiting without double rewards',()=>{
 const w=createWorld(),v=w.villagers[0];startAction(w,v,'rest');let entering=false,exiting=false;
 for(let i=0;i<400;i++){tick(w,.1);entering||=v.status==='entering';exiting||=v.status==='exiting';}
 assert.ok(entering);assert.ok(exiting);assert.equal(v.status,'idle');assert.equal(v.doorPhase,0);assert.equal(w.completed,1);assert.deepEqual(v.memory,['Rested at home.']);
});
test('villagers rest at their own cottage and climb to hill spots',()=>{
 const w=createWorld(),rowan=w.villagers[1];startAction(w,rowan,'rest');assert.equal(rowan.target,'fern');assert.deepEqual(rowan.path.at(-1),{x:-5,z:-12});
 const oswin=w.villagers[4];w.time=23*60;assert.ok(startAction(w,oswin,'stargaze'));assert.deepEqual(oswin.path.at(-1),{x:-14,z:-16.6});run(w,25);assert.equal(oswin.status,'acting');
 run(w,20);w.time=12*60;assert.ok(startAction(w,oswin,'work'));assert.deepEqual(oswin.path[0],{x:-13,z:-12});
});
test('exercise runs its full route before cooling down',()=>{
 const w=createWorld(),v=w.villagers[0];startAction(w,v,'exercise');assert.equal(v.gait,'run');assert.ok(v.path.length>3);tick(w,.25);assert.equal(v.status,'walking');
});
test('rules change needs, prices and descriptions',()=>{
 const w=createWorld(),v=w.villagers[0];assert.equal(setRule(w,'mealPrice',50),true);assert.equal(w.rules.mealPrice,20);assert.equal(setRule(w,'nonsense',1),false);assert.equal(setRule(w,'hunger',NaN),false);
 setRule(w,'mealPrice',4);v.money=50;assert.match(buildRequest({scenario:'village',context:decisionContext(w,v)}).questions.decision.criteria.eat,/Spend 4 coins/);
 setRule(w,'hunger',2);const hunger=v.hunger;tick(w,10);assert.ok(Math.abs(v.hunger-(hunger+1.6))<1e-9);
 w.events.festival=true;const joy=v.happiness;tick(w,10);assert.equal(v.happiness,joy);
});
test('automatic weather and seasons follow the rules deterministically',()=>{
 const a=createWorld(),b=createWorld();for(const w of [a,b]){setRule(w,'autoWeather',true);setRule(w,'seasonDays',1);}
 const seen=new Set();for(let i=0;i<2000;i++){tick(a,1);tick(b,1);seen.add(a.weather);}
 assert.equal(a.weather,b.weather);assert.equal(a.season,b.season);assert.ok(seen.size>1);assert.notEqual(a.season,'summer');
});
test('residents can be added, customized and removed',()=>{
 const w=createWorld();const v=addVillager(w);assert.equal(v.name,'Tamsin');assert.ok(criteria(w,w.villagers[0]).length);
 assert.throws(()=>editVillager(w,v.id,{name:'mira'}),/already lives/);assert.throws(()=>editVillager(w,v.id,{name:'  '}));
 editVillager(w,v.id,{name:'Tam',goal:'Play every night',hunger:500,money:-4,skill:9,hat:'crown',home:'bramble',color:0x123456});
 assert.equal(v.name,'Tam');assert.equal(v.hunger,100);assert.equal(v.money,0);assert.equal(v.skill,5);assert.equal(v.hat,'flower');assert.equal(v.home,'bramble');
 while(addVillager(w));assert.equal(w.villagers.length,MAX_VILLAGERS);
 w.villagers[0].companion=v.id;assert.ok(removeVillager(w,v.id));assert.equal(w.villagers[0].companion,null);assert.ok(Object.keys(w.bonds).every(k=>!k.includes(v.id)));
 while(w.villagers.length>1)removeVillager(w,w.villagers[0].id);assert.equal(removeVillager(w,w.villagers[0].id),false);
});
test('saves round trip without credentials and imports are sanitized',()=>{
 const w=createWorld();w.treasury=17;w.upgrades.fountain=true;w.rules.wage=12;w.villagers[0].skill=3;w.villagers[0].last={context:{},model:'x'};
 const saved=JSON.parse(JSON.stringify(saveWorld(w)));assert.ok(!JSON.stringify(saved).includes('X-Jev-Key'));const back=restoreWorld(saved);
 assert.equal(back.treasury,17);assert.equal(back.upgrades.fountain,true);assert.equal(back.rules.wage,12);assert.equal(back.villagers[0].skill,3);assert.equal(back.villagers[0].last,null);assert.equal(back.villagers.length,5);
 const hostile=restoreWorld({format:'willowglen',world:{weather:'lava',food:-9,rules:{wage:1e9,clock:'fast'},upgrades:{garden:'yes'},villagers:[{id:'../x',name:'<b>A</b>\u0007',personality:'',money:1e12,hunger:-50,hat:'crown'},...Array(20).fill({name:'Echo'})]}});
 assert.equal(hostile.weather,'sunny');assert.equal(hostile.food,0);assert.equal(hostile.rules.wage,40);assert.equal(hostile.rules.clock,4);assert.equal(hostile.upgrades.garden,false);assert.equal(hostile.villagers.length,MAX_VILLAGERS);assert.notEqual(hostile.villagers[0].id,'../x');assert.equal(hostile.villagers[0].hunger,0);
 assert.equal(new Set(hostile.villagers.map(v=>v.name)).size,MAX_VILLAGERS);
 for(const bad of [null,{},{format:'other',world:{villagers:[{}]}},{format:'willowglen',world:{villagers:[]}}])assert.throws(()=>restoreWorld(bad));
});
test('scenario presets reshape conditions',()=>{const w=createWorld();assert.ok(applyPreset(w,'winter'));assert.equal(w.season,'winter');assert.equal(w.weather,'snowy');assert.ok(applyPreset(w,'cozy'));assert.equal(w.rules.hunger,1);assert.equal(applyPreset(w,'__proto__'),false);});
test('village council question offers affordable projects and saving',()=>{
 const w=createWorld();assert.throws(()=>buildRequest({scenario:'council',context:councilContext(w)}),/cannot afford/);
 w.treasury=15;const req=buildRequest({scenario:'council',context:councilContext(w)});assert.deepEqual(Object.keys(req.questions.decision.criteria).sort(),['fountain','garden','lanterns','oven','save']);
 assert.throws(()=>buildRequest({scenario:'council',context:{...councilContext(w),residents:[]}}));
 w.council.auto=true;w.time=13*60;assert.ok(councilDue(w));assert.equal(applyCouncil(w,{mode:'live',type:'choice',decision:'fountain',confidence:.6}),'fountain');assert.equal(w.treasury,0);assert.ok(w.upgrades.fountain);
 w.council.lastDay=0;w.treasury=20;assert.equal(councilDue(w),false);assert.throws(()=>applyCouncil(w,{mode:'demo',type:'choice',decision:'dock',confidence:1}));
});
test('upgrades change activity rewards',()=>{
 const w=createWorld(),v=w.villagers[0];w.upgrades.oven=true;w.upgrades.dock=true;w.upgrades.fountain=true;
 startAction(w,v,'bake');run(w,90);assert.equal(w.food,8+6);startAction(w,v,'fish');run(w,60);assert.equal(w.food,8+6+3);
 const happy=v.happiness;startAction(w,v,'socialize');run(w,30);assert.ok(v.happiness>happy+20);
});
