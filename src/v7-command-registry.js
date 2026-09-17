/** Small command-bus foundation for V7. UI surfaces can register one action and
 * menus/toolbars/shortcuts can invoke the same command without duplicating logic. */
export class CommandRegistry{
 constructor(){this.map=new Map()}
 register(id,handler,{enabled=()=>true,label=id}={}){if(!id||typeof handler!=='function')throw new Error('Command requires id and handler');this.map.set(id,{id,handler,enabled,label});return this}
 has(id){return this.map.has(id)}
 can(id,ctx={}){const c=this.map.get(id);return !!c&&c.enabled(ctx)!==false}
 execute(id,ctx={},...args){const c=this.map.get(id);if(!c)throw new Error(`Unknown command: ${id}`);if(!this.can(id,ctx))return false;return c.handler(ctx,...args)}
 audit(ids=[]){return ids.filter(id=>!this.map.has(id))}
 list(){return [...this.map.values()].map(({id,label})=>({id,label}))}
}
