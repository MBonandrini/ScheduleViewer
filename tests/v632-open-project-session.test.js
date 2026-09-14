import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSessionFolderTree, flattenScheduleFiles, fileFromTreeNode, isScheduleFileName, projectFolderCapabilities } from '../src/project-folder.js';

test('session folder tree reconstructs nested schedule paths and ignores non-schedules', async()=>{
  const a={name:'A.xer',webkitRelativePath:'Projects/Area A/A.xer'};
  const b={name:'B.xml',webkitRelativePath:'Projects/Area B/Sub/B.xml'};
  const c={name:'notes.txt',webkitRelativePath:'Projects/Area B/notes.txt'};
  const tree=buildSessionFolderTree([a,b,c]);
  assert.equal(tree.name,'Projects');
  const files=flattenScheduleFiles(tree);
  assert.equal(files.length,2);
  assert.deepEqual(files.map(x=>x.name).sort(),['A.xer','B.xml']);
  assert.equal(await fileFromTreeNode(files.find(x=>x.name==='A.xer')),a);
});

test('schedule filename filter accepts XER/XML only',()=>{
  assert.equal(isScheduleFileName('x.xer'),true);
  assert.equal(isScheduleFileName('x.XML'),true);
  assert.equal(isScheduleFileName('x.mpp'),false);
  assert.equal(isScheduleFileName('x.txt'),false);
});

test('project folder capabilities is safe in non-browser runtime',()=>{
  const caps=projectFolderCapabilities();
  assert.equal(typeof caps.directoryPicker,'boolean');
  assert.equal(typeof caps.indexedDb,'boolean');
});

test('File Open command is independent of Projects folder',()=>{
  const src=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(src,/async function openScheduleFileDialog\(\)/);
  assert.match(src,/open:openScheduleFileDialog/);
  assert.match(src,/showOpenFilePicker/);
  const fn=src.slice(src.indexOf('async function openScheduleFileDialog()'),src.indexOf('function executeCommand',src.indexOf('async function openScheduleFileDialog()')));
  assert.doesNotMatch(fn,/projectFolderHandle|loadProjectFolderHandle|chooseProjectFolder/);
});

test('Projects supports session-only directory input fallback',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const src=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(html,/id="projectFolderInput"/);
  assert.match(html,/webkitdirectory/);
  assert.match(src,/buildSessionFolderTree/);
  assert.match(src,/projectFolderMode='session-files'/);
  assert.match(src,/Session project folder loaded/);
});
