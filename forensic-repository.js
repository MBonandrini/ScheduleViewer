import { attachChecksum, verifyChecksum } from './package-integrity.js';
import { XERModel } from './parser.js';

function tablePayload(model) {
  return [...model.tables.entries()].map(([name, table]) => [name, {
    name: table.name || name,
    fields: [...(table.fields || [])],
    rows: (table.rows || []).map(row => ({ ...row }))
  }]);
}

export function cloneModelPayload(model) {
  return {
    sourceFormat: model?.sourceFormat || '',
    header: Array.isArray(model?.header) ? [...model.header] : model?.header || null,
    tables: model ? tablePayload(model) : [],
    warnings: [...(model?.warnings || [])]
  };
}

export function modelFromPayload(payload) {
  const tables = new Map((payload?.tables || []).map(([name, table]) => [name, {
    name: table?.name || name,
    fields: [...(table?.fields || [])],
    rows: (table?.rows || []).map(row => ({ ...row }))
  }]));
  const model = new XERModel({ header: payload?.header || [], tables, warnings: [...(payload?.warnings || [])], sourceText: '' });
  model.sourceFormat = payload?.sourceFormat || 'xer';
  return model;
}

export function createRevision(model, {
  name = 'Revision', description = '', projectId = null, sourceFile = '', baselineId = '', tags = []
} = {}) {
  const project = projectId ? model?.find?.('PROJECT', 'proj_id', projectId) : model?.table?.('PROJECT')?.[0];
  return {
    id: `revision-${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)}`,
    name,
    description,
    projectId: projectId || project?.proj_id || '',
    projectName: project?.proj_short_name || project?.proj_name || '',
    sourceFile,
    baselineId,
    tags: [...tags],
    importedAt: new Date().toISOString(),
    dataDate: project?.last_recalc_date || project?.data_date || '',
    plannedStart: project?.plan_start_date || project?.scd_start_date || '',
    plannedFinish: project?.plan_end_date || project?.scd_end_date || '',
    payload: cloneModelPayload(model)
  };
}

export function renameRevision(revision, name) {
  return { ...revision, name: String(name || '').trim() || revision.name };
}

export function revisionModel(revision) {
  if (!revision?.payload) throw new Error('Revision does not contain a model payload.');
  return modelFromPayload(revision.payload);
}

export function serializeRepository(revisions = []) {
  const payload=attachChecksum({ schema: 'uss-revision-repository', version: 2, exportedAt: new Date().toISOString(), revisions });
  return JSON.stringify(payload, null, 2);
}

export function parseRepository(text, { maxRevisions = 5000 } = {}) {
  const data = JSON.parse(String(text || ''));
  if (data?.schema !== 'uss-revision-repository' || !Array.isArray(data.revisions)) throw new Error('This is not a valid Unified Schedule Studio revision repository.');
  if(!Number.isInteger(data.version)||data.version<1||data.version>2)throw new Error(`Unsupported revision repository version: ${data.version}`);
  if(data.revisions.length>maxRevisions)throw new Error(`Repository contains ${data.revisions.length} revisions, exceeding the configured limit of ${maxRevisions}.`);
  const ids=new Set();for(const r of data.revisions){if(!r?.id||!r?.payload)throw new Error('Repository contains an incomplete revision record.');if(ids.has(r.id))throw new Error(`Duplicate revision ID: ${r.id}`);ids.add(r.id);}
  const check=verifyChecksum(data);if(!check.ok)throw new Error('Revision repository checksum failed. The backup may be corrupted or incomplete.');
  return data.revisions;
}

export function repositorySummary(revisions = []) {
  return revisions.map(r => ({
    id: r.id, name: r.name, projectId: r.projectId, projectName: r.projectName,
    dataDate: r.dataDate, importedAt: r.importedAt, sourceFile: r.sourceFile,
    activities: (r.payload?.tables || []).find(([n]) => n === 'TASK')?.[1]?.rows?.length || 0,
    relationships: (r.payload?.tables || []).find(([n]) => n === 'TASKPRED')?.[1]?.rows?.length || 0
  }));
}
