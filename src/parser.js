/** Generic Primavera P6 XER parser. No external dependencies. */
export function parseXER(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('The XER file is empty.');
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const tables = new Map();
  let current = null;
  let fields = [];
  let header = null;
  const warnings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split('\t');
    const marker = parts[0];
    if (marker === 'ERMHDR') {
      header = parts.slice(1);
      continue;
    }
    if (marker === '%T') {
      current = parts[1]?.trim();
      fields = [];
      if (!current) { warnings.push(`Line ${i + 1}: table name missing`); continue; }
      if (!tables.has(current)) tables.set(current, { name: current, fields: [], rows: [] });
      continue;
    }
    if (marker === '%F') {
      fields = parts.slice(1).map(v => v.trim());
      if (current && tables.has(current)) tables.get(current).fields = [...new Set([...tables.get(current).fields, ...fields])];
      continue;
    }
    if (marker === '%R') {
      if (!current) { warnings.push(`Line ${i + 1}: record outside table`); continue; }
      if (!fields.length) { warnings.push(`Line ${i + 1}: record before field declaration in ${current}`); continue; }
      const values = parts.slice(1);
      const row = {};
      fields.forEach((f, idx) => { row[f] = values[idx] ?? ''; });
      if (values.length > fields.length) row.__extra = values.slice(fields.length);
      tables.get(current).rows.push(row);
      continue;
    }
    if (marker === '%E') break;
  }

  if (!tables.size) throw new Error('No XER tables were found. This does not appear to be a valid Primavera P6 XER file.');
  return new XERModel({ header, tables, warnings, sourceText: text });
}

export class XERModel {
  constructor({ header, tables, warnings, sourceText }) {
    this.header = header;
    this.tables = tables;
    this.warnings = warnings;
    this.sourceText = sourceText;
    this.indexes = new Map();
  }
  has(name) { return this.tables.has(name); }
  table(name) { return this.tables.get(name)?.rows ?? []; }
  fields(name) { return this.tables.get(name)?.fields ?? []; }
  tableNames() { return [...this.tables.keys()]; }
  rowCount() { return [...this.tables.values()].reduce((n, t) => n + t.rows.length, 0); }
  index(table, field) {
    const key = `${table}.${field}`;
    if (!this.indexes.has(key)) {
      const idx = new Map();
      for (const r of this.table(table)) {
        const v = String(r[field] ?? '');
        if (!idx.has(v)) idx.set(v, []);
        idx.get(v).push(r);
      }
      this.indexes.set(key, idx);
    }
    return this.indexes.get(key);
  }
  find(table, field, value) { return this.index(table, field).get(String(value))?.[0] ?? null; }
  findAll(table, field, value) { return this.index(table, field).get(String(value)) ?? []; }
}

export function p6Date(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  const s = String(value).trim();
  // Schedule dates are wall-clock/local project values. Parse these explicitly before
  // JavaScript's Date parser so YYYY-MM-DD is never silently interpreted as UTC.
  const m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/i);
  if (m) {
    const year=+m[1],month=+m[2],day=+m[3],hour=+(m[4]||0),minute=+(m[5]||0),second=+(m[6]||0);
    const check=new Date(0);check.setUTCFullYear(year,month-1,day);check.setUTCHours(hour,minute,second,0);
    if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day||hour>23||minute>59||second>59)return null;
    if(m[8]) { const zoned=new Date(s);return Number.isNaN(zoned.getTime())?null:zoned; }
    const local=new Date(0);local.setFullYear(year,month-1,day);local.setHours(hour,minute,second,Number((m[7]||'').padEnd(3,'0')));
    return local;
  }
  // Do not let Date's permissive fallback repair malformed project dates.
  if(/^\d{4}[-/]/.test(s))return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function yes(value) {
  return ['Y', 'YES', 'TRUE', '1'].includes(String(value ?? '').toUpperCase());
}

export function fmtDate(value, includeTime = false) {
  const d = p6Date(value);
  if (!d) return value || '—';
  const opts = { year:'numeric', month:'short', day:'2-digit' };
  if (includeTime) Object.assign(opts, { hour:'2-digit', minute:'2-digit' });
  return new Intl.DateTimeFormat('en-GB', opts).format(d);
}

export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
