// ===== HTML ko plain text preview mein badalne ka helper =====
// Tags hataata hai + saari HTML entities (&ndash;, &rsquo;, &nbsp;, &#8211; etc.) decode karta hai

const NAMED_ENTITIES = {
    nbsp: ' ',
    ensp: ' ',
    emsp: ' ',
    thinsp: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    ndash: '–',
    mdash: '—',
    lsquo: '‘',
    rsquo: '’',
    sbquo: '‚',
    ldquo: '“',
    rdquo: '”',
    bdquo: '„',
    hellip: '…',
    bull: '•',
    middot: '·',
    copy: '©',
    reg: '®',
    trade: '™',
    euro: '€',
    pound: '£',
    yen: '¥',
    cent: '¢',
    rupee: '₹',
    times: '×',
    divide: '÷',
    laquo: '«',
    raquo: '»',
    deg: '°',
    larr: '←',
    rarr: '→',
    uarr: '↑',
    darr: '↓',
    hearts: '♥',
    check: '✓',
};

const decodeEntitiesOnce = (str) =>
    str
        // numeric decimal: &#8211;
        .replace(/&#(\d+);/g, (_, dec) => {
            try {
                return String.fromCodePoint(parseInt(dec, 10));
            } catch (e) {
                return '';
            }
        })
        // numeric hex: &#x2013;
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
            try {
                return String.fromCodePoint(parseInt(hex, 16));
            } catch (e) {
                return '';
            }
        })
        // named: &ndash; &rsquo; etc.
        .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name) => {
            const key = name.toLowerCase();
            return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key)
                ? NAMED_ENTITIES[key]
                : match; // unknown entity ho to jaise hai waise rehne do
        });

export const stripHtml = (html) => {
    if (!html) return '';

    let text = String(html)
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|li|div|h[1-6])>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');

    // 2 baar decode: double-encoded cases (&amp;ndash; -> &ndash; -> –) bhi handle ho jayenge
    text = decodeEntitiesOnce(text);
    text = decodeEntitiesOnce(text);

    return text
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};