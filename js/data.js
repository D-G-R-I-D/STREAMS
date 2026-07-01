/**
 * STREAMS — Data Layer
 * Curated artists, songs, real artist photography, and Apple Music enrichment
 */

// ========== REAL ARTIST PHOTOGRAPHY ==========
// High-resolution real artist portraits from Wikimedia Commons / verified artist imagery
const artistImages = [
    // 1. Taylor Swift
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/191125_Taylor_Swift_at_the_2019_American_Music_Awards_%28cropped%29.png/600px-191125_Taylor_Swift_at_the_2019_American_Music_Awards_%28cropped%29.png',
    // 2. The Weeknd
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/The_Weeknd_Cannes_2023.png/600px-The_Weeknd_Cannes_2023.png',
    // 3. Ariana Grande
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Ariana_Grande_Grammys_Red_Carpet_2020.png/600px-Ariana_Grande_Grammys_Red_Carpet_2020.png',
    // 4. Billie Eilish
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Billie_Eilish_2019_by_Glenn_Francis_%28cropped%29.jpg/600px-Billie_Eilish_2019_by_Glenn_Francis_%28cropped%29.jpg',
    // 5. Bruno Mars
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/BrunoMars2012.jpg/600px-BrunoMars2012.jpg',
    // 6. Dua Lipa
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/DuaLipaO2020518_%2849_of_104%29_%2842062534571%29_%28cropped%29.jpg/600px-DuaLipaO2020518_%2849_of_104%29_%2842062534571%29_%28cropped%29.jpg',
    // 7. Harry Styles
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Harry_Styles_Love_On_Tour_New_York_Night_3_June_2022_%28cropped%29.jpg/600px-Harry_Styles_Love_On_Tour_New_York_Night_3_June_2022_%28cropped%29.jpg',
    // 8. Justin Bieber
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Justin_Bieber_in_2015.jpg/600px-Justin_Bieber_in_2015.jpg',
    // 9. Olivia Rodrigo
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Olivia_Rodrigo_by_Gage_Skidmore_2022.jpg/600px-Olivia_Rodrigo_by_Gage_Skidmore_2022.jpg',
    // 10. Post Malone
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Post_Malone_at_the_2019_American_Music_Awards.png/600px-Post_Malone_at_the_2019_American_Music_Awards.png',
    // 11. Ed Sheeran
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Ed_Sheeran-6886_%28cropped%29.jpg/600px-Ed_Sheeran-6886_%28cropped%29.jpg',
    // 12. Lana Del Rey
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Lana_Del_Rey_Cannes_2012_%28cropped%29.jpg/600px-Lana_Del_Rey_Cannes_2012_%28cropped%29.jpg',
    // 13. Khalid
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Khalid_2019_by_Glenn_Francis.jpg/600px-Khalid_2019_by_Glenn_Francis.jpg',
    // 14. BTS
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/BTS_for_Dispatch_White_Day_Special%2C_27_February_2019_01.jpg/600px-BTS_for_Dispatch_White_Day_Special%2C_27_February_2019_01.jpg',
    // 15. Halsey
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Halsey_at_the_2019_American_Music_Awards.png/600px-Halsey_at_the_2019_American_Music_Awards.png'
];

// Aesthetic fallbacks for cover art before iTunes live query completes
const fallbackCovers = [
    'https://images.pexels.com/photos/9656150/pexels-photo-9656150.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/9999717/pexels-photo-9999717.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/9656152/pexels-photo-9656152.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/9656151/pexels-photo-9656151.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/10022926/pexels-photo-10022926.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/20120130/pexels-photo-20120130.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/25626511/pexels-photo-25626511.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/25626523/pexels-photo-25626523.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/20120124/pexels-photo-20120124.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/9977648/pexels-photo-9977648.jpeg?auto=compress&cs=tinysrgb&w=400'
];

function getCover(idx) { return fallbackCovers[idx % fallbackCovers.length]; }
function getArtistImg(idx) { return artistImages[idx % artistImages.length]; }

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

