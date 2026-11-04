import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = 'YOUR_GOOGLE_TRANSLATE_KEY';
const CACHE_KEY = 'dyn_hi_cache';

let cache = {};          // memory cache
let loaded = false;
let pending = new Set(); // duplicate calls rokne ke liye
let saveTimer = null;

export const loadDynCache = async () => {
    if (loaded) return;
    try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) cache = JSON.parse(raw);
    } catch (e) { }
    loaded = true;
};

const saveCache = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }, 1000);
};

export const getCached = (text) => cache[text];

// bahut saare strings ek saath translate (1 API call)
export const translateBatch = async (texts) => {
    const todo = [...new Set(texts)].filter(
        (t) => t && /[A-Za-z]/.test(t) && !cache[t] && !pending.has(t),
    );
    if (!todo.length) return false;

    todo.forEach((t) => pending.add(t));
    try {
        const res = await fetch(
            `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: todo, source: 'en', target: 'hi', format: 'text' }),
            },
        );
        const json = await res.json();
        console.log('TRANSLATE RESPONSE:', JSON.stringify(json).slice(0, 300))
        const out = json?.data?.translations || [];
        out.forEach((o, i) => {
            cache[todo[i]] = o.translatedText;
        });
        saveCache();
        return true;
    } catch (e) {
        console.log('translate fail', e);
        return false;
    } finally {
        todo.forEach((t) => pending.delete(t));
    }
};