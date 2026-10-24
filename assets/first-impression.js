(()=>{
 'use strict';
 const menus=[...document.querySelectorAll('.services-menu')];
 document.addEventListener('click',event=>{menus.forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});});
 document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;menus.forEach(menu=>{if(menu.open){const inside=menu.contains(document.activeElement);menu.open=false;if(inside)menu.querySelector('summary')?.focus();}});});
 menus.forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)menus.filter(other=>other!==menu).forEach(other=>other.open=false);}));
})();
