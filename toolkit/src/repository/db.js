/**
 * IndexedDB persistence primitives. This is the only low-level browser database
 * layer; higher-level project/file operations belong in repository.js.
 */
import {
  uid
} from "../core/utils.js";
const DB = "ScheduleStudio8AI",
VERSION = 2;
const stores = ["projects", "files", "schedules", "risks", "claims", "settings", "folders"];
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION); req.onupgradeneeded = () => {
      const db = req.result; for (const name of stores)if (!db.objectStoreNames.contains(name))db.createObjectStore(name, {
        keyPath: "id"
      });
    }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
async function tx(store,mode,fn){
 const database=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const transaction=database.transaction(store,mode);let request;
  try{request=fn(transaction.objectStore(store))}catch(error){transaction.abort();reject(error);return;}
  transaction.oncomplete=()=>resolve(request?.result);
  transaction.onerror=()=>reject(transaction.error||new Error('Database transaction failed'));
  transaction.onabort=()=>reject(transaction.error||new Error('Database transaction aborted'));
 });}finally{database.close()}
}
export const db={
 async put(store,value){await tx(store,'readwrite',s=>s.put(value));return value;},
 get:(store,id)=>tx(store,'readonly',s=>s.get(id)),
 all:store=>tx(store,'readonly',s=>s.getAll()),
 del:(store,id)=>tx(store,'readwrite',s=>s.delete(id)),
 clear:store=>tx(store,'readwrite',s=>s.clear())
};
const ACTIVE_PROJECT_KEY = "studio8.ai.activeProject";
export async function listProjects() {
  return(await db.all("projects")).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
}
export async function ensureProject() {
  const all = await listProjects(),
  saved = localStorage.getItem(ACTIVE_PROJECT_KEY),
  found = all.find(x => x.id===saved) || all[0];
  if (found) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, found.id);
    return found
  }
  return await createProject("Untitled Project");
}
export async function createProject(name = "Untitled Project") {
  const p = {
    id: uid("project"),
    name: String(name || "Untitled Project"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await db.put("projects", p);
  localStorage.setItem(ACTIVE_PROJECT_KEY, p.id);
  return p;
}
export async function setActiveProject(id) {
  const p = await db.get("projects", id);
  if (!p)throw new Error("Project not found");
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  return p;
}
export async function deleteProject(id) {
  for (const store of["files", "schedules", "risks", "claims", "folders"])for (const row of await db.all(store))if (row.projectId===id)await db.del(store, row.id);
  await db.del("projects", id);
  if (localStorage.getItem(ACTIVE_PROJECT_KEY)===id)localStorage.removeItem(ACTIVE_PROJECT_KEY);
  return await ensureProject();
}
