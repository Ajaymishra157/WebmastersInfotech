import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,        // 👈 NAYA
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors, { baseUrl } from '../colors/Colors';
import { ENDPOINTS } from '../CommonFile/Constant';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* -------------------------------------------------------------------------- */
/*  Status config — same palette used across the app                          */
/* -------------------------------------------------------------------------- */
const STATUS_CONFIG = {
    Pending: { color: '#F59E0B', bg: '#FFF4E5', icon: 'time-outline' },
    Accepted: { color: '#2563EB', bg: '#E8F1FF', icon: 'checkmark-circle-outline' },
    Ongoing: { color: '#16A34A', bg: '#E8F9EE', icon: 'rocket-outline' },
    Pause: { color: '#F59E0B', bg: '#FFF4E5', icon: 'pause-circle-outline' },
    'Under Review': { color: '#7C3AED', bg: '#F1EAFF', icon: 'document-text-outline' },
    Completed: { color: '#6B7280', bg: '#ECEEF1', icon: 'checkmark-done-circle-outline' },
    'Re-Assigned': { color: '#DC2626', bg: '#FEE2E2', icon: 'swap-horizontal-outline' },
};
const getStatusConfig = status => STATUS_CONFIG[status] || STATUS_CONFIG.Pending;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HISTORY_PANEL_WIDTH = Math.min(360, SCREEN_WIDTH * 0.85);

/* -------------------------------------------------------------------------- */
/*  Time helpers                                                              */
/* -------------------------------------------------------------------------- */
// "01:60" / "01:00" -> minutes (hh:mm, tolerant of mm >= 60 bad data)
const parseAssignedToMinutes = timeStr => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':').map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return 0;
    const [hh, mm] = parts;
    return hh * 60 + mm;
};

// "10:30:15 Am" -> "10:30 Am" (seconds hata deta hai, baaki text same rehta hai)
const stripSecondsFromTime = timeStr => {
    if (!timeStr) return timeStr;
    return String(timeStr).replace(/(\d{1,2}:\d{2}):\d{2}/, '$1');
};
// Time Table row ke "time_taken" chip ke liye:
// - 1 min se kam ho to seconds dikhao (e.g. "20s")
// - 1 min ya usse zyada ho to sirf minutes dikhao, seconds hata ke (e.g. "1m")
const formatTimeTakenChip = totalSeconds => {
    const secs = Math.max(0, Math.floor(totalSeconds || 0));
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remSecs = secs % 60;

    if (hrs > 0) {
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    if (mins > 0) {
        return `${mins}m`;
    }
    if (remSecs > 0) {
        return `${remSecs}s`;
    }
    return '0s';
};

// "00:03:22" ya "00:03:22 Hrs" -> seconds (extra text ko strip kar deta hai)
const parseHmsToSeconds = timeStr => {
    if (!timeStr) return 0;
    // sirf digits aur colon rakho, baaki (jaise " Hrs") hata do
    const cleaned = String(timeStr).replace(/[^\d:]/g, '').trim();
    const parts = cleaned.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    const [hh, mm, ss] = parts;
    return hh * 3600 + mm * 60 + ss;
};

const formatMinutesToHM = totalMinutes => {
    const mins = Math.max(0, Math.round(totalMinutes || 0));
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs === 0) return `${remMins}m`;
    return remMins === 0 ? `${hrs}h` : `${hrs}h ${remMins}m`;
};

// const formatSecondsToHMS = totalSeconds => {
//     const secs = Math.max(0, Math.floor(totalSeconds || 0));
//     const hrs = Math.floor(secs / 3600);
//     const mins = Math.floor((secs % 3600) / 60);
//     const remSecs = secs % 60;

//     // If 24 hours or more, show days
//     if (hrs >= 24) {
//         const days = Math.floor(hrs / 24);
//         const remHrs = hrs % 24;
//         const parts = [`${days}d`];
//         if (remHrs > 0) parts.push(`${remHrs}h`);
//         if (mins > 0) parts.push(`${mins}m`);
//         // Seconds are omitted for days view (cleaner)
//         return parts.join(' ');
//     }

//     // Less than 24 hours
//     if (hrs > 0) return `${hrs}h ${mins}m ${remSecs}s`;
//     if (mins > 0) return `${mins}m ${remSecs}s`;
//     return `${remSecs}s`;
// };


