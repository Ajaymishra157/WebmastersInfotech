import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors, { baseUrl } from '../colors/Colors';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutUser from '../Components/LogoutUser';
import { ENDPOINTS } from '../CommonFile/Constant';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';

/* -------------------------------------------------------------------------- */
/*  Static config (kept outside component so it isn't re-created every render) */
/* -------------------------------------------------------------------------- */

const FILTERS = ['All', 'Pending', 'Accepted', 'Ongoing', 'Under Review', 'Completed'];

// Icon + colors for every status — replaces the old png icon set.
const STATUS_CONFIG = {
  All: { color: colors.primary, bg: '#EEF0FB', icon: 'apps-outline' },
  Ongoing: { color: '#16A34A', bg: '#E8F9EE', icon: 'rocket-outline' },
  Pending: { color: '#F59E0B', bg: '#FFF4E5', icon: 'time-outline' },
  Accepted: { color: '#2563EB', bg: '#E8F1FF', icon: 'checkmark-circle-outline' },
  'Under Review': { color: '#7C3AED', bg: '#F1EAFF', icon: 'document-text-outline' },
  Completed: { color: '#6B7280', bg: '#ECEEF1', icon: 'checkmark-done-circle-outline' },
};

const TAB_ICONS = {
  All: 'grid-outline',
  Ongoing: 'play-circle-outline',
  Pending: 'time-outline',
  Accepted: 'checkmark-circle-outline',
  'Under Review': 'document-text-outline',
  Completed: 'checkmark-done-circle-outline',
};

const getStatusConfig = status => STATUS_CONFIG[status] || STATUS_CONFIG.All;

// API sends task_status as "Pause" when an Ongoing task is paused — it still
// belongs to the Ongoing group visually and functionally (play/pause button).
const normalizeStatus = raw => {
  const s = (raw || '').trim();
  if (s === 'Pause') return 'Ongoing';
  if (!s) return 'Pending';
  return s;
};
// created_by_name aur member_name same hai ya nahi (case/space insensitive)
const isSameCreatorAssignee = item => {
  const createdBy = (item.created_by_name || '').trim().toLowerCase();
  const assignedTo = (item.member_name || '').trim().toLowerCase();
  return !!createdBy && !!assignedTo && createdBy === assignedTo;
};

// minutes ko "Xh Ym" format me convert karta hai — 60+ minutes
// automatically hours me roll-over ho jaate hain (Elapsed + Assigned dono ke liye)
const formatMinutesToHM = (totalMinutes) => {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs === 0) return `${remMins}m`;
  return remMins === 0 ? `${hrs}h` : `${hrs}h ${remMins}m`;
};

// server se aane wali date "22-07-2026 06:11 PM" ko
// "22/07/2026 06:11 PM" me convert karta hai (AM/PM already saath aata hai)
const formatServerDateDisplay = (str) => {
  if (!str) return 'N/A';
  return str.replace(/-/g, '/');
};

