import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import colors from '../../colors/Colors'

const PRIMARY = '#3d4094'

// 👈 NAYA — har report ke liye 'roles' array define kiya hai. Jis member ka
// position us array me match kare, usi ko wo report card dikhega. Admin
// (member_id '1') ko hamesha sab reports dikhenge, koi restriction nahi.
const reportOptions = [
    {
        label: 'Attendance Report',
        subtitle: 'View staff attendance, punches & working hours',
        icon: 'calendar-check-outline',
        bg: '#E0F2FE',
        tint: '#0284C7',
        screen: 'AttendanceReport',
        roles: ['hr'], // 👈 sirf HR (aur admin) ko dikhega
    },
    {
        label: 'Project Report',
        subtitle: 'View project-wise progress & task summary',
        icon: 'chart-bar',
        bg: '#CCFBF1',
        tint: '#0D9488',
        screen: 'ProjectReport',
        roles: ['project manager'], // 👈 sirf Project Manager (aur admin) ko dikhega
    },
]

const ReportScreen = () => {
    const navigation = useNavigation()
    const [memberId, setMemberId] = useState('')
    const [memberPosition, setMemberPosition] = useState('')

    useEffect(() => {
        const loadMember = async () => {
            const id = await AsyncStorage.getItem('member_id')
            const position = await AsyncStorage.getItem('member_position')
            setMemberId(id || '')
            setMemberPosition((position || '').trim().toLowerCase())
        }
        loadMember()
    }, [])

    const isAdmin = memberPosition === 'ceo'

    // 👈 NAYA — admin ko sab reports dikhte hain; baaki sabko sirf wahi
    // reports jinke 'roles' array me unka position match ho.
    const visibleReports = reportOptions.filter(
        item => isAdmin || item.roles.includes(memberPosition)
    )

    return (
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Report</Text>

                {/* Right side placeholder */}
                <View style={styles.headerPlaceholder} />
            </View>

            {/* Report List */}
            <View
                style={{
                    padding: 14,
                    gap: 12,
                }}>
                {visibleReports.length === 0 ? (
                    <Text
                        style={{
                            textAlign: 'center',
                            color: '#9CA3AF',
                            fontSize: 13,
                            marginTop: 40,
                        }}>
                        No reports available for you.
                    </Text>
                ) : (
                    visibleReports.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate(item.screen)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#fff',
                                borderRadius: 14,
                                padding: 14,
                                gap: 12,
                                elevation: 2,
                                shadowColor: '#000',
                                shadowOpacity: 0.06,
                                shadowRadius: 6,
                                shadowOffset: { width: 0, height: 2 },
                            }}>
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: item.bg,
                                }}>
                                <Icon name={item.icon} size={26} color={item.tint} />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '700',
                                        color: '#111827',
                                    }}>
                                    {item.label}
                                </Text>

                                <Text
                                    style={{
                                        fontSize: 11.5,
                                        color: '#9CA3AF',
                                        marginTop: 2,
                                    }}>
                                    {item.subtitle}
                                </Text>
                            </View>

                            <Icon name="chevron-right" size={22} color="#9CA3AF" />
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </View>
    )
}

export default ReportScreen;
const styles = StyleSheet.create({

    header: {
        width: '100%',
        height: 52,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },

    headerBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },

    headerPlaceholder: {
        width: 34,
        height: 34,
    },

    headerTitle: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 17,
        color: '#fff',
    },
});