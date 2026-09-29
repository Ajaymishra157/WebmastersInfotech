// ListFestival.js
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
    SectionList,
} from 'react-native';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { ENDPOINTS } from '../../CommonFile/Constant';

// Shimmer imports
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    active: '#16A34A',
    activeBg: '#DCFCE7',
    deactive: '#DC2626',
    deactiveBg: '#FEE2E2',
    danger: '#DC2626',
    upcoming: '#0284C7',
    upcomingBg: '#E0F2FE',
    past: '#6B7280',
    pastBg: '#EDEEF2',
};

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const formatDateBadge = dateStr => {
    if (!dateStr) return { day: '--', mon: '--' };
    const d = new Date(dateStr);
    return { day: String(d.getDate()).padStart(2, '0'), mon: MONTHS[d.getMonth()] };
};

const formatFullDate = dateStr => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Client-side truth for past/upcoming — doesn't rely on API's festival_type,
// just compares festival_date to today (midnight-safe compare on date only).
const computeIsUpcoming = dateStr => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime();
};

const ListFestival = () => {
    const navigation = useNavigation();

    // allFestivals = full unfiltered data from API (year: "")
    const [allFestivals, setAllFestivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ visible: false, item: null });
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [statusModal, setStatusModal] = useState({ visible: false, item: null, newStatus: '' });
    const [memberId, setMemberId] = useState(null);
    const [memberPosition, setMemberPosition] = useState(''); // 👈 NAYA
    console.log('memberId:', memberId);
    // ---- Year filter (data-driven, not hardcoded) ----
    // Defaults to current year on first load. If current year has no data
    // in the API response, effectiveSelectedYear below falls back to 'All'.
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [yearModalVisible, setYearModalVisible] = useState(false);
    // 👈 NAYA — admin (member_id '1') ya HR position wale ko same access
    const isAdminOrHR = memberPosition?.trim().toLowerCase() === 'ceo' || memberPosition?.trim().toLowerCase() === 'hr';
    const fetchFestivals = async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const response = await fetch(ENDPOINTS.festival_list, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year: '' }), // empty year -> full list from API
            });
            const json = await response.json();
            if (json?.status && Array.isArray(json.payload)) {
                setAllFestivals(json.payload);
            } else {
                setAllFestivals([]);
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load festivals',
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
            fetchFestivals();
        }, []),
    );

    useEffect(() => {
        const loadMemberId = async () => {
            const id = await AsyncStorage.getItem('member_id');
            const position = await AsyncStorage.getItem('member_position'); // 👈 NAYA
            if (id) {
                setMemberId(id);
            }
            setMemberPosition(position || ''); // 👈 NAYA
            // setIsReady(true); // <-- mark ready after loading
        };
        loadMemberId();
    }, []);

    // Years present in actual data — dropdown only ever shows years that exist.
    // Newly added 2027 festival -> 2027 shows up here automatically on next fetch.
    const yearList = useMemo(() => {
        const years = new Set();
        allFestivals.forEach(f => {
            if (f.festival_date) {
                years.add(new Date(f.festival_date).getFullYear());
            }
        });
        return Array.from(years).sort((a, b) => a - b);
    }, [allFestivals]);

    // If the currently selected year no longer exists in data (e.g. after delete), fall back to 'All'
    const effectiveSelectedYear =
        selectedYear === 'All' || yearList.includes(selectedYear) ? selectedYear : 'All';

    const displayedFestivals = useMemo(() => {
        let data = [...allFestivals];
        if (effectiveSelectedYear !== 'All') {
            data = data.filter(
                f => f.festival_date && new Date(f.festival_date).getFullYear() === effectiveSelectedYear,
            );
        }
        // sort: upcoming first (soonest first), then past (most recent first)
        data.sort((a, b) => {
            const aUp = computeIsUpcoming(a.festival_date);
            const bUp = computeIsUpcoming(b.festival_date);
            if (aUp !== bUp) return aUp ? -1 : 1;
            const aTime = new Date(a.festival_date).getTime();
            const bTime = new Date(b.festival_date).getTime();
            return aUp ? aTime - bTime : bTime - aTime;
        });
        return data;
    }, [allFestivals, effectiveSelectedYear]);

    // 🔥 ADD KARO - upcoming aur past ko section mein todo
    const sections = useMemo(() => {
        const upcoming = displayedFestivals.filter(f => computeIsUpcoming(f.festival_date));
        const past = displayedFestivals.filter(f => !computeIsUpcoming(f.festival_date));
        const result = [];
        if (upcoming.length > 0) result.push({ title: 'Upcoming', data: upcoming });
        if (past.length > 0) result.push({ title: 'Past', data: past });
        return result;
    }, [displayedFestivals]);

    const handleStatusToggle = (item) => {
        const newStatus = item.festival_status === 'Active' ? 'Deactive' : 'Active';
        setStatusModal({ visible: true, item, newStatus });
    };

    const performStatusChange = async (item, newStatus) => {
        setTogglingId(item.festival_id);
        try {
            const response = await fetch(ENDPOINTS.change_status_festival, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    festival_id: item.festival_id,
                    festival_status: newStatus,
                }),
            });
            const json = await response.json();
            if (json?.status) {
                setAllFestivals(prev =>
                    prev.map(f =>
                        f.festival_id === item.festival_id
                            ? { ...f, festival_status: newStatus }
                            : f
                    )
                );
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: `Status updated to ${newStatus}`,
                    position: 'bottom',
                    bottomOffset: 80,
                    visibilityTime: 2000,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: json?.message || 'Failed to update status',
                    position: 'bottom',
                    bottomOffset: 80,
                    visibilityTime: 2000,
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Network error while updating status',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.item) return;
        try {
            setDeleting(true);
            const response = await fetch(ENDPOINTS.delete_festival, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ festival_id: deleteModal.item.festival_id }),
            });
            const json = await response.json();
            if (json?.status) {
                setAllFestivals(prev =>
                    prev.filter(f => f.festival_id !== deleteModal.item.festival_id)
                );
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: json.message || 'Festival deleted successfully',
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
                text2: 'Failed to delete festival',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        } finally {
            setDeleting(false);
            setDeleteModal({ visible: false, item: null });
        }
    };

    // ---- Shimmer Placeholder Component ----
    const renderPlaceholder = () => {
        const shimmerCards = Array(5).fill(null).map((_, index) => (
            <View key={`placeholder-${index}`} style={styles.card}>
                <ShimmerPlaceholder
                    LinearGradient={LinearGradient}
                    style={styles.shimmerBadge}
                />
                <View style={styles.cardBody}>
                    <ShimmerPlaceholder
                        LinearGradient={LinearGradient}
                        style={styles.shimmerName}
                    />
                    <ShimmerPlaceholder
                        LinearGradient={LinearGradient}
                        style={styles.shimmerDate}
                    />
                    <ShimmerPlaceholder
                        LinearGradient={LinearGradient}
                        style={styles.shimmerStatus}
                    />
                </View>
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
                keyExtractor={(item, index) => `shimmer-${index}`}
                renderItem={({ item }) => item}
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    const renderItem = ({ item }) => {
        const badge = formatDateBadge(item.festival_date);
        const isActive = item.festival_status === 'Active';
        const isToggling = togglingId === item.festival_id;
        const isUpcoming = computeIsUpcoming(item.festival_date);

        const entryDate = item.created_at || item.entry_date || item.added_date || null;

        return (
            <View
                style={[
                    styles.card,
                    {
                        borderLeftWidth: 4,
                        borderLeftColor: isUpcoming ? colors.upcoming : colors.past,
                        opacity: isUpcoming ? 1 : 0.82,
                    },
                ]}>


                <View
                    style={[
                        styles.dateBadge,
                        { backgroundColor: isUpcoming ? colors.upcomingBg : colors.pastBg },
                    ]}>
                    <Text
                        style={[
                            styles.dateDay,
                            { color: isUpcoming ? colors.upcoming : colors.past },
                        ]}>
                        {badge.day}
                    </Text>
                    <Text
                        style={[
                            styles.dateMon,
                            { color: isUpcoming ? colors.upcoming : colors.past },
                        ]}>
                        {badge.mon}
                    </Text>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.festivalName} numberOfLines={1}>
                        {item.festival_name}
                    </Text>
                    <Text style={styles.festivalDate}>{formatFullDate(item.festival_date)}</Text>
                    {entryDate && (
                        <Text style={styles.entryDate}>
                            Entry on: {formatFullDate(entryDate)}
                        </Text>
                    )}
                    {isAdminOrHR && (
                        <TouchableOpacity
                            style={[
                                styles.statusChip,
                                { backgroundColor: isActive ? colors.activeBg : colors.deactiveBg },
                            ]}
                            onPress={() => handleStatusToggle(item)}
                            disabled={isToggling}
                            activeOpacity={0.7}
                        >
                            {isToggling ? (
                                <ActivityIndicator size="small" color={isActive ? colors.active : colors.deactive} />
                            ) : (
                                <>
                                    <View
                                        style={[
                                            styles.statusDot,
                                            { backgroundColor: isActive ? colors.active : colors.deactive },
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: isActive ? colors.active : colors.deactive },
                                        ]}
                                    >
                                        {item.festival_status}
                                    </Text>
                                    <Icon
                                        name="chevron-down"
                                        size={14}
                                        color={isActive ? colors.active : colors.deactive}
                                        style={{ marginLeft: 4 }}
                                    />
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
                {isAdminOrHR && (
                    <View style={styles.actionCol}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('AddFestival', { festival: item })}
                        >
                            <Icon name="pencil-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { marginTop: 8 }]}
                            onPress={() => setDeleteModal({ visible: true, item })}
                        >
                            <Icon name="trash-can-outline" size={18} color={colors.danger} />
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
                <Text style={styles.headerTitle}>Festivals</Text>
                <View style={styles.countPill}>
                    <Text style={styles.countText}>{displayedFestivals.length}</Text>
                </View>
            </View>

            {/* Year Dropdown - full width */}
            <View style={styles.yearRow}>
                <TouchableOpacity
                    style={styles.yearDropdownBtn}
                    activeOpacity={0.8}
                    onPress={() => setYearModalVisible(true)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="calendar-month-outline" size={17} color={colors.primary} />
                        <Text style={styles.yearDropdownText}>
                            {effectiveSelectedYear === 'All' ? 'All Years' : effectiveSelectedYear}
                        </Text>
                    </View>
                    <Icon name="chevron-down" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                renderPlaceholder()
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => String(item.festival_id)}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeaderWrap}>
                            <Text style={styles.sectionHeaderText}>{title}</Text>
                        </View>
                    )}
                    contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    stickySectionHeadersEnabled={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchFestivals(true)}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Icon name="party-popper" size={54} color={colors.subtext} />
                            <Text style={styles.emptyText}>
                                {effectiveSelectedYear === 'All'
                                    ? 'No festivals added yet'
                                    : `No festivals found for ${effectiveSelectedYear}`}
                            </Text>
                        </View>
                    }
                />
            )}
            {isAdminOrHR && (
                <View style={styles.stickyWrap} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.addBtn}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('AddFestival')}
                    >
                        <Icon name="plus" size={20} color="#fff" />
                        <Text style={styles.addBtnText}>Add Festival</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Year Selection Modal */}
            <Modal
                visible={yearModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setYearModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setYearModalVisible(false)}
                >
                    <View style={styles.yearModalBox} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Select Year</Text>

                        <TouchableOpacity
                            style={[
                                styles.yearOption,
                                effectiveSelectedYear === 'All' && { backgroundColor: colors.Light_color },
                            ]}
                            onPress={() => {
                                setSelectedYear('All');
                                setYearModalVisible(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.yearOptionText,
                                    effectiveSelectedYear === 'All' && {
                                        color: colors.primary,
                                        fontFamily: 'Roboto-Bold',
                                    },
                                ]}
                            >
                                All Years
                            </Text>
                            {effectiveSelectedYear === 'All' && (
                                <Icon name="check-circle" size={18} color={colors.primary} />
                            )}
                        </TouchableOpacity>

                        {yearList.length === 0 ? (
                            <Text style={styles.noYearText}>No festival data yet</Text>
                        ) : (
                            yearList.map(y => {
                                const isSelected = y === effectiveSelectedYear;
                                return (
                                    <TouchableOpacity
                                        key={y}
                                        style={[
                                            styles.yearOption,
                                            isSelected && { backgroundColor: colors.Light_color },
                                        ]}
                                        onPress={() => {
                                            setSelectedYear(y);
                                            setYearModalVisible(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.yearOptionText,
                                                isSelected && { color: colors.primary, fontFamily: 'Roboto-Bold' },
                                            ]}
                                        >
                                            {y}
                                        </Text>
                                        {isSelected && (
                                            <Icon name="check-circle" size={18} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Delete Modal */}
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
                        <Text style={styles.modalTitle}>Delete Festival?</Text>
                        <Text style={styles.modalSubtitle}>
                            Are you sure you want to delete{' '}
                            <Text style={{ fontFamily: 'Roboto-Medium', color: colors.text }}>
                                {deleteModal.item?.festival_name}
                            </Text>

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

            {/* Status Change Modal */}
            <Modal
                visible={statusModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setStatusModal({ visible: false, item: null, newStatus: '' })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={[styles.modalIconWrap, { backgroundColor: colors.Light_color }]}>
                            <Icon name="swap-horizontal" size={26} color={colors.primary} />
                        </View>
                        <Text style={styles.modalTitle}>Change Status?</Text>
                        <Text style={styles.modalSubtitle}>
                            Are you sure you want to change the status of{' '}
                            <Text style={{ fontFamily: 'Roboto-Medium', color: colors.text }}>
                                {statusModal.item?.festival_name}
                            </Text>
                            {' to '}
                            <Text style={{ fontFamily: 'Roboto-Bold', color: colors.primary }}>
                                {statusModal.newStatus}
                            </Text>
                            ?
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setStatusModal({ visible: false, item: null, newStatus: '' })}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                                onPress={() => {
                                    const { item, newStatus } = statusModal;
                                    setStatusModal({ visible: false, item: null, newStatus: '' });
                                    performStatusChange(item, newStatus);
                                }}
                            >
                                <Text style={styles.deleteBtnText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default ListFestival;

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

    // ---- Year dropdown (full width) ----
    yearRow: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 2,
    },
    yearDropdownBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    yearDropdownText: {
        fontFamily: 'Roboto-Bold',
        fontSize: 15,
        color: colors.primary,
        marginLeft: 8,
    },
    yearModalBox: {
        width: '80%',
        maxHeight: '70%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
    },
    yearOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginTop: 6,
    },
    yearOptionText: {
        fontFamily: 'Roboto-Medium',
        fontSize: 15,
        color: colors.text,
    },
    noYearText: {
        fontFamily: 'Roboto-Regular',
        fontSize: 13,
        color: colors.subtext,
        textAlign: 'center',
        marginTop: 14,
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
        position: 'relative',
        overflow: 'hidden',
    },
    ribbon: {
        position: 'absolute',
        top: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderBottomLeftRadius: 10,
    },
    ribbonText: {
        fontFamily: 'Roboto-Bold',
        fontSize: 9,
        marginLeft: 3,
        letterSpacing: 0.3,
    },
    dateBadge: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dateDay: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 16,
    },
    dateMon: {
        fontFamily: 'Roboto-Medium',
        fontSize: 11,
        marginTop: -2,
    },

    cardBody: { flex: 1, marginTop: 6 },
    festivalName: { fontFamily: 'Roboto-Bold', fontSize: 15, color: colors.text },
    festivalDate: { fontFamily: 'Roboto-Regular', fontSize: 12, color: colors.subtext, marginTop: 2 },
    entryDate: {
        fontFamily: 'Roboto-Regular',
        fontSize: 11,
        color: colors.subtext,
        marginTop: 1,
        fontStyle: 'italic',
    },

    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 6,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    statusText: { fontFamily: 'Roboto-Medium', fontSize: 11 },

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
        backgroundColor: colors.deactiveBg,
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
    shimmerStatus: {
        width: '40%',
        height: 20,
        borderRadius: 4,
    },
    shimmerAction: {
        width: 34,
        height: 34,
        borderRadius: 10,
    },
    // 🔥 ADD KARO styles ke andar
    sectionHeaderWrap: {
        backgroundColor: colors.bg,
        paddingVertical: 8,
        marginTop: 4,
        marginBottom: 4,
    },
    sectionHeaderText: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 15,
        color: colors.primary,
        letterSpacing: 0.4,
    },
});