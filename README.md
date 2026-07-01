📂 root/
├── 📄 index.html
├── 📂 css/
│   ├── variables.css      ← Light + Dark theme tokens
│   ├── base.css
│   ├── auth.css           ← Dark mode fixes added
│   ├── sidebar.css
│   ├── player.css
│   ├── components.css     ← Upload card + playing states
│   ├── modals.css
│   ├── settings.css
│   └── responsive.css
└── 📂 js/
    ├── database.js        ← NEW: IndexedDB + migration
    ├── utils.js           ← DB prefix: streams_
    ├── data.js
    ├── auth.js            ← Google placeholder ready
    ├── player.js          ← Updates all buttons on play
    ├── playlists.js
    ├── crud.js
    ├── views.js           ← All buttons interactive
    ├── settings.js
    └── app.js             ← Async boot with DB init


StreamsDB.get(store, key)	Get single item
StreamsDB.getAll(store)	Get all items
StreamsDB.put(store, data)	Add/update item
StreamsDB.delete(store, key)	Delete item
StreamsDB.clear(store)	Clear entire store
getSetting(key)	Get setting value
setSetting(key, value)	Save setting
getDatabaseInfo()	Get DB stats


Browser → DevTools (F12) → Application → IndexedDB → StreamsDB
  ├── audioFiles    ← Your uploaded MP3/WAV/etc binary data
  ├── coverImages   ← Your uploaded cover art
  ├── users
  ├── songs
  ├── playlists
  ├── favorites
  └── setting