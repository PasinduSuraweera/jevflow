import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {recipes,questionFor,validateContext} from '../dist/recipes.js';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
function harness(decisionFetch){
 const nodes=new Map();
 function element(){return {value:'',hidden:false,disabled:false,textContent:'',innerHTML:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(){},replaceChildren(){},addEventListener(){},focus(){},scrollIntoView(){}};}
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes.set(m[1],element());
 nodes.get('threshold').value='80';
 const calls=[];
 const scope={recipes,questionFor,validateContext,AbortController,AbortSignal,TextEncoder,setTimeout,clearTimeout,console,matchMedia:()=>({matches:true}),navigator:{clipboard:{writeText:async()=>{}}},window:{addEventListener(){}},document:{getElementById:id=>{assert.ok(nodes.has(id),'HTML must contain '+id);return nodes.get(id)},querySelectorAll:()=>[],querySelector:()=>element(),createElement:element,createTextNode:x=>x},fetch:async(url,options)=>{calls.push({url,options});if(url==='/api/status')return {ok:true,json:async()=>({ready:true,provider:'typesafe'})};return decisionFetch(url,options)}};
 vm.createContext(scope);vm.runInContext(source,scope);return {nodes,calls,scope};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('startup has no decision, demo selector or hidden default result',async()=>{
 const {nodes,calls}=harness(()=>assert.fail('no automatic inference'));await tick();
 assert.equal(nodes.get('decision-name').textContent,'No result yet');assert.equal(nodes.get('copy-result').disabled,true);assert.equal(nodes.get('run').disabled,true);assert.equal(calls.length,1);assert.ok(!html.includes('execution-mode'));assert.ok(!html.includes('announcement'));
});
test('run displays only successful live response and key clearing removes result',async()=>{
 const {nodes,calls,scope}=harness(async()=>({ok:true,json:async()=>({mode:'live',scenario:'support',type:'choice',decision:'technical',confidence:.9,probabilities:{technical:.9,billing:.06,other:.04},latencyMs:30})}));await tick();
 nodes.get('api-key').value='test-not-real';nodes.get('api-key').oninput();assert.equal(nodes.get('run').disabled,false);await scope.run();assert.equal(nodes.get('decision-name').textContent,'technical');assert.equal(calls.at(-1).options.headers['X-Jev-Key'],'test-not-real');assert.ok(!nodes.get('response-json').textContent.includes('test-not-real'));
 nodes.get('clear-key').onclick();assert.equal(nodes.get('api-key').value,'');assert.equal(nodes.get('decision-name').textContent,'No result yet');assert.equal(nodes.get('run').disabled,true);
});
test('provider failure never falls back to a local decision',async()=>{
 const {nodes,scope}=harness(async()=>({ok:false,json:async()=>({error:'Jev rejected this key.'})}));await tick();nodes.get('api-key').value='test-not-real';await scope.run();assert.equal(nodes.get('error').textContent,'Jev rejected this key.');assert.equal(nodes.get('decision-name').textContent,'No result yet');assert.equal(nodes.get('copy-result').disabled,true);
});
test('changing recipe while a request is pending discards its result',async()=>{
 let release;
 const {nodes,scope}=harness(()=>new Promise(r=>{release=()=>r({ok:true,json:async()=>({mode:'live',type:'choice',decision:'billing',confidence:.9,probabilities:{billing:.9,technical:.06,other:.04}})})}));await tick();nodes.get('api-key').value='test-not-real';const pending=scope.run();scope.loadPreset('npc');release();await pending;assert.equal(nodes.get('decision-name').textContent,'No result yet');assert.equal(nodes.get('recipe-select').value,'npc');
});
