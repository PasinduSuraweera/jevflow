import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,legalActions,startAction,tick,decisionContext,RequestGate,applyDecision,upgradeVillage} from '../dist/village-engine.js';
import {buildRequest,normalizeResponse} from '../server/decisions.mjs';
import {createApp} from '../server/index.mjs';
import {once} from 'node:events';
test('world starts idle with no fabricated decisions or autonomous movement',()=>{const w=createWorld();for(const v of w.villagers){assert.equal(v.last,null);assert.equal(v.action,null);const x=v.x;tick(w,1);assert.equal(v.x,x);}});
test('only legal actions enter provider answer space',()=>{const w=createWorld(),v=w.villagers[0];w.weather='rainy';w.cafeOpen=false;v.energy=1;const req=buildRequest({scenario:'village',context:decisionContext(w,v)});assert.deepEqual(Object.keys(req.questions.decision.criteria),['rest']);});
test('cannot apply unsupported or unavailable action',()=>{const w=createWorld(),v=w.villagers[0];assert.equal(startAction(w,v,'fly'),false);w.cafeOpen=false;assert.equal(startAction(w,v,'eat'),false);assert.equal(v.money,9);});
test('food and money reserve once before movement and rewards follow arrival',()=>{const w=createWorld(),v=w.villagers[0];assert.equal(startAction(w,v,'eat'),true);assert.equal(w.food,7);assert.equal(v.money,6);assert.equal(startAction(w,v,'eat'),false);assert.equal(w.food,7);for(let i=0;i<60;i++)tick(w,1);assert.equal(v.status,'idle');assert.equal(v.x,5);assert.equal(v.z,-4);assert.ok(v.hunger<30);assert.equal(v.memory[0],'Completed eat.');});
test('closing cafe after reservation does not erase the paid meal',()=>{const w=createWorld(),v=w.villagers[0];startAction(w,v,'eat');w.cafeOpen=false;for(let i=0;i<40;i++)tick(w,1);assert.equal(v.memory[0],'Completed eat.');});
test('work earns coins and gardening replenishes shared food',()=>{const w=createWorld();startAction(w,w.villagers[0],'work');startAction(w,w.villagers[1],'garden');for(let i=0;i<60;i++)tick(w,1);assert.equal(w.villagers[0].money,17);assert.equal(w.food,10);});
test('server rechecks eligibility independently of supplied option lists',()=>{const w=createWorld(),v=w.villagers[0];const c=decisionContext(w,v);c.food=0;c.allowed=['eat'];const req=buildRequest({scenario:'village',context:c});assert.ok(!Object.hasOwn(req.questions.decision.criteria,'eat'));assert.throws(()=>normalizeResponse({answers:{decision:{type:'choice',choice:'eat',confidence:.9,probabilities:{eat:1}}}},req,'village'));});
test('invalid village resources rejected before provider call',()=>{const c=decisionContext(createWorld(),createWorld().villagers[0]);assert.throws(()=>buildRequest({scenario:'village',context:{...c,money:-1}}));assert.throws(()=>buildRequest({scenario:'village',context:{...c,energy:'full'}}));});
test('request gate enforces concurrency, cooldown and finite attempts',()=>{const gate=new RequestGate();assert.ok(gate.reserve(0,2));assert.equal(gate.reserve(6000,2),false);gate.finish();assert.equal(gate.reserve(1000,2),false);assert.ok(gate.reserve(5000,2));gate.finish();assert.equal(gate.reserve(12000,2),false);assert.equal(gate.used,2);});
test('village HTTP response comes from provider and serves local 3D assets',async t=>{let called=false;const server=createApp({fetchImpl:async(_url,init)=>{called=true;const q=JSON.parse(init.body).questions.decision;const labels=Object.keys(q.criteria);return new Response(JSON.stringify({model:'jev-test',answers:{decision:{type:'choice',choice:'rest',confidence:.9,probabilities:Object.fromEntries(labels.map(k=>[k,k==='rest'?.9:.1/(labels.length-1)]))}}}));}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections()}));const url=`http://127.0.0.1:${server.address().port}`;const w=createWorld();const res=await fetch(url+'/api/decision',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json','X-Jev-Key':'not-a-real-key'},body:JSON.stringify({scenario:'village',context:decisionContext(w,w.villagers[0])})});assert.equal(res.status,200);assert.equal((await res.json()).decision,'rest');assert.ok(called);for(const path of ['/','/lab','/world.js','/village-view.js','/vendor/three.module.js','/vendor/three.core.js'])assert.equal((await fetch(url+path)).status,200,path);assert.equal((await fetch(url+'/node_modules/three/package.json')).status,404);});

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
 const w=createWorld();assert.equal(upgradeVillage(w,'garden'),false);assert.equal(upgradeVillage(w,'unknown'),false);
 startAction(w,w.villagers[0],'work');for(let i=0;i<60;i++)tick(w,1);assert.equal(w.treasury,2);assert.equal(w.completed,1);
 w.treasury=20;assert.equal(upgradeVillage(w,'garden'),true);assert.equal(w.treasury,8);assert.equal(upgradeVillage(w,'garden'),false);assert.equal(upgradeVillage(w,'lanterns'),true);assert.equal(w.treasury,0);
 const req=buildRequest({scenario:'village',context:decisionContext(w,w.villagers[0])});assert.match(req.questions.decision.criteria.garden,/3 meals/);
 const food=w.food;startAction(w,w.villagers[0],'garden');for(let i=0;i<60;i++)tick(w,1);assert.equal(w.food,food+3);assert.equal(w.harvests,1);
});

test('new activities have legal provider options and distinct resource outcomes',()=>{
 for(const [action,food,money] of [['fish',2,0],['forage',1,2],['cook',3,0],['read',0,0],['exercise',0,0]]){
 const w=createWorld(),v=w.villagers[0];const before={food:w.food,money:v.money,energy:v.energy,happiness:v.happiness};
 const req=buildRequest({scenario:'village',context:decisionContext(w,v)});assert.ok(Object.hasOwn(req.questions.decision.criteria,action));
 assert.ok(startAction(w,v,action));for(let i=0;i<100;i++)tick(w,.5);
 assert.equal(v.status,'idle',action);assert.equal(w.food,before.food+food,action);assert.equal(v.money,before.money+money,action);assert.equal(w.completed,1,action);
 if(action==='read')assert.ok(v.energy>before.energy);if(action==='exercise'||action==='fish')assert.ok(v.happiness>before.happiness);
 }
 const w=createWorld(),v=w.villagers[0];w.weather='rainy';w.cafeOpen=false;
 for(const action of ['fish','forage','cook','read','exercise'])assert.ok(!legalActions(w,v).includes(action));
});
test('indoor visits pass through entering and exiting without double rewards',()=>{
 const w=createWorld(),v=w.villagers[0];startAction(w,v,'rest');let entering=false,exiting=false;
 for(let i=0;i<400;i++){tick(w,.1);entering||=v.status==='entering';exiting||=v.status==='exiting';}
 assert.ok(entering);assert.ok(exiting);assert.equal(v.status,'idle');assert.equal(v.doorPhase,0);assert.equal(w.completed,1);assert.deepEqual(v.memory,['Completed rest.']);
});
test('exercise runs its full route before cooling down',()=>{
 const w=createWorld(),v=w.villagers[0];startAction(w,v,'exercise');assert.equal(v.gait,'run');assert.ok(v.path.length>3);tick(w,.25);assert.ok(v.x>-.5);assert.equal(v.status,'walking');
});
