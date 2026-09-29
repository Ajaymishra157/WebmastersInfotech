import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import colors, { baseUrl } from '../colors/Colors';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Icon from 'react-native-vector-icons/Ionicons';
import { ENDPOINTS } from '../CommonFile/Constant';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';

/* -------------------------------------------------------------------------- */
/*  Status tabs config                                                        */
/* -------------------------------------------------------------------------- */
const STATUS_TABS = [
  { key: 'All', label: 'Total', icon: 'apps-outline', color: '#007AFF' },
  { key: 'Pending', label: 'Pending', icon: 'time-outline', color: '#FFA500' },
  { key: 'Accepted', label: 'Accepted', icon: 'checkmark-circle-outline', color: '#FF3B30' },
  { key: 'Ongoing', label: 'Ongoing', icon: 'rocket-outline', color: '#34C759' },
  { key: 'Under Review', label: 'Review', icon: 'document-text-outline', color: '#AF52DE' },
  { key: 'Completed', label: 'Completed', icon: 'checkmark-done-circle-outline', color: '#5AC8FA' },
];

/* -------------------------------------------------------------------------- */
/*  Time helpers                                                              */
/* -------------------------------------------------------------------------- */
const parseTimeToMinutes = timeStr => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.replace(/\s*(Early|Late)\s*/i, '').trim();
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 60 + m + Math.round((s || 0) / 60);
  }
  if (parts.length === 2) {
    const [h, m] = parts;
    return h * 60 + m;
  }
  return parts[0] || 0;
};

const formatMinutesReadable = (totalMinutes, suffix = '') => {
  const isNegative = totalMinutes < 0;
  const abs = Math.abs(Math.round(totalMinutes));
  const days = Math.floor(abs / (24 * 60));
  const remAfterDays = abs % (24 * 60);
  const hours = Math.floor(remAfterDays / 60);
  const mins = remAfterDays % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}D`);
  if (hours > 0) parts.push(`${hours}H`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}M`);

  return `${isNegative ? '-' : ''}${parts.join(' ')}${suffix ? ' ' + suffix : ''}`;
};

const formatTimeString = timeStr => {
  if (!timeStr) return '0M';
  const suffixMatch = timeStr.match(/(Early|Late)/i);
  const suffix = suffixMatch ? suffixMatch[0] : '';
  return formatMinutesReadable(parseTimeToMinutes(timeStr), suffix);
};

const getTaskDifference = task => {
  if (!task.total_time_taken) return { text: '—', isLate: false };
  const assignedMin = parseTimeToMinutes(task.hours_assigned);
  const takenMin = parseTimeToMinutes(task.total_time_taken);
  const diff = assignedMin - takenMin;
  const isLate = diff < 0;
  return {
    text: formatMinutesReadable(Math.abs(diff), isLate ? 'Late' : 'Early'),
    isLate,
  };
};

