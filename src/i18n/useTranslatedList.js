import { useEffect, useState } from 'react';

import { translateBatch, getCached, loadDynCache } from './dynamicTranslate';
import { useLang } from './autoTranslate';

export const useTranslatedList = (list, fields) => {
    const lang = useLang();
    const [, force] = useState(0);

    const safeList = Array.isArray(list) ? list : [];

    useEffect(() => {
        if (lang === 'en' || !safeList.length) return;
        let alive = true;
        (async () => {
            await loadDynCache();
            const texts = [];
            safeList.forEach(item =>
                fields.forEach(f => item?.[f] && texts.push(String(item[f]))),
            );
            const changed = await translateBatch(texts);
            if (changed && alive) force(n => n + 1);
        })();
        return () => {
            alive = false;
        };
    }, [list, lang]);

    if (lang === 'en') return safeList;

    return safeList.map(item => {
        const copy = { ...item };
        fields.forEach(f => {
            if (item?.[f]) copy[f] = getCached(String(item[f])) || item[f];
        });
        return copy;
    });
};