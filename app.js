(() => {
  'use strict';
  const cfg = window.CLEANEXPERT_CONFIG;
  if (!cfg || !Array.isArray(cfg.services)) return;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const icons = (name) => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${name}"></use></svg>`;
  const h = (value) => String(value).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const map = new Map(cfg.services.map(s => [s.id, s]));
  const selection = new Map();
  const serviceSelect = $('#service-select');
  const list = $('#selected-list');
  const summary = $('#summary-text');
  const requestNote = $('#request-note');
  const file = $('#photo-upload');
  const preview = $('#photo-preview');
  let objectUrl = null;
  let toastTimeout;
  const notify = (message) => {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => node.classList.remove('show'), 3400);
  };

  serviceSelect.innerHTML = cfg.services.map(s => `<option value="${h(s.id)}">${h(s.label)}</option>`).join('');
  function serialize() {
    const items = Array.from(selection, ([id, qty]) => ({...map.get(id), qty}));
    const issue = $('input[name="issue"]:checked')?.value || 'Обычная чистка';
    const notes = requestNote.value.trim().slice(0,700);
    if (!items.length) return 'Здравствуйте! Хотел(а) бы узнать условия и стоимость химчистки. Подскажите, пожалуйста, как можно уточнить цену по фотографии.';
    const lines = ['Здравствуйте! Хочу уточнить стоимость химчистки:', ...items.map((x,i)=>`${i+1}. ${x.label} — ${x.qty} шт.`), `Задача: ${issue}.`];
    if (notes) lines.push(`Пожелания: ${notes}`);
    lines.push('Подскажите, пожалуйста, стоимость и условия выезда. При необходимости отправлю фотографию изделия отдельным сообщением.');
    return lines.join('\n');
  }
  function render() {
    if (!selection.size) list.innerHTML = '<div class="empty-selection">Выберите хотя бы один предмет, чтобы сформировать подробный запрос.</div>';
    else list.innerHTML = [...selection].map(([id,qty]) => `<div class="selected-row" data-id="${h(id)}"><span class="selected-name">${h(map.get(id).label)}</span><div class="quantity"><button type="button" data-act="minus" aria-label="Уменьшить количество: ${h(map.get(id).label)}" ${qty === 1 ? 'disabled':''}>${icons('minus')}</button><strong aria-label="Количество: ${qty}">${qty}</strong><button type="button" data-act="plus" aria-label="Увеличить количество: ${h(map.get(id).label)}" ${qty === 30 ? 'disabled':''}>${icons('plus')}</button></div><button type="button" class="remove-row" data-act="remove" aria-label="Удалить: ${h(map.get(id).label)}">${icons('close')}</button></div>`).join('');
    summary.textContent = serialize();
    $('#copy-request').disabled = !selection.size;
    $('#copy-request').setAttribute('aria-disabled', String(!selection.size));
  }
  const add = (id, scroll=false) => {
    if (!map.has(id)) return;
    const next = (selection.get(id) || 0) + 1;
    selection.set(id, Math.min(30,next));
    render();
    if (scroll) {$('#request').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});notify(`«${map.get(id).label}» добавлено в запрос`);}
  };
  $('#add-service').addEventListener('click', () => {add(serviceSelect.value);notify('Позиция добавлена')});
  $$('.service-add').forEach(b => b.addEventListener('click', () => add(b.dataset.service,true)));
  list.addEventListener('click', e => {
    const button = e.target.closest('button[data-act]');
    const row = button?.closest('[data-id]');
    if (!button || !row) return;
    const id = row.dataset.id;
    const qty = selection.get(id);
    if (button.dataset.act === 'remove') selection.delete(id);
    if (button.dataset.act === 'minus' && qty>1) selection.set(id,qty-1);
    if (button.dataset.act === 'plus' && qty<30) selection.set(id,qty+1);
    render();
  });
  $$('input[name="issue"]').forEach(input => input.addEventListener('change',render));
  requestNote.addEventListener('input',render);
  function removePhoto(clearInput = true) {
    if (objectUrl) { URL.revokeObjectURL(objectUrl);objectUrl=null; }
    if (clearInput) file.value='';
    preview.innerHTML='';preview.hidden=true;
  }
  file.addEventListener('change',()=>{
    removePhoto(false);
    const uploaded=file.files?.[0];
    if (!uploaded) return;
    if (!['image/jpeg','image/png','image/webp'].includes(uploaded.type) || uploaded.size>8*1024*1024) {file.value='';notify('Выберите JPG, PNG или WEBP размером до 8 МБ');return;}
    objectUrl = URL.createObjectURL(uploaded);
    preview.hidden=false;
    const pic=document.createElement('img');pic.src=objectUrl;pic.alt='Локальный предпросмотр выбранной фотографии';
    const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=uploaded.name;
    const hint=document.createElement('span');hint.textContent='Только на вашем устройстве · не отправлено';info.append(strong,hint);
    const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label','Удалить фотографию');remove.innerHTML=icons('close');
    remove.addEventListener('click',()=>removePhoto());preview.append(pic,info,remove);
    notify('Фото добавлено только для предпросмотра');
  });
  $('#reset-request').addEventListener('click',()=>{selection.clear();requestNote.value='';const first=$('input[name="issue"]');if(first)first.checked=true;removePhoto();render();notify('Запрос очищен')});
  async function copyText(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {try {await navigator.clipboard.writeText(text);return true;} catch { /* fallback below */ }}
    const temp=document.createElement('textarea');temp.value=text;temp.setAttribute('readonly','');temp.style.cssText='position:fixed;top:-1000px;left:-1000px';document.body.append(temp);temp.select();
    try { const result=document.execCommand('copy'); return result; } finally {temp.remove();}
  }
  $('#copy-request').addEventListener('click',async()=>{
    if (!selection.size) return;
    try {const copied=await copyText(serialize());notify(copied?'Запрос скопирован. Фото отправьте отдельно.':'Не получилось скопировать. Выделите текст вручную.')} catch {notify('Не получилось скопировать. Выделите текст вручную.')}
  });
  const header=$('.site-header');const toggle=$('.nav-toggle');
  function setMenu(open){header.classList.toggle('menu-active',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');document.body.classList.toggle('menu-open',open)}
  toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
  $$('#main-nav a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
  document.addEventListener('click',e=>{if(header.classList.contains('menu-active')&&!header.contains(e.target))setMenu(false)});
  window.addEventListener('resize',()=>{if(window.innerWidth>850)setMenu(false)},{passive:true});
  const onScroll=()=>header.classList.toggle('scrolled',window.scrollY>12);
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  const reveals=$$('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const obs=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');obs.unobserve(entry.target)}}),{threshold:.09,rootMargin:'0px 0px -30px 0px'});
    reveals.forEach((el,i)=>{if(el.classList.contains('service-card')||el.classList.contains('step'))el.style.transitionDelay=`${(i%4)*65}ms`;obs.observe(el)});
  } else reveals.forEach(el=>el.classList.add('visible'));
  render();
})();
