const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
/* Chapter pages live in their own directories; every shared asset address is
   resolved from the runtime bundle's own location so it is correct on any page. */
const SITE_ROOT = (() => {
  try {
    const source = (document.currentScript && document.currentScript.src) || document.getElementById("mamss-runtime")?.src || location.href;
    return new URL("./", source).href;
  } catch { return new URL("./", location.href).href; }
})();
const assetURL = (path) => new URL(path, SITE_ROOT).href;
const localPhoto = (name) => assetURL("assets/" + name + ".webp");
/* The browser re-resolves icons and the manifest while the real address
   changes between chapters; pin them to this document's own address. */
$$('link[rel="icon"],link[rel="apple-touch-icon"],link[rel="manifest"]').forEach((link) => {
  const href = link.getAttribute("href");
  if (href && !/^(https?:|data:|blob:)/.test(href)) {
    try { link.href = new URL(href, document.baseURI).href; } catch { /* keep authored */ }
  }
});
const contentDialog = $('#content-dialog');
const lightbox = $('#lightbox');
let previousFocus;
function showDialog(html) {
  if(!contentDialog.open)previousFocus=document.activeElement;
  $('#dialog-content').innerHTML=html;
  $('#dialog-content h2').id='dialog-heading';
  contentDialog.showModal();
  contentDialog.scrollTop=0;
  $('.dialog-close',contentDialog).focus({preventScroll:true});
  document.body.classList.add('modal-open');
}
$$('#content-dialog, #lightbox').forEach(dialog=>{
  $('.dialog-close',dialog).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]')){document.body.classList.remove('modal-open');if(previousFocus?.isConnected&&previousFocus.getClientRects().length)previousFocus.focus({preventScroll:true});else {const heading=document.querySelector('[data-page].is-active h1');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}}}});
});
$('#menu-toggle').addEventListener('click',()=>{
  const open=$('#navigation').classList.toggle('open');
  $('#menu-toggle').setAttribute('aria-expanded',String(open));
  $('#menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');
  $('#menu-toggle').textContent=open?'×':'☰';
});
function closeMenu(){ $('#navigation').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-toggle').setAttribute('aria-label','Open navigation');$('#menu-toggle').textContent='☰'; }
$$('#navigation a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
const admissions = () => {
 closeMenu();
 showDialog(`<p class="eyebrow">ADMISSIONS · 2026 / 2027</p><h2>A new beginning.<br><em>A world of possibility.</em></h2><p>Thank you for considering Mater Misericordiae Secondary School. Here’s how to take the next step.</p><p class="notice"><strong>Please confirm current availability.</strong> All entrance-exam dates on the published flyer (30 May, 25 July, 29 August, and 12 September 2026) have passed. Call the school for any additional dates and current admission arrangements.</p><h3>Find your entry class</h3><label for="entry-class">Which class are you interested in?</label><select id="entry-class"><option value="">Select an entry class</option><option>JSS 1</option><option>JSS 2</option><option>SS 1</option><option>SS 2</option></select><p class="form-status" id="class-guidance" aria-live="polite"></p><h3>Your next steps</h3><ol><li><strong>Speak with the school.</strong> Confirm available places, application costs, required documents, and assessment arrangements.</li><li><strong>Collect your form.</strong> Visit the school administrative office or the Parish Bookshop at Mater Misericordiae Catholic Church, Rumuomasi.</li><li><strong>Prepare for assessment.</strong> The published examination subjects are English Language, Mathematics, and General Paper. Confirm the details with the school.</li></ol><p><strong>School address:</strong> No. 2 Arochukwu Street, Rumuomasi, Port Harcourt.</p><div class="action-row"><a class="button" href="tel:+2347037898216">Call admissions <span>↗</span></a><a class="button light" href="${localPhoto('mamssads2027')}" download="MAMSS-2026-2027-admissions.webp">Download school flyer <span>↓</span></a></div><p class="small-note">Forms are collected in person. This website does not process applications or payments. Admission details are taken from the school’s published flyer and should be reconfirmed with the office.</p>`);
 $('#entry-class').addEventListener('change',e=>{
   $('#class-guidance').textContent=e.target.value?`${e.target.value} is listed on the 2026/2027 admission flyer. Ask the office about current places, entry requirements, fees, and the next assessment opportunity for ${e.target.value}.`:'';
 });
};
$$('[data-admissions]').forEach(b=>b.addEventListener('click',admissions));
const programs={
 academics:`<p class="eyebrow">LEARNING AT MAMSS</p><h2>A strong foundation.<br><em>A confident next step.</em></h2><img src="${localPhoto('mater_class')}" alt="Students in a MAMSS classroom"><h3>Junior secondary</h3><p>A foundation in knowledge, reading, disciplined study, and positive learning habits. The current admission flyer lists entry to JSS 1 and JSS 2.</p><h3>Senior secondary</h3><p>Focused academic study and practical learning support preparation for WAEC and NECO examinations. The current admission flyer lists entry to SS 1 and SS 2.</p><h3>A culture of reading</h3><p>The principal’s theme, “In Pursuit of Excellence — Reading Our Way to the Top”, encourages reading programmes, library sessions, literary activities, and a partnership between school and home.</p><p class="notice">For the current subject list, subject combinations, timetable, and entry requirements, please speak directly with the school.</p><a class="button" href="tel:+2347037898216">Ask about our academics <span>↗</span></a>`,
 facilities:`<p class="eyebrow">SPACE TO EXPLORE</p><h2>Supporting learning.<br><em>Nurturing wellbeing.</em></h2><p>The school’s published admission flyer lists the following facilities and support services:</p><ul><li>Information and communication technology suites</li><li>Science and visual arts laboratories</li><li>Library</li><li>Sports facilities</li><li>Health centre</li><li>Guidance and counselling unit</li><li>Security and safety provisions</li></ul><p>Contact the school to arrange a visit and learn how students use these spaces in their day-to-day learning.</p><div class="action-row"><a class="button" href="tel:+2347037898216">Arrange a school visit <span>↗</span></a><a class="button light" href="${localPhoto('mamssads2027')}" target="_blank" rel="noopener">View the school flyer <span>↗</span></a></div>`
};
$$('[data-program]').forEach(b=>b.addEventListener('click',()=>showDialog(programs[b.dataset.program])));
const welcomeButton=$('#welcome-button');if(welcomeButton)welcomeButton.addEventListener('click',()=>showDialog(`<p class="eyebrow">A MESSAGE FROM OUR PRINCIPAL</p><h2>In pursuit of excellence:<br><em>Reading our way to the top.</em></h2><p><strong>Dear esteemed Parents/Guardians and Staff,</strong></p><p>It is with great joy and anticipation that we welcome you, our Parents and Guardians, our students and the Staff to a brand-new academic year; a year filled with promise, potential, and the pursuit of excellence.</p><p>Our theme for this year, In Pursuit of Excellence: Reading Our Way to the Top, reflects our renewed commitment to fostering a culture of knowledge, curiosity, and continuous growth among our students.</p><p>We believe that reading is not just a skill but a powerful key that unlocks creativity, sharpens intellect, and builds confidence. This year, we will be focusing on creating an environment where reading is celebrated as both an academic tool and a lifelong habit.</p><p>Through engaging reading programs, interactive library sessions, and regular literary activities, we aim to inspire our students to explore the world through the pages of books.</p><p>However, this journey to excellence cannot be achieved without your partnership. We encourage you, our valued parents/guardians and staff, to join us in this mission by fostering reading habits at home, during your classes and interactions with students and motivating your children and our students to embrace the joy of learning through books.</p><p>Together, we can help our children reach new heights, not only academically but also in character, confidence, and creativity. Let us make this academic year a memorable one; a year of learning, growth, and the relentless pursuit of excellence.</p><p><strong>Rev. Fr. Obinwa Anthony Chigozie, CSSp.</strong><br>For the Management</p><a class="source-link" href="https://www.mamss.com.ng/" target="_blank" rel="noopener">Welcome message from the school website ↗</a>`));
const resultsButton=$('#results-button');if(resultsButton)resultsButton.addEventListener('click',()=>showDialog(`<p class="eyebrow">CELEBRATING OUR STUDENTS</p><h2>Dedication worth<br><em>celebrating.</em></h2><p>The school’s published 2026 JAMB results flyer celebrates the achievements of its students. The highest score shown is 331.</p><img src="${localPhoto('mamssjamb2026x')}" alt="Original MAMSS 2026 JAMB achievement flyer showing the school's published student scores"><a class="button" href="assets/mamssjamb2026x.webp" download="MAMSS-JAMB-2026.webp">Download results flyer <span>↓</span></a>`));
const photos=[
 {file:'mater_misericordiae_girls_portharcourt_city',alt:'Three MAMSS students in uniform sharing books',caption:'Learning. Friendship. Possibility.',category:'learning'},
 {file:'a2',alt:'MAMSS students and staff gathered for a school photograph',caption:'A community to call your own',category:'community'},
 {file:'mamss_students',alt:'Students playing drums in the MAMSS school band',caption:'Finding our rhythm',category:'activities'},
 {file:'mater_class',alt:'Students seated in a MAMSS classroom',caption:'Curiosity in the classroom',category:'learning'},
 {file:'mater_students2',alt:'Students and clergy celebrating together at MAMSS',caption:'Moments we share',category:'community'}
];
let visiblePhotos=[...photos],photoIndex=0;
function renderGallery(filter='all'){
 if(!$('#gallery'))return;
 visiblePhotos=filter==='all'?[...photos]:photos.filter(p=>p.category===filter);
 $('#gallery').classList.toggle('filtered',filter!=='all');
 $('#gallery').innerHTML=visiblePhotos.map((p,i)=>`<button class="gallery-item" data-photo="${i}" aria-label="View photograph: ${p.caption}"><img src="${localPhoto(p.file)}" alt="${p.alt}" loading="lazy"><span>${p.caption}<b aria-hidden="true">↗</b></span></button>`).join('');
 $$('[data-photo]').forEach(b=>b.addEventListener('click',()=>{previousFocus=b;photoIndex=Number(b.dataset.photo);updatePhoto();lightbox.showModal();document.body.classList.add('modal-open');}));
}
function updatePhoto(){const p=visiblePhotos[photoIndex];$('#large-photo').src=localPhoto(p.file);$('#large-photo').alt=p.alt;$('#photo-description').textContent=p.caption;$('#photo-count').textContent=`${photoIndex+1} / ${visiblePhotos.length}`;lightbox.dispatchEvent(new Event('mamss:photochange'));}
function movePhoto(dir){photoIndex=(photoIndex+dir+visiblePhotos.length)%visiblePhotos.length;updatePhoto();}
$('#previous-photo').addEventListener('click',()=>movePhoto(-1));$('#next-photo').addEventListener('click',()=>movePhoto(1));
lightbox.addEventListener('keydown',e=>{if(e.target.closest('.photo-thumbs')||(e.target.closest('.lightbox-stage')&&lightbox.dataset.zoom==='in'))return;if(e.key==='ArrowLeft'){e.preventDefault();movePhoto(-1);}if(e.key==='ArrowRight'){e.preventDefault();movePhoto(1);}});
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{$$('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderGallery(b.dataset.filter);}));
renderGallery();
$('#year').textContent=new Date().getFullYear();
