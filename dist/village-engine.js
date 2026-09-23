// Places sit on an east-west lane (z = -12, -4 or 4) or the north-south lane (x = 0). A spot is an off-lane standing point.
export const PLACES={
 square:{x:0,z:0,name:'Village Green'},
 home:{x:-6,z:-4,name:'Mossy Cottage'},fern:{x:-5,z:-12,name:'Fern Cottage'},bramble:{x:5,z:-12,name:'Bramble Cottage'},
 cafe:{x:5,z:-4,name:'The Honeycup'},workshop:{x:-6,z:4,name:'Timber & Thread'},garden:{x:5,z:4,name:'Community Garden'},pond:{x:0,z:7,name:'Willow Pond'},
 library:{x:-13,z:-4,name:'Old Oak Library',hours:[8,20]},market:{x:13,z:-4,name:'Market Row',hours:[8,17]},bakery:{x:-13,z:4,name:'Crumb & Kettle'},inn:{x:13,z:4,name:'The Lantern Inn',hours:[16,2]},
 grove:{x:13,z:-12,name:'Whispering Grove',spot:{x:14.5,z:-16}},hill:{x:-13,z:-12,name:'Starlight Hill',spot:{x:-14,z:-16.6}}
};
export const HOMES=['home','fern','bramble'];
export const OPENABLE=['cafe','market','library','inn','bakery'];
export const WEATHER=['sunny','cloudy','rainy','stormy','snowy'];
export const SEASONS=['spring','summer','autumn','winter'];
export const HATS=['none','straw','beanie','chef','flower'];
export const EVENTS=['festival','merchant'];
export const MAX_VILLAGERS=8;
export const UPGRADES={
 garden:{cost:12,name:'Expand the garden',done:'Garden expanded',text:'Each harvest yields one more meal.'},
 lanterns:{cost:8,name:'Light the lanes',done:'Lanterns lit',text:'Warm lanterns light the village after sunset.'},
 oven:{cost:14,name:'Build a stone oven',done:'Oven fired',text:'Baking yields two more meals.'},
 fountain:{cost:15,name:'Build a fountain',done:'Fountain flowing',text:'Time on the green adds 5 more happiness.'},
 dock:{cost:16,name:'Extend the dock',done:'Dock extended',text:'Fishing adds one more meal.'},
 greenhouse:{cost:20,name:'Raise a greenhouse',done:'Greenhouse built',text:'Gardening continues in rain, snow and winter.'}
};
export const DEFAULT_RULES={hunger:1,energy:1,mood:1,mealPrice:3,wage:8,goodsPrice:6,community:2,clock:4,hours:true,autoWeather:false,seasonDays:0};
export const RULE_LIMITS={hunger:[.25,3],energy:[.25,3],mood:[.25,3],mealPrice:[1,20],wage:[0,40],goodsPrice:[1,30],community:[0,10],clock:[1,16],seasonDays:[0,14]};
const INTEGER_RULES=new Set(['mealPrice','wage','goodsPrice','community','seasonDays']);
const STOCK=100000;
const cap=n=>Math.max(0,Math.min(100,n));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const add=(n,d)=>Math.min(STOCK,n+d);
const meals=n=>n===1?'1 meal':n+' meals';
export const hourOf=w=>(w.time%1440+1440)%1440/60;
export function isNight(w){const hour=hourOf(w);return hour<6||hour>=19;}
export const TIMES_OF_DAY=['morning','afternoon','evening','night'];
export function timeOfDay(w){const h=hourOf(w);return h>=6&&h<12?'morning':h>=12&&h<17?'afternoon':h>=17&&h<21?'evening':'night';}
export function clockText(w){const m=Math.floor(w.time)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
// The island's coastline wobbles so the world edge feels natural. Shared by the 3D view and the minimap.
export function islandRadius(a){return 28+1.1*Math.sin(3*a+1.3)+.6*Math.sin(5*a+.4)+.35*Math.sin(11*a+2.1);}
export const wet=w=>w.weather==='rainy'||w.weather==='stormy';
export function isOpen(w,id){if(w.open?.[id]===false)return false;const h=PLACES[id]?.hours;if(!h||w.rules?.hours===false)return true;const x=hourOf(w);return h[0]<h[1]?x>=h[0]&&x<h[1]:x>=h[0]||x<h[1];}
const gardenYield=w=>2+(w.upgrades?.garden?1:0)+(w.season==='spring'?1:0);
const forageYield=w=>w.season==='autumn'?2:1;
const socialJoy=w=>20+(w.upgrades?.fountain?5:0)+(w.events?.festival?10:0);
const goodsPrice=w=>w.rules.goodsPrice*(w.events?.merchant?2:1);
const bondKey=(a,b)=>a<b?a+'|'+b:b+'|'+a;
export function bondOf(w,a,b){return w.bonds?.[bondKey(a,b)]??40;}
function bond(w,a,b,d){w.bonds[bondKey(a,b)]=cap(bondOf(w,a,b)+d);}

// Each activity: energy cost, legality (can), Jev criterion (text), resources reserved at start (begin) and rewards on completion (end).
export const ACTIONS={
 eat:{place:'cafe',duration:12,energy:0,indoor:true,icon:'bowl',label:'Enjoying a meal',can:(w,v)=>isOpen(w,'cafe')&&w.food>0&&v.money>=w.rules.mealPrice,text:w=>`Spend ${w.rules.mealPrice} coins and one café meal to reduce hunger by 55.`,begin:(w,v)=>{w.food--;v.money-=w.rules.mealPrice;},end:(w,v)=>{v.hunger=cap(v.hunger-55);return 'shared a warm meal at The Honeycup';}},
 rest:{place:'home',duration:15,energy:0,indoor:true,icon:'bed',label:'Taking a little rest',can:()=>true,text:()=>'Rest at home and regain 50 energy.',end:(w,v)=>{v.energy=cap(v.energy+50);return 'rested at home';}},
 sleep:{place:'home',duration:40,energy:0,indoor:true,icon:'moon',label:'Sleeping soundly',can:w=>{const h=hourOf(w);return h>=21||h<6;},text:()=>'Night only. Sleep at home for a long while to regain 90 energy and 5 happiness.',end:(w,v)=>{v.energy=cap(v.energy+90);v.happiness=cap(v.happiness+5);return 'slept through the night';}},
 work:{place:'workshop',duration:16,energy:20,icon:'hammer',tool:'hammer',label:'Making something useful',can:()=>true,text:(w,v)=>`Spend 20 energy on a workshop shift to earn ${w.rules.wage+(v.skill||0)} coins. The village fund gains ${w.rules.community}.`,end:(w,v)=>{const pay=w.rules.wage+(v.skill||0);v.money=add(v.money,pay);w.treasury=add(w.treasury,w.rules.community);return `earned ${pay} coins at the workshop`;}},
 craft:{place:'workshop',duration:15,energy:12,icon:'box',tool:'hammer',label:'Crafting goods to sell',can:w=>w.wood>=2,text:(w,v)=>`Spend 12 energy and 2 wood to craft ${(v.skill||0)>=3?3:2} goods for the market.`,begin:w=>{w.wood-=2;},end:(w,v)=>{const n=(v.skill||0)>=3?3:2;w.goods=add(w.goods,n);return `crafted ${n} goods for the market`;}},
 garden:{place:'garden',duration:13,energy:12,icon:'sprout',tool:'watering',label:'Tending the garden',can:w=>!!w.upgrades?.greenhouse||(!wet(w)&&w.weather!=='snowy'&&w.season!=='winter'),text:w=>`Spend 12 energy to grow ${meals(gardenYield(w))} for the community café.`+(w.upgrades?.greenhouse?' The greenhouse works in any weather.':' Not available in rain, snow or winter.'),end:w=>{const n=gardenYield(w);w.food=add(w.food,n);w.harvests++;return `harvested ${meals(n)} from the garden`;}},
 forage:{place:'grove',duration:14,energy:8,icon:'leaf',tool:'basket',label:'Gathering wild herbs',can:w=>!wet(w)&&w.weather!=='snowy',text:w=>`Spend 8 energy gathering herbs in the grove to add ${meals(forageYield(w))} and earn 2 coins. Dry weather only.`,end:(w,v)=>{const n=forageYield(w);w.food=add(w.food,n);v.money=add(v.money,2);return `foraged ${meals(n)} in Whispering Grove`;}},
 chop:{place:'grove',duration:15,energy:15,icon:'axe',tool:'axe',label:'Chopping firewood',can:w=>w.weather!=='stormy',text:()=>'Spend 15 energy chopping 3 wood for crafting and baking. Not during storms.',end:w=>{w.wood=add(w.wood,3);return 'chopped 3 wood in the grove';}},
 explore:{place:'pond',duration:10,energy:8,icon:'compass',label:'Exploring by the pond',can:w=>!wet(w),text:()=>'Spend 8 energy and gain 25 happiness. Not available in rain.',end:(w,v)=>{v.happiness=cap(v.happiness+25);return 'explored the banks of Willow Pond';}},
 fish:{place:'pond',duration:18,energy:10,icon:'fish',tool:'rod',label:'Fishing at Willow Pond',can:w=>!wet(w)&&w.weather!=='snowy',text:w=>`Spend 10 energy fishing to add ${meals(w.upgrades?.dock?3:2)} to the café and gain 10 happiness. Dry weather only.`,end:(w,v)=>{const n=w.upgrades?.dock?3:2;w.food=add(w.food,n);v.happiness=cap(v.happiness+10);return `caught ${meals(n)} at Willow Pond`;}},
 swim:{place:'pond',spot:{x:1,z:9.9},duration:12,energy:10,icon:'waves',label:'Swimming in the pond',can:w=>w.season==='summer'&&w.weather==='sunny'&&!isNight(w),text:()=>'Summer daytime sunshine only. Spend 10 energy on a refreshing swim to gain 22 happiness.',end:(w,v)=>{v.happiness=cap(v.happiness+22);v.hunger=cap(v.hunger+5);return 'went for a swim in Willow Pond';}},
 socialize:{place:'square',duration:12,energy:5,icon:'chat',label:'Spending time on the green',can:w=>w.weather!=='stormy',text:w=>`Spend 5 energy and gain ${socialJoy(w)} happiness with neighbors on the green. Friendships grow.`,end:(w,v)=>{let joy=socialJoy(w);const c=w.villagers.find(x=>x.id===v.companion&&x.id!==v.id);v.companion=null;v.lastGreen=w.time;if(!c){v.happiness=cap(v.happiness+joy);return 'enjoyed the bustle of the green';}
  // Friends meet when their visits to the green overlap, even if one of them left a moment earlier.
  const together=(c.status==='acting'&&c.action==='socialize')||(c.lastGreen!==undefined&&w.time-c.lastGreen<=12*w.rules.clock);bond(w,v.id,c.id,together?12:4);if(together){today(w,v).met.push(c.name);today(w,c).met.push(v.name);joy+=8;c.happiness=cap(c.happiness+8);}v.happiness=cap(v.happiness+joy);return together?`had a lovely chat with ${c.name} on the green`:`waved at ${c.name} and hoped to catch them later`;}},
 read:{place:'square',duration:14,energy:0,icon:'openBook',tool:'book',label:'Reading on the green',can:w=>!wet(w)&&w.weather!=='snowy'&&!isNight(w),text:()=>'Read on a bench to restore 15 energy and gain 12 happiness. Dry daytime weather only.',end:(w,v)=>{v.energy=cap(v.energy+15);v.happiness=cap(v.happiness+12);return 'read a good book on the green';}},
 exercise:{place:'square',duration:8,energy:18,icon:'pulse',label:'Cooling down after a run',can:w=>!wet(w),text:()=>'Spend 18 energy on a running loop, then cool down and gain 30 happiness. Dry weather only.',end:(w,v)=>{v.happiness=cap(v.happiness+30);return 'ran a loop around the village';}},
 study:{place:'library',duration:16,energy:6,indoor:true,icon:'cap',label:'Studying at the library',can:w=>isOpen(w,'library'),text:(w,v)=>`Spend 6 energy studying to gain 12 happiness${(v.skill||0)<5?' and 1 skill. Each skill point adds a coin to every work shift':''}.`,end:(w,v)=>{v.happiness=cap(v.happiness+12);if((v.skill||0)<5){v.skill=(v.skill||0)+1;return `studied at the library and reached skill ${v.skill}`;}return 'studied at the library';}},
 cook:{place:'cafe',duration:16,energy:12,indoor:true,icon:'pot',label:'Cooking for the neighbors',can:w=>isOpen(w,'cafe'),text:()=>'Spend 12 energy preparing 3 meals for the café. Requires the café to be open.',end:w=>{w.food=add(w.food,3);return 'cooked 3 meals for the café';}},
 bake:{place:'bakery',duration:14,energy:10,indoor:true,icon:'bread',label:'Baking bread',can:w=>isOpen(w,'bakery')&&w.wood>=1,text:w=>`Spend 10 energy and 1 wood baking ${meals(w.upgrades?.oven?6:4)} of bread.`,begin:w=>{w.wood--;},end:w=>{const n=w.upgrades?.oven?6:4;w.food=add(w.food,n);return `baked ${meals(n)} of bread`;}},
 sell:{place:'market',duration:10,energy:4,icon:'coin',tool:'basket',label:'Selling goods at the market',can:w=>isOpen(w,'market')&&w.goods>=1,text:w=>`Sell up to 2 of the village's ${w.goods} goods for ${goodsPrice(w)} coins each. The village fund gains 1.`,begin:(w,v)=>{v.load=Math.min(2,w.goods);w.goods-=v.load;},end:(w,v)=>{const n=v.load||0,earned=n*goodsPrice(w);v.load=0;v.money=add(v.money,earned);w.treasury=add(w.treasury,1);return `sold ${n} goods at Market Row for ${earned} coins`;}},
 supper:{place:'inn',duration:14,energy:0,indoor:true,icon:'plate',label:'Having supper at the inn',can:(w,v)=>isOpen(w,'inn')&&v.money>=w.rules.mealPrice+2,text:w=>`Spend ${w.rules.mealPrice+2} coins on supper at the inn to reduce hunger by 40 and gain 10 happiness. Uses no café stock.`,begin:(w,v)=>{v.money-=w.rules.mealPrice+2;},end:(w,v)=>{v.hunger=cap(v.hunger-40);v.happiness=cap(v.happiness+10);return 'enjoyed supper at The Lantern Inn';}},
 music:{place:'inn',duration:14,energy:8,icon:'note',tool:'lute',label:'Playing music at the inn',can:w=>isOpen(w,'inn'),text:w=>`Spend 8 energy playing music outside the inn to gain ${15+(w.events?.festival?10:0)} happiness and 3 coins in tips. Neighbors at the inn cheer up too.`,end:(w,v)=>{v.happiness=cap(v.happiness+15+(w.events.festival?10:0));v.money=add(v.money,3);for(const x of w.villagers)if(x!==v&&x.target==='inn'&&['acting','entering'].includes(x.status)){x.happiness=cap(x.happiness+8);bond(w,v.id,x.id,3);}return 'played music outside The Lantern Inn';}},
 stargaze:{place:'hill',duration:14,energy:4,icon:'star',label:'Stargazing on the hill',can:w=>isNight(w)&&w.weather==='sunny',text:()=>'Clear nights only. Spend 4 energy watching the stars from Starlight Hill to gain 25 happiness.',end:(w,v)=>{v.happiness=cap(v.happiness+25);return 'watched the stars from Starlight Hill';}},
 donate:{place:'square',duration:6,energy:0,icon:'heart',label:'Giving to the village fund',can:(w,v)=>v.money>=5,text:()=>'Give 5 coins to the shared village fund for community projects and gain 10 happiness.',begin:(w,v)=>{v.money-=5;},end:(w,v)=>{w.treasury=add(w.treasury,5);v.happiness=cap(v.happiness+10);return 'gave 5 coins to the village fund';}}
};
// A villager's own life: today's routine, habits and how the day has gone. Jev sees all of it, and routine has real effects:
// something not yet done today brings a little extra joy, while repeating it wears thin. Meals and sleep are never routine.
export const ESSENTIAL=new Set(['eat','rest','sleep','supper']);
export const ROLES={work:'the workshop hand',craft:'the village crafter',garden:'the gardener',forage:'the forager',chop:'the woodcutter',explore:'the explorer',fish:'the fisher',swim:'the swimmer',socialize:'the social butterfly',read:'the bookworm',exercise:'the runner',study:'the scholar',cook:'the cook',bake:'the baker',sell:'the trader',music:'the musician',stargaze:'the stargazer',donate:'the benefactor'};
function today(w,v){const day=Math.floor(w.time/1440);if(v.today?.day!==day)v.today={day,counts:{},met:[],startMoney:v.money,startHappiness:Math.round(v.happiness)};return v.today;}
export function routineDelta(count,id){return ESSENTIAL.has(id)?0:count===0?4:count===1?0:count===2?-4:-8;}
export function routineNote(v,id){if(ESSENTIAL.has(id))return '';const n=v.today?.counts?.[id]||0,again=v.streak?.action===id?' You just did this, so it would be back to back.':'';
 return (n===0?' Not done yet today: a welcome change (+4 happiness).':n===1?' Done once today.':` Done ${n} times today: ${n===2?'starting to feel routine':'a tiresome routine'} (${routineDelta(n,id)} happiness).`)+again;}
export function knownFor(v){let best=null,most=2;for(const [id,n] of Object.entries(v.lifetime||{}))if(ROLES[id]&&n>most){best=id;most=n;}return best?ROLES[best]:'';}
export function lifeContext(w,v){const t=today(w,v),day=Math.floor(w.time/1440);return {days_in_village:Math.max(1,day-(v.joined||0)+1),known_for:knownFor(v),today:{...t.counts},in_a_row:v.streak?.action?{activity:v.streak.action,times:v.streak.count}:null,last_activity:v.lastDone?.action??null,minutes_since_last:v.lastDone?Math.max(0,Math.round(w.time-v.lastDone.time)):null,lifetime:{...v.lifetime},met_today:t.met.slice(-6),coins_change_today:v.money-t.startMoney,happiness_change_today:Math.round(v.happiness)-t.startHappiness};}
export const INDOOR_ACTIONS=new Set(Object.keys(ACTIONS).filter(a=>ACTIONS[a].indoor));
export const placeOf=(v,id)=>ACTIONS[id].place==='home'?(HOMES.includes(v.home)?v.home:'home'):ACTIONS[id].place;

const RESIDENTS=[
 {id:'mira',name:'Mira',personality:'Curious gardener who enjoys exploring, but cares about feeding the village.',goal:'Keep the café pantry full.',color:0xe5a055,hair:0x75553e,hat:'straw',home:'home',hunger:64,energy:68,money:9,happiness:62},
 {id:'rowan',name:'Rowan',personality:'Practical craftsperson. Values a productive day and keeping a little money saved.',goal:'Save 40 coins for new tools.',color:0x72a8a2,hair:0x75553e,hat:'none',home:'fern',hunger:35,energy:81,money:4,happiness:58},
 {id:'pip',name:'Pip',personality:'Sociable dreamer who loves the pond and dislikes working when tired.',goal:'Make a best friend in the village.',color:0xb294c1,hair:0xc69b62,hat:'none',home:'bramble',hunger:48,energy:30,money:12,happiness:45},
 {id:'juniper',name:'Juniper',personality:'Early-rising baker who loves the smell of fresh bread and a busy market morning.',goal:'Never let a neighbor go hungry.',color:0xd98b8b,hair:0x3f2e25,hat:'chef',home:'bramble',hunger:30,energy:75,money:6,happiness:60},
 {id:'oswin',name:'Oswin',personality:'Retired astronomer and night owl. Happiest in the library or watching the stars.',goal:'See the stars on every clear night.',color:0x6f7fb8,hair:0xd9d4c7,hat:'beanie',home:'fern',hunger:50,energy:45,money:15,happiness:50}
];
export const RESIDENT_POOL=[
 {name:'Tamsin',personality:'Cheerful musician who plays at the inn most evenings and never misses a party.',goal:'Fill the inn with music.',color:0xe0c35a,hair:0x8a4b2f,hat:'flower'},
 {name:'Bram',personality:'Quiet woodcutter. Strong and patient, prefers the grove and early nights.',goal:'Keep the woodpile stacked high.',color:0x7c9a5a,hair:0x3a2c20,hat:'beanie'},
 {name:'Wren',personality:'Young trader saving every coin. Loves the market and a good bargain.',goal:'Save 60 coins.',color:0x5a8fc4,hair:0x2e2621,hat:'none'},
 {name:'Hazel',personality:'Gentle herbalist who forages in the grove and looks after tired neighbors.',goal:'Help the village through winter.',color:0x9b7bb0,hair:0x6b3f2a,hat:'flower'},
 {name:'Fennel',personality:'Restless athlete who runs, swims and gets grumpy when stuck indoors.',goal:'Stay the happiest person in town.',color:0xe07f4f,hair:0xe0c080,hat:'none'},
 {name:'Clover',personality:'Shy librarian who studies hard and slowly warms up to neighbors.',goal:'Reach the highest skill in the village.',color:0x8fbf9f,hair:0x4a3528,hat:'beanie'},
 {name:'Marlow',personality:'Old fisher with tall tales. Content by the water, grumbles about crowds.',goal:'Catch enough fish to feed everyone.',color:0x4f7f8f,hair:0xbfb8a8,hat:'straw'},
 {name:'Sorrel',personality:'Generous organizer who dreams of a fountain on the green and a festival every week.',goal:'Fund every community project.',color:0xc9667a,hair:0x2b1f1a,hat:'none'}
];
function standPoint(w,v,p,place){const i=Math.max(0,w.villagers.indexOf(v));if(place==='square'){const a=i/Math.max(3,w.villagers.length)*Math.PI*2+.4;return {x:Math.cos(a)*1.9,z:Math.sin(a)*1.9};}return {x:p.x+((i%3)-1)*.8,z:p.z+(i%3===1?0:.45)};}
function spawn(spec,i,total){const a=i/Math.max(3,total)*Math.PI*2+.4;return {...spec,skill:0,goal:spec.goal||'',x:Math.cos(a)*1.9,z:Math.sin(a)*1.9,place:'square',status:'idle',action:null,target:null,companion:null,load:0,path:[],remaining:0,last:null,thought:'Waiting for you to start the village.',memory:[],lifetime:{},today:null,streak:null,lastDone:null,joined:0};}
export function createWorld(){
 const villagers=RESIDENTS.map((r,i)=>spawn({...r},i,RESIDENTS.length));
 return {time:8*60,weather:'sunny',season:'summer',open:Object.fromEntries(OPENABLE.map(id=>[id,true])),food:8,wood:4,goods:0,version:0,treasury:0,completed:0,harvests:0,stats:{},seed:20260923,
  upgrades:Object.fromEntries(Object.keys(UPGRADES).map(id=>[id,false])),events:{festival:false,merchant:false},rules:{...DEFAULT_RULES},note:'',
  bonds:{'mira|rowan':55,'mira|pip':62,'pip|rowan':44,'juniper|mira':58,'juniper|pip':50,'oswin|pip':52,'oswin|rowan':47},history:[],council:{auto:false,lastDay:-1,last:null},villagers};
}
export function legalActions(w,v){return Object.keys(ACTIONS).filter(id=>v.energy>=ACTIONS[id].energy&&ACTIONS[id].can(w,v));}
export function decisionContext(w,v){return {character:v.name,personality:v.personality,goal:v.goal||'',hunger:Math.round(v.hunger),energy:Math.round(v.energy),money:v.money,happiness:Math.round(v.happiness),skill:v.skill||0,
 weather:w.weather,season:w.season,time:Math.floor(w.time)%1440,clock:clockText(w),time_of_day:timeOfDay(w),day:Math.floor(w.time/1440)+1,places_open:Object.fromEntries(OPENABLE.map(id=>[id,isOpen(w,id)])),
 food:w.food,wood:w.wood,goods:w.goods,prices:{meal:w.rules.mealPrice,wage:w.rules.wage,goods:w.rules.goodsPrice,community:w.rules.community},upgrades:{...w.upgrades},events:{...w.events},bulletin:w.note||'',
 neighbors:w.villagers.filter(x=>x.id!==v.id).map(x=>({name:x.name,activity:x.action||'waiting',friendship:Math.round(bondOf(w,v.id,x.id))})),recent_events:v.memory.slice(-5),life:lifeContext(w,v)};}
// Rebuilds the minimum world and villager needed to recheck legality from a validated context. Opening hours are already applied in places_open.
export function stateFromContext(c){return {w:{time:c.time,weather:c.weather,season:c.season,open:{...c.places_open},food:c.food,wood:c.wood,goods:c.goods,upgrades:{...c.upgrades},events:{...c.events},villagers:[],rules:{...DEFAULT_RULES,hours:false,mealPrice:c.prices.meal,wage:c.prices.wage,goodsPrice:c.prices.goods,community:c.prices.community}},v:{money:c.money,energy:c.energy,hunger:c.hunger,happiness:c.happiness,skill:c.skill,today:{day:0,counts:{...c.life?.today}},streak:c.life?.in_a_row?{action:c.life.in_a_row.activity,count:c.life.in_a_row.times}:null}};}
function route(w,v,id){
 const a=ACTIONS[id],p=PLACES[v.target],cur=PLACES[v.place],points=[];
 if(cur?.spot&&Math.hypot(v.x-cur.x,v.z-cur.z)>.5)points.push({x:cur.x,z:cur.z});
 points.push({x:0,z:points.length?cur.z:v.z});
 if(id==='exercise')points.push({x:0,z:-4},{x:3,z:-4},{x:0,z:-4},{x:0,z:4},{x:-3,z:4},{x:0,z:4},{x:0,z:0});
 else{points.push({x:0,z:p.z},{x:p.x,z:p.z});const spot=a.spot||p.spot;if(spot)points.push({...spot});else if(!a.indoor)points.push(standPoint(w,v,p,v.target));}
 return points;
}
export function startAction(w,v,id){if(v.status!=='thinking'&&v.status!=='idle')return false;if(!Object.hasOwn(ACTIONS,id)||!legalActions(w,v).includes(id))return false;
 const a=ACTIONS[id];v.energy-=a.energy;a.begin?.(w,v);
 v.gait=id==='exercise'||((id==='eat'||id==='supper')&&v.hunger>=75&&v.energy>=25)?'run':'walk';v.doorPhase=0;v.action=id;v.target=placeOf(v,id);v.path=route(w,v,id);v.place=v.target;
 v.status='walking';v.remaining=a.duration;v.thought=`Heading to ${PLACES[v.target].name}.`;return true;
}
function random(w){w.seed=(w.seed+0x6D2B79F5)>>>0;let t=w.seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
const WEATHER_ODDS={spring:[4,3,3,1,0],summer:[6,2,1,1,0],autumn:[3,3,3,1,0],winter:[2,3,0,1,4]};
export const WEATHER_NEWS={sunny:'The sky clears over Willowglen.',cloudy:'Clouds drift in over the village.',rainy:'Rain arrives. Outdoor work and pond trips pause.',stormy:'A storm rolls in. Most outdoor plans are off.',snowy:'Snow begins to fall on Willowglen.'};
function nextWeather(w){if(random(w)<.45&&WEATHER_ODDS[w.season][WEATHER.indexOf(w.weather)])return w.weather;const odds=WEATHER_ODDS[w.season],total=odds.reduce((a,b)=>a+b,0);let r=random(w)*total;for(let i=0;i<odds.length;i++){r-=odds[i];if(r<0)return WEATHER[i];}return 'sunny';}
export function tick(w,seconds){
 const before=w.time;w.time+=seconds*w.rules.clock;const events=[];
 const day=Math.floor(w.time/1440);
 if(day>Math.floor(before/1440)){events.push({text:`Day ${day+1} dawns in Willowglen.`});if(w.rules.seasonDays>0&&day%w.rules.seasonDays===0){w.season=SEASONS[(SEASONS.indexOf(w.season)+1)%4];if(w.season!=='winter'&&w.weather==='snowy')w.weather='cloudy';events.push({text:`${w.season[0].toUpperCase()+w.season.slice(1)} arrives in Willowglen.`,world:true});}}
 if(w.rules.autoWeather&&Math.floor(w.time/180)>Math.floor(before/180)){const next=nextWeather(w);if(next!==w.weather){w.weather=next;events.push({text:WEATHER_NEWS[next],world:true});}}
 const hungerRate=.08*w.rules.hunger*(w.season==='winter'?1.25:1),energyRate=.025*w.rules.energy,moodRate=w.events.festival?0:.02*w.rules.mood*(w.weather==='stormy'?1.6:wet(w)?1.25:1);
 for(const v of w.villagers){v.hunger=cap(v.hunger+seconds*hungerRate);v.energy=cap(v.energy-seconds*energyRate);v.happiness=cap(v.happiness-seconds*moodRate);
 if(v.status==='walking'){let distance=seconds*(v.gait==='run'?2.8:1.6);while(v.path.length&&distance>0){const p=v.path[0],dx=p.x-v.x,dz=p.z-v.z,d=Math.hypot(dx,dz);if(d<=distance){v.x=p.x;v.z=p.z;v.path.shift();distance-=d;}else{v.x+=dx/d*distance;v.z+=dz/d*distance;distance=0;}}if(!v.path.length){v.status=INDOOR_ACTIONS.has(v.action)?'entering':'acting';v.doorPhase=0;v.thought=v.status==='entering'?'Opening the door…':ACTIONS[v.action].label;}}
 else if(v.status==='entering'){v.doorPhase=Math.min(1,v.doorPhase+seconds/1.1);if(v.doorPhase>=1){v.status='acting';v.thought=ACTIONS[v.action].label;}}
 else if(v.status==='exiting'){v.doorPhase=Math.max(0,v.doorPhase-seconds/1.1);if(v.doorPhase<=0){v.status='idle';v.action=null;v.thought='Ready to decide what comes next.';}}
 else if(v.status==='acting'){v.remaining-=seconds;if(v.remaining<=0){const a=v.action,day=today(w,v),before=day.counts[a]||0,story=ACTIONS[a].end(w,v),routine=routineDelta(before,a);w.completed++;w.stats[a]=(w.stats[a]||0)+1;
  v.happiness=cap(v.happiness+routine);day.counts[a]=before+1;v.lifetime[a]=(v.lifetime[a]||0)+1;v.streak=v.streak?.action===a?{action:a,count:v.streak.count+1}:{action:a,count:1};v.lastDone={action:a,time:w.time};
  const feeling=routine>0?' A nice change of pace.':routine<0?' It felt like the same old routine.':'';v.memory.push(story[0].toUpperCase()+story.slice(1)+'.'+feeling);v.memory=v.memory.slice(-6);events.push({villager:v.name,action:a,text:`${v.name} ${story}.${feeling}`});
  if(INDOOR_ACTIONS.has(a)){v.status='exiting';v.thought='Stepping back outside…';}else{v.action=null;v.status='idle';v.thought='Ready to decide what comes next.';}}}
 }return events;}
// Several villagers may ask Jev at the same time. The gate caps simultaneous requests, spaces their starts and limits requests per minute.
export class RequestGate {
 constructor({parallel=4,spacing=400,perMinute=40}={}){this.used=0;this.last=-Infinity;this.active=0;this.parallel=parallel;this.spacing=spacing;this.perMinute=perMinute;this.starts=[];}
 canReserve(now,limit){this.starts=this.starts.filter(t=>now-t<60000);return this.active<this.parallel&&this.used<limit&&now-this.last>=this.spacing&&this.starts.length<this.perMinute;}
 reserve(now,limit){if(!this.canReserve(now,limit))return false;this.active++;this.last=now;this.starts.push(now);this.used++;return true;}
 finish(){this.active=Math.max(0,this.active-1);}
}

// Confidence describes the provider's uncertainty, not a gameplay permission gate.
function realChoice(result){if(result?.mode!=='live'||result.type!=='choice'||!Number.isFinite(result.confidence)||result.confidence<0||result.confidence>1)throw new Error('Expected a real Jev choice.');}
export function applyDecision(w,v,result){
 realChoice(result);
 const started=startAction(w,v,result.decision);
 if(started&&result.decision==='socialize'&&typeof result.companion?.choice==='string')v.companion=w.villagers.find(x=>x.name===result.companion.choice&&x.id!==v.id)?.id||null;
 return started;
}
export function recordDecision(w,v,result){w.history.push({day:Math.floor(w.time/1440)+1,time:Math.floor(w.time)%1440,villager:v.name,decision:result.decision,confidence:result.confidence,probabilities:result.probabilities,companion:result.companion?.choice??null,model:result.model});if(w.history.length>300)w.history.splice(0,w.history.length-300);}
export function upgradeVillage(w,id){
 const cost=Object.hasOwn(UPGRADES,id)?UPGRADES[id].cost:0;
 if(!cost||w.upgrades[id]||w.treasury<cost)return false;
 w.treasury-=cost;w.upgrades[id]=true;return true;
}
export function affordableUpgrades(treasury,upgrades){return Object.keys(UPGRADES).filter(id=>!upgrades?.[id]&&treasury>=UPGRADES[id].cost);}
export function councilContext(w){return {treasury:w.treasury,season:w.season,weather:w.weather,food:w.food,wood:w.wood,goods:w.goods,upgrades:{...w.upgrades},bulletin:w.note||'',residents:w.villagers.map(v=>({name:v.name,personality:v.personality,hunger:Math.round(v.hunger),energy:Math.round(v.energy),happiness:Math.round(v.happiness),money:v.money}))};}
export function councilDue(w){return w.council.auto&&hourOf(w)>=12&&Math.floor(w.time/1440)>w.council.lastDay&&affordableUpgrades(w.treasury,w.upgrades).length>0;}
export function applyCouncil(w,result){realChoice(result);w.council.last={decision:result.decision,confidence:result.confidence,day:Math.floor(w.time/1440)+1};if(result.decision==='save')return 'save';return upgradeVillage(w,result.decision)?result.decision:null;}

export function setRule(w,key,value){
 if(key==='hours'||key==='autoWeather'){if(typeof value!=='boolean')return false;w.rules[key]=value;return true;}
 const limit=RULE_LIMITS[key];if(!limit||typeof value!=='number'||!Number.isFinite(value))return false;
 w.rules[key]=clamp(INTEGER_RULES.has(key)?Math.round(value):value,limit[0],limit[1]);return true;
}
const cleanText=(s,max)=>typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const color=(n,fallback)=>Number.isInteger(n)&&n>=0&&n<=0xffffff?n:fallback;
function uniqueId(w,name){const base=name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,16)||'resident';let id=base,n=2;while(w.villagers.some(v=>v.id===id))id=base+'-'+n++;return id;}
function nameTaken(w,name,except){return w.villagers.some(v=>v.id!==except&&v.name.toLowerCase()===name.toLowerCase());}
export function editVillager(w,id,patch){
 const v=w.villagers.find(x=>x.id===id);if(!v)throw new Error('That resident has moved away.');
 if(patch.name!==undefined){const name=cleanText(patch.name,24);if(!name)throw new Error('Every resident needs a name.');if(nameTaken(w,name,id))throw new Error(`${name} already lives in Willowglen.`);v.name=name;}
 if(patch.personality!==undefined){const p=cleanText(patch.personality,400);if(!p)throw new Error('Describe their personality so Jev knows them.');v.personality=p;}
 if(patch.goal!==undefined)v.goal=cleanText(patch.goal,200);
 for(const key of ['hunger','energy','happiness'])if(patch[key]!==undefined&&Number.isFinite(patch[key]))v[key]=cap(patch[key]);
 if(Number.isFinite(patch.money))v.money=clamp(Math.round(patch.money),0,9999);
 if(Number.isFinite(patch.skill))v.skill=clamp(Math.round(patch.skill),0,5);
 if(patch.color!==undefined)v.color=color(patch.color,v.color);if(patch.hair!==undefined)v.hair=color(patch.hair,v.hair);
 if(HATS.includes(patch.hat))v.hat=patch.hat;if(HOMES.includes(patch.home))v.home=patch.home;
 return v;
}
export function addVillager(w,spec){
 if(w.villagers.length>=MAX_VILLAGERS)return null;
 const base=spec||RESIDENT_POOL.find(r=>!nameTaken(w,r.name))||{name:'Newcomer',personality:'A friendly newcomer still finding their place in Willowglen.',color:0xa0a08a,hair:0x5a4535,hat:'none'};
 let name=cleanText(base.name,24)||'Newcomer',n=2;const root=name;while(nameTaken(w,name))name=`${root} ${n++}`;
 const v=spawn({id:uniqueId(w,name),name,personality:cleanText(base.personality,400)||'A friendly newcomer.',goal:cleanText(base.goal,200),color:color(base.color,0xa0a08a),hair:color(base.hair,0x5a4535),hat:HATS.includes(base.hat)?base.hat:'none',home:HOMES[w.villagers.length%HOMES.length],hunger:40,energy:70,money:5,happiness:55},w.villagers.length,w.villagers.length+1);
 v.joined=Math.floor(w.time/1440);w.villagers.push(v);return v;
}
export function removeVillager(w,id){
 if(w.villagers.length<=1||!w.villagers.some(v=>v.id===id))return false;
 w.villagers=w.villagers.filter(v=>v.id!==id);
 for(const key of Object.keys(w.bonds))if(key.split('|').includes(id))delete w.bonds[key];
 for(const v of w.villagers)if(v.companion===id)v.companion=null;
 return true;
}

export const PRESETS={
 cozy:{name:'Cozy summer',text:'Gentle needs, open doors and clear skies.',apply:w=>{w.weather='sunny';w.season='summer';w.rules={...DEFAULT_RULES};w.events={festival:false,merchant:false};OPENABLE.forEach(id=>w.open[id]=true);}},
 winter:{name:'Hard winter',text:'Snow, hungrier villagers and a nearly empty pantry.',apply:w=>{w.season='winter';w.weather='snowy';w.food=Math.min(w.food,2);Object.assign(w.rules,{hunger:1.5,mood:1.3});}},
 festival:{name:'Midsummer festival',text:'Music, full tables and moods that never fade.',apply:w=>{w.season='summer';w.weather='sunny';w.events.festival=true;w.food=add(w.food,12);w.time=Math.floor(w.time/1440)*1440+16*60;}},
 lean:{name:'Lean times',text:'Empty pockets, costly meals and low wages.',apply:w=>{w.food=0;w.rules.mealPrice=6;w.rules.wage=4;w.villagers.forEach(v=>v.money=Math.min(v.money,2));}},
 merchant:{name:'Merchant in town',text:'A traveling merchant pays double for goods.',apply:w=>{w.events.merchant=true;w.wood=add(w.wood,6);w.goods=add(w.goods,4);}},
 storm:{name:'Stormy autumn',text:'Storms that come and go on their own.',apply:w=>{w.season='autumn';w.weather='stormy';w.rules.autoWeather=true;}},
 bustle:{name:'Busy bees',text:'Fast days, quick hunger and generous wages.',apply:w=>{Object.assign(w.rules,{clock:8,hunger:1.5,energy:1.5,wage:14});}}
};
export function applyPreset(w,id){if(!Object.hasOwn(PRESETS,id))return false;PRESETS[id].apply(w);return true;}

// Saves never contain API keys. Restoring rebuilds every field from validated values.
export function saveWorld(w){
 const keep=['id','name','personality','goal','color','hair','hat','home','hunger','energy','happiness','money','skill','memory','lifetime','today','streak','lastDone','joined'];
 return {format:'willowglen',version:1,world:{time:w.time,weather:w.weather,season:w.season,open:{...w.open},food:w.food,wood:w.wood,goods:w.goods,treasury:w.treasury,completed:w.completed,harvests:w.harvests,stats:{...w.stats},seed:w.seed,upgrades:{...w.upgrades},events:{...w.events},rules:{...w.rules},note:w.note,bonds:{...w.bonds},history:w.history.slice(-300),council:{auto:w.council.auto,lastDay:w.council.lastDay,last:w.council.last},villagers:w.villagers.map(v=>Object.fromEntries(keep.map(k=>[k,v[k]])))}};
}
export function restoreWorld(data){
 const s=data?.world;
 if(data?.format!=='willowglen'||!s||typeof s!=='object'||!Array.isArray(s.villagers)||!s.villagers.length)throw new Error('That file is not a Willowglen save.');
 const w=createWorld(),int=(n,max,fallback)=>Number.isFinite(n)?clamp(Math.round(n),0,max):fallback;
 w.time=Number.isFinite(s.time)?clamp(s.time,0,1440*9999):w.time;
 if(WEATHER.includes(s.weather))w.weather=s.weather;if(SEASONS.includes(s.season))w.season=s.season;
 for(const id of OPENABLE)if(typeof s.open?.[id]==='boolean')w.open[id]=s.open[id];
 for(const key of ['food','wood','goods','treasury','completed','harvests'])w[key]=int(s[key],STOCK,w[key]);
 for(const id of Object.keys(ACTIONS))if(Number.isFinite(s.stats?.[id]))w.stats[id]=int(s.stats[id],STOCK,0);
 w.seed=Number.isInteger(s.seed)?s.seed>>>0:w.seed;
 for(const id of Object.keys(UPGRADES))w.upgrades[id]=s.upgrades?.[id]===true;
 for(const id of EVENTS)w.events[id]=s.events?.[id]===true;
 for(const key of Object.keys(DEFAULT_RULES))if(s.rules&&Object.hasOwn(s.rules,key))setRule(w,key,s.rules[key]);
 w.note=cleanText(s.note,300);w.council.auto=s.council?.auto===true;w.council.lastDay=Number.isInteger(s.council?.lastDay)?s.council.lastDay:-1;const last=s.council?.last;if(last&&(last.decision==='save'||Object.hasOwn(UPGRADES,last.decision)))w.council.last={decision:last.decision,confidence:Number.isFinite(last.confidence)?clamp(last.confidence,0,1):null,day:int(last.day,99999,1)};
 w.villagers=[];w.bonds={};
 for(const r of s.villagers.slice(0,MAX_VILLAGERS)){if(!r||typeof r!=='object')continue;const v=addVillager(w,{name:r.name,personality:r.personality,goal:r.goal,color:r.color,hair:r.hair,hat:r.hat});if(!v)break;
  if(typeof r.id==='string'&&/^[a-z0-9-]{1,24}$/.test(r.id)&&!w.villagers.some(x=>x!==v&&x.id===r.id))v.id=r.id;
  if(HOMES.includes(r.home))v.home=r.home;for(const key of ['hunger','energy','happiness'])if(Number.isFinite(r[key]))v[key]=cap(r[key]);v.money=int(r.money,STOCK,v.money);v.skill=int(r.skill,5,0);
  v.memory=Array.isArray(r.memory)?r.memory.filter(m=>typeof m==='string').map(m=>cleanText(m,160)).slice(-6):[];
  const counts=o=>Object.fromEntries(Object.keys(ACTIONS).filter(id=>Number.isFinite(o?.[id])).map(id=>[id,int(o[id],STOCK,0)]));v.lifetime=counts(r.lifetime);v.joined=int(r.joined,99999,0);
  if(r.today&&Number.isInteger(r.today.day))v.today={day:r.today.day,counts:counts(r.today.counts),met:Array.isArray(r.today.met)?r.today.met.filter(m=>typeof m==='string').map(m=>cleanText(m,24)).slice(-8):[],startMoney:int(r.today.startMoney,STOCK,v.money),startHappiness:int(r.today.startHappiness,100,Math.round(v.happiness))};
  if(Object.hasOwn(ACTIONS,r.streak?.action))v.streak={action:r.streak.action,count:int(r.streak.count,9999,1)};if(Object.hasOwn(ACTIONS,r.lastDone?.action)&&Number.isFinite(r.lastDone.time))v.lastDone={action:r.lastDone.action,time:clamp(r.lastDone.time,0,1440*9999)};v.thought='Back on the green after loading.';}
 if(!w.villagers.length)throw new Error('That save has no residents.');
 w.villagers.forEach((v,i)=>{const a=i/Math.max(3,w.villagers.length)*Math.PI*2+.4;v.x=Math.cos(a)*1.9;v.z=Math.sin(a)*1.9;});
 const ids=new Set(w.villagers.map(v=>v.id));
 for(const [key,value] of Object.entries(s.bonds||{})){const [a,b]=key.split('|');if(ids.has(a)&&ids.has(b)&&a!==b&&Number.isFinite(value))w.bonds[bondKey(a,b)]=cap(value);}
 if(Array.isArray(s.history))w.history=s.history.slice(-300).filter(h=>h&&typeof h==='object'&&typeof h.decision==='string').map(h=>({day:int(h.day,99999,1),time:int(h.time,1439,0),villager:cleanText(h.villager,24),decision:cleanText(h.decision,40),confidence:Number.isFinite(h.confidence)?clamp(h.confidence,0,1):null,companion:typeof h.companion==='string'?cleanText(h.companion,24):null}));
 return w;
}
