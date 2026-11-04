const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = process.cwd();
const SRC_DIRS = ['Screen', 'src', 'components']; // apne folders
const DICT_FILE = path.join(ROOT, 'src/i18n/hiDict.js');
const AUTO_FILE = path.join(ROOT, 'src/i18n/hiDict.auto.js');
const OUT_FILE = path.join(ROOT, 'missing_hi.txt');

const MODEL = 'gemini-3.8-flash';
const API_KEY = process.env.GEMINI_API_KEY;
const BATCH = 40;

const ATTRS = ['placeholder', 'title', 'label', 'headerTitle', 'text'];
const CALLS = ['Alert.alert', 'ToastAndroid.show', 'ToastAndroid.showWithGravity', 'Toast.show'];
const KEYS = [
    'label', 'subtitle', 'title', 'description', 'desc', 'text',
    'placeholder', 'message', 'heading', 'header', 'tabLabel', 'emptyText',
    'text1', 'text2', 'msg', 'errorMessage', 'successMessage',
];

// apne helper functions ke naam yahan likho
const FUNC_NAMES = ['showToast', 'showMessage', 'showAlert', 'notify'];
const SETTER_RE = /^set\w*(Error|Err|Message|Msg|Title|Text|Label|Toast|Alert|Warning|Success|Hint|Note)$/;
const VAR_RE = /(msg|message|title|label|text|error|placeholder|heading|desc|hint|warning|tabs|options|filters|types)/i;
const VAR_SKIP = /(font|color|icon|image|url|path|key|style)/i;

const norm = s => s.trim().replace(/\s+/g, ' ');

const isText = s =>
    s.length > 1 &&
    /[A-Za-z]/.test(s) &&
    !/^https?:/i.test(s) &&
    !s.startsWith('#') &&
    !/^[\w.-]+@[\w.-]+$/.test(s) &&
    !(/[\\/]/.test(s) && !/\s/.test(s)) &&
    !/^[a-z]+[A-Z]\w*$/.test(s);

const loadObj = file => {
    if (!fs.existsSync(file)) return {};
    const code = fs
        .readFileSync(file, 'utf8')
        .replace(/export\s+default/, 'module.exports =');
    const m = { exports: {} };
    new Function('module', code)(m);
    return m.exports;
};

const walk = dir => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
        return /\.(js|jsx|tsx?)$/.test(e.name) ? [p] : [];
    });
};

const collect = (node, out) => {
    if (!node) return;
    if (node.type === 'StringLiteral') out.push(node.value);
    else if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
        out.push(node.quasis[0].value.cooked);
    else if (node.type === 'ConditionalExpression') {
        collect(node.consequent, out);
        collect(node.alternate, out);
    } else if (node.type === 'LogicalExpression') collect(node.right, out);
    else if (node.type === 'ArrayExpression')
        node.elements.forEach(e => collect(e, out));
    else if (node.type === 'ObjectExpression')
        node.properties.forEach(pr => {
            const k = pr.key && (pr.key.name || pr.key.value);
            if (pr.type === 'ObjectProperty' && KEYS.includes(k)) collect(pr.value, out);
        });
};

const calleeName = c => {
    if (c.type === 'Identifier') return c.name;
    if (c.type === 'MemberExpression' && c.object.name && c.property.name)
        return `${c.object.name}.${c.property.name}`;
    return '';
};

const found = new Set();
const add = s => {
    const k = norm(s);
    if (isText(k)) found.add(k);
};

const files = SRC_DIRS.flatMap(d => walk(path.join(ROOT, d)));

