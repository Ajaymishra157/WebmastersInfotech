import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import DateTimePicker from 'react-native-modal-datetime-picker';
import * as Animatable from 'react-native-animatable';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { ENDPOINTS } from '../CommonFile/Constant';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommunityDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

// ---- NEW: modal ke andar FlatList ki fixed height — arrow calculation isi
// constant se hoga, taaki Android par onLayout ke timing issues na aayein ----
const LIST_HEIGHT = 400;

const Allattendance = () => {
  const navigation = useNavigation();
  const [isFromDatePickerVisible, setFromDatePickerVisibility] =
    useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] =
    useState(false);
  const [selectedField, setSelectedField] = useState(null); // 'from' or 'till'
  const [fromDate, setFromDate] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [fromDateDisplay, setFromDateDisplay] = useState('');
  const [tillDateDisplay, setTillDateDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [AttendanceList, setAttendanceList] = useState([]);
  const [modalvisible, setModalVisible] = useState(false);
  const [memberList, setMemberList] = useState([]);
  const [selectedMember, setSelectedMember] = useState('All');
  const [ModalVisibles, setModalVisibles] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [attendanceDetails, setAttendanceDetails] = useState([]);
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisibl, setModalVisibl] = useState(false);
  const [singleAttendance, setSingleAttendance] = useState([]);
  const [staffId, setStaffId] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [selectedMemberName, setSelectedMemberName] = useState('');
  const [isCeoOrHr, setIsCeoOrHr] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editMemberName, setEditMemberName] = useState('');
  const [editRecords, setEditRecords] = useState([]);
  const [editTimes, setEditTimes] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState(null); // { attendanceId, field: 'in' | 'out' }

  const filteredMembers = memberList.filter(member => {
    const matchesSearch = member.member_name
      .toLowerCase()
      .includes(searchText.toLowerCase());

    if (statusFilter === 'All') return matchesSearch;
    return member.status === statusFilter && matchesSearch;
  });

  // ---- NEW: Member-level modal — loading state + scroll tracking ----
  const [memberModalLoading, setMemberModalLoading] = useState(false);
  const [memberModalContentH, setMemberModalContentH] = useState(0);
  const [memberModalOffsetY, setMemberModalOffsetY] = useState(0);
  const memberModalListRef = useRef(null);

  // ---- NEW: Edit modal — loading state + scroll tracking ----
  const [editModalContentH, setEditModalContentH] = useState(0);
  const [editModalOffsetY, setEditModalOffsetY] = useState(0);
  const editModalListRef = useRef(null);

  // ---- NEW: Single day modal — loading state + scroll tracking ----
  const [singleModalLoading, setSingleModalLoading] = useState(false);
  const [singleModalContentH, setSingleModalContentH] = useState(0);
  const [singleModalOffsetY, setSingleModalOffsetY] = useState(0);
  const singleModalListRef = useRef(null);

  // ---- NEW: derived values, fixed LIST_HEIGHT ke against — loading complete
  // hote hi FlatList apni final size ke saath render hoti hai, isliye
  // scrollable/atTop/atBottom bina scroll kiye hi turant sahi ban jaate hai ----
  const memberModalScrollable = memberModalContentH > LIST_HEIGHT + 2;
  const memberModalAtTop = memberModalOffsetY <= 4;
  const memberModalAtBottom =
    memberModalOffsetY + LIST_HEIGHT >= memberModalContentH - 40;

  const singleModalScrollable = singleModalContentH > LIST_HEIGHT + 2;
  const singleModalAtTop = singleModalOffsetY <= 4;
  const singleModalAtBottom =
    singleModalOffsetY + LIST_HEIGHT >= singleModalContentH - 40;

  const editModalScrollable = editModalContentH > LIST_HEIGHT + 2;
  const editModalAtTop = editModalOffsetY <= 4;
  const editModalAtBottom =
    editModalOffsetY + LIST_HEIGHT >= editModalContentH - 40;

  const handleMemberModalScroll = (e) => {
    setMemberModalOffsetY(e.nativeEvent.contentOffset.y);
  };
  const handleMemberModalContentSize = (w, h) => {
    setMemberModalContentH(h);
  };

  const handleSingleModalScroll = (e) => {
    setSingleModalOffsetY(e.nativeEvent.contentOffset.y);
  };
  const handleSingleModalContentSize = (w, h) => {
    setSingleModalContentH(h);
  };

  const handleEditModalScroll = (e) => {
    setEditModalOffsetY(e.nativeEvent.contentOffset.y);
  };
  const handleEditModalContentSize = (w, h) => {
    setEditModalContentH(h);
  };

  useEffect(() => {
    const checkRole = async () => {
      try {
        const position = await AsyncStorage.getItem('member_position'); // ⚠️ apna actual key name lagao
        if (position) {
          const normalized = position.trim().toUpperCase();
          if (normalized === 'CEO' || normalized === 'HR') {
            setIsCeoOrHr(true);
          }
        }
      } catch (error) {
        console.log('Error checking role:', error);
      }
    };
    checkRole();
  }, []);

  const activeMembers = memberList.filter(
    member =>
      member.status === 'Active' &&
      member.member_name.toLowerCase().includes(searchText.toLowerCase())
  );

  // 1 se 20 tak (poore selected range) ka total time sahi se sum karta hai
  const sumOverTotalWorkingHours = hoursArray => {
    if (!Array.isArray(hoursArray) || hoursArray.length === 0) return '--';

    let totalMinutes = 0;
    hoursArray.forEach(t => {
      if (!t) return;
      const parts = String(t).split(':').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        totalMinutes += parts[0] * 60 + parts[1];
      }
    });

    if (totalMinutes === 0) return '--';

    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;

    // 24+ hours ho to din me convert karo — "Xd Yh Zm"
    if (hh >= 24) {
      const days = Math.floor(hh / 24);
      const remHrs = hh % 24;
      let result = `${days}d`;
      if (remHrs > 0) result += ` ${remHrs}H`;
      if (mm > 0) result += ` ${mm}M`;
      return result;
    }

    return hh > 0 ? `${hh}H ${mm}M` : `${mm}M`;
  };

  const [overTotalWorkingHours, setOverTotalWorkingHours] = useState([]);

  const isFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => {
      if (isFocused) {
        const today = new Date();
        const { display, api } = formatDate(today);
        setFromDateDisplay(display);
        setTillDateDisplay(display);
        setFromDate(api);
        setTillDate(api);
        StaffAttendance(api, api); // default call on load
      }
      // Ye effect SIRF screen focus hone par chalega, kisi bhi filter/modal
      // state change par nahi (pehle selectedMemberId bhi dependency mein
      // tha jiski wajah se date range reset ho jati thi).
    }, [isFocused]),
  );

  const showFromDatePicker = () => {
    setFromDatePickerVisibility(true);
  };

  const hideFromDatePicker = () => {
    setFromDatePickerVisibility(false);
  };
  const formatDate = date => {
    if (!(date instanceof Date)) {
      return {
        display: '',
        api: '',
      };
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return {
      display: `${day}/${month}/${year}`, // For UI
      api: `${year}-${month}-${day}`, // For API
    };
  };

  const handleFromDateConfirm = date => {
    hideFromDatePicker();
    const { display, api } = formatDate(date);
    setFromDateDisplay(display);
    setFromDate(api);
  };

  const showTillDatePicker = () => {
    setTillDatePickerVisibility(true);
  };

  const hideTillDatePicker = () => {
    setTillDatePickerVisibility(false);
  };

  const handleTillDateConfirm = date => {
    hideTillDatePicker();
    const today = new Date();
    today.setHours(23, 59, 59, 999); // aaj ka poora din allow
    const safeDate = date > today ? today : date;
    const { display, api } = formatDate(safeDate);
    setTillDateDisplay(display);
    setTillDate(api);
  };

  // ------------------------------------------------------------------
  // ListAttendance -> used inside the "Details" modals (per-member view)
  // ------------------------------------------------------------------
  const StaffSelectedAttendance = async (startDate, endDate, memberId) => {
    const url = ENDPOINTS.ListAttendance;
    try {
      const bodyData = {
        start_date: startDate,
        end_date: endDate,
      };

      if (memberId) {
        bodyData.member_id = memberId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });
      const result = await response.json();

      if (result.code == 200) {
        const allAttendanceDetails = result.payload.flatMap(
          item => item.attendance_details,
        );
        setSingleAttendance(allAttendanceDetails);

        const overHours = result.payload.map(
          item => item.over_total_working_hour,
        );
        setOverTotalWorkingHours(overHours);
      }
    } catch (error) {
      console.log('Error fetching attendance:', error);
    }
  };

  // ------------------------------------------------------------------
  // ListGroupAttendance -> used for the MAIN screen list (grouped cards)
  // payload aata hai: [{ attendance_date, records: [{ attendance_member_id,
  //   member_name, punch_in, punch_out, total_working_hour, total_task_hour,
  //   attendance_status }] }] -> isliye flatten karke attendance_date har
  // record ke sath jodte hai.
  // ------------------------------------------------------------------
  const StaffAttendance = async (
    startDate = fromDate,
    endDate = tillDate,
    memberId = selectedMemberId,
  ) => {
    setLoading(true);
    const url = ENDPOINTS.ListGroupAttendance;

    try {
      const bodyData = {
        start_date: startDate,
        end_date: endDate,
      };

      if (memberId) {
        bodyData.member_id = memberId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const result = await response.json();

      if (result.code === 200) {
        const flattened = (result.payload || []).flatMap(dayItem =>
          (dayItem.records || []).map(rec => ({
            ...rec,
            attendance_date: dayItem.attendance_date,
          })),
        );

        setAttendanceList(flattened);
        const firstDate = result.payload[0]?.attendance_date || null;
        setSelectedDate(firstDate);
        MemberList();
      }
    } catch (error) {
      console.log('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const MemberList = async () => {
    const url = ENDPOINTS.ListMember;

    const response = await fetch(url);
    const result = await response.json();
    if (result.code == 200) {
      setMemberList(result.payload);
      const ids = result.payload.map(item => item.member_id);
      setStaffId(ids);
    }
  };
  useEffect(() => {
    MemberList();
  }, []);

  const filter = () => {
    setModalVisible(true);
    MemberList();
  };

  useEffect(() => {
    if (selectedMember) {
      const filteredList = AttendanceList.filter(
        item => item.member_name === selectedMember,
      );
      setAttendanceList(filteredList);
    }
  }, [selectedMember]);

  const getUniqueMemberNames = list => {
    const namesSet = new Set();
    list.forEach(item => {
      if (item.member_name) {
        namesSet.add(item.member_name);
      }
    });
    return Array.from(namesSet);
  };

  const DetailsAttendance = async (memberId, fromDate, tillDate) => {
    const url = ENDPOINTS.ListAttendance;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: memberId,
          start_date: fromDate,
          end_date: tillDate,
        }),
      });

      const result = await response.json();
      if (result.code === 200) {
        const dates = result.payload.map(item => item.attendance_date);
        setAttendanceDates(dates);

        const allAttendanceDetails = result.payload.flatMap(
          item => item.attendance_details,
        );
        setAttendanceDetails(allAttendanceDetails);

        const overHours = result.payload.map(
          item => item.over_total_working_hour,
        );
        setOverTotalWorkingHours(overHours);
      }
    } catch (error) {
      console.log('Error:', error);
    }
  };

  // ---- CHANGE: purana data turant clear + loader ON, tab modal open karo,
  // fetch complete hote hi loader OFF. Isse "purani list dikhna" wala
  // bug fix ho jayega aur arrow bhi final data ke sath hi calculate hoga ----
  const openDetailsModal = (memberId, memberName) => {
    setSelectedMemberName(memberName || '');
    setAttendanceDetails([]);
    setAttendanceDates([]);
    setOverTotalWorkingHours([]);
    setMemberModalOffsetY(0);
    setMemberModalContentH(0);
    setMemberModalLoading(true);
    setModalVisibles(true);

    DetailsAttendance(memberId, fromDate, tillDate).finally(() => {
      setMemberModalLoading(false);
    });
  };


  const fetchEditableAttendance = async (memberId, startDate, endDate) => {
    const url = ENDPOINTS.ListGroupAttendance; // ← CHANGE: ab attendance_id yahi se milega
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, start_date: startDate, end_date: endDate }),
      });
      const result = await response.json();
      if (result.code === 200) {
        let counter = 0;
        const allDetails = result.payload.flatMap(item => {
          const rawList = item.records || [];

          return rawList
            .map(d => {
              const inTime = d.punch_in ?? d.attendance_in ?? null;
              const outTime = d.punch_out ?? d.attendance_out ?? null;
              return { ...d, _in: inTime, _out: outTime };
            })
            .filter(d => {
              const hasIn = d._in && d._in !== '-' && d._in !== 'NULL';
              const hasOut = d._out && d._out !== '-' && d._out !== 'NULL';
              return hasIn || hasOut;
            })
            .map(d => {
              counter += 1;
              return {
                ...d,
                attendance_date: item.attendance_date,
                attendance_in: d._in,
                attendance_out: d._out,
                _rowKey: `${d.attendance_id ?? 'x'}_${counter}`,
              };
            });
        });

        setEditRecords(allDetails);
        const initialTimes = {};
        allDetails.forEach(rec => {
          initialTimes[rec._rowKey] = {
            in: rec.attendance_in && rec.attendance_in !== '-' ? rec.attendance_in : '',
            out: rec.attendance_out && rec.attendance_out !== '-' ? rec.attendance_out : '',
          };
        });
        setEditTimes(initialTimes);
      }
    } catch (error) {
      console.log('Error fetching editable attendance:', error);
    }
  };
  // User jo bhi type kare (7:00, 19:00, 2:01, 7) — usko "hh:mm AM/PM" mein
  // convert karta hai. 24-hour tarike se samjhta hai: 0-11 = AM, 12-23 = PM.
  // Agar user pehle se AM/PM likh de to usko bhi normalize kar deta hai.
  const formatFlexibleTimeInput = raw => {
    if (!raw) return '';
    const trimmed = String(raw).trim();

    // Agar AM/PM already likha hai
    const ampmMatch = trimmed.match(/^(\d{1,2}):?(\d{0,2})\s?(AM|PM)$/i);
    if (ampmMatch) {
      let [, hh, mm, ampm] = ampmMatch;
      hh = parseInt(hh, 10);
      mm = mm ? parseInt(mm, 10) : 0;
      if (hh < 1 || hh > 12 || mm > 59) return trimmed; // invalid, jaisa likha waisa hi bhej do
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm.toUpperCase()}`;
    }

    // Sirf number wala 24-hour format — 7:00, 19:00, 2:01, 7
    const plainMatch = trimmed.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (plainMatch) {
      let [, hh, mm] = plainMatch;
      hh = parseInt(hh, 10);
      mm = mm ? parseInt(mm, 10) : 0;
      if (isNaN(hh) || hh > 23 || mm > 59) return trimmed; // invalid input

      const ampm = hh >= 12 ? 'PM' : 'AM';
      let hour12 = hh % 12;
      if (hour12 === 0) hour12 = 12;

      return `${String(hour12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
    }

    return trimmed; // samajh nahi aaya to jaisa type kiya waisa hi
  };

  const openEditModal = (memberId, memberName) => {
    setEditMemberName(memberName || '');
    setEditRecords([]);
    setEditTimes({});
    setEditModalOffsetY(0);        // ← NEW
    setEditModalContentH(0);
    setEditModalLoading(true);
    setEditModalVisible(true);
    fetchEditableAttendance(memberId, fromDate, tillDate).finally(() => setEditModalLoading(false));
  };
  // "09:15 AM" jaisi string ko Date object mein todta hai (time picker ke
  // initial value ke liye). Agar time hi nahi hai (--) to current time dikhega.
  const parseTimeStringToDate = timeStr => {
    const fallback = new Date();

    if (!timeStr || timeStr === '-' || timeStr === '--') {
      return fallback;
    }

    const value = String(timeStr).trim().toUpperCase();

    let hours;
    let minutes;

    // 09:15 AM / 9:15 PM
    let match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);

      if (match[3] === 'PM' && hours !== 12) {
        hours += 12;
      }

      if (match[3] === 'AM' && hours === 12) {
        hours = 0;
      }
    } else {
      // 09:15 / 09:15:00 / 9:15
      match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
      }
    }

    // Invalid time ho to current time fallback
    if (
      hours === undefined ||
      minutes === undefined ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return fallback;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date;
  };

  // Date object ko "09:15 AM" jaise format mein wapas convert karta hai
  const formatTimeForApi = date => {
    if (!(date instanceof Date)) return '';
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    const hoursStr = String(hours).padStart(2, '0');
    return `${hoursStr}:${minutes} ${ampm}`;
  };

  const openTimePicker = (rowKey, field, currentValue) => {
    const initialDate = parseTimeStringToDate(currentValue);

    const record = editRecords.find(r => r._rowKey === rowKey);
    const baseIn = editTimes[rowKey]?.in ?? (record?.attendance_in !== '-' ? record?.attendance_in : '') ?? '';
    const baseOut = editTimes[rowKey]?.out ?? (record?.attendance_out !== '-' ? record?.attendance_out : '') ?? '';

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'time',
        is24Hour: false,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            const formatted = formatTimeForApi(selectedDate);
            setEditTimes(prev => ({
              ...prev,
              [rowKey]: {
                in: field === 'in' ? formatted : (prev[rowKey]?.in ?? baseIn),
                out: field === 'out' ? formatted : (prev[rowKey]?.out ?? baseOut),
              },
            }));
          }
        },
      });
    } else {
      setTimePickerTarget({ rowKey, field, initialDate, baseIn, baseOut });
    }
  };
  const closeTimePicker = () => setTimePickerTarget(null);

  const handleTimePickerConfirm = date => {
    if (!timePickerTarget) return;
    const { attendanceId, field } = timePickerTarget;
    const formatted = formatTimeForApi(date);

    setEditTimes(prev => ({
      ...prev,
      [attendanceId]: { ...prev[attendanceId], [field]: formatted },
    }));
    closeTimePicker();
  };

  const toApiDateFormat = dateStr => {
    if (!dateStr) return '';
    const [dd, mm, yyyy] = dateStr.split('-');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Kisi row ka time original se different hai ya nahi, check karta hai
  const isRowChanged = rec => {
    const times = editTimes[rec._rowKey];
    if (!times) return false;
    const origIn = rec.attendance_in && rec.attendance_in !== '-' ? rec.attendance_in : '';
    const origOut = rec.attendance_out && rec.attendance_out !== '-' ? rec.attendance_out : '';
    return times.in !== origIn || times.out !== origOut;
  };

  const saveAllChangedTimes = async () => {
    const changedRecords = editRecords.filter(isRowChanged);

    if (changedRecords.length === 0) {
      setEditModalVisible(false); // kuch change hi nahi hua to seedha close
      return;
    }

    setSavingAll(true);
    let allOk = true;

    for (const record of changedRecords) {
      const times = editTimes[record._rowKey];
      if (!times || !times.in || !times.out) continue;

      const formattedIn = formatFlexibleTimeInput(times.in);
      const formattedOut = formatFlexibleTimeInput(times.out);

      try {
        const payload = {
          attendance_id: record.attendance_id,
          attendance_member_id: record.attendance_member_id,
          attendance_date: toApiDateFormat(record.attendance_date),
          attendance_in: formattedIn,
          attendance_out: formattedOut,
        };

        const response = await fetch(ENDPOINTS.list_group_attendance_edit, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (result.code !== 200) {
          allOk = false;
          console.log('Failed for', record._rowKey, result);
        }
      } catch (error) {
        allOk = false;
        console.log('Error updating attendance:', error);
      }
    }

    setSavingAll(false);
    StaffAttendance(fromDate, tillDate, selectedMemberId);

    if (allOk) {
      setEditModalVisible(false); // sab successfully save hue tabhi close
    }
    // agar koi fail hua to modal khula rahega, taaki dubara try kar sako
  };

  const formatTime = timeStr => {
    if (!timeStr || timeStr == '-') return '';

    const [hrs, mins, secs] = timeStr.split(':');
    let formatted = '';

    if (hrs !== '00') {
      formatted += `${hrs} hr `;
    }
    formatted += `${mins} min`;

    return formatted.trim();
  };

  const formatOverTotalTime = timeString => {
    if (!timeString) return '--';

    const parts = String(timeString).split(':');

    if (parts.length !== 3) return '--';

    const [hrs, mins] = parts;

    const hrNum = parseInt(hrs, 10) || 0;
    const minNum = parseInt(mins, 10) || 0;

    return hrNum === 0 ? `${minNum}M` : `${hrNum}H ${minNum}M`;
  };

  // hh:mm:ss -> "2 H 15 M" jaisa readable format, "-" / "00:00:00" par "N/A"
  const formatHourMin = value => {
    if (!value || value === '-' || value === '00:00:00') return 'N/A';
    const [hh = 0, mm = 0, ss = 0] = value.split(':').map(Number);
    const hourPart = hh > 0 ? `${hh} H` : '';
    const minutePart =
      mm > 0 ? `${mm} M` : hh === 0 && mm === 0 && ss > 0 ? '0 min' : '';
    const space = hourPart && minutePart ? ' ' : '';
    return hourPart + space + minutePart || 'N/A';
  };

  const groupedAttendance = AttendanceList.reduce((acc, item) => {
    const key = item.member_name || '--';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const groupByDate = data => {
    return data.reduce((acc, item) => {
      const date = item.attendance_date || 'Unknown Date';
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
  };

  // Object entries ko FlatList-friendly array mein convert karne ke liye
  const groupedAttendanceArray = Object.entries(groupedAttendance).map(
    ([memberName, records]) => ({ memberName, records }),
  );
  const parseDateStr = (str) => {
    if (!str) return 0;
    const [dd, mm, yyyy] = str.split('-').map(Number);
    return new Date(yyyy, mm - 1, dd).getTime();
  };

  const attendanceDetailsByDate = Object.entries(
    groupByDate(attendanceDetails),
  ).map(([date, entries]) => ({ date, entries }))
    .sort((a, b) => parseDateStr(a.date) - parseDateStr(b.date));

  const editRecordsByDate = Object.entries(groupByDate(editRecords))
    .map(([date, entries]) => ({ date, entries }))
    .sort((a, b) => parseDateStr(a.date) - parseDateStr(b.date));

  const singleAttendanceByDate = Object.entries(
    groupByDate(singleAttendance),
  ).map(([date, entries]) => ({ date, entries }))
    .sort((a, b) => parseDateStr(a.date) - parseDateStr(b.date));

  const formatDatetochange = dateStr => {
    if (!dateStr) return 'dd/mm/yyyy';

    const parts = dateStr.includes('-')
      ? dateStr.split('-')
      : dateStr.split('/');

    if (parts.length !== 3) return 'Invalid Date';

    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  };

  // Status badge colors
  const getStatusColors = status => {
    switch (status) {
      case 'Present':
        return { bg: '#E4F7EC', text: '#1B9E5A' };
      case 'Absent':
        return { bg: '#FDE8E8', text: '#D64545' };
      case 'Half Day':
        return { bg: '#FFF4DE', text: '#C08A1E' };
      default:
        return { bg: '#EEEEEE', text: '#555' };
    }
  };

  // Multiple "HH:MM" values (total_working_hour) ko add karke total nikaalta hai
  const sumWorkingHours = (records) => {
    let totalMinutes = 0;
    records.forEach(r => {
      if (r.total_working_hour && r.total_working_hour !== '-') {
        const parts = r.total_working_hour.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          totalMinutes += parts[0] * 60 + parts[1];
        }
      }
    });
    if (totalMinutes === 0) return 'N/A';
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return hh > 0 ? `${hh}H ${mm}M` : `${mm}M`;
  };

  const getInitial = name => (name ? name.trim().charAt(0).toUpperCase() : '?');

  // Aaj ki date "DD-MM-YYYY" format mein — attendance_date isi format mein aati hai
  const getTodayDateStr = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // ------------------------------------------------------------------
  // renderItem helpers (FlatList)
  // ------------------------------------------------------------------

  const renderAttendanceRow = (item, i) => {
    return (
      <TouchableOpacity
        onPress={() => {
          // ---- CHANGE: purana data clear + loader ON, tab modal open karo ----
          setSingleAttendance([]);
          setOverTotalWorkingHours([]);
          setSingleModalOffsetY(0);
          setSingleModalContentH(0);
          setSingleModalLoading(true);
          setModalVisibl(true);

          StaffSelectedAttendance(
            item.attendance_date,
            item.attendance_date,
            item.attendance_member_id,
          ).finally(() => {
            setSingleModalLoading(false);
          });
        }}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderTopWidth: i === 0 ? 0 : 1,
          borderTopColor: '#F0F1F5',
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ width: '32%' }}>
            <Text style={{ fontSize: 11, color: '#B5B9C4', fontFamily: 'SemiBold24' }}>
              IN TIME
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', fontFamily: 'SemiBold24', marginTop: 2 }}>
              {item.punch_in && item.punch_in !== '-' ? item.punch_in : '--'}
            </Text>
          </View>
          <View style={{ width: '32%' }}>
            <Text style={{ fontSize: 11, color: '#B5B9C4', fontFamily: 'SemiBold24', textAlign: 'center' }}>
              OUT TIME
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', fontFamily: 'SemiBold24', marginTop: 2, textAlign: 'center' }}>
              {item.punch_out && item.punch_out !== '-' ? item.punch_out : '--'}
            </Text>
          </View>
          <View style={{ width: '32%' }}>
            <Text style={{ fontSize: 11, color: '#B5B9C4', fontFamily: 'SemiBold24', textAlign: 'right' }}>
              WORKING HOUR
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', fontFamily: 'SemiBold24', marginTop: 2, textAlign: 'right' }}>
              {formatHourMin(item.total_working_hour)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMemberCard = ({ item }) => {
    const { memberName, records } = item;
    const memberPosition = records[0]?.member_position || '';

    // Records ko attendance_date ke hisab se group karo
    const dateGroups = Object.entries(groupByDate(records))
      .map(([date, entries]) => ({ date, entries }))
      // ---- NEW: date DD-MM-YYYY format mai hai, isliye string sort kaam nahi karega,
      // actual Date object banake compare karna padega ----
      .sort((a, b) => {
        const parseDate = (str) => {
          const [dd, mm, yyyy] = str.split('-').map(Number);
          return new Date(yyyy, mm - 1, dd).getTime();
        };
        return parseDate(a.date) - parseDate(b.date);
      });

    // ---- NEW: task chalu hai ya nahi check karne ka helper (case-insensitive + flexible) ----
    const isTaskOn = (entries) =>
      entries.some(e => {
        const val = e.task_running;
        if (val === undefined || val === null) return false;
        const strVal = String(val).trim().toLowerCase();
        return strVal === 'on' || strVal === 'true' || strVal === '1' || strVal === 'yes';
      });

    return (
      <Animatable.View
        animation="fadeInUp"
        duration={600}
        style={{
          marginBottom: 12,
          backgroundColor: '#fff',
          borderRadius: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
          overflow: 'hidden',
        }}>
        {/* Member header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary,
            paddingVertical: 10,
            paddingHorizontal: 12,
          }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
            <Text style={{ color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 14 }}>
              {getInitial(memberName)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'SemiBold28', fontSize: 14, color: '#fff' }}>
              {memberName}
            </Text>
            {memberPosition ? (
              <Text style={{ fontFamily: 'SemiBold24', fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                {memberPosition}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isCeoOrHr && (
              <TouchableOpacity
                onPress={() => openEditModal(records[0].attendance_member_id, memberName)}
                style={{ padding: 4, marginLeft: 4 }}>
                <FontAwesome name="pencil" size={16} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => openDetailsModal(records[0].attendance_member_id, memberName)}
              style={{ padding: 4 }}>
              <Image source={require('../assets/exclamation-mark.png')} style={{ width: 16, height: 16, tintColor: '#fff' }} />
            </TouchableOpacity>


          </View>
        </View>

        {/* Date groups -> har date ke liye rows + total */}
        {dateGroups.map((group, gi) => (
          <View key={`${group.date}-${gi}`} style={{ borderTopWidth: gi === 0 ? 0 : 1, borderTopColor: '#E8EAF0' }}>
            {/* Date header */}
            <View
              style={{
                backgroundColor: '#F7F8FC',
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={{ fontSize: 13, fontFamily: 'Montserrat-ExtraBold', color: colors.primary }}>
                {group.date}
              </Text>
              {/* ---- NEW: agar is date ke kisi record ka task chalu hai to badge dikhao ---- */}
              {group.date === getTodayDateStr() && isTaskOn(group.entries) && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#E4F7EC',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#1B9E5A', marginRight: 4 }} />
                  <Text style={{ fontSize: 10, fontFamily: 'SemiBold24', color: '#1B9E5A' }}>
                    Task
                  </Text>
                </View>
              )}
            </View>

            {/* Punch in/out rows */}
            {group.entries.map((rec, i) => (
              <React.Fragment key={`${rec.attendance_member_id}-${rec.attendance_date}-${i}`}>
                {renderAttendanceRow(rec, i)}
              </React.Fragment>
            ))}

            {/* Total row for this date */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#EEF2FF',
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}>
              <Text style={{ fontSize: 12, fontFamily: 'SemiBold28', color: colors.primary }}>
                Total
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'SemiBold28', color: colors.primary }}>
                {sumWorkingHours(group.entries)}
              </Text>
            </View>
          </View>
        ))}
      </Animatable.View>
    );
  };

  const renderDateGroupRow = (item, index) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        paddingHorizontal: 4,
        backgroundColor: '#F7F8FC',
        borderRadius: 8,
        marginBottom: 4,
      }}>
      <Text style={{ width: '30%', textAlign: 'center', fontFamily: 'SemiBold24', color: '#9AA0AE' }}>
        {item.attendance_in || '--'}
      </Text>
      <Text style={{ width: '30%', textAlign: 'center', fontFamily: 'SemiBold24', color: '#9AA0AE' }}>
        {item.attendance_out || '--'}
      </Text>
      <Text style={{ width: '30%', textAlign: 'center', fontFamily: 'SemiBold24', color: '#9AA0AE' }}>
        {formatOverTotalTime(item.total_working_hour)}
      </Text>
    </View>
  );

  const renderDateGroup = ({ item }) => (
    <View style={{ marginBottom: 15 }}>
      <Text
        style={{
          fontSize: 15,
          color: colors.primary,
          fontFamily: 'Montserrat-ExtraBold',
          marginBottom: 6,
          borderBottomWidth: 1,
          borderBottomColor: '#ddd',
          paddingBottom: 4,
        }}>
        {item.date}
      </Text>
      {item.entries.map((entry, index) => (
        <React.Fragment key={`${item.date}-${index}`}>
          {renderDateGroupRow(entry, index)}
        </React.Fragment>
      ))}
    </View>
  );
  const renderEditDateGroupRow = item => {
    const times = editTimes[item._rowKey] || {
      in: item.attendance_in && item.attendance_in !== '-' ? item.attendance_in : '',
      out: item.attendance_out && item.attendance_out !== '-' ? item.attendance_out : '',
    };

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4, backgroundColor: '#F7F8FC', borderRadius: 8, marginBottom: 6 }}>
        <TouchableOpacity
          onPress={() => openTimePicker(item._rowKey, 'in', times.in)}
          style={{ width: '47%', borderWidth: 1, borderColor: '#E3E5EC', borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 10, color: '#9AA0AE', fontFamily: 'SemiBold24' }}>IN TIME</Text>
          <Text style={{ fontSize: 13, color: '#000', fontFamily: 'SemiBold24', marginTop: 2 }}>{times.in || '--'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => openTimePicker(item._rowKey, 'out', times.out)}
          style={{ width: '47%', borderWidth: 1, borderColor: '#E3E5EC', borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 10, color: '#9AA0AE', fontFamily: 'SemiBold24' }}>OUT TIME</Text>
          <Text style={{ fontSize: 13, color: '#000', fontFamily: 'SemiBold24', marginTop: 2 }}>{times.out || '--'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEditDateGroup = ({ item }) => (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontSize: 15, color: colors.primary, fontFamily: 'Montserrat-ExtraBold', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 4 }}>{item.date}</Text>
      {item.entries.map((entry, index) => (
        <React.Fragment key={`${item.date}-edit-${index}`}>{renderEditDateGroupRow(entry)}</React.Fragment>
      ))}
    </View>
  );

  return (
    <View style={{ backgroundColor: '#F5F6FA', flex: 1 }}>
      {/* ---------- Header ---------- */}
      <View
        style={{
          width: '100%',
          height: 56,
          backgroundColor: colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
          elevation: 4,
        }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 14, padding: 4 }}>
          <Image
            source={require('../assets/back.png')}
            style={{ width: 20, height: 20, tintColor: '#fff' }}
          />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 17,
            color: '#fff',
            marginRight: 34,
          }}>
          Staff Attendance
        </Text>
        {/* <TouchableOpacity style={{ marginRight: 16, padding: 4 }} onPress={filter}>
          <Image
            source={require('../assets/filter1.png')}
            style={{ width: 22, height: 22, tintColor: '#fff' }}
          />
        </TouchableOpacity> */}
      </View>

      {/* ---------- Date filter bar ---------- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: '#fff',
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 14,
          elevation: 2,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 3,
        }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            style={{
              color: colors.primary,
              fontFamily: 'Montserrat-ExtraBold',
              fontSize: 11,
              marginBottom: 6,
              letterSpacing: 0.3,
            }}>
            FROM DATE <Text style={{ color: '#E05252' }}>*</Text>
          </Text>
          <TouchableOpacity
            onPress={showFromDatePicker}
            style={{
              height: 46,
              borderWidth: 1,
              borderColor: '#E3E5EC',
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              backgroundColor: '#FAFBFF',
            }}>
            <Text style={{ flex: 1, fontFamily: 'SemiBold24', color: '#000', fontSize: 13 }}>
              {formatDatetochange(fromDate) || 'dd/mm/yyyy'}
            </Text>
            <Image
              source={require('../assets/calendar.png')}
              style={{ width: 17, height: 17, tintColor: colors.primary }}
            />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            style={{
              color: colors.primary,
              fontFamily: 'Montserrat-ExtraBold',
              fontSize: 11,
              marginBottom: 6,
              letterSpacing: 0.3,
            }}>
            TILL DATE <Text style={{ color: '#E05252' }}>*</Text>
          </Text>
          <TouchableOpacity
            onPress={showTillDatePicker}
            style={{
              height: 46,
              borderWidth: 1,
              borderColor: '#E3E5EC',
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              backgroundColor: '#FAFBFF',
            }}>
            <Text style={{ flex: 1, fontFamily: 'SemiBold24', color: '#000', fontSize: 13 }}>
              {formatDatetochange(tillDate) || 'dd/mm/yyyy'}
            </Text>
            <Image
              source={require('../assets/calendar.png')}
              style={{ width: 17, height: 17, tintColor: colors.primary }}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => StaffAttendance(fromDate, tillDate, selectedMemberId)}
          style={{
            width: 46,
            height: 46,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
          }}>
          <Image
            source={require('../assets/Search.png')}
            style={{ width: 18, height: 18, tintColor: '#fff' }}
          />
        </TouchableOpacity>

        <DateTimePicker
          isVisible={isFromDatePickerVisible}
          mode="date"
          date={fromDate ? new Date(fromDate) : new Date()}
          maximumDate={new Date()}
          onConfirm={handleFromDateConfirm}
          onCancel={hideFromDatePicker}
        />
        <DateTimePicker
          isVisible={isTillDatePickerVisible}
          mode="date"
          date={tillDate ? new Date(tillDate) : new Date()}
          minimumDate={fromDate ? new Date(fromDate) : new Date()}
          maximumDate={new Date()}
          onConfirm={handleTillDateConfirm}
          onCancel={hideTillDatePicker}
        />
        {Platform.OS === 'ios' && !!timePickerTarget && (
          <CommunityDateTimePicker
            value={timePickerTarget.initialDate}
            mode="time"
            display="spinner"
            onChange={(event, selectedDate) => {
              const target = timePickerTarget;
              if (event.type === 'set' && selectedDate && target) {
                const formatted = formatTimeForApi(selectedDate);
                setEditTimes(prev => ({
                  ...prev,
                  [target.rowKey]: {
                    in: target.field === 'in' ? formatted : (prev[target.rowKey]?.in ?? target.baseIn),
                    out: target.field === 'out' ? formatted : (prev[target.rowKey]?.out ?? target.baseOut),
                  },
                }));
              }
              setTimePickerTarget(null);
            }}
          />
        )}

      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groupedAttendanceArray}
          keyExtractor={(item, index) => `${item.memberName}-${index}`}
          renderItem={renderMemberCard}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 25,
          }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Text style={{ fontFamily: 'SemiBold24', color: '#9AA0AE', fontSize: 14 }}>
                No attendance records found
              </Text>
            </View>
          )}
        />
      )}

      {/* ---------- Member-level details modal (uses ListAttendance) ---------- */}
      <Modal
        visible={ModalVisibles}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisibles(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setModalVisibles(false)}
          activeOpacity={1}>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              width: '92%',
              maxHeight: '85%',
              padding: 18,
            }}
            onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 16, color: '#000', marginBottom: 4, textAlign: 'center', fontFamily: 'SemiBold28' }}>
              {selectedMemberName}
            </Text>
            <Text style={{ fontSize: 14, color: colors.primary, marginBottom: 12, textAlign: 'center', fontFamily: 'SemiBold28' }}>
              Attendance From {formatDatetochange(fromDate)} To {formatDatetochange(tillDate)}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 8, marginBottom: 10 }}>
              <Text style={{ fontFamily: 'SemiBold24', color: colors.primary, width: '30%', textAlign: 'center' }}>In Time</Text>
              <Text style={{ fontFamily: 'SemiBold24', color: colors.primary, width: '30%', textAlign: 'center' }}>Out Time</Text>
              <Text style={{ fontFamily: 'SemiBold24', color: colors.primary, width: '30%', textAlign: 'center' }}>Hours</Text>
            </View>

            {/* ---- CHANGE: loader jab tak naya data fetch nahi ho jaata ---- */}
            {memberModalLoading ? (
              <View style={{ height: LIST_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View style={{ position: 'relative' }}>
                <FlatList
                  ref={memberModalListRef}
                  data={attendanceDetailsByDate}
                  keyExtractor={(item, index) => `${item.date}-${index}`}
                  style={{ maxHeight: LIST_HEIGHT }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={true}
                  renderItem={renderDateGroup}
                  onScroll={handleMemberModalScroll}
                  onContentSizeChange={handleMemberModalContentSize}
                  scrollEventThrottle={16}
                  ListEmptyComponent={() => (
                    <Text style={{ textAlign: 'center', marginVertical: 20, color: '#9AA0AE', fontFamily: 'SemiBold24' }}>
                      No Attendance Found
                    </Text>
                  )}
                />

                {memberModalScrollable && !memberModalAtTop && (
                  <TouchableOpacity
                    onPress={() => {
                      setMemberModalOffsetY(0);
                      memberModalListRef.current?.scrollToOffset({ offset: 0, animated: false });
                    }}
                    style={styles.scrollArrowBtnTop}>
                    <FontAwesome name="chevron-up" size={12} color="#fff" />
                  </TouchableOpacity>
                )}

                {memberModalScrollable && !memberModalAtBottom && (
                  <TouchableOpacity
                    onPress={() => {
                      setMemberModalOffsetY(memberModalContentH - LIST_HEIGHT);
                      memberModalListRef.current?.scrollToEnd({ animated: false });
                    }}
                    style={styles.scrollArrowBtnBottom}>
                    <FontAwesome name="chevron-down" size={12} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Montserrat-ExtraBold', fontSize: 14, color: colors.primary }}>
                Total: {sumOverTotalWorkingHours(overTotalWorkingHours)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setModalVisibles(false)}
              style={{ marginTop: 16, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10 }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontFamily: 'SemiBold24' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ---------- Single day / single member detail modal ---------- */}
      <Modal
        visible={modalVisibl}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisibl(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setModalVisibl(false)}
          activeOpacity={1}>
          <View
            style={{
              backgroundColor: '#fff',
              padding: 18,
              borderRadius: 16,
              width: '92%',
              maxHeight: '85%',
            }}
            onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 14, color: colors.primary, marginBottom: 12, textAlign: 'center', fontFamily: 'SemiBold28' }}>
              Attendance Details
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 8, marginBottom: 10 }}>
              <Text style={{ fontFamily: 'SemiBold24', color: colors.primary, width: '30%', textAlign: 'center' }}>In Time</Text>
              <Text style={{ fontFamily: 'SemiBold24', color: colors.primary, width: '30%', textAlign: 'center' }}>Out Time</Text>
              <Text style={{ fontFamily: 'SemiBold24', color: colors.primary, width: '30%', textAlign: 'center' }}>Hours</Text>
            </View>

            {/* ---- CHANGE: loader jab tak naya data fetch nahi ho jaata ---- */}
            {singleModalLoading ? (
              <View style={{ height: LIST_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View style={{ position: 'relative' }}>
                <FlatList
                  ref={singleModalListRef}
                  data={singleAttendanceByDate}
                  keyExtractor={(item, index) => `${item.date}-${index}`}
                  style={{ maxHeight: LIST_HEIGHT }}
                  showsVerticalScrollIndicator={true}
                  renderItem={renderDateGroup}
                  onScroll={handleSingleModalScroll}
                  onContentSizeChange={handleSingleModalContentSize}
                  scrollEventThrottle={16}
                  ListEmptyComponent={() => (
                    <Text style={{ textAlign: 'center', marginVertical: 20, color: '#9AA0AE', fontFamily: 'SemiBold24' }}>
                      No Attendance Found
                    </Text>
                  )}
                />

                {singleModalScrollable && !singleModalAtTop && (
                  <TouchableOpacity
                    onPress={() => {
                      setSingleModalOffsetY(0);
                      singleModalListRef.current?.scrollToOffset({ offset: 0, animated: false });
                    }}
                    style={styles.scrollArrowBtnTop}>
                    <FontAwesome name="chevron-up" size={12} color="#fff" />
                  </TouchableOpacity>
                )}

                {singleModalScrollable && !singleModalAtBottom && (
                  <TouchableOpacity
                    onPress={() => {
                      setSingleModalOffsetY(singleModalContentH - LIST_HEIGHT);
                      singleModalListRef.current?.scrollToEnd({ animated: false });
                    }}
                    style={styles.scrollArrowBtnBottom}>
                    <FontAwesome name="chevron-down" size={12} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'SemiBold24', color: '#000' }}>
                Total: {sumOverTotalWorkingHours(overTotalWorkingHours)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setModalVisibl(false)}
              style={{ marginTop: 16, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10 }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontFamily: 'SemiBold24' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setEditModalVisible(false)} activeOpacity={1}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, width: '92%', maxHeight: '85%', padding: 18 }} onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 16, color: '#000', marginBottom: 4, textAlign: 'center', fontFamily: 'SemiBold28' }}>Edit Attendance — {editMemberName}</Text>
            <Text style={{ fontSize: 13, color: colors.primary, marginBottom: 12, textAlign: 'center', fontFamily: 'SemiBold24' }}>
              {formatDatetochange(fromDate)} To {formatDatetochange(tillDate)}
            </Text>
            {editModalLoading ? (
              <View style={{ height: LIST_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View style={{ position: 'relative' }}>
                <FlatList
                  ref={editModalListRef}
                  data={editRecordsByDate}
                  keyExtractor={(item, index) => `edit-${item.date}-${index}`}
                  style={{ maxHeight: LIST_HEIGHT }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={true}
                  renderItem={renderEditDateGroup}
                  onScroll={handleEditModalScroll}
                  onContentSizeChange={handleEditModalContentSize}
                  scrollEventThrottle={16}
                  ListEmptyComponent={() => (
                    <Text style={{ textAlign: 'center', marginVertical: 20, color: '#9AA0AE', fontFamily: 'SemiBold24' }}>No Attendance Found</Text>
                  )}
                />

                {editModalScrollable && !editModalAtTop && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditModalOffsetY(0);
                      editModalListRef.current?.scrollToOffset({ offset: 0, animated: false });
                    }}
                    style={styles.scrollArrowBtnTop}>
                    <FontAwesome name="chevron-up" size={12} color="#fff" />
                  </TouchableOpacity>
                )}

                {editModalScrollable && !editModalAtBottom && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditModalOffsetY(editModalContentH - LIST_HEIGHT);
                      editModalListRef.current?.scrollToEnd({ animated: false });
                    }}
                    style={styles.scrollArrowBtnBottom}>
                    <FontAwesome name="chevron-down" size={12} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={{ flex: 1, backgroundColor: '#E3E5EC', paddingVertical: 12, borderRadius: 10 }}>
                <Text style={{ color: '#333', textAlign: 'center', fontFamily: 'SemiBold24' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveAllChangedTimes}
                disabled={savingAll}
                style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, opacity: savingAll ? 0.7 : 1 }}>
                {savingAll ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', textAlign: 'center', fontFamily: 'SemiBold24' }}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ---------- Filter members modal ---------- */}
      <Modal
        visible={modalvisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: '90%',
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 20,
              elevation: 5,
              maxHeight: '80%',
            }}>
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 15,
                }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontFamily: 'SemiBold28',
                    color: colors.primary,
                  }}>
                  Filter Members
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setStatusFilter('Active');
                  }}>
                  <Image
                    source={require('../assets/close.png')}
                    style={{ width: 18, height: 18, tintColor: colors.primary }}
                  />
                </TouchableOpacity>
              </View>

              <FlatList
                horizontal
                data={['All', 'Active', 'Deactive']}
                keyExtractor={status => status}
                scrollEnabled={false}
                keyboardShouldPersistTaps="handled"
                style={{ marginBottom: 10 }}
                renderItem={({ item: status }) => (
                  <TouchableOpacity
                    onPress={() => setStatusFilter(status)}
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 14,
                      backgroundColor:
                        statusFilter === status ? colors.primary : '#F0F1F5',
                      borderRadius: 20,
                      marginRight: 8,
                    }}>
                    <Text
                      style={{
                        color: statusFilter === status ? '#fff' : '#555',
                        fontFamily: 'SemiBold24',
                        fontSize: 12,
                      }}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                )}
              />

              <View style={{ position: 'relative', marginVertical: 10 }}>
                <TextInput
                  placeholder="Search Member..."
                  placeholderTextColor="#999"
                  value={searchText}
                  onChangeText={setSearchText}
                  style={{
                    borderWidth: 1,
                    borderColor: '#E3E5EC',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontFamily: 'Regular',
                    color: '#000',
                    backgroundColor: '#FAFBFF',
                  }}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchText('')}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: [{ translateY: -12 }],
                    }}>
                    <FontAwesome name="times-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSelectedMember('All');
                  setSelectedMemberId(null);
                  setModalVisible(false);
                  StaffAttendance(fromDate, tillDate, null); // <-- turant refetch, no manual search
                }}
                style={{
                  width: '100%',
                  height: 46,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text
                  style={{
                    color: selectedMember === 'All' ? colors.primary : '#000',
                    fontFamily: 'SemiBold24',
                    fontWeight: selectedMember === 'All' ? 'bold' : 'normal',
                  }}>
                  All
                </Text>
                {selectedMember === 'All' && (
                  <FontAwesome name="check" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredMembers}
              keyExtractor={(item, index) => index.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedMember(item.member_name);
                    setSelectedMemberId(item.member_id);
                    setModalVisible(false);
                    StaffAttendance(fromDate, tillDate, item.member_id); // <-- turant refetch
                  }}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F0F1F5',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: selectedMember === item.member_name ? colors.primary : '#111',
                      fontWeight: selectedMember === item.member_name ? 'bold' : 'normal',
                      fontFamily: 'SemiBold24',
                    }}>
                    {item.member_name}
                  </Text>
                  {selectedMember === item.member_name && (
                    <FontAwesome name="check" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
export default Allattendance;
const styles = StyleSheet.create({
  scrollArrowBtnTop: {
    position: 'absolute',
    top: 4,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    opacity: 0.9,
  },
  scrollArrowBtnBottom: {
    position: 'absolute',
    bottom: 4,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    opacity: 0.9,
  },
});