const $ = (id) => document.getElementById(id);
const presets = {
 support: {type:'Choice',question:'Which team should handle this ticket?',input:{ticket:{subject:'Charged twice for my subscription',message:'I upgraded to Pro yesterday and was charged twice. Can you refund the duplicate payment?',customer_tier:'pro'}}},
 guardrails: {type:'Yes-No',question:'Should this proposed action proceed without human review?',input:{action:'Read the public product documentation',target:'https://example.com/docs',requires_approval:false}},
 rag: {type:'Score',question:'How relevant is the retrieved document to the question?',input:{query:'How do I reset my password?',document:'To reset your password, open account settings, select Security, then choose Reset password.'}},
 github: {type:'Choice',question:'Which label best describes this issue?',input:{title:'App crashes when uploading a large file',body:'I can reproduce this error with files larger than 10 MB. The upload throws an exception.'}}
};
let selected='support', lastResult, running=false, revision=0, pendingRequest=null;
const isLive = () => $('execution-mode').value === 'live';
function loadPreset(name){pendingRequest?.abort();selected=name;revision++;$('json-input').value=JSON.stringify(presets[name].input,null,2);$('question').textContent=presets[name].question;document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.toggle('selected',b.dataset.preset===name);b.setAttribute('aria-pressed',String(b.dataset.preset===name))});$('error').hidden=true;updateLines();if(isLive())invalidate();else render(evaluate(presets[name].input,name),false);}
function updateLines(){$('line-numbers').textContent=$('json-input').value.split('\n').map((_,i)=>i+1).join('\n');}
function evaluate(input,scenario){
 if(!input || typeof input!=='object'||Array.isArray(input))throw Error('Context must be a JSON object.');
 const text=JSON.stringify(input).toLowerCase();let probabilities,decision,action,confidence;
 if(scenario==='support'){
  if(!input.ticket||typeof input.ticket.message!=='string'||!input.ticket.message.trim())throw Error('Add a non-empty ticket.message string to your context.');
  const scores=[['billing',/charg|refund|payment|invoice|bill/.test(text)],['technical',/error|crash|bug|broken|login|password/.test(text)],['other',false]];
  const hits=scores.filter(s=>s[1]);decision=hits.length===1?hits[0][0]:hits.length?'billing':'other';confidence=hits.length===1?.94:hits.length?.52:.6;
  probabilities=Object.fromEntries(scores.map(([label])=>[label,label===decision?confidence:(1-confidence)/2]));action=confidence>=.8?`route_to("${decision}_queue")`:'request_human_review()';
 }else if(scenario==='guardrails'){
  if(typeof input.action!=='string'||!input.action.trim())throw Error('Add a non-empty action string to your context.');
  const restricted=/delete|remove|secret|password|payment|transfer|send|execute|write|credential/.test(input.action.toLowerCase())||input.requires_approval===true;
  const knownSafe=/read|view|search|list/.test(input.action.toLowerCase());decision=restricted?'no':knownSafe?'yes':'no';confidence=restricted?.96:knownSafe?.91:.55;probabilities={yes:decision==='yes'?confidence:1-confidence,no:decision==='no'?confidence:1-confidence};action=decision==='yes'?'allow_action()':'request_human_review()';
 }else if(scenario==='rag'){
  if(typeof input.query!=='string'||typeof input.document!=='string'||!input.query.trim()||!input.document.trim())throw Error('Add non-empty query and document strings.');
  const stop=new Set(['how','do','i','the','a','an','my','to','is','of','in','and','what']);const words=[...new Set(input.query.toLowerCase().match(/[a-z0-9]+/g)||[])].filter(w=>!stop.has(w));const doc=new Set(input.document.toLowerCase().match(/[a-z0-9]+/g)||[]);const score=words.length?words.filter(w=>doc.has(w)).length/words.length:0;decision=score.toFixed(2);confidence=score;probabilities={relevance:score};action=score>=.7?'include_in_context()':'retrieve_more_context()';
 }else{
  if(typeof input.title!=='string'||typeof input.body!=='string'||!input.title.trim())throw Error('Add a title and body string to your context.');
  decision=/bug|error|crash|exception|broken/.test(text)?'bug':/feature|request|add|support for/.test(text)?'enhancement':'question';confidence=decision==='question'?.7:.92;probabilities=Object.fromEntries(['bug','enhancement','question'].map(x=>[x,x===decision?confidence:(1-confidence)/2]));action=confidence>=.8?`apply_label("${decision}")`:'request_human_review()';
 }
 return {mode:'local_simulation',type:presets[scenario].type.toLowerCase(),decision,confidence,probabilities,action};
}
function policy(r){
 const threshold=Number($('threshold').value)/100;
 if(r.type==='score'){
   const relevance=r.mode==='live'?r.score/r.maxScore:Number(r.decision);
   if(r.mode==='live' && r.confidence<threshold)return 'request_human_review()';
   return relevance>=threshold?'include_in_context()':'retrieve_more_context()';
 }
 if(r.confidence<threshold)return 'request_human_review()';
 if(r.type==='yes-no')return r.decision==='yes' && !r.requiresApproval?'allow_action()':'request_human_review()';
 return selected==='github'?`apply_label("${r.decision}")`:`route_to("${r.decision}_queue")`;
}
function invalidate(){lastResult=null;$('copy-result').disabled=true;$('result').classList.add('stale');$('run-status').textContent='RUN REQUIRED';$('decision-name').textContent='Ready';$('confidence').textContent='';$('meter-fill').style.width='0%';$('probabilities').replaceChildren();$('response-json').textContent='';$('result-state').textContent='Awaiting run';}
function render(r,animate=true){
 r.requiresApproval=selected==='guardrails' && r.requiresApproval===undefined?presets.guardrails.input.requires_approval:r.requiresApproval;
 r={...r,action:policy(r),threshold:Number($('threshold').value)/100};lastResult=r;$('copy-result').disabled=false;$('result').classList.remove('stale');
 $('result-type').textContent=r.type.toUpperCase();$('decision-name').textContent=r.type==='score' && r.mode==='live'?r.decision+' / '+r.maxScore:r.decision;
 $('confidence').textContent=(r.confidence*100).toFixed(1)+'%';
 document.querySelector('.confidence-label span').textContent=r.mode==='live'?'Provider-reported confidence':r.type==='score'?'Illustrative relevance score':'Illustrative confidence';
 $('meter-fill').style.width=(r.confidence*100)+'%';$('next-action').textContent=r.action;
 $('result-state').textContent=r.action.includes('review')?'Review suggested':'Action preview';$('probabilities').replaceChildren();
 Object.entries(r.probabilities).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{const row=document.createElement('div');row.className='probability';const name=document.createElement('span');name.textContent=r.legend?`${k}: ${r.legend[Number(k)]}`:k;const n=document.createElement('span');n.textContent=(v*100).toFixed(1)+'%';row.append(name,n);$('probabilities').append(row)});
 $('response-json').textContent=JSON.stringify(r,null,2);$('run-status').textContent=r.mode==='live'?`LIVE · ${r.latencyMs} ms`:'SIMULATED';
 document.querySelector('.output-footer>span').textContent=r.mode==='live'?'Jev API · action preview':'Deterministic local simulation';
 if(animate){$('result').classList.remove('animating');void $('result').offsetWidth;$('result').classList.add('animating')}
}
async function run(){
 if(running)return;let input;
 try{input=JSON.parse($('json-input').value);evaluate(input,selected);if(isLive()&&!$('api-key').value.trim())throw Error('Enter your Jev API key to run live.');}
 catch(e){invalidate();$('error').textContent=e instanceof SyntaxError?'Invalid JSON. Check quotation marks, commas, and brackets.':e.message;$('error').hidden=false;return;}
 running=true;const startRevision=revision;const scenario=selected;const live=isLive();const controller=new AbortController();pendingRequest=controller;
 invalidate();$('error').hidden=true;$('run').disabled=true;$('cancel-run').hidden=false;$('run').textContent='Evaluating…';$('run-status').textContent='EVALUATING';
 const timer=setTimeout(()=>controller.abort(),20000);
 try{
  let result;
  if(live){
   const response=await fetch('/api/decision',{method:'POST',headers:{'Content-Type':'application/json','X-Jev-Key':$('api-key').value.trim()},body:JSON.stringify({scenario,context:input}),signal:controller.signal,cache:'no-store',credentials:'omit'});
   let body;try{body=await response.json()}catch{throw Error('Live backend unavailable. Start JevFlow with npm start.');}
   if(!response.ok)throw Error(body.error||'Live request failed.');
   if(body.mode!=='live'||!body.probabilities)throw Error('Unexpected response from the live backend.');result=body;
  }else{await new Promise(resolve=>setTimeout(resolve,350));result=evaluate(input,scenario);result.requiresApproval=input.requires_approval===true;}
  if(startRevision===revision&&!controller.signal.aborted)render(result);
 }catch(e){if(startRevision===revision){$('error').textContent=controller.signal.aborted?'Request cancelled or timed out. Provider charges may still apply.':e.message;$('error').hidden=false;$('run-status').textContent='NO RESULT';}}
 finally{clearTimeout(timer);running=false;pendingRequest=null;$('run').disabled=false;$('cancel-run').hidden=true;$('run').innerHTML='Run decision <span>↗</span>';if(startRevision===revision&&controller.signal.aborted)$('run-status').textContent='CANCELLED';}
}
const typescript=`import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

// Server only. Set TYPESAFE_API_KEY in your environment.
const client = new TypeSafeClient();
const result = await client.systemOne({
  state: { document: "Please refund my duplicate charge." },
  questions: {
    team: choice("Which team should handle this?", {
      billing: null,
      technical: null,
      other: null,
    }),
  },
});

// Your application owns the next step.
const team = result.answers.team.choice;
console.log({ route: team });`;
const yaml=`# Illustrative JevFlow configuration schema.
# Adapt this to your server's workflow runner.
name: support-routing
provider: typesafe
context: ticket

question:
  type: choice
  instructions: Which team should handle this?
  options: [billing, technical, other]

policy:
  minimum_probability: 0.80
  on_uncertain: human_review

actions:
  billing: billing_queue
  technical: engineering_queue
  other: general_queue`;
