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
    { name: 'Halsey', genre: 'Electropop / Alternative Pop' },

    // ===== Afrobeats / Afro-Fusion =====
    { name: 'Burna Boy', genre: 'Afrobeats / Afro-Fusion' },
    { name: 'Wizkid', genre: 'Afrobeats / Alté' },
    { name: 'Davido', genre: 'Afrobeats / Afropop' },
    { name: 'Rema', genre: 'Afrobeats / Afro-Rave' },
    { name: 'Tems', genre: 'Afrobeats / Alt-R&B' },
    { name: 'Ayra Starr', genre: 'Afrobeats / Afropop' },
    { name: 'Asake', genre: 'Afrobeats / Amapiano-Fusion' },
    { name: 'ODUMODUBLVCK', genre: 'Nigerian Drill / Afrobeats' },

    // ===== Classical & Neoclassical =====
    { name: 'Ludovico Einaudi', genre: 'Neoclassical / Contemporary' },
    { name: 'Yiruma', genre: 'Neoclassical / Piano' },
    { name: 'Ludwig van Beethoven', genre: 'Classical / Romantic' },
    { name: 'Frédéric Chopin', genre: 'Classical / Romantic' },
    { name: 'Claude Debussy', genre: 'Classical / Impressionist' },
    { name: 'Antonio Vivaldi', genre: 'Classical / Baroque' },

    // ===== Hip-Hop / Rap =====
    { name: 'Kendrick Lamar', genre: 'Hip-Hop / Conscious Rap' },
    { name: 'Drake', genre: 'Hip-Hop / R&B' },

    // ===== Rock / Alternative =====
    { name: 'Coldplay', genre: 'Alt-Rock / Pop-Rock' },
    { name: 'Imagine Dragons', genre: 'Pop-Rock / Alt-Rock' },

    // ===== Latin / Reggaeton =====
    { name: 'Bad Bunny', genre: 'Latin / Reggaeton' },

    // ===== Electronic / Dance =====
    { name: 'Calvin Harris', genre: 'EDM / Dance-Pop' },
    { name: 'Avicii', genre: 'EDM / Progressive House' },

    // ===== R&B / Soul =====
    { name: 'SZA', genre: 'R&B / Alt-R&B' }
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
    ['Sorry','Halsey','Badlands','3:40'],['New Americana','Halsey','Badlands','3:03'],

    // ===== Afrobeats =====
    ['Last Last','Burna Boy','Love, Damini','3:41'],['Ye','Burna Boy','Outside','3:20'],
    ['On The Low','Burna Boy','African Giant','3:07'],['City Boys','Burna Boy','I Told Them...','2:52'],
    ['Kilometre','Burna Boy','Twice As Tall','3:11'],['For My Hand','Burna Boy','Love, Damini','3:26'],
    ['Essence','Wizkid','Made in Lagos','4:08'],['Ojuelegba','Wizkid','Ayo','3:20'],
    ['Come Closer','Wizkid','Sounds from the Other Side','3:33'],['Bad To Me','Wizkid','More Love, Less Ego','3:04'],
    ['Ginger','Wizkid','Made in Lagos','3:04'],['Money & Love','Wizkid','More Love, Less Ego','3:38'],
    ['Fall','Davido','A Good Time','4:15'],['Unavailable','Davido','Timeless','3:03'],
    ['Feel','Davido','Timeless','2:58'],['If','Davido','A Good Time','3:59'],
    ['FEM','Davido','A Better Time','2:35'],['Aye','Davido','Aye','3:56'],
    ['Calm Down','Rema','Rave & Roses','3:59'],['Dumebi','Rema','Rema','2:52'],
    ['Holiday','Rema','Rave & Roses','2:39'],['Charm','Rema','HEIS','2:11'],
    ['Ozeba','Rema','HEIS','2:15'],['Soundgasm','Rema','Rave & Roses Ultra','2:23'],
    ['Free Mind','Tems','For Broken Ears','4:14'],['Me & U','Tems','Born in the Wild','3:12'],
    ['Love Me JeJe','Tems','Born in the Wild','3:15'],['Higher','Tems','If Orange Was a Place','3:39'],
    ['Try Me','Tems','For Broken Ears','3:11'],
    ['Rush','Ayra Starr','19 & Dangerous','3:04'],['Sability','Ayra Starr','Sability','2:44'],
    ['Commas','Ayra Starr','The Year I Turned 21','2:38'],['Bloody Samaritan','Ayra Starr','19 & Dangerous','3:19'],
    ['Away','Ayra Starr','19 & Dangerous','3:04'],
    ['Lonely At The Top','Asake','Work of Art','2:31'],['Joha','Asake','Mr. Money With the Vibe','2:44'],
    ['Sungba','Asake','Mr. Money With the Vibe','2:43'],['Terminator','Asake','Work of Art','2:48'],
    ['Organise','Asake','Mr. Money With the Vibe','3:12'],['Amapiano','Asake','Amapiano','2:36'],
    ['Declan Rice','ODUMODUBLVCK','Eziokwu','2:37'],['Blood On The Dance Floor','ODUMODUBLVCK','Eziokwu','2:29'],
    ['Dog Eat Dog II','ODUMODUBLVCK','Eziokwu','2:41'],['Firegun','ODUMODUBLVCK','Eziokwu','2:33'],
    ['Wotowoto Seasoning','ODUMODUBLVCK','Eziokwu','2:22'],['Pity This Boys','ODUMODUBLVCK','Eziokwu','2:18'],

    // ===== Classical & Neoclassical =====
    ['Nuvole Bianche','Ludovico Einaudi','Una Mattina','5:57'],['Experience','Ludovico Einaudi','In a Time Lapse','5:15'],
    ['Una Mattina','Ludovico Einaudi','Una Mattina','3:20'],['Divenire','Ludovico Einaudi','Divenire','6:42'],
    ['Le Onde','Ludovico Einaudi','Le Onde','4:43'],
    ['River Flows in You','Yiruma','First Love','3:08'],['Kiss the Rain','Yiruma','From the Yellow Room','4:16'],
    ['May Be','Yiruma','First Love','4:00'],
    ['Für Elise','Ludwig van Beethoven','Bagatelle No. 25','2:58'],['Moonlight Sonata','Ludwig van Beethoven','Piano Sonata No. 14','5:30'],
    ['Symphony No. 5','Ludwig van Beethoven','Symphony No. 5 in C Minor','7:20'],
    ['Nocturne in E-flat Major','Frédéric Chopin','Nocturnes, Op. 9','4:33'],['Prelude in E Minor','Frédéric Chopin','Preludes, Op. 28','2:10'],
    ['Clair de Lune','Claude Debussy','Suite Bergamasque','5:00'],
    ['Spring','Antonio Vivaldi','The Four Seasons','3:14'],['Winter','Antonio Vivaldi','The Four Seasons','3:20'],

    // ===== Hip-Hop / Rap =====
    ['HUMBLE.','Kendrick Lamar','DAMN.','2:57'],['Money Trees','Kendrick Lamar','good kid, m.A.A.d city','6:26'],
    ['Not Like Us','Kendrick Lamar','Not Like Us','4:34'],['DNA.','Kendrick Lamar','DAMN.','3:06'],
    ['Alright','Kendrick Lamar','To Pimp a Butterfly','3:39'],['luther','Kendrick Lamar','GNX','2:57'],
    ["God's Plan",'Drake','Scorpion','3:18'],['One Dance','Drake','Views','2:53'],
    ['Hotline Bling','Drake','Views','4:27'],['Passionfruit','Drake','More Life','4:59'],
    ['Nice For What','Drake','Scorpion','3:30'],['In My Feelings','Drake','Scorpion','3:37'],

    // ===== Rock / Alternative =====
    ['Yellow','Coldplay','Parachutes','4:29'],['Viva La Vida','Coldplay','Viva la Vida or Death and All His Friends','4:01'],
    ['Fix You','Coldplay','X&Y','4:55'],['The Scientist','Coldplay','A Rush of Blood to the Head','5:09'],
    ['Paradise','Coldplay','Mylo Xyloto','4:38'],['A Sky Full of Stars','Coldplay','Ghost Stories','4:28'],
    ['Believer','Imagine Dragons','Evolve','3:24'],['Radioactive','Imagine Dragons','Night Visions','3:06'],
    ['Thunder','Imagine Dragons','Evolve','3:07'],['Demons','Imagine Dragons','Night Visions','2:57'],
    ['Enemy','Imagine Dragons','Mercury – Act 1','2:53'],['Bones','Imagine Dragons','Mercury – Act 2','2:45'],

    // ===== Latin / Reggaeton =====
    ['Tití Me Preguntó','Bad Bunny','Un Verano Sin Ti','4:03'],['Me Porto Bonito','Bad Bunny','Un Verano Sin Ti','2:58'],
    ['Dákiti','Bad Bunny','El Último Tour Del Mundo','3:25'],['MONACO','Bad Bunny','nadie sabe lo que va a pasar mañana','4:13'],
    ['Yonaguni','Bad Bunny','Yonaguni','3:26'],['DtMF','Bad Bunny','DeBÍ TiRAR MáS FOToS','3:57'],

    // ===== Electronic / Dance =====
    ['Summer','Calvin Harris','Motion','3:43'],['Feel So Close','Calvin Harris','18 Months','3:26'],
    ['This Is What You Came For','Calvin Harris','This Is What You Came For','3:42'],['Slide','Calvin Harris','Funk Wav Bounces Vol. 1','3:50'],
    ['Wake Me Up','Avicii','True','4:07'],['Levels','Avicii','Levels','3:19'],
    ['Hey Brother','Avicii','True','4:15'],['The Nights','Avicii','The Days / Nights','2:56'],
    ['Waiting For Love','Avicii','Stories','3:50'],

    // ===== R&B / Soul =====
    ['Kill Bill','SZA','SOS','2:33'],['Snooze','SZA','SOS','3:21'],
    ['Good Days','SZA','SOS','4:39'],['Saturn','SZA','Lana','3:03'],
    ['Nobody Gets Me','SZA','SOS','3:01']
];

