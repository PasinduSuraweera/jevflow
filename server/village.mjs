import {routineNote,ACTIONS,UPGRADES,OPENABLE,WEATHER,SEASONS,EVENTS,TIMES_OF_DAY,legalActions,stateFromContext,affordableUpgrades} from '../dist/village-engine.js';
const fail=message=>{throw new Error(message);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(x,max,optional=false)=>optional&&x===undefined?'':typeof x==='string'&&x.length<=max&&(optional||x.trim())?x:fail('Invalid text in village context.');
const int=(x,min,max,message='Invalid village resources.')=>Number.isInteger(x)&&x>=min&&x<=max?x:fail(message);
const need=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100?x:fail('Needs must be between 0 and 100.');
const oneOf=(x,list,message)=>list.includes(x)?x:fail(message);
function flags(x,keys,message,required=false){
 if(x===undefined&&!required)return {};
 if(!object(x)||Object.keys(x).some(k=>!keys.includes(k))||Object.values(x).some(b=>typeof b!=='boolean')||(required&&keys.some(k=>!Object.hasOwn(x,k))))fail(message);
 return x;
}
function names(list,max){if(!Array.isArray(list)||list.length>max)fail('Invalid residents in village context.');const seen=new Set();for(const n of list){const key=text(n?.name,40).toLowerCase();if(seen.has(key))fail('Resident names must be unique.');seen.add(key);}return seen;}

const counts=(x,message)=>{if(!object(x)||Object.keys(x).some(k=>!Object.hasOwn(ACTIONS,k)))fail(message);for(const n of Object.values(x))int(n,0,100000,message);return x;};
// The villager's lived experience. Optional so older clients still work; validated whenever present.
function life(l){
 if(l===undefined)return;const m='Invalid life history.';if(!object(l))fail(m);
 counts(l.today,m);counts(l.lifetime,m);int(l.days_in_village,1,1000000,m);text(l.known_for,60,true);
 if(l.in_a_row!==null&&(!object(l.in_a_row)||!Object.hasOwn(ACTIONS,l.in_a_row.activity)))fail(m);if(l.in_a_row)int(l.in_a_row.times,1,100000,m);
 if(l.last_activity!==null&&!Object.hasOwn(ACTIONS,l.last_activity))fail(m);if(l.minutes_since_last!==null)int(l.minutes_since_last,0,100000000,m);
 if(!Array.isArray(l.met_today)||l.met_today.length>12)fail(m);for(const n of l.met_today)text(n,40);
 int(l.coins_change_today,-100000,100000,m);int(l.happiness_change_today,-100,100,m);
}
// The server rebuilds legal choices from validated state. Option lists supplied by the client are ignored.
export function villageQuestions(c){
 if(!object(c))fail('Provide village context.');
 const character=text(c.character,40);text(c.personality,500);text(c.goal,300,true);text(c.bulletin,300,true);
 for(const field of ['hunger','energy','happiness'])need(c[field]);
 int(c.money,0,100000);int(c.food,0,100000);int(c.wood,0,100000);int(c.goods,0,100000);int(c.skill,0,5,'Skill must be between 0 and 5.');int(c.time,0,1439,'Invalid village time.');if(c.day!==undefined)int(c.day,1,1000000,'Invalid village day.');
 oneOf(c.weather,WEATHER,'Invalid weather.');oneOf(c.season,SEASONS,'Invalid season.');
 if(c.clock!==undefined&&(typeof c.clock!=='string'||!/^\d\d:\d\d$/.test(c.clock)))fail('Invalid village clock.');if(c.time_of_day!==undefined)oneOf(c.time_of_day,TIMES_OF_DAY,'Invalid time of day.');
 flags(c.places_open,OPENABLE,'Invalid opening information.',true);flags(c.upgrades,Object.keys(UPGRADES),'Invalid village upgrades.');flags(c.events,EVENTS,'Invalid village events.');
 const p=c.prices;if(!object(p))fail('Invalid village prices.');int(p.meal,1,20,'Invalid village prices.');int(p.wage,0,40,'Invalid village prices.');int(p.goods,1,30,'Invalid village prices.');int(p.community,0,10,'Invalid village prices.');
 const seen=names(c.neighbors,11);if(seen.has(character.toLowerCase()))fail('Neighbors cannot include the character.');
 for(const n of c.neighbors){text(n.activity,40);need(n.friendship);}
 life(c.life);
 if(c.recent_events!==undefined&&(!Array.isArray(c.recent_events)||c.recent_events.length>8))fail('Invalid recent events.');for(const e of c.recent_events||[])text(e,200);
 const {w,v}=stateFromContext(c),allowed=legalActions(w,v);
 const questions={decision:{type:'choice',instructions:'Choose this villager\'s next activity as the person they have become. Hunger 100 means starving; energy 0 means exhausted; happiness 0 means unhappy. Urgent needs come first. Their personality is only where they started: weigh their lived experience more, including what they have already done today, anything they just did back to back, their habits and what they are known for, who they have seen, how their coins and mood changed today, their personal goal and recent memories. People rarely repeat the same pastime all day; favor something different unless a need or goal clearly calls for it. Also consider the clock, season, weather, shared stock, neighbors and the village bulletin. Only choose from the legal activities listed.',criteria:Object.fromEntries(allowed.map(a=>[a,ACTIONS[a].text(w,v)+routineNote(v,a)]))}};
 if(allowed.includes('socialize')&&c.neighbors.length)questions.companion={type:'choice',instructions:'If this villager spends time on the village green, which neighbor would they most like to see? Consider friendship, personality and what each neighbor is doing.',criteria:Object.fromEntries(c.neighbors.map(n=>[n.name,`${n.name}: friendship ${Math.round(n.friendship)} of 100, currently ${n.activity}.`]))};
 return questions;
}
export function councilQuestion(c){
 if(!object(c))fail('Provide council context.');
 const treasury=int(c.treasury,0,100000);int(c.food,0,100000);int(c.wood,0,100000);int(c.goods,0,100000);text(c.bulletin,300,true);
 oneOf(c.weather,WEATHER,'Invalid weather.');oneOf(c.season,SEASONS,'Invalid season.');flags(c.upgrades,Object.keys(UPGRADES),'Invalid village upgrades.');
 names(c.residents,12);if(!c.residents.length)fail('The council needs at least one resident.');
 for(const r of c.residents){text(r.personality,500);for(const f of ['hunger','energy','happiness'])need(r[f]);int(r.money,0,100000);}
 const options=affordableUpgrades(treasury,c.upgrades);if(!options.length)fail('The village fund cannot afford a new project yet.');
 return {type:'choice',instructions:'You are the village council of Willowglen. Decide how to use the shared village fund. Weigh the residents\' wellbeing and personalities, the season, weather, shared stock and bulletin. Saving for a larger project is allowed.',criteria:{...Object.fromEntries(options.map(id=>[id,`${UPGRADES[id].name} for ${UPGRADES[id].cost} coins. ${UPGRADES[id].text}`])),save:`Keep all ${treasury} coins in the fund for a later project.`}};
}
