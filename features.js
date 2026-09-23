// Additional original-site features. Authentication stays on the official systems.
const schoolLinks = {
  prep:'https://merebari7-web.github.io/mamss-prep/',
  homepage:'https://schoolsnigeria.com.ng/mamss/',
  results:'https://myschoolz-001-site16.rtempurl.com/Mater_Misericordiae/result-verify.aspx',
  alternateResults:'https://myschoolz-001-site16.rtempurl.com/materresults/',
  portal:'https://myschoolz-001-site16.rtempurl.com/Mater_Misericordiae/',
  cbt:'https://schools.sch.ng/mamsscbt/Y1/',
  student:'https://schools.sch.ng/mamsscbt/Y1/login.php',
  cbtAdmin:'https://schools.sch.ng/mamsscbt/Y1/admin_login.php',
  examiner:'https://schools.sch.ng/mamsscbt/Y1/teacher_login.php',
  library:'https://schoolsnigeria.com.ng/mamss/elibrary/',
  libraryLogin:'https://schoolsnigeria.com.ng/mamss/elibrary/login.php',
  admin:'https://schoolsnigeria.com.ng/mamss/site/login',
  user:'https://schoolsnigeria.com.ng/mamss/site/userlogin',
  forgot:'https://schoolsnigeria.com.ng/mamss/site/ufpassword',
  news:'https://schoolsnigeria.com.ng/mamss/page/gallery',
  complain:'https://schoolsnigeria.com.ng/mamss/page/complain',
  pta:'https://schoolsnigeria.com.ng/mamss/read/pta-meetings-comrs-up-on-the-6th-of-oct',
  facebook:'https://web.facebook.com/people/Mater-Misericordiae-Secondary-School-Rumuomasi/61580678905446'
};
const externalLink=(url,label,cls='button')=>`<a class="${cls}" href="${url}" target="_blank" rel="noopener">${label} <span aria-hidden="true">↗</span></a>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Click-operated dropdowns support keyboard and touch, with only one open at a time.
$$('.nav-dropdown').forEach(drop=>{
 drop.addEventListener('toggle',()=>{if(drop.open)$$('.nav-dropdown').filter(d=>d!==drop).forEach(d=>d.open=false);});
 $$('a,button',drop).forEach(item=>item.addEventListener('click',()=>{drop.open=false;closeMenu();}));
});
document.addEventListener('click',e=>{if(!e.target.closest('.nav-dropdown'))$$('.nav-dropdown').forEach(d=>d.open=false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.nav-dropdown').forEach(d=>d.open=false);});

// Original school banner photographs, with explicit playback controls.
const heroSlides=[
 ['visit035','MAMSS students gathered during a school visit','A place to belong.','A future to believe in.'],
 ['a2','MAMSS students and staff in a school group photograph','Excellence in education.','Where futures shine.'],
 ['visit020','Members of the clergy visiting MAMSS','Rooted in our faith.','United in our purpose.'],
 ['mamss_students','The MAMSS school marching band','Discover your gifts.','Find your own rhythm.'],
 ['visit031','A student welcomes a member of the visiting clergy','Compassion in action.','Character for life.'],
 ['visit001','The school community welcomes visiting clergy','A community of welcome.','A culture of care.'],
 ['mamss_teacher','MAMSS teaching staff pictured together','Guidance that matters.','Learning that inspires.'],
 ['visit005','A school visit and presentation in a classroom','Sharing knowledge.','Building tomorrow.'],
 ['mater_class','MAMSS students taking part in a classroom lesson','Curious minds.','Confident learners.'],
 ['mater_students_portharcourt','Students in the MAMSS school grounds','Our school. Our story.','Our shared tomorrow.'],
 ['mater_students2','MAMSS students at a school celebration','Moments of joy.','Memories for life.'],
 ['a1','A group photograph of MAMSS staff and students','Nurturing great minds.','Inspiring bright futures.']
];
const originalSlogans=['EXCELLENCE IN EDUCATION.','WHERE FUTURES SHINE.','EMPOWERING NEXT-GEN LEADERS.','INNOVATION & BRILLIANCE.','YOUR JOURNEY BEGINS HERE.','FOSTERING MORAL VALUES.','NURTURING GREAT MINDS.','CHARACTER, KNOWLEDGE, SUCCESS.','BUILDING TOMORROW’S INNOVATORS.','STRIVING FOR ACADEMIC PERFECTION.','INSPIRING A LOVE FOR LEARNING.','SHAPING DESTINIES DAILY.','INTEGRITY IN EVERY ACTION.','A TRADITION OF EXCELLENCE.','DISCOVER YOUR TRUE POTENTIAL.'];
let heroIndex=0,heroTimer=null,heroPlaying=false,sloganIndex=0;
function changeHero(direction){
 heroIndex=(heroIndex+direction+heroSlides.length)%heroSlides.length;
 const [file,alt,title,subtitle]=heroSlides[heroIndex];
 $('.hero-photo').src=localPhoto(file);$('.hero-photo').alt=alt;
 $('.photo-caption>span').innerHTML=`${title}<br><em>${subtitle}</em>`;
 $('.photo-label').innerHTML=`<span class="live-dot"></span>${originalSlogans[sloganIndex++%originalSlogans.length]}`;
 $('#hero-slide-count').textContent=`${String(heroIndex+1).padStart(2,'0')} / ${heroSlides.length}`;
}
function stopHeroTimer(){if(heroTimer)clearInterval(heroTimer);heroTimer=null;}
function startHeroTimer(){stopHeroTimer();if(heroPlaying&&(!window.MAMSS||MAMSS.current==='home')&&!document.hidden&&!contentDialog.open&&!lightbox.open)heroTimer=setInterval(()=>changeHero(1),6000);}
if($('#hero-previous')&&$('.hero-visual')){
$('#hero-previous').addEventListener('click',()=>{changeHero(-1);startHeroTimer();});
$('#hero-next').addEventListener('click',()=>{changeHero(1);startHeroTimer();});
$('#hero-play').addEventListener('click',()=>{
 heroPlaying=!heroPlaying;$('#hero-play').textContent=heroPlaying?'Pause Ⅱ':'Play ▷';
 $('#hero-play').setAttribute('aria-pressed',String(heroPlaying));$('#hero-play').setAttribute('aria-label',heroPlaying?'Pause school photo slideshow':'Play school photo slideshow');
 heroPlaying?startHeroTimer():stopHeroTimer();
});
$('.hero-visual').addEventListener('mouseenter',stopHeroTimer);$('.hero-visual').addEventListener('mouseleave',startHeroTimer);
$('.hero-visual').addEventListener('focusin',stopHeroTimer);$('.hero-visual').addEventListener('focusout',()=>setTimeout(()=>{if(!$('.hero-visual').contains(document.activeElement))startHeroTimer();},0));
}
document.addEventListener('visibilitychange',()=>document.hidden?stopHeroTimer():startHeroTimer());
$$('dialog').forEach(d=>new MutationObserver(()=>{d.open?stopHeroTimer():startHeroTimer();}).observe(d,{attributes:true,attributeFilter:['open']}));

// Retain every unique original banner photograph in the filterable gallery.
photos.push(
 {file:'mater_misericordiae_boys_portharcourt_city',alt:'Three MAMSS male students with their books',caption:'Excellence in character and learning',category:'learning'},
 {file:'visit020',alt:'Clergy during the official school visit',caption:'A visit to remember',category:'community'},
 {file:'visit031',alt:'A MAMSS student welcoming a visitor',caption:'A warm MAMSS welcome',category:'community'},
 {file:'visit001',alt:'Members of the school community welcoming clergy',caption:'Together in faith',category:'community'},
 {file:'mamss_teacher',alt:'MAMSS teaching staff gathered together',caption:'The people behind the learning',category:'community'},
 {file:'visit035',alt:'MAMSS students gathered in the school courtyard',caption:'Our shared school community',category:'community'},
 {file:'visit005',alt:'A school presentation in a classroom',caption:'Learning through shared experiences',category:'learning'},
 {file:'mater_students_portharcourt',alt:'MAMSS students outdoors in the school grounds',caption:'Everyday life at MAMSS',category:'activities'},
 {file:'a1',alt:'MAMSS students and staff in a group photograph',caption:'Growing together',category:'community'}
);
renderGallery();

const facilityData={
 ict:{eyebrow:'INFORMATION & COMMUNICATION TECHNOLOGY',title:'Skills for a digital world.',text:'The original school website describes the ICT laboratory as a technological hub that bridges theoretical knowledge and practical digital skills. The school also highlights ICT and coding training as part of its approach to learning.',items:['Practical digital literacy','Information and communication technology','Preparation for a technology-driven world']},
 science:{eyebrow:'SCIENCE & VISUAL ARTS',title:'Turn questions into discoveries.',text:'The school describes its laboratories as activity centres where theories from textbooks are put into practice. Physics, Chemistry, Biology, and visual arts facilities support practical learning and preparation for WAEC and NECO requirements.',items:['Physics, Chemistry & Biology','Science and visual arts facilities','Practical learning alongside classroom study']},
 connectivity:{eyebrow:'CONNECTED LEARNING & CAMPUS SAFETY',title:'A connected school community.',text:'The school’s original website describes continuous internet connectivity and 24/7 CCTV monitoring of corridors, laboratories, and school grounds. Contact the school to confirm current access, coverage, and safeguarding arrangements.',items:['Internet-supported learning','Campus security camera monitoring','Ask about current school safety policies']},
 students:{eyebrow:'THE MAMSS STUDENT EXPERIENCE',title:'Knowledge. Character. Community.',text:'MAMSS describes a student culture that balances academic rigour with Catholic values. Discipline, moral uprightness, and a commitment to excellence sit alongside learning and shared school experiences.',items:['A Catholic-centred environment','Character formation and discipline','A community of learners and friends']}
};
function selectFacility(key,focus=false){
 const x=facilityData[key];if(!x||!$('#facility-panel'))return;$$('[data-facility]').forEach(b=>{const active=b.dataset.facility===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});
 $('#facility-panel').setAttribute('aria-labelledby',`tab-${key}`);
 $('#facility-panel').innerHTML=`<p class="eyebrow">${x.eyebrow}</p><h3>${x.title}</h3><p>${x.text}</p><ul>${x.items.map(t=>`<li>${t}</li>`).join('')}</ul><button class="button" data-action="admissions">Apply & join our school <span>↗</span></button>`;
}
$$('[data-facility]').forEach((b,i)=>{
 b.addEventListener('click',()=>selectFacility(b.dataset.facility));
 b.addEventListener('keydown',e=>{const keys=Object.keys(facilityData);let next;if(['ArrowDown','ArrowRight'].includes(e.key))next=(i+1)%4;else if(['ArrowUp','ArrowLeft'].includes(e.key))next=(i+3)%4;else if(e.key==='Home')next=0;else if(e.key==='End')next=3;if(next!==undefined){e.preventDefault();selectFacility(keys[next],true);}});
});
selectFacility('ict');

const testimonials=[
 {name:'Mrs. Chinyere O.',role:'Parent',quote:'MAMSS is truly a home away from home for our children. I chose this school because of its strong Catholic foundation, and I have seen my daughter grow into a highly disciplined and morally upright young lady. The 24-hour CCTV surveillance gives me total peace of mind.'},
 {name:'Engr. C. Taye',role:'Parent',quote:'The academic transformation in my son has been remarkable. The school’s focus on Digital Mastery is real—he is already learning practical coding and ICT skills. With 24/7 internet and constant power, he has everything he needs to excel.'},
 {name:'Dr. Tunde W.',role:'Alumnus',quote:'The rigorous preparation I received in the MAMSS science laboratories gave me the practical edge I needed for Medical School. The motto \'Service to God and Humanity\' remains my guiding principle today.'},
 {name:'Samuel O.',role:'Ex-parent',quote:'My children graduated from MAMSS with flying colors. I am a proud member of this school community and highly recommend their disciplined approach to modern education.'}
];
let testimonialIndex=0;
function renderTestimonials(){
 if(!$('#testimonial-cards'))return;
 $('#testimonial-cards').innerHTML=[testimonials[testimonialIndex],testimonials[(testimonialIndex+1)%4]].map(t=>`<article><span class="quote-mark" aria-hidden="true">“</span><blockquote>${escapeHtml(t.quote)}</blockquote><div class="testimonial-person"><img src="${localPhoto('testimonial-avatar')}" alt="" width="42" height="42"><div><b>${t.name}</b><span>${t.role}</span></div></div></article>`).join('');
 $('#testimonial-count').textContent=`${String(testimonialIndex+1).padStart(2,'0')} / 04`;
}
if($('#testimonial-cards')){
$('#testimonial-previous').addEventListener('click',()=>{testimonialIndex=(testimonialIndex+3)%4;renderTestimonials();});
$('#testimonial-next').addEventListener('click',()=>{testimonialIndex=(testimonialIndex+1)%4;renderTestimonials();});
}renderTestimonials();

const resources=[
 {title:'MAMSS Prep',description:'Senior-secondary study resources, practice questions, and a CBT hall. Open the linked MAMSS Prep website in a new tab.',category:['students','parents','staff'],label:'EXAM PREPARATION',href:schoolLinks.prep,linkLabel:'Open MAMSS Prep'},
 {title:'Check student results',description:'Use the school’s result verification portal with your academic details and secure access credential.',category:['students','parents'],label:'RESULTS',href:schoolLinks.results},
 {title:'CBT student login',description:'Sign in to the school’s computer-based testing system with your existing student account.',category:['students'],label:'COMPUTER-BASED TESTING',href:schoolLinks.student},
 {title:'Choose your CBT class',description:'Open the official class selector for JSS 1–3 and SS 1–3 before signing in.',category:['students'],label:'COMPUTER-BASED TESTING',href:schoolLinks.cbt},
 {title:'Digital e-library',description:'Visit the school’s digital library gateway. Learning materials require authorised school access.',category:['students','parents','staff'],label:'LEARNING RESOURCES',action:'library'},
 {title:'School portal login',description:'Open the existing school management portal. Use the account and access level issued by the school.',category:['staff'],label:'SCHOOL MANAGEMENT',href:schoolLinks.portal},
 {title:'CBT admin login',description:'Authorised administrators can manage the existing examination system on the official CBT site.',category:['staff'],label:'ADMINISTRATION',href:schoolLinks.cbtAdmin},
 {title:'CBT examiner / staff login',description:'The staff login linked from the official CBT class selection page.',category:['staff'],label:'EXAMINERS & TEACHERS',href:schoolLinks.examiner},
 {title:'Website admin login',description:'Authorised school website administrators can sign in to the original management system.',category:['staff'],label:'WEBSITE MANAGEMENT',href:schoolLinks.admin},
 {title:'School user login',description:'Open the original school user sign-in page or use its password recovery option.',category:['students','parents'],label:'EXISTING SCHOOL ACCOUNTS',action:'user-login'},
 {title:'Newsletters',description:'Find out how to request the latest parent newsletter from the school office.',category:['parents'],label:'PARENT COMMUNICATIONS',action:'newsletters'},
 {title:'School calendar',description:'Review published admission dates and the PTA notice, with confirmation guidance.',category:['parents','students'],label:'DATES & NOTICES',action:'calendar'},
 {title:'Holiday assignments',description:'Visit the source resource page or ask the school for the current assignment for your class.',category:['students','parents'],label:'LEARNING AT HOME',action:'assignments'},
 {title:'Submit a contact form',description:'Prepare an enquiry addressed to the school’s published email account.',category:['parents','students'],label:'GET IN TOUCH',action:'contact-form'},
 {title:'Complaints & feedback',description:'Use the school’s original complaint form, or prepare feedback for the school office.',category:['parents','students','staff'],label:'WE ARE LISTENING',action:'complaints'},
 {title:'News & events archive',description:'Open the original school gallery and notice archive, including the working visit and PTA notice.',category:['parents','students','staff'],label:'FROM OUR COMMUNITY',href:schoolLinks.news},
 {title:'Alternative result link',description:'The additional results access link published in the original site footer. Ask the office which portal applies to you.',category:['parents','students'],label:'ORIGINAL FOOTER LINK',href:schoolLinks.alternateResults}
];
let resourceFilter='all';
function renderResources(){
 if(!$('#resource-search'))return;
 const query=$('#resource-search').value.trim().toLowerCase();
 const matches=resources.filter(r=>(resourceFilter==='all'||r.category.includes(resourceFilter))&&`${r.title} ${r.description} ${r.label}`.toLowerCase().includes(query));
 $('#resource-status').textContent=`${matches.length} ${matches.length===1?'resource':'resources'}${query?' matching your search':''}`;
 $('#resource-grid').innerHTML=matches.length?matches.map(r=>`<article class="resource-card"><span>${r.label}</span><h3>${r.title}</h3><p>${r.description}</p>${r.href?externalLink(r.href,r.linkLabel||'Open official service','text-link'):`<button class="text-link" data-action="${r.action}">View details <span>↗</span></button>`}</article>`).join(''):`<div class="resource-empty"><h3>No matching resources</h3><p>Try “results”, “CBT”, “library”, or clear your search to see all resources.</p><button class="text-link" data-action="clear-search">Clear search & filters <span>↗</span></button></div>`;
}
$$('[data-resource-filter]').forEach(b=>b.addEventListener('click',()=>{resourceFilter=b.dataset.resourceFilter;$$('[data-resource-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderResources();}));
const resourceSearch=$('#resource-search');if(resourceSearch)resourceSearch.addEventListener('input',renderResources);renderResources();

function unavailableResource(kind){
 const details={history:['OUR HISTORY','Our story. Our heritage.','The original website includes an “Our History” menu item, but it links back to the homepage and does not publish a history article.','Ask the school for its approved history, founding date, and key milestones.'],anthem:['OUR SCHOOL ANTHEM','A voice for our community.','The original website includes a “School Anthem” menu item, but does not provide anthem lyrics or an audio recording at that link.','Ask the school for the official lyrics or an approved recording.'],newsletters:['PARENT NEWSLETTERS','Stay close to school life.','The original “Newsletters” links lead to the homepage or an empty anchor. No downloadable newsletter was available at those links when reviewed.','Ask the school office for the latest newsletter and how parents receive future editions.'],assignments:['HOLIDAY ASSIGNMENTS','Keep your learning growing.','The original footer’s “Holiday Assignments” link opens the school gallery. That page currently displays school news rather than downloadable class assignments.','Contact your class teacher or the school office to request the current assignment for your class.']}[kind];
 showDialog(`<p class="eyebrow">${details[0]}</p><h2>${details[1]}</h2><p>${details[2]}</p><p class="notice"><strong>School confirmation needed.</strong> ${details[3]} We have not invented or substituted school documents.</p><div class="action-row"><a class="button" href="mailto:matermesericordiae@gmail.com?subject=${encodeURIComponent('Request: '+details[0])}">Email the school <span>↗</span></a>${externalLink(kind==='assignments'?schoolLinks.news:schoolLinks.homepage,'View original source','button light')}</div>`);
}
function showCalendar(){
 showDialog(`<p class="eyebrow">PARENT RESOURCES · SCHOOL CALENDAR</p><h2>Important dates.<br><em>Clear information.</em></h2><p>The original calendar menu links to the homepage, so a full term calendar is not published there. Below are the dates available in the school’s notices.</p><div class="calendar-notice"><span class="date-block"><b>06</b>OCT</span><div><h3>PTA meeting notice</h3><p>The source notice mentions 6 October but does not state a year, time, or venue. Please confirm with the school before making plans.</p>${externalLink(schoolLinks.pta,'Read original notice','source-link')}</div></div><h3>Published entrance examinations</h3><p class="small-note">2026/2027 admission flyer · all dates below have passed as of 20 September 2026.</p><div class="date-table"><table><thead><tr><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Status</th></tr></thead><tbody>${['30 May 2026','25 July 2026','29 August 2026','12 September 2026'].map(d=>`<tr><td>${d}</td><td>10:00 AM</td><td>Past date</td></tr>`).join('')}</tbody></table></div><p class="notice">Call the office for the current term calendar, additional entrance examination dates, and confirmed PTA arrangements.</p><a class="button" href="tel:+2349013653629">Confirm dates with the school <span>↗</span></a>`);
}
function showAnnouncements(){
 showDialog(`<p class="eyebrow">THE SCHOOL NOTICEBOARD</p><h2>Announcements<br><em>& achievements.</em></h2><div class="notice-tabs" role="group" aria-label="Choose announcement"><button class="active" data-poster="admissions" aria-pressed="true">2026 / 2027 admissions</button><button data-poster="results" aria-pressed="false">2026 JAMB achievers</button></div><div id="poster-content"></div><div class="notice-links"><button class="text-link" data-action="calendar">PTA & published dates <span>↗</span></button><button class="text-link" data-action="admissions">Admission procedure <span>↗</span></button></div>`);
 const posters={admissions:['mamssads2027','MAMSS 2026/2027 admission flyer','The published examination dates have passed. Contact the school for current availability and any additional examination dates.'],results:['mamssjamb2026x','MAMSS 2026 JAMB top scorers flyer','Celebrating the scores published by the school for the 2026 JAMB examination.']};
 function poster(k){const [file,alt,note]=posters[k];$('#poster-content').innerHTML=`<p class="notice">${note}</p><img src="${localPhoto(file)}" alt="${alt}"><a class="button" href="${localPhoto(file)}" download="${file}.webp">Download original flyer <span>↓</span></a>`;$$('[data-poster]').forEach(b=>{const active=b.dataset.poster===k;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
 $$('[data-poster]').forEach(b=>b.addEventListener('click',()=>poster(b.dataset.poster)));poster('admissions');
}
function showLibrary(){showDialog(`<p class="eyebrow">KNOWLEDGE IS POWER</p><h2>Your digital<br><em>learning gateway.</em></h2><p>The school’s e-library offers a gateway to learning materials. The original “Get Started” link leads to an authorised school sign-in. Continue to the school’s own service using the credentials provided to you.</p><div class="modal-link-list">${externalLink(schoolLinks.library,'Open the digital library')}${externalLink(schoolLinks.libraryLogin,'Teacher / library sign-in','button light')}</div><p class="notice">This redesign does not host restricted books or collect library passwords. If you need access, contact your teacher or the school office.</p>`);}
function showUserLogin(){showDialog(`<p class="eyebrow">YOUR EXISTING SCHOOL ACCOUNT</p><h2>Continue to<br><em>your school login.</em></h2><p>Sign in on the school’s original user portal. Your username, password, and account recovery remain with the existing school system.</p><div class="modal-link-list">${externalLink(schoolLinks.user,'Open user login')}${externalLink(schoolLinks.forgot,'Forgot your password?','button light')}</div><p class="small-note">Do not enter account credentials into enquiries or complaint messages. This website does not ask for your password.</p>`);}

// Contact form prepares a draft; it never falsely claims a server submission.
function showContactForm(type='enquiry'){
 const complaint=type==='complaint';
 showDialog(`<p class="eyebrow">${complaint?'COMPLAINTS & FEEDBACK':'CONTACT THE SCHOOL'}</p><h2>${complaint?'Your voice matters.':'Let’s start'}<br><em>${complaint?'We’re here to listen.':'a conversation.'}</em></h2><p>${complaint?'Use the school’s existing complaint form for a direct submission, or prepare an email below.':'Complete the form below to prepare an email to the school’s published address.'}</p>${complaint?`<div class="action-row">${externalLink(schoolLinks.complain,'Open official complaint form')}</div>`:''}<p class="notice"><strong>Email draft only.</strong> This form does not submit to a server. Review your message, then send it from your own email app. For urgent matters, call 0901 365 3629.</p><form id="school-contact-form"><div class="form-row"><div><label for="contact-name">Your name *</label><input id="contact-name" name="name" autocomplete="name" required maxlength="100"></div><div><label for="contact-email">Email address *</label><input id="contact-email" name="email" type="email" autocomplete="email" required maxlength="150"></div></div><div class="form-row"><div><label for="contact-phone">Contact number</label><input id="contact-phone" name="phone" type="tel" autocomplete="tel" maxlength="30"></div><div><label for="contact-subject">Subject *</label><select id="contact-subject" name="subject" required><option${complaint?'':' selected'}>General enquiry</option><option>Admissions enquiry</option><option>School visit</option><option>Newsletter request</option><option>Holiday assignment request</option><option${complaint?' selected':''}>Complaint or feedback</option></select></div></div><div><label for="contact-description">${complaint?'Description of your concern':'Your message'} *</label><textarea id="contact-description" name="description" rows="5" required minlength="10" maxlength="2000"></textarea></div><p class="small-note">Please do not include passwords, result access PINs, medical information, or other sensitive student details. No information is stored on this page.</p><button type="submit" class="button">Review email draft <span>→</span></button></form><div id="draft-review" aria-live="polite"></div>`);
 $('#school-contact-form').addEventListener('submit',e=>{
  e.preventDefault();const d=new FormData(e.currentTarget);const message=`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nContact number: ${d.get('phone')||'Not provided'}\nSubject: ${d.get('subject')}\n\n${d.get('description')}`;
  const mailto=`mailto:matermesericordiae@gmail.com?subject=${encodeURIComponent('MAMSS: '+d.get('subject'))}&body=${encodeURIComponent(message)}`;
  $('#draft-review').innerHTML=`<h3>Your email draft is ready.</h3><p>To: <strong>matermesericordiae@gmail.com</strong></p><label for="draft-text">Review or copy your message</label><textarea id="draft-text" rows="8" readonly>${escapeHtml(message)}</textarea><div class="action-row"><a class="button" id="send-draft" href="${escapeHtml(mailto)}">Open email app <span>↗</span></a><button class="button light" id="copy-draft">Copy message</button></div><p class="small-note">Nothing has been sent yet. Press Send in your email application to deliver the message.</p><p id="copy-status" class="form-status" aria-live="polite"></p>`;
  $('#copy-draft').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(message);$('#copy-status').textContent='Message copied. Paste it into an email to the school.';}catch{$('#draft-text').focus();$('#draft-text').select();$('#copy-status').textContent='Select and copy the message above, then paste it into your email application.';}});
  $('#draft-review').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
 });
}
const featureActions={
 'admissions':admissions,'announcements':showAnnouncements,'calendar':showCalendar,'library':showLibrary,'user-login':showUserLogin,
 'history':()=>unavailableResource('history'),'anthem':()=>unavailableResource('anthem'),'newsletters':()=>unavailableResource('newsletters'),'assignments':()=>unavailableResource('assignments'),
 'contact-form':()=>showContactForm(),'complaints':()=>showContactForm('complaint'),
 'clear-search':()=>{$('#resource-search').value='';resourceFilter='all';$$('[data-resource-filter]').forEach(b=>{const active=b.dataset.resourceFilter==='all';b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});renderResources();$('#resource-search').focus();}
};
document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button&&featureActions[button.dataset.action]){closeMenu();featureActions[button.dataset.action]();}});

// Restore the PTA notice found on the original gallery/news page.
const newsGrid=$('#news .news-grid');if(newsGrid)newsGrid.insertAdjacentHTML('beforeend',`<button class="news-card pta-news" data-action="calendar"><span class="pta-date"><span>PTA NOTICE</span><b>06</b><strong>OCTOBER</strong><small>Year & time to be confirmed</small></span><span class="news-body"><span class="news-meta">PARENTS & GUARDIANS <span>CONFIRM WITH THE SCHOOL</span></span><span class="news-title">Stay connected with our parent community</span><span class="news-summary">The original website mentions a PTA meeting on 6 October. Please confirm the year, time, and arrangements before attending.</span><span class="text-link">View dates & notice <span>↗</span></span></span></button>`);
const newsContainer=$('#news .container');if(newsContainer)newsContainer.insertAdjacentHTML('beforeend',`<div class="news-archive-link">${externalLink(schoolLinks.news,'Browse the original news & events archive','text-link')}</div>`);

// Expand the previously concise article with the original school's published details.
const visitNews=$('#visit-news');if(visitNews)visitNews.addEventListener('click',()=>showDialog(`<p class="eyebrow">SCHOOL NEWS · PUBLISHED 02 JUNE 2026</p><h2>A special visit to<br><em>our school community.</em></h2><p><strong>Visit date: Wednesday, 29 April 2026</strong></p><p>The original school article reports that the MAMSS community welcomed its Superior, Very Rev. Fr. Augustine Nwosu, C.S.Sp., for an official working visit.</p><p>The visit included interactions with staff and students, campus assessments, and words of encouragement. The school expressed gratitude for his guidance, leadership, and dedication to its growth.</p><img src="${localPhoto('visit020')}" alt="Clergy during the official working visit"><img src="${localPhoto('visit031')}" alt="A student welcomes a visiting member of the clergy"><img src="${localPhoto('visit001')}" alt="The school community welcomes the visiting delegation">${externalLink('https://schoolsnigeria.com.ng/mamss/read/official-working-visit-at-mater-misericordiae-secondary-school-1','Read the original school article','source-link')}`));

$('#privacy-button').addEventListener('click',()=>showDialog(`<p class="eyebrow">WEBSITE INFORMATION</p><h2>Simple. Respectful.<br><em>Transparent.</em></h2><p>This is a redesigned public-facing website. The original school website and existing portals remain separate.</p><h3>Your privacy</h3><p>This preview does not use analytics, advertising cookies, payment processing, or an application database. Entry-class selections, searches, and contact drafts are processed only in the page and are not stored or sent to a server by this preview.</p><h3>Contact drafts</h3><p>The contact and feedback form prepares a message for your own email application. You must send the email yourself. The original school complaint form is linked separately and operates under the school’s own policies.</p><h3>External services</h3><p>Result checking, CBT, staff and student logins, the e-library, and the original complaint form open on existing school/provider websites. They may require your school account or access credential. We do not collect portal passwords or result PINs here.</p><p>Telephone links open your calling app. Maps, WhatsApp, Facebook, and email links open the respective service or application, whose privacy practices may differ.</p><h3>Publication review</h3><p>School management should confirm all dates, statistics, testimonials, contact details, photo permissions, and external service links before launch. Some original menu items link only to the homepage; these are explicitly marked as needing school-supplied content. Replace this preview notice with the school’s approved privacy notice before publication.</p>`));

// Original counter feature, with reduced-motion support and stable accessible labels.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
 const numberObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   const node=entry.target, value=Number(node.textContent.replace(/,/g,''));
   node.setAttribute('aria-label',node.textContent);numberObserver.unobserve(node);
   if(document.documentElement.dataset.motion==='reduce'){node.textContent=value.toLocaleString('en-NG');return;}
   const start=performance.now();
   const animate=now=>{if(document.documentElement.dataset.motion==='reduce'){node.textContent=value.toLocaleString('en-NG');return;}const progress=Math.min((now-start)/1000,1);node.textContent=Math.round(value*(1-Math.pow(1-progress,3))).toLocaleString('en-NG');if(progress<1)requestAnimationFrame(animate);};
   requestAnimationFrame(animate);
  });
 },{threshold:.8});
 $$('.numbers-grid strong').forEach(el=>numberObserver.observe(el));
}
