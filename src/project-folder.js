const DB_NAME='schedule-studio-project-folder';
const STORE='handles';
const ROOT_KEY='project-root';

// The current folder handle is always retained in memory for the life of the
// page.  IndexedDB persistence is an enhancement, not a prerequisite.  This
// means browsers that cannot persist File System Access handles can still use
// the Projects workspace for the current session.
let sessionRootHandle=null;
let storageMode='none'; // none | persistent | session

export function isScheduleFileName(name=''){return /\.(xer|xml)$/i.test(String(name));}
export function sortFolderEntries(entries=[]){return [...entries].sort((a,b)=>{if(a.kind!==b.kind)return a.kind==='directory'?-1:1;return String(a.name).localeCompare(String(b.name),undefined,{numeric:true,sensitivity:'base'});});}
export function projectFolderStorageMode(){return storageMode;}
export function supportsPersistentProjectFolders(){return Boolean(globalThis.showDirectoryPicker&&globalThis.indexedDB);}

function openDb(){return new Promise((resolve,reject)=>{if(!globalThis.indexedDB)return reject(new Error('IndexedDB is unavailable in this browser.'));const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('Could not open the project-folder database.'));});}
async function withStore(mode,fn){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result;try{result=fn(store,resolve,reject);}catch(e){reject(e);return;}tx.onerror=()=>reject(tx.error||new Error('Project-folder database transaction failed.'));if(result&&typeof result.then==='function')result.catch(reject);});}finally{db.close();}}

export async function saveProjectFolderHandle(handle){
  if(!handle)throw new Error('A directory handle is required.');
  sessionRootHandle=handle;
  storageMode='session';
  try{
    await withStore('readwrite',(s,resolve,reject)=>{const r=s.put({key:ROOT_KEY,handle,name:handle.name,updatedAt:new Date().toISOString()});r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error);});
    storageMode='persistent';
    return {handle,persisted:true};
  }catch{
    // Some browsers expose a directory picker but do not allow the handle to
    // be structured-cloned into IndexedDB.  Keep the live handle in memory.
    return {handle,persisted:false};
  }
}

export async function loadProjectFolderHandle(){
  if(sessionRootHandle)return sessionRootHandle;
  try{
    const handle=await withStore('readonly',(s,resolve,reject)=>{const r=s.get(ROOT_KEY);r.onsuccess=()=>resolve(r.result?.handle||null);r.onerror=()=>reject(r.error);});
    if(handle){sessionRootHandle=handle;storageMode='persistent';}
    return handle||null;
  }catch{
    return sessionRootHandle;
  }
}

export async function clearProjectFolderHandle(){
  sessionRootHandle=null;
  storageMode='none';
  try{await withStore('readwrite',(s,resolve,reject)=>{const r=s.delete(ROOT_KEY);r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error);});return true;}catch{return false;}
}

export async function folderPermission(handle,{write=false,request=false}={}){
  if(!handle)return 'denied';
  if(handle.__scheduleStudioSessionDirectory)return 'granted';
  const opts={mode:write?'readwrite':'read'};
  try{let status=await handle.queryPermission?.(opts);if(status==='granted')return status;if(request&&handle.requestPermission)status=await handle.requestPermission(opts);return status||'prompt';}catch{return 'prompt';}
}

export async function chooseProjectFolder(){
  if(!globalThis.showDirectoryPicker){
    const err=new Error('Persistent directory selection is not supported by this browser.');
    err.code='SESSION_FOLDER_REQUIRED';
    throw err;
  }
  const handle=await showDirectoryPicker({id:'schedule-studio-projects',mode:'readwrite'});
  await saveProjectFolderHandle(handle);
  return handle;
}

function virtualFileHandle(file){
  return {kind:'file',name:file.name,__scheduleStudioSessionFile:true,getFile:async()=>file};
}
function virtualDirectoryHandle(name,node){
  const handle={
    kind:'directory',
    name:name||'Session Projects',
    __scheduleStudioSessionDirectory:true,
    queryPermission:async()=> 'granted',
    requestPermission:async()=> 'granted',
    async *entries(){
      for(const child of node.values())yield [child.name,child.kind==='directory'?child.handle:child.handle];
    }
  };
  return handle;
}

/**
 * Build an in-memory directory handle from an <input webkitdirectory> FileList.
 * This is read-only and lasts only for the current page/session, but it lets
 * Firefox/Safari-style environments use the Projects tree without requiring
 * persistent File System Access handles.
 */
export function createSessionProjectFolder(files=[]){
  const list=[...files].filter(f=>isScheduleFileName(f.name));
  if(!list.length)throw new Error('The selected folder contains no XER or XML schedule files.');
  const firstPath=String(list[0].webkitRelativePath||list[0].name).split('/').filter(Boolean);
  const rootName=firstPath.length>1?firstPath[0]:'Session Projects';
  const rootNode=new Map();
  for(const file of list){
    let parts=String(file.webkitRelativePath||file.name).split('/').filter(Boolean);
    if(parts[0]===rootName&&parts.length>1)parts=parts.slice(1);
    let map=rootNode;
    for(let i=0;i<parts.length;i++){
      const part=parts[i],last=i===parts.length-1;
      if(last){map.set(part,{kind:'file',name:part,handle:virtualFileHandle(file)});continue;}
      let entry=map.get(part);
      if(!entry){const children=new Map();entry={kind:'directory',name:part,children,handle:null};entry.handle=virtualDirectoryHandle(part,children);map.set(part,entry);}
      map=entry.children;
    }
  }
  const rootHandle=virtualDirectoryHandle(rootName,rootNode);
  sessionRootHandle=rootHandle;
  storageMode='session';
  return rootHandle;
}

export async function scanProjectFolder(rootHandle,{maxDepth=20}={}){
  if(!rootHandle)return null;
  const walk=async(dir,path='',depth=0)=>{
    const children=[];if(depth>maxDepth)return {kind:'directory',name:dir.name,path,handle:dir,children,truncated:true};
    for await (const [name,handle] of dir.entries()){
      const childPath=path?`${path}/${name}`:name;
      if(handle.kind==='directory')children.push(await walk(handle,childPath,depth+1));
      else if(handle.kind==='file'&&isScheduleFileName(name))children.push({kind:'file',name,path:childPath,handle,parentHandle:dir,extension:name.split('.').pop().toLowerCase()});
    }
    return {kind:'directory',name:dir.name,path,handle:dir,children:sortFolderEntries(children)};
  };
  return walk(rootHandle,'',0);
}

export function flattenScheduleFiles(tree){const out=[];const walk=n=>{if(!n)return;if(n.kind==='file')out.push(n);else for(const c of n.children||[])walk(c);};walk(tree);return out;}
export async function fileFromTreeNode(node){if(!node?.handle||node.kind!=='file')throw new Error('Select a schedule file.');return node.handle.getFile();}
export async function writeFileHandle(fileHandle,text){if(!fileHandle?.createWritable)throw new Error('The selected schedule is read-only in this browser session. Use Save as XER/XML to download a revised copy.');const writable=await fileHandle.createWritable();try{await writable.write(text);}finally{await writable.close();}return true;}
export async function writeScheduleToDirectory(directoryHandle,fileName,text){if(!directoryHandle?.getFileHandle)throw new Error('This Projects folder is session-only and cannot be written directly. Use Save as XER/XML to download a revised copy.');const handle=await directoryHandle.getFileHandle(fileName,{create:true});await writeFileHandle(handle,text);return handle;}
