import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLang } from './autoTranslate';
import { translateToHindi } from './translateText';

const TText = ({ children, ...props }) => {
    const lang = useLang();
    const [out, setOut] = useState(children);

    useEffect(() => {
        let alive = true;
        if (lang !== 'hi' || typeof children !== 'string') { setOut(children); return; }
        translateToHindi(children).then((t) => alive && setOut(t));
        return () => { alive = false; };
    }, [children, lang]);

    return <Text {...props}>{out}</Text>;
};
export default TText;