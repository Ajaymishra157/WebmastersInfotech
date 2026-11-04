import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import hiManual from './hiDict';
import hiAuto from './hiDict.auto';
import Toast from 'react-native-toast-message';

const hi = { ...hiAuto, ...hiManual };

const KEY = 'app_language';
let lang = 'en';
const listeners = new Set();
const missing = new Set();

export const getLang = () => lang;

export const setLang = async l => {
    lang = l;
    await AsyncStorage.setItem(KEY, l);
    listeners.forEach(f => f(l));
};

// app start par ek baar call karo
export const loadLang = async () => {
    const l = await AsyncStorage.getItem(KEY);
    if (l) {
        lang = l;
        listeners.forEach(f => f(l));
    }
};

export const useLang = () => {
    const [l, setL] = useState(lang);
    useEffect(() => {
        listeners.add(setL);
        return () => listeners.delete(setL);
    }, []);
    return l;
};

const norm = s => s.trim().replace(/\s+/g, ' ');

const tr = s => {
    if (lang === 'en' || typeof s !== 'string') return s;
    const key = norm(s);
    if (!key) return s;
    const v = hi[key];
    if (v) return s.replace(s.trim(), v);
    if (
        __DEV__ &&
        /[A-Za-z]/.test(key) &&
        key.length > 2 &&
        !key.includes('@') &&
        !/[{}()\\/=;]/.test(key) &&
        !missing.has(key)
    ) {
        missing.add(key);
        console.log('MISSING_HI:', JSON.stringify(key));
    }
    return s;
};

// Kahin bhi manually translate karna ho: t('Some text')
export const t = tr;

const mapChildren = ch => {
    if (typeof ch === 'string') return tr(ch);
    if (Array.isArray(ch)) return ch.map(c => (typeof c === 'string' ? tr(c) : c));
    return ch;
};

// Text patch
if (Text.render) {
    const oldRender = Text.render;
    Text.render = function (props, ref) {
        return oldRender.call(this, { ...props, children: mapChildren(props.children) }, ref);
    };
}

// TextInput placeholder patch
if (TextInput.render) {
    const oldInput = TextInput.render;
    TextInput.render = function (props, ref) {
        const p = props.placeholder ? { ...props, placeholder: tr(props.placeholder) } : props;
        return oldInput.call(this, p, ref);
    };
}

// ---------- Alert.alert patch (title, message, buttons) ----------
const _alert = Alert.alert;
Alert.alert = (title, message, buttons, options) =>
    _alert.call(
        Alert,
        tr(title),
        tr(message),
        Array.isArray(buttons)
            ? buttons.map(b => ({ ...b, text: tr(b.text) }))
            : buttons,
        options,
    );

// ---------- ToastAndroid patch ----------
const _show = ToastAndroid.show;
ToastAndroid.show = (msg, duration) => _show.call(ToastAndroid, tr(msg), duration);

const _showG = ToastAndroid.showWithGravity;
ToastAndroid.showWithGravity = (msg, duration, gravity) =>
    _showG.call(ToastAndroid, tr(msg), duration, gravity);


// ---------- react-native-toast-message patch ----------
const _toastShow = Toast.show;
Toast.show = (opts = {}) =>
    _toastShow.call(Toast, {
        ...opts,
        text1: tr(opts.text1),
        text2: tr(opts.text2),
    });