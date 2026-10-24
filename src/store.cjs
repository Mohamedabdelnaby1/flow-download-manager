const Realm = require('realm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULTS = {
  language: 'en', theme: 'system', connections: 8, simultaneous: 3,
  retries: 3, retryDelay: 2, speedLimit: 0, quotaMB: 0, quotaHours: 4,
  userAgent: 'Flow/1.0', proxy: '', proxyExceptions: 'localhost,127.0.0.1',
  fileTypes: 'ZIP RAR 7Z TAR GZ PDF DOC DOCX XLSX PPTX MP3 WAV OGG FLAC MP4 MKV MOV WEBM EXE MSI ISO APK',
  excludedSites: '', monitorClipboard: false, videoPanel: true, panelMode: 'full',
  showProgress: true, browserConfirm: true, completionDialog: true, sounds: true, startAtLogin: false,
  ignoreModified: false, categoryFolders: {}, serverConnections: {},
  soundComplete: '', soundError: '', soundQueue: '',
  vpnName: '', vpnRetries: 3, vpnDelay: 10,
  scanner: '', scannerArgs: '[File]', integration: false,
  showCategories: true, textScale: 100, preventDuplicates: true, preventSleep: false, closeToTray:true, minimizeToTray:true
};
const Segment = { name: 'Segment', embedded: true, properties: {
  id: 'int', start: 'double', current: 'double', end: 'double', state: 'string'
}};
const Download = { name: 'Download', primaryKey: 'id', properties: {
  id: 'string', url: 'string', name: 'string', category: 'string', status: 'string',
  size: { type: 'double', default: 0 }, downloaded: { type: 'double', default: 0 },
  speed: { type: 'double', default: 0 }, resumable: { type: 'bool', default: false },
  createdAt: 'string', updatedAt: 'string', queueId: 'string', directory: 'string',
  description: 'string', error: 'string', etag: 'string', modified: 'string',
  segments: 'Segment[]', meta: 'string'
}};
const Queue = { name: 'Queue', primaryKey: 'id', properties: {
  id: 'string', name: 'string', running: 'bool', simultaneous: 'int',
  schedule: 'string'
}};
const KV = { name: 'KV', primaryKey: 'key', properties: { key: 'string', value: 'string' }};
const Event = { name: 'Event', primaryKey: 'id', properties: {
  id: 'string', time: 'string', type: 'string', message: 'string', downloadId: 'string'
}};
const Project = { name: 'Project', primaryKey: 'id', properties: {
  id: 'string', name: 'string', url: 'string', createdAt: 'string', data: 'string'
}};
class Store {
  constructor(dir, protection) {
    fs.mkdirSync(dir, { recursive: true }); this.dir = dir;
    const keyPath = path.join(dir, protection ? 'realm-key.protected' : 'realm-key.local');
    let key;
    if (fs.existsSync(keyPath)) {
      const bytes = fs.readFileSync(keyPath);
      key = protection ? Buffer.from(protection.decrypt(bytes), 'base64') : bytes;
    } else {
      key = crypto.randomBytes(64);
      fs.writeFileSync(keyPath, protection ? protection.encrypt(key.toString('base64')) : key, { mode: 0o600 });
    }
    this.secret = key.subarray(0, 32);
    this.realm = new Realm({ path: path.join(dir, 'flow.realm'), schema: [Segment, Download, Queue, KV, Event, Project], schemaVersion: 1, encryptionKey: key });
    this.settings = { ...DEFAULTS, ...this.get('settings', {}) };
    if (!this.settings.downloadDir) this.settings.downloadDir = path.join(dir, 'Downloads');
    if (!this.settings.tempDir) this.settings.tempDir = path.join(dir, 'Partial');
    if (!this.realm.objects('Queue').length) this.putQueue({ id: 'main', name: this.settings.language==='en'?'Main queue':'القائمة الرئيسية', running: false, simultaneous: 3, schedule: '{}' });
    this.realm.write(() => { for (const d of this.realm.objects('Download')) {
      if (['downloading','probing','processing'].includes(d.status)) { d.status = 'paused'; d.speed = 0; }
    }});
  }
  get(key, fallback = null) { const x = this.realm.objectForPrimaryKey('KV', key); return x ? JSON.parse(x.value) : fallback; }
  set(key, value) { this.realm.write(() => this.realm.create('KV', { key, value: JSON.stringify(value) }, Realm.UpdateMode.Modified)); }
  saveSettings(patch) { this.settings = { ...this.settings, ...patch }; this.set('settings', this.settings); return this.settings; }
  list() { return this.realm.objects('Download').sorted('createdAt', true).toJSON(); }
  find(id) { return this.realm.objectForPrimaryKey('Download', id)?.toJSON(); }
  add(data) {
    const now = new Date().toISOString();
    const item = { id: crypto.randomUUID(), url: '', name: '', category: 'other', status: 'queued', size: 0, downloaded: 0, speed: 0,
      resumable: false, createdAt: now, updatedAt: now, queueId: 'main', directory: this.settings.downloadDir,
      description: '', error: '', etag: '', modified: '', segments: [], meta: '{}', ...data };
    this.realm.write(() => this.realm.create('Download', item)); return this.find(item.id);
  }
  update(id, patch) {
    this.realm.write(() => { const d = this.realm.objectForPrimaryKey('Download', id); if (d) Object.assign(d, patch, { updatedAt: new Date().toISOString() }); }); return this.find(id);
  }
  remove(id) { this.realm.write(() => { const x = this.realm.objectForPrimaryKey('Download', id); if (x) this.realm.delete(x); }); }
  queues() { return this.realm.objects('Queue').toJSON(); }
  putQueue(data) { this.realm.write(() => this.realm.create('Queue', data, Realm.UpdateMode.Modified)); return this.queues(); }
  removeQueue(id) { if (id === 'main') throw Error('لا يمكن حذف القائمة الرئيسية'); this.realm.write(() => {
    for (const d of this.realm.objects('Download').filtered('queueId == $0', id)) d.queueId = 'main';
    const q = this.realm.objectForPrimaryKey('Queue', id); if(q) this.realm.delete(q);
  }); }
  log(type, message, downloadId = '') {
    this.realm.write(() => {
      this.realm.create('Event', { id: crypto.randomUUID(), time: new Date().toISOString(), type, message: String(message).slice(0,2000), downloadId });
      const events = this.realm.objects('Event').sorted('time', true); if(events.length > 500) this.realm.delete(events.slice(500));
    });
  }
  logs() { return this.realm.objects('Event').sorted('time', true).toJSON(); }
  projects() { return this.realm.objects('Project').sorted('createdAt', true).toJSON(); }
  project(data) { this.realm.write(() => this.realm.create('Project', data, Realm.UpdateMode.Modified)); }
  encrypt(value) { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', this.secret, iv); return Buffer.concat([iv,c.update(value),c.final(),c.getAuthTag()]).toString('base64'); }
  decrypt(value) { const b = Buffer.from(value,'base64'); const c = crypto.createDecipheriv('aes-256-gcm',this.secret,b.subarray(0,12)); c.setAuthTag(b.subarray(-16)); return Buffer.concat([c.update(b.subarray(12,-16)),c.final()]).toString(); }
  logins() { return this.get('logins', []).map(({password,...v}) => v); }
  saveLogin(data) { const list=this.get('logins',[]).filter(x=>x.host!==data.host); list.push({host:data.host,username:data.username,password:this.encrypt(data.password)}); this.set('logins',list); }
  auth(host) { const x=this.get('logins',[]).find(x=>x.host===host); return x ? {username:x.username,password:this.decrypt(x.password)} : null; }
  close() { this.realm.close(); }
}
module.exports = { Store, DEFAULTS };
