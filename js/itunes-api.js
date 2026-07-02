/**
 * STREAMS — iTunes/Apple Music API (JSONP only — guaranteed CORS-free)
 * Fetches real 30s audio previews and official 600x600 album artwork
 */

const ITUNES_CACHE = {};
const DEEZER_CACHE = {};
const NEGATIVE_CACHE = {}; // remembers lookups that found nothing, so we don't re-hit the network every retry
const NEGATIVE_TTL_MS = 10 * 60 * 1000;
let _jsonpId = 0;

function normalizeAppleText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildAppleMusicSearchQueries(title, artist) {
    const cleanTitle = normalizeAppleText(title).replace(/\b(the|a|an)\b/g, '').trim();
    const cleanArtist = normalizeAppleText(artist).replace(/\b(the|a|an)\b/g, '').trim();
    const queries = [];
    const pushUnique = (query) => {
        if (query && !queries.includes(query)) queries.push(query);
    };

    pushUnique(`${cleanTitle} ${cleanArtist}`.trim());
    pushUnique(`${cleanArtist} ${cleanTitle}`.trim());
    pushUnique(cleanTitle);
    pushUnique(cleanArtist);
    return queries.slice(0, 5);
}

function scoreAppleMusicResult(result, title, artist) {
    const normalizedTitle = normalizeAppleText(title);
    const normalizedArtist = normalizeAppleText(artist);
    const resultTitle = normalizeAppleText(result.trackName || result.collectionName || result.artistName || '');
    const resultArtist = normalizeAppleText(result.artistName || result.collectionArtistName || '');

    let score = 0;
    if (result.previewUrl) score += 80;
    if (result.artworkUrl100) score += 45;
    if (resultTitle && normalizedTitle) {
        if (resultTitle === normalizedTitle) score += 90;
        else if (resultTitle.includes(normalizedTitle) || normalizedTitle.includes(resultTitle)) score += 45;
    }
    if (resultArtist && normalizedArtist) {
        if (resultArtist === normalizedArtist) score += 60;
        else if (resultArtist.includes(normalizedArtist) || normalizedArtist.includes(resultArtist)) score += 25;
    }
    if (result.collectionName) score += 10;
    return score;
}

function toHighResArtwork(url) {
    return url ? url.replace('100x100bb', '600x600bb') : null;
}

/**
 * Core JSONP request to iTunes Search API
 * This is the ONLY reliable way to call iTunes from a browser without a backend
 */
function itunesJSONP(query, entity, limit) {
    return new Promise((resolve) => {
        const cbName = '_itcb' + (++_jsonpId) + '_' + Math.round(Math.random() * 99999);
        const script = document.createElement('script');
        const encoded = encodeURIComponent(query);
        script.src = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=${entity}&limit=${limit}&country=US&lang=en_us&callback=${cbName}`;

        const timeout = setTimeout(() => { cleanup(); resolve(null); }, 3500);

        function cleanup() {
            clearTimeout(timeout);
            delete window[cbName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[cbName] = function(data) {
            cleanup();
            resolve(data && data.results ? data.results : null);
        };

        script.onerror = () => { cleanup(); resolve(null); };
        document.head.appendChild(script);
    });
}

async function itunesFetchViaProxy(query, entity, limit) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=${entity}&limit=${limit}&country=US&lang=en_us`;
    const candidates = [
        url,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];

    for (const candidate of candidates) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const response = await fetch(candidate, { headers: { Accept: 'application/json' }, signal: controller.signal });
            clearTimeout(timer);
            if (!response.ok) continue;
            const text = await response.text();
            let payload = null;
            try {
                payload = JSON.parse(text);
            } catch (e) {
                const callbackMatch = text.match(/^[\s\S]*?\((\{[\s\S]*\})\)\s*;?\s*$/);
                if (callbackMatch) {
                    payload = JSON.parse(callbackMatch[1]);
                }
            }
            if (payload && Array.isArray(payload.results)) return payload.results;
            if (payload && payload.resultCount && Array.isArray(payload.results)) return payload.results;
        } catch (e) {}
    }

    return null;
}

/**
 * Fetch real Apple Music track data
 * Returns: { audioUrl, cover, album, duration } or null
 */
async function fetchDeezerTrack(title, artist) {
    const cacheKey = 'dz_' + (title + '___' + artist).toLowerCase().trim();
    if (DEEZER_CACHE[cacheKey]) return DEEZER_CACHE[cacheKey];

    try {
        const query = `${title} ${artist}`.trim();
        const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) return null;
        const data = await response.json();
        const track = (data.data || []).find(item => item?.preview) || data.data?.[0] || null;
        if (!track) return null;

        const result = {
            audioUrl: track.preview || null,
            cover: track.album?.cover_xl || track.album?.cover_big || null,
            album: track.album?.title || null,
            duration: track.duration ? Math.floor(track.duration / 60) + ':' + (track.duration % 60 < 10 ? '0' : '') + (track.duration % 60) : null
        };
        DEEZER_CACHE[cacheKey] = result;
        return result;
    } catch (e) {
        return null;
    }
}

