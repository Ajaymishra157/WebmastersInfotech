import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    FlatList,
    ActivityIndicator,
    Platform,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ENDPOINTS } from '../../CommonFile/Constant';
import { useNavigation } from '@react-navigation/native';
import colors from '../../colors/Colors';


const PRIMARY = '#3d4094';

// "All Staff" ko ek real object banaya hai (member_id: '') taaki
// selectedMember === null sirf "kuch bhi select nahi hua" ke liye reserve rahe.
const ALL_STAFF_OPTION = { member_id: '', member_name: 'All Staff' };

// ---------- Helpers ----------
const pad = n => (n < 10 ? `0${n}` : `${n}`);

// API ko DD-MM-YYYY chahiye
const formatDateForApi = date => {
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
};

// UI header ke liye readable date
const formatDateDisplay = date => {
    if (!date) return 'DD-MM-YYYY';
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
};

// "2026-07-01" -> "01-07-2026"
const apiDateToDDMMYYYY = dateStr => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
};

// Weekly/Month range calculators
const getMonday = date => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d;
};
const getCurrentMonthFirst = date => new Date(date.getFullYear(), date.getMonth(), 1);
const getPrevMonthFirst = date => new Date(date.getFullYear(), date.getMonth() - 1, 1);
const getPrevMonthLast = date => new Date(date.getFullYear(), date.getMonth(), 0);

// column order: Date, In-Out, Working Hour, Status, Total Hour, PunchIn Note, PunchOut Note, Summary
const COL_WIDTHS = {
    date: 120,
    inout: 150,
    workhr: 90,
    status: 90,
    total: 100,
    inNote: 140,
    outNote: 140,
    summary: 130,
};

const TOTAL_TABLE_WIDTH = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

