// ListBirthday.js
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Platform,
    StatusBar,
    TextInput,
    Linking,
} from 'react-native';
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { ENDPOINTS } from '../../CommonFile/Constant';

// Shimmer imports
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';


// ---- NEW: check karo ki aaj is member ka birthday hai ya nahi ----
const isBirthdayToday = dob => {
    if (!isValidDob(dob)) return false;
    const d = new Date(dob);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
};

// 👈 NAYA — aane wale birthday tak kitne din baaki hain (agar is saal ka nikal
// chuka hai to agle saal ka calculate karega, isse year-wrap khud handle ho jaata hai)
const getDaysUntilBirthday = dob => {
    if (!isValidDob(dob)) return Infinity;
    const d = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    next.setHours(0, 0, 0, 0);

    if (next < today) {
        next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
    }

    const diffMs = next - today;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

// 👈 NAYA — sirf IS SAAL ka days-left (wrap nahi karta). Agar is saal ka
// birthday already nikal chuka hai to null return karega — badge nahi dikhega.
const getDaysLeftThisYear = dob => {
    if (!isValidDob(dob)) return null;
    const d = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisYearOccurrence = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    thisYearOccurrence.setHours(0, 0, 0, 0);

    if (thisYearOccurrence < today) return null; // 👈 is saal chala gaya — kuch mat dikhao

    const diffMs = thisYearOccurrence - today;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const colors = {
    primary: '#002841',
    TextBtn: '#fff',
    IconColor: '#23a0d8',
    Light_color: '#c6e7f7',
    bg: '#F5F6FB',
    card: '#FFFFFF',
    border: '#EEF0F6',
    text: '#1F2233',
    subtext: '#8A8DA3',
    danger: '#DC2626',
};

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ---- NEW: dob "0000-00-00" ya empty means birthday not set yet ----
const isValidDob = dob => !!dob && dob !== '0000-00-00';

const formatDateBadge = dateStr => {
    if (!isValidDob(dateStr)) return { day: '--', mon: '--' };
    const d = new Date(dateStr);
    return { day: String(d.getDate()).padStart(2, '0'), mon: MONTHS[d.getMonth()] };
};

const formatFullDate = dateStr => {
    if (!isValidDob(dateStr)) return '';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const ListBirthday = () => {
    const navigation = useNavigation();
    const [birthdays, setBirthdays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ visible: false, item: null });
    const [deleting, setDeleting] = useState(false);
    const [wishingId, setWishingId] = useState(null);
    const [myMemberId, setMyMemberId] = useState(null);
    const [myMemberPosition, setMyMemberPosition] = useState('');
    // ---- NEW: search ----
    const [searchQuery, setSearchQuery] = useState('');

    const isAdminOrHR = myMemberPosition?.trim().toLowerCase() === 'ceo' || myMemberPosition?.trim().toLowerCase() === 'hr';
    const fetchBirthdays = async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const response = await fetch(ENDPOINTS.list_bithday);
            const json = await response.json();

            // ---- NEW: response ab members list hai (code/status/payload) ----
            if (json?.status && Array.isArray(json.payload)) {
                // sirf un members ko dikhao jinki birth date set hai
                const withDob = json.payload.filter(item => isValidDob(item.member_dob));
                setBirthdays(withDob);
            } else {
                setBirthdays([]);
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load birthdays',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBirthdays();
        }, []),
    );

    useEffect(() => {
        const getMyId = async () => {
            const id = await AsyncStorage.getItem('member_id');
            const position = await AsyncStorage.getItem('member_position'); // 👈 NAYA
            setMyMemberId(id);
            setMyMemberPosition(position || ''); // 👈 NAYA
        };
        getMyId();
    }, []);

    const handleDeleteConfirm = async () => {
        if (!deleteModal.item) return;
        try {
            setDeleting(true);
            const response = await fetch(ENDPOINTS.delete_bithday, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // ---- NEW: member_id key (pehle birthday_id tha) ----
                body: JSON.stringify({ member_id: deleteModal.item.member_id }),
            });
            const json = await response.json();
            if (json?.status) {
                setBirthdays(prev =>
                    prev.filter(b => b.member_id !== deleteModal.item.member_id)
                );
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: json.message || 'Birthday deleted successfully',
                    position: 'bottom',
                    bottomOffset: 80,
                    visibilityTime: 2000,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: json?.message || 'Something went wrong',
                    position: 'bottom',
                    bottomOffset: 80,
                    visibilityTime: 2000,
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete birthday',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        } finally {
            setDeleting(false);
            setDeleteModal({ visible: false, item: null });
        }
    };

    const handleSendWish = async (item) => {
        try {
            setWishingId(item.member_id);
            const response = await fetch(ENDPOINTS.send_birthday_wish, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: item.member_id, wisher_name: 'CEO/HR' }),
            });
            const json = await response.json();
            if (json?.status) {
                Toast.show({
                    type: 'success',
                    text1: 'Wish Sent 🎉',
                    text2: `${item.member_name} ko birthday wish bhej di gayi`,
                    position: 'bottom',
                    bottomOffset: 80,
                    visibilityTime: 2000,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: json?.message || 'Wish send nahi ho payi',
                    position: 'bottom',
                    bottomOffset: 80,
                    visibilityTime: 2000,
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to send wish',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        } finally {
            setWishingId(null);
        }
    };


    const openWhatsAppWish = (item) => {
        const mobile = item.member_mobile?.replace(/\D/g, ''); // sirf digits
        if (!mobile) {
            Toast.show({
                type: 'error',
                text1: 'No mobile number available',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
            return;
        }
        const message = `Happy Birthday ${item.member_name}! 🎉🎂 Wishing you a wonderful year ahead!`;
        const url = `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => {
            Toast.show({
                type: 'error',
                text1: 'WhatsApp not installed or invalid number',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        });
    };

    // ---- Shimmer Placeholder Component ----
    const renderPlaceholder = () => {
        const shimmerCards = Array(5).fill(null).map((_, index) => (
            <View key={`placeholder-${index}`} style={styles.card}>
                {/* Date badge shimmer */}
                <ShimmerPlaceholder
                    LinearGradient={LinearGradient}
                    style={styles.shimmerBadge}
                />
                <View style={styles.cardBody}>
                    {/* Name shimmer */}
                    <ShimmerPlaceholder
                        LinearGradient={LinearGradient}
                        style={styles.shimmerName}
                    />
                    {/* Birth date shimmer */}
                    <ShimmerPlaceholder
                        LinearGradient={LinearGradient}
                        style={styles.shimmerDate}
                    />
                    {/* Position shimmer */}
                    <ShimmerPlaceholder
                        LinearGradient={LinearGradient}
                        style={styles.shimmerEntryDate}
                    />
                </View>
                {/* Action buttons shimmer */}
                <View style={styles.actionCol}>
                    <ShimmerPlaceholder
                        LinearGradient={LinearGradient}
                        style={styles.shimmerAction}
                    />
                    <ShimmerPlaceholder
                        LinearGradient={LinearGradient}
                        style={[styles.shimmerAction, { marginTop: 8 }]}
                    />
                </View>
            </View>
        ));
        return (
            <FlatList
                data={shimmerCards}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item, index) => `shimmer-${index}`}
                renderItem={({ item }) => item}
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    // ---- NEW: filter birthdays by member name ----
    // ---- NEW: filter birthdays by member name, phir upcoming birthday
    // (kam se kam din baaki) ke hisaab se sort karo — jiska pehle aane
    // wala hai wo top pe, jiska nikal chuka hai wo apne aap niche chala
    // jayega kyunki uska "next occurrence" agle saal ka hoga (bada number)
    const filteredBirthdays = birthdays
        .filter(item => item.member_name?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => getDaysUntilBirthday(a.member_dob) - getDaysUntilBirthday(b.member_dob));

    const renderItem = ({ item }) => {
        const badge = formatDateBadge(item.member_dob);
        const todayBirthday = isBirthdayToday(item.member_dob); // ---- NEW ----
        const daysLeft = getDaysLeftThisYear(item.member_dob); // 👈 FIX — sirf is saal ka, passed wale ke liye null

        return (
            <View style={[styles.card, todayBirthday && styles.cardBirthdayToday]}>
                {/* 👈 NAYA — top-right "X days left" badge, aaj ka birthday ho to nahi dikhega (wahan 🎂 already hai) */}
                {!todayBirthday && daysLeft !== null && (
                    <View style={styles.daysLeftBadge}>
                        <Text style={styles.daysLeftText}>
                            {daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                        </Text>
                    </View>
                )}
                <View style={[styles.dateBadge, todayBirthday && styles.dateBadgeBirthdayToday]}>
                    <Text style={[styles.dateDay, todayBirthday && styles.dateDayBirthdayToday]}>{badge.day}</Text>
                    <Text style={[styles.dateMon, todayBirthday && styles.dateDayBirthdayToday]}>{badge.mon}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.memberName} numberOfLines={1}>
                            {item.member_name}
                        </Text>
                        {todayBirthday && <Text style={{ marginLeft: 6, fontSize: 16 }}>🎂</Text>}
                    </View>
                    <Text style={styles.birthDate}>{formatFullDate(item.member_dob)}</Text>
                    {item.member_position ? (
                        <Text style={styles.entryDate}>{item.member_position}</Text>
                    ) : null}

                    {todayBirthday && (
                        <TouchableOpacity
                            style={styles.wishBtn}
                            onPress={() => openWhatsAppWish(item)}
                        >
                            <Icon name="whatsapp" size={16} color="#fff" />
                            <Text style={styles.wishBtnText}>Wish on WhatsApp</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {isAdminOrHR && (
                    <View style={styles.actionCol}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('Addbirthday', { Staff: item })}
                        >
                            <Icon name="pencil-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };
    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-left" size={22} color={colors.IconColor} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Birthdays</Text>
                <View style={styles.countPill}>
                    <Text style={styles.countText}>{birthdays.length}</Text>
                </View>
            </View>

            {/* ---------------- SEARCH BAR ---------------- */}
            <View style={styles.searchWrap}>
                <Icon name="magnify" size={18} color={colors.subtext} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name..."
                    placeholderTextColor={colors.subtext}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={18} color={colors.subtext} />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                renderPlaceholder()
            ) : (
                <FlatList
                    data={filteredBirthdays}
                    // ---- NEW: member_id key ----
                    keyExtractor={item => String(item.member_id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchBirthdays(true)}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Icon name="cake-variant-outline" size={54} color={colors.subtext} />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'No matching birthdays found' : 'No birthdays added yet'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Sticky Add Birthday Button */}
            {/* <View style={styles.stickyWrap} pointerEvents="box-none">
                <TouchableOpacity
                    style={styles.addBtn}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Addbirthday')}
                >
                    <Icon name="plus" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Add Birthday</Text>
                </TouchableOpacity>
            </View> */}

            {/* Delete Confirmation Modal */}
            <Modal
                visible={deleteModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => !deleting && setDeleteModal({ visible: false, item: null })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalIconWrap}>
                            <Icon name="trash-can-outline" size={26} color={colors.danger} />
                        </View>
                        <Text style={styles.modalTitle}>Delete Birthday?</Text>
                        <Text style={styles.modalSubtitle}>
                            Are you sure you want to delete{' '}
                            <Text style={{ fontFamily: 'Roboto-Medium', color: colors.text }}>
                                {deleteModal.item?.member_name}
                            </Text>
                            's birthday?
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                disabled={deleting}
                                onPress={() => setDeleteModal({ visible: false, item: null })}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.deleteBtn]}
                                disabled={deleting}
                                onPress={handleDeleteConfirm}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.deleteBtnText}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default ListBirthday;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 54 : 18,
        paddingBottom: 14,
        backgroundColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: colors.Light_color,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        marginLeft: 12,
        fontSize: 18,
        fontFamily: 'Montserrat-ExtraBold',
        color: colors.TextBtn,
    },
    countPill: {
        minWidth: 30,
        height: 26,
        paddingHorizontal: 8,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: {
        color: colors.TextBtn,
        fontFamily: 'Roboto-Bold',
        fontSize: 12,
    },

    // ---- NEW: search bar ----
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'Roboto-Medium',
        fontSize: 13,
        color: colors.text,
    },

    card: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 2,
        position: 'relative', // 👈 daysLeftBadge absolute position ke liye
        overflow: 'hidden',   // 👈 FIX — badge card ke rounded corner se bahar na jaaye
    },
    // 👈 NAYA — top-right "X days left" badge
    // 👈 NAYA — top-right "X days left" badge
    // 👈 FIX — reference jaisa corner-pinned badge, card ke exact top-right edge par
    daysLeftBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: colors.primary,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderBottomLeftRadius: 10,
        borderTopRightRadius: 16, // card ke borderRadius (16) se match
        zIndex: 2,
    },
    daysLeftText: {
        color: '#fff',
        fontSize: 9,
        fontFamily: 'Roboto-Bold',
    },
    dateBadge: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: colors.Light_color,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dateDay: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 16,
        color: colors.primary,
    },
    dateMon: {
        fontFamily: 'Roboto-Medium',
        fontSize: 11,
        color: colors.primary,
        marginTop: -2,
    },

    cardBody: { flex: 1 },
    memberName: { fontFamily: 'Roboto-Bold', fontSize: 15, color: colors.text },
    birthDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: colors.subtext, marginTop: 2 },
    entryDate: {
        fontFamily: 'Roboto-Regular',
        fontSize: 11,
        color: colors.subtext,
        marginTop: 1,
        fontStyle: 'italic',
    },

    actionCol: { alignItems: 'center', marginLeft: 8 },
    actionBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontFamily: 'Roboto-Medium', color: colors.subtext, marginTop: 10, fontSize: 14 },

    stickyWrap: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 26,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: colors.primary,
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 6,
    },
    addBtnText: {
        color: '#fff',
        fontFamily: 'Roboto-Bold',
        fontSize: 14,
        marginLeft: 8,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    modalBox: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 22,
        alignItems: 'center',
    },
    modalIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    modalTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 16, color: colors.text },
    modalSubtitle: {
        fontFamily: 'Roboto-Regular',
        fontSize: 13,
        color: colors.subtext,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 19,
    },
    modalActions: { flexDirection: 'row', marginTop: 20, width: '100%' },
    modalBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: { backgroundColor: colors.bg, marginRight: 8 },
    cancelBtnText: { fontFamily: 'Roboto-Bold', color: colors.text, fontSize: 14 },
    deleteBtn: { backgroundColor: colors.danger, marginLeft: 8 },
    deleteBtnText: { fontFamily: 'Roboto-Bold', color: '#fff', fontSize: 14 },

    // ---- Shimmer styles ----
    shimmerBadge: {
        width: 52,
        height: 52,
        borderRadius: 12,
        marginRight: 12,
    },
    shimmerName: {
        width: '70%',
        height: 16,
        borderRadius: 4,
        marginBottom: 4,
    },
    shimmerDate: {
        width: '50%',
        height: 12,
        borderRadius: 4,
        marginBottom: 4,
    },
    shimmerEntryDate: {
        width: '40%',
        height: 11,
        borderRadius: 4,
        marginBottom: 4,
    },
    shimmerAction: {
        width: 34,
        height: 34,
        borderRadius: 10,
    },
    // ---- NEW: today's birthday highlight ----
    cardBirthdayToday: {
        backgroundColor: '#FFF7E6',
        borderWidth: 1.5,
        borderColor: '#FFB020',
    },
    dateBadgeBirthdayToday: {
        backgroundColor: '#FFB020',
    },
    dateDayBirthdayToday: {
        color: '#fff',
    },
    wishBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#FF7A00',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 8,
    },
    wishBtnText: {
        color: '#fff',
        fontFamily: 'Roboto-Bold',
        fontSize: 12,
        marginLeft: 5,
    },

    // ---- NEW: today's birthday highlight ----
    cardBirthdayToday: {
        backgroundColor: '#FFF7E6',
        borderWidth: 1.5,
        borderColor: '#FFB020',
    },
    dateBadgeBirthdayToday: {
        backgroundColor: '#FFB020',
    },
    dateDayBirthdayToday: {
        color: '#fff',
    },
});