// Original line icons drawn on a 24px grid. Each entry is the markup inside <svg viewBox="0 0 24 24">.
// Strokes use currentColor so icons follow the day and night palettes.
const dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="1.2" fill="currentColor" stroke="none"/>`;
const wave=y=>`<path d="M2 ${y}c2-1.6 3.5-1.6 5 0s3 1.6 5 0 3-1.6 5 0 3 1.6 5 0"/>`;
export const ICONS={
 house:'<path d="M3 11 12 4l9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
 cup:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8.5 3c-.8 1.3.8 2.2 0 3.5M12.5 3c-.8 1.3.8 2.2 0 3.5"/>',
 hammer:'<path d="M11 5.5 15.5 3l5.5 5.5-2.5 4.5z"/><path d="m13.5 8.5-9.5 9.5 2 2 9.5-9.5"/>',
 sprout:'<path d="M12 21v-9"/><path d="M12 12C12 8 9.5 6 5 6c0 4 2.5 6 7 6z"/><path d="M12 14.5c0-4.5 2.5-7.5 7-7.5 0 4.5-2.5 7.5-7 7.5z"/>',
 waves:wave(7)+wave(12)+wave(17),
 book:'<path d="M5 18.5V4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5 1.5 1.5 0 0 0 6.5 20H19v-3"/><path d="M9 7h6"/>',
 openBook:'<path d="M12 7C10 5 7 4.5 3 5v13c4-.5 7 0 9 2 2-2 5-2.5 9-2V5c-4-.5-7 0-9 2z"/><path d="M12 7v13"/>',
 stall:'<path d="M3 9 5 4h14l2 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 11.5V20h14v-8.5"/><path d="M10 20v-5h4v5"/>',
 bread:'<path d="M5 11a4 4 0 0 1 3-7h8a4 4 0 0 1 3 7v9H5z"/><path d="m9.5 8 1 3M13.5 8l1 3"/>',
 lantern:'<path d="M9 3h6M12 3v2.5"/><path d="M8 7.5h8l1 2v8l-1 2H8l-1-2v-8z"/><path d="M10 21.5h4M12 11v4.5"/>',
 pine:'<path d="M12 2.5 6.5 10H9l-4 6h14l-4-6h2.5z"/><path d="M12 16v5.5"/>',
 telescope:'<path d="m3.5 13.5 12.5-6 2 4-12.5 6z"/><path d="m18 7.5 2-1 2 4-2 1"/><path d="m10 15.5-3 6M12 14.5l3 7"/>',
 bowl:'<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7.5c0-1.5 1-2 1-3.5M12 7.5c0-1.5 1-2 1-3.5M16 7.5c0-1.5 1-2 1-3.5"/>',
 bed:'<path d="M3 6.5V19M3 15h18v4"/><path d="M21 15v-3a3 3 0 0 0-3-3h-7.5v6"/><circle cx="6.8" cy="11.5" r="1.8"/>',
 moon:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
 box:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
 leaf:'<path d="M5 20C5 10 10 5 20 4c-1 10-6 15-15 16z"/><path d="m5 20 9-9"/>',
 axe:'<path d="m14.5 9.5-10 11"/><path d="M12.5 4c3.5 0 6.5 2 8 5.5l-5 3-5-5z"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
 fish:'<path d="M6 12c2.5-3.5 6-5 9-5s5 2 7 5c-2 3-4 5-7 5s-6.5-1.5-9-5z"/><path d="M6 12 2 8.5v7z"/>'+dot(17,11),
 chat:'<path d="M4 4.5h10.5A1.5 1.5 0 0 1 16 6v6.5a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H4a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 4 4.5z"/><path d="M16 9h3.5A1.5 1.5 0 0 1 21 10.5V16a1.5 1.5 0 0 1-1.5 1.5H19v3l-4-3h-3.5A1.5 1.5 0 0 1 10 16v-.5"/>',
 pulse:'<path d="M2.5 12H7l2.5-6 5 12 2.5-6h4.5"/>',
 cap:'<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5"/><path d="M22 9v6"/>',
 pot:'<path d="M4.5 10h15v7a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z"/><path d="M2 10h20"/><path d="M9 6.5c0-1 1-1.6 1-3M14 6.5c0-1 1-1.6 1-3"/>',
 coin:'<circle cx="12" cy="12" r="9"/><path d="M14.8 9c-.6-1-1.6-1.6-2.8-1.6-1.6 0-2.8.8-2.8 2.1 0 3 5.6 1.6 5.6 4.8 0 1.4-1.3 2.3-2.8 2.3-1.3 0-2.4-.6-3-1.7M12 5.5v1.9M12 16.6v1.9"/>',
 plate:'<circle cx="14" cy="12" r="6.5"/><circle cx="14" cy="12" r="3"/><path d="M3 4v5.5a1.5 1.5 0 0 0 3 0V4M4.5 11v9"/>',
 note:'<path d="M9 18V5.5l11-2.5v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
 star:'<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/>',
 heart:'<path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z"/>',
 dots:dot(6,12)+dot(12,12)+dot(18,12),
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
 cloud:'<path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.6 4.2 4.2 0 0 0 7 18z"/>',
 rain:'<path d="M7 14h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 5.6 4.2 4.2 0 0 0 7 14z"/><path d="m8.5 17-1 3M12.5 17l-1 3M16.5 17l-1 3"/>',
 storm:'<path d="M8 14H7a4.2 4.2 0 0 1-1-8.4A6 6 0 0 1 17.6 6a4 4 0 0 1-.6 8h-1"/><path d="m13 10-3 5h4l-3 5.5"/>',
 snow:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
 sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 6"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
 scale:'<path d="M12 3.5v17M7.5 20.5h9M4 7h16"/><path d="M4 7 1.5 13a2.5 2.5 0 0 0 5 0zM20 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0"/>'+dot(9,9.5)+dot(15,9.5),
 log:'<ellipse cx="17" cy="12" rx="3" ry="5"/><path d="M17 7H6.5C4.6 7 3 9.2 3 12s1.6 5 3.5 5H17"/><ellipse cx="17" cy="12" rx="1" ry="1.8"/>',
 rotateLeft:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
 rotateRight:'<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1l2.6 2.6"/><path d="M20.5 3.5v5h-5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 target:'<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
 maximize:'<path d="M8 3.5H3.5V8M16 3.5h4.5V8M20.5 16v4.5H16M3.5 16v4.5H8"/>',
 play:'<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
 pause:'<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" fill="currentColor"/>',
 step:'<path d="M5 4.5v15l10-7.5z"/><path d="M19 4.5v15"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 sparkle:'<path d="M12 2.5c.8 5 3.5 8.7 9.5 9.5-6 .8-8.7 4.5-9.5 9.5-.8-5-3.5-8.7-9.5-9.5 6-.8 8.7-4.5 9.5-9.5z"/>',
 flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'
};
const SVG='http://www.w3.org/2000/svg';
export function svg(name,className='icon'){const el=document.createElementNS(SVG,'svg');el.setAttribute('viewBox','0 0 24 24');el.setAttribute('class',className);el.setAttribute('aria-hidden','true');el.innerHTML=ICONS[name]||ICONS.dots;return el;}
// Replaces an element's icon only when it changes, so frequent UI refreshes stay cheap.
export function setIcon(el,name){if(!el||el.dataset.icon===name)return;el.dataset.icon=name;el.replaceChildren(svg(name));}

// Resident portraits: shirt, hair and hat match the 3D villager, and the face follows their mood and energy.
const colorHex=n=>'#'+(n>>>0).toString(16).padStart(6,'0').slice(-6);
const HAT_ART={
 straw:'<ellipse cx="16" cy="9.8" rx="10" ry="2.2" fill="#e0bc73"/><path d="M11 9.8c0-3.2 2-5.2 5-5.2s5 2 5 5.2z" fill="#e0bc73"/><path d="M11.3 8.4h9.4" stroke="#b98f4a" stroke-width="1"/>',
 beanie:'<path d="M8.3 12.6C8.3 7.6 11.7 5.6 16 5.6s7.7 2 7.7 7z" fill="#c0584a"/><rect x="8" y="11.3" width="16" height="2.4" rx="1.2" fill="#a84a3e"/><circle cx="16" cy="4.9" r="1.8" fill="#f2ead8"/>',
 chef:'<path d="M10.2 11.5V8.7a3 3 0 0 1 2-5.2 4 4 0 0 1 7.6 0 3 3 0 0 1 2 5.2v2.8z" fill="#fbfaf5" stroke="#d9d1c0" stroke-width=".6"/>',
 flower:'<circle cx="9.6" cy="10" r="1.6" fill="#f2a5b5"/><circle cx="13" cy="7.6" r="1.6" fill="#f5d390"/><circle cx="16.8" cy="6.9" r="1.6" fill="#ffffff"/><circle cx="20.4" cy="8" r="1.6" fill="#f2a5b5"/><circle cx="22.8" cy="10.8" r="1.6" fill="#f5d390"/>'
};
export function faceKey(v){return [v.color,v.hair,v.hat,v.happiness>=55?2:v.happiness>=30?1:0,v.energy<=20?1:0].join();}
export function faceMarkup(v){
 const shirt=colorHex(v.color),hair=colorHex(v.hair??0x75553e),mood=v.happiness>=55?'happy':v.happiness>=30?'calm':'sad',ink='stroke="#3d3a33" stroke-width="1.2" stroke-linecap="round" fill="none"';
 const eyes=v.energy<=20?`<path d="M12.2 15.6h2M17.8 15.6h2" ${ink}/>`:'<circle cx="13.2" cy="15.3" r="1.05" fill="#3d3a33"/><circle cx="18.8" cy="15.3" r="1.05" fill="#3d3a33"/>';
 const mouth={happy:'M13.6 18.4q2.4 2.1 4.8 0',calm:'M14 19.1h4',sad:'M13.6 19.9q2.4-1.8 4.8 0'}[mood];
 return `<circle cx="16" cy="16" r="16" fill="${shirt}" opacity=".3"/><path d="M4.5 32c1-7 5-10.2 11.5-10.2S26.5 25 27.5 32z" fill="${shirt}"/><circle cx="16" cy="15" r="7.6" fill="#e7bd95"/>`
  +`<path d="M8.4 14.6C8.4 9.6 11.7 7 16 7s7.6 2.6 7.6 7.6c-1.6-2.2-4.1-3.4-7.6-3.4s-6 1.2-7.6 3.4z" fill="${hair}"/>`
  +eyes+`<path d="${mouth}" ${ink}/><circle cx="11.5" cy="17.7" r="1.2" fill="#f0a39a" opacity=".55"/><circle cx="20.5" cy="17.7" r="1.2" fill="#f0a39a" opacity=".55"/>`+(HAT_ART[v.hat]||'');
}
export function face(v,className='face'){const el=document.createElement('span');el.className=className;setFace(el,v);return el;}
export function setFace(el,v){const key=faceKey(v);if(!el||el.dataset.face===key)return;el.dataset.face=key;const art=document.createElementNS(SVG,'svg');art.setAttribute('viewBox','0 0 32 32');art.setAttribute('aria-hidden','true');art.innerHTML=faceMarkup(v);el.replaceChildren(art);}