async function fetchAppleMusicTrack(title, artist) {
    const cacheKey = (title + '___' + artist).toLowerCase().trim();
    if (ITUNES_CACHE[cacheKey]) return ITUNES_CACHE[cacheKey];
    if (NEGATIVE_CACHE[cacheKey] && Date.now() - NEGATIVE_CACHE[cacheKey] < NEGATIVE_TTL_MS) return null;

    // Fire the top search queries concurrently instead of one-at-a-time — this is what let
    // a single lookup take 10-60s before (sequential queries x sequential entity fallbacks).
    // Capped at 2 (not more) to avoid tripping iTunes' per-IP rate limit under enrichment load.
    const searchQueries = buildAppleMusicSearchQueries(title, artist).slice(0, 2);
    const resultSets = await Promise.all(searchQueries.map(async (query) => {
        let results = await itunesJSONP(query, 'song', 6);
        if (!results || results.length === 0) {
            results = await itunesFetchViaProxy(query, 'song', 6);
        }
        return results || [];
    }));

    let bestMatch = null;
    for (const results of resultSets) {
        for (const result of results) {
            const score = scoreAppleMusicResult(result, title, artist);
            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { result, score };
            }
        }
    }

    let result = null;
    if (bestMatch) {
        const match = bestMatch.result;
        const cover = toHighResArtwork(match.artworkUrl100);
        const secs = match.trackTimeMillis ? Math.round(match.trackTimeMillis / 1000) : null;
        const duration = secs
            ? Math.floor(secs / 60) + ':' + (secs % 60 < 10 ? '0' : '') + (secs % 60)
            : null;

        result = {
            audioUrl: match.previewUrl || null,
            cover: cover,
            album: match.collectionName || null,
            duration: duration
        };
    } else {
        result = await fetchDeezerTrack(title, artist);
    }

    if (result) {
        ITUNES_CACHE[cacheKey] = result;
    } else {
        NEGATIVE_CACHE[cacheKey] = Date.now();
    }
    return result;
}

/**
 * Fetch real artist image from Apple Music
 * Returns: high-res image URL string or null
 */
async function fetchDeezerArtistImage(artistName) {
    const cacheKey = 'dz_artist_' + artistName.toLowerCase().trim();
    if (DEEZER_CACHE[cacheKey]) return DEEZER_CACHE[cacheKey];

    try {
        const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`);
        if (!response.ok) return null;
        const data = await response.json();
        const artist = data.data?.[0];
        const img = artist?.picture_xl || artist?.picture_big || artist?.picture_medium || null;
        if (img) DEEZER_CACHE[cacheKey] = img;
        return img;
    } catch (e) {
        return null;
    }
}

async function fetchArtistImage(artistName) {
    const cacheKey = 'artist_' + artistName.toLowerCase().trim();
    if (ITUNES_CACHE[cacheKey]) return ITUNES_CACHE[cacheKey];

    const queries = buildAppleMusicSearchQueries(artistName, '').slice(0, 2);

    // Run the artist-entity and song-entity lookups for every query concurrently
    // instead of sequentially — this was the slowest part of populating artist rows.
    const [artistResultSets, songResultSets] = await Promise.all([
        Promise.all(queries.map(async (query) => {
            let results = await itunesJSONP(query, 'musicArtist', 3);
            if (!results || results.length === 0) results = await itunesFetchViaProxy(query, 'musicArtist', 3);
            return results || [];
        })),
        Promise.all(queries.map(async (query) => {
            let results = await itunesJSONP(query, 'song', 3);
            if (!results || results.length === 0) results = await itunesFetchViaProxy(query, 'song', 3);
            return results || [];
        }))
    ]);

    const artistMatch = artistResultSets.flat().find(r => r?.artworkUrl100);
    const songMatch = songResultSets.flat().find(r => r?.artworkUrl100);
    const match = artistMatch || songMatch;

    if (match?.artworkUrl100) {
        const img = toHighResArtwork(match.artworkUrl100);
        ITUNES_CACHE[cacheKey] = img;
        return img;
    }

    const fallbackImg = await fetchDeezerArtistImage(artistName);
    if (fallbackImg) {
        ITUNES_CACHE[cacheKey] = fallbackImg;
    }
    return fallbackImg;
}

console.log('🍎 iTunes API engine loaded (JSONP mode)');
