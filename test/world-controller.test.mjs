import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as engine from '../dist/village-engine.js';
const html=readFileSync(new URL('../dist/world.html',import.meta.url),'utf8');
// Replace only rendering initialization; exercise production request and play handlers.
const source=readFileSync(new URL('../dist/world.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replace(/init\(\);\s*$/,'ready=true;view={select(){},draw(){}};');
function harness(fetchImpl){
 const nodes=new Map();
 function element(){const node={value:'',children:[],hidden:false,disabled:false,textContent:'',dataset:{},classList:{toggle(){}},setAttribute(){},getAttribute(){},append(...items){this.children.push(...items)},prepend(item){this.children.unshift(item)},replaceChildren(...items){this.children=items},remove(){},addEventListener(){}};Object.defineProperty(node,'id',{set(id){nodes.set(id,node)}});return node;}
 for(const match of html.matchAll(/id="([^"]+)"/g))nodes.set(match[1],element());
 nodes.get('key').value='mock-test-key';nodes.get('budget').value='30';nodes.get('speed').value='1';
 let now=0;
 const scope={...engine,AbortController,AbortSignal,setTimeout,clearTimeout,performance:{now:()=>now},requestAnimationFrame(){},matchMedia:()=>({matches:true}),document:{getElementById:id=>nodes.get(id),querySelectorAll:()=>[],createElement:element,createTextNode:s=>s,addEventListener(){}},window:{addEventListener(){}},fetch:fetchImpl};vm.createContext(scope);vm.runInContext(source,scope);
 return {nodes,scope,advance:n=>{now=n},read:s=>vm.runInContext(s,scope)};
}
const response=()=>({ok:true,json:async()=>({mode:'live',type:'choice',decision:'garden',confidence:.24,probabilities:{garden:.24,rest:.2,work:.19,eat:.17,explore:.1,socialize:.1},model:'mock',latencyMs:10})});
test('controller keeps playing after low confidence and displays provider confidence',async()=>{
 const h=harness(async()=>response());h.nodes.get('play').onclick();await h.scope.decide();
 assert.equal(h.read('playing'),true);assert.equal(h.read('world.villagers[0].action'),'garden');assert.match(h.nodes.get('decision-meta').textContent,/24% confidence/);
 const before=h.read('world.villagers[0].x');h.scope.frame(100);assert.notEqual(h.read('world.villagers[0].x'),before);
});
test('pausing an in-flight request discards its result without selecting a fallback',async()=>{
 let release;const h=harness(()=>new Promise(r=>release=r));h.nodes.get('play').onclick();const pending=h.scope.decide();h.nodes.get('play').onclick();release(response());await pending;
 assert.equal(h.read('playing'),false);assert.equal(h.read('world.villagers[0].action'),null);assert.equal(h.read('world.villagers[0].last'),null);
});
test('provider errors still pause the simulation',async()=>{
 const h=harness(async()=>({ok:false,json:async()=>({error:'Invalid key'})}));h.nodes.get('play').onclick();await h.scope.decide();assert.equal(h.read('playing'),false);assert.equal(h.read('world.villagers[0].action'),null);assert.equal(h.nodes.get('error').textContent,'Invalid key');
});
