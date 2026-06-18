/**
 * STREAMS — IndexedDB Database Layer
 * Proper browser database with async operations
 */

const DATABASE_NAME = 'StreamsDB';
const DATABASE_VERSION = 1;

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
            console.log('✅ Database connected:', DATABASE_NAME);
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            console.log('🔧 Setting up database schema...');

            // Users store
            if (!database.objectStoreNames.contains('users')) {
                const usersStore = database.createObjectStore('users', { keyPath: 'id' });
                usersStore.createIndex('email', 'email', { unique: true });
                console.log('  ✓ Created users store');
            }

            // Songs store
            if (!database.objectStoreNames.contains('songs')) {
                const songsStore = database.createObjectStore('songs', { keyPath: 'id' });
                songsStore.createIndex('artist', 'artist', { unique: false });
                songsStore.createIndex('uploadedBy', 'uploadedBy', { unique: false });
                songsStore.createIndex('createdAt', 'createdAt', { unique: false });
                console.log('  ✓ Created songs store');
            }

            // Playlists store
            if (!database.objectStoreNames.contains('playlists')) {
                const playlistsStore = database.createObjectStore('playlists', { keyPath: 'id' });
                playlistsStore.createIndex('userId', 'userId', { unique: false });
                console.log('  ✓ Created playlists store');
            }

            // Favorites store
            if (!database.objectStoreNames.contains('favorites')) {
                const favoritesStore = database.createObjectStore('favorites', { keyPath: 'id' });
                favoritesStore.createIndex('oderId', 'userId', { unique: false });
                console.log('  ✓ Created favorites store');
            }

            // Settings store (theme, preferences, current user)
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
                console.log('  ✓ Created settings store');
            }
        };
    });
}

// ========== GENERIC CRUD OPERATIONS ==========
const StreamsDB = {
    // Get single item by key
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!db) { resolve(null); return; }
            try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            } catch (e) {
                resolve(null);
            }
        });
    },

    // Get all items from store
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) { resolve([]); return; }
            try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (e) {
                resolve([]);
            }
        });
    },

    // Get items by index
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            if (!db) { resolve([]); return; }
            try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index(indexName);
                const request = index.getAll(value);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (e) {
                resolve([]);
            }
        });
    },

    // Add or update item
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!db) { reject('Database not initialized'); return; }
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    },

    // Add multiple items
    async putMany(storeName, items) {
        return new Promise((resolve, reject) => {
            if (!db) { reject('Database not initialized'); return; }
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                items.forEach(item => store.put(item));
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = () => reject(transaction.error);
            } catch (e) {
                reject(e);
            }
        });
    },

    // Delete item
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!db) { reject('Database not initialized'); return; }
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    },

    // Clear entire store
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) { reject('Database not initialized'); return; }
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    },

    // Count items in store
    async count(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) { resolve(0); return; }
            try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (e) {
                resolve(0);
            }
        });
    }
};

// ========== SETTINGS HELPERS ==========
async function getSetting(key) {
    const result = await StreamsDB.get('settings', key);
    return result ? result.value : null;
}

async function setSetting(key, value) {
    return StreamsDB.put('settings', { key, value });
}

// ========== BACKWARD COMPATIBLE DB OBJECT ==========
// This maintains compatibility with existing code while using IndexedDB
const DB = {
    // Synchronous fallback to localStorage for initial load
    get(key) {
        try { 
            return JSON.parse(localStorage.getItem('streams_' + key)); 
        } catch { 
            return null; 
        }
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
        console.log('✅ All STREAMS localStorage data cleared');
        return true;
    },
    getSize() {
        let total = 0;
        this.getAllKeys().forEach(key => {
            total += localStorage.getItem(key).length * 2;
        });
        return total;
    }
};

// ========== MIGRATION: LocalStorage to IndexedDB ==========
async function migrateToIndexedDB() {
    console.log('🔄 Checking for data migration...');
    
    // Check if migration already done
    const migrated = await getSetting('migrated');
    if (migrated) {
        console.log('  Migration already complete');
        return;
    }

    // Migrate users
    const users = DB.get('users');
    if (users && users.length > 0) {
        await StreamsDB.putMany('users', users);
        console.log(`  ✓ Migrated ${users.length} users`);
    }

    // Migrate songs
    const songs = DB.get('songs');
    if (songs && songs.length > 0) {
        await StreamsDB.putMany('songs', songs);
        console.log(`  ✓ Migrated ${songs.length} songs`);
    }

    // Migrate theme
    const theme = DB.get('theme');
    if (theme) {
        await setSetting('theme', theme);
        console.log('  ✓ Migrated theme setting');
    }

    // Migrate current user
    const currentUser = DB.get('currentUser');
    if (currentUser) {
        await setSetting('currentUser', currentUser);
        console.log('  ✓ Migrated current user');
    }

    // Mark as migrated
    await setSetting('migrated', true);
    console.log('✅ Migration complete!');
}

// ========== DATABASE INFO ==========
async function getDatabaseInfo() {
    const info = {
        name: DATABASE_NAME,
        version: DATABASE_VERSION,
        stores: {}
    };
    
    if (db) {
        for (const storeName of db.objectStoreNames) {
            info.stores[storeName] = await StreamsDB.count(storeName);
        }
    }
    
    return info;
}

console.log('📦 Database module loaded');
