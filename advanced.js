/* MAMSS School Desk — local-first, opt-in tools. No accounts or private school data. */
const DESK_KEY='mamss.desk.v1';
const deskTaskList=[
 ['availability','Confirm that places are available','Call the school to confirm the class, entry requirements, and application costs.'],
 ['form','Collect an application form','Visit the school office or the Parish Bookshop at Mater Misericordiae Catholic Church.'],
 ['documents','Ask for the official document list','Confirm required documents and fees with the office; no unverified list is assumed here.'],
 ['prepare','Prepare for the entrance assessment','The published subjects are English Language, Mathematics, and General Paper.'],
 ['date','Confirm your assessment date','The dates on the original 2026 flyer have passed. Confirm any additional arrangements.'],
 ['submit','Return your completed form to the school','Follow the office’s instructions and request confirmation directly from the school.']
];
const resourceKey=r=>r.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
const resourceByKey=Object.fromEntries(resources.map(r=>[resourceKey(r),r]));
const initialDesk=()=>({version:1,consent:false,role:'parent',entry:'JSS 1',tasks:[],favorites:[],reminders:[],settings:{text:'standard',contrast:false,motion:false,depth:true}});
const lagosToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number(s.slice(0,4))>=1900&&Number(s.slice(0,4))<=2100&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const dateLabel=(s,options={day:'numeric',month:'long',year:'numeric'})=>new Intl.DateTimeFormat('en-GB',{...options,timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
function validateDesk(raw){
 if(!raw||raw.version!==1)throw Error('This is not a supported MAMSS School Desk backup.');
 const d=initialDesk();
 if(['parent','student','staff'].includes(raw.role))d.role=raw.role;
 if(['JSS 1','JSS 2','SS 1','SS 2'].includes(raw.entry))d.entry=raw.entry;
 d.consent=raw.consent===true;
 d.tasks=[...new Set(Array.isArray(raw.tasks)?raw.tasks.filter(t=>deskTaskList.some(x=>x[0]===t)):[])];
 d.favorites=[...new Set(Array.isArray(raw.favorites)?raw.favorites.filter(k=>Object.hasOwn(resourceByKey,k)):[])];
 if(Array.isArray(raw.reminders)){
  if(raw.reminders.length>100)throw Error('A backup can contain at most 100 reminders.');
  const ids=new Set();
  d.reminders=raw.reminders.map(r=>{
   if(!r||typeof r.id!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(r.id)||ids.has(r.id)||typeof r.title!=='string'||!r.title.trim()||r.title.length>120||!validDate(r.date)||typeof r.notes!=='string'||r.notes.length>500||typeof r.time!=='string'||(r.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)))throw Error('This backup contains an invalid reminder. No data was changed.');
   ids.add(r.id);return{id:r.id,title:r.title.trim(),date:r.date,time:r.time,notes:r.notes};
  });
 }
 if(raw.settings){if(['standard','large','larger'].includes(raw.settings.text))d.settings.text=raw.settings.text;d.settings.contrast=raw.settings.contrast===true;d.settings.motion=raw.settings.motion===true;d.settings.depth=raw.settings.depth!==false;}
 return d;
}
let deskState=initialDesk();
try{const saved=localStorage.getItem(DESK_KEY);if(saved){const candidate=validateDesk(JSON.parse(saved));if(candidate.consent)deskState=candidate;}}catch{/* Sandboxed previews may disallow browser storage. */}
let deskTab='overview',calendarDate=lagosToday(),calendarMonth=calendarDate.slice(0,7),toastTimer;
function toast(message){$('#app-toast').textContent=message;$('#app-toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#app-toast').classList.remove('visible'),4200);}
function persistDesk(){
 if(!deskState.consent)return true;
 try{localStorage.setItem(DESK_KEY,JSON.stringify(deskState));return true;}catch{deskState.consent=false;toast('Device saving is unavailable here. Your changes still work for this visit.');return false;}
}
function updateDeskChrome(){
 $('#saved-count').textContent=deskState.favorites.length;
 $('#storage-badge').textContent=deskState.consent?'Saved on this device':'This visit only';
 $('#storage-badge').classList.toggle('enabled',deskState.consent);
 $('#remember-banner').hidden=deskState.consent;
}
function enableDeviceSaving(){deskState.consent=true;const ok=persistDesk();updateDeskChrome();if(ok)toast('Enabled. Your school desk is saved only in this browser.');return ok;}
$('#enable-device-saving').addEventListener('click',enableDeviceSaving);
function applyReadingSettings(){
 const root=document.documentElement;
 root.dataset.depth=deskState.settings.depth===false?'off':'on';
 root.dataset.reading=deskState.settings.text;root.dataset.contrast=deskState.settings.contrast?'high':'normal';root.dataset.motion=deskState.settings.motion?'reduce':'normal';
 if(deskState.settings.motion&&heroPlaying){heroPlaying=false;stopHeroTimer();$('#hero-play').textContent='Play ▷';$('#hero-play').setAttribute('aria-pressed','false');$('#hero-play').setAttribute('aria-label','Play school photo slideshow');}
}
applyReadingSettings();
function commitDesk(){persistDesk();updateDeskChrome();syncFavoriteButtons();}
function resourceLink(r,label='Open resource',cls='desk-link'){
 return r.href?externalLink(r.href,label,cls):`<button class="${cls}" data-action="${r.action}">${label} <span>↗</span></button>`;
}
function progressMarkup(){const count=deskState.tasks.length;return`<span class="task-progress-header"><b>${count} of ${deskTaskList.length} steps</b><span>${Math.round(count/deskTaskList.length*100)}%</span></span><progress class="task-progress" max="6" value="${count}" aria-label="Admission checklist completion">${count} of 6 steps</progress>`;}
function smallResourceRow(key,saved=false){const r=resourceByKey[key];return`<div class="desk-resource-row"><div><span>${r.label}</span><strong>${r.title}</strong></div>${resourceLink(r,'Open','desk-resource-open')}<button class="desk-save" data-save-resource="${key}" aria-pressed="${saved}" aria-label="${saved?'Remove':'Save'} ${escapeHtml(r.title)}${saved?' from saved resources':''}">${saved?'★':'☆'}</button></div>`;}
function renderOverview(){
 const recommended=deskState.role==='staff'?['school-portal-login','cbt-examiner-staff-login','digital-e-library']:deskState.role==='student'?['mamss-prep','cbt-student-login','digital-e-library','check-student-results']:['check-student-results','school-calendar','submit-a-contact-form'];
 const upcoming=deskState.reminders.filter(r=>r.date>=lagosToday()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,2);
 return`<div class="desk-panel-heading"><div><p class="eyebrow">A PLACE FOR YOUR NEXT STEP</p><h3>A little order.<br><em>A lot more possibility.</em></h3></div><label class="desk-role-label">Show me resources for<select id="desk-role"><option value="parent" ${deskState.role==='parent'?'selected':''}>Parents & guardians</option><option value="student" ${deskState.role==='student'?'selected':''}>Students</option><option value="staff" ${deskState.role==='staff'?'selected':''}>Staff</option></select></label></div><div class="overview-tiles"><button class="overview-tile checklist-tile" data-desk-go="admissions"><span class="tile-eyebrow">YOUR ADMISSIONS JOURNEY <b>↗</b></span><strong>Small steps.<br>A confident start.</strong>${progressMarkup()}</button><div class="overview-tile reminder-tile"><span class="tile-eyebrow">YOUR NEXT REMINDERS <button data-advanced="add-reminder" aria-label="Add a personal reminder">+</button></span>${upcoming.length?upcoming.map(r=>`<button class="mini-reminder" data-reminder="${r.id}"><span>${dateLabel(r.date,{day:'2-digit',month:'short'})}</span><b>${escapeHtml(r.title)}</b></button>`).join(''):'<div class="reminder-empty"><span aria-hidden="true">◷</span><p>A clear space for what’s next.</p><button class="desk-link" data-advanced="add-reminder">Add your first reminder ↗</button></div>'}</div></div><div class="desk-block-title"><h4>Picked for your day</h4><button class="desk-link" data-desk-go="saved">Saved resources <span>→</span></button></div><div class="desk-recommendations">${recommended.map(key=>smallResourceRow(key,deskState.favorites.includes(key))).join('')}</div><div class="desk-small-notice"><span aria-hidden="true">i</span><p>Need results, an exam, or school records? Open the official service. This desk is your personal organiser, not a school account.</p></div>`;
}
function renderChecklist(){return`<div class="desk-panel-heading"><div><p class="eyebrow">ONE STEP AT A TIME</p><h3>Prepare for<br><em>your next chapter.</em></h3></div><label class="desk-role-label">Preferred entry class<select id="desk-entry">${['JSS 1','JSS 2','SS 1','SS 2'].map(c=>`<option${c===deskState.entry?' selected':''}>${c}</option>`).join('')}</select></label></div><p class="desk-intro">A personal checklist based on the school’s published admission information. Tick steps as you complete them. This is not an application or an admission-status tracker.</p>${progressMarkup()}<div class="admission-tasks">${deskTaskList.map(([id,title,note])=>`<label class="admission-task${deskState.tasks.includes(id)?' complete':''}"><input type="checkbox" data-task="${id}" ${deskState.tasks.includes(id)?'checked':''}><span><strong>${title}</strong><small>${note}</small></span></label>`).join('')}</div><div class="desk-action-row"><button class="button" data-action="admissions">Official admission information <span>↗</span></button><button class="outline-button" data-advanced="print-checklist">Print checklist</button><button class="desk-link" data-advanced="download-checklist">Download checklist ↓</button></div><p class="desk-footnote">Marking a step complete changes only your checklist. The school is not notified.</p>`;}
function renderSaved(){return`<div class="desk-panel-heading"><div><p class="eyebrow">KEEP THE IMPORTANT THINGS CLOSE</p><h3>Your favourite<br><em>school resources.</em></h3></div><span class="desk-count-label">${deskState.favorites.length} saved</span></div><p class="desk-intro">Use the star on any resource to keep its official link here. Your portal credentials are never saved by this website.</p>${deskState.favorites.length?`<div class="desk-recommendations">${deskState.favorites.map(k=>smallResourceRow(k,true)).join('')}</div>`:'<div class="desk-empty-state"><span aria-hidden="true">☆</span><h4>A shortcut to what matters.</h4><p>No saved resources yet. Explore the directory and tap a star to start your own collection.</p><a class="button" href="#resources">Explore school resources <span>↓</span></a></div>'}<div class="desk-action-row"><a class="desk-link" href="#resources">Browse all resources →</a></div>`;}
const publishedCalendar=[
 {id:'published-may',date:'2026-05-30',time:'10:00',title:'Published entrance examination',official:true},
 {id:'published-july',date:'2026-07-25',time:'10:00',title:'Published entrance examination',official:true},
 {id:'published-august',date:'2026-08-29',time:'10:00',title:'Published entrance examination',official:true},
 {id:'published-september',date:'2026-09-12',time:'10:00',title:'Published entrance examination',official:true}
];
function calendarEvents(date){return[...publishedCalendar,...deskState.reminders].filter(r=>r.date===date);}
function shiftDate(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function calendarCells(){
 const first=calendarMonth+'-01';const weekday=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;const start=shiftDate(first,-weekday);let html='';
 for(let row=0;row<6;row++){html+='<tr>';for(let col=0;col<7;col++){const date=shiftDate(start,row*7+col),events=calendarEvents(date),isSelected=date===calendarDate;html+=`<td><button data-calendar-day="${date}" tabindex="${isSelected?'0':'-1'}" class="${date.startsWith(calendarMonth)?'':'outside-month '}${isSelected?'selected ':''}${date===lagosToday()?'today':''}" aria-label="${dateLabel(date)}, ${events.length} ${events.length===1?'entry':'entries'}" aria-pressed="${isSelected}"><span>${Number(date.slice(-2))}</span><span class="calendar-dots" aria-hidden="true">${events.some(e=>e.official)?'<i class="official-dot"></i>':''}${events.some(e=>!e.official)?'<i class="personal-dot"></i>':''}</span></button></td>`;}html+='</tr>';}
 return html;
}
function renderPlanner(){
 const events=calendarEvents(calendarDate);
 return`<div class="desk-panel-heading"><div><p class="eyebrow">A LITTLE SPACE TO PLAN AHEAD</p><h3>Make room for<br><em>what matters.</em></h3></div><button class="button" data-advanced="add-reminder">Add a reminder <span>+</span></button></div><p class="desk-intro">Personal reminders live in your desk. School dates are labelled separately. No appointment is booked and no notification is sent.</p><div class="planner-layout"><div class="calendar"><div class="calendar-top"><h4>${dateLabel(calendarMonth+'-01',{month:'long',year:'numeric'})}</h4><div><button data-calendar-month="-1" aria-label="Previous month">‹</button><button id="calendar-today">Today</button><button data-calendar-month="1" aria-label="Next month">›</button></div></div><table class="calendar-grid"><caption class="sr-only">Choose a day to see personal reminders and published school dates</caption><thead><tr>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${calendarCells()}</tbody></table><div class="calendar-legend"><span><i class="personal-dot"></i> Personal reminder</span><span><i class="official-dot"></i> Published school date</span></div></div><div class="day-agenda"><p class="eyebrow">${dateLabel(calendarDate,{weekday:'long'})}</p><h4>${dateLabel(calendarDate,{day:'numeric',month:'long'})}</h4>${events.length?events.map(e=>`<button class="agenda-entry ${e.official?'official':''}" ${e.official?'data-action="calendar"':`data-reminder="${e.id}"`}><span>${e.official?'PUBLISHED · PAST DATE':'PERSONAL REMINDER'}</span><strong>${escapeHtml(e.title)}</strong><small>${e.time?e.time+' · Africa/Lagos':'All day'} ↗</small></button>`).join(''):'<p class="agenda-empty">Nothing planned for this day. Leave a little room for possibility.</p>'}<button class="desk-link" data-advanced="add-reminder">Add to this day +</button></div></div><div class="planner-footer"><button class="desk-link" data-advanced="export-calendar">Export my reminders (.ics) ↓</button><button class="desk-link" data-action="calendar">School dates & PTA notice ↗</button></div><p class="desk-footnote">The original PTA notice says “6 October” without a year. It has not been added to the calendar as a confirmed event.</p>`;
}
function renderDesk(){
 updateDeskChrome();
 $('#desk-today').textContent=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Lagos'}).format(new Date());
 $('#desk-panel').innerHTML=({overview:renderOverview,admissions:renderChecklist,planner:renderPlanner,saved:renderSaved}[deskTab])();
 $('#desk-panel').setAttribute('aria-labelledby','desk-tab-'+deskTab);
 $$('[data-desk-tab]').forEach(b=>{const on=b.dataset.deskTab===deskTab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
}
function chooseDeskTab(tab,focus=false){deskTab=tab;renderDesk();if(focus)$('#desk-tab-'+tab).focus();}
$$('[data-desk-tab]').forEach((button,index)=>{
 button.addEventListener('click',()=>chooseDeskTab(button.dataset.deskTab));
 button.addEventListener('keydown',e=>{const tabs=['overview','admissions','planner','saved'];let next;if(['ArrowDown','ArrowRight'].includes(e.key))next=(index+1)%4;else if(['ArrowUp','ArrowLeft'].includes(e.key))next=(index+3)%4;else if(e.key==='Home')next=0;else if(e.key==='End')next=3;if(next!==undefined){e.preventDefault();chooseDeskTab(tabs[next],true);}});
});
$('#desk-panel').addEventListener('change',e=>{
 if(e.target.id==='desk-role'){deskState.role=e.target.value;commitDesk();renderDesk();$('#desk-role').focus();}
 if(e.target.id==='desk-entry'){deskState.entry=e.target.value;commitDesk();}
 if(e.target.matches('[data-task]')){const task=e.target.dataset.task;deskState.tasks=e.target.checked?[...new Set([...deskState.tasks,task])]:deskState.tasks.filter(t=>t!==task);commitDesk();renderDesk();$(`[data-task="${task}"]`).focus();}
});
$('#desk-panel').addEventListener('click',e=>{
 const tab=e.target.closest('[data-desk-go]');if(tab)chooseDeskTab(tab.dataset.deskGo);
 const day=e.target.closest('[data-calendar-day]');if(day){calendarDate=day.dataset.calendarDay;calendarMonth=calendarDate.slice(0,7);renderDesk();$(`[data-calendar-day="${calendarDate}"]`).focus();}
 const month=e.target.closest('[data-calendar-month]');if(month){const d=new Date(calendarMonth+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+Number(month.dataset.calendarMonth));calendarMonth=d.toISOString().slice(0,7);calendarDate=calendarMonth+'-01';renderDesk();$(`[data-calendar-month="${month.dataset.calendarMonth}"]`).focus();}
 if(e.target.id==='calendar-today'){calendarDate=lagosToday();calendarMonth=calendarDate.slice(0,7);renderDesk();$('#calendar-today').focus();}
});
$('#desk-panel').addEventListener('keydown',e=>{
 const day=e.target.closest('[data-calendar-day]');if(!day)return;const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(delta!==undefined){e.preventDefault();calendarDate=shiftDate(day.dataset.calendarDay,delta);calendarMonth=calendarDate.slice(0,7);renderDesk();$(`[data-calendar-day="${calendarDate}"]`).focus();}
});
function syncFavoriteButtons(){
 $$('[data-save-resource]').forEach(b=>{const key=b.dataset.saveResource,on=deskState.favorites.includes(key);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',`${on?'Remove':'Save'} ${resourceByKey[key].title}${on?' from saved resources':''}`);b.textContent=on?'★':'☆';b.classList.toggle('is-saved',on);});
}
function toggleFavorite(key){
 if(!resourceByKey[key])return;
 const had=deskState.favorites.includes(key);deskState.favorites=had?deskState.favorites.filter(k=>k!==key):[...deskState.favorites,key];commitDesk();renderDesk();toast(had?'Removed from your saved resources.':'Saved to My school desk.');
}
const coreRenderResources=renderResources;
renderResources=function(){coreRenderResources();$$('.resource-card').forEach(card=>{const r=resources.find(x=>x.title===$('h3',card).textContent);if(r){card.classList.add('saveable');card.insertAdjacentHTML('beforeend',`<button class="resource-save" data-save-resource="${resourceKey(r)}" aria-pressed="false" aria-label="Save ${escapeHtml(r.title)}">☆</button>`);}});syncFavoriteButtons();};
renderResources();renderDesk();

// Reminder editor: explicit personal status, safe text rendering, no notifications.
function showReminderEditor(id){
 const item=id?deskState.reminders.find(r=>r.id===id):null;
 if(id&&!item)return;
 showDialog(`<p class="eyebrow">MY SCHOOL DESK · PERSONAL REMINDER</p><h2>${item?'A moment to':'Make a little'}<br><em>${item?'revisit your plans.':'room for what’s next.'}</em></h2><p>This reminder belongs to your personal planner. It does not book a visit, notify the school, or send an alert.</p><form id="reminder-form"><div><label for="reminder-title">Reminder title *</label><input id="reminder-title" name="title" required maxlength="120" placeholder="e.g. Call the admissions office" value="${escapeHtml(item?.title||'')}"></div><div class="form-row"><div><label for="reminder-date">Date *</label><input id="reminder-date" name="date" type="date" min="1900-01-01" max="2100-12-31" required value="${item?.date||calendarDate}"></div><div><label for="reminder-time">Time (optional, Lagos time)</label><input id="reminder-time" name="time" type="time" value="${item?.time||''}"></div></div><div><label for="reminder-notes">Notes (optional)</label><textarea id="reminder-notes" name="notes" maxlength="500" rows="3" placeholder="Keep student records and sensitive details out of this space.">${escapeHtml(item?.notes||'')}</textarea></div><p id="reminder-error" class="form-error" role="alert"></p><div class="action-row"><button class="button" type="submit">${item?'Save changes':'Add to my planner'} <span>✓</span></button>${item?'<button type="button" class="button light" id="reminder-download">Download .ics</button><button type="button" class="delete-link" id="reminder-delete">Delete reminder</button>':''}</div><p class="small-note">${deskState.consent?'Saved in this browser only. No cloud sync.':'Kept for this visit only. Enable device saving in the desk to keep it after closing.'}</p></form>`);
 $('#reminder-form').addEventListener('submit',e=>{
  e.preventDefault();const data=new FormData(e.currentTarget);const title=String(data.get('title')).trim(),date=String(data.get('date')),time=String(data.get('time')),notes=String(data.get('notes')).trim();
  if(!title||!validDate(date)){ $('#reminder-error').textContent='Enter a title and a valid date.';return;}
  if(!item&&deskState.reminders.length>=100){$('#reminder-error').textContent='Your planner supports up to 100 reminders. Delete an old reminder first.';return;}
  const reminder={id:item?.id||(crypto.randomUUID?crypto.randomUUID():'reminder-'+Date.now()),title,date,time,notes};
  if(item)deskState.reminders=deskState.reminders.map(r=>r.id===id?reminder:r);else deskState.reminders.push(reminder);
  calendarDate=date;calendarMonth=date.slice(0,7);commitDesk();renderDesk();contentDialog.close();toast(item?'Reminder updated in your personal planner.':'Personal reminder added. No notification or booking was sent.');
 });
 if(item){$('#reminder-download').addEventListener('click',()=>downloadCalendar([item]));$('#reminder-delete').addEventListener('click',()=>{
   $('#reminder-delete').outerHTML='<button type="button" class="delete-link" id="confirm-reminder-delete">Confirm delete</button>';
   $('#confirm-reminder-delete').focus();$('#confirm-reminder-delete').addEventListener('click',()=>{deskState.reminders=deskState.reminders.filter(r=>r.id!==id);commitDesk();renderDesk();contentDialog.close();toast('Reminder deleted.');});
 });}
}
function downloadFile(name,text,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
function icsEscape(s){return String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function foldICS(line){let out='',part='',length=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(length+size>73){out+=part+'\r\n';part=' ';length=1;}part+=char;length+=size;}return out+part;}
function makeCalendar(items){
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MAMSS School Desk//Personal Planner//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 items.forEach(r=>{
  lines.push('BEGIN:VEVENT','UID:'+r.id+'@mamss-school-desk.local','DTSTAMP:'+stamp);
  if(r.time){const utc=new Date(r.date+'T'+r.time+':00+01:00').toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');lines.push('DTSTART:'+utc);}else lines.push('DTSTART;VALUE=DATE:'+r.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+shiftDate(r.date,1).replace(/-/g,''));
  lines.push('SUMMARY:'+icsEscape(r.title),'DESCRIPTION:'+icsEscape('Personal reminder from My school desk. Not a confirmed school booking or official event.\n'+r.notes),'STATUS:TENTATIVE','TRANSP:TRANSPARENT','END:VEVENT');
 });lines.push('END:VCALENDAR');return lines.map(foldICS).join('\r\n')+'\r\n';
}
function downloadCalendar(items=deskState.reminders){if(!items.length){toast('Add a personal reminder before exporting your calendar.');return;}downloadFile('MAMSS-personal-reminders.ics',makeCalendar(items),'text/calendar;charset=utf-8');toast('Calendar file prepared. Import it into your own calendar app.');}
function checklistText(){return`MAMSS — PERSONAL ADMISSION CHECKLIST\nPreferred entry class: ${deskState.entry}\nPrepared: ${dateLabel(lagosToday())}\n\n${deskTaskList.map(([id,title,note])=>`${deskState.tasks.includes(id)?'[x]':'[ ]'} ${title}\n    ${note}`).join('\n\n')}\n\nThis checklist is not an application or a confirmation of admission.\nForms: School administrative office or Parish Bookshop, Mater Misericordiae Catholic Church.\nAddress: No. 2 Arochukwu Street, Rumuomasi, Port Harcourt.\nAdmissions: 0703 789 8216 / 0905 733 3259 / 0810 024 9164\nGeneral enquiries: 0901 365 3629\nEmail: matermesericordiae@gmail.com\nPublished entrance-exam dates in the 2026/2027 flyer have passed; contact the school for current arrangements.\n`;
}
function printChecklist(){
 $('#print-pack').innerHTML=`<h1>Mater Misericordiae Secondary School</h1><h2>Personal admission checklist</h2><p>Preferred entry class: <strong>${deskState.entry}</strong> · Prepared ${dateLabel(lagosToday())}</p><ol>${deskTaskList.map(([id,title,note])=>`<li><strong>${deskState.tasks.includes(id)?'✓':'□'} ${title}</strong><p>${note}</p></li>`).join('')}</ol><h3>Speak with the school</h3><p>No. 2 Arochukwu Street, Rumuomasi, Port Harcourt<br>Admissions: 0703 789 8216 · 0905 733 3259 · 0810 024 9164<br>Email: matermesericordiae@gmail.com</p><p><strong>This is a personal checklist, not an application or a confirmation of admission.</strong> Current availability, documents, fees, and examination dates must be confirmed with the school.</p>`;
 window.print();
}

// Site-wide command search. Search stays in this page, and never reads private portals.
const siteSearchIndex=[
 {title:'My school desk',description:'Personal checklist, calendar, reminders, and saved links.',category:'school',anchor:'school-desk',keywords:'dashboard organiser planner favorites'},
 {title:'Admission procedure',description:'Entry classes, application forms, and the original school flyer.',category:'school',action:'admissions',keywords:'apply admission JSS SS exam'},
 ...resources.map(r=>({title:r.title,description:r.description,category:'resources',href:r.href,action:r.action,keywords:r.label+' '+r.category.join(' ')})),
 ...[['Welcome to MAMSS','about','Meet the school and discover its Catholic foundation.'],['Vision, mission & values','purpose','The principles and values that guide the school.'],['Principal’s welcome','about','A message from Rev. Fr. Obinwa Anthony Chigozie.'],['Academics & learning','learning','Junior and senior secondary learning.'],['School facilities','facilities','ICT, science, art, internet, and school security.'],['Why choose MAMSS?','why-mamss','Academic learning, digital skills, and character.'],['School management team','leadership','Meet the principal, bursar, and vice principals.'],['Photo gallery & school life','school-life','Explore original school photographs.'],['Parent & alumni testimonials','testimonials','Read the voices published by the school.'],['Contact & directions','contact','Address, telephone numbers, email, and Maps directions.']].map(([title,anchor,description])=>({title,anchor,description,category:'school'})),
 {title:'Our history',description:'Request the school’s approved history from the office.',category:'school',action:'history'},
 {title:'School anthem',description:'Official lyrics and audio require school-supplied content.',category:'school',action:'anthem'},
 {title:'Admissions & JAMB announcements',description:'View the original admission and results posters.',category:'news',action:'announcements'},
 {title:'Official working visit',description:'News of the 29 April 2026 visit, published 2 June 2026.',category:'news',newsButton:'visit-news'},
 {title:'PTA notice & published dates',description:'The PTA notice needs year/time confirmation. Published exam dates are past.',category:'news',action:'calendar'},
 {title:'Reading & accessibility',description:'Adjust text size, contrast, and motion preferences.',category:'school',advanced:'accessibility'}
];
const searchDialog=$('#search-dialog');let searchOrigin=null,searchScope='all';
function openSiteSearch(){
 if(contentDialog.open)contentDialog.close();if(lightbox.open)lightbox.close();
 searchOrigin=document.activeElement;searchDialog.showModal();document.body.classList.add('modal-open');stopHeroTimer();$('#global-search').value='';searchScope='all';$$('[data-search-scope]').forEach(b=>{const on=b.dataset.searchScope==='all';b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});renderGlobalSearch();$('#global-search').focus();
}
function renderGlobalSearch(){
 const q=$('#global-search').value.trim().toLowerCase(),terms=q.split(/\s+/).filter(Boolean);
 const matches=siteSearchIndex.map((entry,i)=>({entry,i})).filter(({entry:e})=>(searchScope==='all'||e.category===searchScope)&&terms.every(t=>`${e.title} ${e.description} ${e.keywords||''}`.toLowerCase().includes(t))).sort((a,b)=>Number(b.entry.title.toLowerCase().includes(q))-Number(a.entry.title.toLowerCase().includes(q)));
 const shown=matches.slice(0,10);$('#global-search-status').textContent=q?`${matches.length} ${matches.length===1?'result':'results'}${matches.length>10?' · Showing the first 10. Refine your search for more.':''}`:'Suggested places to start';
 $('#global-search-results').innerHTML=shown.length?shown.map(({entry:e,i})=>`<li>${e.href?`<a href="${e.href}" target="_blank" rel="noopener" class="global-search-result">`:`<button class="global-search-result" data-search-result="${i}">`}<span class="search-result-symbol" aria-hidden="true">${e.category==='resources'?'↗':e.category==='news'?'▤':'↳'}</span><span><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.description)}</small></span><span class="search-category">${e.category==='resources'?'Service':e.category==='news'?'News':'School'}</span>${e.href?'</a>':'</button>'}</li>`).join(''):'<li class="no-search-results"><span aria-hidden="true">⌕</span><h3>No results just yet.</h3><p>Try “admissions”, “results”, “library”, or choose a different category.</p><button class="desk-link" id="reset-global-search">Clear search & categories →</button></li>';
 $('#reset-global-search')?.addEventListener('click',()=>{searchScope='all';$$('[data-search-scope]').forEach(b=>{const on=b.dataset.searchScope==='all';b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});$('#global-search').value='';renderGlobalSearch();$('#global-search').focus();});
}
$('#global-search').addEventListener('input',renderGlobalSearch);$('#close-search').addEventListener('click',()=>searchDialog.close());
$$('[data-search-scope]').forEach(b=>b.addEventListener('click',()=>{searchScope=b.dataset.searchScope;$$('[data-search-scope]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderGlobalSearch();}));
searchDialog.addEventListener('close',()=>{if(!contentDialog.open&&!lightbox.open)document.body.classList.remove('modal-open');if(searchOrigin?.isConnected)searchOrigin.focus();startHeroTimer();});
searchDialog.addEventListener('click',e=>{
 if(e.target===searchDialog){const r=searchDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)searchDialog.close();}
 const result=e.target.closest('[data-search-result]');if(result){const entry=siteSearchIndex[Number(result.dataset.searchResult)];searchDialog.close();if(entry.anchor){const target=document.getElementById(entry.anchor);target.scrollIntoView({behavior:deskState.settings.motion?'instant':'smooth'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}else if(entry.action)featureActions[entry.action]();else if(entry.newsButton)document.getElementById(entry.newsButton).click();else if(entry.advanced)advancedActions[entry.advanced]();}
});
searchDialog.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();searchDialog.close();return;}
 const results=$$('.global-search-result');if(!results.length)return;
 if(e.target.id==='global-search'&&e.key==='Enter'){e.preventDefault();results[0].click();}
 if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const idx=results.indexOf(document.activeElement);if(e.key==='ArrowDown')results[(idx+1)%results.length].focus();else if(idx<=0)$('#global-search').focus();else results[idx-1].focus();}
});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(searchDialog.open)searchDialog.close();else openSiteSearch();}else if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.matches('input,textarea,select,[contenteditable="true"]')&&!contentDialog.open&&!lightbox.open){e.preventDefault();openSiteSearch();}});

// Reading controls and an explicit device-storage consent flow.
function showAccessibility(){
 showDialog(`<p class="eyebrow">MAKE YOURSELF COMFORTABLE</p><h2>A website that<br><em>reads your way.</em></h2><p>Adjust reading comfort for this visit. Preferences are remembered only if device saving is enabled.</p><fieldset class="access-fieldset"><legend>Body text size</legend><div class="text-size-options">${[['standard','Standard','Aa'],['large','Large','Aa'],['larger','Extra large','Aa']].map(([id,label,icon])=>`<label><input type="radio" name="text-size" value="${id}" ${deskState.settings.text===id?'checked':''}><span class="text-size-demo ${id}">${icon}</span><strong>${label}</strong></label>`).join('')}</div></fieldset><label class="settings-toggle"><span><b>Higher contrast</b><small>Stronger text and boundaries on light surfaces.</small></span><input id="setting-contrast" type="checkbox" ${deskState.settings.contrast?'checked':''}></label><label class="settings-toggle"><span><b>Reduce motion</b><small>Remove transitions, smooth scrolling, and slideshow playback.</small></span><input id="setting-motion" type="checkbox" ${deskState.settings.motion?'checked':''}></label><label class="settings-toggle"><span><b>3D scroll effects</b><small>Layered photos, perspective reveals, and gentle card tilt. Automatically paused when reduced motion is active.</small></span><input id="setting-depth" type="checkbox" ${deskState.settings.depth!==false?'checked':''}></label><div class="reading-preview"><span>READING PREVIEW</span><p>Great minds. Good hearts. Brighter futures. Every child deserves space to learn, belong, and become.</p></div><div class="action-row"><button class="button light" id="reset-accessibility">Reset reading settings</button><button class="text-link" data-advanced="device-settings">Device & privacy settings ↗</button></div><p class="small-note">Your browser’s zoom and built-in screen reader controls remain available. Use Ctrl / ⌘ K to search, and Escape to close dialogs.</p>`);
 $$('[name="text-size"]').forEach(r=>r.addEventListener('change',()=>{deskState.settings.text=r.value;applyReadingSettings();commitDesk();}));
 $('#setting-contrast').addEventListener('change',e=>{deskState.settings.contrast=e.target.checked;applyReadingSettings();commitDesk();});
 $('#setting-depth').addEventListener('change',e=>{deskState.settings.depth=e.target.checked;applyReadingSettings();commitDesk();});
 $('#setting-motion').addEventListener('change',e=>{deskState.settings.motion=e.target.checked;applyReadingSettings();commitDesk();});
 $('#reset-accessibility').addEventListener('click',()=>{deskState.settings=initialDesk().settings;applyReadingSettings();commitDesk();showAccessibility();toast('Reading preferences reset.');});
}
function showDeviceSettings(){
 showDialog(`<p class="eyebrow">YOUR DEVICE. YOUR CHOICE.</p><h2>A little convenience.<br><em>Always in your control.</em></h2><p>By default, your school desk lasts only for this visit. You can choose to remember your role, entry class, checklist, saved links, reminders, and reading preferences in this browser.</p><label class="settings-toggle"><span><b>Remember my desk on this device</b><small>${deskState.consent?'Enabled: no cloud sync or school access.':'Off: changes are kept only while this page is open.'}</small></span><input id="device-saving-toggle" type="checkbox" ${deskState.consent?'checked':''}></label><p class="notice">Use device saving only on a device you trust. Browser storage is not encrypted by this website. Do not add student records, passwords, access PINs, or sensitive information.</p><h3>Back up your personal desk</h3><p>Export your own checklist, favourites, reminders, and reading preferences. Importing a backup replaces the current desk only after confirmation.</p><div class="action-row"><button class="button light" id="export-desk">Export backup ↓</button><label class="file-import-label">Choose backup<input type="file" id="import-desk" accept=".json,application/json"></label></div><div id="import-review"></div><p class="form-error" id="device-error" role="alert"></p><h3>Start fresh</h3><p>Clear this desk, browser-saved preferences, and any offline copy installed by this site. This does not change your official school accounts.</p><button class="delete-link" id="clear-device-data">Clear my desk & offline data</button><div id="clear-data-confirmation"></div><p class="small-note">Contact email drafts are not saved. The school and portal providers cannot see your personal desk.</p>`);
 $('#device-saving-toggle').addEventListener('change',e=>{if(e.target.checked){if(!enableDeviceSaving())e.target.checked=false;}else{deskState.consent=false;try{localStorage.removeItem(DESK_KEY);}catch{}updateDeskChrome();toast('Device saving turned off. Current changes remain for this visit only.');}e.target.closest('.settings-toggle').querySelector('small').textContent=deskState.consent?'Enabled: no cloud sync or school access.':'Off: changes are kept only while this page is open.';});
 $('#export-desk').addEventListener('click',()=>{downloadFile('MAMSS-school-desk-backup.json',JSON.stringify({...deskState,consent:false},null,2),'application/json');toast('Backup prepared. Keep this personal file private.');});
 const importError=$('#device-error'),importReview=$('#import-review');let importVersion=0;
 $('#import-desk').addEventListener('change',async e=>{
  const version=++importVersion;importError.textContent='';importReview.innerHTML='';const file=e.target.files[0];if(!file)return;
  try{if(file.size>150000)throw Error('This file is too large. Choose a School Desk JSON backup under 150 KB.');const parsed=validateDesk(JSON.parse(await file.text()));if(version!==importVersion)return;importReview.innerHTML=`<div class="import-summary"><h3>Ready to restore?</h3><p>${parsed.tasks.length} checklist steps · ${parsed.favorites.length} saved resources · ${parsed.reminders.length} reminders</p><p>This replaces your current desk. Device-saving consent will not be changed.</p><button class="button" id="confirm-import">Replace my desk with this backup</button></div>`;
   $('#confirm-import',importReview).addEventListener('click',()=>{const consent=deskState.consent;deskState={...parsed,consent};applyReadingSettings();commitDesk();renderDesk();contentDialog.close();toast('Your personal desk has been restored.');});
  }catch(error){if(version!==importVersion)return;importError.textContent=error instanceof SyntaxError?'This file is not valid JSON. No data was changed.':error.message;}
 });
 $('#clear-device-data').addEventListener('click',()=>{
  $('#clear-data-confirmation').innerHTML='<div class="import-summary"><p><strong>Delete your personal desk from this browser?</strong> This cannot be undone unless you have a backup.</p><button class="button" id="confirm-clear">Yes, clear my local data</button></div>';
  $('#confirm-clear').focus();$('#confirm-clear').addEventListener('click',async()=>{try{localStorage.removeItem(DESK_KEY);}catch{}deskState=initialDesk();applyReadingSettings();commitDesk();renderDesk();await removeOfflineCopy();contentDialog.close();toast('Your desk and available offline site data have been cleared.');});
 });
}
window.addEventListener('storage',e=>{if(e.key!==DESK_KEY)return;try{deskState=e.newValue?validateDesk(JSON.parse(e.newValue)):initialDesk();applyReadingSettings();updateDeskChrome();renderDesk();syncFavoriteButtons();}catch{/* Ignore invalid external data. */}});

// Opt-in offline shell: public, same-origin assets only. Never private school portals.
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;toast('MAMSS has been added to your device.');});
const offlineSupported=()=>('serviceWorker' in navigator)&&window.isSecureContext&&['http:','https:'].includes(location.protocol);
async function removeOfflineCopy(){
 try{if('serviceWorker' in navigator){for(const reg of await navigator.serviceWorker.getRegistrations()){const worker=reg.active||reg.waiting||reg.installing;if(worker?.scriptURL===new URL('sw.js',location.href).href){worker.postMessage({type:'DISABLE_OFFLINE'});await reg.unregister();}}}if('caches' in window){for(const key of await caches.keys())if(key.startsWith('mamss-public-'))await caches.delete(key);}}catch{/* Storage may not be available in sandboxed file previews. */}
}
function showOfflineTools(){
 const supported=offlineSupported();
 showDialog(`<p class="eyebrow">A LITTLE CLOSER, EVEN OFFLINE</p><h2>Keep your school<br><em>within reach.</em></h2><p>Save the public website on this device for future offline visits. This stores website files, not student records or portal credentials.</p><div class="offline-feature-list"><div><b>Available offline after saving</b><p>Public school information, local search, checklist, saved link labels, and personal planner. Previously loaded photos may also be available.</p></div><div><b>Still needs internet</b><p>Results, CBT, e-library, logins, official complaint submissions, WhatsApp, email delivery, and external websites.</p></div></div>${supported?'<button class="button" id="enable-offline">Enable offline website <span>↓</span></button>':'<p class="notice">Offline installation requires the hosted website over HTTPS (or localhost for development). It is not available in this restricted file preview. The downloadable HTML already contains the public site for offline viewing.</p>'}<p id="offline-status" class="form-status" role="status"></p><h3>Add the website to your device</h3><p>${deferredInstallPrompt?'Your browser supports installation. Use the button below to add MAMSS to your home screen.':'On a compatible browser, use its “Install app” or “Add to Home Screen” option. Availability depends on your browser and how the site is opened.'}</p>${deferredInstallPrompt?'<button class="button light" id="install-website">Install MAMSS ↗</button>':''}<p class="small-note">Offline storage is separate from saving your desk. To remove both, use Device & privacy settings.</p><button class="text-link" data-advanced="device-settings">Manage device data ↗</button>`);
 $('#enable-offline')?.addEventListener('click',async()=>{
  const button=$('#enable-offline'),status=$('#offline-status');button.disabled=true;status.textContent='Saving the public website for offline use…';
  try{await navigator.serviceWorker.register('sw.js',{scope:'./'});await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Saving took too long. Please try again with a working connection.')),20000))]);status.textContent='Offline website ready. Reopen this same website address to use the saved copy. External school services still need internet.';button.textContent='Offline website enabled ✓';}
  catch(error){status.textContent='Could not save the offline website. '+error.message;button.disabled=false;}
 });
 $('#install-website')?.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;const status=$('#offline-status');await deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;status.textContent=choice.outcome==='accepted'?'Installation requested. Your browser will complete the setup.':'Installation cancelled. You can continue using the website normally.';});
}
const advancedActions={search:openSiteSearch,accessibility:showAccessibility,'device-settings':showDeviceSettings,'add-reminder':()=>showReminderEditor(),'export-calendar':()=>downloadCalendar(),'print-checklist':printChecklist,'download-checklist':()=>downloadFile('MAMSS-admission-checklist.txt',checklistText(),'text/plain;charset=utf-8'),offline:showOfflineTools};
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-advanced]');if(button&&advancedActions[button.dataset.advanced]){if(searchDialog.open)searchDialog.close();advancedActions[button.dataset.advanced]();}
 const save=e.target.closest('[data-save-resource]');if(save){const key=save.dataset.saveResource;toggleFavorite(key);if(!save.isConnected){const replacement=$(`[data-save-resource="${key}"]`,$('#desk-panel'));if(replacement)replacement.focus();else $('#desk-tab-saved').focus();}}
 const reminder=e.target.closest('[data-reminder]');if(reminder)showReminderEditor(reminder.dataset.reminder);
});

