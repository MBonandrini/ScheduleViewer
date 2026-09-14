const DB_NAME='schedule-studio-project-folder';
const STORE='handles';
const ROOT_KEY='project-root';

export function isScheduleFileName(name=''){return /\.(xer|xml)$/i.test(String(name));}
export function sortFolderEntries(entries=[]){return [...entries].sort((a,b)=>{if(a.kind!==b.kind)return a.kind==='directory'?-1:1;return String(a.name).localeCompare(String(b.name),undefined,{numeric:true,sensitivity:'base'});});}

function openDb(){return new Promise((resolve,reject)=>{if(!globalThis.indexedDB)return reject(new Error('IndexedDB is unavailable in this browser.'));const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('Could not open the project-folder database.'));});}
async function withStore(mode,fn){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result;try{result=fn(store,resolve,reject);}catch(e){reject(e);return;}tx.onerror=()=>reject(tx.error||new Error('Project-folder database transaction failed.'));if(result&&typeof result.then==='function')result.catch(reject);});}finally{db.close();}}

export async function saveProjectFolderHandle(handle){if(!handle)throw new Error('A directory handle is required.');return withStore('readwrite',(s,resolve,reject)=>{const r=s.put({key:ROOT_KEY,handle,name:handle.name,updatedAt:new Date().toISOString()});r.onsuccess=()=>resolve(handle);r.onerror=()=>reject(r.error);});}
export async function loadProjectFolderHandle(){return withStore('readonly',(s,resolve,reject)=>{const r=s.get(ROOT_KEY);r.onsuccess=()=>resolve(r.result?.handle||null);r.onerror=()=>reject(r.error);}).catch(()=>null);}
export async function clearProjectFolderHandle(){return withStore('readwrite',(s,resolve,reject)=>{const r=s.delete(ROOT_KEY);r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error);}).catch(()=>false);}

export async function folderPermission(handle,{write=false,request=false}={}){if(!handle)return 'denied';const opts={mode:write?'readwrite':'read'};try{let status=await handle.queryPermission?.(opts);if(status==='granted')return status;if(request&&handle.requestPermission)status=await handle.requestPermission(opts);return status||'prompt';}catch{return 'prompt';}}
export async function chooseProjectFolder(){if(!globalThis.showDirectoryPicker)throw new Error('This browser does not support persistent project folders. Use current Chrome or Edge over HTTPS.');const handle=await showDirectoryPicker({id:'schedule-studio-projects',mode:'readwrite'});await saveProjectFolderHandle(handle);return handle;}

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
export async function writeFileHandle(fileHandle,text){if(!fileHandle?.createWritable)throw new Error('The selected browser/file handle is not writable.');const writable=await fileHandle.createWritable();try{await writable.write(text);}finally{await writable.close();}return true;}
export async function writeScheduleToDirectory(directoryHandle,fileName,text){if(!directoryHandle?.getFileHandle)throw new Error('No writable project folder is connected.');const handle=await directoryHandle.getFileHandle(fileName,{create:true});await writeFileHandle(handle,text);return handle;}
