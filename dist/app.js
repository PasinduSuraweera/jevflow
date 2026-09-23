import { recipes, questionFor, validateContext } from './recipes.js';
const $ = id => document.getElementById(id);
let selected = 'support', lastResult = null, running = false, revision = 0, pendingRequest = null;
let backendReady = false;
function updateLines() { $('line-numbers').textContent = $('json-input').value.split('\n').map((_,i)=>i+1).join('\n'); }
function updateQuestion() {
  try { $('request-question').textContent=JSON.stringify(questionFor(selected,JSON.parse($('json-input').value)),null,2); }
  catch { $('request-question').textContent='Fix the context to inspect the question.'; }
}
function invalidate() {
  lastResult=null; $('copy-result').disabled=true; $('result').classList.add('stale');
  $('run-status').textContent='AWAITING JEV'; $('decision-name').textContent='No result yet';
  $('confidence').textContent=''; $('meter-fill').style.width='0%'; $('probabilities').replaceChildren();
  $('response-json').textContent=''; $('result-state').textContent='Run with your key';
}
function loadPreset(name) {
  if(!Object.hasOwn(recipes,name))return;
  pendingRequest?.abort(); selected=name; revision++;
  const recipe=recipes[name]; $('recipe-select').value=name;
  $('json-input').value=JSON.stringify(recipe.input,null,2); $('question').textContent=recipe.question;
  $('recipe-kind').textContent=recipe.source?'Community-inspired recipe':'JevFlow original';
  $('recipe-credit').replaceChildren();
  if(recipe.source) {
    $('recipe-credit').append(document.createTextNode(recipe.note+' Inspired by '));
    const link=document.createElement('a'); link.href=recipe.source.url; link.textContent=recipe.source.author+' / '+recipe.source.name;
    link.target='_blank'; link.rel='noopener'; $('recipe-credit').append(link);
  }
  $('error').hidden=true; updateLines(); updateQuestion(); invalidate();
}
function policy(r) {
  const threshold=Number($('threshold').value)/100;
  if(r.type==='score') {
    if(r.confidence<threshold)return 'request_human_review()';
    return r.score/r.maxScore>=threshold?'include_in_context()':'retrieve_more_context()';
  }
  if(r.confidence<threshold)return 'request_human_review()';
  if(r.type==='yes-no')return r.decision==='yes'&&!r.requiresApproval?'allow_action()':'request_human_review()';
  const scenario=r.scenario || selected;
  if(scenario==='github')return `apply_label("${r.decision}")`;
  if(scenario==='router')return `select_model("${r.decision}")`;
  if(scenario==='browser')return r.decision==='wait'?'request_human_review()':`propose_browser_action("${r.decision}")`;
  if(scenario==='npc')return `propose_character_action("${r.decision}")`;
  return `route_to("${r.decision}_queue")`;
}
function render(r,animate=true) {
  r={...r,action:policy(r),threshold:Number($('threshold').value)/100}; lastResult=r;
  $('copy-result').disabled=false; $('result').classList.remove('stale'); $('result-type').textContent=r.type.toUpperCase();
  $('decision-name').textContent=r.type==='score'?r.decision+' / '+r.maxScore:r.decision;
  $('confidence').textContent=(r.confidence*100).toFixed(1)+'%';
  document.querySelector('.confidence-label span').textContent='Provider-reported confidence';
  $('meter-fill').style.width=(r.confidence*100)+'%'; $('next-action').textContent=r.action;
  $('result-state').textContent=r.action.includes('review')?'Review suggested':'Action preview'; $('probabilities').replaceChildren();
  Object.entries(r.probabilities).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
    const row=document.createElement('div'); row.className='probability';
    const name=document.createElement('span'); name.textContent=r.legend?`${k}: ${r.legend[Number(k)]}`:k;
    const n=document.createElement('span'); n.textContent=(v*100).toFixed(1)+'%'; row.append(name,n); $('probabilities').append(row);
  });
  $('response-json').textContent=JSON.stringify(r,null,2); $('run-status').textContent=`LIVE · ${r.latencyMs} ms`;
  if(animate){$('result').classList.remove('animating');void $('result').offsetWidth;$('result').classList.add('animating');}
}
function keyState() {
  const present=$('api-key').value.trim().length>0;
  $('key-status').textContent=present?'Key entered · not verified':'No key set';
  $('run').disabled=running||!present||!backendReady;
}
async function checkBackend() {
  try {
    const response=await fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    const data=await response.json(); backendReady=response.ok&&data.ready===true&&data.provider==='typesafe';
  }catch { backendReady=false; }
  $('backend-status').textContent=backendReady?'API backend ready':'Backend unavailable';
  $('retry-backend').hidden=backendReady;
  if(!backendReady){$('error').textContent='The API backend is unavailable. Start JevFlow with npm start, then retry the connection.';$('error').hidden=false;}
  else $('error').hidden=true;
  keyState();
}
async function run() {
  if(running)return;
  let input;
  try {
    if(!backendReady)throw Error('API backend unavailable. Retry the connection.');
    input=JSON.parse($('json-input').value); validateContext(selected,input);
    if(!/^[\x21-\x7e]{8,512}$/.test($('api-key').value.trim()))throw Error('Enter a valid Jev API key.');
    if(new TextEncoder().encode(JSON.stringify({scenario:selected,context:input})).length>32768)throw Error('Context must fit within 32 KB.');
  }catch(e){invalidate();$('error').textContent=e instanceof SyntaxError?'Invalid JSON. Check quotation marks, commas, and brackets.':e.message;$('error').hidden=false;return;}
  running=true; const startRevision=revision; const controller=new AbortController(); pendingRequest=controller;
  invalidate();$('error').hidden=true;$('run').disabled=true;$('cancel-run').hidden=false;$('run').textContent='Asking Jev…';$('run-status').textContent='EVALUATING';
  const timer=setTimeout(()=>controller.abort(),20000);
  try {
    const response=await fetch('/api/decision',{method:'POST',headers:{'Content-Type':'application/json','X-Jev-Key':$('api-key').value.trim()},body:JSON.stringify({scenario:selected,context:input}),signal:controller.signal,cache:'no-store',credentials:'omit'});
    let body;try {body=await response.json();}catch {throw Error('API backend returned an invalid response. Check that npm start is running.');}
    if(!response.ok)throw Error(body.error||'Jev request failed.');
    if(body.mode!=='live'||!body.probabilities)throw Error('Unexpected response from the live backend.');
    if(startRevision===revision&&!controller.signal.aborted){render(body);$('key-status').textContent='Key worked on the last request';}
  }catch(e){
    if(startRevision===revision){$('error').textContent=controller.signal.aborted?'Request cancelled or timed out. Provider charges may still apply.':e.message;$('error').hidden=false;$('run-status').textContent='NO RESULT';$('key-status').textContent='Request failed · see error';}
  }finally {
    clearTimeout(timer);running=false;pendingRequest=null;$('run').disabled=!$('api-key').value.trim()||!backendReady;$('cancel-run').hidden=true;$('run').innerHTML='Run with Jev <span>↗</span>';
    if(startRevision===revision&&controller.signal.aborted)$('run-status').textContent='CANCELLED';
  }
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
$('recipe-select').onchange=()=>loadPreset($('recipe-select').value);
document.querySelectorAll('[data-load]').forEach(button=>button.onclick=()=>{loadPreset(button.dataset.load);$('playground').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('recipe-select').focus({preventScroll:true});});
$('reset').onclick=()=>loadPreset(selected);$('run').onclick=run;
$('json-input').addEventListener('input',()=>{revision++;pendingRequest?.abort();updateLines();updateQuestion();invalidate();});
$('json-input').addEventListener('scroll',()=>{$('line-numbers').scrollTop=$('json-input').scrollTop;});
$('json-input').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}});
$('copy-result').onclick=()=>{if(lastResult)copy(JSON.stringify(lastResult,null,2));};
$('copy-code').onclick=()=>copy(currentCode);$('copy-install').onclick=()=>copy('npm i @typesafe-ai/sdk');
$('ts-tab').onclick=()=>setCode('ts');$('yaml-tab').onclick=()=>setCode('yaml');
const captions=['Pass your application state as structured context.','Focused questions. Structured answers. No text to parse.','Choose a label, score a signal, or answer yes / no.','Preview your policy. Choose when a human should review.'];
document.querySelectorAll('[data-stage]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.classList.contains('active')));
  button.onclick=()=>{document.querySelectorAll('[data-stage]').forEach(n=>{n.classList.remove('active');n.setAttribute('aria-pressed','false');});button.classList.add('active');button.setAttribute('aria-pressed','true');const idx=Number(button.dataset.stage);const span=document.createElement('span');span.textContent=`0${idx+1} / `;$('flow-caption').replaceChildren(span,document.createTextNode(captions[idx]));};
});
$('connect-key').onclick=()=>{$('playground').scrollIntoView();$('api-key').focus({preventScroll:true});};
$('clear-key').onclick=()=>{revision++;pendingRequest?.abort();$('api-key').value='';invalidate();keyState();toast('Key cleared');};
$('api-key').oninput=()=>{revision++;pendingRequest?.abort();invalidate();keyState();};
$('cancel-run').onclick=()=>pendingRequest?.abort();
$('retry-backend').onclick=checkBackend;
$('threshold').oninput=()=>{$('threshold-value').textContent=$('threshold').value+'%';if(lastResult)render(lastResult,false);};
window.addEventListener('pagehide',()=>{$('api-key').value='';pendingRequest?.abort();keyState();});
loadPreset('support');setCode('ts');keyState();checkBackend();
