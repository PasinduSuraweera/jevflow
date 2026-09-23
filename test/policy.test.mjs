import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function policy(result, threshold=80, selected='support'){
 const scope={selected,$:()=>({value:threshold})};vm.createContext(scope);
 vm.runInContext(source.slice(source.indexOf('function policy('),source.indexOf('function render(')),scope);
 return scope.policy(result);
}
test('threshold change moves same choice from action to review without provider request',()=>{const r={type:'choice',decision:'billing',confidence:.85};assert.equal(policy(r,80),'route_to("billing_queue")');assert.equal(policy(r,90),'request_human_review()')});
test('explicit approval wins over confident yes',()=>{assert.equal(policy({type:'yes-no',decision:'yes',confidence:.99,requiresApproval:true}),'request_human_review()')});
test('high confidence no never allows action',()=>{assert.equal(policy({type:'yes-no',decision:'no',confidence:.99}),'request_human_review()')});
test('score requires both sufficient confidence and relevance',()=>{assert.equal(policy({mode:'live',type:'score',score:2,maxScore:2,confidence:.6}),'request_human_review()');assert.equal(policy({mode:'live',type:'score',score:.2,maxScore:2,confidence:.99}),'retrieve_more_context()');assert.equal(policy({mode:'live',type:'score',score:1.9,maxScore:2,confidence:.99}),'include_in_context()')});
