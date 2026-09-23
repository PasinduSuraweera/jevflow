export const PLACES={home:{x:-6,z:-4,name:'Mossy Cottage'},cafe:{x:5,z:-4,name:'The Honeycup'},workshop:{x:-6,z:4,name:'Timber & Thread'},garden:{x:5,z:4,name:'Community Garden'},pond:{x:0,z:7,name:'Willow Pond'},square:{x:0,z:0,name:'Village Green'}};
export const ACTIONS={eat:{place:'cafe',duration:12,label:'Enjoying a meal',description:'Spend 3 coins and one cafe meal to reduce hunger by 55.'},rest:{place:'home',duration:15,label:'Taking a little rest',description:'Rest at home and regain 50 energy.'},work:{place:'workshop',duration:16,label:'Making something useful',description:'Spend 20 energy doing a shift and earn 8 coins.'},garden:{place:'garden',duration:13,label:'Tending the garden',description:'Spend 12 energy to grow 2 meals for the community cafe. Not available in rain.'},explore:{place:'pond',duration:10,label:'Exploring by the pond',description:'Spend 8 energy and gain 25 happiness. Not available in rain.'},socialize:{place:'square',duration:12,label:'Spending time on the green',description:'Spend 5 energy and gain 20 happiness in the village square.'}};
Object.assign(ACTIONS,{
 fish:{place:'pond',duration:18,label:'Fishing at Willow Pond',description:'Spend 10 energy fishing to add 2 meals to the cafe and gain 10 happiness. Dry weather only.',energyCost:10,outdoor:true},
 forage:{place:'garden',duration:14,label:'Gathering wild herbs',description:'Spend 8 energy gathering herbs to add 1 meal and earn 2 coins. Dry weather only.',energyCost:8,outdoor:true},
 cook:{place:'cafe',duration:16,label:'Cooking for the neighbors',description:'Spend 12 energy preparing 3 meals for the cafe. Requires the cafe to be open.',energyCost:12},
 read:{place:'square',duration:14,label:'Reading on the green',description:'Read on a bench to restore 15 energy and gain 12 happiness. Dry weather only.',energyCost:0,outdoor:true},
 exercise:{place:'square',duration:8,label:'Cooling down after a run',description:'Spend 18 energy on a running loop, then cool down and gain 30 happiness. Dry weather only.',energyCost:18,outdoor:true}
});
export const INDOOR_ACTIONS=new Set(['rest','eat','cook']);
export function isNight(w){const hour=w.time%1440/60;return hour<6||hour>=19;}
const cap=n=>Math.max(0,Math.min(100,n));
export function createWorld(){return {time:8*60,weather:'sunny',cafeOpen:true,food:8,version:0,treasury:0,completed:0,harvests:0,upgrades:{garden:false,lanterns:false},villagers:[{id:'mira',name:'Mira',personality:'Curious gardener who enjoys exploring, but cares about feeding the village.',color:0xe5a055,hunger:64,energy:68,money:9,happiness:62,x:-1,z:0},{id:'rowan',name:'Rowan',personality:'Practical craftsperson. Values a productive day and keeping a little money saved.',color:0x72a8a2,hunger:35,energy:81,money:4,happiness:58,x:1,z:0},{id:'pip',name:'Pip',personality:'Sociable dreamer who loves the pond and dislikes working when tired.',color:0xb294c1,hunger:48,energy:30,money:12,happiness:45,x:0,z:1}].map(v=>({...v,status:'idle',action:null,path:[],remaining:0,last:null,thought:'Waiting for you to start the village.',memory:[]}))};}
export function legalActions(w,v){return Object.keys(ACTIONS).filter(a=>Object.hasOwn(ACTIONS[a],'energyCost')?(v.energy>=ACTIONS[a].energyCost&&(!ACTIONS[a].outdoor||w.weather!=='rainy')&&(a!=='cook'||w.cafeOpen)):a==='eat'?w.cafeOpen&&w.food>0&&v.money>=3:a==='work'?v.energy>=20:a==='garden'?w.weather!=='rainy'&&v.energy>=12:a==='explore'?w.weather!=='rainy'&&v.energy>=8:a==='socialize'?v.energy>=5:true);}
export function decisionContext(w,v){return {character:v.name,personality:v.personality,hunger:Math.round(v.hunger),energy:Math.round(v.energy),money:v.money,happiness:Math.round(v.happiness),weather:w.weather,cafe_open:w.cafeOpen,food:w.food,garden_expanded:w.upgrades.garden,time:Math.floor(w.time)%1440,neighbors:w.villagers.filter(x=>x.id!==v.id).map(x=>({name:x.name,activity:x.action||'waiting'})),recent_events:v.memory.slice(-4)};}
export function startAction(w,v,id){if(v.status!=='thinking'&&v.status!=='idle')return false;if(!legalActions(w,v).includes(id))return false;
 if(id==='eat'){w.food--;v.money-=3;}if(id==='work')v.energy-=20;if(id==='garden')v.energy-=12;if(id==='explore')v.energy-=8;if(id==='socialize')v.energy-=5;
 if(ACTIONS[id].energyCost)v.energy-=ACTIONS[id].energyCost;
 v.gait=id==='exercise'||(id==='eat'&&v.hunger>=75&&v.energy>=25)?'run':'walk';v.doorPhase=0;v.action=id;const p=PLACES[ACTIONS[id].place];v.path=[{x:0,z:v.z},{x:0,z:p.z},{x:p.x,z:p.z}];if(id==='exercise')v.path=[{x:0,z:v.z},{x:0,z:-4},{x:3,z:-4},{x:0,z:-4},{x:0,z:4},{x:-3,z:4},{x:0,z:4},{x:0,z:0}];v.status='walking';v.remaining=ACTIONS[id].duration;v.thought=`Heading to ${p.name}.`;return true;
}
export function tick(w,seconds){w.time+=seconds*4;const completed=[];for(const v of w.villagers){v.hunger=cap(v.hunger+seconds*.08);v.energy=cap(v.energy-seconds*.025);v.happiness=cap(v.happiness-seconds*.02);
 if(v.status==='walking'){let distance=seconds*(v.gait==='run'?2.8:1.6);while(v.path.length&&distance>0){const p=v.path[0],dx=p.x-v.x,dz=p.z-v.z,d=Math.hypot(dx,dz);if(d<=distance){v.x=p.x;v.z=p.z;v.path.shift();distance-=d;}else{v.x+=dx/d*distance;v.z+=dz/d*distance;distance=0;}}if(!v.path.length){v.status=INDOOR_ACTIONS.has(v.action)?'entering':'acting';v.doorPhase=0;v.thought=v.status==='entering'?'Opening the door…':ACTIONS[v.action].label;}}
 else if(v.status==='entering'){v.doorPhase=Math.min(1,v.doorPhase+seconds/1.1);if(v.doorPhase>=1){v.status='acting';v.thought=ACTIONS[v.action].label;}}
 else if(v.status==='exiting'){v.doorPhase=Math.max(0,v.doorPhase-seconds/1.1);if(v.doorPhase<=0){v.status='idle';v.action=null;v.thought='Ready to decide what comes next.';}}
 else if(v.status==='acting'){v.remaining-=seconds;if(v.remaining<=0){const a=v.action;if(a==='eat')v.hunger=cap(v.hunger-55);if(a==='rest')v.energy=cap(v.energy+50);if(a==='work'){v.money+=8;w.treasury+=2;}if(a==='garden'){w.food=Math.min(100000,w.food+(w.upgrades.garden?3:2));w.harvests++;}if(a==='explore')v.happiness=cap(v.happiness+25);if(a==='socialize')v.happiness=cap(v.happiness+20);if(a==='fish'){w.food=Math.min(100000,w.food+2);v.happiness=cap(v.happiness+10);}if(a==='forage'){w.food=Math.min(100000,w.food+1);v.money=Math.min(100000,v.money+2);}if(a==='cook')w.food=Math.min(100000,w.food+3);if(a==='read'){v.energy=cap(v.energy+15);v.happiness=cap(v.happiness+12);}if(a==='exercise')v.happiness=cap(v.happiness+30);w.completed++;v.memory.push(`Completed ${a}.`);v.memory=v.memory.slice(-4);completed.push({villager:v.name,action:a});if(INDOOR_ACTIONS.has(a)){v.status='exiting';v.thought='Stepping back outside…';}else{v.action=null;v.status='idle';v.thought='Ready to decide what comes next.';}}}
 }return completed;}
export class RequestGate {
 constructor(){this.used=0;this.last=-Infinity;this.active=false;}
 reserve(now,limit){if(this.active||this.used>=limit||now-this.last<5000)return false;this.active=true;this.last=now;this.used++;return true;}
 finish(){this.active=false;}
}

// Confidence describes the provider's uncertainty, not a gameplay permission gate.
export function applyDecision(w,v,result){
 if(result?.mode!=='live'||result.type!=='choice'||!Number.isFinite(result.confidence)||result.confidence<0||result.confidence>1)throw new Error('Expected a real Jev choice.');
 return startAction(w,v,result.decision);
}
export function upgradeVillage(w,id){
 const cost={garden:12,lanterns:8}[id];
 if(!cost||w.upgrades[id]||w.treasury<cost)return false;
 w.treasury-=cost;w.upgrades[id]=true;return true;
}
