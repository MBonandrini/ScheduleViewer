/**
 * Exclusive top-level menu helpers.
 *
 * These helpers deliberately avoid relying on the browser's native <details>
 * toggle timing.  Schedule Studio controls the `open` state itself so only
 * one top-level application menu can be open at a time.
 */
export function menuIsOpen(menu){
  if(!menu)return false;
  return Boolean(menu.open===true || menu.hasAttribute?.('open'));
}

export function setMenuOpen(menu,open){
  if(!menu)return false;
  const next=Boolean(open);
  if(next)menu.setAttribute?.('open','');
  else menu.removeAttribute?.('open');
  try{menu.open=next}catch{}
  const summary=menu.querySelector?.(':scope > summary') ?? menu.summary ?? null;
  summary?.setAttribute?.('aria-expanded',next?'true':'false');
  summary?.setAttribute?.('aria-haspopup','menu');
  return next;
}

export function closeMenus(menus,except=null){
  for(const menu of menus||[])if(menu!==except)setMenuOpen(menu,false);
}

export function toggleExclusiveMenu(menus,target){
  if(!target)return false;
  const wasOpen=menuIsOpen(target);
  closeMenus(menus);
  if(!wasOpen)setMenuOpen(target,true);
  return !wasOpen;
}
