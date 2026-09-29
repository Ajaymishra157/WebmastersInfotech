import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../colors/Colors';
import { ENDPOINTS } from '../CommonFile/Constant';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LeaveNotificationModal = ({ visible, onClose, memberId, navigation, topOffset }) => {
    const [leaveList, setLeaveList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [birthdayList, setBirthdayList] = useState([]);
    const prevVisibleRef = useRef(visible);

    const AVATAR_COLORS = [
        { bg: '#E3F2FD', text: '#1565C0' },
        { bg: '#E8F5E9', text: '#2E7D32' },
        { bg: '#EDE7F6', text: '#5E35B1' },
        { bg: '#FFF3E0', text: '#EF6C00' },
        { bg: '#FCE4EC', text: '#C2185B' },
        { bg: '#E0F2F1', text: '#00695C' },
    ];

    const getInitials = name => {
        if (!name) return '?';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const getAvatarColor = name => {
        if (!name) return AVATAR_COLORS[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    };

    // ---- NEW: aaj ki date wali dismissed-birthdays key (roz apne aap reset ho jayegi) ----
    const getDismissedKey = () => {
        const today = new Date();
        return `dismissed_birthdays_${today.toISOString().split('T')[0]}`;
    };

    const fetchPendingLeaves = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const firstDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const formatDateLocal = date =>
                date.toLocaleDateString('en-GB').split('/').join('-'); // DD-MM-YYYY

            const response = await fetch(ENDPOINTS.ListLeave, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member_id: memberId,
                    start_date: formatDateLocal(firstDate),
                    end_date: formatDateLocal(today),
                    leave_status: 'Pending',
                }),
            });

            const result = await response.json();

            if (result.code === 200) {
                setLeaveList(result.payload || []);
            } else {
                setLeaveList([]);
            }
        } catch (error) {
            console.log('Pending Leave Fetch Error:', error);
            setLeaveList([]);
        } finally {
            setLoading(false);
        }
    };

    // ---- CHANGE: khud ka birthday exclude + already dismissed (ek baar dekh liye
    // hue) birthdays bhi exclude, taaki wo dobara na dikhein us din ----
    const fetchTodayBirthdays = async () => {
        try {
            const response = await fetch(ENDPOINTS.list_bithday, { method: 'GET' });
            const result = await response.json();

            if (result?.status && Array.isArray(result.payload)) {
                const today = new Date();
                const todayDay = today.getDate();
                const todayMonth = today.getMonth();

                const dismissedRaw = await AsyncStorage.getItem(getDismissedKey());
                const dismissedIds = dismissedRaw ? JSON.parse(dismissedRaw) : [];

                const todaysList = result.payload.filter(item => {
                    if (!item.member_dob || item.member_dob === '0000-00-00') return false;
                    const d = new Date(item.member_dob);
                    const isTodayBirthday = d.getDate() === todayDay && d.getMonth() === todayMonth;
                    if (!isTodayBirthday) return false;

                    const isMe = memberId && String(memberId) === String(item.member_id);
                    if (isMe) return false; // apna birthday banner mein already hai

                    const isDismissed = dismissedIds.includes(String(item.member_id));
                    return !isDismissed;
                });

                setBirthdayList(todaysList);
            } else {
                setBirthdayList([]);
            }
        } catch (error) {
            console.log('Today Birthday Fetch Error:', error);
            setBirthdayList([]);
        }
    };

    // ---- NEW: jo birthdays modal mein dikh chuke hain unhe dismiss list mein
    // save kar do, taaki agli baar bell open karne par wo na dikhein ----
    const dismissShownBirthdays = async () => {
        if (birthdayList.length === 0) return;
        try {
            const key = getDismissedKey();
            const dismissedRaw = await AsyncStorage.getItem(key);
            const dismissedIds = dismissedRaw ? JSON.parse(dismissedRaw) : [];
            const newIds = birthdayList.map(item => String(item.member_id));
            const merged = [...new Set([...dismissedIds, ...newIds])];
            await AsyncStorage.setItem(key, JSON.stringify(merged));
        } catch (error) {
            console.log('Dismiss Birthday Error:', error);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchPendingLeaves();
            fetchTodayBirthdays();
        }
    }, [visible]);

    // ---- NEW: modal band hote hi (visible true se false) dismiss trigger karo ----
    useEffect(() => {
        if (prevVisibleRef.current === true && visible === false) {
            dismissShownBirthdays();
        }
        prevVisibleRef.current = visible;
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
                <TouchableOpacity
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    onPress={onClose}
                    activeOpacity={1}
                />

                <View style={{ position: 'absolute', top: topOffset || 95, right: 12, width: '92%', maxHeight: '65%' }}>
                    <View
                        style={{
                            alignSelf: 'flex-end',
                            marginRight: 10,
                            width: 0,
                            height: 0,
                            borderLeftWidth: 10,
                            borderRightWidth: 10,
                            borderBottomWidth: 16,
                            borderLeftColor: 'transparent',
                            borderRightColor: 'transparent',
                            borderBottomColor: '#fff',
                        }}
                    />

                    <View
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: 16,
                            overflow: 'hidden',
                            elevation: 8,
                            shadowColor: '#000',
                            shadowOpacity: 0.2,
                            shadowRadius: 12,
                            shadowOffset: { width: 0, height: 4 },
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingTop: 14,
                                paddingBottom: 10,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons
                                    name={birthdayList.length > 0 ? 'bell-ring-outline' : 'calendar-clock-outline'}
                                    size={18}
                                    color={colors.primary}
                                />
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontFamily: 'Montserrat-ExtraBold',
                                        color: '#0F172A',
                                        marginLeft: 8,
                                    }}
                                >
                                    {birthdayList.length > 0 ? 'Notifications' : 'Pending Leaves'}
                                </Text>
                            </View>

                            <TouchableOpacity onPress={onClose}>
                                <MaterialCommunityIcons name="close-circle-outline" size={22} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 0.8, backgroundColor: '#E2E8F0' }} />
                        {/* ---- Today's Birthdays section (khud aur already-seen exclude) ---- */}
                        {birthdayList.length > 0 && (
                            <>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 16,
                                        paddingTop: 12,
                                        paddingBottom: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 16, marginRight: 6 }}>🎂</Text>
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontFamily: 'Montserrat-ExtraBold',
                                            color: '#DB2777',
                                        }}
                                    >
                                        Today's Birthdays
                                    </Text>
                                </View>

                                {birthdayList.map((item, index) => {
                                    const avatarColor = getAvatarColor(item.member_name);
                                    return (
                                        <TouchableOpacity
                                            key={item.member_id ? item.member_id.toString() : index.toString()}
                                            onPress={() => {
                                                onClose();
                                                setTimeout(() => navigation.navigate('Listbirthday'), 200);
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 12,
                                                paddingHorizontal: 16,
                                                paddingVertical: 10,
                                                borderBottomWidth: 0.5,
                                                borderBottomColor: '#F1F5F9',
                                            }}
                                        >
                                            <View
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 20,
                                                    backgroundColor: avatarColor.bg,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Text style={{ color: avatarColor.text, fontFamily: 'SemiBold28', fontSize: 14 }}>
                                                    {getInitials(item.member_name)}
                                                </Text>
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 13, fontFamily: 'SemiBold28', color: '#000' }}>
                                                    {item.member_name}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#64748B', fontFamily: 'SemiBold24', marginTop: 2 }}>
                                                    {item.member_position || 'Staff'}
                                                </Text>
                                            </View>

                                            <View
                                                style={{
                                                    backgroundColor: '#FCE7F3',
                                                    borderRadius: 6,
                                                    paddingHorizontal: 7,
                                                    paddingVertical: 2,
                                                }}
                                            >
                                                <Text style={{ fontSize: 10, fontFamily: 'SemiBold28', color: '#DB2777' }}>
                                                    🎉 Today
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                <View style={{ height: 0.8, backgroundColor: '#E2E8F0' }} />
                            </>
                        )}

                        {loading ? (
                            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        ) : (
                            <FlatList
                                data={leaveList}
                                keyExtractor={(item, index) =>
                                    item?.leave_id ? item.leave_id.toString() : index.toString()
                                }
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={{ paddingBottom: 10, flexGrow: 1 }}
                                ListEmptyComponent={() => (
                                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                        <MaterialCommunityIcons name="calendar-check-outline" size={40} color="#cbd5e1" />
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                marginTop: 8,
                                                fontFamily: 'SemiBold24',
                                                color: '#94A3B8',
                                            }}
                                        >
                                            No pending leaves
                                        </Text>
                                    </View>
                                )}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        onPress={() => {
                                            onClose();
                                            setTimeout(() => navigation.navigate('Leave'), 200);
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 12,
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            borderBottomWidth: index === leaveList.length - 1 ? 0 : 0.5,
                                            borderBottomColor: '#F1F5F9',
                                        }}
                                    >
                                        {(() => {
                                            const avatarColor = getAvatarColor(item.member_name);
                                            return (
                                                <View
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 20,
                                                        backgroundColor: avatarColor.bg,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Text style={{ color: avatarColor.text, fontFamily: 'SemiBold28', fontSize: 14 }}>
                                                        {getInitials(item.member_name)}
                                                    </Text>
                                                </View>
                                            );
                                        })()}

                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, fontFamily: 'SemiBold28', color: '#000' }}>
                                                {item.member_name}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: '#64748B', fontFamily: 'SemiBold24', marginTop: 2 }}>
                                                {item.leave_type} • {item.from_date}{item.to_date && item.to_date !== item.from_date ? ` to ${item.to_date}` : ''}
                                            </Text>
                                        </View>

                                        <View
                                            style={{
                                                backgroundColor: '#FEF3C7',
                                                borderRadius: 6,
                                                paddingHorizontal: 7,
                                                paddingVertical: 2,
                                            }}
                                        >
                                            <Text style={{ fontSize: 10, fontFamily: 'SemiBold28', color: '#92400e' }}>
                                                {item.leave_status}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default LeaveNotificationModal;