files.forEach(file => {
    let ast;
    try {
        ast = parser.parse(fs.readFileSync(file, 'utf8'), {
            sourceType: 'module',
            plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining'],
        });
    } catch (e) {
        console.log('skip (parse error):', file);
        return;
    }

    traverse(ast, {
        JSXText(p) {
            add(p.node.value);
        },
        JSXExpressionContainer(p) {
            if (p.parent.type !== 'JSXElement') return;
            const out = [];
            collect(p.node.expression, out);
            out.forEach(add);
        },
        JSXAttribute(p) {
            if (!ATTRS.includes(p.node.name.name)) return;
            const v = p.node.value;
            const out = [];
            if (v?.type === 'StringLiteral') out.push(v.value);
            else if (v?.type === 'JSXExpressionContainer') collect(v.expression, out);
            out.forEach(add);
        },
        CallExpression(p) {
            const name = calleeName(p.node.callee);
            const ok =
                CALLS.includes(name) ||
                FUNC_NAMES.includes(name) ||
                SETTER_RE.test(name);
            if (!ok) return;
            p.node.arguments.forEach(a => {
                const out = [];
                collect(a, out);
                out.forEach(add);
            });
        },
        VariableDeclarator(p) {
            const id = p.node.id;
            if (id.type !== 'Identifier') return;
            if (!VAR_RE.test(id.name) || VAR_SKIP.test(id.name)) return;
            const out = [];
            collect(p.node.init, out);
            out.forEach(add);
        },
        ObjectProperty(p) {
            const k = p.node.key.name || p.node.key.value;
            if (!KEYS.includes(k)) return;
            const out = [];
            collect(p.node.value, out);
            out.forEach(add);
        },
    });
});

const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const translateChunk = async keys => {
    const prompt =
        'Translate these English UI strings of an HR/office attendance mobile app ' +
        'into natural, simple Hindi (Devanagari). Keep brand names, emails, ' +
        '"WhatsApp", numbers, emojis, punctuation and formats like hh:mm unchanged. ' +
        'Some strings are fragments of a bigger sentence (starting or ending with a ' +
        'quote or apostrophe); translate them so they read naturally when joined. ' +
        'Return only a JSON object mapping each input string to its Hindi translation.\n\n' +
        JSON.stringify(keys);

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
            }),
        },
    );
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(JSON.stringify(json).slice(0, 300));
    return JSON.parse(text);
};

const writeAuto = auto => {
    const body = Object.keys(auto)
        .sort()
        .map(k => `  '${esc(k)}': '${esc(auto[k])}',`)
        .join('\n');
    fs.writeFileSync(AUTO_FILE, `export default {\n${body}\n};\n`);
};

const main = async () => {
    const auto = loadObj(AUTO_FILE);
    const dict = { ...auto, ...loadObj(DICT_FILE) };
    const missing = [...found].filter(k => !dict[k]).sort();

    console.log(`Files scanned: ${files.length}`);
    console.log(`Static strings found: ${found.size}`);
    console.log(`Missing in hiDict: ${missing.length}`);
    if (!missing.length) return;

    if (!API_KEY) {
        fs.writeFileSync(
            OUT_FILE,
            missing.map(k => `    '${esc(k)}': '',`).join('\n') + '\n',
        );
        console.log('GEMINI_API_KEY set nahi hai -> list missing_hi.txt me likh di.');
        return;
    }

    for (let i = 0; i < missing.length; i += BATCH) {
        const chunk = missing.slice(i, i + BATCH);
        try {
            const out = await translateChunk(chunk);
            chunk.forEach(k => {
                if (typeof out[k] === 'string' && out[k].trim()) auto[k] = out[k].trim();
            });
            console.log(`Translated ${Math.min(i + BATCH, missing.length)}/${missing.length}`);
        } catch (e) {
            console.log('Batch failed:', e.message);
            break;
        }
        await new Promise(r => setTimeout(r, 7000));
    }

    writeAuto(auto);
    const left = missing.filter(k => !auto[k]);
    console.log(`Added to hiDict.auto.js: ${missing.length - left.length}`);
    if (left.length) {
        fs.writeFileSync(OUT_FILE, left.map(k => `    '${esc(k)}': '',`).join('\n') + '\n');
        console.log(`Baaki ${left.length} -> missing_hi.txt (dobara scan chalao)`);
    }
};

main();