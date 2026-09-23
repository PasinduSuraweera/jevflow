import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorld,startAction,tick,ACTIONS,addVillager,removeVillager,UPGRADES} from '../dist/village-engine.js';

test('scene constructs and updates for weather, seasons, night, activities, upgrades and roster changes',async()=>{
 // Real Three.js geometry and transforms; only the unavailable GPU and DOM are stubbed.
 const previous=new Map();const install=(key,value)=>{previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 let frames=0;
 install('__sceneRenderer',class{constructor(){this.shadowMap={}}setPixelRatio(){}setClearColor(){}setSize(){}dispose(){}render(scene,camera){frames++;scene.updateMatrixWorld();camera.updateMatrixWorld();scene.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));});}});
 install('devicePixelRatio',1);install('ResizeObserver',class{observe(){}disconnect(){}});
 const node=()=>({style:{},dataset:{},hidden:false,children:[],className:'',textContent:'',classList:{toggle(){}},setAttribute(){},replaceChildren(...c){this.children=c},append(...c){this.children.push(...c)},prepend(...c){this.children.unshift(...c)},addEventListener(){},remove(){this.removed=true;}});
 install('document',{createElement:node,createElementNS:node});
 try{
 const source=readFileSync(new URL('../dist/village-view.js',import.meta.url),'utf8')
 .replace("import * as T from '/vendor/three.module.js';",`import * as Three from '${new URL('../node_modules/three/build/three.module.js',import.meta.url).href}';const T={...Three,WebGLRenderer:globalThis.__sceneRenderer};`)
 .replace("'./icons.js'",JSON.stringify(new URL('../dist/icons.js',import.meta.url).href)).replace("'./village-engine.js'",JSON.stringify(new URL('../dist/village-engine.js',import.meta.url).href));
 const {createView,groundHeight}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.ok(groundHeight(-14,-17)>1.5);assert.equal(groundHeight(0,0),0);
 const world=createWorld(),canvas={parentElement:{getBoundingClientRect:()=>({width:390,height:570})},getBoundingClientRect:()=>({left:0,top:0,width:390,height:570}),addEventListener(){}};
 const layer=node(),view=createView(canvas,world,()=>{},{labelLayer:layer});view.draw(0,false);
 for(const weather of ['sunny','cloudy','rainy','stormy','snowy'])for(const season of ['spring','summer','autumn','winter']){world.weather=weather;world.season=season;world.time+=300;view.draw(frames,true);}
 world.upgrades=Object.fromEntries(Object.keys(UPGRADES).map(id=>[id,true]));world.wood=20;world.goods=20;view.follow(true);view.draw(200,true);
 for(const action of Object.keys(ACTIONS)){const v=world.villagers[0];v.status='idle';world.weather='sunny';world.season='summer';world.time=action==='stargaze'||action==='sleep'?23*60:action==='supper'||action==='music'?18*60:10*60;v.energy=100;v.money=40;assert.ok(startAction(world,v,action),action);tick(world,20);view.draw(300,true);tick(world,20);view.draw(301,true);}
 const newcomer=addVillager(world);newcomer.hat='chef';view.draw(400,true);removeVillager(world,world.villagers[1].id);view.draw(401,true);
 view.reset();view.zoom(.2);view.rotate(.3);view.pan(3,-2);view.nudge(1,1);view.focus(10,10);assert.ok(view.getFocus().zoom>1);view.draw(402,false);const tags=layer.children;assert.ok(tags.filter(t=>t.className.includes('place')).length>=13);assert.ok(tags.some(t=>t.children[1]?.children?.[1]?.textContent?.startsWith('Home of')));assert.ok(tags.some(t=>t.className.includes('person')&&t.removed));
 view.dispose();
 assert.equal(frames,1+20+1+Object.keys(ACTIONS).length*2+3);
 }finally{for(const [key,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