// ========== DEFAULT CURATED POP SONGS ==========
const defaultSongsData = [
    // Taylor Swift
    ['Cruel Summer','Taylor Swift','Lover','2:58'],['Blank Space','Taylor Swift','1989','3:51'],
    ["I Don't Wanna Live Forever",'Taylor Swift','Fifty Shades Darker','4:05'],['Lover','Taylor Swift','Lover','3:41'],
    ['Anti-Hero','Taylor Swift','Midnights','3:20'],['cardigan','Taylor Swift','folklore','3:59'],
    ['Shake It Off','Taylor Swift','1989','3:39'],['august','Taylor Swift','folklore','4:21'],
    ['Style','Taylor Swift','1989','3:51'],["Don't Blame Me",'Taylor Swift','reputation','3:56'],
    // The Weeknd
    ['Blinding Lights','The Weeknd','After Hours','3:20'],['Starboy','The Weeknd','Starboy','3:50'],
    ['Die For You','The Weeknd','Starboy','4:20'],['The Hills','The Weeknd','Beauty Behind the Madness','4:02'],
    ['Save Your Tears','The Weeknd','After Hours','3:35'],['One Of The Girls','The Weeknd','The Idol','4:04'],
    ['Call Out My Name','The Weeknd','My Dear Melancholy','3:48'],['Save Your Tears (Remix)','The Weeknd','After Hours','3:11'],
    ['I Feel It Coming','The Weeknd','Starboy','4:29'],["Can't Feel My Face",'The Weeknd','Beauty Behind the Madness','3:33'],
    // Ariana Grande
    ['7 rings','Ariana Grande','thank u, next','2:58'],['thank u, next','Ariana Grande','thank u, next','3:27'],
    ['One Last Time','Ariana Grande','My Everything','3:17'],['Into You','Ariana Grande','Dangerous Woman','4:04'],
    ["we can't be friends",'Ariana Grande','eternal sunshine','3:48'],['Side To Side','Ariana Grande','Dangerous Woman','3:46'],
    ['positions','Ariana Grande','positions','2:52'],['Bang Bang','Ariana Grande','My Everything','3:19'],
    ['Dangerous Woman','Ariana Grande','Dangerous Woman','3:55'],['no tears left to cry','Ariana Grande','Sweetener','3:25'],
    // Billie Eilish
    ['lovely','Billie Eilish','lovely','3:20'],['BIRDS OF A FEATHER','Billie Eilish','HIT ME HARD AND SOFT','3:30'],
    ['bad guy','Billie Eilish','WHEN WE ALL FALL ASLEEP','3:14'],["when the party's over",'Billie Eilish','WHEN WE ALL FALL ASLEEP','3:16'],
    ['ocean eyes','Billie Eilish',"Don't Smile at Me",'3:20'],['everything i wanted','Billie Eilish','everything i wanted','4:05'],
    ['WILDFLOWER','Billie Eilish','HIT ME HARD AND SOFT','3:59'],['Happier Than Ever','Billie Eilish','Happier Than Ever','4:58'],
    ['What Was I Made For?','Billie Eilish','Barbie','3:42'],['idontwannabeyouanymore','Billie Eilish',"Don't Smile at Me",'3:23'],
    // Bruno Mars
    ['Die With A Smile','Bruno Mars','Die With A Smile','4:11'],['Just the Way You Are','Bruno Mars','Doo-Wops & Hooligans','3:40'],
    ['Locked Out Of Heaven','Bruno Mars','Unorthodox Jukebox','3:53'],["That's What I Like",'Bruno Mars','24K Magic','3:26'],
    ['When I Was Your Man','Bruno Mars','Unorthodox Jukebox','3:33'],['Uptown Funk','Bruno Mars','Uptown Special','4:29'],
    ['Grenade','Bruno Mars','Doo-Wops & Hooligans','3:42'],['24K Magic','Bruno Mars','24K Magic','3:46'],
    ['Leave The Door Open','Bruno Mars','An Evening with Silk Sonic','4:02'],['It Will Rain','Bruno Mars','Breaking Dawn','4:17'],
    // Dua Lipa
    ["Don't Start Now",'Dua Lipa','Future Nostalgia','3:03'],['Levitating','Dua Lipa','Future Nostalgia','3:23'],
    ['New Rules','Dua Lipa','Dua Lipa','3:29'],['One Kiss','Dua Lipa','One Kiss','3:34'],
    ['Cold Heart','Dua Lipa','The Lockdown Sessions','3:22'],['IDGAF','Dua Lipa','Dua Lipa','3:37'],
    ['Break My Heart','Dua Lipa','Future Nostalgia','3:41'],['Physical','Dua Lipa','Future Nostalgia','3:13'],
    ['Dance The Night','Dua Lipa','Barbie','2:56'],['Houdini','Dua Lipa','Radical Optimism','3:05'],
    // Harry Styles
    ['As It Was','Harry Styles',"Harry's House",'2:47'],['Watermelon Sugar','Harry Styles','Fine Line','2:54'],
    ['Sign of the Times','Harry Styles','Harry Styles','5:40'],['Adore You','Harry Styles','Fine Line','3:27'],
    ['Golden','Harry Styles','Fine Line','3:28'],['Late Night Talking','Harry Styles',"Harry's House",'2:57'],
    ['Falling','Harry Styles','Fine Line','4:00'],['Kiwi','Harry Styles','Harry Styles','2:56'],
    ['Matilda','Harry Styles',"Harry's House",'4:05'],['Lights Up','Harry Styles','Fine Line','2:52'],
    // Justin Bieber
    ['Stay','Justin Bieber','F*CK LOVE 3','2:21'],['Love Yourself','Justin Bieber','Purpose','3:53'],
    ['Sorry','Justin Bieber','Purpose','3:20'],['What Do You Mean?','Justin Bieber','Purpose','3:25'],
    ['Peaches','Justin Bieber','Justice','3:18'],['Intentions','Justin Bieber','Changes','3:32'],
    ["I Don't Care",'Justin Bieber','No.6 Collaborations','3:39'],['Despacito (Remix)','Justin Bieber','Vida','3:48'],
    ['Baby','Justin Bieber','My World 2.0','3:34'],['Ghost','Justin Bieber','Justice','2:33'],
    // Olivia Rodrigo
    ['drivers license','Olivia Rodrigo','SOUR','4:02'],['good 4 u','Olivia Rodrigo','SOUR','2:58'],
    ['deja vu','Olivia Rodrigo','SOUR','3:35'],['vampire','Olivia Rodrigo','GUTS','3:39'],
    ['traitor','Olivia Rodrigo','SOUR','3:49'],['happier','Olivia Rodrigo','SOUR','2:55'],
    ['brutal','Olivia Rodrigo','SOUR','2:23'],['get him back!','Olivia Rodrigo','GUTS','3:31'],
    ['bad idea right?','Olivia Rodrigo','GUTS','3:04'],['favorite crime','Olivia Rodrigo','SOUR','2:32'],
    // Post Malone
    ['Sunflower','Post Malone','Spider-Verse','2:38'],['rockstar','Post Malone','Beerbongs & Bentleys','3:38'],
    ['Circles','Post Malone',"Hollywood's Bleeding",'3:35'],['Congratulations','Post Malone','Stoney','3:40'],
    ['Better Now','Post Malone','Beerbongs & Bentleys','3:51'],['Psycho','Post Malone','Beerbongs & Bentleys','3:41'],
    ['I Fall Apart','Post Malone','Stoney','3:43'],['White Iverson','Post Malone','Stoney','4:14'],
    ['Goodbyes','Post Malone',"Hollywood's Bleeding",'2:54'],['Chemical','Post Malone','Austin','3:04'],
    // Ed Sheeran
    ['Shape of You','Ed Sheeran','÷','3:53'],['Perfect','Ed Sheeran','÷','4:23'],
    ['Photograph','Ed Sheeran','x','4:18'],['Thinking out Loud','Ed Sheeran','x','4:41'],
    ['Bad Habits','Ed Sheeran','=','3:51'],['Shivers','Ed Sheeran','=','3:27'],
    ['Castle on the Hill','Ed Sheeran','÷','4:21'],['Galway Girl','Ed Sheeran','÷','2:50'],
    ['Happier','Ed Sheeran','÷','3:27'],['Perfect Duet','Ed Sheeran','÷','4:19'],
    // Lana Del Rey
    ['Summertime Sadness (Remix)','Lana Del Rey','Born to Die','3:34'],['Video Games','Lana Del Rey','Born to Die','4:42'],
    ['Born to Die','Lana Del Rey','Born to Die','4:46'],['Young and Beautiful','Lana Del Rey','The Great Gatsby','3:56'],
    ['West Coast','Lana Del Rey','Ultraviolence','4:16'],['Say Yes to Heaven','Lana Del Rey','Did You Know','3:29'],
    ['Summertime Sadness','Lana Del Rey','Born to Die','4:25'],['Lust For Life','Lana Del Rey','Lust for Life','4:24'],
    ['Cinnamon Girl','Lana Del Rey','Norman Fucking Rockwell!','5:00'],["Doin' Time",'Lana Del Rey','Norman Fucking Rockwell!','3:22'],
    // Khalid
    ['lovely (with Billie Eilish)','Khalid','lovely','3:20'],['Location','Khalid','American Teen','3:39'],
    ['Young Dumb & Broke','Khalid','American Teen','3:22'],['Talk','Khalid','Free Spirit','3:17'],
    ['Eastside','Khalid','Eastside','2:53'],['Better','Khalid','Free Spirit','3:49'],
    ['Love Lies','Khalid','Love Lies','3:21'],['Silence','Khalid','Silence','3:00'],
    ['OTW','Khalid','American Teen','4:23'],['Coaster','Khalid','Everything Is 4','3:26'],
    // BTS
    ['Dynamite','BTS','Dynamite','3:19'],['Butter','BTS','Butter','2:44'],
    ['Boy With Luv','BTS','MAP OF THE SOUL','3:49'],['My Universe','BTS','Music of the Spheres','3:46'],
    ['Permission to Dance','BTS','Butter','3:07'],['Life Goes On','BTS','BE','3:27'],
    ['Fake Love','BTS','LOVE YOURSELF','4:02'],['Blood Sweat & Tears','BTS','WINGS','3:37'],
    ['DNA','BTS','LOVE YOURSELF','3:43'],['Spring Day','BTS','WINGS','4:34'],
    // Halsey
    ['Closer','Halsey','Collage','4:04'],['Without Me','Halsey','Manic','3:21'],
    ['Eastside (with Benny Blanco)','Halsey','Eastside','2:53'],['Bad At Love','Halsey','hopeless fountain kingdom','3:01'],
    ['Him & I','Halsey','Beautiful & Damned','4:28'],['You should be sad','Halsey','Manic','3:25'],
    ['Graveyard','Halsey','Manic','3:01'],['Gasoline','Halsey',"If I Can't Have Love",'3:19'],
    ['Sorry','Halsey','Badlands','3:40'],['New Americana','Halsey','Badlands','3:03']
];