// ========== INITIALIZE DEFAULT SONGS ==========
const SONGS_DATA_VERSION = 6;

function initDefaultSongs() {
    // Force re-seed if version bumped, keeping anything the user owns —
    // their uploads and the catalog songs they saved are not ours to drop.
    let preserved = [];
    if (DB.get('songsDataVersion') !== SONGS_DATA_VERSION) {
        preserved = (DB.get('songs') || []).filter(s => s.uploadedBy !== 'system');
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
    })).concat(preserved);
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
    let pendingSongs = [];
    let batch = [];

    // Wrapped so any unexpected error still resets isEnriching in the finally — otherwise a
    // single throw would permanently stop all future enrichment (covers stuck on placeholders).
    try {
        let songs = DB.get('songs') || [];

        pendingSongs = songs.filter(song => shouldRefreshSong(song, force));
        batch = pendingSongs.slice(0, limit);
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
    } finally {
        isEnriching = false;
    }

    if (pendingSongs.length > batch.length) {
        setTimeout(() => enrichSongsWithRealData({ limit, force: false }), 300);
    }
}

// ========== PRIORITY (ON-SCREEN) ENRICHMENT ==========
// Songs we've already kicked off a priority fetch for, so the constant re-renders
// don't fire duplicate network requests for the same track.
const _priorityRequested = new Set();

