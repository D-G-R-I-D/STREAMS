/**
 * STREAMS — Apple Music & iTunes Live API Engine
 * Fetches real 30s AAC/M4A audio previews and official 600x600 album artwork directly from Apple Music
 */

const ITUNES_CACHE = {};

// Reliable fallback open-access real music streams (in case offline or iTunes preview restricted)
const FALLBACK_REAL_STREAMS = [
    'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
    'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
    'https://cdn.pixabay.com/download/audio/2022/10/25/audio_24847e1747.mp3',
    'https://cdn.pixabay.com/download/audio/2023/04/18/audio_65cf27be51.mp3',
    'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3',
    'https://cdn.pixabay.com/download/audio/2021/11/23/audio_034b58e768.mp3',
    'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3'
];

/**
 * Fetch real Apple Music track data (preview audio + high resolution cover art)
 * @param {string} title - Song title
 * @param {string} artist - Artist name
 * @returns {Promise<{audioUrl: string, cover: string, album: string, duration: string}|null>}
 */
async function fetchAppleMusicTrack(title, artist) {
    const cacheKey = `${title.toLowerCase().trim()}___${artist.toLowerCase().trim()}`;
    if (ITUNES_CACHE[cacheKey]) return ITUNES_CACHE[cacheKey];

    // Clean title for search (remove remix/feat tags for better match if needed)
    const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').trim();
    const query = encodeURIComponent(`${cleanTitle} ${artist}`);
    const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=3`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.results && data.results.length > 0) {
            // Find best matching track
            let match = data.results.find(r => r.previewUrl && r.artworkUrl100);
            if (!match) match = data.results[0];

            if (match && match.previewUrl) {
                // Upgrade 100x100 artwork to crisp 600x600 high-res Apple Music artwork
                const highResCover = match.artworkUrl100 
                    ? match.artworkUrl100.replace('100x100bb', '600x600bb')
                    : null;

                const durationSecs = match.trackTimeMillis ? Math.round(match.trackTimeMillis / 1000) : null;
                const formattedDuration = durationSecs 
                    ? `${Math.floor(durationSecs / 60)}:${(durationSecs % 60 < 10 ? '0' : '') + (durationSecs % 60)}`
                    : null;

                const result = {
                    audioUrl: match.previewUrl,
                    cover: highResCover,
                    album: match.collectionName || null,
                    duration: formattedDuration || null
                };

                ITUNES_CACHE[cacheKey] = result;
                return result;
            }
        }
    } catch (err) {
        console.warn('iTunes API standard fetch failed, trying JSONP fallback...', err.message);
        return await fetchAppleMusicJSONP(query, cacheKey);
    }

    return null;
}

/**
 * JSONP fallback for iTunes API if browser CORS policy interferes
 */
function fetchAppleMusicJSONP(query, cacheKey) {
    return new Promise((resolve) => {
        const cbName = 'itunes_cb_' + Math.round(Math.random() * 1000000);
        const script = document.createElement('script');
        script.src = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=3&callback=${cbName}`;

        const timeout = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 4000);

        function cleanup() {
            clearTimeout(timeout);
            delete window[cbName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[cbName] = function(data) {
            cleanup();
            if (data && data.results && data.results.length > 0) {
                const match = data.results.find(r => r.previewUrl) || data.results[0];
                if (match && match.previewUrl) {
                    const res = {
                        audioUrl: match.previewUrl,
                        cover: match.artworkUrl100 ? match.artworkUrl100.replace('100x100bb', '600x600bb') : null,
                        album: match.collectionName || null
                    };
                    ITUNES_CACHE[cacheKey] = res;
                    resolve(res);
                    return;
                }
            }
            resolve(null);
        };

        script.onerror = () => {
            cleanup();
            resolve(null);
        };

        document.head.appendChild(script);
    });
}

/**
 * Get a fallback real audio stream if Apple Music preview is temporarily unavailable
 */
function getFallbackRealStream(index = 0) {
    return FALLBACK_REAL_STREAMS[Math.abs(index) % FALLBACK_REAL_STREAMS.length];
}

console.log('🍎 Apple Music Live API engine loaded');