let currentCode=typescript;
function setCode(kind){currentCode=kind==='ts'?typescript:yaml;const escaped=currentCode.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');$('code-content').innerHTML=escaped.split('\n').map(line=>line.trim().startsWith('//')||line.trim().startsWith('#')?'<span class="syntax-comment">'+line+'</span>':line.replace(/("[^"]*")/g,'<span class="syntax-string">$1</span>').replace(/\b(import|from|const|await|null)\b/g,'<span class="syntax-key">$1</span>')).join('\n');$('ts-tab').classList.toggle('selected',kind==='ts');$('yaml-tab').classList.toggle('selected',kind==='yaml');$('ts-tab').setAttribute('aria-pressed',String(kind==='ts'));$('yaml-tab').setAttribute('aria-pressed',String(kind==='yaml'));$('code-note').textContent=kind==='ts'?'Server-side example · TYPESAFE_API_KEY required':'Configuration concept · not a published JevFlow runner';}
let toastTimer;function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2500)}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied to clipboard')}catch{toast('Clipboard unavailable. Select and copy the text manually.')}}
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>loadPreset(b.dataset.preset));document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{loadPreset(b.dataset.load);$('playground').scrollIntoView({behavior:'smooth'});});$('reset').onclick=()=>loadPreset(selected);$('run').onclick=run;$('json-input').addEventListener('input',()=>{revision++;pendingRequest?.abort();updateLines();invalidate()});$('json-input').addEventListener('scroll',()=>{$('line-numbers').scrollTop=$('json-input').scrollTop});$('json-input').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run()}});$('copy-result').onclick=()=>{if(lastResult)copy(JSON.stringify(lastResult,null,2))};$('copy-code').onclick=()=>copy(currentCode);$('copy-install').onclick=()=>copy('npm i @typesafe-ai/sdk');$('ts-tab').onclick=()=>setCode('ts');$('yaml-tab').onclick=()=>setCode('yaml');
const captions=['Pass your application state as structured context.','Focused questions. Structured answers. No text to parse.','Choose a label, score a signal, or answer yes / no.','Apply your own policy. Execute or request human review.'];document.querySelectorAll('[data-stage]').forEach(b=>{b.setAttribute('aria-pressed',String(b.classList.contains('active')));b.onclick=()=>{document.querySelectorAll('[data-stage]').forEach(n=>{n.classList.remove('active');n.setAttribute('aria-pressed','false')});b.classList.add('active');b.setAttribute('aria-pressed','true');const idx=Number(b.dataset.stage);$('flow-caption').replaceChildren();const span=document.createElement('span');span.textContent=`0${idx+1} / `;$('flow-caption').append(span,document.createTextNode(captions[idx]))}});
$('execution-mode').onchange=()=>{revision++;pendingRequest?.abort();const live=isLive();$('key-controls').hidden=!live;$('key-notice').hidden=!live;if(!live)$('api-key').value='';$('mode-notice').textContent=live?'Live mode: your context and key pass through this server to TypeSafe. Actions are previews only.':'Demo mode: local rules with illustrative probabilities. No model calls.';document.querySelector('.output-footer>span').textContent=live?'Live mode · awaiting request':'Deterministic local simulation';$('error').hidden=true;invalidate()};
$('clear-key').onclick=()=>{revision++;pendingRequest?.abort();$('api-key').value='';invalidate();toast('Key cleared')};
$('api-key').oninput=()=>{revision++;pendingRequest?.abort();invalidate()};
$('cancel-run').onclick=()=>pendingRequest?.abort();
$('threshold').oninput=()=>{$('threshold-value').textContent=$('threshold').value+'%';if(lastResult)render(lastResult,false)};
window.addEventListener('pagehide',()=>{$('api-key').value='';pendingRequest?.abort()});
loadPreset('support');setCode('ts');