// "2026-07-27 06:09:43" -> "27/07/2026, 06:09 AM"
const formatTimestampDisplay = ts => {
  if (!ts) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(ts.trim());
  if (!match) return ts;
  const [, yyyy, mm, dd, hhRaw, min] = match;
  let hh = parseInt(hhRaw, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${dd}/${mm}/${yyyy}, ${String(hh).padStart(2, '0')}:${min} ${ampm}`;
};

// Assigned By aur Assigned To same person hai ya nahi — case/space insensitive check
const isSameAssignee = task => {
  const by = (task.created_by_name || '').trim().toLowerCase();
  const to = (task.member_name || '').trim().toLowerCase();
  return !!by && !!to && by === to;
};

// 👇 NAYA — Date filter helpers
const pad2 = n => (n < 10 ? `0${n}` : `${n}`);

// Date -> "2026-07-28" (API ke liye)
const formatDateForApi = date => {
  if (!date) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

// Date -> "28/07/2026" (UI ke liye)
const formatDateForDisplay = date => {
  if (!date) return '';
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};


const ShimmerCard = () => {
  return (
    <View style={styles.taskCard}>
      {/* Project */}
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={{ width: '55%', height: 12, borderRadius: 5, marginBottom: 10 }}
      />

      {/* Task Name */}
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={{ width: '80%', height: 16, borderRadius: 5, marginBottom: 8 }}
      />

      {/* Description */}
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={{ width: '95%', height: 10, borderRadius: 5, marginBottom: 5 }}
      />
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={{ width: '70%', height: 10, borderRadius: 5, marginBottom: 12 }}
      />

      {/* User */}
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={{ width: '45%', height: 12, borderRadius: 5, marginBottom: 12 }}
      />

      {/* Bottom Stats */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ alignItems: 'center' }}>
            <ShimmerPlaceholder
              LinearGradient={LinearGradient}
              style={{ width: 45, height: 8, borderRadius: 4, marginBottom: 5 }}
            />
            <ShimmerPlaceholder
              LinearGradient={LinearGradient}
              style={{ width: 60, height: 10, borderRadius: 4 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
};


const ProjectTaskList = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;

  const [taskList, setTaskList] = useState([]);
  const [assignedhours, setAssignedHours] = useState('');
  const [TimeTaken, setTimeTaken] = useState('');
  const [Difference, setDifference] = useState('');
  const [Total, setTotal] = useState('0');
  const [Pending, setPending] = useState('0');
  const [Accepted, setAccepted] = useState('0');
  const [Ongoing, setongoing] = useState('0');
  const [Onreview, setOnreview] = useState('0');
  const [Completed, setCompleted] = useState('0');
  const [ModalVisible, setModalVisible] = useState(false);
  const [Modulname, setModuleName] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');   // 👈 NAYA — search box

  // 👇 NAYA — description modal ke liye
  const [descModalVisible, setDescModalVisible] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState({
    projectName: '', moduleName: '', taskName: '', description: '',
  });
  const [descAtTop, setDescAtTop] = useState(true);
  const [descAtBottom, setDescAtBottom] = useState(false);
  const [descIsScrollable, setDescIsScrollable] = useState(false);
  const descScrollRef = useRef(null);

  const [nameTruncated, setNameTruncated] = useState(false);
  const [descTruncated, setDescTruncated] = useState(false);
  const showInfo = nameTruncated || descTruncated;

  // 👇 NAYA — From Date / Till Date filter ke liye
  const [fromDate, setFromDate] = useState(null);
  const [tillDate, setTillDate] = useState(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showTillPicker, setShowTillPicker] = useState(false);



  const handleDescScroll = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const paddingToBottom = 4; // thoda tolerance
    const atTop = contentOffset.y <= 4;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;
    setDescAtTop(atTop);
    setDescAtBottom(atBottom);
  };

  // Jab content layout ho jaye, check karo ki scroll zaroori hai bhi ya nahi
  const handleDescContentSizeChange = (contentWidth, contentHeight) => {
    // agar scroll box (350) se content chhota hai to koi arrow nahi chahiye
    setDescIsScrollable(contentHeight > 350);
  };

  useEffect(() => {
    fetchTasks('All');
  }, []);

  // Date change hote hi list dubara fetch karo (current status ke saath)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true; // pehli render par skip — mount wala effect already fetch kar raha hai
      return;
    }
    fetchTasks(selectedStatus);
  }, [fromDate, tillDate]);

  const onChangeFromDate = (event, selected) => {
    setShowFromPicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;
    if (selected) setFromDate(selected);
  };

  const onChangeTillDate = (event, selected) => {
    setShowTillPicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;
    if (selected) setTillDate(selected);
  };

  const clearFromDate = () => setFromDate(null);
  const clearTillDate = () => setTillDate(null);

  const fetchTasks = async (status = 'All') => {
    setLoading(true);
    setSelectedStatus(status);
    setSelectedModuleId(null);
    const url = ENDPOINTS.ListTask;

    const body = {
      project_id: projectId,
      task_status: status,
    };
    if (fromDate) body.start_date = formatDateForApi(fromDate);
    if (tillDate) body.end_date = formatDateForApi(tillDate);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.code === 200) {
        setTaskList(result.payload || []);
        setAssignedHours(result.total_assigned_hours);
        setTimeTaken(result.total_taken_time);
        setDifference(result.total_difference);
        setTotal(result.total_task);
        setPending(result.total_pending);
        setAccepted(result.total_accepted);
        setongoing(result.total_ongoing);
        setOnreview(result.total_review);
        setCompleted(result.total_completed);
      } else {
        setTaskList([]);
      }
    } catch (error) {
      console.error('Task API Error:', error);
      setTaskList([]);
    } finally {
      setLoading(false);
    }
  };

  const ModuleList = async () => {
    const url = ENDPOINTS.ListModuleProjectWise;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });
      const result = await response.json();
      if (result.code == 200) {
        setModuleName(result.payload);
      }
    } catch (error) { }
  };

  const handleFilterPress = () => {
    setModalVisible(true);
    ModuleList();
  };

  const fetchTasksModuleWise = async moduleId => {
    setLoading(true);
    const url = ENDPOINTS.ListTaskModuleWise;
    const body = { project_id: projectId, module_id: moduleId };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.code === 200) {
        setTaskList(result.payload || []);
        setAssignedHours(result.total_assigned_hours);
        setTimeTaken(result.total_taken_time);
        setDifference(result.difference);
      }
    } catch (error) {
      console.error('Module-wise Task API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 👇 NAYA — info icon click par full description modal open
  const openDescriptionModal = task => {
    setSelectedTaskDetails({
      projectName: task.project_name,
      moduleName: task.module_name,
      taskName: task.task_name,
      description: task.task_description,
    });
    setDescAtTop(true);
    setDescAtBottom(false);
    setDescIsScrollable(false);
    setDescModalVisible(true);
  };

  const tabCounts = {
    All: Total,
    Pending,
    Accepted,
    Ongoing,
    'Under Review': Onreview,
    Completed,
  };

  // Search filter — project / module / task name se search
  const displayedTasks = searchText.trim()
    ? taskList.filter(t => {
      const q = searchText.toLowerCase();
      return (
        t.project_name?.toLowerCase().includes(q) ||
        t.module_name?.toLowerCase().includes(q) ||
        t.task_name?.toLowerCase().includes(q)
      );
    })
    : taskList;

  const selectedModuleName = selectedModuleId
    ? Modulname.find(item => item.module_id === selectedModuleId)?.module_name
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F8' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{projectName}</Text>
        <View style={[styles.headerBtn, { backgroundColor: 'transparent' }]} />
      </View>

      {/* Time summary card */}
      <View style={styles.timeCard}>
        <View style={styles.timeBox}>
          <Icon name="briefcase-outline" size={16} color="#00796b" />
          <Text style={styles.timeLabel}>Assigned</Text>
          <Text style={styles.timeValue}>{formatTimeString(assignedhours)}</Text>
        </View>
        <View style={styles.timeBox}>
          <Icon name="stopwatch-outline" size={16} color="#00796b" />
          <Text style={styles.timeLabel}>Taken</Text>
          <Text style={styles.timeValue}>{formatTimeString(TimeTaken)}</Text>
        </View>
        <View style={styles.timeBox}>
          <Icon name="swap-horizontal-outline" size={16} color="#00796b" />
          <Text style={styles.timeLabel}>Difference</Text>
          <Text
            style={[
              styles.timeValue,
              { color: /late/i.test(Difference) ? '#DC2626' : '#16A34A' },
            ]}>
            {formatTimeString(Difference)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleFilterPress} style={styles.moduleFilterBtn}>
          <FontAwesome name="filter" size={20} color="#00796b" />
        </TouchableOpacity>
      </View>

      {/* Status tabs — sab 6 ek hi line me, compact */}
      <View style={styles.tabsRow}>
        {STATUS_TABS.map(tab => {
          const active = selectedStatus === tab.key && !selectedModuleId;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => fetchTasks(tab.key)}
              style={[
                styles.tabBox,
                {
                  backgroundColor: active ? tab.color : '#fff',
                  borderColor: active ? tab.color : '#E4E5EE',
                },
              ]}>
              <Icon name={tab.icon} size={13} color={active ? '#fff' : tab.color} />
              <Text
                style={[styles.tabBoxLabel, { color: active ? '#fff' : '#374151' }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {tab.label}
              </Text>
              <Text style={[styles.tabBoxCount, { color: active ? '#fff' : tab.color }]}>
                {tabCounts[tab.key] ?? 0}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 👇 NAYA — From Date, Till Date, Search — teeno ek hi line me, compact */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.dateBox} onPress={() => setShowFromPicker(true)}>
          <Icon name="calendar-outline" size={12} color="#9CA3AF" />
          <Text style={styles.dateBoxText} numberOfLines={1}>
            {fromDate ? formatDateForDisplay(fromDate) : 'From Date'}
          </Text>
          {fromDate && (
            <TouchableOpacity onPress={clearFromDate} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Icon name="close-circle" size={13} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateBox} onPress={() => setShowTillPicker(true)}>
          <Icon name="calendar-outline" size={12} color="#9CA3AF" />
          <Text style={styles.dateBoxText} numberOfLines={1}>
            {tillDate ? formatDateForDisplay(tillDate) : 'Till Date'}
          </Text>
          {tillDate && (
            <TouchableOpacity onPress={clearTillDate} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Icon name="close-circle" size={13} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Icon name="search-outline" size={13} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="close-circle" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showFromPicker && (
        <DateTimePicker
          value={fromDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onChangeFromDate}
          maximumDate={tillDate || undefined}
        />
      )}
      {showTillPicker && (
        <DateTimePicker
          value={tillDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onChangeTillDate}
          minimumDate={fromDate || undefined}
        />
      )}

      {/* 👇 NAYA — Filter active hone par kitne results mile wo dikhao */}
      {(fromDate || tillDate || searchText.trim()) && (
        <View style={styles.resultsRow}>
          <Icon name="funnel-outline" size={12} color={colors.primary} />
          <Text style={styles.resultsText}>
            {displayedTasks.length} {displayedTasks.length === 1 ? 'task' : 'tasks'} found
            {fromDate ? ` • From ${formatDateForDisplay(fromDate)}` : ''}
            {tillDate ? ` • Till ${formatDateForDisplay(tillDate)}` : ''}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFromDate(null);
              setTillDate(null);
              setSearchText('');
            }}>
            <Text style={styles.resultsClearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active module chip — filter kiye gaye module ka naam + kitne tasks mile */}
      {selectedModuleId && (
        <View style={styles.moduleChipRow}>
          <View style={styles.moduleChip}>
            <Icon name="folder-outline" size={13} color={colors.primary} />
            <Text style={styles.moduleChipText} numberOfLines={1}>
              {selectedModuleName}
            </Text>
            <View style={styles.moduleChipCountBadge}>
              <Text style={styles.moduleChipCountText}>{displayedTasks.length}</Text>
            </View>
            <TouchableOpacity onPress={() => { setSelectedModuleId(null); fetchTasks('All'); }}>
              <Icon name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ScrollView
          contentContainerStyle={{
            padding: 10,
            paddingBottom: 30,
          }}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3, 4, 5].map((item) => (
            <ShimmerCard key={item} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 10, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          {displayedTasks.length === 0 && (
            <View style={styles.emptyWrap}>
              <Icon name="document-text-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No tasks found</Text>
            </View>
          )}

          {displayedTasks.map((task, index) => {
            const diff = getTaskDifference(task);
            const sameAssignee = isSameAssignee(task);
            const showAssignedArrow = !sameAssignee && !!task.member_name;
            return (
              <View
                key={task.task_id || index}
                style={[styles.taskCard, diff.isLate && { backgroundColor: '#fbd9d3' }]}>
                {/* Row 1: project name + status — ye dono FIXED rahenge, wrap nahi honge */}
                <View style={styles.topRow}>
                  <Icon name="briefcase-outline" size={11} color={colors.primary} />
                  <Text style={styles.projectNameText} numberOfLines={1}>{task.project_name}</Text>
                  {!!task.module_name && (
                    <Text style={styles.moduleTagText} numberOfLines={1}> · {task.module_name}</Text>
                  )}
                  {!!task.task_status && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{task.task_status}</Text>
                    </View>
                  )}
                </View>

                {/* Task name + description (with info icon for full description) */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={styles.taskIndex}>{index + 1}</Text>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={[styles.taskName, { flexShrink: 1 }]}
                        numberOfLines={1}
                        onTextLayout={e => {
                          if (e.nativeEvent.lines.length > 1 && !nameTruncated) setNameTruncated(true);
                        }}>
                        {task.task_name}
                      </Text>

                      {/* 👇 icon yahi, name ke saath inline */}
                      {showInfo && (
                        <TouchableOpacity
                          onPress={() => openDescriptionModal(task)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={styles.descInfoBtn}>
                          <Icon name="information-circle-outline" size={13} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {!!task.task_description && (
                      <>
                        <Text
                          style={[styles.taskDesc, styles.descHiddenMeasure]}
                          onTextLayout={e => {
                            if (e.nativeEvent.lines.length > 1 && !descTruncated) setDescTruncated(true);
                          }}>
                          {task.task_description}
                        </Text>
                        <Text style={styles.taskDesc} numberOfLines={1}>
                          {task.task_description}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Assigned By -> Assigned To (same ho to ek hi baar) — ek hi compact line me */}
                <View style={styles.peopleRow}>
                  <Icon name="person-circle-outline" size={12} color={colors.primary} />
                  <Text style={styles.peopleText} numberOfLines={1}>
                    {task.created_by_name || 'N/A'}
                    {showAssignedArrow ? `  →  ${task.member_name}` : ''}
                  </Text>
                </View>

                {/* Time stats + Created On — Created On sabse last */}
                <View style={styles.taskStatsRow}>
                  <View style={[styles.taskStatCol, { flex: 0.8 }]}>
                    <Text style={styles.taskStatLabel}>Assigned</Text>
                    <Text style={styles.taskStatValue}>
                      {formatTimeString(task.hours_assigned)}
                    </Text>
                  </View>

                  <View style={[styles.taskStatCol, { flex: 0.8 }]}>
                    <Text style={styles.taskStatLabel}>Taken</Text>
                    <Text style={styles.taskStatValue}>
                      {formatTimeString(task.total_time_taken)}
                    </Text>
                  </View>

                  <View style={[styles.taskStatCol, { flex: 1.1 }]}>
                    <Text style={styles.taskStatLabel}>Difference</Text>
                    <Text
                      style={[
                        styles.taskStatValue,
                        { color: diff.isLate ? '#DC2626' : '#16A34A' },
                      ]}>
                      {diff.text}
                    </Text>
                  </View>

                  <View style={[styles.taskStatCol, { flex: 1.8, alignItems: 'flex-start' }]}>
                    <Text style={styles.taskStatLabel}>Created</Text>
                    <Text style={styles.taskStatValue}>
                      {formatTimestampDisplay(task.timestamp)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Module Select Modal */}
      <Modal visible={ModalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.moduleModalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.moduleModalBox}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                onPress={() => {
                  setSelectedModuleId(null);
                  setModalVisible(false);
                  fetchTasks('All');
                }}
                style={[styles.moduleOption, selectedModuleId === null && styles.moduleOptionActive]}>
                <Text style={styles.moduleOptionText}>All</Text>
              </TouchableOpacity>

              {Modulname.map(item => (
                <TouchableOpacity
                  key={item.module_id}
                  onPress={() => {
                    setSelectedModuleId(item.module_id);
                    setModalVisible(false);
                    fetchTasksModuleWise(item.module_id);
                  }}
                  style={[styles.moduleOption, selectedModuleId === item.module_id && styles.moduleOptionActive]}>
                  <Text style={styles.moduleOptionText}>{item.module_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>



      <Modal
        visible={descModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDescModalVisible(false)}>
        <Pressable style={styles.descModalOverlay} onPress={() => setDescModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.descModalBox}>
            <View style={styles.descModalHeader}>
              <Text style={styles.descModalTitle}>Task Details</Text>
              <TouchableOpacity onPress={() => setDescModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={{ position: 'relative' }}>
              <ScrollView
                ref={descScrollRef}
                style={{ maxHeight: 350 }}
                contentContainerStyle={{ paddingBottom: 10 }}
                onScroll={handleDescScroll}
                onContentSizeChange={handleDescContentSizeChange}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={true}>
                {!!selectedTaskDetails.projectName && (
                  <Text style={styles.descModalLabel}>Project</Text>
                )}
                {!!selectedTaskDetails.projectName && (
                  <Text style={styles.descModalValue}>{selectedTaskDetails.projectName}</Text>
                )}

                {!!selectedTaskDetails.moduleName && (
                  <Text style={[styles.descModalLabel, { marginTop: 10 }]}>Module</Text>
                )}
                {!!selectedTaskDetails.moduleName && (
                  <Text style={styles.descModalValue}>{selectedTaskDetails.moduleName}</Text>
                )}

                <Text style={[styles.descModalLabel, { marginTop: 10 }]}>Task Name</Text>
                <Text style={styles.descModalValue}>{selectedTaskDetails.taskName}</Text>

                {!!selectedTaskDetails.description && (
                  <Text style={[styles.descModalLabel, { marginTop: 10 }]}>Description</Text>
                )}
                {!!selectedTaskDetails.description && (
                  <Text style={styles.descModalText}>{selectedTaskDetails.description}</Text>
                )}
              </ScrollView>

              {/* Up arrow — sirf tab dikhega jab top pe nahi hai */}
              {descIsScrollable && !descAtTop && (
                <TouchableOpacity
                  onPress={() => descScrollRef.current?.scrollTo({ y: 0, animated: true })}
                  style={styles.scrollArrowBtnTop}>
                  <Icon name="chevron-up" size={16} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Down arrow — sirf tab dikhega jab bottom pe nahi hai */}
              {descIsScrollable && !descAtBottom && (
                <TouchableOpacity
                  onPress={() => descScrollRef.current?.scrollToEnd({ animated: true })}
                  style={styles.scrollArrowBtnBottom}>
                  <Icon name="chevron-down" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default ProjectTaskList;

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
  headerTitle: { flex: 1, marginLeft: 10, fontFamily: 'Montserrat-ExtraBold', fontSize: 16, color: '#fff' },

  timeCard: {
    flexDirection: 'row',
    backgroundColor: '#e0f2f7',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    elevation: 2,
  },
  timeBox: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 10, color: '#00796b', fontFamily: 'SemiBold24', marginTop: 2 },
  timeValue: { fontSize: 12, color: '#000', fontFamily: 'Montserrat-ExtraBold', marginTop: 1 },
  moduleFilterBtn: { paddingHorizontal: 8 },

  // ---- Status tabs: ek hi line me sab 6, compact ----
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 10,
    gap: 4,
  },
  tabBox: {
    flex: 1,
    height: 58,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabBoxLabel: {
    fontFamily: 'SemiBold24',
    fontSize: 9,
    marginTop: 3,
  },
  tabBoxCount: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    marginTop: 1,
  },

  // 👇 NAYA — From Date + Till Date + Search, ek hi row me
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    gap: 6,
  },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E5EE',
    borderRadius: 8,
    paddingHorizontal: 6,
    height: 34,
    gap: 4,
  },
  dateBoxText: { flex: 1, fontFamily: 'SemiBold24', fontSize: 9.5, color: '#374151' },

  searchBox: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E5EE',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
    gap: 4,
  },
  searchInput: { flex: 1, fontFamily: 'SemiBold24', fontSize: 11, color: '#111827', padding: 0 },

  // 👇 NAYA — filter apply hone par results count row
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EEF0FB',
    borderRadius: 8,
    gap: 6,
  },
  resultsText: { flex: 1, fontFamily: 'SemiBold24', fontSize: 10.5, color: colors.primary },
  resultsClearText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10.5, color: '#DC2626' },

  moduleChipRow: { paddingHorizontal: 12, marginTop: 8 },
  moduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF0FB',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 6,
  },
  moduleChipText: { fontFamily: 'SemiBold24', fontSize: 11, color: colors.primary, maxWidth: 130 },
  moduleChipCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleChipCountText: { color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 10 },

  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyText: { color: '#9CA3AF', fontFamily: 'SemiBold24', fontSize: 13 },

  // ---- COMPACT TASK CARD (Task.js ke cardStyles jaisa) ----
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginVertical: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },

  // Row 1 — project name + module + status, ek hi line me, wrap nahi hoga
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectNameText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10.5,
    color: colors.primary,
    marginLeft: 4,
  },
  moduleTagText: {
    flexShrink: 1,
    fontSize: 10.5,
    fontFamily: 'SemiBold24',
    color: '#8A8D9F',
    marginRight: 6,
  },
  taskIndex: { fontFamily: 'SemiBold24', fontSize: 12, color: '#8A8D9F' },
  taskName: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, color: '#1A1B2E' },

  taskDesc: { flex: 1, fontFamily: 'SemiBold24', fontSize: 10.5, color: '#8A8D9F' },
  descInfoBtn: { marginLeft: 5, padding: 2 },

  statusBadge: { marginLeft: 'auto', backgroundColor: '#EEF0FB', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  statusBadgeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 9, color: colors.primary },

  // Assigned By -> Assigned To, ek hi compact line
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  peopleText: {
    fontFamily: 'SemiBold24',
    fontSize: 10.5,
    color: '#374151',
    flexShrink: 1,
  },

  taskStatsRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F6',

  },

  taskStatCol: {
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  taskStatLabel: {
    fontSize: 9,
    color: '#9A9CAE',
    fontFamily: 'SemiBold24',

  },

  taskStatValue: {
    fontSize: 9.5,
    color: '#1A1B2E',
    fontFamily: 'Montserrat-ExtraBold',
    marginTop: 2,
  },

  descHiddenMeasure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    left: 0,
    right: 0,
  },

  moduleModalOverlay: { flex: 1, alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  moduleModalBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    width: 220,
    maxHeight: 320,
    marginTop: 90,
    marginRight: 10,
    elevation: 6,
  },
  moduleOption: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, marginVertical: 2 },
  moduleOptionActive: { backgroundColor: '#EEF0FB' },
  moduleOptionText: { fontSize: 13, fontFamily: 'SemiBold24', color: '#000' },

  // 👇 NAYA — Description modal styles
  descModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  descModalBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    maxWidth: 380,
    elevation: 8,
  },
  descModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F6',
  },
  descModalTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15, color: '#1A1B2E' },
  descModalText: { fontFamily: 'SemiBold24', fontSize: 13, color: '#374151', lineHeight: 20 },
  descModalLabel: { fontFamily: 'SemiBold24', fontSize: 10, color: '#9CA3AF' },
  descModalValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, color: '#1A1B2E', marginTop: 2 },
  scrollArrowBtnTop: {
    position: 'absolute',
    top: 4,
    right: -10,
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
    right: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    opacity: 0.9,
  },
});