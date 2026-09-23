import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorld,startAction,tick} from '../dist/village-engine.js';

test('scene constructs and updates for weather, night, activities and upgrades',async()=>{
 // Real Three.js geometry and transforms; only the unavailable GPU and DOM are stubbed.
 const previous=new Map();const install=(key,value)=>{previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 let frames=0;
 install('__sceneRenderer',class{constructor(){this.shadowMap={}}setPixelRatio(){}setClearColor(){}setSize(){}dispose(){}render(scene,camera){frames++;scene.updateMatrixWorld();camera.updateMatrixWorld();scene.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));});}});
 install('devicePixelRatio',1);install('ResizeObserver',class{observe(){}disconnect(){}});
 install('document',{createElement:()=>({getContext:()=>({beginPath(){},roundRect(){},fill(){},fillText(){}})})});
 try{
 const source=readFileSync(new URL('../dist/village-view.js',import.meta.url),'utf8')
 .replace("import * as T from '/vendor/three.module.js';",`import * as Three from '${new URL('../node_modules/three/build/three.module.js',import.meta.url).href}';const T={...Three,WebGLRenderer:globalThis.__sceneRenderer};`)
 .replace("'./village-engine.js'",JSON.stringify(new URL('../dist/village-engine.js',import.meta.url).href));
 const {createView}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const world=createWorld(),canvas={parentElement:{getBoundingClientRect:()=>({width:390,height:570})},addEventListener(){}};
 const view=createView(canvas,world,()=>{});view.draw(0,false);world.weather='rainy';world.time=1380;world.upgrades={garden:true,lanterns:true};view.follow(true);view.draw(10,true);
 for(const action of ['eat','rest','work','garden','explore','socialize','fish','forage','cook','read','exercise']){const v=world.villagers[0];v.status='idle';world.weather='sunny';v.energy=100;v.money=20;startAction(world,v,action);tick(world,20);view.draw(20,true);}
 view.reset();view.zoom(.2);view.rotate(.3);view.draw(30,false);view.dispose();assert.equal(frames,14);
 }finally{for(const [key,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