// Enrich a specific set of songs right now, ahead of the slow background sweep.
// Called with whatever is currently visible on screen so the first thing a user is
// likely to click already has its real audio + cover before they click it.
async function enrichVisibleSongs(visibleSongs) {
    if (!Array.isArray(visibleSongs) || typeof fetchAppleMusicTrack !== 'function') return;

    const targets = visibleSongs.filter(s => s && shouldRefreshSong(s) && !_priorityRequested.has(s.id));
    if (targets.length === 0) return;
    targets.forEach(s => _priorityRequested.add(s.id));

    let updated = false;

    await runWithConcurrency(targets, async (song) => {
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
        } catch (e) {}
    }, 4);

    if (!updated) return;

    // Re-read right before writing and merge, so we don't clobber whatever the
    // background sweep resolved in the meantime.
    let songs = DB.get('songs') || [];
    targets.forEach(t => {
        const idx = songs.findIndex(s => s.id === t.id);
        if (idx >= 0) songs[idx] = { ...songs[idx], ...t };
    });
    DB.set('songs', songs);
    preloadSongCovers(targets);
    if (typeof renderView === 'function') {
        renderView(currentView, typeof currentViewData !== 'undefined' ? currentViewData : null);
    }
}

// Scan the just-rendered DOM for playable songs and prioritize enriching them.
// View-agnostic: any card/row/upload tile carrying data-song-id gets picked up.
function prioritizeVisibleEnrichment() {
    const ids = new Set();
    document.querySelectorAll('[data-song-id]').forEach(el => {
        if (el.dataset.songId) ids.add(el.dataset.songId);
    });
    if (ids.size === 0) return;
    const visible = getAllSongs().filter(s => ids.has(s.id));
    enrichVisibleSongs(visible);
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

// ========== LIVE CATALOG SONGS ==========
// Songs pulled straight from the Apple Music/Deezer catalog by a search. They live in
// memory only until the user acts on one (favorite / add to playlist), at which point
// they're written into the library so the reference survives a reload.
const catalogSongIndex = {};

function rememberCatalogSongs(songs) {
    (songs || []).forEach(song => { catalogSongIndex[song.id] = song; });
}

// Resolve a song id against the stored library first, then the live catalog results.
// Every play/queue path goes through this so catalog songs are playable without
// being saved into the library.
function findSongById(id) {
    return getAllSongs().find(s => s.id === id) || catalogSongIndex[id] || null;
}

// Persist a catalog song into the library. Called before anything stores a bare song id
// (favorites, playlists), because those views resolve ids against stored songs.
function saveCatalogSongToLibrary(songId) {
    const songs = getAllSongs();
    if (songs.some(s => s.id === songId)) return true;

    const song = catalogSongIndex[songId];
    if (!song) return false;

    songs.push({ ...song, savedAt: Date.now() });
    DB.set('songs', songs);
    return true;
}

// ========== DATA ACCESSORS ==========
function getAllSongs() { return DB.get('songs') || []; }
function getUserSongs() { return getAllSongs().filter(s => s.uploadedBy === currentUser?.id); }
