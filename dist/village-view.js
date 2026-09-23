import * as T from '/vendor/three.module.js';
import {PLACES} from './village-engine.js';
export function createView(canvas,world,onSelect){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0xdce7dd);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.fog=new T.Fog(0xdce7dd,45,95);const camera=new T.OrthographicCamera(-18,18,15,-15,.1,120);let angle=.72,zoom=1;
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
 function label(text,x,y,z){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#f7f1de';ctx.beginPath();ctx.roundRect(8,8,496,80,30);ctx.fill();ctx.fillStyle='#374c3a';ctx.font='600 29px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,59);const tx=new T.CanvasTexture(c);const s=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:false}));s.position.set(x,y,z);s.scale.set(3.9,.73,1);scene.add(s);return s;}
 function building(place,wall,roof){const p=PLACES[place],x=p.x,z=p.z-2;box(3.6,2.7,3,wall,x,1.35,z);const top=mesh(new T.ConeGeometry(3,1.8,4),roof,x,3.3,z);top.rotation.y=Math.PI/4;top.scale.z=.9;box(.8,1.6,.12,0x69503a,x,.8,z+1.56);for(const dx of [-1.15,1.15]){box(.65,.8,.15,0xffdc83,x+dx,1.5,z+1.58);box(.06,.8,.18,0x72553c,x+dx,1.5,z+1.62);box(.7,.06,.18,0x72553c,x+dx,1.5,z+1.62);}box(.55,1.2,.6,0x99725c,x+1.1,3.5,z-.7);box(1.2,.18,.7,0xa89275,x,.09,z+1.95);label(p.name,x,4.6,z);return {x,z};}
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
 for(const v of world.villagers){const g=new T.Group();scene.add(g);cyl(.27,.32,.7,v.color,0,.8,0,g);ball(.28,0xe7bd95,0,1.4,0,g);const hair=ball(.29,v.id==='pip'?0xc69b62:0x75553e,0,1.52,-.04,g);hair.scale.y=.65;const legs=[];for(const dx of [-.14,.14]){const leg=box(.15,.38,.17,0x596157,dx,.26,0,g);legs.push(leg);box(.18,.12,.28,0x614f41,dx,.08,.04,g);const arm=box(.12,.52,.15,v.color,dx*2.5,.87,0,g);}for(const dx of [-.095,.095])ball(.032,0x45473b,dx,1.43,.255,g);if(v.id==='mira'){cyl(.36,.38,.08,0xe0bc73,0,1.7,0,g);cyl(.22,.27,.17,0xe0bc73,0,1.81,0,g);}g.traverse(o=>{if(o.isMesh){o.userData.villager=v.id;pickables.push(o);}});const tag=label(v.name,0,2.35,0);people.set(v.id,{g,legs,tag});}
 const ring=mesh(new T.RingGeometry(.48,.59,40),0xf8e7a2,0,.07,0);ring.rotation.x=-Math.PI/2;ring.material=new T.MeshBasicMaterial({color:0xffefb5,side:T.DoubleSide});
 let selected='mira';const ray=new T.Raycaster();canvas.addEventListener('pointerup',e=>{const b=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObjects(pickables)[0];if(hit){selected=hit.object.userData.villager;onSelect(selected);}});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom-e.deltaY*.001,.7,1.7);resize();},{passive:false});
 function resize(){const b=canvas.parentElement.getBoundingClientRect();renderer.setSize(b.width,b.height,false);const aspect=b.width/b.height,span=Math.max(16,18/aspect)/zoom;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
 return {select:id=>{selected=id;},rotate:d=>{angle+=d;},zoom:d=>{zoom=T.MathUtils.clamp(zoom+d,.7,1.7);resize();},draw(time,running){camera.position.set(Math.sin(angle)*30,26,Math.cos(angle)*30);camera.lookAt(0,0,0);const rainy=world.weather==='rainy';renderer.setClearColor(rainy?0xc5d2d0:0xdce7dd);sun.intensity=rainy?1.4:3;for(const v of world.villagers){const o=people.get(v.id);o.g.position.set(v.x,0,v.z);if(v.path.length){const p=v.path[0];o.g.rotation.y=Math.atan2(p.x-v.x,p.z-v.z);}o.legs.forEach((l,i)=>l.rotation.x=running&&v.status==='walking'?Math.sin(time*9+i*Math.PI)*.4:0);o.g.position.y=running&&v.status==='acting'?Math.sin(time*3)*.035:0;o.tag.position.set(v.x,2.3,v.z);o.tag.material.opacity=v.id===selected?1:.72;}const v=world.villagers.find(v=>v.id===selected);ring.position.set(v.x,.065,v.z);renderer.render(scene,camera);},dispose(){observer.disconnect();renderer.dispose();}};
}
