import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import colors from '../colors/Colors';
import { setLang, useLang } from '../src/i18n/autoTranslate';


const OPTIONS = [
    { code: 'en', label: 'English', sub: 'English' },
    { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
];

const SettingScreen = () => {
    const navigation = useNavigation();
    const lang = useLang();

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
            <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

            <View style={{ height: 56, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 17, fontFamily: 'Montserrat-ExtraBold' }}>
                    Settings
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={{ margin: 14, backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Icon name="translate" size={20} color={colors.primary} />
                    <Text style={{ marginLeft: 8, fontSize: 15, fontFamily: 'Montserrat-ExtraBold', color: '#1F2937' }}>
                        Language
                    </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6B7280', fontFamily: 'SemiBold24', marginBottom: 10 }}>
                    Choose your app language
                </Text>

                {OPTIONS.map((o) => {
                    const active = lang === o.code;
                    return (
                        <TouchableOpacity
                            key={o.code}
                            activeOpacity={0.8}
                            onPress={() => setLang(o.code)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 12,
                                borderRadius: 10,
                                marginTop: 8,
                                borderWidth: 1,
                                borderColor: active ? colors.primary : '#E5E7EB',
                                backgroundColor: active ? '#EFF4FF' : '#fff',
                            }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, color: '#111827', fontFamily: 'Montserrat-ExtraBold' }}>{o.label}</Text>
                                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{o.sub}</Text>
                            </View>
                            {active && <Icon name="check-circle" size={22} color={colors.primary} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

export default SettingScreen;