const formatSecondsToHMS = totalSeconds => {
    const secs = Math.max(0, Math.floor(totalSeconds || 0));
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);

    // If 24 hours or more, show days
    if (hrs >= 24) {
        const days = Math.floor(hrs / 24);
        const remHrs = hrs % 24;
        const parts = [`${days}d`];
        if (remHrs > 0) parts.push(`${remHrs}h`);
        if (mins > 0) parts.push(`${mins}m`);
        return parts.join(' ');
    }

    // Less than 24 hours — sirf hours aur minutes, seconds nahi
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m`;
    return secs > 0 ? '<1m' : '0m';
};
/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */
const SectionHeading = ({ icon, label, count }) => (
    <View style={styles.sectionHeadingRow}>
        <Icon name={icon} size={15} color={colors.primary} />
        <Text style={styles.sectionHeadingText}>{label}</Text>
        {typeof count === 'number' && (
            <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCountText}>{count}</Text>
            </View>
        )}
    </View>
);

const InfoChip = ({ icon, label, value, tint }) => (
    <View style={styles.chip}>
        <View style={[styles.chipIconWrap, { backgroundColor: tint ? `${tint}1A` : '#F3F4F8' }]}>
            <Icon name={icon} size={14} color={tint || colors.primary} />
        </View>
        <View style={{ flexShrink: 1 }}>
            <Text style={styles.chipLabel}>{label}</Text>
            <Text style={styles.chipValue} numberOfLines={1}>{value || 'N/A'}</Text>
        </View>
    </View>
);

// Simple two-bar comparison chart (Assigned vs Taken) — built with plain
// Views so no extra charting library is needed.
const CHART_MAX_HEIGHT = 130;
const BarChart = ({ assignedMinutes, takenMinutes, takenSeconds }) => {
    const maxVal = Math.max(assignedMinutes, takenMinutes, 1);
    const assignedHeight = Math.max(4, (assignedMinutes / maxVal) * CHART_MAX_HEIGHT);
    const takenHeight = Math.max(4, (takenMinutes / maxVal) * CHART_MAX_HEIGHT);
    const overAssigned = assignedMinutes > 0 && takenMinutes > assignedMinutes;

    return (
        <View style={styles.chartWrap}>
            <View style={styles.chartBarsRow}>
                <View style={styles.chartBarCol}>
                    <Text style={styles.chartBarValue}>{formatMinutesToHM(assignedMinutes)}</Text>
                    <View style={[styles.chartBar, { height: assignedHeight, backgroundColor: '#93C5FD' }]} />
                    <Text style={styles.chartBarLabel}>Time Assigned</Text>
                </View>
                <View style={styles.chartBarCol}>
                    <Text style={[styles.chartBarValue, overAssigned && { color: '#DC2626' }]}>
                        {formatSecondsToHMS(takenSeconds)}
                    </Text>
                    <View
                        style={[
                            styles.chartBar,
                            { height: takenHeight, backgroundColor: overAssigned ? '#FCA5A5' : '#86EFAC' },
                        ]}
                    />
                    <Text style={styles.chartBarLabel}>Time Taken</Text>
                </View>
            </View>
        </View>
    );
};

const TaskDetail = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { task_id } = route.params || {};

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyModal, setHistoryModal] = useState(false);
    const historySlideAnim = useRef(new Animated.Value(HISTORY_PANEL_WIDTH)).current; // 👈 NAYA — right se slide in/out

    const [historyAtTop, setHistoryAtTop] = useState(true);
    const [historyAtBottom, setHistoryAtBottom] = useState(false);
    const [historyIsScrollable, setHistoryIsScrollable] = useState(false);
    const historyScrollRef = useRef(null);

    const [memberId, setMemberId] = useState('');
    const [memberPosition, setMemberPosition] = useState('');
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleHistoryScroll = (e) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const atTop = contentOffset.y <= 4;
        const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 4;
        setHistoryAtTop(atTop);
        setHistoryAtBottom(atBottom);
    };

    const handleHistoryContentSizeChange = (contentWidth, contentHeight) => {
        setHistoryIsScrollable(contentHeight > 400); // 400 = ScrollView ka maxHeight
    };

    // 👇 NAYA — panel ko right se slide-in karke kholta hai
    const openHistoryModal = () => {
        setHistoryAtTop(true);
        setHistoryAtBottom(false);
        setHistoryIsScrollable(false);
        setHistoryModal(true);
        historySlideAnim.setValue(HISTORY_PANEL_WIDTH);
        Animated.timing(historySlideAnim, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
        }).start();
    };

    // 👇 NAYA — panel ko right ki taraf slide-out karke band karta hai, phir Modal unmount hota hai
    const closeHistoryModal = () => {
        Animated.timing(historySlideAnim, {
            toValue: HISTORY_PANEL_WIDTH,
            duration: 220,
            useNativeDriver: true,
        }).start(() => setHistoryModal(false));
    };

    const fetchTaskDetail = async () => {
        setLoading(true);
        try {
            const response = await fetch(ENDPOINTS.task_detail, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id }),
            });
            const result = await response.json();
            if (result.code === 200) {
                setTask(result.payload);
            } else {
                setTask(null);
            }
        } catch (error) {
            console.error('Task Detail API Error:', error);
            setTask(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async () => {
        setDeleting(true);
        try {
            const response = await fetch(ENDPOINTS.DeleteTask, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id }),
            });
            const result = await response.json();
            if (result.code === 200) {
                setDeleteConfirmVisible(false);
                navigation.goBack();
            } else {
                console.error('Delete Task Failed:', result.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Delete Task Error:', error);

        }
        setDeleting(false);
    };
    const handleEdit = () => {
        setActionModalVisible(false);
        navigation.navigate('AddTask', {
            task_id: task.task_id,
            isEdit: true,
            taskData: task,
        });
    };

    useFocusEffect(
        useCallback(() => {
            if (task_id) fetchTaskDetail();
        }, [task_id])
    );

    useEffect(() => {
        const getMemberId = async () => {
            const id = await AsyncStorage.getItem('member_id');
            const position = await AsyncStorage.getItem('member_position'); // 👈 NAYA
            setMemberId(id);
            setMemberPosition(position || ''); // 👈 NAYA
        };
        getMemberId();
    }, []);
    const isAdmin = memberPosition?.trim().toLowerCase() === 'ceo';
    // 👈 NAYA — HR ko task detail me koi bhi action (Edit/Delete) nahi milega,
    // sirf view-only access hai. isAdmin check isliye taaki agar kisi ka
    // member_id '1' hai aur position bhi 'HR' hai to wo real admin hi mana jayega.
    const isHR = memberPosition?.trim().toLowerCase() === 'hr' && !isAdmin;
    // 👈 NAYA — Project Manager ko admin jaisa hi poora access milega
    const isPM = memberPosition?.trim().toLowerCase() === 'project manager' && !isAdmin;
    // 👈 NAYA — admin YA PM, dono ke liye "admin-level" access
    const isAdminLevel = isAdmin || isPM;
    const normalizedStatus = task?.task_status === 'Pause' ? 'Ongoing' : task?.task_status;
    // 👈 FIX — admin/PM ko hamesha Edit dikhega (koi status restriction nahi),
    // staff ko Pending, Accepted, ya Ongoing — in teeno status mein Edit dikhega,
    // HR ko kabhi Edit nahi dikhega
    const canEdit = !isHR && (isAdminLevel || ['Pending', 'Accepted', 'Ongoing'].includes(normalizedStatus));
    // 👈 Delete admin/PM ko (HR ko kabhi nahi), aur sirf jab task Pending status mein ho
    const canDelete = !isHR && isAdminLevel && normalizedStatus === 'Pending';
    const showMenu = canEdit || canDelete;

    if (loading) {
        return (
            <View style={styles.screen}>
                <Header
                    navigation={navigation}
                    title="Task Detail"
                    showMenu={showMenu}
                    onMenuPress={() => setActionModalVisible(true)}
                />
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
            </View>
        );
    }

    if (!task) {
        return (
            <View style={styles.screen}>
                <Header
                    navigation={navigation}
                    title="Task Detail"
                    showMenu={showMenu}
                    onMenuPress={() => setActionModalVisible(true)}
                />
                <View style={styles.emptyWrap}>
                    <Icon name="document-text-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Task not found.</Text>
                </View>
            </View>
        );
    }

    const statusCfg = getStatusConfig(task.task_status);
    const assignedMinutes = parseAssignedToMinutes(task.hours_assigned);
    const takenSeconds = parseHmsToSeconds(task.total_time_taken);
    const takenMinutes = takenSeconds / 60;
    const pct = assignedMinutes > 0 ? Math.min(100, Math.round((takenMinutes / assignedMinutes) * 100)) : 0;
    const overAssigned = assignedMinutes > 0 && takenMinutes > assignedMinutes;

    // Re-assign messages — status_history entries jinme actual note ho
    const reassignMessages = (task.status_history || []).filter(
        h => h.task_status === 'Re-Assigned' && !!h.status_note
    );

    // "Project Name (Module Name)" — module ho tabhi bracket me aayega
    const projectLine = task.module_name
        ? `${task.project_name || 'N/A'} (${task.module_name})`
        : (task.project_name || 'N/A');

    return (
        <View style={styles.screen}>
            <Header
                navigation={navigation}
                title="Task Detail"
                showMenu={showMenu}
                onMenuPress={() => setActionModalVisible(true)}
            />
            {/* 👇 NAYA — sticky status bar, ScrollView ke bahar isliye scroll se independent */}
            <TouchableOpacity
                onPress={openHistoryModal}
                activeOpacity={0.8}
                style={styles.stickyStatusBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                    <View style={[styles.stickyDot, { backgroundColor: statusCfg.color }]} />
                    <Text style={styles.stickyLabel}>Current Status:</Text>
                    <Text style={[styles.stickyValue, { color: statusCfg.color }]} numberOfLines={1}>
                        {task.task_status || 'N/A'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.stickyLinkText}>View History</Text>
                    <Icon name="chevron-forward" size={14} color={colors.primary} />
                </View>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: '#EEF2F7',
                        elevation: 2,
                    }}>

                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>

                        <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                            <View
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    backgroundColor: statusCfg.bg,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                }}>
                                <Icon name={statusCfg.icon} size={18} color={statusCfg.color} />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        fontFamily: 'Montserrat-ExtraBold',
                                        fontSize: 14,
                                        color: '#1A1B2E',
                                    }}>
                                    {task.project_name}
                                </Text>

                                {!!task.module_name && (
                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            fontFamily: 'SemiBold24',
                                            fontSize: 11,
                                            color: '#8A8D9F',
                                            marginTop: 1,
                                        }}>
                                        {task.module_name}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View
                            style={{
                                backgroundColor: statusCfg.bg,
                                borderRadius: 14,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                            }}>
                            <Text
                                style={{
                                    fontFamily: 'Montserrat-ExtraBold',
                                    fontSize: 10,
                                    color: statusCfg.color,
                                }}>
                                {task.task_status}
                            </Text>
                        </View>
                    </View>

                    <View
                        style={{
                            height: 1,
                            backgroundColor: '#F3F4F6',
                            marginVertical: 10,
                        }}
                    />

                    <Text
                        style={{
                            fontFamily: 'Montserrat-ExtraBold',
                            fontSize: 14,
                            color: '#111827',
                        }}>
                        {task.task_name}
                    </Text>

                    {!!task.task_description && (
                        <Text
                            style={{
                                marginTop: 5,
                                fontFamily: 'SemiBold24',
                                fontSize: 12,
                                color: '#6B7280',
                                lineHeight: 18,
                            }}>
                            {task.task_description}
                        </Text>
                    )}
                </View>

                {/* Time summary */}
                <SectionHeading icon="stopwatch-outline" label="Time Summary" />
                <View style={styles.card}>
                    <View style={styles.chipsRow}>
                        <InfoChip icon="time-outline" label="Assigned Time" value={formatMinutesToHM(assignedMinutes)} tint={colors.primary} />
                        <InfoChip
                            icon="hourglass-outline"
                            label="Time Taken"
                            // value={takenSeconds > 0 ? formatSecondsToHMS(takenSeconds) : '0s'}
                            value={takenSeconds > 0 ? formatSecondsToHMS(takenSeconds) : '0m'}
                            tint={overAssigned ? '#DC2626' : '#16A34A'}
                        />
                        {/* <InfoChip icon="play-outline" label="Started On" value={task.started_on} tint="#2563EB" />
                        <InfoChip icon="checkmark-done-outline" label="Completed On" value={task.completed_on} tint="#6B7280" /> */}
                    </View>

                    {assignedMinutes > 0 && (
                        <>
                            <View style={styles.progressTrack}>
                                <View
                                    style={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: overAssigned ? '#DC2626' : '#16A34A',
                                        width: `${pct}%`,
                                    }}
                                />
                            </View>
                            <View style={styles.progressLabelRow}>
                                <Text style={[styles.progressPct, { color: overAssigned ? '#DC2626' : '#16A34A' }]}>
                                    {pct}% of assigned time used
                                </Text>
                                {overAssigned && <Text style={styles.overtimeText}>Overtime</Text>}
                            </View>
                        </>
                    )}
                </View>

                {/* Graph — Assigned vs Taken */}
                <SectionHeading icon="bar-chart-outline" label="Time Comparison" />
                <View style={styles.card}>
                    <BarChart assignedMinutes={assignedMinutes} takenMinutes={takenMinutes} takenSeconds={takenSeconds} />
                </View>

                {/* Time Table — session-wise breakdown */}
                <SectionHeading icon="list-outline" label="Time Table" count={(task.time_table || []).length} />
                <View style={styles.card}>
                    {(task.time_table || []).length === 0 ? (
                        <Text style={styles.emptySectionText}>No time entries recorded yet.</Text>
                    ) : (
                        task.time_table.map((row, index) => (
                            <View
                                key={index}
                                style={[styles.timeRow, index === task.time_table.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={styles.timeRowLeft}>
                                    <Icon name="calendar-outline" size={13} color="#9A9CAE" />
                                    <Text style={styles.timeRowDate}>{row.date}</Text>
                                </View>
                                <View style={styles.timeRowMid}>
                                    <Text style={styles.timeRowRange}>
                                        {stripSecondsFromTime(row.start_time)} <Icon name="arrow-forward" size={10} color="#9A9CAE" /> {stripSecondsFromTime(row.end_time)}
                                    </Text>
                                </View>
                                <View style={styles.timeRowChip}>
                                    <Text style={styles.timeRowChipText}>{row.time_taken ? formatTimeTakenChip(parseHmsToSeconds(row.time_taken)) : '--'}</Text>
                                </View>
                            </View>
                        ))
                    )}

                    {(task.time_table || []).length > 0 && (
                        <View style={styles.totalTimeRow}>
                            <Icon name="checkmark-done-circle" size={15} color={colors.primary} />
                            <Text style={styles.totalTimeText}>
                                Total Time Taken: {formatSecondsToHMS(parseHmsToSeconds(task.total_time_taken))}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Status History — vertical timeline */}
                {/* <SectionHeading icon="git-commit-outline" label="Status History" count={(task.status_history || []).length} />
                <View style={styles.card}>
                    {(task.status_history || []).length === 0 ? (
                        <Text style={styles.emptySectionText}>No status changes recorded yet.</Text>
                    ) : (
                        task.status_history.map((h, index) => {
                            const cfg = getStatusConfig(h.task_status);
                            const isLast = index === task.status_history.length - 1;
                            return (
                                <View key={index} style={styles.timelineItem}>
                                    <View style={styles.timelineIconCol}>
                                        <View style={[styles.timelineDot, { backgroundColor: cfg.color }]} />
                                        {!isLast && <View style={styles.timelineLine} />}
                                    </View>
                                    <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                                        <View style={styles.timelineHeaderRow}>
                                            <Text style={[styles.timelineStatus, { color: cfg.color }]}>{h.task_status}</Text>
                                            <Text style={styles.timelineDateTime}>{h.date} • {h.time}</Text>
                                        </View>
                                        {!!h.status_note && <Text style={styles.timelineNote}>{h.status_note}</Text>}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View> */}

                {/* Re-assign messages */}
                {reassignMessages.length > 0 && (
                    <>
                        <SectionHeading icon="chatbox-ellipses-outline" label="Re-Assign Messages" count={reassignMessages.length} />
                        <View style={styles.card}>
                            {reassignMessages.map((h, index) => (
                                <View
                                    key={index}
                                    style={[styles.reassignRow, index === reassignMessages.length - 1 && { borderBottomWidth: 0 }]}>
                                    <Icon name="chatbox-outline" size={14} color="#DC2626" style={{ marginTop: 2 }} />
                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                        <Text style={styles.reassignNote}>{h.status_note}</Text>
                                        <Text style={styles.reassignDate}>{h.date} • {stripSecondsFromTime(h.time)}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
            <Modal
                visible={historyModal}
                transparent
                animationType="none"
                onRequestClose={closeHistoryModal}>
                <View style={styles.historyModalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeHistoryModal} />
                    <Animated.View
                        style={[
                            styles.historyPanel,
                            {
                                width: HISTORY_PANEL_WIDTH,
                                transform: [{ translateX: historySlideAnim }],
                            },
                        ]}>
                        <View style={styles.historyModalHeader}>
                            <SectionHeading icon="git-commit-outline" label="Status History" count={(task.status_history || []).length} />
                            <TouchableOpacity onPress={closeHistoryModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Icon name="close" size={22} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ position: 'relative', flex: 1 }}>
                            <ScrollView
                                ref={historyScrollRef}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingBottom: 6 }}
                                onScroll={handleHistoryScroll}
                                onContentSizeChange={handleHistoryContentSizeChange}
                                scrollEventThrottle={16}
                                showsVerticalScrollIndicator={true}>
                                {(task.status_history || []).length === 0 ? (
                                    <Text style={styles.emptySectionText}>No status changes recorded yet.</Text>
                                ) : (
                                    task.status_history.map((h, index) => {
                                        const cfg = getStatusConfig(h.task_status);
                                        const isLast = index === task.status_history.length - 1;
                                        return (
                                            <View key={index} style={styles.timelineItem}>
                                                <View style={styles.timelineIconCol}>
                                                    <View style={[styles.timelineDot, { backgroundColor: cfg.color }]} />
                                                    {!isLast && <View style={styles.timelineLine} />}
                                                </View>
                                                <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                                                    <View style={styles.timelineHeaderRow}>
                                                        <Text style={[styles.timelineStatus, { color: cfg.color }]}>{h.task_status}</Text>
                                                        <Text style={styles.timelineDateTime}>{h.date} • {h.time}</Text>
                                                    </View>
                                                    {!!h.status_note && <Text style={styles.timelineNote}>{h.status_note}</Text>}
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </ScrollView>

                            {/* Up arrow — sirf tab dikhega jab top pe nahi hai */}
                            {/* {historyIsScrollable && !historyAtTop && (
                                <TouchableOpacity
                                    onPress={() => historyScrollRef.current?.scrollTo({ y: 0, animated: true })}
                                    style={styles.scrollArrowBtnTop}>
                                    <Icon name="chevron-up" size={16} color="#fff" />
                                </TouchableOpacity>
                            )}

                           
                            {historyIsScrollable && !historyAtBottom && (
                                <TouchableOpacity
                                    onPress={() => historyScrollRef.current?.scrollToEnd({ animated: true })}
                                    style={styles.scrollArrowBtnBottom}>
                                    <Icon name="chevron-down" size={16} color="#fff" />
                                </TouchableOpacity>
                            )} */}
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Edit/Delete Action Modal */}
            <Modal
                visible={actionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setActionModalVisible(false)}>
                <TouchableOpacity
                    style={styles.actionModalOverlay}
                    activeOpacity={1}
                    onPress={() => setActionModalVisible(false)}>
                    <View style={styles.actionModalBox}>
                        {canEdit && (
                            <TouchableOpacity onPress={handleEdit} style={styles.actionModalRow}>
                                <Icon name="create-outline" size={18} color="#2563EB" />
                                <Text style={[styles.actionModalText, { color: '#2563EB' }]}>Edit</Text>
                            </TouchableOpacity>
                        )}
                        {canEdit && canDelete && <View style={styles.actionModalDivider} />}
                        {canDelete && (
                            <TouchableOpacity
                                onPress={() => {
                                    setActionModalVisible(false);
                                    setDeleteConfirmVisible(true);
                                }}
                                style={styles.actionModalRow}>
                                <Icon name="trash-outline" size={18} color="#DC2626" />
                                <Text style={[styles.actionModalText, { color: '#DC2626' }]}>Delete</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Delete Confirm Modal */}
            <Modal
                visible={deleteConfirmVisible}
                transparent
                animationType="fade"
                onRequestClose={() => !deleting && setDeleteConfirmVisible(false)}>
                <View style={styles.errorBackdropDT}>
                    <View style={styles.errorBoxDT}>
                        <View style={styles.errorIconWrapDT}>
                            <Icon name="trash" size={28} color="#DC2626" />
                        </View>
                        <Text style={styles.errorTitleDT}>Delete Task?</Text>
                        <Text style={styles.errorMessageDT}>
                            Are you sure you want to delete "{task.task_name}"? This cannot be undone.
                        </Text>
                        {deleting ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 10 }} />
                        ) : (
                            <View style={{ flexDirection: 'row', width: '100%' }}>
                                <TouchableOpacity
                                    style={[styles.errorOkBtnDT, { flex: 1, backgroundColor: '#9CA3AF', marginRight: 8 }]}
                                    onPress={() => setDeleteConfirmVisible(false)}>
                                    <Text style={styles.errorOkBtnTextDT}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.errorOkBtnDT, { flex: 1, backgroundColor: '#DC2626' }]}
                                    onPress={handleDeleteTask}>
                                    <Text style={styles.errorOkBtnTextDT}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */
const Header = ({ navigation, title, showMenu, onMenuPress }) => (
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        {showMenu ? (
            <TouchableOpacity onPress={onMenuPress} style={styles.headerBtn}>
                <Icon name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
        ) : (
            <View style={[styles.headerBtn, { backgroundColor: 'transparent' }]} />
        )}
    </View>
);

export default TaskDetail;

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F3F4F8' },

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
    headerTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 17, color: '#fff' },

    scrollContent: { padding: 14, paddingBottom: 30 },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { fontFamily: 'SemiBold24', fontSize: 13, color: '#9CA3AF' },
    emptySectionText: { fontFamily: 'SemiBold24', fontSize: 12.5, color: '#9CA3AF', paddingVertical: 14, textAlign: 'center' },

    heroCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 18,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
    },

    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    heroIconTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: 10,
    },
    heroIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    heroProjectName: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 16,
        color: '#1A1B2E',
        letterSpacing: 0.1,
    },
    heroModuleName: {
        fontFamily: 'SemiBold24',
        fontSize: 12,
        color: '#9A9CAE',
        marginTop: 3,
    },

    heroDivider: {
        height: 1,
        backgroundColor: '#F0F1F6',
        marginVertical: 16,
    },

    heroTaskLabel: {
        fontFamily: 'SemiBold24',
        fontSize: 10.5,
        color: '#9A9CAE',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    heroTaskName: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 16.5,
        color: '#1A1B2E',
        lineHeight: 23,
    },

    heroDescBox: {
        marginTop: 14,
        backgroundColor: '#F9FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F0F1F6',
    },
    heroDescLabel: {
        fontFamily: 'SemiBold24',
        fontSize: 10.5,
        color: '#9A9CAE',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 5,
    },
    heroDescription: {
        fontFamily: 'SemiBold24',
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 19,
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 11,
        borderRadius: 20,
        gap: 5,
        marginTop: 2,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10.5 },



    // 👇 NAYA — Okay button, top-right corner of hero card
    okayBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 5,
        zIndex: 2,
    },
    okayBtnText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11, color: colors.primary },

    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 60, // Okay button ke liye jagah
    },
    // 👇 NAYA — icon + "Project (Module)" ek row me
    heroIconTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: 8,
    },
    heroIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    heroProjectLine: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 13,
        color: colors.primary,
        flexShrink: 1,
    },

    heroTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 17, color: '#1A1B2E', marginTop: 12 },
    heroDescription: { fontFamily: 'SemiBold24', fontSize: 12.5, color: '#666', marginTop: 8, lineHeight: 18 },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        gap: 5,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10 },

    sectionHeadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 4,
        gap: 6,
    },
    sectionHeadingText: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 12.5,
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    sectionCountBadge: {
        backgroundColor: '#EEF0FB',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCountText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10, color: colors.primary },

    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginBottom: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 10 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F8FB',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginRight: 8,
        marginBottom: 8,
        maxWidth: '48%',
    },
    chipIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    chipLabel: { fontFamily: 'SemiBold24', fontSize: 9, color: '#9A9CAE' },
    chipValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10, color: '#1A1B2E' },

    progressTrack: {
        width: '100%',
        height: 8,
        backgroundColor: '#E9EAF2',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 4,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingBottom: 12,
    },
    progressPct: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11.5 },
    overtimeText: { fontFamily: 'SemiBold24', fontSize: 10, color: '#DC2626' },

    // 👇 NAYA — bar chart (Assigned vs Taken)
    chartWrap: { paddingVertical: 16, alignItems: 'center' },
    chartBarsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 40,
        height: CHART_MAX_HEIGHT + 40,
    },
    chartBarCol: { alignItems: 'center', width: 70 },
    chartBar: { width: 40, borderRadius: 6 },
    chartBarValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11, color: '#1A1B2E', marginBottom: 6 },
    chartBarLabel: { fontFamily: 'SemiBold24', fontSize: 10, color: '#9A9CAE', marginTop: 8, textAlign: 'center' },

    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F6',
    },
    timeRowLeft: { flexDirection: 'row', alignItems: 'center', width: 78, gap: 4 },
    timeRowDate: { fontFamily: 'SemiBold24', fontSize: 10.5, color: '#374151' },
    timeRowMid: { flex: 1, paddingHorizontal: 4 },
    timeRowRange: { fontFamily: 'SemiBold24', fontSize: 10.5, color: '#6B7280' },
    timeRowChip: {
        backgroundColor: '#EEF0FB',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    timeRowChipText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10, color: colors.primary },

    totalTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    totalTimeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, color: '#1A1B2E' },

    timelineItem: { flexDirection: 'row' },
    timelineIconCol: { width: 20, alignItems: 'center' },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    timelineLine: { flex: 1, width: 1.5, backgroundColor: '#E9EAF2', marginTop: 3 },
    timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 16 },
    timelineHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
    timelineStatus: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12.5 },
    timelineDateTime: { fontFamily: 'SemiBold24', fontSize: 10, color: '#9A9CAE' },
    timelineNote: { fontFamily: 'SemiBold24', fontSize: 11.5, color: '#6B7280', marginTop: 3, lineHeight: 16 },

    reassignRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F6',
    },
    reassignNote: { fontFamily: 'SemiBold24', fontSize: 12, color: '#374151', lineHeight: 17 },
    reassignDate: { fontFamily: 'SemiBold24', fontSize: 10, color: '#9CA3AF', marginTop: 4 },
    stickyStatusBar: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    stickyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    stickyLabel: { fontFamily: 'SemiBold24', fontSize: 12, color: '#6B7280', marginRight: 6 },
    stickyValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, flexShrink: 1 },
    stickyLinkText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11, color: colors.primary, marginRight: 4 },

    historyModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        justifyContent: 'flex-end', // 👈 panel hamesha right side pe rahega
    },
    historyPanel: {
        backgroundColor: '#fff',
        height: '100%',
        paddingTop: 40,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopLeftRadius: 18,
        borderBottomLeftRadius: 18,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    historyModalBox: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        width: '100%',
        maxWidth: 380,
        elevation: 8,
    },
    historyModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F6',
    },
    historyModalTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15, color: '#1A1B2E' },


    historyModalCount: { fontFamily: 'SemiBold24', fontSize: 13, color: '#9A9CAE' },  // 👈 NAYA

    scrollArrowBtnTop: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        opacity: 0.9,
    },
    scrollArrowBtnBottom: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        opacity: 0.9,
    },

    actionModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    actionModalBox: {
        position: 'absolute',
        top: 56,
        right: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 6,
        paddingVertical: 4,
        width: 140,
    },
    actionModalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
    },
    actionModalText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
    actionModalDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },

    errorBackdropDT: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    errorBoxDT: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        alignItems: 'center',
    },
    errorIconWrapDT: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    errorTitleDT: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15, color: '#1A1B2E', marginBottom: 6 },
    errorMessageDT: { fontFamily: 'SemiBold24', fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
    errorOkBtnDT: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
    errorOkBtnTextDT: { color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
});