// ========== INITIALIZE DEFAULT SONGS ==========
function initDefaultSongs() {
    const existing = DB.get('songs');
    if (existing && existing.length > 0) {
        // Automatically start fetching real Apple Music covers and previews in the background
        setTimeout(enrichSongsWithRealData, 1000);
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
        audioUrl: null, // Will be enriched with Apple Music live preview
        uploadedBy: 'system',
        createdAt: Date.now(),
        plays: Math.floor(Math.random() * 500000000) + 1000000,
    }));

    DB.set('songs', songs);
    setTimeout(enrichSongsWithRealData, 1000);
}

// ========== BACKGROUND ENRICHER ==========
// Progressively fetches real Apple Music 30s audio previews and official 600x600 artwork for songs
let isEnriching = false;
async function enrichSongsWithRealData() {
    if (isEnriching || typeof fetchAppleMusicTrack !== 'function') return;
    isEnriching = true;

    let songs = DB.get('songs') || [];
    // Prioritize top hits and recent tracks
    let unEnriched = songs.filter(s => s.uploadedBy === 'system' && !s.appleMusicVerified).slice(0, 15);

    for (let song of unEnriched) {
        try {
            const realData = await fetchAppleMusicTrack(song.title, song.artist);
            if (realData && realData.audioUrl) {
                song.audioUrl = realData.audioUrl;
                if (realData.cover) song.cover = realData.cover;
                if (realData.album) song.album = realData.album;
                song.appleMusicVerified = true;

                // Update DB silently
                const idx = songs.findIndex(s => s.id === song.id);
                if (idx >= 0) {
                    songs[idx] = song;
                    DB.set('songs', songs);
                }
            }
            await new Promise(r => setTimeout(r, 600)); // Gentle rate limit
        } catch(e) {}
    }

    isEnriching = false;
    // Refresh view if on home or browse
    if (typeof renderView === 'function' && ['home', 'browse'].includes(currentView)) {
        renderView(currentView, currentViewData);
    }
}

// ========== DATA ACCESSORS ==========
function getAllSongs() { return DB.get('songs') || []; }
function getUserSongs() { return getAllSongs().filter(s => s.uploadedBy === currentUser?.id); }
