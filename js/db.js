/* ============================================================
   HYBRID Fit — Camada de dados (IndexedDB)
   Banco local por aparelho. Sem sincronização, sem servidor.
   API assíncrona baseada em Promises. Inclui fallback em
   memória para ambientes onde o IndexedDB é bloqueado
   (ex.: pré-visualização em sandbox), preservando o
   funcionamento do app — nesse caso a persistência real
   fica por conta do Exportar/Importar (.json).
   ============================================================ */
const HFDB = (() => {
  const DB_NAME = 'hybridfit';
  const STORE   = 'avaliacoes';
  const VERSION = 1;

  let _db = null;
  let _mode = 'indexeddb';      // 'indexeddb' | 'memory'
  const _mem = new Map();       // fallback

  function supported() {
    try { return typeof indexedDB !== 'undefined' && indexedDB !== null; }
    catch (e) { return false; }
  }

  /* Abre (ou cria) o banco. Resolve com o modo efetivo. */
  function open() {
    return new Promise((resolve) => {
      if (!supported()) { _mode = 'memory'; return resolve(_mode); }
      let req;
      try { req = indexedDB.open(DB_NAME, VERSION); }
      catch (e) { _mode = 'memory'; return resolve(_mode); }

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('nome', 'ident.nome', { unique: false });
          store.createIndex('atualizadoEm', 'atualizadoEm', { unique: false });
          store.createIndex('categoria', 'ident.categoria', { unique: false });
        }
      };
      req.onsuccess = (e) => { _db = e.target.result; _mode = 'indexeddb'; resolve(_mode); };
      req.onerror   = ()   => { _mode = 'memory'; resolve(_mode); };
      req.onblocked = ()   => { _mode = 'memory'; resolve(_mode); };
    });
  }

  function mode() { return _mode; }

  function _store(write) {
    return _db.transaction(STORE, write ? 'readwrite' : 'readonly').objectStore(STORE);
  }

  /* Retorna todos os registros (ordenados por atualização desc). */
  function getAll() {
    return new Promise((resolve, reject) => {
      if (_mode === 'memory') {
        return resolve([..._mem.values()].sort(_byUpdated));
      }
      const req = _store(false).getAll();
      req.onsuccess = () => resolve((req.result || []).sort(_byUpdated));
      req.onerror   = () => reject(req.error);
    });
  }

  function get(id) {
    return new Promise((resolve, reject) => {
      if (_mode === 'memory') return resolve(_mem.get(id) || null);
      const req = _store(false).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => reject(req.error);
    });
  }

  /* Insere ou atualiza. */
  function put(rec) {
    return new Promise((resolve, reject) => {
      if (_mode === 'memory') { _mem.set(rec.id, rec); return resolve(rec); }
      const req = _store(true).put(rec);
      req.onsuccess = () => resolve(rec);
      req.onerror   = () => reject(req.error);
    });
  }

  function remove(id) {
    return new Promise((resolve, reject) => {
      if (_mode === 'memory') { _mem.delete(id); return resolve(); }
      const req = _store(true).delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  /* Importa um lote (usado por Importar .json). Não sobrescreve
     ids já existentes. Retorna quantos foram adicionados. */
  async function bulkAddNew(records) {
    const existing = new Set((await getAll()).map(r => r.id));
    let added = 0;
    for (const r of records) {
      if (r && r.id && !existing.has(r.id)) { await put(r); added++; }
    }
    return added;
  }

  function _byUpdated(a, b) {
    return (b.atualizadoEm || '').localeCompare(a.atualizadoEm || '');
  }

  return { open, mode, supported, getAll, get, put, remove, bulkAddNew };
})();
