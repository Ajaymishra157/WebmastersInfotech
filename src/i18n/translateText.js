import AsyncStorage from '@react-native-async-storage/async-storage';
import TranslateText, { Languages } from '@react-native-ml-kit/translate-text';
import { dictLookup } from './autoTranslate';   // 👈 add

const mem = {};
const PREFIX = 'tr_hi_';

export const translateToHindi = async (text) => {
    if (typeof text !== 'string' || !text.trim()) return text;
    if (/[\u0900-\u097F]/.test(text)) return text;

    const d = dictLookup(text);        // 👈 add
    if (d) return d;                   // 👈 add

    if (mem[text]) return mem[text];
    const saved = await AsyncStorage.getItem(PREFIX + text);
    if (saved) { mem[text] = saved; return saved; }

    try {
        const r = await TranslateText.translate({
            text,
            sourceLanguage: Languages.ENGLISH,
            targetLanguage: Languages.HINDI,
            downloadModelIfNeeded: true,
        });
        const out = typeof r === 'string' ? r : r?.text || text;
        mem[text] = out;
        AsyncStorage.setItem(PREFIX + text, out);
        return out;
    } catch (e) {
        return text; // fail ho to English hi dikhao
    }
};

