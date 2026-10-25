document.addEventListener('DOMContentLoaded',()=>{
 const quick=document.querySelector('#hero-name-start'),field=document.querySelector('#hero-customer-name'),form=document.querySelector('#quote-form'),name=form?.querySelector('#customer-name');if(!quick||!field||!name)return;
 quick.addEventListener('submit',event=>{event.preventDefault();field.value=field.value.trim();if(!field.reportValidity())return;name.value=field.value;name.dispatchEvent(new Event('change',{bubbles:true}));form.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
});
