/**
 * P6-style command metadata. UI surfaces (menus, toolbar, keyboard shortcuts)
 * call these command IDs; business logic remains in app services/handlers.
 */
export const P6_COMMANDS = [
  {id:'open',label:'Open Schedule…',group:'File',shortcut:'Ctrl+O'},
  {id:'save',label:'Save Schedule',group:'File',shortcut:'Ctrl+S',requiresModel:true},
  {id:'saveXer',label:'Save as XER',group:'File',requiresModel:true},
  {id:'saveMsp',label:'Save as MSP XML',group:'File',requiresModel:true},
  {id:'openPackage',label:'Open Project Package…',group:'File'},
  {id:'savePackage',label:'Save Project Package',group:'File',requiresModel:true},
  {id:'export',label:'Export Current View',group:'File',requiresModel:true},
  {id:'print',label:'Print Current View',group:'File',shortcut:'Ctrl+P'},
  {id:'undo',label:'Undo',group:'Edit',shortcut:'Ctrl+Z',requiresModel:true},
  {id:'redo',label:'Redo',group:'Edit',shortcut:'Ctrl+Y',requiresModel:true},
  {id:'copyActivity',label:'Copy Activity',group:'Edit',shortcut:'Ctrl+C',requiresSelection:true},
  {id:'pasteActivity',label:'Paste Activity',group:'Edit',shortcut:'Ctrl+V',requiresModel:true},
  {id:'find',label:'Find',group:'Edit',shortcut:'Ctrl+F'},
  {id:'addActivity',label:'Add Activity',group:'Edit',shortcut:'Insert',requiresModel:true},
  {id:'deleteActivity',label:'Delete Activity',group:'Edit',shortcut:'Delete',requiresSelection:true},
  {id:'relationships',label:'Relationships…',group:'Edit',requiresSelection:true},
  {id:'assignResource',label:'Assign Resources…',group:'Edit',requiresSelection:true},
  {id:'columns',label:'Columns…',group:'View',requiresModel:true},
  {id:'groupSort',label:'Group and Sort…',group:'View',requiresModel:true},
  {id:'filter',label:'Filters…',group:'View',requiresModel:true},
  {id:'zoomIn',label:'Zoom In',group:'View',shortcut:'Ctrl++',requiresModel:true},
  {id:'zoomOut',label:'Zoom Out',group:'View',shortcut:'Ctrl+-',requiresModel:true},
  {id:'schedule',label:'Schedule',group:'Tools',shortcut:'F9',requiresModel:true},
  {id:'scheduleOptions',label:'Schedule Options…',group:'Tools',requiresModel:true},
  {id:'calculationAudit',label:'Imported P6 vs Calculated…',group:'Tools',requiresModel:true},
  {id:'levelResources',label:'Level Resources',group:'Tools',requiresModel:true},
  {id:'levelOptions',label:'Leveling Options…',group:'Tools',requiresModel:true},
  {id:'updateProgress',label:'Update Progress…',group:'Tools',requiresModel:true},
  {id:'baselines',label:'Maintain Baselines…',group:'Project',requiresModel:true},
  {id:'traceLogic',label:'Trace Logic',group:'Tools',requiresSelection:true},
  {id:'globalChange',label:'Global Change / Schedule Editor',group:'Tools',requiresModel:true},
  {id:'resourceProfiles',label:'Resource Usage Profile',group:'Resources',requiresModel:true},
  {id:'compare',label:'Compare Revisions',group:'Tools',requiresModel:true},
  {id:'settings',label:'Project Preferences',group:'Project'},
  {id:'about',label:'About Schedule Studio',group:'Help'},
  // Prepared commands: visible in command metadata so later menu/toolbar additions
  // can use the same stable command IDs without restructuring the engine.
  {id:'newProject',label:'New Project',group:'File',prepared:true},
  {id:'closeProject',label:'Close Project',group:'File',prepared:true},
  {id:'cutActivity',label:'Cut Activity',group:'Edit',prepared:true},
  {id:'replace',label:'Find and Replace',group:'Edit',prepared:true},
  {id:'activitySteps',label:'Activity Steps',group:'Project',prepared:true},
  {id:'expenses',label:'Expenses',group:'Project',prepared:true},
  {id:'risks',label:'Risks',group:'Project',prepared:true},
  {id:'issues',label:'Issues',group:'Project',prepared:true}
];

export const commandById = id => P6_COMMANDS.find(c=>c.id===id) || null;

export function commandEnabled(command, context={}){
  const c=typeof command==='string'?commandById(command):command;
  if(!c)return false;
  if(c.requiresModel&&!context.hasModel)return false;
  if(c.requiresSelection&&!context.hasSelection)return false;
  return true;
}

const key = s => String(s||'').toLowerCase().replace(/\s+/g,'');
export function shortcutForEvent(e){
  if(!e)return '';
  if(e.key==='F9')return 'f9';
  if(e.key==='Insert')return 'insert';
  if(e.key==='Delete')return 'delete';
  const bits=[];
  if(e.ctrlKey||e.metaKey)bits.push('ctrl');
  let k=String(e.key||'').toLowerCase();
  const shiftedPlus=k==='='&&e.shiftKey;
  if(e.shiftKey&&!shiftedPlus)bits.push('shift');
  if(e.altKey)bits.push('alt');
  if(shiftedPlus)k='+';
  if(k==='add')k='+';
  if(k==='subtract')k='-';
  if(k.length===1||['+','-'].includes(k))bits.push(k);
  return bits.join('+');
}

export function commandForKeyboardEvent(e){
  const s=shortcutForEvent(e);
  if(!s)return null;
  return P6_COMMANDS.find(c=>key(c.shortcut)===key(s)) || null;
}
