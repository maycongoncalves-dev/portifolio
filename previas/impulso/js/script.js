const header=document.querySelector('[data-header]');
const progress=document.querySelector('.progress-line span');
const menu=document.querySelector('[data-mobile-menu]');
const menuOpen=document.querySelector('[data-menu-open]');
const menuClose=document.querySelector('[data-menu-close]');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');

function updateScroll(){
  const y=window.scrollY;
  const max=document.documentElement.scrollHeight-window.innerHeight;
  header?.classList.toggle('scrolled',y>28);
  if(progress) progress.style.transform=`scaleX(${max>0?y/max:0})`;
}

let scrollQueued=false;
window.addEventListener('scroll',()=>{
  if(scrollQueued)return;
  scrollQueued=true;
  requestAnimationFrame(()=>{updateScroll();scrollQueued=false});
},{passive:true});
updateScroll();

function setMenu(open){
  menu?.classList.toggle('open',open);
  menu?.setAttribute('aria-hidden',String(!open));
  menuOpen?.setAttribute('aria-expanded',String(open));
  document.body.classList.toggle('menu-open',open);
  if(open)menuClose?.focus();
}
menuOpen?.addEventListener('click',()=>setMenu(true));
menuClose?.addEventListener('click',()=>{setMenu(false);menuOpen?.focus()});
menu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menu?.classList.contains('open')){setMenu(false);menuOpen?.focus()}
});

const reveals=document.querySelectorAll('.reveal');
if('IntersectionObserver'in window&&!reduced.matches){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}});
  },{threshold:.1,rootMargin:'0px 0px -35px'});
  reveals.forEach(element=>observer.observe(element));
}else reveals.forEach(element=>element.classList.add('visible'));

document.querySelectorAll('[data-switcher]').forEach(switcher=>{
  const group=switcher.dataset.switcher;
  const buttons=[...switcher.querySelectorAll('[data-target]')];
  const scope=switcher.closest('[data-switcher-scope]')||document;
  const views=[...scope.querySelectorAll(`[data-view-group="${group}"]`)]
    .filter(view=>view.hasAttribute('data-view'));

  function activate(name){
    buttons.forEach(button=>{
      const active=button.dataset.target===name;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
    });
    views.forEach(view=>{view.hidden=view.dataset.view!==name});
  }

  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>activate(button.dataset.target));
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      const offset=event.key==='ArrowRight'?1:-1;
      const target=buttons[(index+offset+buttons.length)%buttons.length];
      activate(target.dataset.target);
      target.focus();
    });
  });
});

const toast=document.querySelector('[data-toast]');
let toastTimer;
function showToast(message){
  if(!toast)return;
  toast.textContent=message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer=window.setTimeout(()=>toast.classList.remove('show'),3200);
}

document.querySelectorAll('[data-demo-action]').forEach(element=>{
  element.addEventListener('click',event=>{
    if(element.tagName==='A')event.preventDefault();
    showToast(element.dataset.demoMessage||'Demonstração: esta ação seria conectada ao atendimento na versão do cliente.');
  });
});

document.querySelectorAll('[data-demo-form]').forEach(form=>{
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    showToast(form.dataset.success||'Demonstração enviada. Em um projeto real, a equipe receberia estas informações.');
  });
});

const reservation=document.querySelector('[data-reservation-form]');
if(reservation){
  const bindings={
    people:document.querySelector('[data-summary-people]'),
    occasion:document.querySelector('[data-summary-occasion]'),
    period:document.querySelector('[data-summary-period]')
  };
  function sync(){
    Object.entries(bindings).forEach(([name,output])=>{
      const field=reservation.elements.namedItem(name);
      if(output&&field)output.textContent=field.options?.[field.selectedIndex]?.text||field.value;
    });
  }
  reservation.addEventListener('change',sync);
  sync();
}

const year=document.querySelector('[data-year]');
if(year)year.textContent=String(new Date().getFullYear());
