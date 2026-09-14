import test from 'node:test';
import assert from 'node:assert/strict';
import { menuIsOpen, setMenuOpen, closeMenus, toggleExclusiveMenu } from '../src/menu-controller.js';

class FakeSummary{
  constructor(){this.attrs=new Map();}
  setAttribute(k,v){this.attrs.set(k,String(v));}
  getAttribute(k){return this.attrs.get(k);}
}
class FakeMenu{
  constructor(open=false){this.attrs=new Set();this.open=false;this.summary=new FakeSummary();if(open)this.setAttribute('open','');}
  setAttribute(k){this.attrs.add(k);if(k==='open')this.open=true;}
  removeAttribute(k){this.attrs.delete(k);if(k==='open')this.open=false;}
  hasAttribute(k){return this.attrs.has(k);}
  querySelector(q){return q===':scope > summary'?this.summary:null;}
}

test('exclusive controller opens one menu and closes every sibling',()=>{
  const file=new FakeMenu(true), edit=new FakeMenu(false), view=new FakeMenu(false);
  assert.equal(toggleExclusiveMenu([file,edit,view],edit),true);
  assert.equal(menuIsOpen(file),false);
  assert.equal(menuIsOpen(edit),true);
  assert.equal(menuIsOpen(view),false);
  assert.equal(file.summary.getAttribute('aria-expanded'),'false');
  assert.equal(edit.summary.getAttribute('aria-expanded'),'true');
});

test('clicking the already-open top menu closes it without opening a sibling',()=>{
  const file=new FakeMenu(true), edit=new FakeMenu(false);
  assert.equal(toggleExclusiveMenu([file,edit],file),false);
  assert.equal(menuIsOpen(file),false);
  assert.equal(menuIsOpen(edit),false);
});

test('closeMenus closes all menus or preserves only the explicit exception',()=>{
  const a=new FakeMenu(true),b=new FakeMenu(true),c=new FakeMenu(true);
  closeMenus([a,b,c],b);
  assert.equal(menuIsOpen(a),false);
  assert.equal(menuIsOpen(b),true);
  assert.equal(menuIsOpen(c),false);
  closeMenus([a,b,c]);
  assert.equal(menuIsOpen(b),false);
});

test('setMenuOpen keeps open property, attribute and aria-expanded synchronized',()=>{
  const menu=new FakeMenu(false);
  setMenuOpen(menu,true);
  assert.equal(menu.open,true);
  assert.equal(menu.hasAttribute('open'),true);
  assert.equal(menu.summary.getAttribute('aria-expanded'),'true');
  assert.equal(menu.summary.getAttribute('aria-haspopup'),'menu');
  setMenuOpen(menu,false);
  assert.equal(menu.open,false);
  assert.equal(menu.hasAttribute('open'),false);
  assert.equal(menu.summary.getAttribute('aria-expanded'),'false');
});
