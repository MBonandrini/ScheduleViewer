const CACHE='unified-schedule-studio-v6.3.6';
const ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./src/activity-editing.js','./src/activity-layout.js','./src/ai-context.js','./src/analysis-graphics.js','./src/analysis.js','./src/app.js','./src/audit-log.js','./src/baselines.js','./src/bim-advanced.js','./src/bim-links.js','./src/bim-viewer.js','./src/calc-audit.js','./src/calendar-editor.js','./src/calendar-tools.js','./src/canonical-schema.js','./src/codes-editor.js','./src/compare.js','./src/cpm.js','./src/critical-intelligence.js','./src/date-local.js','./src/date-move.js','./src/determinism.js','./src/diagnostics.js','./src/editor.js','./src/error-reporting.js','./src/evm.js','./src/export.js','./src/filters.js','./src/float-paths.js','./src/forensic-comparison.js','./src/forensic-reporting.js','./src/forensic-repository.js','./src/format-adapters.js','./src/gantt.js','./src/global-search.js','./src/import-diagnostics.js','./src/integrity.js','./src/layouts.js','./src/logger.js','./src/menu-controller.js','./src/p6-activity-validation.js','./src/p6-commands.js','./src/package-integrity.js','./src/parser.js','./src/productivity.js','./src/progress.js','./src/project-folder.js','./src/project-package.js','./src/relationship-tools.js','./src/resource-analysis.js','./src/resource-charts.js','./src/resource-intelligence.js','./src/resource-tools.js','./src/revision-history.js','./src/scenarios.js','./src/schedule-health.js','./src/scheduling-options.js','./src/semantic.js','./src/serializer.js','./src/transaction.js','./src/trend-forecast.js','./src/tutorial.js','./src/ui-labels.js','./src/wbs-tools.js','./src/workspace.js'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

// Network-first is intentional for a GitHub Pages application under active
// development. It prevents a previous service-worker cache from leaving old
// command handlers or Gantt code active after a new release is deployed.
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(event.request,{cache:'no-cache'});
      if(response?.ok)cache.put(event.request,response.clone());
      return response;
    }catch(error){
      const cached=await cache.match(event.request);
      if(cached)return cached;
      throw error;
    }
  })());
});
