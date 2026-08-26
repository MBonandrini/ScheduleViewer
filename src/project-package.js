export function serializeProjectPackage(pkg){return JSON.stringify(pkg,null,2)}
export function parseProjectPackage(text){const p=JSON.parse(text);if(p.schema!=='unified-schedule-project')throw new Error('Not a Unified Schedule Studio project package');return p}
