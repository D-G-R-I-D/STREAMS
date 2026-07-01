/**
 * STREAMS — IndexedDB Database Layer
 * Stores everything locally: songs, users, playlists, and AUDIO FILES
 */

const DATABASE_NAME = 'StreamsDB';
const DATABASE_VERSION = 2;

let db = null;

// ========== INITIALIZE DATABASE ==========
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

        request.onerror = () => {
            console.error('❌ Failed to open database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('✅ Database connected:', DATABASE_NAME, 'v' + DATABASE_VERSION);
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            console.log('🔧 Setting up database schema...');

            if (!database.objectStoreNames.contains('users')) {
                const store = database.createObjectStore('users', { keyPath: 'id' });
                store.createIndex('email', 'email', { unique: true });
            }

            if (!database.objectStoreNames.contains('songs')) {
                const store = database.createObjectStore('songs', { keyPath: 'id' });
                store.createIndex('artist', 'artist', { unique: false });
                store.createIndex('uploadedBy', 'uploadedBy', { unique: false });
            }

            if (!database.objectStoreNames.contains('playlists')) {
                database.createObjectStore('playlists', { keyPath: 'id' });
            }

            if (!database.objectStoreNames.contains('favorites')) {
                database.createObjectStore('favorites', { keyPath: 'id' });
            }

            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }

            // Audio files store — holds actual binary audio data
            if (!database.objectStoreNames.contains('audioFiles')) {
                database.createObjectStore('audioFiles', { keyPath: 'id' });
                console.log('  ✓ Created audioFiles store');
            }

            // Cover images store
            if (!database.objectStoreNames.contains('coverImages')) {
                database.createObjectStore('coverImages', { keyPath: 'id' });
                console.log('  ✓ Created coverImages store');
            }

            console.log('✅ Database schema ready');
        };
    });
}

// ========== GENERIC CRUD ==========
const StreamsDB = {
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!db) { resolve(null); return; }
            try {
                const tx = db.transaction(storeName, 'readonly');
                const req = tx.objectStore(storeName).get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            } catch (e) { resolve(null); }
        });
    },

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) { resolve([]); return; }
            try {
                const tx = db.transaction(storeName, 'readonly');
                const req = tx.objectStore(storeName).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            } catch (e) { resolve([]); }
        });
    },

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!db) { reject('DB not ready'); return; }
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const req = tx.objectStore(storeName).put(data);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } catch (e) { reject(e); }
        });
    },

    async putMany(storeName, items) {
        return new Promise((resolve, reject) => {
            if (!db) { reject('DB not ready'); return; }
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                items.forEach(item => store.put(item));
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            } catch (e) { reject(e); }
        });
    },

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!db) { reject('DB not ready'); return; }
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const req = tx.objectStore(storeName).delete(key);
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            } catch (e) { reject(e); }
        });
    },

    async count(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) { resolve(0); return; }
            try {
                const tx = db.transaction(storeName, 'readonly');
                const req = tx.objectStore(storeName).count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } catch (e) { resolve(0); }
        });
    },

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) { reject('DB not ready'); return; }
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const req = tx.objectStore(storeName).clear();
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            } catch (e) { reject(e); }
        });
    }
};

// ========== AUDIO FILE STORAGE ==========
async function saveAudioFile(songId, file) {
    const arrayBuffer = await file.arrayBuffer();
    await StreamsDB.put('audioFiles', {
        id: songId,
        data: arrayBuffer,
        type: file.type,
        name: file.name,
        size: file.size,
        savedAt: Date.now()
    });
    console.log('💾 Audio saved to IndexedDB:', file.name, (file.size / (1024*1024)).toFixed(1) + 'MB');
}

async function getAudioFile(songId) {
    return StreamsDB.get('audioFiles', songId);
}

async function deleteAudioFile(songId) {
    try {
        await StreamsDB.delete('audioFiles', songId);
    } catch (e) {}
}

function audioFileToURL(audioRecord) {
    if (!audioRecord || !audioRecord.data) return null;
    const blob = new Blob([audioRecord.data], { type: audioRecord.type || 'audio/mpeg' });
    return URL.createObjectURL(blob);
}

// ========== COVER IMAGE STORAGE ==========
async function saveCoverImage(songId, file) {
    const arrayBuffer = await file.arrayBuffer();
    await StreamsDB.put('coverImages', {
        id: songId,
        data: arrayBuffer,
        type: file.type,
        savedAt: Date.now()
    });
}

async function getCoverImage(songId) {
    const record = await StreamsDB.get('coverImages', songId);
    if (!record || !record.data) return null;
    const blob = new Blob([record.data], { type: record.type || 'image/jpeg' });
    return URL.createObjectURL(blob);
}

async function deleteCoverImage(songId) {
    try { await StreamsDB.delete('coverImages', songId); } catch(e) {}
}

// ========== SETTINGS HELPERS ==========
async function getSetting(key) {
    const r = await StreamsDB.get('settings', key);
    return r ? r.value : null;
}

async function setSetting(key, value) {
    return StreamsDB.put('settings', { key, value });
}

// ========== BACKWARD COMPAT DB (localStorage) ==========
const DB = {
    get(key) {
        try { return JSON.parse(localStorage.getItem('streams_' + key)); }
        catch { return null; }
    },
    set(key, val) {
        localStorage.setItem('streams_' + key, JSON.stringify(val));
    },
    remove(key) {
        localStorage.removeItem('streams_' + key);
    },
    getAllKeys() {
        return Object.keys(localStorage).filter(k => k.startsWith('streams_'));
    },
    clearAll() {
        this.getAllKeys().forEach(k => localStorage.removeItem(k));
        return true;
    },
    getSize() {
        let t = 0;
        this.getAllKeys().forEach(k => { t += localStorage.getItem(k).length * 2; });
        return t;
    }
};

// ========== MIGRATION ==========
async function migrateToIndexedDB() {
    const migrated = await getSetting('migrated_v2');
    if (migrated) return;
    console.log('🔄 Migrating data...');
    const users = DB.get('users');
    if (users?.length) await StreamsDB.putMany('users', users).catch(() => {});
    const songs = DB.get('songs');
    if (songs?.length) await StreamsDB.putMany('songs', songs).catch(() => {});
    await setSetting('migrated_v2', true);
    console.log('✅ Migration complete');
}

// ========== DATABASE INFO ==========
async function getDatabaseInfo() {
    const info = { name: DATABASE_NAME, version: DATABASE_VERSION, stores: {} };
    if (db) {
        for (const name of db.objectStoreNames) {
            info.stores[name] = await StreamsDB.count(name);
        }
    }
    return info;
}

console.log('📦 Database module loaded');
