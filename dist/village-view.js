import * as T from '/vendor/three.module.js';
import {setIcon,face,setFace} from './icons.js';
import {PLACES,ACTIONS,INDOOR_ACTIONS,OPENABLE,HOMES,isNight,isOpen,hourOf,islandRadius} from './village-engine.js';
export const PLACE_ICONS={home:'house',fern:'house',bramble:'house',cafe:'cup',workshop:'hammer',garden:'sprout',pond:'waves',library:'book',market:'stall',bakery:'bread',inn:'lantern',grove:'pine',hill:'telescope'};
const HILL={x:-14,z:-17,r:4.8};
// Height of the ground, so villagers climb Starlight Hill instead of walking through it.
export function groundHeight(x,z){const d=Math.hypot(x-HILL.x,z-HILL.z);return d<HILL.r?Math.max(0,-.2+.45*Math.sqrt(HILL.r*HILL.r-d*d)):0;}
const PALETTE={spring:{grass:0x9dc47a,leaves:[0x78ab62,0x9cc57a,0xefb7c6],pines:[0x557c5b,0x6b955f]},summer:{grass:0x94b56e,leaves:[0x6e985c,0x8aad66,0x83a45f],pines:[0x557c5b,0x668e5d]},autumn:{grass:0xb3ae6c,leaves:[0xcf8a3e,0xe0ab52,0xb65a3a],pines:[0x4f7456,0x5f8757]},winter:{grass:0xf4f8fb,leaves:[0xdfe8eb,0xf3f6f7,0xc9d6db],pines:[0x4b6a57,0xe4ecee]}};
const SKY={sunny:0xdce7dd,cloudy:0xc3cbc8,rainy:0xaabfc0,stormy:0x7f8d93,snowy:0xe4e9ec};
const SUN={sunny:3,cloudy:1.8,rainy:1.4,stormy:.9,snowy:1.7};
// Seeded randomness keeps the scattered scenery natural but identical on every visit.
function seeded(seed){return ()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
// Island profile: a steep faceted cliff under the grass that tapers into a rocky floating underside. t runs from 0 (top) to 1 (tip).
function shore(a,t){const taper=t<.3?1-.1*t/.3:.9*(1-Math.pow((t-.3)/.7,1.4)*.9),rough=.025*Math.sin(9*a+4*t)+.02*Math.sin(17*a-7*t+1)+.015*Math.sin(31*a+11*t+2);return islandRadius(a)*(taper+rough*(t<.02?.3:1));}
const TOOLS={work:'hammer',craft:'hammer',garden:'watering',fish:'rod',read:'book',forage:'basket',chop:'axe',sell:'basket',music:'lute'};
export function createView(canvas,world,onSelect,{onUnfollow=()=>{},labelLayer=null}={}){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0xdce7dd);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.fog=new T.Fog(0xdce7dd,90,190);const camera=new T.OrthographicCamera(-30,30,25,-25,.1,300);let angle=.72,zoom=1,following=false;const target=new T.Vector3(),focus=new T.Vector3();
 const hemi=new T.HemisphereLight(0xfff4df,0x71816b,2.5);scene.add(hemi);const sun=new T.DirectionalLight(0xffe0a2,3);sun.position.set(-18,38,14);sun.castShadow=true;sun.shadow.mapSize.set(3072,3072);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,far:120});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.05;scene.add(sun);
 const materials=new Map();const standard=c=>new T.MeshStandardMaterial({color:c,roughness:1,flatShading:true});const mat=c=>{if(!materials.has(c))materials.set(c,standard(c));return materials.get(c)};
 function mesh(geo,color,x,y,z,parent=scene){const m=new T.Mesh(geo,typeof color==='number'?mat(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(w,h,d,c,x,y,z,parent)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,parent);
 const ball=(r,c,x,y,z,parent)=>mesh(new T.IcosahedronGeometry(r,1),c,x,y,z,parent);
 const cyl=(rt,rb,h,c,x,y,z,parent,n=8)=>mesh(new T.CylinderGeometry(rt,rb,h,n),c,x,y,z,parent);
 const glowing=(c,e)=>new T.MeshStandardMaterial({color:c,emissive:e,emissiveIntensity:0});
 // Seasonal surfaces share materials so a season change recolors the whole island.
 const grass=standard(PALETTE.summer.grass),leaves=PALETTE.summer.leaves.map(standard),pines=PALETTE.summer.pines.map(standard);
 const rand=seeded(4217),between=(a,b)=>a+rand()*(b-a);
 {const cliff=new T.CylinderGeometry(1,1,1,128,12),p=cliff.attributes.position,colors=[],c=new T.Color(),bands=[0xa3835e,0x8f7c68,0x6f675e].map(n=>new T.Color(n));
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),t=.5-p.getY(i),a=Math.atan2(z,x),r=Math.hypot(x,z)>.01?shore(a,t):0,y=-.08-t*8+(t>0&&t<1?Math.sin(a*13+t*9)*.22*t:0);p.setXYZ(i,Math.cos(a)*r,y,Math.sin(a)*r);
  c.copy(t<.25?bands[0]:bands[1]).lerp(t<.25?bands[1]:bands[2],t<.25?t/.25:(t-.25)/.75).offsetHSL(0,0,Math.sin(a*23+t*17)*.03);colors.push(c.r,c.g,c.b);}
 cliff.setAttribute('color',new T.Float32BufferAttribute(colors,3));cliff.computeVertexNormals();mesh(cliff,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}),0,0,0);
 const cap=new T.CylinderGeometry(1,1,.3,128,1),q=cap.attributes.position;for(let i=0;i<q.count;i++){const x=q.getX(i),z=q.getZ(i);if(Math.hypot(x,z)<.01)continue;const a=Math.atan2(z,x),r=shore(a,0)+.2;q.setX(i,Math.cos(a)*r);q.setZ(i,Math.sin(a)*r);}cap.computeVertexNormals();mesh(cap,grass,0,-.15,0);}
 // Hedges and half-buried rocks gather in uneven clumps along the shore.
 const rocks=[0xa9a592,0x9b9784,0xb8b3a0,0x8e8a78];
 for(let n=0;n<38;n++){const a0=rand()*Math.PI*2,count=1+Math.floor(rand()*4),rocky=rand()<.4;
 for(let i=0;i<count;i++){const a=a0+between(-.06,.06),r=islandRadius(a)-between(.5,2.3),x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(rocky&&i<2){const s=between(.3,.85),b=mesh(new T.DodecahedronGeometry(s,0),rocks[Math.floor(rand()*4)],x,s*.12,z);b.scale.set(between(1,1.5),between(.5,.8),between(1,1.4));b.rotation.set(rand()*.4,rand()*6,rand()*.4);}
  else{const s=between(.4,1),b=mesh(new T.IcosahedronGeometry(s,1),leaves[Math.floor(rand()*3)],x,s*.32,z);b.scale.set(between(1,1.4),between(.65,.85),between(1,1.4));b.rotation.y=rand()*6;}}}
 const hill=mesh(new T.SphereGeometry(HILL.r,18,10),grass,HILL.x,-.2,HILL.z);hill.scale.y=.45;
 const road=0xd7c6a1;box(1.7,.04,22,road,0,.03,-2.5);for(const z of [-12,-4,4])box(33,.05,1.5,road,0,.04,z);
 cyl(2.5,2.5,.05,0xe1d3b7,0,.055,0,scene,24);
 function stones(a,b,n){for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/(n+1),z=a.z+(b.z-a.z)*i/(n+1);const s=cyl(.34,.38,.08,0xd2c29c,x,groundHeight(x,z)+.05,z,scene,7);s.castShadow=false;}}
 stones(PLACES.hill,PLACES.hill.spot,5);stones(PLACES.grove,PLACES.grove.spot,5);
 const labels=[],doors=new Map(),windowPanes=[],projected=new T.Vector3();let width=1,height=1;
 // Name tags are real HTML floating over the canvas, so they get true glass blur, crisp text at any zoom and can be clicked.
 function element(tag,className,parent){const el=document.createElement(tag);if(className)el.className=className;parent?.append(el);return el;}
 function label(place,x,y,z){if(!labelLayer)return;const el=element('div','tag3d place',labelLayer),icon=element('span','tag-icon',el),text=element('span','tag-text',el),name=element('b','',text),detail=element('small','',text);setIcon(icon,PLACE_ICONS[place]);name.textContent=PLACES[place].name;el.title=PLACES[place].name;el.addEventListener('click',()=>{following=false;onUnfollow();focus.set(PLACES[place].x,0,PLACES[place].z);});labels.push({el,detail,place,pos:new T.Vector3(x,y,z),note:null});}
 function place(el,pos){projected.copy(pos).project(camera);const x=(projected.x*.5+.5)*width,y=(.5-projected.y*.5)*height,off=x<-80||x>width+80||y<-40||y>height+60;el.hidden=off;if(!off){el.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;el.style.zIndex=String(Math.round(y));}}
 const hour2=n=>String(n).padStart(2,'0')+':00';
 function placeNote(id){const here=world.villagers.filter(v=>v.target===id&&v.action&&v.status!=='walking'),who=here.length===1?here[0].name+' is here':here.length?here.length+' residents here':'';
  if(HOMES.includes(id)){const lives=world.villagers.filter(v=>(v.home||'home')===id).map(v=>v.name);return who||(lives.length?'Home of '+lives.join(', '):'Empty cottage');}
  if(OPENABLE.includes(id)&&!isOpen(world,id))return world.open[id]===false||!PLACES[id].hours?'Closed':'Opens '+hour2(PLACES[id].hours[0]);
  return who||(OPENABLE.includes(id)?'Open':'');}
 function chimney(x,z){return {x:x+1.1,y:4.1,z:z-.7};}
 function building(place,wall,roof){const p=PLACES[place],x=p.x,z=p.z-2;box(.16,2.7,3,wall,x-1.72,1.35,z);box(.16,2.7,3,wall,x+1.72,1.35,z);box(3.6,2.7,.16,wall,x,1.35,z-1.42);box(1.38,2.7,.16,wall,x-1.11,1.35,z+1.42);box(1.38,2.7,.16,wall,x+1.11,1.35,z+1.42);box(.84,1.1,.16,wall,x,2.15,z+1.42);box(3.4,.08,2.8,0x6c6048,x,.04,z);const top=mesh(new T.ConeGeometry(3,1.8,4),roof,x,3.3,z);top.rotation.y=Math.PI/4;top.scale.z=.9;const hinge=new T.Group();hinge.position.set(x-.4,0,z+1.56);scene.add(hinge);box(.8,1.6,.12,0x69503a,.4,.8,0,hinge);ball(.045,0xc9ac6f,.7,.8,.09,hinge);doors.set(place,{hinge,x,z:p.z});for(const dx of [-1.15,1.15]){const pane=box(.65,.8,.15,0xffdc83,x+dx,1.5,z+1.58);pane.material=glowing(0xffdc83,0xffb35f);windowPanes.push(pane);box(.06,.8,.18,0x72553c,x+dx,1.5,z+1.62);box(.7,.06,.18,0x72553c,x+dx,1.5,z+1.62);}box(.55,1.2,.6,0x99725c,x+1.1,3.5,z-.7);box(1.2,.18,.7,0xa89275,x,.09,z+1.95);label(place,x,4.6,z);return {x,z};}
 building('home',0xefdcaf,0x849b71);building('fern',0xe8d6b8,0x9a7b5c);building('bramble',0xf1e0c2,0xb0706a);
 const cafe=building('cafe',0xf2d6ac,0xca8263);const shop=building('workshop',0xd5bc90,0x698c90);
 const library=building('library',0xd9cfb8,0x5f6f8f);const bakery=building('bakery',0xf0dcc0,0xb9774e);const inn=building('inn',0xe2c9a0,0x7a5b8a);
 // Striped cafe awning and little outdoor tables.
 for(let i=0;i<7;i++)box(.46,.12,1, i%2?0xf4e8c9:0xd7a066,cafe.x-1.38+i*.46,2.2,cafe.z+1.9);
 for(const dx of [-1,1]){cyl(.48,.48,.13,0x9a7250,cafe.x+dx,.65,-2.1);cyl(.08,.08,.6,0x705b46,cafe.x+dx,.3,-2.1);}
 // Library columns and a book sign; inn sign and porch lantern.
 for(const dx of [-1.45,1.45])cyl(.14,.16,2.6,0xeee6d2,library.x+dx,1.3,library.z+1.9);box(3.4,.2,.5,0xeee6d2,library.x,2.7,library.z+1.9);box(.7,.5,.12,0x8a5a44,library.x,3.1,library.z+1.72);
 cyl(.06,.06,2.3,0x6b5540,inn.x+2.3,1.15,inn.z+2.4);box(.9,.06,.06,0x6b5540,inn.x+1.95,2.2,inn.z+2.4);box(.7,.5,.08,0x7a5b8a,inn.x+1.75,1.85,inn.z+2.4);
 const innLamp=ball(.16,0xffd787,inn.x-1.9,1.9,inn.z+1.9);innLamp.material=glowing(0xffd787,0xffa947);
 // Market stalls show the village's goods.
 const market=PLACES.market,goodsCrates=[],awnings=[0xd7a066,0x8fb0c9,0xc98fa3];
 for(let s=0;s<3;s++){const x=market.x-2.5+s*2.5,z=market.z-2.4;box(1.8,.8,.9,0xb08a5e,x,.4,z);for(const dx of [-.8,.8])for(const dz of [-.35,.35])box(.08,1.9,.08,0x7d6448,x+dx,.95,z+dz);for(let i=0;i<4;i++)box(.45,.08,1.1,i%2?0xf4e8c9:awnings[s],x-.68+i*.45,1.95,z);for(let i=0;i<3;i++){const crate=box(.36,.3,.36,[0xc9a36b,0xa7c07a,0xe0b08a][s],x-.5+i*.5,.95,z);crate.visible=false;goodsCrates.push(crate);}}
 label('market',market.x,3.2,market.z-2.4);
 // Workshop woodpile grows and shrinks with the village's wood.
 const logs=[];for(let i=0;i<10;i++){const row=Math.floor(i/4),log=cyl(.2,.2,1.6,0x9a764f,shop.x+2.9,.22+row*.36,shop.z-1+(i%4)*.44+row*.22);log.rotation.z=Math.PI/2;log.visible=false;logs.push(log);}
 // Bakery windmill.
 const mill={x:bakery.x-3.4,z:bakery.z};cyl(.55,.9,4.2,0xe6d8bd,mill.x,2.1,mill.z,scene,8);mesh(new T.ConeGeometry(.8,1,8),0xb9774e,mill.x,4.7,mill.z);const blades=new T.Group();blades.position.set(mill.x,3.9,mill.z+.95);scene.add(blades);for(let i=0;i<4;i++){const arm=new T.Group();arm.rotation.z=i*Math.PI/2;blades.add(arm);box(.1,2.2,.05,0x8d6e4e,0,1.1,0,arm);box(.5,1.6,.03,0xf2ead8,.3,1.3,0,arm);}
 const oven=new T.Group();scene.add(oven);box(1.3,1,1.2,0xa8604a,bakery.x+2.6,.5,bakery.z+.2,oven);mesh(new T.SphereGeometry(.65,10,6,0,Math.PI*2,0,Math.PI/2),0xa8604a,bakery.x+2.6,1,bakery.z+.2,oven);cyl(.15,.15,.9,0x7d4a3a,bakery.x+2.6,1.8,bakery.z,oven);
 // Garden plot, expansion beds and a greenhouse.
 box(4,.16,3.8,0x715f42,5,.1,6.3);const crops=[];for(let row=0;row<3;row++)for(let col=0;col<5;col++){const x=3.6+col*.7,z=5.2+row*1.05;cyl(.05,.06,.35,0x6e944d,x,.35,z);const leaf=mesh(new T.IcosahedronGeometry(.23,1),leaves[1],x,.55,z);leaf.scale.set(1,.6,1);crops.push(ball(.1,0xe29e53,x,.31,z));}
 label('garden',5,1.5,7.8);
 function fence(x,z,horizontal){for(let i=0;i<4;i++){const dx=horizontal?i*.8:0,dz=horizontal?0:i*.8;box(.14,.85,.14,0xe7d8b5,x+dx,.45,z+dz);}box(horizontal?2.6:.12,.1,horizontal?.12:2.6,0xe7d8b5,x+(horizontal?1.2:0),.6,z+(horizontal?0:1.2));}
 fence(3.4,8.4,true);fence(7.5,4.7,false);
 const upgradeBeds=new T.Group();scene.add(upgradeBeds);box(2,.16,3,0x715f42,9,.1,6.3,upgradeBeds);for(let i=0;i<6;i++)ball(.25,0x79a15c,8.6+(i%2)*.8,.4,5.3+Math.floor(i/2)*.85,upgradeBeds);
 const greenhouse=new T.Group();scene.add(greenhouse);const glass=new T.MeshStandardMaterial({color:0xcfe8e6,transparent:true,opacity:.42,roughness:.15,metalness:.1});
 {const g=new T.Mesh(new T.BoxGeometry(3.2,1.6,2.4),glass);g.position.set(5.5,.8,10.8);greenhouse.add(g);const roof=new T.Mesh(new T.CylinderGeometry(1.2,1.2,3.2,4,1,false,0,Math.PI),glass);roof.rotation.z=Math.PI/2;roof.rotation.x=Math.PI/4;roof.position.set(5.5,1.6,10.8);greenhouse.add(roof);for(const dx of [-1.6,1.6])for(const dz of [-1.2,1.2])box(.07,1.65,.07,0xf3f1ea,5.5+dx,.82,10.8+dz,greenhouse);for(let i=0;i<4;i++)ball(.28,0x7cae5b,4.4+i*.72,.35,10.8,greenhouse);}
 // Willow Pond, the pier and the dock extension.
 const water=mesh(new T.CylinderGeometry(2.7,2.7,.04,36),0x79b5b2,0,.02,10);water.material=new T.MeshStandardMaterial({color:0x70b3b5,roughness:.28,metalness:.15});water.scale.z=.7;
 for(let i=0;i<16;i++){const a=i*Math.PI/8;const stone=ball(.32,0xa9ac94,Math.cos(a)*2.75,.1,10+Math.sin(a)*1.95);stone.scale.y=.55;}
 box(1.25,.14,2,0xb39a71,0,.18,7.7);for(let i=0;i<5;i++)box(1.3,.04,.035,0x857458,0,.27,7+i*.32);
 const dock=new T.Group();scene.add(dock);box(1.25,.14,1.6,0xb39a71,0,.18,9.5,dock);for(const dx of [-.55,.55])cyl(.07,.07,.7,0x7d6448,dx,.05,10.2,dock);
 label('pond',0,1.2,12.6);
 // Fountain on the green.
 const fountain=new T.Group();scene.add(fountain);cyl(1.1,1.2,.4,0xc7c1b0,0,.2,0,fountain,16);const pool=cyl(.95,.95,.05,0x7fc0c4,0,.41,0,fountain,16);pool.material=new T.MeshStandardMaterial({color:0x7fc0c4,roughness:.2,metalness:.15});cyl(.14,.2,1.1,0xc7c1b0,0,.9,0,fountain);cyl(.45,.2,.2,0xc7c1b0,0,1.45,0,fountain,12);const jet=ball(.16,0xbfe4e8,0,1.7,0,fountain);jet.material=new T.MeshStandardMaterial({color:0xcdeef0,transparent:true,opacity:.75});
 // Starlight Hill telescope and Whispering Grove.
 {const tx=-13.2,tz=-17.7,ty=groundHeight(tx,tz);for(let i=0;i<3;i++){const leg=cyl(.03,.03,1.1,0x5b4a3a,tx+Math.cos(i*2.1)*.22,ty+.5,tz+Math.sin(i*2.1)*.22);leg.rotation.z=Math.cos(i*2.1)*.2;leg.rotation.x=-Math.sin(i*2.1)*.2;}const tube=cyl(.09,.12,1,0xb89a5c,tx,ty+1.15,tz);tube.rotation.x=.9;}
 label('hill',HILL.x,groundHeight(HILL.x,HILL.z)+2.6,HILL.z);
 function tree(x,z,scale=1,pine=false){const g=new T.Group();g.position.set(x,groundHeight(x,z),z);g.scale.setScalar(scale);scene.add(g);cyl(.16,.24,1.7,0x92704a,0,.85,0,g);if(pine){cyl(0,1.15,2.1,pines[0],0,2,0,g);cyl(0,.85,1.8,pines[1],0,3,0,g);}else{mesh(new T.IcosahedronGeometry(1.15,1),leaves[0],0,2.2,0,g);mesh(new T.IcosahedronGeometry(.85,1),leaves[1],.65,2.55,.1,g);mesh(new T.IcosahedronGeometry(.8,1),leaves[2],-.65,2.35,.2,g);}return g;}
 [[-20,-8],[-21,-2],[-19,7],[-17,11],[-10,13],[-6,11.5],[-4,16],[4,16],[9,14],[14,11],[19,8],[21,1],[20,-7],[-9,-8],[8.5,-9.5],[-9,8],[10.5,10],[-8,-19.5],[0,-18],[7,-19],[-19.5,-13],[-2,-21],[-17,-4.5],[17,-2]].forEach(([x,z],i)=>tree(x,z,.85+(i%3)*.12,i%4===0));
 [[12,-15.3],[16.6,-14.7],[13,-18.6],[16.2,-18.8],[11,-17.8],[18.2,-16.4],[14.5,-20.4],[17.8,-18.4],[12.2,-21],[10.2,-15]].forEach(([x,z],i)=>tree(x,z,.95+(i%3)*.15,true));
 for(const [x,z] of [[15.6,-16.5],[13.4,-16.9]]){cyl(.3,.34,.35,0x9a764f,x,.17,z);cyl(.28,.28,.02,0xd9bf8e,x,.36,z);}
 label('grove',14.5,5,-18.2);
 // Flowers avoid lanes, buildings and water.
 const blocked=[[0,0,3],[0,10,3.4],[HILL.x,HILL.z,5.2],[14.5,-17.5,4.8],[5,6.3,2.8],[9,6.3,1.8],[5.5,10.8,2.2],[mill.x,mill.z,1.4],[13,-6.4,4]];for(const place of ['home','fern','bramble','cafe','workshop','library','bakery','inn'])blocked.push([PLACES[place].x,PLACES[place].z-2,2.8]);
 const flowerColors=[0xe8cf86,0xe9b1a7,0xf5ead0,0xb9a6de],flowers=new T.Group();scene.add(flowers);
 for(let i=0;i<300;i++){const a=rand()*Math.PI*2,r=2+Math.sqrt(rand())*(islandRadius(a)-4),x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<1.3&&z>-13.5&&z<8.8)continue;if([-12,-4,4].some(rz=>Math.abs(z-rz)<1.1&&Math.abs(x)<16.8))continue;if(blocked.some(([bx,bz,br])=>Math.hypot(x-bx,z-bz)<br))continue;const flower=ball(.095,flowerColors[i%4],x,.22,z,flowers);flower.castShadow=false;cyl(.022,.025,.17,0x668451,x,.08,z,flowers).castShadow=false;}
 // Rain, snow, fireflies, drifting chimney smoke and warm village lanterns.
 function particles(n,size,color,opacity){const data=new Float32Array(n*3);for(let i=0;i<n;i++){data[i*3]=(i*13.71%52)-26;data[i*3+1]=i*.79%18;data[i*3+2]=(i*7.13%52)-26;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(data,3));const points=new T.Points(geo,new T.PointsMaterial({color,size,transparent:true,opacity,depthWrite:false}));scene.add(points);return {points,data,geo,n};}
 const rain=particles(900,.08,0xd9edf3,.75),snow=particles(700,.16,0xffffff,.9),flies=particles(40,.16,0xfff0a0,.9);
 const smokers=[{...chimney(-6,-6),on:()=>true},{...chimney(bakery.x,bakery.z),on:()=>world.upgrades.oven||world.villagers.some(v=>v.action==='bake'&&v.status==='acting')},{...chimney(inn.x,inn.z),on:()=>{const h=hourOf(world);return h>=16||h<2;}}].map(s=>({...s,puffs:Array.from({length:8},()=>{const puff=ball(.18,0xe1decb,s.x,s.y,s.z);puff.material=new T.MeshStandardMaterial({color:0xebe6d8,transparent:true,opacity:0,depthWrite:false});puff.castShadow=false;return puff;})}));
 const lamps=[];[[-2.4,-2.2],[2.4,-2.2],[-1.4,5.2],[1.4,-5.2],[-9.5,-5.2],[9.5,-2.8],[-9.5,2.8],[9.5,5.2],[-1.4,-10.8],[9,-10.8],[-9,-10.8],[1.4,7.6]].forEach(([x,z],i)=>{cyl(.05,.08,1.9,0x655e49,x,.95,z);const glow=ball(.18,0xffd787,x,2,z);glow.material=glowing(0xffd787,0xffa947);let light=null;if(i<6){light=new T.PointLight(0xffc174,0,8,2);light.position.set(x,2,z);scene.add(light);}lamps.push({glow,light});});
 const ripples=[];for(let i=0;i<3;i++){const r=mesh(new T.RingGeometry(.4,.43,32),0xb6d7c5,0,.055,10);r.rotation.x=-Math.PI/2;r.material=new T.MeshBasicMaterial({color:0xc4e3d0,transparent:true,opacity:.3,side:T.DoubleSide});ripples.push(r);}
 // A little bench, stepping stones, and crates make public spaces feel inhabited.
 for(const x of [-2,2]){box(1.2,.14,.45,0xb59569,x,.52,1.8);box(1.2,.45,.1,0xb59569,x,.86,2);for(const dx of [-.45,.45])box(.1,.5,.3,0x776e52,x+dx,.25,1.8);}
 for(let i=0;i<4;i++){box(.6,.6,.6,0xba9868,-8.4,.3,2.5+i*.75);box(.64,.06,.64,0x8b7959,-8.4,.48,2.5+i*.75);}
 const butterflies=[];for(let i=0;i<6;i++){const g=new T.Group();scene.add(g);const wings=[];for(const side of [-1,1]){const wing=ball(.12,i%2?0xe6b179:0xf5d390,side*.12,0,0,g);wing.scale.set(1,.1,1.6);wings.push(wing);}butterflies.push({g,wings});}

 // Villagers have original toy-like silhouettes and independent walking limbs. They can join, change or leave at any time.
 const people=new Map();
 function person(v){
 const g=new T.Group();g.userData.villager=v.id;scene.add(g);const shirt=standard(v.color),hair=standard(v.hair??0x75553e),owned=[shirt,hair];
 cyl(.27,.32,.7,shirt,0,.8,0,g);ball(.28,0xe7bd95,0,1.4,0,g);const cut=ball(.29,hair,0,1.52,-.04,g);cut.scale.y=.65;
 const legs=[],arms=[];
 for(const dx of [-.14,.14]){
 const leg=new T.Group();leg.position.set(dx,.49,0);g.add(leg);box(.15,.38,.17,0x596157,0,-.2,0,leg);box(.18,.12,.28,0x614f41,0,-.41,.04,leg);legs.push(leg);
 const arm=new T.Group();arm.position.set(dx*2.5,1.1,0);g.add(arm);box(.12,.44,.15,shirt,0,-.22,0,arm);ball(.08,0xe7bd95,0,-.47,0,arm);arms.push(arm);
 }
 for(const dx of [-.095,.095])ball(.032,0x45473b,dx,1.43,.255,g);
 const hats={};for(const name of ['straw','beanie','chef','flower']){hats[name]=new T.Group();g.add(hats[name]);}
 cyl(.36,.38,.08,0xe0bc73,0,1.7,0,hats.straw);cyl(.22,.27,.17,0xe0bc73,0,1.81,0,hats.straw);
 const beanie=ball(.3,0xc0584a,0,1.6,-.02,hats.beanie);beanie.scale.y=.7;ball(.08,0xf2ead8,0,1.86,0,hats.beanie);
 cyl(.25,.22,.34,0xf7f5ef,0,1.82,0,hats.chef);ball(.26,0xf7f5ef,0,2,0,hats.chef);
 for(let i=0;i<5;i++)ball(.07,[0xf2a5b5,0xf5d390,0xffffff][i%3],Math.cos(i*1.26)*.27,1.62,Math.sin(i*1.26)*.27,hats.flower);
 const tools={};for(const name of ['hammer','watering','rod','book','basket','axe','lute']){const prop=new T.Group();arms[1].add(prop);prop.position.set(0,-.45,.07);prop.visible=false;tools[name]=prop;}
 box(.08,.55,.08,0xa58a60,0,.15,0,tools.hammer);box(.3,.14,.15,0x7d8a85,0,.42,0,tools.hammer);
 cyl(.14,.16,.24,0x87a9a2,0,0,0,tools.watering);box(.07,.07,.35,0x87a9a2,0,.06,.2,tools.watering);
 const rod=cyl(.025,.035,1.6,0xa68c65,0,.7,0,tools.rod);rod.rotation.x=-.6;box(.012,.7,.012,0xe9e1c5,0,.9,-.44,tools.rod);
 box(.42,.06,.28,0xa78467,0,0,.1,tools.book);box(.36,.035,.25,0xf0e3bc,0,.04,.1,tools.book);
 cyl(.22,.17,.25,0xc8a272,0,0,0,tools.basket);ball(.11,0x89a56e,.05,.16,0,tools.basket);
 box(.07,.8,.07,0x9a7a52,0,.3,0,tools.axe);box(.06,.26,.3,0x8b9491,0,.66,.12,tools.axe);
 const body=ball(.2,0xb07a48,0,0,.18,tools.lute);body.scale.z=.5;box(.05,.5,.04,0x7a5634,0,.3,.18,tools.lute);
 const tag=labelLayer?element('div','tag3d person',labelLayer):null,swatch=tag&&face(v),name=tag&&element('b','',tag),act=tag&&element('span','tag-act',tag);tag?.prepend(swatch);tag?.addEventListener('click',()=>{selected=v.id;onSelect(v.id);});
 return {g,legs,arms,tag,swatch,name,act,tools,hats,shirt,hair,owned,text:'',tagPos:new T.Vector3()};
 }
 function sync(){
 for(const v of world.villagers)if(!people.has(v.id))people.set(v.id,person(v));
 for(const [id,o] of people)if(!world.villagers.some(v=>v.id===id)){scene.remove(o.g);o.tag.remove?.();o.g.traverse(n=>n.geometry?.dispose());o.owned.forEach(m=>m.dispose());people.delete(id);}
 }
 sync();
 const ring=mesh(new T.RingGeometry(.48,.59,40),0xf8e7a2,0,.07,0);ring.rotation.x=-Math.PI/2;ring.material=new T.MeshBasicMaterial({color:0xffefb5,side:T.DoubleSide});

 let motion=0,lastVisualTime=null,selected=world.villagers[0]?.id;const ray=new T.Raycaster(),pointers=new Map();let drag=null,pinch=0;
 function pick(e){const b=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObjects([...people.values()].map(o=>o.g),true).find(h=>{let node=h.object;while(node){if(!node.visible)return false;node=node.parent;}return true;});if(!hit)return;let node=hit.object;while(node&&!node.userData.villager)node=node.parent;if(node){selected=node.userData.villager;onSelect(selected);}}
 function setZoom(z){zoom=T.MathUtils.clamp(z,.6,3.2);resize();}
 function pan(dx,dz){following=false;onUnfollow();focus.x=T.MathUtils.clamp(focus.x+dx,-26,26);focus.z=T.MathUtils.clamp(focus.z+dz,-26,26);}
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={moved:0,pan:e.button===2||e.shiftKey};});
 canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p||!drag)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)setZoom(zoom*d/pinch);pinch=d;drag.moved+=99;return;}
 drag.moved+=Math.abs(dx)+Math.abs(dy);if(drag.moved<6)return;
 if(drag.pan){const s=(camera.right-camera.left)/canvas.getBoundingClientRect().width,c=Math.cos(angle),n=Math.sin(angle),k=1.53;pan((-dx*c-dy*n*k)*s,(dx*n-dy*c*k)*s);}else angle-=dx*.008;});
 const release=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=0;if(drag&&drag.moved<6&&e.type==='pointerup'&&e.button===0)pick(e);if(!pointers.size)drag=null;};
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom-e.deltaY*.0012*zoom);},{passive:false});
 function resize(){const b=canvas.parentElement.getBoundingClientRect();width=b.width;height=b.height;renderer.setSize(b.width,b.height,false);const aspect=b.width/b.height,span=Math.max(21,26/aspect)/zoom;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
 const tint=new T.Color(),white=new T.Color(0xffffff);
 // Seasons blend over about a second, independent of frame rate.
 function season(dt){const k=1-Math.exp(-dt*4),p=PALETTE[world.season]||PALETTE.summer,snowy=world.weather==='snowy'&&world.season!=='winter';tint.set(p.grass);if(snowy)tint.lerp(white,.6);grass.color.lerp(tint,k);leaves.forEach((m,i)=>{tint.set(p.leaves[i]);if(snowy)tint.lerp(white,.45);m.color.lerp(tint,k);});pines.forEach((m,i)=>m.color.lerp(tint.set(p.pines[i]),k));}
 function fall(field,speed,drift,visible){field.points.visible=visible;if(!visible)return;for(let i=0;i<field.n;i++){field.data[i*3+1]=18-((motion*speed+i*.79)%18);if(drift)field.data[i*3]=(i*13.71%52)-26+Math.sin(motion*.6+i)*drift;}field.geo.attributes.position.needsUpdate=true;}
 return {follow:on=>{following=on;},reset:()=>{following=false;angle=.72;focus.set(0,0,0);setZoom(1);},select:id=>{selected=id;},rotate:d=>{angle+=d;},zoom:d=>setZoom(zoom+d),pan,nudge:(right,forward)=>{const c=Math.cos(angle),n=Math.sin(angle);pan(right*c-forward*n,-right*n-forward*c);},focus:(x,z)=>{following=false;focus.set(T.MathUtils.clamp(x,-26,26),0,T.MathUtils.clamp(z,-26,26));},getFocus:()=>({x:target.x,z:target.z,angle,zoom}),draw(time,running){
 const visualDelta=lastVisualTime===null?0:Math.min(.1,Math.max(0,time-lastVisualTime));lastVisualTime=time;if(running)motion+=visualDelta;
 sync();
 const chosen=world.villagers.find(v=>v.id===selected)||world.villagers[0];target.lerp(following&&chosen?new T.Vector3(chosen.x,0,chosen.z):focus,.07);
 camera.position.set(target.x+Math.sin(angle)*30,26,target.z+Math.cos(angle)*30);camera.lookAt(target);
 const weather=world.weather,rainy=weather==='rainy'||weather==='stormy',hour=hourOf(world),night=isNight(world);
 labelLayer?.classList.toggle('far',zoom<.9||width<700);labelLayer?.classList.toggle('tiny',width<700&&zoom<1.6);for(const entry of labels){const note=placeNote(entry.place);if(note!==entry.note){entry.note=note;entry.detail.textContent=note;entry.el.classList.toggle('closed',note==='Closed'||note.startsWith('Opens'));}place(entry.el,entry.pos);}for(const pane of windowPanes)pane.material.emissiveIntensity=night?1.3:0;
 for(const [place,door] of doors){const near=world.villagers.some(v=>v.action&&v.target===place&&INDOOR_ACTIONS.has(v.action)&&((v.status==='walking'&&Math.hypot(v.x-door.x,v.z-door.z)<1.7)||v.status==='entering'||v.status==='exiting'));door.hinge.rotation.y=T.MathUtils.lerp(door.hinge.rotation.y,near?-1.5:0,.16);}
 const daylight=T.MathUtils.smoothstep(Math.sin((hour-6)/24*Math.PI*2),-.15,.45);
 const flash=weather==='stormy'?Math.max(0,Math.sin(motion*.9)*Math.sin(motion*3.7)*Math.sin(motion*.37)-.55)*6:0;
 const sky=new T.Color(weather==='stormy'?0x1a2430:0x26374d).lerp(new T.Color(SKY[weather]||SKY.sunny),daylight);renderer.setClearColor(sky);scene.fog.color.copy(sky);
 sun.intensity=(SUN[weather]||3)*daylight;hemi.intensity=.65+daylight*1.85+flash;
 const cold=world.season==='winter'||world.weather==='snowy';sun.color.set(cold?0xeef2ff:hour>16&&hour<20?0xffba76:0xffe0a2);hemi.color.set(cold?0xf0f4ff:0xfff4df);
 season(visualDelta);flowers.visible=world.season!=='winter';water.material.color.lerp(tint.set(world.season==='winter'?0xd4e8ee:0x70b3b5),1-Math.exp(-visualDelta*4));water.material.roughness=world.season==='winter'?.08:.28;
 upgradeBeds.visible=!!world.upgrades.garden;greenhouse.visible=!!world.upgrades.greenhouse;fountain.visible=!!world.upgrades.fountain;dock.visible=!!world.upgrades.dock;oven.visible=!!world.upgrades.oven;
 jet.position.y=1.7+Math.abs(Math.sin(motion*3))*.18;
 for(const {glow,light} of lamps){glow.material.emissiveIntensity=world.upgrades.lanterns?(1-daylight)*2:0;if(light)light.intensity=world.upgrades.lanterns?(1-daylight)*9:0;}
 const innOpen=world.open.inn!==false&&(hour>=16||hour<2);innLamp.material.emissiveIntensity=innOpen?1.2+(1-daylight):0;
 logs.forEach((log,i)=>log.visible=i<world.wood);goodsCrates.forEach((crate,i)=>crate.visible=i<world.goods);crops.forEach(c=>c.visible=world.season!=='winter'||!!world.upgrades.greenhouse);
 blades.rotation.z-=running?visualDelta*(world.villagers.some(v=>v.action==='bake')?2.4:.6)*(weather==='stormy'?2:1):0;
 fall(rain,weather==='stormy'?13:8,0,rainy);rain.points.material.opacity=weather==='stormy'?.9:.7;
 fall(snow,1.3,.6,weather==='snowy');
 const fireflies=night&&!rainy&&weather!=='snowy'&&(world.season==='summer'||world.season==='spring');flies.points.visible=fireflies;
 if(fireflies){for(let i=0;i<flies.n;i++){const home=i%2?{x:0,z:10}:{x:14,z:-16};flies.data[i*3]=home.x+Math.sin(motion*.3+i*1.7)*4;flies.data[i*3+1]=.6+Math.sin(motion*.9+i)*.5+1;flies.data[i*3+2]=home.z+Math.cos(motion*.25+i*2.3)*3;}flies.geo.attributes.position.needsUpdate=true;flies.points.material.opacity=.55+Math.sin(motion*4)*.35;}
 for(const s of smokers){const on=s.on();s.puffs.forEach((p,i)=>{const life=(motion*.35+i/8)%1;p.position.set(s.x+life*.5,s.y+life*2,s.z);p.scale.setScalar(1+life*2);p.material.opacity=on?(1-life)*.25:0;});}
 butterflies.forEach(({g,wings},i)=>{g.visible=!rainy&&weather!=='snowy'&&world.season!=='winter'&&daylight>.4;const cx=i<4?5:-13,cz=i<4?6:-14;g.position.set(cx+Math.sin(motion*.4+i)*2,1.3+Math.sin(motion*.7+i)*.4+groundHeight(cx,cz),cz+Math.cos(motion*.5+i));wings.forEach((w,j)=>w.rotation.z=Math.sin(motion*12+i)*(j?1:-1));});
 ripples.forEach((r,i)=>{r.visible=world.season!=='winter';const phase=(motion*.25+i/3)%1;r.scale.setScalar(.4+phase*3);r.material.opacity=(1-phase)*.35;});
 for(const v of world.villagers){
 const o=people.get(v.id),walking=v.status==='walking',acting=v.status==='acting',inside=acting&&INDOOR_ACTIONS.has(v.action),crossing=v.status==='entering'||v.status==='exiting',swimming=acting&&v.action==='swim';
 o.shirt.color.setHex(v.color);o.hair.color.setHex(v.hair??0x75553e);for(const [name,hat] of Object.entries(o.hats))hat.visible=v.hat===name;
 const ground=groundHeight(v.x,v.z);
 o.g.visible=!inside;o.g.position.set(v.x,ground,v.z-(crossing?(v.doorPhase||0)*1.25:0));
 if(v.path.length){const p=v.path[0];const desired=Math.atan2(p.x-v.x,p.z-v.z);const delta=Math.atan2(Math.sin(desired-o.g.rotation.y),Math.cos(desired-o.g.rotation.y));o.g.rotation.y+=delta*.2;}
 if(crossing)o.g.rotation.y=v.status==='entering'?Math.PI:0;
 if(acting&&['fish','music','sell'].includes(v.action))o.g.rotation.y=v.action==='sell'?Math.PI:0;
 if(acting&&v.action==='stargaze')o.g.rotation.y=Math.PI*.8;
 const fast=v.gait==='run',cycle=running?world.time*(fast?3.2:2.2)/(world.rules.clock/4):0,stride=fast?.75:.42;
 o.legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(cycle+i*Math.PI)*stride:0);
 o.g.position.y=ground+(walking?Math.abs(Math.sin(cycle))*(fast?.1:.04):0);o.g.rotation.x=walking&&fast?.1:0;o.g.rotation.z=0;
 if(swimming)o.g.position.y=-.55+Math.sin(motion*2)*.05;
 const a=acting?v.action:null;
 o.arms.forEach((arm,i)=>{arm.rotation.x=walking?Math.sin(cycle+i*Math.PI+Math.PI)*stride*.8:0;arm.rotation.z=0;if(!a)return;
  arm.rotation.x=a==='work'||a==='craft'?-1+Math.sin(motion*5+i)*.8:a==='chop'?(i?-1.9+Math.abs(Math.sin(motion*3))*1.6:-.3):a==='garden'?-.6+Math.sin(motion*3+i)*.35:a==='read'?-.9:a==='fish'?-.45+Math.sin(motion)*.06:a==='forage'?-.8+Math.sin(motion*2)*.5:a==='socialize'?-.3+Math.sin(motion*2+i)*.4:a==='sell'?(i?-2.4+Math.sin(motion*4)*.3:-.5):a==='music'?(i?-1.1+Math.sin(motion*10)*.15:-1.2):a==='stargaze'?(i?-2.7:-.2):a==='swim'?motion*4+i*Math.PI:a==='donate'?(i?-1.2:0):a==='exercise'?-.3+Math.sin(motion*2)*.1:0;});
 if(acting&&v.action==='forage')o.g.rotation.x=.3;
 for(const prop of Object.values(o.tools))prop.visible=false;
 const tool=TOOLS[v.action];if(acting&&tool)o.tools[tool].visible=true;
 const icon=v.status==='thinking'?'dots':v.action?ACTIONS[v.action].icon:'',text=v.name+'|'+icon+'|'+v.color;

 if(o.tag&&o.text!==text){o.text=text;o.name.textContent=v.name;if(icon)setIcon(o.act,icon);o.act.hidden=!icon;}
 if(o.tag){setFace(o.swatch,v);o.tag.classList.toggle('selected',v.id===selected);o.tag.classList.toggle('inside',inside);o.tag.classList.toggle('thinking',v.status==='thinking');o.tag.classList.toggle('care',v.hunger>=75||v.energy<=20||v.happiness<30);o.tagPos.set(v.x,ground+(inside?2.5:swimming?1.4:2.15),v.z);place(o.tag,o.tagPos);}
 }
 if(chosen){ring.visible=true;ring.position.set(chosen.x,groundHeight(chosen.x,chosen.z)+.065,chosen.z);}else ring.visible=false;
 renderer.render(scene,camera);},dispose(){observer.disconnect();for(const entry of labels)entry.el.remove?.();for(const o of people.values())o.tag?.remove?.();renderer.dispose();}};
}
