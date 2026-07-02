/**
 * STREAMS — Data Layer
 * All images and audio sourced live from Apple Music via iTunes API (JSONP)
 */

// Local, stable cover placeholders that look like real album art and never break.
const fallbackCovers = Array.from({ length: 12 }, (_, i) => {
    const colors = [
        ['#7c3aed', '#ec4899'],
        ['#2563eb', '#06b6d4'],
        ['#0f766e', '#22c55e'],
        ['#dc2626', '#f59e0b'],
        ['#4338ca', '#8b5cf6'],
        ['#be185d', '#f43f5e'],
        ['#0f172a', '#475569'],
        ['#1d4ed8', '#3b82f6'],
        ['#7c2d12', '#fb923c'],
        ['#166534', '#4ade80'],
        ['#115e59', '#14b8a6'],
        ['#831843', '#f472b6']
    ];
    const [start, end] = colors[i % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><linearGradient id="g${i}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${start}"/><stop offset="100%" stop-color="${end}"/></linearGradient></defs><rect width="600" height="600" rx="48" fill="url(#g${i})"/><circle cx="300" cy="260" r="120" fill="rgba(255,255,255,0.16)"/><circle cx="300" cy="260" r="80" fill="rgba(255,255,255,0.24)"/><path d="M240 430c28-62 92-98 150-98 32 0 71 10 110 32" stroke="rgba(255,255,255,0.28)" stroke-width="24" stroke-linecap="round" fill="none"/><text x="300" y="520" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700" fill="rgba(255,255,255,0.95)">STREAMS</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
});

function getCover(idx) { return fallbackCovers[idx % fallbackCovers.length]; }

function preloadImage(url) {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

async function preloadSongCovers(songs) {
    if (!Array.isArray(songs)) return;
    for (const song of songs.slice(0, 24)) {
        if (song?.cover) await preloadImage(song.cover);
    }
}

// Runs `worker` over `items` with at most `concurrency` in flight at once —
// lets background enrichment saturate the network instead of trickling one at a time.
async function runWithConcurrency(items, worker, concurrency) {
    let cursor = 0;
    const lane = async () => {
        while (cursor < items.length) {
            const item = items[cursor++];
            await worker(item);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
}

// ========== ARTIST IMAGE CACHE ==========
const artistImageCache = {};

function getArtistImg(idx) {
    const artist = defaultArtists[idx];
    if (!artist) return fallbackCovers[idx % fallbackCovers.length];
    if (artistImageCache[artist.name]) return artistImageCache[artist.name];
    return fallbackCovers[idx % fallbackCovers.length];
}

// Fetch all artist images from Apple Music in background, several at once, re-rendering
// as each one lands so real photos replace placeholders as soon as they're ready
// instead of all appearing together at the end of a long sequential pass.
async function fetchAllArtistImages() {
    if (typeof fetchArtistImage !== 'function') return;

    const pending = defaultArtists.filter(a => !artistImageCache[a.name]);
    if (!pending.length) return;

    await runWithConcurrency(pending, async (artist) => {
        try {
            const img = await fetchArtistImage(artist.name);
            if (img) {
                artistImageCache[artist.name] = img;
                if (typeof renderView === 'function' && typeof currentView !== 'undefined') {
                    renderView(currentView, typeof currentViewData !== 'undefined' ? currentViewData : null);
                }
            }
        } catch(e) {}
    }, 2);
}

// ========== DEFAULT ARTISTS ==========
const defaultArtists = [
    { name: 'Taylor Swift', genre: 'Pop / Synth-Pop' },
    { name: 'The Weeknd', genre: 'Alternative R&B / Dark Pop' },
    { name: 'Ariana Grande', genre: 'Dance-Pop / Contemporary R&B' },
    { name: 'Billie Eilish', genre: 'Dark Pop / Alt-Pop' },
    { name: 'Bruno Mars', genre: 'Funk-Pop / Soul-Pop' },
    { name: 'Dua Lipa', genre: 'Nu-Disco / Dance-Pop' },
    { name: 'Harry Styles', genre: 'Indie Pop / Soft Rock' },
    { name: 'Justin Bieber', genre: 'Teen Pop / R&B-Pop' },
    { name: 'Olivia Rodrigo', genre: 'Pop-Punk / Bedroom Pop' },
    { name: 'Post Malone', genre: 'Rap-Pop / Trap-Pop' },
    { name: 'Ed Sheeran', genre: 'Acoustic Pop / Folk-Pop' },
    { name: 'Lana Del Rey', genre: 'Baroque Pop / Dream Pop' },
    { name: 'Khalid', genre: 'PBR&B / Neo-Soul Pop' },
    { name: 'BTS', genre: 'K-Pop / Dance-Pop' },
    { name: 'Halsey', genre: 'Electropop / Alternative Pop' }
];

// ========== DEFAULT SONGS ==========
const defaultSongsData = [
    ['Cruel Summer','Taylor Swift','Lover','2:58'],['Blank Space','Taylor Swift','1989','3:51'],
    ["I Don't Wanna Live Forever",'Taylor Swift','Fifty Shades Darker','4:05'],['Lover','Taylor Swift','Lover','3:41'],
    ['Anti-Hero','Taylor Swift','Midnights','3:20'],['cardigan','Taylor Swift','folklore','3:59'],
    ['Shake It Off','Taylor Swift','1989','3:39'],['august','Taylor Swift','folklore','4:21'],
    ['Style','Taylor Swift','1989','3:51'],["Don't Blame Me",'Taylor Swift','reputation','3:56'],
    ['Blinding Lights','The Weeknd','After Hours','3:20'],['Starboy','The Weeknd','Starboy','3:50'],
    ['Die For You','The Weeknd','Starboy','4:20'],['The Hills','The Weeknd','Beauty Behind the Madness','4:02'],
    ['Save Your Tears','The Weeknd','After Hours','3:35'],['One Of The Girls','The Weeknd','The Idol','4:04'],
    ['Call Out My Name','The Weeknd','My Dear Melancholy','3:48'],['Save Your Tears (Remix)','The Weeknd','After Hours','3:11'],
    ['I Feel It Coming','The Weeknd','Starboy','4:29'],["Can't Feel My Face",'The Weeknd','Beauty Behind the Madness','3:33'],
    ['7 rings','Ariana Grande','thank u, next','2:58'],['thank u, next','Ariana Grande','thank u, next','3:27'],
    ['One Last Time','Ariana Grande','My Everything','3:17'],['Into You','Ariana Grande','Dangerous Woman','4:04'],
    ["we can't be friends",'Ariana Grande','eternal sunshine','3:48'],['Side To Side','Ariana Grande','Dangerous Woman','3:46'],
    ['positions','Ariana Grande','positions','2:52'],['Bang Bang','Ariana Grande','My Everything','3:19'],
    ['Dangerous Woman','Ariana Grande','Dangerous Woman','3:55'],['no tears left to cry','Ariana Grande','Sweetener','3:25'],
    ['lovely','Billie Eilish','lovely','3:20'],['BIRDS OF A FEATHER','Billie Eilish','HIT ME HARD AND SOFT','3:30'],
    ['bad guy','Billie Eilish','WHEN WE ALL FALL ASLEEP','3:14'],["when the party's over",'Billie Eilish','WHEN WE ALL FALL ASLEEP','3:16'],
    ['ocean eyes','Billie Eilish',"Don't Smile at Me",'3:20'],['everything i wanted','Billie Eilish','everything i wanted','4:05'],
    ['WILDFLOWER','Billie Eilish','HIT ME HARD AND SOFT','3:59'],['Happier Than Ever','Billie Eilish','Happier Than Ever','4:58'],
    ['What Was I Made For?','Billie Eilish','Barbie','3:42'],['idontwannabeyouanymore','Billie Eilish',"Don't Smile at Me",'3:23'],
    ['Die With A Smile','Bruno Mars','Die With A Smile','4:11'],['Just the Way You Are','Bruno Mars','Doo-Wops & Hooligans','3:40'],
    ['Locked Out Of Heaven','Bruno Mars','Unorthodox Jukebox','3:53'],["That's What I Like",'Bruno Mars','24K Magic','3:26'],
    ['When I Was Your Man','Bruno Mars','Unorthodox Jukebox','3:33'],['Uptown Funk','Bruno Mars','Uptown Special','4:29'],
    ['Grenade','Bruno Mars','Doo-Wops & Hooligans','3:42'],['24K Magic','Bruno Mars','24K Magic','3:46'],
    ['Leave The Door Open','Bruno Mars','An Evening with Silk Sonic','4:02'],['It Will Rain','Bruno Mars','Breaking Dawn','4:17'],
    ["Don't Start Now",'Dua Lipa','Future Nostalgia','3:03'],['Levitating','Dua Lipa','Future Nostalgia','3:23'],
    ['New Rules','Dua Lipa','Dua Lipa','3:29'],['One Kiss','Dua Lipa','One Kiss','3:34'],
    ['Cold Heart','Dua Lipa','The Lockdown Sessions','3:22'],['IDGAF','Dua Lipa','Dua Lipa','3:37'],
    ['Break My Heart','Dua Lipa','Future Nostalgia','3:41'],['Physical','Dua Lipa','Future Nostalgia','3:13'],
    ['Dance The Night','Dua Lipa','Barbie','2:56'],['Houdini','Dua Lipa','Radical Optimism','3:05'],
    ['As It Was','Harry Styles',"Harry's House",'2:47'],['Watermelon Sugar','Harry Styles','Fine Line','2:54'],
    ['Sign of the Times','Harry Styles','Harry Styles','5:40'],['Adore You','Harry Styles','Fine Line','3:27'],
    ['Golden','Harry Styles','Fine Line','3:28'],['Late Night Talking','Harry Styles',"Harry's House",'2:57'],
    ['Falling','Harry Styles','Fine Line','4:00'],['Kiwi','Harry Styles','Harry Styles','2:56'],
    ['Matilda','Harry Styles',"Harry's House",'4:05'],['Lights Up','Harry Styles','Fine Line','2:52'],
    ['Stay','Justin Bieber','F*CK LOVE 3','2:21'],['Love Yourself','Justin Bieber','Purpose','3:53'],
    ['Sorry','Justin Bieber','Purpose','3:20'],['What Do You Mean?','Justin Bieber','Purpose','3:25'],
    ['Peaches','Justin Bieber','Justice','3:18'],['Intentions','Justin Bieber','Changes','3:32'],
    ["I Don't Care",'Justin Bieber','No.6 Collaborations','3:39'],['Despacito (Remix)','Justin Bieber','Vida','3:48'],
    ['Baby','Justin Bieber','My World 2.0','3:34'],['Ghost','Justin Bieber','Justice','2:33'],
    ['drivers license','Olivia Rodrigo','SOUR','4:02'],['good 4 u','Olivia Rodrigo','SOUR','2:58'],
    ['deja vu','Olivia Rodrigo','SOUR','3:35'],['vampire','Olivia Rodrigo','GUTS','3:39'],
    ['traitor','Olivia Rodrigo','SOUR','3:49'],['happier','Olivia Rodrigo','SOUR','2:55'],
    ['brutal','Olivia Rodrigo','SOUR','2:23'],['get him back!','Olivia Rodrigo','GUTS','3:31'],
    ['bad idea right?','Olivia Rodrigo','GUTS','3:04'],['favorite crime','Olivia Rodrigo','SOUR','2:32'],
    ['Sunflower','Post Malone','Spider-Verse','2:38'],['rockstar','Post Malone','Beerbongs & Bentleys','3:38'],
    ['Circles','Post Malone',"Hollywood's Bleeding",'3:35'],['Congratulations','Post Malone','Stoney','3:40'],
    ['Better Now','Post Malone','Beerbongs & Bentleys','3:51'],['Psycho','Post Malone','Beerbongs & Bentleys','3:41'],
    ['I Fall Apart','Post Malone','Stoney','3:43'],['White Iverson','Post Malone','Stoney','4:14'],
    ['Goodbyes','Post Malone',"Hollywood's Bleeding",'2:54'],['Chemical','Post Malone','Austin','3:04'],
    ['Shape of You','Ed Sheeran','÷','3:53'],['Perfect','Ed Sheeran','÷','4:23'],
    ['Photograph','Ed Sheeran','x','4:18'],['Thinking out Loud','Ed Sheeran','x','4:41'],
    ['Bad Habits','Ed Sheeran','=','3:51'],['Shivers','Ed Sheeran','=','3:27'],
    ['Castle on the Hill','Ed Sheeran','÷','4:21'],['Galway Girl','Ed Sheeran','÷','2:50'],
    ['Happier','Ed Sheeran','÷','3:27'],['Perfect Duet','Ed Sheeran','÷','4:19'],
    ['Summertime Sadness (Remix)','Lana Del Rey','Born to Die','3:34'],['Video Games','Lana Del Rey','Born to Die','4:42'],
    ['Born to Die','Lana Del Rey','Born to Die','4:46'],['Young and Beautiful','Lana Del Rey','The Great Gatsby','3:56'],
    ['West Coast','Lana Del Rey','Ultraviolence','4:16'],['Say Yes to Heaven','Lana Del Rey','Did You Know','3:29'],
    ['Summertime Sadness','Lana Del Rey','Born to Die','4:25'],['Lust For Life','Lana Del Rey','Lust for Life','4:24'],
    ['Cinnamon Girl','Lana Del Rey','Norman Fucking Rockwell!','5:00'],["Doin' Time",'Lana Del Rey','Norman Fucking Rockwell!','3:22'],
    ['lovely (with Billie Eilish)','Khalid','lovely','3:20'],['Location','Khalid','American Teen','3:39'],
    ['Young Dumb & Broke','Khalid','American Teen','3:22'],['Talk','Khalid','Free Spirit','3:17'],
    ['Eastside','Khalid','Eastside','2:53'],['Better','Khalid','Free Spirit','3:49'],
    ['Love Lies','Khalid','Love Lies','3:21'],['Silence','Khalid','Silence','3:00'],
    ['OTW','Khalid','American Teen','4:23'],['Coaster','Khalid','Everything Is 4','3:26'],
    ['Dynamite','BTS','Dynamite','3:19'],['Butter','BTS','Butter','2:44'],
    ['Boy With Luv','BTS','MAP OF THE SOUL','3:49'],['My Universe','BTS','Music of the Spheres','3:46'],
    ['Permission to Dance','BTS','Butter','3:07'],['Life Goes On','BTS','BE','3:27'],
    ['Fake Love','BTS','LOVE YOURSELF','4:02'],['Blood Sweat & Tears','BTS','WINGS','3:37'],
    ['DNA','BTS','LOVE YOURSELF','3:43'],['Spring Day','BTS','WINGS','4:34'],
    ['Closer','Halsey','Collage','4:04'],['Without Me','Halsey','Manic','3:21'],
    ['Eastside (with Benny Blanco)','Halsey','Eastside','2:53'],['Bad At Love','Halsey','hopeless fountain kingdom','3:01'],
    ['Him & I','Halsey','Beautiful & Damned','4:28'],['You should be sad','Halsey','Manic','3:25'],
    ['Graveyard','Halsey','Manic','3:01'],['Gasoline','Halsey',"If I Can't Have Love",'3:19'],
    ['Sorry','Halsey','Badlands','3:40'],['New Americana','Halsey','Badlands','3:03']
];

// ========== INITIALIZE DEFAULT SONGS ==========
const SONGS_DATA_VERSION = 4;

function initDefaultSongs() {
    // Force re-seed if version bumped
    if (DB.get('songsDataVersion') !== SONGS_DATA_VERSION) {
        DB.remove('songs');
        DB.set('songsDataVersion', SONGS_DATA_VERSION);
    }

    const existing = DB.get('songs');
    if (existing && existing.length > 0) {
        preloadSongCovers(existing);
        setTimeout(() => enrichSongsWithRealData({ limit: 80 }), 0);
        setTimeout(fetchAllArtistImages, 100);
        return;
    }

    const songs = defaultSongsData.map((s, i) => ({
        id: uid() + i,
        title: s[0],
        artist: s[1],
        album: s[2],
        duration: s[3],
        genre: defaultArtists.find(a => a.name === s[1])?.genre || 'Pop',
        cover: getCover(i),
        audioUrl: null,
        uploadedBy: 'system',
        createdAt: Date.now(),
        plays: Math.floor(Math.random() * 500000000) + 1000000,
    }));
    DB.set('songs', songs);
    preloadSongCovers(songs);
    setTimeout(() => enrichSongsWithRealData({ limit: 80 }), 0);
    setTimeout(fetchAllArtistImages, 100);
}

// ========== BACKGROUND ENRICHMENT ==========
let isEnriching = false;

function isPlaceholderCover(url) {
    return !url || /pexels\.com|placeholder|fallback/i.test(url);
}

function shouldRefreshSong(song, force = false) {
    if (force) return true;
    if (song.uploadedBy !== 'system') return false;
    return !song.appleMusicVerified || isPlaceholderCover(song.cover) || !song.album || !song.duration;
}

async function enrichSongsWithRealData(options = {}) {
    if (isEnriching || typeof fetchAppleMusicTrack !== 'function') return;
    isEnriching = true;

    const { limit = 80, force = false } = options;
    let songs = DB.get('songs') || [];

    const pendingSongs = songs.filter(song => shouldRefreshSong(song, force));
    const batch = pendingSongs.slice(0, limit);
    let updated = false;

    // Enrich several songs concurrently rather than one every 350ms — this is what made
    // real covers/audio take minutes to show up instead of seconds.
    await runWithConcurrency(batch, async (song) => {
        try {
            const data = await fetchAppleMusicTrack(song.title, song.artist);
            if (data) {
                if (data.audioUrl) song.audioUrl = data.audioUrl;
                if (data.cover) song.cover = data.cover;
                if (data.album) song.album = data.album;
                if (data.duration) song.duration = data.duration;
                song.appleMusicVerified = true;
                updated = true;
            }
        } catch(e) {}
    }, 5);

    if (updated) {
        DB.set('songs', songs);
        preloadSongCovers(songs);
        if (typeof renderView === 'function') {
            renderView(currentView, typeof currentViewData !== 'undefined' ? currentViewData : null);
        }
    }

    isEnriching = false;

    if (pendingSongs.length > batch.length) {
        setTimeout(() => enrichSongsWithRealData({ limit, force: false }), 300);
    }
}

// Force refresh (call from console: reloadAllMusicData())
async function reloadAllMusicData() {
    let songs = DB.get('songs') || [];
    songs.forEach(s => { if (s.uploadedBy === 'system') { s.appleMusicVerified = false; s.audioUrl = null; s.cover = getCover(0); }});
    DB.set('songs', songs);
    Object.keys(artistImageCache).forEach(k => delete artistImageCache[k]);
    Object.keys(ITUNES_CACHE).forEach(k => delete ITUNES_CACHE[k]);
    isEnriching = false;
    showToast('Refreshing all music data...', 'info');
    await fetchAllArtistImages();
    await enrichSongsWithRealData({ limit: 60, force: true });
    showToast('✅ All music data refreshed', 'success');
}

// ========== DATA ACCESSORS ==========
function getAllSongs() { return DB.get('songs') || []; }
function getUserSongs() { return getAllSongs().filter(s => s.uploadedBy === currentUser?.id); }
