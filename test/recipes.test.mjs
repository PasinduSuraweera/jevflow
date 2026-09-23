import test from 'node:test';
import assert from 'node:assert/strict';
import {recipes,questionFor,validateContext} from '../dist/recipes.js';
import {buildRequest,normalizeResponse} from '../server/decisions.mjs';
for(const [name,recipe] of Object.entries(recipes))test(`${name} has a valid live question`,()=>{
 const request=buildRequest({scenario:name,context:recipe.input});
 assert.equal(request.model,'jev-latest');
 assert.equal(request.state,recipe.input);
 assert.deepEqual(request.questions.decision,questionFor(name,recipe.input));
});
test('browser question binds to supplied actions, not a hardcoded result',()=>{
 const context={goal:'Open contact',page:'Home',actions:[{id:'contact',label:'Contact us'}]};
 const request=buildRequest({scenario:'browser',context});
 assert.deepEqual(Object.keys(request.questions.decision.criteria),['contact','wait']);
 const raw={answers:{decision:{type:'choice',choice:'contact',confidence:.9,probabilities:{contact:.9,wait:.1}}}};
 assert.equal(normalizeResponse(raw,request,'browser').decision,'contact');
 raw.answers.decision.choice='open_docs';assert.throws(()=>normalizeResponse(raw,request,'browser'));
});
test('browser rejects duplicate, unsafe and reserved action IDs',()=>{
 for(const actions of [[{id:'wait',label:'bad'}],[{id:'__proto__',label:'bad'}],[{id:'a',label:'a'},{id:'a',label:'b'}],[]])assert.throws(()=>validateContext('browser',{goal:'g',page:'p',actions}));
});
test('NPC needs are bounded and router task cannot be empty',()=>{
 assert.throws(()=>validateContext('npc',{...recipes.npc.input,hunger:101}));
 assert.throws(()=>validateContext('npc',{...recipes.npc.input,energy:'low'}));
 assert.throws(()=>validateContext('router',{task:''}));
});
test('recipe name cannot access inherited properties',()=>{assert.throws(()=>validateContext('constructor',{}));assert.throws(()=>buildRequest({scenario:'__proto__',context:{}}));});
