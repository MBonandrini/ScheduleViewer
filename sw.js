const CACHE_PREFIX=`schedule-studio-professional:${self.registration.scope}:`;
const CACHE=CACHE_PREFIX+'v8.0.1-integrated';
const ASSETS=[
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./sample/sample-project.xer",
  "./src/activity-editing.js",
  "./src/activity-layout.js",
  "./src/ai-context.js",
  "./src/analysis-graphics.js",
  "./src/analysis.js",
  "./src/app.js",
  "./src/audit-log.js",
  "./src/baselines.js",
  "./src/bim-advanced.js",
  "./src/bim-links.js",
  "./src/bim-viewer.js",
  "./src/calc-audit.js",
  "./src/calendar-editor.js",
  "./src/calendar-tools.js",
  "./src/canonical-schema.js",
  "./src/codes-editor.js",
  "./src/compare.js",
  "./src/contract-profiles.js",
  "./src/cpm.js",
  "./src/critical-intelligence.js",
  "./src/date-local.js",
  "./src/date-move.js",
  "./src/determinism.js",
  "./src/diagnostics.js",
  "./src/editor.js",
  "./src/error-reporting.js",
  "./src/evm.js",
  "./src/export.js",
  "./src/filters.js",
  "./src/float-paths.js",
  "./src/forensic-comparison.js",
  "./src/forensic-reporting.js",
  "./src/forensic-repository.js",
  "./src/format-adapters.js",
  "./src/gantt.js",
  "./src/global-search.js",
  "./src/import-diagnostics.js",
  "./src/integrity.js",
  "./src/layouts.js",
  "./src/logger.js",
  "./src/menu-controller.js",
  "./src/nodes-editor.js",
  "./src/p6-activity-validation.js",
  "./src/p6-commands.js",
  "./src/package-integrity.js",
  "./src/parser.js",
  "./src/productivity.js",
  "./src/progress.js",
  "./src/project-folder.js",
  "./src/project-package.js",
  "./src/relationship-tools.js",
  "./src/report-hierarchy.js",
  "./src/resource-analysis.js",
  "./src/resource-charts.js",
  "./src/resource-intelligence.js",
  "./src/resource-tools.js",
  "./src/revision-history.js",
  "./src/risk-client.js",
  "./src/risk-worker.js",
  "./src/save-service.js",
  "./src/scenarios.js",
  "./src/schedule-controller.js",
  "./src/schedule-health.js",
  "./src/scheduling-options.js",
  "./src/semantic.js",
  "./src/serializer.js",
  "./src/toolkit-host.js",
  "./src/transaction.js",
  "./src/trend-forecast.js",
  "./src/tutorial.js",
  "./src/ui-labels.js",
  "./src/v7-command-registry.js",
  "./src/v7-network-intelligence.js",
  "./src/v7-progress-intelligence.js",
  "./src/v7-revision-intelligence.js",
  "./src/v7-risk-engine.js",
  "./src/v7-schedule-assurance.js",
  "./src/wbs-tools.js",
  "./src/workspace.js",
  "./toolkit/src/ai/browser.js",
  "./toolkit/src/ai/catalog.js",
  "./toolkit/src/ai/cloud.js",
  "./toolkit/src/ai/ollama.js",
  "./toolkit/src/ai/runtime.js",
  "./toolkit/src/ai/tools.js",
  "./toolkit/src/analysis/advanced-forensics.js",
  "./toolkit/src/analysis/calendar.js",
  "./toolkit/src/analysis/claims.js",
  "./toolkit/src/analysis/comparison.js",
  "./toolkit/src/analysis/datacentre.js",
  "./toolkit/src/analysis/dcma.js",
  "./toolkit/src/analysis/delay-events.js",
  "./toolkit/src/analysis/evidence-pack.js",
  "./toolkit/src/analysis/forensics.js",
  "./toolkit/src/analysis/health.js",
  "./toolkit/src/analysis/holidays.js",
  "./toolkit/src/analysis/manpower-breakout.js",
  "./toolkit/src/analysis/measurement-alignment.js",
  "./toolkit/src/analysis/narrative.js",
  "./toolkit/src/analysis/network.js",
  "./toolkit/src/analysis/progress-integrity.js",
  "./toolkit/src/analysis/qa-profiles.js",
  "./toolkit/src/analysis/risk.js",
  "./toolkit/src/analysis/timemachine.js",
  "./toolkit/src/analysis/timeseries.js",
  "./toolkit/src/analysis/week-over-week.js",
  "./toolkit/src/core/model.js",
  "./toolkit/src/core/utils.js",
  "./toolkit/src/core/zip.js",
  "./toolkit/src/integration/builder.js",
  "./toolkit/src/integration/studio.js",
  "./toolkit/src/measurement/boq-alignment.js",
  "./toolkit/src/measurement/dwg-worker.js",
  "./toolkit/src/measurement/takeoff.js",
  "./toolkit/src/parsers/index.js",
  "./toolkit/src/parsers/mspxml.js",
  "./toolkit/src/parsers/pdf-schedule.js",
  "./toolkit/src/parsers/xer.js",
  "./toolkit/src/repository/backup.js",
  "./toolkit/src/repository/db.js",
  "./toolkit/src/repository/repository.js",
  "./toolkit/src/ui/app-state.js",
  "./toolkit/src/ui/app.js",
  "./toolkit/src/ui/chart-workbench.js",
  "./toolkit/src/ui/render.js",
  "./toolkit/src/workers/client.js",
  "./toolkit/src/workers/montecarlo-worker.js",
  "./toolkit/src/workers/schedule-worker.js",
  "./toolkit/assets/app.css",
  "./toolkit/assets/studio.css",
  "./toolkit/vendor/pdfjs/pdf.mjs",
  "./toolkit/vendor/pdfjs/pdf.worker.mjs",
  "./toolkit/index.html"
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

// Network-first is intentional for a GitHub Pages application under active
// development. It prevents a previous service-worker cache from leaving old
// command handlers or Gantt code active after a new release is deployed.
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).pathname.includes('/ollama/'))return;
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(event.request,{cache:'no-cache'});
      if(response?.ok)await cache.put(event.request,response.clone()).catch(()=>{});
      return response;
    }catch(error){
      const cached=await cache.match(event.request,{ignoreSearch:true});
      if(cached)return cached;
      throw error;
    }
  })());
});