// Non-obtrusive page orientation and a reduced-motion-aware back-to-top control.
let scrollFrame=false;
function updateReadingProgress(){const max=document.documentElement.scrollHeight-innerHeight;$('#reading-progress-bar').style.width=(max>0?Math.min(scrollY/max*100,100):0)+'%';$('#back-top').hidden=scrollY<1000;}
window.addEventListener('scroll',()=>{if(!scrollFrame){scrollFrame=true;requestAnimationFrame(()=>{updateReadingProgress();scrollFrame=false;});}},{passive:true});
$('#back-top').addEventListener('click',()=>{window.scrollTo({top:0,behavior:deskState.settings.motion?'instant':'smooth'});$('.brand').focus({preventScroll:true});});
updateReadingProgress();

// Keep the privacy notice aligned with the newly added opt-in local tools.
const existingPrivacyButton=$('#privacy-button');
const updatedPrivacyButton=existingPrivacyButton.cloneNode(true);existingPrivacyButton.replaceWith(updatedPrivacyButton);
updatedPrivacyButton.addEventListener('click',()=>showDialog(`<p class="eyebrow">WEBSITE & PRIVACY INFORMATION</p><h2>Thoughtful tools.<br><em>Clear boundaries.</em></h2><p>This is a redesigned public-facing school website with links to the original school systems and MAMSS Prep. The original school website and private portals remain separate.</p><h3>Personal school desk</h3><p>By default, favourites, checklists, reminders, and reading preferences last only for this visit. If you explicitly enable device saving, these are kept in this browser’s local storage. There is no cloud synchronisation, no analytics, and no school access to this local desk. Browser storage is not encrypted by this website.</p><p>Do not store passwords, access PINs, medical information, or student records. You can export, import, or clear your own data in Device & privacy settings. A reminder does not send a notification or book an appointment.</p><h3>Contact and search</h3><p>Site-wide search works in this page without sending your query anywhere. Contact forms prepare an email draft; sending it happens in your own email app. Drafts are not saved by the desk.</p><h3>Offline access</h3><p>Offline saving is optional and stores public, same-origin website files. External result portals, CBT, library logins, and school accounts are not cached by this site and still require internet access.</p><h3>External services</h3><p>School portals, result checking, CBT, the library, and the official complaint form open on existing school/provider websites. We do not collect their passwords or PINs. Maps, Facebook, WhatsApp, calling, and email services have their own privacy practices.</p><h3>Before publication</h3><p>The school must approve public information, photo permissions, external links, and privacy wording and during ongoing maintenance. Missing original content is labelled rather than invented. Published statistics and testimonials are not independently verified.</p><div class="action-row"><button class="button" data-advanced="device-settings">Manage my device data <span>↗</span></button><button class="button light" data-advanced="accessibility">Reading controls</button></div>`));