// elapsed seconds ko "Xh Ym Zs" (ya 60m se kam ho to "Ym Zs") format me deta hai
// elapsed seconds ko "Xh Ym Zs" ya 24+ hours ho to "Xd Yh Zm" format me deta hai
const formatElapsedDisplay = (totalSeconds) => {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);

  const parts = [];

  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    parts.push(`${days}d`);
    if (remHrs > 0) parts.push(`${remHrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    return parts.join(' ');
  }

  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);

  // 👈 FIX — 0 second ho toh "0m", 1-59 second ho toh "< 1m"
  if (parts.length === 0) {
    return secs > 0 ? '< 1m' : '0m';
  }

  return parts.join(' ');
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ACTION_MENU_WIDTH = 180;
const ACTION_MENU_HEIGHT = 150;
const FILTER_MENU_WIDTH = Math.min(300, SCREEN_WIDTH - 20);
const FILTER_MENU_HEIGHT = 220;

// Works out where a popup should sit so it appears right next to the
// button that was pressed, while staying fully on-screen.
const getAnchorFromEvent = (e, menuWidth, menuHeight) => {
  const { pageX, pageY } = e.nativeEvent;
  let left = pageX - menuWidth + 24;
  left = Math.max(10, Math.min(left, SCREEN_WIDTH - menuWidth - 10));
  let top = pageY + 12;
  if (top + menuHeight > SCREEN_HEIGHT - 20) {
    top = Math.max(20, pageY - menuHeight - 12);
  }
  return { top, left };
};

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */

// A small icon + label pill used for Assigned To / Assigned Time / Time Taken
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

// Status badge — top right of every card
const StatusBadge = ({ label, colorStatus }) => {
  const cfg = getStatusConfig(colorStatus || label);
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{label}</Text>
    </View>
  );
};

// Empty list placeholder — used for every filter tab
const EmptyState = ({ filter }) => {
  const cfg = getStatusConfig(filter);
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconWrap, { backgroundColor: cfg.bg }]}>
        <Icon name={cfg.icon} size={40} color={cfg.color} />
      </View>
      <Text style={styles.emptyText}>No {filter} tasks available at the moment.</Text>
    </View>
  );
};

// Ek card ka shimmer skeleton — config ke hisaab se dots/view-btn/chips/progress/chevron on-off hote hain
// const buildShimmerCard = (key, { hasDots, hasViewBtn, chipCount, hasProgress, hasChevron }) => (
//   <View key={key} style={[styles.card, { borderLeftColor: '#E9EAF2' }]}>
//     <View style={styles.cardTopRow}>
//       <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
//       <View style={{ flex: 1 }}>
//         <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '55%', height: 12, borderRadius: 4, marginBottom: 6 }} />
//         <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '75%', height: 14, borderRadius: 4 }} />
//       </View>
//       <View style={{ alignItems: 'flex-end' }}>
//         <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 70, height: 24, borderRadius: 20 }} />
//         {hasDots && (
//           <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 18, height: 18, borderRadius: 9, marginTop: 8 }} />
//         )}
//         {hasViewBtn && (
//           <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 60, height: 22, borderRadius: 12, marginTop: 8 }} />
//         )}
//       </View>
//     </View>

//     <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '90%', height: 11, borderRadius: 4, marginTop: 10 }} />
//     <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '60%', height: 11, borderRadius: 4, marginTop: 6 }} />

//     <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
//       {Array(chipCount).fill(null).map((_, i) => (
//         <ShimmerPlaceholder
//           key={`chip-${key}-${i}`}
//           LinearGradient={LinearGradient}
//           style={{ width: '46%', height: 36, borderRadius: 10, marginRight: '4%', marginBottom: 8 }}
//         />
//       ))}
//     </View>

//     {hasProgress && (
//       <View style={{ marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F1F6' }}>
//         <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
//           <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 50, height: 14, borderRadius: 4 }} />
//           <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 50, height: 14, borderRadius: 4 }} />
//           <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 50, height: 14, borderRadius: 4 }} />
//         </View>
//         <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '100%', height: 8, borderRadius: 4, marginTop: 8 }} />
//         <View style={{ flexDirection: 'row', marginTop: 12 }}>
//           <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '46%', height: 38, borderRadius: 20, marginRight: 8 }} />
//           <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '46%', height: 38, borderRadius: 20 }} />
//         </View>
//       </View>
//     )}

//     {hasChevron && (
//       <ShimmerPlaceholder
//         LinearGradient={LinearGradient}
//         style={styles.chevronFloatBtn}
//       />
//     )}
//   </View>
// );

const buildShimmerCard = (key, { hasDots, hasViewBtn, hasProgress, hasChevron, showAssignedTime }) => (
  <View key={key} style={[cardStyles.card, { borderLeftColor: '#E9EAF2' }]}>
    <View style={cardStyles.cardTopRow}>
      <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '50%', height: 10, borderRadius: 4, marginBottom: 5 }} />
        <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '75%', height: 13, borderRadius: 4 }} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 60, height: 18, borderRadius: 10 }} />
        {hasDots && (
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 16, height: 16, borderRadius: 8 }} />
        )}
        {/* {hasViewBtn && (
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 50, height: 18, borderRadius: 10 }} />
        )} */}
      </View>
    </View>

    <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '70%', height: 10, borderRadius: 4, marginTop: 4 }} />

    <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '55%', height: 10, borderRadius: 4, marginTop: 6 }} />

    <View style={{ flexDirection: 'row', marginTop: 5, gap: 12 }}>
      {showAssignedTime && (
        <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 55, height: 10, borderRadius: 4 }} />
      )}
      <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 55, height: 10, borderRadius: 4 }} />
      <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 70, height: 10, borderRadius: 4 }} />
    </View>

    {hasProgress && (
      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F0F1F6' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 40, height: 11, borderRadius: 4 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 40, height: 11, borderRadius: 4 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 40, height: 11, borderRadius: 4, marginLeft: 'auto' }} />
        </View>
        <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '100%', height: 5, borderRadius: 3, marginTop: 5 }} />
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ flex: 1, height: 30, borderRadius: 15 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ flex: 1, height: 30, borderRadius: 15 }} />
        </View>
      </View>
    )}

    {hasChevron && (
      <ShimmerPlaceholder LinearGradient={LinearGradient} style={cardStyles.chevronCenterBtn} />
    )}
  </View>
);

// TaskCard ke actual logic jaisa hi — kaunsa element dikhna hai wo status + admin/staff se decide hota hai
// const getShimmerConfig = (groupStatus, isAdmin) => {
//   const showProgress = groupStatus === 'Ongoing';
//   const showChevron = groupStatus !== 'Ongoing';
//   const showProgressSection = showProgress && !isAdmin; // admin ko Ongoing progress nahi dikhta
//   const showDots = isAdmin
//     ? groupStatus === 'Under Review'
//     : ['Pending', 'Accepted'].includes(groupStatus);
//   const showTimeTaken = groupStatus === 'Under Review' || groupStatus === 'Completed';
//   const showViewBtn = groupStatus === 'Ongoing';

//   // Chips: Created By + Assigned To + Created On (+Assigned Time agar progress section nahi) (+Time Taken agar applicable)
//   let chipCount = 3;
//   if (!showProgressSection) chipCount += 1;
//   if (showTimeTaken) chipCount += 1;

//   return {
//     hasDots: showDots,
//     hasViewBtn: showViewBtn,
//     chipCount,
//     hasProgress: showProgressSection,
//     hasChevron: showChevron,
//   };
// };

const getShimmerConfig = (groupStatus, isAdminLevel, isHR) => {
  const showProgress = groupStatus === 'Ongoing';
  const showChevron = true; // 👈 hamesha chevron dikhega, Ongoing me bhi
  // 👈 admin/PM aur HR dono ko Ongoing me progress section nahi
  const showProgressSection = showProgress && !isAdminLevel && !isHR;
  // 👈 HR ko kabhi dots nahi; admin/PM ko Under Review + Pending/Accepted
  // dono ka shimmer shape dikha do (real card load hote hi sahi ho jayega
  // agar unka apna task na ho)
  const showDots = isHR
    ? false
    : isAdminLevel
      ? ['Pending', 'Accepted', 'Under Review'].includes(groupStatus)
      : ['Pending', 'Accepted'].includes(groupStatus);

  return {
    hasDots: showDots,
    hasViewBtn: false,
    hasProgress: showProgressSection,
    hasChevron: showChevron,
    showAssignedTime: !showProgressSection,
  };
};

const renderTaskShimmer = (filter, memberId, isHR, isAdminLevel) => {
  // 'All' tab mixed hota hai — isliye alag-alag status ka ek-ek shimmer dikhao,
  // baaki tabs ke liye us tab ka apna shape 5 baar repeat hoga.
  const statusSequence = filter === 'All'
    ? ['Pending', 'Accepted', 'Ongoing', 'Under Review', 'Completed']
    : Array(5).fill(filter);

  const shimmerCards = statusSequence.map((status, index) =>
    buildShimmerCard(`shimmer-${index}`, getShimmerConfig(status, isAdminLevel, isHR))
  );

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
      {shimmerCards}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*  TaskCard                                                                   */
/*  PERF FIX: har card ab apna khud ka per-second timer + progress animation  */
/*  maintain karta hai (local state). Isse jab Ongoing task ka time tick hota  */
/*  hai, sirf WOHI card re-render hota hai — poori list re-render nahi hoti.  */
/*  React.memo laga hai taaki parent re-render hone par bhi ye card sirf tab  */
/*  re-render ho jab iske apne props actually change hon.                    */
/* -------------------------------------------------------------------------- */

// const TaskCard = React.memo(({
//   item,
//   variant,
//   onDotPress,
//   onNavigate,
//   onPlayToggle,
//   onCheckPress,
//   isPlaying,
//   initialElapsedSeconds,
//   assignedMinutes,
//   formatOverTotalTime,
//   memberId,
//   onShowDescription,
// }) => {
//   // For the "All" tab each card can have a different real status, so we
//   // read item.task_status and group it (Pause -> Ongoing group) for
//   // color/icon + which actions are shown. Other tabs already know their
//   // own status via `variant`.
//   const rawStatus = variant === 'All' ? item.task_status : variant;
//   const groupStatus = normalizeStatus(rawStatus);
//   const badgeLabel = variant === 'All' ? (rawStatus === 'Pause' ? 'Paused' : rawStatus) : variant;
//   const cfg = getStatusConfig(groupStatus);

//   const showProgress = groupStatus === 'Ongoing';
//   const showChevron = groupStatus !== 'Ongoing';
//   // 👈 NAYA — admin ko progress/elapsed nahi dikhega
//   // Pending/Accepted ke dots sab ko dikhte hain (jaisa pehle tha).
//   // Under Review ka dot (jisse task Completed hota hai) sirf Admin (member_id '1') ko dikhega.
// const isAdmin = memberPosition?.trim().toLowerCase() === 'ceo';
//   const showProgressSection = showProgress && !isAdmin;
//   // Admin sirf Under Review ke Completed/Reassign dots dekh/use kar sakta hai.
//   // Pending ka Accept dot aur Accepted ka Ongoing dot — dono sirf staff ko dikhte hain,
//   // admin ko kabhi nahi (chahe koi bhi tab ho — Pending, Accepted, All).
//   const showDots = isAdmin
//     ? groupStatus === 'Under Review'
//     : ['Pending', 'Accepted'].includes(groupStatus);
//   const hasTimeTaken = !!item.total_time && item.total_time !== '00:00:00';

//   const showTimeTaken =
//     groupStatus === 'Under Review' ||
//     groupStatus === 'Completed' ||
//     variant === 'All' ||
//     hasTimeTaken;
//   // Admin (member_id '1') ko hi "All" tab dikhega — staff ko nahi.


//   // 👇 LOCAL per-card timer state — seed value parent se aata hai (server data),
//   // uske baad ye card khud tick karta hai. Parent isse touch nahi karta.
//   const [localElapsed, setLocalElapsed] = useState(initialElapsedSeconds || 0);
//   const [nameTruncated, setNameTruncated] = useState(false);
//   const [descTruncated, setDescTruncated] = useState(false);
//   const showInfo = nameTruncated || descTruncated;
//   const intervalRef = useRef(null);
//   const progressAnim = useRef(new Animated.Value(0)).current;

//   // Jab bhi list refresh hoti hai (naya seed value parent se aata hai), sync karo.
//   useEffect(() => {
//     setLocalElapsed(initialElapsedSeconds || 0);
//   }, [initialElapsedSeconds]);

//   // Sirf isi card ka interval — dusre cards ko bilkul touch nahi karta.
//   useEffect(() => {
//     if (isPlaying) {
//       intervalRef.current = setInterval(() => {
//         setLocalElapsed(prev => prev + 1);
//       }, 1000);
//     }
//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//     };
//   }, [isPlaying]);

//   // Sirf apni progress bar animate karo — dusre cards ke Animated.Value ko touch nahi karta.
//   useEffect(() => {
//     const maxDuration = (assignedMinutes || 0) * 60;
//     const progress = maxDuration === 0 ? 0 : localElapsed / maxDuration;
//     Animated.timing(progressAnim, {
//       toValue: progress,
//       duration: 500,
//       useNativeDriver: false,
//     }).start();
//   }, [localElapsed, assignedMinutes]);

//   const overAssigned = localElapsed / 60 > (assignedMinutes || 0);
//   const pct = assignedMinutes
//     ? Math.min(100, Math.round((localElapsed / 60 / assignedMinutes) * 100))
//     : 0;

//   return (
//     <View style={[styles.card, { borderLeftColor: cfg.color }]}>
//       <View style={styles.cardTopRow}>
//         <View style={[styles.cardIconWrap, { backgroundColor: cfg.bg }]}>
//           <Icon name={cfg.icon} size={20} color={cfg.color} />
//         </View>

//         <View style={styles.cardTitleWrap}>
//           <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
//             <Text style={styles.cardProjectName} numberOfLines={1}>{item.project_name || 'N/A'}</Text>
//             {!!item.module_name && (
//               <View style={styles.moduleTag}>
//                 <Text style={styles.moduleTagText} numberOfLines={1}>{item.module_name}</Text>
//               </View>
//             )}
//           </View>
//           <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
//             {!!item.reassign && (
//               <View style={styles.reassignBadge}>
//                 <Text style={styles.reassignBadgeText}>{item.reassign}</Text>
//               </View>
//             )}
//             <Text
//               style={[
//                 styles.cardTitle,
//                 !!item.reassign && { color: '#DC2626' },
//                 { flexShrink: 1 },
//               ]}
//               numberOfLines={1}
//               onTextLayout={e => {
//                 if (e.nativeEvent.lines.length > 1 && !nameTruncated) setNameTruncated(true);
//               }}>
//               {item.task_name || 'N/A'}
//             </Text>
//             {showInfo && (
//               <TouchableOpacity
//                 onPress={() => onShowDescription(item)}
//                 hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
//                 style={styles.descInfoBtn}>
//                 <Icon name="information-circle-outline" size={14} color={colors.primary} />
//               </TouchableOpacity>
//             )}
//           </View>
//         </View>

//         <View style={styles.cardTopRight}>
//           <StatusBadge label={badgeLabel} colorStatus={groupStatus} />
//           {showDots && (
//             <TouchableOpacity onPress={e => onDotPress(e)} style={styles.dotsBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
//               <Icon name="ellipsis-vertical" size={18} color="#8A8D9F" />
//             </TouchableOpacity>
//           )}
//           {/* 👇 View button sirf Ongoing ke liye — yahi ek jagah hai jaha chevron ke liye space nahi hai */}
//           {groupStatus === 'Ongoing' && (
//             <TouchableOpacity onPress={onNavigate} style={styles.viewDetailsBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
//               <Icon name="eye-outline" size={16} color={colors.primary} />
//               <Text style={styles.viewDetailsBtnText}>View</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       </View>

//       {!!item.task_description && (
//         <>
//           <Text
//             style={[styles.cardDescription, styles.descHiddenMeasure]}
//             onTextLayout={e => {
//               if (e.nativeEvent.lines.length > 2 && !descTruncated) setDescTruncated(true);
//             }}>
//             {item.task_description}
//           </Text>
//           <Text style={styles.cardDescription} numberOfLines={2}>
//             {item.task_description}
//           </Text>
//         </>
//       )}

//       <View style={styles.chipsRow}>
//         {isSameCreatorAssignee(item) ? (
//           <InfoChip icon="person-circle-outline" label="Created By" value={item.created_by_name} tint={cfg.color} />
//         ) : (
//           <>
//             <InfoChip icon="person-circle-outline" label="Created By" value={item.created_by_name} tint={cfg.color} />
//             <InfoChip icon="person-outline" label="Assigned To" value={item.member_name} tint={cfg.color} />
//           </>
//         )}

//         {!showProgressSection && (
//           <InfoChip icon="time-outline" label="Assigned Time" value={formatMinutesToHM(assignedMinutes)} tint={cfg.color} />
//         )}
//         {showTimeTaken && (
//           <InfoChip
//             icon="stopwatch-outline"
//             label="Time Taken"
//             value={formatOverTotalTime(item.total_time)}
//             tint={cfg.color}
//           />
//         )}
//         {/* Created On (timestamp) — task kab banayi gayi thi */}
//         <InfoChip icon="create-outline" label="Created On" value={formatServerDateDisplay(item.timestamp)} tint={cfg.color} />

//       </View>

//       {showProgressSection && (
//         <View style={styles.progressSection}>
//           <View style={styles.progressTopRow}>
//             <View style={styles.progressStatCol}>
//               <Text style={styles.progressStatLabel}>Time Elapsed</Text>
//               <Text style={[styles.progressStatValue, { color: overAssigned ? '#DC2626' : '#16A34A' }]}>
//                 {formatElapsedDisplay(localElapsed)}
//               </Text>
//             </View>
//             <View style={styles.progressStatCol}>
//               <Text style={styles.progressStatLabel}>Assigned</Text>
//               <Text style={styles.progressStatValue}>{formatMinutesToHM(assignedMinutes)}</Text>
//             </View>
//             <View style={[styles.progressStatCol, { alignItems: 'flex-end' }]}>
//               <Text style={[styles.progressPct, { color: overAssigned ? '#DC2626' : '#16A34A' }]}>
//                 {pct}% Completed
//               </Text>
//               {overAssigned && <Text style={styles.overtimeText}>Overtime</Text>}
//             </View>
//           </View>

//           <View style={styles.progressTrack}>
//             <Animated.View
//               style={{
//                 height: 8,
//                 borderRadius: 4,
//                 backgroundColor: overAssigned ? '#DC2626' : '#16A34A',
//                 width: progressAnim.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: ['0%', '100%'],
//                   extrapolate: 'clamp',
//                 }),
//               }}
//             />
//           </View>
//           {!isAdmin && (
//             <View style={styles.progressBtnRow}>
//               <TouchableOpacity onPress={onPlayToggle} style={[styles.pillBtn, { backgroundColor: isPlaying ? '#16A34A' : '#16A34A' }]}>
//                 <Icon name={isPlaying ? 'pause' : 'play'} size={14} color="#fff" />
//                 <Text style={styles.pillBtnText}>{isPlaying ? 'Pause' : 'Resume'}</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={e => onCheckPress(e)} style={[styles.pillBtn, { backgroundColor: colors.primary, marginLeft: 10 }]}>
//                 <Icon name="checkmark-circle-outline" size={14} color="#fff" />
//                 <Text style={styles.pillBtnText}>Review</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>
//       )}

//       {showChevron && (
//         <TouchableOpacity onPress={onNavigate} style={styles.chevronFloatBtn}>
//           <Icon name="chevron-forward" size={18} color={colors.primary} />
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// });


const TaskCard = React.memo(({
  item,
  variant,
  onDotPress,
  onNavigate,
  onPlayToggle,
  onCheckPress,
  isPlaying,
  initialElapsedSeconds,
  assignedMinutes,
  formatOverTotalTime,
  memberId,
  isHR,
  isAdminLevel,   // 👈 NAYA — real admin YA Project Manager, dono ke liye true
  onShowDescription,
}) => {
  const rawStatus = variant === 'All' ? item.task_status : variant;
  const groupStatus = normalizeStatus(rawStatus);
  const badgeLabel = variant === 'All' ? (rawStatus === 'Pause' ? 'Paused' : rawStatus) : variant;
  const cfg = getStatusConfig(groupStatus);

  const showProgress = groupStatus === 'Ongoing';
  // const showChevron = groupStatus !== 'Ongoing';
  const showChevron = true;
  // 👈 FIX — HR aur admin/PM (isAdminLevel) dono ko Ongoing me progress-section
  // nahi dikhega, sirf plain assigned/taken time chip dikhega
  const showProgressSection = showProgress && !isAdminLevel && !isHR;
  // 👈 task khud isi member ne banaya hai ya nahi (created_by id match)
  const isOwnTask = String(item.created_by) === String(memberId);
  // 👈 FIX — HR ko kabhi dots nahi. Admin/PM (isAdminLevel) ko Under Review ke
  // dots hamesha milte hain, aur Pending/Accepted ke dots SIRF tab jab task
  // unhone khud banaya ho (isOwnTask). Baaki (normal staff) ko Pending/Accepted.
  const showDots = isHR
    ? false
    : isAdminLevel
      ? groupStatus === 'Under Review' || (isOwnTask && ['Pending', 'Accepted'].includes(groupStatus))
      : ['Pending', 'Accepted'].includes(groupStatus);

  // 👈 FIX — Time Taken ab hamesha dikhega. Agar total_time hi nahi hai (task
  // start hi nahi hua / assign hi nahi hua) to "Not Assigned". Agar hai (chahe
  // 0 ho, matlab abhi tak kaam shuru nahi hua) to formatOverTotalTime dikhayega.
  const timeTakenDisplay = item.total_time
    ? formatOverTotalTime(item.total_time)
    : 'Not Assigned';

  const [localElapsed, setLocalElapsed] = useState(initialElapsedSeconds || 0);
  const [nameTruncated, setNameTruncated] = useState(false);
  const [descTruncated, setDescTruncated] = useState(false);
  const showInfo = nameTruncated || descTruncated;
  const intervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLocalElapsed(initialElapsedSeconds || 0);
  }, [initialElapsedSeconds]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setLocalElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const maxDuration = (assignedMinutes || 0) * 60;
    const progress = maxDuration === 0 ? 0 : localElapsed / maxDuration;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [localElapsed, assignedMinutes]);

  const overAssigned = localElapsed / 60 > (assignedMinutes || 0);
  const pct = assignedMinutes
    ? Math.min(100, Math.round((localElapsed / 60 / assignedMinutes) * 100))
    : 0;

  const showAssignedArrow = !isSameCreatorAssignee(item) && !!item.member_name;

  return (
    <View style={[cardStyles.card, { borderLeftColor: cfg.color }]}>
      <View style={cardStyles.cardTopRow}>
        <View style={[cardStyles.cardIconWrap, { backgroundColor: cfg.bg }]}>
          <Icon name={cfg.icon} size={16} color={cfg.color} />
        </View>

        <View style={cardStyles.cardTitleWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={cardStyles.cardProjectName} numberOfLines={1}>{item.project_name || 'N/A'}</Text>
            {!!item.module_name && (
              <Text style={cardStyles.moduleTagText} numberOfLines={1}> · {item.module_name}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
            {!!item.reassign && (
              <View style={cardStyles.reassignBadge}>
                <Text style={cardStyles.reassignBadgeText}>{item.reassign}</Text>
              </View>
            )}
            <Text
              style={[
                cardStyles.cardTitle,
                !!item.reassign && { color: '#DC2626' },
                { flexShrink: 1 },
              ]}
              numberOfLines={1}
              onTextLayout={e => {
                if (e.nativeEvent.lines.length > 1 && !nameTruncated) setNameTruncated(true);
              }}>
              {item.task_name || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={cardStyles.cardTopRight}>
          <StatusBadge label={badgeLabel} colorStatus={groupStatus} />
          {showDots && (
            <TouchableOpacity onPress={e => onDotPress(e)} style={cardStyles.dotsBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="ellipsis-vertical" size={16} color="#8A8D9F" />
            </TouchableOpacity>
          )}
          {/* {groupStatus === 'Ongoing' && (
            <TouchableOpacity onPress={onNavigate} style={cardStyles.viewDetailsBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="eye-outline" size={13} color={colors.primary} />
              <Text style={cardStyles.viewDetailsBtnText}>View</Text>
            </TouchableOpacity>
          )} */}
        </View>
      </View>

      {!!item.task_description && (
        <View style={cardStyles.descRow}>
          {/* 👈 FIX — hidden measure ab poori width/style match karta hai visible line ke, aur threshold >1 hai (kyuki visible sirf 1 line dikhata hai) */}
          <Text
            style={[cardStyles.cardDescription, cardStyles.descHiddenMeasure]}
            onTextLayout={e => {
              if (e.nativeEvent.lines.length > 1 && !descTruncated) setDescTruncated(true);
            }}>
            {item.task_description}
          </Text>
          <Text style={cardStyles.cardDescription} numberOfLines={1}>
            {item.task_description}
          </Text>
          {showInfo && (
            <TouchableOpacity
              onPress={() => onShowDescription(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={cardStyles.descInfoBtn}>
              <Icon name="information-circle-outline" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={cardStyles.peopleRow}>
        <Icon name="person-circle-outline" size={12} color={cfg.color} />
        <Text style={cardStyles.peopleText} numberOfLines={1}>
          {item.created_by_name || 'N/A'}
          {showAssignedArrow ? `  →  ${item.member_name}` : ''}
        </Text>
      </View>

      {/* 👈 FIX — Taken aur Created ab hamesha dikhte hain, condition hata di */}
      <View style={cardStyles.timeRow}>
        {!showProgressSection && (
          <View style={cardStyles.timeItem}>
            <Text style={cardStyles.timeLabel}>Assigned:</Text>
            <Text style={cardStyles.timeValue}>{formatMinutesToHM(assignedMinutes)}</Text>
          </View>
        )}
        {!showProgressSection && (
          <View style={cardStyles.timeItem}>
            <Text style={cardStyles.timeLabel}>Taken:</Text>
            <Text style={cardStyles.timeValue}>{timeTakenDisplay}</Text>
          </View>
        )}
        <View style={cardStyles.timeItem}>
          <Text style={cardStyles.timeLabel}>Created:</Text>
          <Text style={cardStyles.timeValue}>{formatServerDateDisplay(item.timestamp)}</Text>
        </View>
      </View>

      {showProgressSection && (
        <View style={cardStyles.progressSection}>
          <View style={cardStyles.progressTopRow}>
            <Text style={[cardStyles.progressStatValue, { color: overAssigned ? '#DC2626' : '#16A34A' }]}>
              {formatElapsedDisplay(localElapsed)}
            </Text>
            <Text style={cardStyles.progressStatValue}> / {formatMinutesToHM(assignedMinutes)}</Text>
            <Text style={[cardStyles.progressPct, { color: overAssigned ? '#DC2626' : '#16A34A' }]}>
              {pct}%{overAssigned ? ' · Overtime' : ''}
            </Text>
          </View>

          <View style={cardStyles.progressTrack}>
            <Animated.View
              style={{
                height: 5,
                borderRadius: 3,
                backgroundColor: overAssigned ? '#DC2626' : '#16A34A',
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              }}
            />
          </View>
          {!isAdminLevel && (
            <View style={cardStyles.progressBtnRow}>
              <TouchableOpacity onPress={onPlayToggle} style={[cardStyles.pillBtn, { backgroundColor: '#16A34A' }]}>
                <Icon name={isPlaying ? 'pause' : 'play'} size={12} color="#fff" />
                <Text style={cardStyles.pillBtnText}>{isPlaying ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={e => onCheckPress(e)} style={[cardStyles.pillBtn, { backgroundColor: colors.primary, marginLeft: 8 }]}>
                <Icon name="checkmark-circle-outline" size={12} color="#fff" />
                <Text style={cardStyles.pillBtnText}>Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {showChevron && (
        <TouchableOpacity onPress={onNavigate} style={cardStyles.chevronCenterBtn}>
          <Icon name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
});
/* -------------------------------------------------------------------------- */
/*  Main screen                                                               */
/* -------------------------------------------------------------------------- */

const Task = ({ route }) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [tabCounts, setTabCounts] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [memberId, setMemberId] = useState('');
  const [memberPosition, setMemberPosition] = useState('');
  const [TaskId, setTaskId] = useState([]);
  // Staff filter (From Date / Till Date / Select Staff row)
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null); // null => khud ke tasks
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [punchInModal, setPunchInModal] = useState({ visible: false, message: '' });
  const [taskSearch, setTaskSearch] = useState('');   // 👈 NAYA
  const [descModalVisible, setDescModalVisible] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState({
    projectName: '', moduleName: '', taskName: '', description: '',
  });
  const [selectedDescription, setSelectedDescription] = useState('');
  const [FilterModal, setFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Pending');
  const [AcceptModal, setAcceptModal] = useState(false);
  const [OnGoingModal, setOnGoingModal] = useState(false);
  const [OnReviewModal, setOnReviewModal] = useState(false);
  const [rightSign, setRightSign] = useState(false);
  // States add karo (component ke top me, existing states ke saath)
  const [descAtTop, setDescAtTop] = useState(true);
  const [descAtBottom, setDescAtBottom] = useState(false);
  const [descIsScrollable, setDescIsScrollable] = useState(false);
  const descScrollRef = useRef(null);
  // 👈 NAYA — real admin vs HR ko alag rakha hai:
  // isAdmin = sirf member_id '1' (task create, Under Review dots, full access)
  // isHR = position 'HR' hai lekin id '1' nahi (admin jaisa view, koi action nahi)
  // isAdminOrHR = dono, filters/date-row/search dikhane ke liye
  const isAdmin = memberPosition?.trim().toLowerCase() === 'ceo';
  const isHR = memberPosition?.trim().toLowerCase() === 'hr' && !isAdmin;
  const isPM = memberPosition?.trim().toLowerCase() === 'project manager' && !isAdmin;
  const isAdminLevel = isAdmin || isPM;
  const isAdminOrHR = isAdminLevel || isHR;
  const VisibleFilters = isAdminOrHR ? FILTERS : FILTERS.filter(f => f !== 'All');

  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignSelectedStaff, setReassignSelectedStaff] = useState(null); // 👈 NAYA
  const [reassignMessageModalVisible, setReassignMessageModalVisible] = useState(false); // 👈 NAYA
  // Scroll handler
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

  // Where the currently open popup/menu should be positioned (next to the
  // button that was pressed).
  const [menuAnchor, setMenuAnchor] = useState({ top: 80, left: SCREEN_WIDTH - FILTER_MENU_WIDTH - 20 });

  const [taskList, setTaskList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [visibleTasks, setVisibleTasks] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [batchSize] = useState(30);

  const [isFromDatePickerVisible, setFromDatePickerVisibility] = useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [FromDateError, setFromDateError] = useState('');
  const [TillDateError, setTillDateError] = useState('');
  const [reassignMessage, setReassignMessage] = useState('');

  // PERF FIX: elapsedMap ab sirf "seed" values store karta hai (server se
  // aane wale total_time), per-second yaha update nahi hota — wo ab
  // TaskCard ke andar local state me hota hai. Isse parent re-render nahi hota.
  const [isPlayingMap, setIsPlayingMap] = useState({});
  const [elapsedMap, setElapsedMap] = useState({});
  const [assignedTimeMap, setAssignedTimeMap] = useState({});

  const [errorModal, setErrorModal] = useState({ visible: false, message: '', title: 'Cannot Start Task' });
  const [reassignSuccessModal, setReassignSuccessModal] = useState({ visible: false, message: '' });
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [reassignStaffSearch, setReassignStaffSearch] = useState('');


  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      const position = await AsyncStorage.getItem('member_position'); // 👈 NAYA
      setMemberId(id);
      setMemberPosition(position || ''); // 👈 NAYA
    };
    getMemberId();
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      const response = await fetch(ENDPOINTS.ListMember);
      const data = await response.json();
      if (data.status) {
        // sirf Active staff, member_id '1' (CEO) chodke
        const activeStaff = data.payload.filter(
          m => m.status === 'Active' && m.member_position?.trim().toLowerCase() !== 'ceo'
        );
        setStaffList(activeStaff);
      }
    } catch (error) {
      console.error('Error fetching staff list:', error);
    }
  };

  const filteredStaff = staffList.filter(m =>
    m.member_name?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  // 👇 NAYA — reassign modal ke apne search ke liye alag filtered list
  const filteredReassignStaff = staffList.filter(m =>
    m.member_name?.toLowerCase().includes(reassignStaffSearch.toLowerCase())
  );
  const displayedTasks = taskSearch.trim()
    ? taskList.filter(t => {
      const q = taskSearch.toLowerCase();
      return (
        t.project_name?.toLowerCase().includes(q) ||
        t.module_name?.toLowerCase().includes(q) ||
        t.task_name?.toLowerCase().includes(q)
      );
    })
    : visibleTasks;


  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.filterStatus) {
        setSelectedFilter(route.params.filterStatus);
        setFromDate('');
        setTillDate('');
        setFromDateError('');
        setTillDateError('');
      }
    }, [route?.params?.filterStatus]),
  );

  useFocusEffect(
    React.useCallback(() => {
      if (memberId) {
        FilterTask(selectedFilter);
        fetchTabCounts();
      }
    }, [memberId, selectedFilter, selectedStaff, fromDate, tillDate]),
  );

  // PERF FIX: ye ab EK HI jagah hai jaha se FilterTask trigger hota hai —
  // pehle 3 alag effects (focus wala, isFocused wala, aur Completed/UnderReview/
  // Accepted wala) same data ko duplicate fetch kar rahe the. Ab sirf ye ek
  // effect focus + memberId + filter + staff + date changes pe fetch karega.
  useEffect(() => {
    if (memberId) {
      FilterTask(selectedFilter);
    }
  }, [memberId, selectedFilter, selectedStaff, fromDate, tillDate]);

  // 👇 YE NAYA HAI, isko yaha add karo
  useEffect(() => {
    if (memberId) {
      fetchTabCounts();
    }
  }, [memberId, selectedStaff, fromDate, tillDate]);
  useEffect(() => {
    if (memberId && !isAdminLevel && selectedFilter === 'All') {
      setSelectedFilter('Pending');
    }
  }, [memberId, isAdminLevel, selectedFilter]);

  useEffect(() => {
    const loadElapsed = async () => {
      try {
        const stored = await AsyncStorage.getItem('taskElapsedMap');
        if (stored) setElapsedMap(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load elapsedMap:', e);
      }
    };
    loadElapsed();
  }, []);

  // "00:20" -> 20 mins. Also supports the newer "45M" / "2H" / "1H30M" style
  // that the API now sends in hours_assigned.
  const parseAssignedTime = timeStr => {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();

    // Plain "00:20" (hh:mm, digits only) — NOT "1H:30M" jisme letters mixed hain
    if (/^\d+:\d+$/.test(str)) {
      const [hours, minutes] = str.split(':').map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    }

    // "1H:30M", "1H 30M", "45M", "2H" — sab yaha handle honge
    const hMatch = /(\d+)\s*H/i.exec(str);
    const mMatch = /(\d+)\s*M/i.exec(str);
    if (hMatch || mMatch) {
      const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
      const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
      return hours * 60 + minutes;
    }

    const n = parseInt(str, 10);
    return isNaN(n) ? 0 : n;
  };

  // "00:00:24" -> 24 seconds. Backend can occasionally send a malformed or
  // negative string (bad data) — treat anything unparsable/negative as 0
  // rather than letting the timer show garbage.
  const parseTimeToSeconds = timeStr => {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();
    if (str.startsWith('-')) return 0;
    const parts = str.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    const [hh, mm, ss] = parts;
    return hh * 3600 + mm * 60 + ss;
  };

  // Server sends dates like "03-07-2026 02:42 PM" (started_on / timestamp).
  const parseServerDate = str => {
    if (!str) return null;
    const match = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(str.trim());
    if (!match) return null;
    const [, dd, mm, yyyy, hhRaw, min, ampm] = match;
    let hh = parseInt(hhRaw, 10);
    if (/pm/i.test(ampm) && hh !== 12) hh += 12;
    if (/am/i.test(ampm) && hh === 12) hh = 0;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), hh, Number(min), 0);
  };

  const showFromDatePicker = () => setFromDatePickerVisibility(true);
  const hideFromDatePicker = () => setFromDatePickerVisibility(false);
  const showTillDatePicker = () => setTillDatePickerVisibility(true);
  const hideTillDatePicker = () => setTillDatePickerVisibility(false);

  const formatDate = date => {
    if (!(date instanceof Date)) return { display: '', api: '' };
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return { display: `${day}/${month}/${year}`, api: `${year}-${month}-${day}` };
  };

  const handleFromDateConfirm = date => {
    hideFromDatePicker();
    const { api } = formatDate(date);
    setFromDate(api);
    setFromDateError('');
  };

  const handleTillDateConfirm = date => {
    hideTillDatePicker();
    const { api } = formatDate(date);
    setTillDate(api);
    setTillDateError('');
  };

  const handleFilterPress = status => {
    setSelectedFilter(status);
    setFilterModal(false);
    // Note: `selectedFilter` change already triggers FilterTask via the
    // useEffect above — no need to call it again here (avoids duplicate call).
  };

  const showErrorModal = (msg, title = 'Cannot Start Task') => {
    setErrorModal({ visible: true, message: msg || 'Something went wrong', title });
  };

  // Toggles ONLY the tapped task's play state (each task now tracks its own
  // is_running state coming from the panel, so we no longer stop every
  // other task when one is started).
  const handleTogglePlay = async taskId => {
    const isNowPlaying = !isPlayingMap[taskId];
    const action = isNowPlaying ? 'Ongoing' : 'Pause';

    const body = {
      task_id: taskId,
      action,
      who_did: memberId,
      status_note: isNowPlaying ? 'Task started' : 'Task paused',   // 👈 NAYA
    };

    console.log('Request Body:', body);
    console.log('Request Body JSON:', JSON.stringify(body));

    try {
      const response = await fetch(ENDPOINTS.UpdateTaskStatus, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.code === 200 && data.status === true) {
        setIsPlayingMap(prev => ({ ...prev, [taskId]: isNowPlaying }));
      } else {
        console.warn('API failed:', data.message);
        showErrorModal(data.message);
      }
    } catch (error) {
      console.error('API error:', error);
    }
  };

  const FilterTask = async status => {
    const url = ENDPOINTS.StatusWiseTaskList;

    const fmt = date => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d)) return '';
      return d.toLocaleDateString('en-GB').split('/').join('-'); // DD-MM-YYYY
    };

    const body = {
      status,
      member_id: selectedStaff ? selectedStaff.member_id : memberId,
      start_date: fromDate ? fmt(fromDate) : '',
      end_date: tillDate ? fmt(tillDate) : '',
    };

    try {
      setLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (result.code == 200) {
        const payload = result.payload || [];
        setTaskList(payload);

        const assignedMap = {};
        payload.forEach(task => {
          assignedMap[task.task_id] = parseAssignedTime(task.hours_assigned);
        });
        setAssignedTimeMap(assignedMap);
        setVisibleTasks(payload.slice(0, batchSize));

        // Keep local play state in sync with what the panel says is running.
        setIsPlayingMap(prev => {
          const next = { ...prev };
          payload.forEach(task => {
            next[task.task_id] = !!task.is_running;
          });
          return next;
        });

        // Elapsed SEED value — set once per fetch. TaskCard picks this up as
        // its starting point and then ticks locally every second on its own.
        //  - Paused task -> seed straight from total_time, so pressing
        //    Play/Resume continues counting up from there (not from 0).
        //  - Running task -> total_time is the time already banked from
        //    earlier sessions; add the time elapsed since started_on for
        //    the currently running session on top of that.
        setElapsedMap(prev => {
          const next = { ...prev };
          payload.forEach(task => {
            const bankedSeconds = parseTimeToSeconds(task.total_time);
            if (task.is_running) {
              const startedDate = parseServerDate(task.started_on);
              const sinceStart = startedDate
                ? Math.max(0, Math.floor((Date.now() - startedDate.getTime()) / 1000))
                : 0;
              next[task.task_id] = bankedSeconds + sinceStart;
            } else {
              next[task.task_id] = bankedSeconds;
            }
          });
          return next;
        });
      } else {
        setTaskList([]);
        setVisibleTasks([]);
      }
    } catch (error) {
      console.log('Error:', error);
      setTaskList([]);
      setVisibleTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTabCounts = async () => {
    const url = ENDPOINTS.StatusWiseTaskList;

    const fmt = date => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d)) return '';
      return d.toLocaleDateString('en-GB').split('/').join('-');
    };

    const body = {
      status: 'All',
      member_id: selectedStaff ? selectedStaff.member_id : memberId,
      start_date: fromDate ? fmt(fromDate) : '',
      end_date: tillDate ? fmt(tillDate) : '',
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.code == 200) {
        const payload = result.payload || [];
        const counts = { All: payload.length, Ongoing: 0, Pending: 0, Accepted: 0, 'Under Review': 0, Completed: 0 };
        payload.forEach(task => {
          const group = normalizeStatus(task.task_status);
          if (counts[group] !== undefined) counts[group]++;
        });
        setTabCounts(counts);
      }
    } catch (error) {
      console.log('Error fetching tab counts:', error);
    }
  };

  const loadMoreTasks = () => {
    if (loadingMore || visibleTasks.length >= taskList.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      const nextIndex = visibleTasks.length + batchSize;
      setVisibleTasks(taskList.slice(0, nextIndex));
      setLoadingMore(false);
    }, 1000);
  };

  // Each of these opens its popup right next to the button that was tapped.
  const dotmodal = (data, e) => {
    setTaskId(data.task_id);
    setMenuAnchor(getAnchorFromEvent(e, ACTION_MENU_WIDTH, ACTION_MENU_HEIGHT));
    setAcceptModal(true);
  };
  const dotAccept = (data, e) => {
    setTaskId(data.task_id);
    setMenuAnchor(getAnchorFromEvent(e, ACTION_MENU_WIDTH, ACTION_MENU_HEIGHT));
    setOnGoingModal(true);
  };
  const RightSign = (data, e) => {
    setTaskId(data.task_id);
    setMenuAnchor(getAnchorFromEvent(e, ACTION_MENU_WIDTH, ACTION_MENU_HEIGHT));
    setRightSign(true);
  };
  const OnReview = (data, e) => {
    setTaskId(data.task_id);
    setSelectedTask(data);   // 👈 NAYA — current assignee track karne ke liye
    setMenuAnchor(getAnchorFromEvent(e, ACTION_MENU_WIDTH, ACTION_MENU_HEIGHT));
    setOnReviewModal(true);
  };;
  const isPunchInRequired = (result) =>
    !!result?.punch_required || /punch/i.test(result?.message || '');

  const updateStatus = async (task_id, action, refreshFilter, onSuccess) => {
    try {
      const response = await fetch(ENDPOINTS.UpdateTaskStatus, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id,
          action,
          who_did: memberId,
          status_note: `Task ${action}`,
        }),
      });
      const result = await response.json();
      if (result.code == 200) {
        FilterTask(refreshFilter);
        fetchTabCounts();
        onSuccess?.();
      } else if (isPunchInRequired(result)) {
        // 👈 NAYA — punch-in required modal
        setPunchInModal({ visible: true, message: result.message || 'Please punch in first to start this task.' });
      } else {
        showErrorModal(result.message);
      }
    } catch (error) {
      console.log('Error updating task status:', error);
    }
  };

  const reassignTask = async (task_id, new_member_id) => {
    try {
      setReassignLoading(true);
      const response = await fetch(ENDPOINTS.reassign_task_api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id,
          user_id: new_member_id,
          message: reassignMessage,
        }),
      });
      const result = await response.json();

      if (result.status === 'success') {
        setReassignModalVisible(false);
        setReassignMessageModalVisible(false);
        setReassignSelectedStaff(null);
        setReassignStaffSearch('');
        setReassignMessage('');
        FilterTask(selectedFilter === 'All' ? 'All' : 'Under Review');
        fetchTabCounts();
        setReassignSuccessModal({ visible: true, message: result.message || 'Task reassigned successfully' });
      } else {
        console.log('Reassign API failed response:', result);
        showErrorModal(result.message || 'Failed to reassign task', 'Reassign Failed');
      }
    } catch (error) {
      console.log('Error reassigning task:', error);
      showErrorModal('Something went wrong while reassigning', 'Reassign Failed');
    } finally {
      setReassignLoading(false);
    }
  };

  // Status change hote hi turant usi status ke tab par switch ho jao — user ko turant
  // dikhe ki task ab kaha gaya. 'All' admin ke liye special case nahi rakha, har tab
  // pe yahi behavior chahiye jaisa maanga gaya hai.
  const statusChanged = (task_id, action) =>
    updateStatus(task_id, action, 'Accepted', () => setSelectedFilter('Accepted'));

  const statusChanged1 = (task_id, action) =>
    updateStatus(task_id, action, 'Ongoing', () => {
      if (action === 'Ongoing') {
        setIsPlayingMap(prev => ({ ...prev, [task_id]: true }));
      }
      setSelectedFilter('Ongoing');
    });

  const statusChanged2 = (task_id, action) =>
    updateStatus(task_id, action, 'Under Review', () => setSelectedFilter('Under Review'));

  const statusChanged3 = (task_id, action) =>
    updateStatus(task_id, action, 'Completed', () => setSelectedFilter('Completed'));

  // PERF FIX: parent-level per-second interval poori tarah hata diya gaya hai.
  // Ab per-task timer TaskCard ke andar local state me handle hota hai, isliye
  // yaha koi setInterval / Animated.timing loop nahi chahiye — wahi cheez thi
  // jo har second POORI list re-render kar rahi thi.

  // PERF FIX: har second AsyncStorage.setItem bhi hata diya — elapsedMap ab
  // sirf FilterTask fetch ke time update hota hai (seed values), isliye
  // persistence ki zarurat kaafi kam ho gayi hai aur disk I/O bach gaya.

  const formatOverTotalTime = timeString => {
    if (!timeString) return '0m';   // 👈 FIX — no time string = 0m, not < 1m
    const cleaned = String(timeString).replace(/[^\d:]/g, '').trim();
    const parts = cleaned.split(':');
    if (parts.length !== 3) return '--';
    const hrNum = parseInt(parts[0], 10) || 0;
    const minNum = parseInt(parts[1], 10) || 0;
    const secNum = parseInt(parts[2], 10) || 0;
    const totalSeconds = hrNum * 3600 + minNum * 60 + secNum;
    return formatElapsedDisplay(totalSeconds);
  };

  const formatDatetochange = dateStr => {
    if (!dateStr) return '';
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length !== 3) return '';
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  };

  const onDotPressFor = (item, e) => {
    const groupStatus = selectedFilter === 'All' ? normalizeStatus(item.task_status) : selectedFilter;
    if (groupStatus === 'Pending') return dotmodal(item, e);
    if (groupStatus === 'Accepted') return dotAccept(item, e);
    if (groupStatus === 'Under Review') return OnReview(item, e);
  };

  return (
    <View style={styles.screen}>
      <LogoutUser />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Tasks</Text>

        {/* Empty placeholder */}
        <View style={[styles.headerBtn, { backgroundColor: 'transparent' }]} />
      </View>

      {/* Date filter row — one reusable block for every tab */}
      {isAdminOrHR && (
        <View style={styles.dateCard}>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>From Date</Text>
              <TouchableOpacity onPress={showFromDatePicker} style={styles.dateInputCompact}>
                <Icon name="calendar-outline" size={12} color={colors.primary} style={{ marginRight: 3 }} />
                <Text style={styles.dateValueCompact} numberOfLines={1}>{formatDatetochange(fromDate) || 'dd/mm/yyyy'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.dateCol, { marginLeft: 6 }]}>
              <Text style={styles.dateLabel}>Till Date</Text>
              <TouchableOpacity onPress={showTillDatePicker} style={styles.dateInputCompact}>
                <Icon name="calendar-outline" size={12} color={colors.primary} style={{ marginRight: 3 }} />
                <Text style={styles.dateValueCompact} numberOfLines={1}>{formatDatetochange(tillDate) || 'dd/mm/yyyy'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.dateCol, { marginLeft: 6 }]}>
              <Text style={styles.dateLabel}>Select Staff</Text>
              <TouchableOpacity onPress={() => setShowStaffModal(true)} style={styles.dateInputCompact}>
                <Icon name="person-outline" size={12} color={colors.primary} style={{ marginRight: 3 }} />
                <Text
                  style={[styles.dateValueCompact, !selectedStaff && { color: '#9CA3AF' }]}
                  numberOfLines={1}>
                  {selectedStaff ? selectedStaff.member_name : 'All Staff'}
                </Text>
                {selectedStaff ? (
                  <TouchableOpacity
                    onPress={() => setSelectedStaff(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close-circle" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : (
                  <Icon name="chevron-down-outline" size={12} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.taskSearchBox}>
            <Icon name="search-outline" size={13} color="#9CA3AF" />
            <TextInput
              style={styles.taskSearchInput}
              placeholder="Search by project / module / task..."
              placeholderTextColor="#9CA3AF"
              value={taskSearch}
              onChangeText={setTaskSearch}
            />
            {taskSearch.length > 0 && (
              <TouchableOpacity onPress={() => setTaskSearch('')}>
                <Icon name="close-circle" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

      )}

      {/* 👇 NAYA — search box ab staff aur admin dono ko dikhega */}
      {!isAdminOrHR && (
        <View style={styles.taskSearchBoxOuter}>
          <View style={styles.taskSearchBox}>
            <Icon name="search-outline" size={13} color="#9CA3AF" />
            <TextInput
              style={styles.taskSearchInput}
              placeholder="Search by project / module / task..."
              placeholderTextColor="#9CA3AF"
              value={taskSearch}
              onChangeText={setTaskSearch}
            />
            {taskSearch.length > 0 && (
              <TouchableOpacity onPress={() => setTaskSearch('')}>
                <Icon name="close-circle" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Status tabs */}
      <View style={styles.tabsWrap}>
        <FlatList
          data={VisibleFilters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => {
            const active = selectedFilter === item;
            const count = tabCounts[item];
            return (
              <TouchableOpacity
                onPress={() => handleFilterPress(item)}
                style={[styles.tabItem, active && styles.tabItemActive]}>
                <Icon name={TAB_ICONS[item]} size={16} color={active ? colors.primary : '#8A8D9F'} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item}</Text>
                {/* 👇 NAYA: All tab pe count nahi, baaki sab pe dikhega — 0 ho to bhi hide */}
                {item !== 'All' && !!count && (
                  <View style={styles.tabCountBadge}>
                    <Text style={styles.tabCountText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>


      <DateTimePicker
        isVisible={isFromDatePickerVisible}
        mode="date"
        onConfirm={handleFromDateConfirm}
        onCancel={hideFromDatePicker}
      />
      <DateTimePicker
        isVisible={isTillDatePickerVisible}
        mode="date"
        onConfirm={handleTillDateConfirm}
        onCancel={hideTillDatePicker}
        minimumDate={fromDate ? new Date(fromDate) : new Date()}
      />

      {/* List */}
      {loading ? (
        renderTaskShimmer(selectedFilter, memberId, isHR, isAdminLevel)
      ) : (
        <Animatable.View animation="fadeInUp" duration={500} style={{ flex: 1 }}>
          <FlatList
            data={displayedTasks}
            keyExtractor={(item, index) => `${item.task_id}-${index}`}
            onEndReached={loadMoreTasks}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<EmptyState filter={selectedFilter} />}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 10 }} />
              ) : null
            }
            contentContainerStyle={styles.listContent}
            // PERF FIX: FlatList tuning — kam initial cards render karo, batch
            // size choti rakho, window size limit karo, aur offscreen views ko
            // clip karo. Isse scrolling smooth rehti hai bade list ke saath.
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            windowSize={7}
            removeClippedSubviews={true}
            renderItem={({ item }) => (
              <TaskCard
                item={item}
                variant={selectedFilter}
                onDotPress={e => onDotPressFor(item, e)}
                onNavigate={() =>
                  navigation.navigate('TaskDetail', {
                    task_id: item.task_id,
                    filterStatus: selectedFilter,
                  })
                }
                onPlayToggle={() => handleTogglePlay(item.task_id)}
                onCheckPress={e => RightSign(item, e)}
                isPlaying={isPlayingMap[item.task_id]}
                initialElapsedSeconds={elapsedMap[item.task_id]}
                assignedMinutes={assignedTimeMap[item.task_id]}
                formatOverTotalTime={formatOverTotalTime}
                memberId={memberId}
                isHR={isHR}
                isAdminLevel={isAdminLevel}      // 👈 NAYA
                onShowDescription={taskItem => {
                  setSelectedTaskDetails({
                    projectName: taskItem.project_name,
                    moduleName: taskItem.module_name,
                    taskName: taskItem.task_name,
                    description: taskItem.task_description,
                  });
                  setDescAtTop(true);       // 👈 NAYA
                  setDescAtBottom(false);   // 👈 NAYA
                  setDescIsScrollable(false); // 👈 NAYA — onContentSizeChange dobara set karega
                  setDescModalVisible(true);
                }}
              />
            )}
          />
        </Animatable.View>
      )}



      {/* Add Task button — floating, center-bottom — sirf real admin, HR nahi */}
      {!isHR && (
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddTask')}>
          <Icon name="add" size={18} color="#fff" />
          <Text style={styles.addText}>Add Task</Text>
        </TouchableOpacity>
      )}

      {/* Filter menu — opens right next to the filter icon */}
      <Modal visible={FilterModal} transparent animationType="fade" onRequestClose={() => setFilterModal(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPressOut={() => setFilterModal(false)}>
          <View style={[styles.popoverBox, { top: menuAnchor.top, left: menuAnchor.left, width: FILTER_MENU_WIDTH }]}>
            <Text style={styles.modalHeading}>Choose an Option</Text>
            <View style={styles.filterChipsWrap}>
              {FILTERS.map(item => (
                <TouchableOpacity
                  key={item}
                  onPress={() => handleFilterPress(item)}
                  style={[styles.filterChip, selectedFilter === item && styles.filterChipActive]}>
                  <Icon
                    name={TAB_ICONS[item]}
                    size={14}
                    color={selectedFilter === item ? '#fff' : '#666'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.filterChipText, selectedFilter === item && styles.filterChipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Pending -> Accept menu — opens right next to that card's dots */}
      {(selectedFilter === 'Pending' || selectedFilter === 'All') && (
        <Modal visible={AcceptModal} transparent animationType="fade" onRequestClose={() => setAcceptModal(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPressOut={() => setAcceptModal(false)}>
            <View style={[styles.popoverBox, { top: menuAnchor.top, left: menuAnchor.left, width: ACTION_MENU_WIDTH }]}>
              <Text style={styles.modalHeading}>Choose an action</Text>
              <Text style={styles.modalStatus}>Status: {selectedTask?.status || 'Pending'}</Text>
              <TouchableOpacity
                onPress={() => {
                  statusChanged(TaskId, 'Accepted');
                  setAcceptModal(false);
                }}
                style={styles.actionBtn}>
                <Icon name="checkmark" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Accepted -> Ongoing menu — opens right next to that card's dots */}
      {(selectedFilter === 'Accepted' || selectedFilter === 'All') && (
        <Modal visible={OnGoingModal} transparent animationType="fade" onRequestClose={() => setOnGoingModal(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPressOut={() => setOnGoingModal(false)}>
            <View style={[styles.popoverBox, { top: menuAnchor.top, left: menuAnchor.left, width: ACTION_MENU_WIDTH }]}>
              <Text style={styles.modalHeading}>Choose an action</Text>
              <Text style={styles.modalStatus}>Status: {selectedTask?.status || 'Ongoing'}</Text>
              <TouchableOpacity
                onPress={() => {
                  statusChanged1(TaskId, 'Ongoing');
                  setOnGoingModal(false);
                }}
                style={styles.actionBtn}>
                <Icon name="play" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Ongoing</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Ongoing -> Under Review menu — opens right next to the checkmark button */}
      {(selectedFilter === 'Ongoing' || selectedFilter === 'All') && (
        <Modal visible={rightSign} transparent animationType="fade" onRequestClose={() => setRightSign(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPressOut={() => setRightSign(false)}>
            <View style={[styles.popoverBox, { top: menuAnchor.top, left: menuAnchor.left, width: ACTION_MENU_WIDTH }]}>
              <Text style={styles.modalHeading}>Choose an action</Text>
              <Text style={styles.modalStatus}>Status: {selectedTask?.status || 'Ongoing'}</Text>
              <TouchableOpacity
                onPress={() => {
                  statusChanged2(TaskId, 'Under Review');
                  setRightSign(false);
                }}
                style={styles.actionBtn}>
                <Icon name="document-text-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Under Review</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Under Review -> Completed menu — opens right next to that card's dots */}
      {/* Under Review -> Completed / Reassign menu — opens right next to that card's dots */}
      {(selectedFilter === 'Under Review' || selectedFilter === 'All') && (
        <Modal visible={OnReviewModal} transparent animationType="fade" onRequestClose={() => setOnReviewModal(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPressOut={() => setOnReviewModal(false)}>
            <View style={[styles.popoverBox, { top: menuAnchor.top, left: menuAnchor.left, width: ACTION_MENU_WIDTH }]}>
              <Text style={styles.modalHeading}>Choose an action</Text>
              <Text style={styles.modalStatus}>Status: {selectedTask?.status || 'Under Review'}</Text>
              <TouchableOpacity
                onPress={() => {
                  statusChanged3(TaskId, 'Completed');
                  setOnReviewModal(false);
                }}
                style={styles.actionBtn}>
                <Icon name="checkmark-done" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Completed</Text>
              </TouchableOpacity>

              {/* 👇 NAYA — Reassign option */}
              <TouchableOpacity
                onPress={() => {
                  setOnReviewModal(false);
                  setReassignModalVisible(true);
                }}
                style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 8 }]}>
                <Icon name="swap-horizontal" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Reassign</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {/* Error / validation message from API (e.g. already working on a task) */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, message: '' })}>
        <View style={styles.errorBackdrop}>
          <View style={styles.errorBox}>
            <View style={styles.errorIconWrap}>
              <Icon name="alert-circle" size={30} color="#DC2626" />
            </View>
            <Text style={styles.errorTitle}>Cannot Start Task</Text>
            <Text style={styles.errorMessage}>{errorModal.message}</Text>
            <TouchableOpacity
              style={styles.errorOkBtn}
              onPress={() => setErrorModal({ visible: false, message: '' })}>
              <Text style={styles.errorOkBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Staff Select Modal */}
      <Modal visible={showStaffModal} transparent animationType="slide" onRequestClose={() => setShowStaffModal(false)}>
        <View style={styles.staffModalOverlay}>
          <View style={styles.staffModalContent}>
            <View style={styles.staffModalHeader}>
              <Text style={styles.staffModalTitle}>Select Staff</Text>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                <Icon name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.staffSearchBox}>
              <Icon name="search-outline" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.staffSearchInput}
                placeholder="Search staff..."
                placeholderTextColor="#9CA3AF"
                value={staffSearch}
                onChangeText={setStaffSearch}
              />

            </View>

            <FlatList
              data={filteredStaff}
              keyExtractor={item => item.member_id?.toString()}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                !staffSearch ? (
                  <TouchableOpacity
                    style={styles.staffRow}
                    onPress={() => {
                      setSelectedStaff(null);
                      setShowStaffModal(false);
                      setStaffSearch('');
                    }}>
                    <View style={styles.staffAvatar}>
                      <Icon name="people-outline" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffName}>All Staff</Text>
                    </View>
                    {!selectedStaff && (
                      <Icon name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ) : null
              }

              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.staffRow}
                  onPress={() => {
                    setSelectedStaff(item);
                    setShowStaffModal(false);
                    setStaffSearch('');
                  }}>
                  <View style={styles.staffAvatar}>
                    <Icon name="person-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{item.member_name}</Text>
                    {!!item.member_position && (
                      <Text style={styles.staffPosition}>{item.member_position}</Text>
                    )}
                  </View>
                  {selectedStaff?.member_id === item.member_id && (
                    <Icon name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>No staff found</Text>
              }
            />
          </View>
        </View>
      </Modal>
      {/* Reassign Staff Select Modal */}
      {/* Reassign Staff Select Modal */}
      <Modal visible={reassignModalVisible} transparent animationType="slide" onRequestClose={() => setReassignModalVisible(false)}>
        <View style={styles.staffModalOverlay}>
          <View style={styles.staffModalContent}>
            <View style={styles.staffModalHeader}>
              <Text style={styles.staffModalTitle}>Reassign To</Text>
              <TouchableOpacity onPress={() => { setReassignModalVisible(false); setReassignStaffSearch(''); }} disabled={reassignLoading}>
                <Icon name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.staffSearchBox}>
              <Icon name="search-outline" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.staffSearchInput}
                placeholder="Search staff..."
                placeholderTextColor="#9CA3AF"
                value={reassignStaffSearch}
                onChangeText={setReassignStaffSearch}
              />
              {reassignStaffSearch.length > 0 && (
                <TouchableOpacity onPress={() => setReassignStaffSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredReassignStaff}
              keyExtractor={item => item.member_id?.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.staffRow}
                  onPress={() => {
                    setReassignSelectedStaff(item);
                    setReassignModalVisible(false);
                    setReassignStaffSearch('');
                    setReassignMessageModalVisible(true);
                  }}>
                  <View style={styles.staffAvatar}>
                    <Icon name="person-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{item.member_name}</Text>
                    {!!item.member_position && (
                      <Text style={styles.staffPosition}>{item.member_position}</Text>
                    )}
                  </View>
                  {String(selectedTask?.user_id) === String(item.member_id) && (
                    <Icon name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>No staff found</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Reassign Message Modal — staff select karne ke baad khulta hai, message optional */}
      <Modal
        visible={reassignMessageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!reassignLoading) {
            setReassignMessageModalVisible(false);
            setReassignMessage('');
            setReassignSelectedStaff(null);
          }
        }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {
          setReassignMessageModalVisible(false);
          setReassignMessage('');
          setReassignSelectedStaff(null);
        }
        } style={styles.errorBackdrop}>
          <View style={styles.errorBox} onStartShouldSetResponder={() => true}>
            <View style={styles.errorIconWrap}>
              <Icon name="swap-horizontal" size={28} color={colors.primary} />
            </View>
            <Text style={styles.errorTitle}>Reassign to {reassignSelectedStaff?.member_name}</Text>
            <View style={[styles.reassignMessageRow, { width: '100%', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, marginBottom: 16 }]}>
              <Icon name="chatbox-outline" size={16} color="#9CA3AF" />
              <TextInput
                style={[styles.reassignTextInput, styles.reassignMessageInput]}
                placeholder="Reason / message (optional)..."
                placeholderTextColor="#9CA3AF"
                value={reassignMessage}
                onChangeText={setReassignMessage}
                multiline
              />
            </View>

            {reassignLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <View style={{ flexDirection: 'row', width: '100%' }}>
                <TouchableOpacity
                  style={[styles.errorOkBtn, { flex: 1, backgroundColor: '#9CA3AF', marginRight: 8 }]}
                  onPress={() => {
                    setReassignMessageModalVisible(false);
                    setReassignMessage('');
                    setReassignSelectedStaff(null);
                  }}>
                  <Text style={styles.errorOkBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.errorOkBtn, { flex: 1 }]}
                  onPress={() => reassignTask(TaskId, reassignSelectedStaff?.member_id)}>
                  <Text style={styles.errorOkBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Punch-in required modal — Ongoing shuru karne se pehle punch-in zaroori hai */}
      <Modal
        visible={punchInModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPunchInModal({ visible: false, message: '' })}>
        <View style={styles.errorBackdrop}>
          <View style={styles.errorBox}>
            <View style={styles.errorIconWrap}>
              <Icon name="finger-print-outline" size={30} color="#F59E0B" />
            </View>
            <Text style={styles.errorTitle}>Punch In Required</Text>
            <Text style={styles.errorMessage}>{punchInModal.message}</Text>
            <TouchableOpacity
              style={styles.errorOkBtn}
              onPress={() => {
                setPunchInModal({ visible: false, message: '' });
                navigation.navigate('Deshboard');  // 👈 apna actual Dashboard screen ka naam yaha daalo
              }}>
              <Text style={styles.errorOkBtnText}>Punch In Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reassign Success Modal */}
      <Modal
        visible={reassignSuccessModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setReassignSuccessModal({ visible: false, message: '' })}>
        <View style={styles.errorBackdrop}>
          <View style={styles.errorBox}>
            <View style={[styles.errorIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Icon name="checkmark-circle" size={30} color="#16A34A" />
            </View>
            <Text style={styles.errorTitle}>Task Reassigned</Text>
            <Text style={styles.errorMessage}>{reassignSuccessModal.message}</Text>
            <TouchableOpacity
              style={[styles.errorOkBtn, { backgroundColor: '#16A34A' }]}
              onPress={() => setReassignSuccessModal({ visible: false, message: '' })}>
              <Text style={styles.errorOkBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  headerTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 17,
    color: '#fff',
  },

  taskSearchBoxOuter: {
    backgroundColor: '#fff',
    marginTop: 5,
    marginHorizontal: 5,
    borderRadius: 14,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  tabsWrap: { backgroundColor: '#fff', paddingTop: 4, paddingBottom: 10, marginTop: 5 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F8',
    marginRight: 8,
    marginTop: 8,        // 👈 NAYA — badge ke liye upar jagah
    position: 'relative',
  },
  tabItemActive: { backgroundColor: '#EEF0FB', borderWidth: 1, borderColor: colors.primary },
  tabText: { fontFamily: 'SemiBold24', fontSize: 12, color: '#8A8D9F', marginLeft: 5 },
  tabTextActive: { color: colors.primary, fontFamily: 'Montserrat-ExtraBold' },

  dateCard: {
    backgroundColor: '#fff',
    marginTop: 5,
    marginHorizontal: 5,
    borderRadius: 14,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end' },
  dateCol: { flex: 1 },
  dateLabel: {
    color: colors.primary,
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 11,
    marginBottom: 5,
  },
  required: { color: 'red', fontFamily: 'Montserrat-ExtraBold' },
  dateInputCompact: {
    width: '100%',
    height: 30,
    borderWidth: 1,
    borderColor: '#E4E5EE',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    backgroundColor: '#F9FAFC',
  },
  dateValueCompact: {
    flex: 1,
    fontFamily: 'SemiBold24',
    color: '#000',
    fontSize: 9.5,
  },
  errorText: { color: 'red', fontFamily: 'SemiBold24', marginLeft: 2, marginTop: 2, fontSize: 11 },
  searchBtn: {
    width: 42,
    height: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 10,
  },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  listContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 90, flexGrow: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 12,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardProjectName: {
    fontSize: 12,
    fontFamily: 'Montserrat-ExtraBold',
    color: colors.primary,
    marginRight: 6,
  },
  moduleTag: {
    backgroundColor: '#F3F4F8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  moduleTagText: {
    fontSize: 10,
    fontFamily: 'SemiBold24',
    color: '#8A8D9F',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat-ExtraBold',
    color: '#1A1B2E',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'SemiBold24',
    color: '#8A8D9F',
    marginTop: 1,
  },
  cardTopRight: { alignItems: 'flex-end' },
  dotsBtn: { marginTop: 8 },

  cardDescription: {
    fontFamily: 'SemiBold24',
    fontSize: 12,
    color: '#666',
    lineHeight: 17,
    flexShrink: 1,     // 👈 zaroori — isi se icon bahar nahi jayega
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#EEF0FB',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 4,
    gap: 3,
  },
  viewDetailsBtnText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    color: colors.primary,
  },
  descHiddenMeasure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    left: 12,
    right: 12,
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  descInfoBtn: {
    marginLeft: 6,
    marginBottom: 1,
    flexShrink: 0,     // 👈 icon apna size fix rakhega, kabhi squeeze nahi hoga
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  badgeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FB',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 6,
    maxWidth: '49%',
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

  progressSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F6',
  },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStatCol: {},
  progressStatLabel: { fontFamily: 'SemiBold24', fontSize: 10, color: '#9A9CAE' },
  progressStatValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, marginTop: 1, color: '#1A1B2E' },
  progressPct: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },
  overtimeText: { fontFamily: 'SemiBold24', fontSize: 10, color: '#DC2626', marginTop: 2 },

  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E9EAF2',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },

  progressBtnRow: { flexDirection: 'row', marginTop: 12 },
  pillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 20,
  },
  pillBtnText: { color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 12, marginLeft: 6 },

  chevronFloatBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyWrap: { marginTop: 50, alignItems: 'center', paddingHorizontal: 20 },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: { fontSize: 14, fontFamily: 'Montserrat-Medium', color: '#999', textAlign: 'center' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderColor: '#ccc',
  },
  addBtn: {
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    height: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 22,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addText: { fontFamily: 'Montserrat-ExtraBold', color: '#fff', fontSize: 13, marginLeft: 5 },

  // Generic popup/menu system — every modal (filter menu + all status-action
  // menus) reuses this backdrop + positioned box so it can anchor next to
  // whichever button opened it.
  backdrop: { flex: 1 },
  popoverBox: {
    position: 'absolute',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  modalHeading: { fontFamily: 'Montserrat-ExtraBold', color: '#000', fontSize: 13 },
  filterChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F8',
    borderRadius: 8,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { color: '#000', fontFamily: 'SemiBold24' },
  filterChipTextActive: { color: '#fff' },

  modalStatus: { fontFamily: 'SemiBold24', marginTop: 12, marginBottom: 10, color: '#000' },
  actionBtn: {
    flexDirection: 'row',
    backgroundColor: '#00c853',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontFamily: 'SemiBold24' },
  errorBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  errorTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15, color: '#1A1B2E', marginBottom: 6 },
  errorMessage: { fontFamily: 'SemiBold24', fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  errorOkBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  errorOkBtnText: { color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  searchBtnDisabled: {
    backgroundColor: '#CFCFCF',
    opacity: 0.7,
  },
  staffSelectBox: {
    marginTop: 8,
    height: 42,
    borderWidth: 1,
    borderColor: '#E4E5EE',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFC',
  },
  staffModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  staffModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '75%',
  },
  staffModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  staffModalTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 16, color: '#111827' },
  staffSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 10,
    paddingHorizontal: 10, marginBottom: 10, gap: 8,
  },
  staffSearchInput: { flex: 1, paddingVertical: 10, fontFamily: 'SemiBold24', fontSize: 13, color: '#111827' },
  staffRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  staffAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#EEF0FB', alignItems: 'center', justifyContent: 'center',
  },
  staffName: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, color: '#111827' },
  staffPosition: { fontFamily: 'SemiBold24', fontSize: 11, color: '#9CA3AF' },
  tabCountBadge: {
    position: 'absolute',
    top: -8,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 10,           // 👈 NAYA — hamesha upar dikhe
  },
  tabCountText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 9,
    color: '#fff',
  },
  taskSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFC',
    borderWidth: 1,
    borderColor: '#E4E5EE',
    borderRadius: 8,
    height: 30,          // 👈 chota height
    paddingHorizontal: 8,
    marginTop: 8,
    gap: 5,
  },
  taskSearchInput: {
    flex: 1,
    fontFamily: 'SemiBold24',
    fontSize: 11,
    color: '#111827',
    padding: 0,
  },
  reassignBadge: {
    marginRight: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  reassignBadgeText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 9,
    color: '#DC2626',
  },
  descRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  descInfoBtn: { marginLeft: 6, padding: 2 },

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
  reassignInputContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  reassignSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reassignMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reassignTextInput: {
    flex: 1,
    fontFamily: 'SemiBold24',
    fontSize: 13,
    color: '#111827',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  reassignMessageInput: {
    minHeight: 44,
    textAlignVertical: 'top',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 10,
    paddingRight: 20,   // 👈 NAYA — arrow ke liye thoda extra right space
    marginVertical: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    position: 'relative',   // 👈 NAYA
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardProjectName: {
    fontSize: 10.5,
    fontFamily: 'Montserrat-ExtraBold',
    color: colors.primary,
  },
  moduleTagText: {
    fontSize: 10.5,
    fontFamily: 'SemiBold24',
    color: '#8A8D9F',
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat-ExtraBold',
    color: '#1A1B2E',
  },
  cardTopRight: { alignItems: 'flex-end', gap: 6 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  badgeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 9 },

  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF0FB',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 3,
    gap: 4,
  },
  viewDetailsBtnText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 9,
    color: colors.primary,
  },
  dotsBtn: {},

  descRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardDescription: {
    fontFamily: 'SemiBold24',
    fontSize: 10.5,
    color: '#8A8D9F',
    flexShrink: 1,
  },
  descHiddenMeasure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    left: 12,
    right: 12,
  },
  descInfoBtn: { marginLeft: 5, flexShrink: 0 },

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

  timeRow: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 12,
    flexWrap: 'wrap',   // 👈 NAYA — teeno items ek line me na aa paye to wrap ho jayega
  },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeLabel: { fontFamily: 'SemiBold24', fontSize: 9.5, color: '#9A9CAE' },
  timeValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10.5, color: '#1A1B2E' },

  progressSection: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F6',
  },
  progressTopRow: { flexDirection: 'row', alignItems: 'center' },
  progressStatValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11, color: '#1A1B2E' },
  progressPct: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11, marginLeft: 'auto' },

  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#E9EAF2',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 5,
  },

  progressBtnRow: { flexDirection: 'row', marginTop: 8 },
  pillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    borderRadius: 15,
  },
  pillBtnText: { color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 11, marginLeft: 5 },

  reassignBadge: {
    marginRight: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  reassignBadgeText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 9,
    color: '#DC2626',
  },

  chevronCenterBtn: {
    position: 'absolute',
    right: 0,
    top: '55%',
    marginTop: -9,      // icon height (18) ka half — perfect vertical center
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});



export default Task;