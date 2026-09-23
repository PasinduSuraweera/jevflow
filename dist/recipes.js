/* Original JevFlow recipes. Source projects are credited for the ideas, not code. */
export const recipes = {
 support: {name:'Support Routing',type:'Choice',question:'Which team should handle this ticket?',input:{ticket:{subject:'Charged twice for my subscription',message:'I upgraded to Pro yesterday and was charged twice. Can you refund the duplicate payment?',customer_tier:'pro'}},criteria:{billing:'Payments, charges, invoices or refunds',technical:'Technical problems, bugs or access issues',other:'Other support requests'}},
 guardrails: {name:'Agent Guardrails',type:'Yes-No',question:'Is this action read-only, public, and suitable to proceed without approval?',input:{action:'Read the public product documentation',target:'https://example.com/docs',requires_approval:false}},
 rag: {name:'RAG Decisions',type:'Score',question:'How relevant is the document for answering the query?',input:{query:'How do I reset my password?',document:'To reset your password, open account settings, select Security, then choose Reset password.'},criteria:['Not relevant','Partially relevant','Directly relevant and useful']},
 github: {name:'GitHub Triage',type:'Choice',question:'Which label best describes this issue?',input:{title:'App crashes when uploading a large file',body:'I can reproduce this error with files larger than 10 MB. The upload throws an exception.'},criteria:{bug:'An existing feature is not working as expected',enhancement:'A request for new or improved functionality',question:'A request for information or help'}},
 router: {name:'Model Router',type:'Choice',question:'Which available model capability best fits this task? Select general if the task is unclear.',input:{task:'Find the cause of a race condition in this async TypeScript queue.',priorities:'Prefer the smallest capable model. Do not trade away correctness.'},criteria:{fast:'Simple extraction, classification, or short transformations',reasoning:'Complex analysis, mathematical reasoning, or multi-step planning',code:'Writing, debugging, or reviewing source code',general:'General conversation, writing, or unclear requests'},source:{name:'Jev Tool & Model Router',author:'BunsDev / TypeSafeAI',url:'https://github.com/TypeSafeAI/typesafe-router'},note:'A small model-selection recipe inspired by the community router. It does not call the selected model.'},
 browser: {name:'Browser Next Step',type:'Choice',question:'Which listed action best advances the goal on this page? Choose wait if none fits. Propose only one action.',input:{goal:'Find the API documentation.',page:'Developer platform home page',actions:[{id:'open_docs',label:'Open documentation'},{id:'view_pricing',label:'View pricing plans'},{id:'start_trial',label:'Start a paid trial'}]},source:{name:'Jev Ultrafast',author:'browser-use',url:'https://github.com/browser-use/jev-ultrafast'},note:'An action-selection recipe inspired by Jev Ultrafast. It evaluates a supplied page snapshot; it does not control a browser.'},
 npc: {name:'NPC Next Move',type:'Choice',question:'What should this character do next? Balance hunger, energy, money, and nearby resources. Prefer satisfying urgent needs.',input:{character:'Mira',hunger:85,energy:35,money:12,nearby:['cafe','park','workshop'],situation:'The cafe is open. A short shift at the workshop pays 10 coins.'},criteria:{eat:'Buy food at the cafe to reduce hunger if affordable and available',rest:'Rest to regain energy',work:'Earn money at the workshop when energy permits',explore:'Explore when basic needs are met'},source:{name:'Jev Lab / Hundred',author:'jammaru',url:'https://github.com/jammaru/jev-lab'},note:'A one-character decision recipe inspired by Hundred. It does not embed the original town simulation.'}
};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.trim().length>0;
export function validateContext(name, input){
 if(!Object.hasOwn(recipes,name))throw Error('Choose a supported recipe.');
 if(!object(input))throw Error('Context must be a JSON object.');
 if(name==='support'&&(!object(input.ticket)||!text(input.ticket.message)))throw Error('Provide a non-empty ticket.message.');
 if(name==='guardrails'&&(!text(input.action)||(input.requires_approval!==undefined&&typeof input.requires_approval!=='boolean')))throw Error('Provide action and an optional boolean requires_approval.');
 if(name==='rag'&&(!text(input.query)||!text(input.document)))throw Error('Provide a non-empty query and document.');
 if(name==='github'&&(!text(input.title)||typeof input.body!=='string'))throw Error('Provide an issue title and body.');
 if(name==='router'&&!text(input.task))throw Error('Provide a task for the model router.');
 if(name==='browser'){
  if(!text(input.goal)||!text(input.page)||!Array.isArray(input.actions)||input.actions.length<1||input.actions.length>12)throw Error('Provide a goal, page, and 1 to 12 actions.');
  const ids=new Set();
  for(const action of input.actions){if(!object(action)||!text(action.id)||!/^[a-z][a-z0-9_]{0,39}$/.test(action.id)||['wait','constructor','prototype'].includes(action.id)||ids.has(action.id)||!text(action.label)||action.label.length>300)throw Error('Use unique action IDs (lowercase letters, digits, underscores) and labels up to 300 characters. The ID wait is reserved.');ids.add(action.id)}
 }
 if(name==='npc'){
  if(!text(input.character)||!Array.isArray(input.nearby)||input.nearby.length>20||!input.nearby.every(x=>text(x)&&x.length<100))throw Error('Provide a character and a nearby list of places.');
  if(![input.hunger,input.energy].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100)||typeof input.money!=='number'||!Number.isFinite(input.money)||input.money<0)throw Error('Hunger and energy must be 0 to 100; money must be nonnegative.');
 }
}
export function questionFor(name,input){
 validateContext(name,input);const r=recipes[name];
 if(name==='guardrails')return {type:'noul',instructions:r.question+' Answer no for destructive actions, credentials, private information, financial transactions, or unclear scope.'};
 let criteria=r.criteria;
 if(name==='browser')criteria={...Object.fromEntries(input.actions.map(a=>[a.id,a.label])),wait:'No appropriate action; stop and request clarification'};
 return {type:name==='rag'?'score':'choice',instructions:r.question,criteria};
}