const RESPONSIVE_IMAGES={"mamss_teacher": {"widths": [480, 900], "original": 1024}, "visit020": {"widths": [480, 900], "original": 1371}, "visit031": {"widths": [480, 900], "original": 1371}, "visit035": {"widths": [480, 900], "original": 1371}, "visit001": {"widths": [480, 900], "original": 1371}, "a1": {"widths": [480, 900], "original": 1500}, "a2": {"widths": [480, 900], "original": 1500}, "mamss_students": {"widths": [480, 900], "original": 1800}, "visit005": {"widths": [480, 900], "original": 1371}, "mater_class": {"widths": [480, 900], "original": 1024}, "mater_students2": {"widths": [480, 900], "original": 1024}, "mater_students_portharcourt": {"widths": [480, 900], "original": 1500}, "mater_misericordiae_boys_portharcourt_city": {"widths": [480], "original": 876}, "mamssads2027": {"widths": [480], "original": 875}, "mamssjamb2026x": {"widths": [480], "original": 800}};

function enhanceImage(img){
 if(!img||img.tagName!=='IMG')return;
 const src=img.getAttribute('src')||'';
 // Standalone embedded previews already contain their original images.
 if(src.startsWith('data:'))return;
 const stem=src.split('/').pop()?.replace(/\.webp$/,'');const spec=RESPONSIVE_IMAGES[stem];
 if(img.dataset.responsiveFor===src)return;
 img.dataset.responsiveFor=src;
 // A photo with no generated variants must not keep the previous photo's srcset:
 // srcset outranks src, so a stale one leaves the old picture on screen.
 if(!spec){img.removeAttribute('srcset');img.removeAttribute('sizes');img.decoding='async';return;}
 img.srcset=spec.widths.map(w=>`assets/${stem}--${w}.webp ${w}w`).concat(`${src} ${spec.original}w`).join(', ');
 img.sizes=img.classList.contains('hero-photo')?'(max-width: 600px) calc(100vw - 50px), (max-width: 900px) 46vw, 48vw':img.closest('dialog')?'(max-width: 740px) 85vw, 650px':'(max-width: 600px) calc(100vw - 40px), (max-width: 900px) 45vw, 33vw';
 img.decoding='async';
}
$$('img').forEach(enhanceImage);
const responsiveObserver=new MutationObserver(changes=>changes.forEach(change=>{
 if(change.type==='attributes')enhanceImage(change.target);
 else change.addedNodes.forEach(node=>{if(node.nodeType===1){enhanceImage(node);node.querySelectorAll?.('img').forEach(enhanceImage);}});
}));
responsiveObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
