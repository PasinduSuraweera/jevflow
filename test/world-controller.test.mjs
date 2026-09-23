import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as engine from '../dist/village-engine.js';
const html=readFileSync(new URL('../dist/world.html',import.meta.url),'utf8');
// Replace only rendering initialization; exercise production request and play handlers.
// The icon helpers run inside the sandbox so they use its document stub.
const icons=readFileSync(new URL('../dist/icons.js',import.meta.url),'utf8').replace(/^export /gm,'');
const source=icons+readFileSync(new URL('../dist/world.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/init\(\);\s*$/,'ready=true;view={select(){},draw(){}};');
function harness(fetchImpl){
 const nodes=new Map();
 function element(){const node={value:'',children:[],hidden:false,disabled:false,textContent:'',dataset:{},style:{},classList:{toggle(){}},setAttribute(){},getAttribute(){},append(...items){this.children.push(...items)},prepend(item){this.children.unshift(item)},replaceChildren(...items){this.children=items},remove(){},addEventListener(){}};Object.defineProperty(node,'id',{set(id){nodes.set(id,node)}});return node;}
 for(const match of html.matchAll(/id="([^"]+)"/g))nodes.set(match[1],element());
 nodes.get('key').value='mock-test-key';nodes.get('budget').value='30';nodes.get('speed').value='1';
 let now=0;const calls=[];
 const scope={...engine,AbortController,AbortSignal,setTimeout,clearTimeout,performance:{now:()=>now},requestAnimationFrame(){},matchMedia:()=>({matches:true}),document:{getElementById:id=>nodes.get(id),querySelectorAll:()=>[],createElement:element,createElementNS:element,createTextNode:s=>s,addEventListener(){}},window:{addEventListener(){}},fetch:(url,options)=>{calls.push(JSON.parse(options.body));return fetchImpl(url,options);}};vm.createContext(scope);vm.runInContext(source,scope);
 return {nodes,scope,calls,advance:n=>{now=n},read:s=>vm.runInContext(s,scope)};
}
const response=()=>({ok:true,json:async()=>({mode:'live',type:'choice',decision:'garden',confidence:.24,probabilities:{garden:.24,rest:.2,work:.19,eat:.17,explore:.1,socialize:.1},model:'mock',latencyMs:10})});
test('controller keeps playing after low confidence and displays provider confidence',async()=>{
 const h=harness(async()=>response());h.nodes.get('play').onclick();await h.scope.decide();
 assert.equal(h.read('playing'),true);assert.equal(h.read('world.villagers[0].action'),'garden');assert.match(h.nodes.get('decision-meta').textContent,/24% confidence/);
 assert.equal(h.read('world.history.length'),1);
 const before=h.read('world.villagers[0].x');h.scope.frame(100);assert.notEqual(h.read('world.villagers[0].x'),before);
});
test('pausing an in-flight request discards its result without selecting a fallback',async()=>{
 let release;const h=harness(()=>new Promise(r=>release=r));h.nodes.get('play').onclick();const pending=h.scope.decide();h.nodes.get('play').onclick();release(response());await pending;
 assert.equal(h.read('playing'),false);assert.equal(h.read('world.villagers[0].action'),null);assert.equal(h.read('world.villagers[0].last'),null);
});
test('provider errors still pause the simulation',async()=>{
 const h=harness(async()=>({ok:false,json:async()=>({error:'Invalid key'})}));h.nodes.get('play').onclick();await h.scope.decide();assert.equal(h.read('playing'),false);assert.equal(h.read('world.villagers[0].action'),null);assert.equal(h.nodes.get('error').textContent,'Invalid key');
});
test('changing conditions while a request is pending discards its result',async()=>{
 let release;const h=harness(()=>new Promise(r=>release=r));h.nodes.get('play').onclick();const pending=h.scope.decide();
 h.nodes.get('weather-select').value='stormy';h.nodes.get('weather-select').onchange();release(response());await pending;
 assert.equal(h.read('world.weather'),'stormy');assert.equal(h.read('world.villagers[0].action'),null);assert.equal(h.read('world.villagers[0].status'),'idle');
});
test('resident editor, new residents and rules reach the next Jev context',async()=>{
 const h=harness(async()=>response());
 h.nodes.get('add-resident').onclick();assert.equal(h.read('world.villagers.length'),6);assert.equal(h.read('selected'),'tamsin');
 h.nodes.get('edit-name').value='Tamsin the Bold';h.nodes.get('edit-goal').value='Play at every festival';h.nodes.get('edit-apply').onclick();
 assert.equal(h.read('world.villagers[5].name'),'Tamsin the Bold');assert.ok(h.nodes.get('card-tamsin'));
 h.nodes.get('rule-mealPrice').value='7';h.nodes.get('rule-mealPrice').onchange();assert.equal(h.read('world.rules.mealPrice'),7);
 h.nodes.get('bulletin').value='Festival tonight!';h.nodes.get('post-bulletin').onclick();
 h.nodes.get('step').onclick();await new Promise(r=>setImmediate(r));
 const context=h.calls[0].context;assert.equal(context.bulletin,'Festival tonight!');assert.equal(context.prices.meal,7);assert.ok(context.neighbors.some(n=>n.name==='Tamsin the Bold'));
});
test('several villagers decide at the same time and pausing cancels them all',async()=>{
 const releases=[];const h=harness(()=>new Promise(r=>releases.push(r)));h.nodes.get('play').onclick();
 for(const t of [0,500,1000]){h.advance(t);h.scope.decide();}
 assert.equal(h.calls.length,3);assert.deepEqual(h.calls.map(c=>c.context.character),['Mira','Rowan','Pip']);assert.equal(h.read('world.villagers.filter(v=>v.status==="thinking").length'),3);assert.equal(h.read('gate.active'),3);
 releases[0](response());await new Promise(r=>setImmediate(r));assert.equal(h.read('world.villagers[0].action'),'garden');
 h.nodes.get('play').onclick();releases[1](response());releases[2](response());await new Promise(r=>setImmediate(r));
 assert.equal(h.read('world.villagers[1].action'),null);assert.equal(h.read('world.villagers[2].action'),null);assert.equal(h.read('world.villagers.some(v=>v.status==="thinking")'),false);assert.equal(h.read('gate.active'),0);
});
test('the council spends the fund only with a real Jev answer',async()=>{
 const h=harness(async()=>({ok:true,json:async()=>({mode:'live',type:'choice',decision:'lanterns',confidence:.7,probabilities:{lanterns:.7,save:.3},model:'mock',latencyMs:5})}));
 h.read('world.treasury=10');await h.scope.meeting();
 assert.equal(h.calls[0].scenario,'council');assert.equal(h.read('world.upgrades.lanterns'),true);assert.equal(h.read('world.treasury'),2);
 const failing=harness(async()=>({ok:false,json:async()=>({error:'Invalid key'})}));failing.read('world.treasury=10');await failing.scope.meeting();assert.equal(failing.read('world.upgrades.lanterns'),false);assert.equal(failing.read('world.treasury'),10);
});
