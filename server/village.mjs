import {ACTIONS,legalActions} from '../dist/village-engine.js';
export function villageQuestion(c){
 if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('Provide village context.');
 for(const field of ['character','personality'])if(typeof c[field]!=='string'||!c[field].trim()||c[field].length>500)throw new Error('Invalid character context.');
 for(const field of ['hunger','energy','happiness'])if(typeof c[field]!=='number'||!Number.isFinite(c[field])||c[field]<0||c[field]>100)throw new Error('Needs must be between 0 and 100.');
 if(!Number.isInteger(c.money)||c.money<0||c.money>100000||!Number.isInteger(c.food)||c.food<0||c.food>100000||typeof c.cafe_open!=='boolean'||!['sunny','rainy'].includes(c.weather))throw new Error('Invalid village resources.');
 const allowed=legalActions({cafeOpen:c.cafe_open,food:c.food,weather:c.weather},{money:c.money,energy:c.energy});
 return {type:'choice',instructions:'Choose this villager\'s next activity. Hunger 100 means starving; energy 0 means exhausted; happiness 0 means unhappy. Prioritize urgent needs, consider personality, available resources and recent activities. Only choose from the legal activities listed. Favor variety when needs are met.',criteria:Object.fromEntries(allowed.map(a=>[a,ACTIONS[a].description]))};
}