// "8:30" ya "08:15" ya "7.5" jaisi values ko decimal hours me convert karta hai
const parseHoursToDecimal = value => {
    if (!value) return 0;
    const str = String(value).trim();

    if (str.includes(':')) {
        const [h, m] = str.split(':');
        const hours = parseInt(h, 10) || 0;
        const minutes = parseInt(m, 10) || 0;
        return hours + minutes / 60;
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// 8 ghante se kam -> red, 8 ya usse zyada -> green
const getTotalHourColor = value => {
    const hours = parseHoursToDecimal(value);
    return hours < 8 ? '#DC2626' : '#16A34A';
};

// ---------- Row background colors (thoda gadha kiya red wale shades) ----------
const ROW_BG = {
    fullDay: '#EEFBF3',
    halfDay: '#FFF6EC',
    absent: '#FBD3D2',
    holiday: '#EFF6FF',
    leave: '#FBD3D2',
    default: '#FFFFFF',
    defaultAlt: '#F9FAFB',
};

const getRowBgColor = (rec, index) => {
    if (rec.type === 'Holiday' || rec.type === 'Festival') return ROW_BG.holiday;
    if (rec.type === 'Leave') return ROW_BG.leave;
    if (rec.type === 'Absent') return ROW_BG.absent;
    if (rec.type === 'Present') {
        if (rec.summary === 'Full Day') return ROW_BG.fullDay;
        if (rec.summary === 'Half Day') return ROW_BG.halfDay;
    }
    return index % 2 === 0 ? ROW_BG.default : ROW_BG.defaultAlt;
};

const REPORT_TYPE_OPTIONS = [
    {
        key: 'weekly',
        label: 'Weekly Report',
        desc: 'Monday to today',
        icon: 'calendar-outline',
    },
    {
        key: 'current_month',
        label: 'Current Month Report',
        desc: '1st of this month to today',
        icon: 'calendar-number-outline',
    },
    {
        key: 'previous_month',
        label: 'Previous Month Report',
        desc: 'Full previous month',
        icon: 'calendar-clear-outline',
    },
    {
        key: 'custom',
        label: 'Custom Date',
        desc: 'Pick your own range',
        icon: 'create-outline',
    },
];

const AttendanceReport = () => {
    const navigation = useNavigation();

    // Report type flow
    const [showReportTypeModal, setShowReportTypeModal] = useState(false);
    const [reportType, setReportType] = useState(null); // 'weekly' | 'current_month' | 'previous_month' | 'custom' | null
    const filterVisible = !!reportType;

    // Filters
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Member dropdown
    const [memberList, setMemberList] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    const isSearchEnabled =
        !!selectedMember && !!startDate && !!endDate;

    // All Staff mode me hi summary cards collapsible honge


    // Report data
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Kaunse member ka table expand hai (sirf All Staff view me use hota hai)
    const [expandedMemberId, setExpandedMemberId] = useState(null);

    // Leave / Absent detail modal (unified)
    const [detailModalData, setDetailModalData] = useState(null); // { type: 'Leave'|'Absent', ...fields }
    const [reportIsAllStaff, setReportIsAllStaff] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await fetch(ENDPOINTS.ListMember);
            const data = await response.json();
            if (data.status) {
                const activeMembers = data.payload.filter(m => {
                    if (m.is_active !== undefined) return Number(m.is_active) === 1;
                    if (m.status !== undefined) return String(m.status).toLowerCase() === 'active';
                    return true;
                });
                setMemberList(activeMembers);
            } else {
                console.warn('Failed to fetch members');
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    // ---------- Report type selection ----------
    const applyReportType = key => {
        const today = new Date();
        setReportType(key);
        setShowReportTypeModal(false);

        // Select Staff ki jagah default All Staff pehle se select dikhega,
        // data tabhi aayega jab user Search button dabayega
        setSelectedMember(ALL_STAFF_OPTION);
        setExpandedMemberId(null);

        if (key === 'weekly') {
            setStartDate(getMonday(today));
            setEndDate(today);
        } else if (key === 'current_month') {
            setStartDate(getCurrentMonthFirst(today));
            setEndDate(today);
        } else if (key === 'previous_month') {
            setStartDate(getPrevMonthFirst(today));
            setEndDate(getPrevMonthLast(today));
        } else {
            // custom
            setStartDate(null);
            setEndDate(null);
        }
    };

    const reportTypeLabel = REPORT_TYPE_OPTIONS.find(o => o.key === reportType)?.label || '';

    // ---------- Date Picker Handlers (stale closure fix: close modal setter pehle call karo) ----------
    const onChangeStartDate = (event, selected) => {
        setShowStartPicker(false);
        if (event.type === 'dismissed') return;
        if (selected) {
            setStartDate(selected);
            if (endDate && endDate < selected) setEndDate(selected);
        }
    };

    const onChangeEndDate = (event, selected) => {
        setShowEndPicker(false);
        if (event.type === 'dismissed') return;
        if (selected) setEndDate(selected);
    };

    // ---------- Fetch Attendance Report ----------
    const fetchAttendanceReport = async () => {
        setLoading(true);
        setHasSearched(true);
        setExpandedMemberId(null);  // har naye search par sab collapsed se start ho
        setReportIsAllStaff(selectedMember?.member_id === '');
        setReportData([]);
        try {
            const response = await fetch(ENDPOINTS.view_attendance_detail, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member_id: selectedMember ? selectedMember.member_id : "",
                    start_date: formatDateForApi(startDate),
                    end_date: formatDateForApi(endDate),
                }),
            });
            const data = await response.json();

            if (data.status) {
                const payload = data.payload;
                if (Array.isArray(payload)) {
                    setReportData(payload);
                } else if (payload && payload.member_info) {
                    setReportData([payload]);
                } else {
                    setReportData([]);
                }
            } else {
                setReportData([]);
                console.warn(data.message || 'Failed to fetch attendance report');
            }
        } catch (error) {
            console.error('Error fetching attendance report:', error);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleMemberExpand = memberId => {
        setExpandedMemberId(prev => (prev === memberId ? null : memberId));
    };
    const filteredMembers = memberList.filter(m =>
        m.member_name?.toLowerCase().includes(memberSearch.toLowerCase())
    );

    const getStatusColor = status => {
        if (status === 'Present') return '#16A34A';
        if (status === 'Absent') return '#DC2626';
        return '#0284C7';
    };

    const getSummaryColor = summary => {
        if (!summary) return '#374151';
        if (summary.includes('Full Day')) return '#16A34A';
        if (summary.includes('Half Day')) return '#EA580C';
        if (summary.includes('LEAVE')) return '#DC2626';
        if (summary.includes('Absent')) return '#DC2626';
        return '#2563EB'; // Holiday etc
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Attendance Report</Text>

                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => setShowReportTypeModal(true)}>
                    <Icon name="calendar-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Filters - sirf tab dikhega jab report type select ho chuka ho */}
            {filterVisible && (
                <View style={styles.filterCard}>
                    {/* Selected report type chip + Date Range - same line */}
                    <View style={styles.topRow}>
                        <TouchableOpacity
                            style={styles.reportTypeChip}
                            onPress={() => setShowReportTypeModal(true)}>
                            <Icon
                                name={REPORT_TYPE_OPTIONS.find(o => o.key === reportType)?.icon || 'calendar-outline'}
                                size={12}
                                color={PRIMARY}
                            />
                            <Text style={styles.reportTypeChipText} numberOfLines={1}>{reportTypeLabel}</Text>
                        </TouchableOpacity>

                        <View style={styles.dateRow}>
                            <TouchableOpacity
                                style={styles.dateBox}
                                onPress={() => setShowStartPicker(true)}>
                                <Icon name="calendar-outline" size={13} color={PRIMARY} />
                                <Text style={styles.dateText}>{formatDateDisplay(startDate)}</Text>
                            </TouchableOpacity>

                            <Icon name="arrow-forward-outline" size={13} color="#9CA3AF" style={{ marginHorizontal: 4 }} />

                            <TouchableOpacity
                                style={styles.dateBox}
                                onPress={() => setShowEndPicker(true)}>
                                <Icon name="calendar-outline" size={13} color={PRIMARY} />
                                <Text style={styles.dateText}>{formatDateDisplay(endDate)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Row 2: Staff Dropdown + Search (same row) */}
                    <View style={styles.dropdownRow}>
                        <TouchableOpacity
                            style={styles.dropdownBox}
                            onPress={() => setShowMemberModal(true)}>
                            <Icon name="person-outline" size={18} color={PRIMARY} />
                            <Text
                                style={[
                                    styles.dropdownText,
                                    !selectedMember && styles.dropdownPlaceholder,
                                ]}
                                numberOfLines={1}>
                                {selectedMember ? selectedMember.member_name : 'Select Staff'}
                            </Text>
                            <Icon name="chevron-down-outline" size={18} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.searchBtn,
                                !isSearchEnabled && {
                                    backgroundColor: '#D1D5DB',
                                    opacity: 0.7,
                                },
                            ]}
                            disabled={!isSearchEnabled}
                            onPress={fetchAttendanceReport}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Icon
                                    name="search-outline"
                                    size={22}
                                    color={isSearchEnabled ? '#fff' : '#9CA3AF'}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Start Date Picker */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate ?? new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChangeStartDate}
                    maximumDate={new Date()}
                />
            )}

            {/* End Date Picker */}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChangeEndDate}
                    minimumDate={startDate}
                    maximumDate={new Date()}
                />
            )}

            {/* Report List */}
            <FlatList
                style={{ flex: 1 }}
                data={reportData}
                keyExtractor={(member, idx) => (member.member_info?.member_id || idx).toString()}
                showsVerticalScrollIndicator={false}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={7}
                removeClippedSubviews={true}
                ListHeaderComponent={
                    <>
                        {!filterVisible && (
                            <View style={styles.emptyState}>
                                <Icon name="calendar-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>Tap the filter icon above to choose a report type</Text>
                            </View>
                        )}

                        {filterVisible && !hasSearched && (
                            <View style={styles.emptyState}>
                                <Icon name="search-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>Select staff, then tap search</Text>
                            </View>
                        )}

                        {hasSearched && !loading && reportData.length === 0 && (
                            <View style={styles.emptyState}>
                                <Icon name="document-text-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>No attendance data found</Text>
                            </View>
                        )}
                    </>
                }
                renderItem={({ item: member, index: idx }) => {
                    const memberKey = member.member_info?.member_id || idx;
                    return (
                        <MemberReportBlock
                            member={member}
                            getStatusColor={getStatusColor}
                            getSummaryColor={getSummaryColor}
                            onDetailPress={setDetailModalData}
                            collapsible={reportIsAllStaff}
                            expanded={expandedMemberId === memberKey}
                            onToggle={() => toggleMemberExpand(memberKey)}
                        />
                    );
                }}
                ListFooterComponent={<View style={{ height: 24 }} />}
            />

            {/* Report Type Modal */}
            <Modal visible={showReportTypeModal} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.leaveModalOverlay}
                    onPress={() => setShowReportTypeModal(false)}>
                    <View style={styles.reportTypeModalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.reportTypeModalTitle}>Select Report Type</Text>
                        {REPORT_TYPE_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[
                                    styles.reportTypeOption,
                                    reportType === opt.key && styles.reportTypeOptionActive,
                                ]}
                                onPress={() => applyReportType(opt.key)}>
                                <View style={styles.reportTypeIconWrap}>
                                    <Icon name={opt.icon} size={20} color={PRIMARY} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.reportTypeOptionLabel}>{opt.label}</Text>
                                    <Text style={styles.reportTypeOptionDesc}>{opt.desc}</Text>
                                </View>
                                {reportType === opt.key && (
                                    <Icon name="checkmark-circle" size={20} color={PRIMARY} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Member Select Modal */}
            <Modal visible={showMemberModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Staff</Text>
                            <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                                <Icon name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchInputBox}>
                            <Icon name="search-outline" size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search staff..."
                                placeholderTextColor="#9CA3AF"
                                value={memberSearch}
                                onChangeText={setMemberSearch}
                            />
                        </View>

                        <FlatList
                            data={filteredMembers}
                            keyExtractor={item => item.member_id?.toString()}
                            ListHeaderComponent={
                                <TouchableOpacity
                                    style={styles.memberRow}
                                    onPress={() => {
                                        setSelectedMember(ALL_STAFF_OPTION);
                                        setShowMemberModal(false);
                                        setMemberSearch('');
                                    }}>
                                    <View style={styles.memberAvatar}>
                                        <Icon name="people-outline" size={18} color={PRIMARY} />
                                    </View>
                                    <Text style={styles.memberName}>All Staff</Text>
                                    {selectedMember?.member_id === '' && (
                                        <Icon name="checkmark" size={18} color={PRIMARY} />
                                    )}
                                </TouchableOpacity>
                            }
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.memberRow}
                                    onPress={() => {
                                        setSelectedMember(item);
                                        setShowMemberModal(false);
                                        setMemberSearch('');
                                    }}>
                                    <View style={styles.memberAvatar}>
                                        <Icon name="person-outline" size={18} color={PRIMARY} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.memberName}>{item.member_name}</Text>
                                        {item.member_position ? (
                                            <Text style={styles.memberPosition}>{item.member_position}</Text>
                                        ) : null}
                                    </View>
                                    {selectedMember && selectedMember.member_id === item.member_id && (
                                        <Icon name="checkmark" size={18} color={PRIMARY} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Leave / Absent Detail Modal (unified) */}
            <Modal visible={!!detailModalData} transparent animationType="fade">
                <TouchableOpacity onPress={() => setDetailModalData(null)} style={styles.leaveModalOverlay}>
                    <View style={styles.leaveModalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.leaveModalHeader}>
                            <Icon
                                name={detailModalData?.type === 'Absent' ? 'alert-circle-outline' : 'calendar-clear-outline'}
                                size={22}
                                color="#DC2626"
                            />
                            <Text style={styles.leaveModalTitle}>
                                {detailModalData?.type === 'Absent' ? 'Absent Detail' : 'Leave Detail'}
                            </Text>
                            <TouchableOpacity
                                style={{ marginLeft: 'auto' }}
                                onPress={() => setDetailModalData(null)}>
                                <Icon name="close" size={22} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.leaveRow}>
                            <Text style={styles.leaveLabel}>Date</Text>
                            <Text style={styles.leaveValue}>{apiDateToDDMMYYYY(detailModalData?.date)}</Text>
                        </View>

                        {detailModalData?.type === 'Absent' ? (
                            <View style={{ marginTop: 8 }}>
                                <Text style={styles.leaveLabel}>Reason</Text>
                                <Text style={styles.leaveReasonText}>
                                    {detailModalData?.absent_reason || 'Reason not available'}
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.leaveRow}>
                                    <Text style={styles.leaveLabel}>Leave Type</Text>
                                    <Text style={styles.leaveValue}>{detailModalData?.leave_type || '-'}</Text>
                                </View>
                                <View style={styles.leaveRow}>
                                    <Text style={styles.leaveLabel}>Status</Text>
                                    <Text
                                        style={[
                                            styles.leaveValue,
                                            {
                                                color:
                                                    detailModalData?.leave_status === 'APPROVE'
                                                        ? '#16A34A'
                                                        : detailModalData?.leave_status === 'REJECT'
                                                            ? '#DC2626'
                                                            : '#EA580C',
                                                fontWeight: '700',
                                            },
                                        ]}>
                                        {detailModalData?.leave_status || '-'}
                                    </Text>
                                </View>
                                <View style={{ marginTop: 8 }}>
                                    <Text style={styles.leaveLabel}>Reason</Text>
                                    <Text style={styles.leaveReasonText}>{detailModalData?.leave_reason || '-'}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

// ---------- Sub-component: ek member ka summary card + table ----------
const MemberReportBlock = React.memo(({ member, getStatusColor, getSummaryColor, onDetailPress, collapsible, expanded, onToggle }) => {
    const { member_info, report_summary, daily_records } = member;
    const rangeParts = (report_summary?.report_range || '').split(' to ');
    const rangeStart = rangeParts[0] || '-';
    const rangeEnd = rangeParts[1] || '-';

    // collapsible false ho (particular staff search) to table hamesha khula rahega
    const isTableVisible = !collapsible || expanded;

    return (
        <View style={styles.memberBlock}>
            {/* Member Info + Summary Card - compact version */}
            <View style={styles.memberInfoCard}>
                <View style={styles.summaryTopRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.memberInfoName}>{member_info?.member_name}</Text>
                        <Text style={styles.memberInfoPosition}>{member_info?.member_position}</Text>
                    </View>
                    <View style={styles.rangeBox}>
                        <Text style={styles.rangeText}>{rangeStart}</Text>
                        <Text style={styles.rangeToText}>to</Text>
                        <Text style={styles.rangeText}>{rangeEnd}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.compactGrid}>
                    <View style={styles.compactGridRow}>
                        <View style={styles.compactGridCell}>
                            <Text style={styles.summaryStatLabel}>Present Days:</Text>
                            <Text style={[styles.summaryStatValue, { color: '#000', fontFamily: 'Inter-Regular' }]}>
                                {report_summary?.present_days}/{report_summary?.total_workable_days}
                            </Text>
                        </View>
                        <View style={styles.compactGridCell}>
                            <Text style={styles.summaryStatLabel}>Absent Days:</Text>
                            <Text style={[styles.summaryStatValue, { color: '#DC2626', fontFamily: 'Inter-Regular' }]}>
                                {report_summary?.absent_days}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.compactGridRow}>
                        <View style={styles.compactGridCell}>
                            <Text style={styles.summaryStatLabel}>Holidays:</Text>
                            <Text style={[styles.summaryStatValue, { color: '#2563EB', fontFamily: 'Inter-Regular' }]}>
                                {report_summary?.holidays}
                            </Text>
                        </View>
                        <View style={styles.compactGridCell}>
                            <Text style={styles.summaryStatLabel}>Total Days:</Text>
                            <Text style={styles.summaryStatValue}>{report_summary?.total_days}</Text>
                        </View>
                    </View>
                    <View style={styles.compactGridRow}>
                        <View style={styles.compactGridCell}>
                            <Text style={styles.summaryStatLabel}>More Than 8 hr:</Text>
                            <Text style={[styles.summaryStatValue, { color: '#16A34A', fontFamily: 'Inter-Regular' }]}>
                                {report_summary?.more_than_8hr_days} Days
                            </Text>
                        </View>
                        <View style={[styles.compactGridCell, { justifyContent: 'space-between' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.summaryStatLabel}>Less Than 8 hr:</Text>
                                <Text style={[styles.summaryStatValue, { color: '#dc2626', fontFamily: 'Inter-Regular' }]}>
                                    {report_summary?.less_than_8hr_days} Days
                                </Text>
                            </View>
                            {collapsible && (
                                <TouchableOpacity
                                    onPress={onToggle}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={styles.expandArrowBtn}>
                                    <Icon
                                        name={expanded ? 'chevron-up' : 'chevron-down'}
                                        size={18}
                                        color={PRIMARY}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* Table - horizontally scrollable, collapsible sirf All Staff view me */}
            {isTableVisible && (
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={{ width: TOTAL_TABLE_WIDTH }}>
                        {/* Header */}
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.date }]}>Date</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.inout }]}>In-Out Time</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.workhr }]}>Working Hour</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.status }]}>Status</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.total }]}>Total Hour</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.inNote }]}>Punch In Note</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.outNote }]}>Punch Out Note</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.summary, textAlign: 'center' }]}>Summary</Text>
                        </View>

                        {/* Rows */}
                        {daily_records?.map((rec, i) => {
                            const isLeave = rec.type === 'Leave';
                            const isAbsent = rec.type === 'Absent';
                            const punches = rec.punches?.length ? rec.punches : [null];
                            const rowBg = getRowBgColor(rec, i);

                            return (
                                <View key={rec.date} style={[styles.tableRow, { backgroundColor: rowBg }]}>
                                    {/* Date */}
                                    <View style={[styles.cellWrap, { width: COL_WIDTHS.date, justifyContent: 'center' }]}>
                                        <Text style={styles.dateCellText}>{apiDateToDDMMYYYY(rec.date)}</Text>
                                        <Text style={styles.dayCellText}>({rec.day})</Text>
                                    </View>

                                    {/* In-Out Time (Absent/Leave -> info icon yahin) */}
                                    <View style={{ width: COL_WIDTHS.inout }}>
                                        {punches.map((p, pi) => (
                                            <View key={pi} style={styles.punchRow}>
                                                <Text style={styles.punchText}>
                                                    {p ? `${p.in} - ${p.out}` : isLeave ? 'On Leave' : isAbsent ? 'Absent' : (rec.summary || '-')}
                                                </Text>
                                                {(isLeave || isAbsent) && (
                                                    <TouchableOpacity
                                                        onPress={() =>
                                                            onDetailPress(
                                                                isLeave
                                                                    ? {
                                                                        type: 'Leave',
                                                                        date: rec.date,
                                                                        leave_type: rec.leave_type,
                                                                        leave_status: rec.leave_status,
                                                                        leave_reason: rec.leave_reason,
                                                                    }
                                                                    : {
                                                                        type: 'Absent',
                                                                        date: rec.date,
                                                                        absent_reason: rec.absent_reason,
                                                                    }
                                                            )
                                                        }>
                                                        <Icon name="information-circle-outline" size={15} color="#0284C7" style={{ marginLeft: 4 }} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                    </View>

                                    {/* Working Hour */}
                                    <View style={{ width: COL_WIDTHS.workhr }}>
                                        {punches.map((p, pi) => (
                                            <Text key={pi} style={styles.workHourText}>
                                                {p ? p.working_hour : '-'}
                                            </Text>
                                        ))}
                                    </View>

                                    {/* Status */}
                                    <View style={[styles.cellWrap, { width: COL_WIDTHS.status, justifyContent: 'center' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(rec.status) }]}>
                                            {rec.status}
                                        </Text>
                                    </View>

                                    {/* Total Working Hour */}
                                    <View style={[styles.cellWrap, { width: COL_WIDTHS.total, justifyContent: 'center' }]}>
                                        <Text style={[styles.totalHourText, { color: getTotalHourColor(rec.total_working_hour) }]}>
                                            {rec.total_working_hour}
                                        </Text>
                                    </View>

                                    {/* Notes */}
                                    <View style={{ width: COL_WIDTHS.inNote }}>
                                        {punches.map((p, pi) => (
                                            <Text key={pi} style={styles.noteText} >
                                                {p?.in_note || '-'}
                                            </Text>
                                        ))}
                                    </View>
                                    <View style={{ width: COL_WIDTHS.outNote }}>
                                        {punches.map((p, pi) => (
                                            <Text key={pi} style={styles.noteText} >
                                                {p?.out_note || '-'}
                                            </Text>
                                        ))}
                                    </View>

                                    {/* Summary */}
                                    <View
                                        style={[
                                            styles.cellWrap,
                                            {
                                                width: COL_WIDTHS.summary,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            },
                                        ]}>
                                        <Text
                                            style={[styles.summaryText, { color: getSummaryColor(rec.summary), textAlign: 'right' }]}
                                            numberOfLines={1}>
                                            {rec.summary}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </View>
    );
});

export default AttendanceReport;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },

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

    headerTitle: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 17,
        color: '#fff',
    },

    filterCard: {
        backgroundColor: '#fff',
        margin: 12,
        borderRadius: 14,
        padding: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },

    dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dropdownBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 10,
        gap: 8,
    },
    dropdownText: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
    dropdownPlaceholder: { color: '#9CA3AF', fontWeight: '400' },

    searchBtn: {
        backgroundColor: PRIMARY,
        borderRadius: 10,
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

    memberBlock: { marginHorizontal: 12, marginBottom: 18 },

    // ---- Compact summary card ----
    memberInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    summaryTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
    memberInfoName: { fontSize: 13.5, fontWeight: '700', color: '#111827' },
    memberInfoPosition: { fontSize: 11, color: '#6B7280', marginTop: 1 },

    rangeBox: { alignItems: 'flex-end' },
    rangeText: { fontSize: 10.5, color: '#374151', fontWeight: '600' },
    rangeToText: { fontSize: 9.5, color: '#9CA3AF', fontWeight: '600' },

    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 6 },

    compactGrid: { gap: 2 },
    compactGridRow: { flexDirection: 'row' },
    compactGridCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
    summaryStatLabel: { fontSize: 11, color: '#374151', fontWeight: '600' },
    summaryStatValue: { fontSize: 11, color: '#111827', fontWeight: '700' },

    expandArrowBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EDE9FE',
    },

    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#DBEAFE',
        paddingVertical: 10,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    headerCell: { fontSize: 11, fontWeight: '700', color: '#1E3A8A', paddingHorizontal: 6 },

    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 8,
    },
    cellWrap: { paddingHorizontal: 6 },
    dateCellText: { fontSize: 12, fontWeight: '600', color: '#111827' },
    dayCellText: { fontSize: 10, color: '#9CA3AF' },

    punchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4 },
    punchText: { fontSize: 11, color: '#374151' },
    workHourText: { fontSize: 11, color: '#374151', paddingHorizontal: 6, paddingVertical: 4 },
    totalHourText: { fontSize: 12, fontWeight: '700' },
    noteText: { fontSize: 10, color: '#6B7280', paddingHorizontal: 6, paddingVertical: 4 },
    statusText: { fontSize: 12, fontWeight: '700' },
    summaryText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 16,
        maxHeight: '75%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

    searchInputBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F3F4F6', borderRadius: 10,
        paddingHorizontal: 10, marginBottom: 10, gap: 8,
    },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: '#111827' },

    memberRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    memberAvatar: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
    },
    memberName: { fontSize: 13, fontWeight: '600', color: '#111827' },
    memberPosition: { fontSize: 11, color: '#9CA3AF' },

    // Report type modal
    reportTypeModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        width: '100%',
    },
    reportTypeModalTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
    reportTypeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        marginBottom: 4,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },

    reportTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDE9FE',
        borderRadius: 16,
        paddingVertical: 5,
        paddingHorizontal: 8,
        gap: 4,
        flexShrink: 1,
        marginRight: 6,
    },
    reportTypeChipText: { fontSize: 10.5, fontWeight: '700', color: PRIMARY },

    dateRow: { flexDirection: 'row', alignItems: 'center' },
    dateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
        gap: 4,
    },
    dateText: { fontSize: 10.5, color: '#111827', fontWeight: '500' },
    reportTypeOptionActive: { backgroundColor: '#EDE9FE' },
    reportTypeIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    },
    reportTypeOptionLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
    reportTypeOptionDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

    // Leave / Absent modal
    leaveModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    leaveModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        width: '100%',
    },
    leaveModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    leaveModalTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    leaveRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    leaveLabel: { fontSize: 12.5, color: '#6B7280', fontWeight: '600' },
    leaveValue: { fontSize: 12.5, color: '#111827', fontWeight: '600' },
    leaveReasonText: { fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 18 },
});