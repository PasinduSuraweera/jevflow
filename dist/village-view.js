import * as T from '/vendor/three.module.js';
import {PLACES,ACTIONS,INDOOR_ACTIONS,isNight} from './village-engine.js';
export function createView(canvas,world,onSelect){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0xdce7dd);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.fog=new T.Fog(0xdce7dd,45,95);const camera=new T.OrthographicCamera(-18,18,15,-15,.1,120);let angle=.72,zoom=1,following=false;const target=new T.Vector3();
 const hemi=new T.HemisphereLight(0xfff4df,0x71816b,2.5);scene.add(hemi);const sun=new T.DirectionalLight(0xffe0a2,3);sun.position.set(-12,25,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.05;scene.add(sun);
 const materials=new Map();const mat=c=>{if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:1,flatShading:true}));return materials.get(c)};
 function mesh(geo,color,x,y,z,parent=scene){const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(w,h,d,c,x,y,z,parent)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,parent);
 const ball=(r,c,x,y,z,parent)=>mesh(new T.IcosahedronGeometry(r,1),c,x,y,z,parent);
 const cyl=(rt,rb,h,c,x,y,z,parent,n=8)=>mesh(new T.CylinderGeometry(rt,rb,h,n),c,x,y,z,parent);
 cyl(16,14,1.8,0xbda98a,0,-1.1,0,scene,12);cyl(16,16,.24,0x94b56e,0,-.12,0,scene,12);
 // Low grassy terraces give the village an island silhouette.
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ball(2.5, i%2?0x86a76b:0x9ebd7a,Math.cos(a)*13.2,-1.1,Math.sin(a)*13.2);}
 box(1.7,.04,17,0xd7c6a1,0,.03,0);for(const z of [-4,4])box(14,.05,1.5,0xd7c6a1,0,.04,z);
 const plaza=cyl(2.5,2.5,.05,0xe1d3b7,0,.055,0,scene,24);
 const labels=[],doors=new Map(),windowPanes=[];
 function label(text,x,y,z){
 const textures=[false,true].map(night=>{const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle=night?'#263b35':'#f7f1de';ctx.beginPath();ctx.roundRect(8,8,496,80,30);ctx.fill();ctx.fillStyle=night?'#dfe6ca':'#374c3a';ctx.font='600 29px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,59);return new T.CanvasTexture(c);});
 const sprite=new T.Sprite(new T.SpriteMaterial({map:textures[0],depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(3.9,.73,1);scene.add(sprite);labels.push({sprite,textures});return sprite;
 }
 function building(place,wall,roof){const p=PLACES[place],x=p.x,z=p.z-2;box(.16,2.7,3,wall,x-1.72,1.35,z);box(.16,2.7,3,wall,x+1.72,1.35,z);box(3.6,2.7,.16,wall,x,1.35,z-1.42);box(1.38,2.7,.16,wall,x-1.11,1.35,z+1.42);box(1.38,2.7,.16,wall,x+1.11,1.35,z+1.42);box(.84,1.1,.16,wall,x,2.15,z+1.42);box(3.4,.08,2.8,0x6c6048,x,.04,z);const top=mesh(new T.ConeGeometry(3,1.8,4),roof,x,3.3,z);top.rotation.y=Math.PI/4;top.scale.z=.9;const hinge=new T.Group();hinge.position.set(x-.4,0,z+1.56);scene.add(hinge);box(.8,1.6,.12,0x69503a,.4,.8,0,hinge);ball(.045,0xc9ac6f,.7,.8,.09,hinge);doors.set(place,{hinge,x,z:p.z});for(const dx of [-1.15,1.15]){const pane=box(.65,.8,.15,0xffdc83,x+dx,1.5,z+1.58);pane.material=new T.MeshStandardMaterial({color:0xffdc83,emissive:0xffb35f,emissiveIntensity:0});windowPanes.push(pane);box(.06,.8,.18,0x72553c,x+dx,1.5,z+1.62);box(.7,.06,.18,0x72553c,x+dx,1.5,z+1.62);}box(.55,1.2,.6,0x99725c,x+1.1,3.5,z-.7);box(1.2,.18,.7,0xa89275,x,.09,z+1.95);label(p.name,x,4.6,z);return {x,z};}
 building('home',0xefdcaf,0x849b71);const cafe=building('cafe',0xf2d6ac,0xca8263);const shop=building('workshop',0xd5bc90,0x698c90);
 // Striped cafe awning and little outdoor tables.
 for(let i=0;i<7;i++)box(.46,.12,1, i%2?0xf4e8c9:0xd7a066,cafe.x-1.38+i*.46,2.2,cafe.z+1.9);
 for(const dx of [-1,1]){cyl(.48,.48,.13,0x9a7250,cafe.x+dx,.65,-2.1);cyl(.08,.08,.6,0x705b46,cafe.x+dx,.3,-2.1);}
 for(let i=0;i<3;i++){const log=cyl(.22,.22,1.8,0x9a764f,shop.x+2.1,.25+i*.26,shop.z);log.rotation.z=Math.PI/2;}
 box(4,.16,3.8,0x715f42,5,.1,6.3);for(let row=0;row<3;row++)for(let col=0;col<5;col++){const x=3.6+col*.7,z=5.2+row*1.05;cyl(.05,.06,.35,0x6e944d,x,.35,z);const leaf=ball(.23,0x6f9c51,x,.55,z);leaf.scale.set(1,.6,1);ball(.1,0xe29e53,x,.31,z);}
 label('Community Garden',5,1.5,7.8);
 function fence(x,z,horizontal){for(let i=0;i<4;i++){const dx=horizontal?i*.8:0,dz=horizontal?0:i*.8;box(.14,.85,.14,0xe7d8b5,x+dx,.45,z+dz);}const rail=box(horizontal?2.6:.12,.1,horizontal?.12:2.6,0xe7d8b5,x+(horizontal?1.2:0),.6,z+(horizontal?0:1.2));}
 fence(3.4,8.4,true);fence(7.5,4.7,false);
 const water=mesh(new T.CylinderGeometry(2.7,2.7,.04,36),0x79b5b2,0,.02,10);water.material=new T.MeshStandardMaterial({color:0x70b3b5,roughness:.28,metalness:.15});water.scale.z=.7;
 for(let i=0;i<16;i++){const a=i*Math.PI/8;const stone=ball(.32,0xa9ac94,Math.cos(a)*2.75,.1,10+Math.sin(a)*1.95);stone.scale.y=.55;}
 box(1.25,.14,2,0xb39a71,0,.18,7.7);for(let i=0;i<5;i++)box(1.3,.04,.035,0x857458,0,.27,7+i*.32);
 label('Willow Pond',0,1.2,12.1);
 function tree(x,z,scale=1,pine=false){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);scene.add(g);cyl(.16,.24,1.7,0x92704a,0,.85,0,g);if(pine){cyl(0,1.15,2.1,0x557c5b,0,2,0,g);cyl(0,.85,1.8,0x668e5d,0,3,0,g);}else{ball(1.15,0x6e985c,0,2.2,0,g);ball(.85,0x8aad66,.65,2.55,.1,g);ball(.8,0x83a45f,-.65,2.35,.2,g);}return g;}
 [[-11,-6],[-11,-1],[-10,5],[-8,10],[10,-8],[11,-3],[11,3],[9,10],[-4,-11],[0,-12],[5,-11],[-12,2],[-11,8]].forEach(([x,z],i)=>tree(x,z,.85+(i%3)*.12,i%3===0));
 for(let i=0;i<75;i++){const a=i*2.399,x=Math.cos(a)*(3+(i%8)*1.2),z=Math.sin(a)*(3+(i%9)*1.1);if(Math.abs(x)<1.4||Math.abs(Math.abs(z)-4)<1||Math.abs(x)>3&&Math.abs(x)<9&&Math.abs(z)<8||Math.abs(x)<3&&z>7)continue;const f=ball(.095,[0xe8cf86,0xe9b1a7,0xf5ead0][i%3],x,.22,z);cyl(.022,.025,.17,0x668451,x,.08,z);}
 // Villagers have original toy-like silhouettes and independent walking limbs.
 const people=new Map(),pickables=[];
 // Rain, drifting chimney smoke, and warm village lanterns.
 const smoke=[];for(let i=0;i<9;i++){const puff=ball(.18,0xe1decb,-4.9,4+i*.3,-6.7);puff.material=new T.MeshStandardMaterial({color:0xebe6d8,transparent:true,opacity:.35,depthWrite:false});puff.castShadow=false;smoke.push(puff);}
 const drops=new Float32Array(240*3);for(let i=0;i<240;i++){drops[i*3]=(i*13.71%30)-15;drops[i*3+1]=i*.79%15;drops[i*3+2]=(i*7.13%30)-15;}
 const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(drops,3));const rain=new T.Points(rainGeo,new T.PointsMaterial({color:0xd9edf3,size:.08,transparent:true,opacity:.75}));scene.add(rain);
 const lamps=[];for(const [x,z] of [[-2,-2],[2,2],[-2,4],[2,-4]]){cyl(.05,.08,1.9,0x655e49,x,.95,z);const glow=ball(.18,0xffd787,x,2,z);glow.material=new T.MeshStandardMaterial({color:0xffd787,emissive:0xffa947,emissiveIntensity:0});const light=new T.PointLight(0xffc174,0,7,2);light.position.set(x,2,z);scene.add(light);lamps.push({glow,light});}
 const upgradeBeds=new T.Group();scene.add(upgradeBeds);box(2,.16,3,0x715f42,9,.1,6.3,upgradeBeds);for(let i=0;i<6;i++)ball(.25,0x79a15c,8.6+(i%2)*.8,.4,5.3+Math.floor(i/2)*.85,upgradeBeds);
 const ripples=[];for(let i=0;i<3;i++){const r=mesh(new T.RingGeometry(.4,.43,32),0xb6d7c5,0,.055,10);r.rotation.x=-Math.PI/2;r.material=new T.MeshBasicMaterial({color:0xc4e3d0,transparent:true,opacity:.3,side:T.DoubleSide});ripples.push(r);}
 // A little bench, stepping stones, and crates make public spaces feel inhabited.
 for(const x of [-2,2]){box(1.2,.14,.45,0xb59569,x,.52,1.8);box(1.2,.45,.1,0xb59569,x,.86,2);for(const dx of [-.45,.45])box(.1,.5,.3,0x776e52,x+dx,.25,1.8);}
 for(let i=0;i<4;i++){box(.6,.6,.6,0xba9868,-8.4,.3,2.5+i*.75);box(.64,.06,.64,0x8b7959,-8.4,.48,2.5+i*.75);}
 const butterflies=[];for(let i=0;i<5;i++){const g=new T.Group();scene.add(g);const wings=[];for(const side of [-1,1]){const wing=ball(.12,i%2?0xe6b179:0xf5d390,side*.12,0,0,g);wing.scale.set(1,.1,1.6);wings.push(wing);}butterflies.push({g,wings});}

 for(const v of world.villagers){
 const g=new T.Group();scene.add(g);cyl(.27,.32,.7,v.color,0,.8,0,g);ball(.28,0xe7bd95,0,1.4,0,g);const hair=ball(.29,v.id==='pip'?0xc69b62:0x75553e,0,1.52,-.04,g);hair.scale.y=.65;
 const legs=[],arms=[];
 for(const dx of [-.14,.14]){
 const leg=new T.Group();leg.position.set(dx,.49,0);g.add(leg);box(.15,.38,.17,0x596157,0,-.2,0,leg);box(.18,.12,.28,0x614f41,0,-.41,.04,leg);legs.push(leg);
 const arm=new T.Group();arm.position.set(dx*2.5,1.1,0);g.add(arm);box(.12,.44,.15,v.color,0,-.22,0,arm);ball(.08,0xe7bd95,0,-.47,0,arm);arms.push(arm);
 }
 for(const dx of [-.095,.095])ball(.032,0x45473b,dx,1.43,.255,g);
 if(v.id==='mira'){cyl(.36,.38,.08,0xe0bc73,0,1.7,0,g);cyl(.22,.27,.17,0xe0bc73,0,1.81,0,g);}
 const tools={};for(const name of ['hammer','watering','rod','book','basket']){const prop=new T.Group();arms[1].add(prop);prop.position.set(0,-.45,.07);prop.visible=false;tools[name]=prop;}
 box(.08,.55,.08,0xa58a60,0,.15,0,tools.hammer);box(.3,.14,.15,0x7d8a85,0,.42,0,tools.hammer);
 cyl(.14,.16,.24,0x87a9a2,0,0,0,tools.watering);box(.07,.07,.35,0x87a9a2,0,.06,.2,tools.watering);
 const rod=cyl(.025,.035,1.6,0xa68c65,0,.7,0,tools.rod);rod.rotation.x=-.6;box(.012,.7,.012,0xe9e1c5,0,.9,-.44,tools.rod);
 box(.42,.06,.28,0xa78467,0,0,.1,tools.book);box(.36,.035,.25,0xf0e3bc,0,.04,.1,tools.book);
 cyl(.22,.17,.25,0xc8a272,0,0,0,tools.basket);ball(.11,0x89a56e,.05,.16,0,tools.basket);
 g.traverse(o=>{if(o.isMesh){o.userData.villager=v.id;pickables.push(o);}});
 const tag=label(v.name,0,2.35,0);people.set(v.id,{g,legs,arms,tag,tools});
 }
 const ring=mesh(new T.RingGeometry(.48,.59,40),0xf8e7a2,0,.07,0);ring.rotation.x=-Math.PI/2;ring.material=new T.MeshBasicMaterial({color:0xffefb5,side:T.DoubleSide});
 let motion=0,lastVisualTime=null;let selected='mira';const ray=new T.Raycaster();canvas.addEventListener('pointerup',e=>{const b=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObjects(pickables).find(h=>{let node=h.object;while(node){if(!node.visible)return false;node=node.parent;}return true;});if(hit){selected=hit.object.userData.villager;onSelect(selected);}});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom-e.deltaY*.001,.7,1.7);resize();},{passive:false});
 function resize(){const b=canvas.parentElement.getBoundingClientRect();renderer.setSize(b.width,b.height,false);const aspect=b.width/b.height,span=Math.max(16,18/aspect)/zoom;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
 return {follow:on=>{following=on;},reset:()=>{following=false;angle=.72;zoom=1;resize();},select:id=>{selected=id;},rotate:d=>{angle+=d;},zoom:d=>{zoom=T.MathUtils.clamp(zoom+d,.7,1.7);resize();},draw(time,running){
 const visualDelta=lastVisualTime===null?0:Math.min(.1,Math.max(0,time-lastVisualTime));lastVisualTime=time;if(running)motion+=visualDelta;
 const chosen=world.villagers.find(v=>v.id===selected);target.lerp(new T.Vector3(following?chosen.x:0,0,following?chosen.z:0),.07);
 camera.position.set(target.x+Math.sin(angle)*30,26,target.z+Math.cos(angle)*30);camera.lookAt(target);
 const rainy=world.weather==='rainy',hour=world.time%1440/60;const night=isNight(world);for(const {sprite,textures} of labels)sprite.material.map=textures[night?1:0];for(const pane of windowPanes)pane.material.emissiveIntensity=night?1.3:0;
 for(const [place,door] of doors){const near=world.villagers.some(v=>v.action&&ACTIONS[v.action].place===place&&INDOOR_ACTIONS.has(v.action)&&((v.status==='walking'&&Math.hypot(v.x-door.x,v.z-door.z)<1.7)||v.status==='entering'||v.status==='exiting'));door.hinge.rotation.y=T.MathUtils.lerp(door.hinge.rotation.y,near?-1.5:0,.16);}
 const daylight=T.MathUtils.smoothstep(Math.sin((hour-6)/24*Math.PI*2),-.15,.45);
 const sky=new T.Color(0x26374d).lerp(new T.Color(rainy?0xaabfc0:0xdce7dd),daylight);renderer.setClearColor(sky);scene.fog.color.copy(sky);
 sun.intensity=(rainy?1.4:3)*daylight;hemi.intensity=.65+daylight*1.85;
 sun.color.set(hour>16&&hour<20?0xffba76:0xffe0a2);
 upgradeBeds.visible=world.upgrades.garden;
 for(const {glow,light} of lamps){glow.material.emissiveIntensity=world.upgrades.lanterns?(1-daylight)*2:0;light.intensity=world.upgrades.lanterns?(1-daylight)*9:0;}
 rain.visible=rainy;
 for(let i=0;i<240;i++)drops[i*3+1]=15-((motion*8+i*.79)%15);rainGeo.attributes.position.needsUpdate=true;
 smoke.forEach((p,i)=>{const life=(motion*.35+i/9)%1;p.position.y=4+life*2;p.position.x=-4.9+life*.5;p.scale.setScalar(1+life*2);p.material.opacity=(1-life)*.25;});
 butterflies.forEach(({g,wings},i)=>{g.visible=!rainy&&daylight>.4;g.position.set(5+Math.sin(motion*.4+i)*2,1.3+Math.sin(motion*.7+i)*.4,6+Math.cos(motion*.5+i));wings.forEach((w,j)=>w.rotation.z=Math.sin(motion*12+i)*(j?1:-1));});
 ripples.forEach((r,i)=>{const phase=(motion*.25+i/3)%1;r.scale.setScalar(.4+phase*3);r.material.opacity=(1-phase)*.35;});
 for(const v of world.villagers){
 const o=people.get(v.id),walking=v.status==='walking',acting=v.status==='acting',inside=acting&&INDOOR_ACTIONS.has(v.action),crossing=v.status==='entering'||v.status==='exiting';
 o.g.visible=!inside;o.g.position.set(v.x,0,v.z-(crossing?(v.doorPhase||0)*1.25:0));
 if(v.path.length){const p=v.path[0];const desired=Math.atan2(p.x-v.x,p.z-v.z);const delta=Math.atan2(Math.sin(desired-o.g.rotation.y),Math.cos(desired-o.g.rotation.y));o.g.rotation.y+=delta*.2;}
 if(crossing)o.g.rotation.y=v.status==='entering'?Math.PI:0;
 if(acting&&v.action==='fish')o.g.rotation.y=0;
 const fast=v.gait==='run',cycle=running?world.time*(fast?3.2:2.2):0,stride=fast?.75:.42;
 o.legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(cycle+i*Math.PI)*stride:0);
 o.g.position.y=walking?Math.abs(Math.sin(cycle))*(fast?.1:.04):0;o.g.rotation.x=walking&&fast?.1:0;o.g.rotation.z=0;
 o.arms.forEach((arm,i)=>{arm.rotation.x=walking?Math.sin(cycle+i*Math.PI+Math.PI)*stride*.8:0;if(acting)arm.rotation.x=v.action==='work'?-1+Math.sin(motion*5+i)*.8:v.action==='garden'?-.6+Math.sin(motion*3+i)*.35:v.action==='read'?-.9:v.action==='fish'?-.45+Math.sin(motion)*.06:v.action==='forage'?-.8+Math.sin(motion*2)*.5:v.action==='socialize'?-.3+Math.sin(motion*2+i)*.4:0;});
 if(acting&&v.action==='forage')o.g.rotation.x=.3;
 for(const prop of Object.values(o.tools))prop.visible=false;
 const tool={work:'hammer',garden:'watering',fish:'rod',read:'book',forage:'basket'}[v.action];if(acting&&tool)o.tools[tool].visible=true;
 o.tag.position.set(v.x,inside?2.7:2.3,v.z);o.tag.material.opacity=inside?.6:v.id===selected?1:.78;
 }
 const v=world.villagers.find(v=>v.id===selected);ring.position.set(v.x,.065,v.z);renderer.render(scene,camera);},dispose(){observer.disconnect();renderer.dispose();}};
}
