import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutUser from '../Components/LogoutUser';
import Toast from 'react-native-toast-message';
import { ENDPOINTS } from '../CommonFile/Constant';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
const formatTimeDisplay = timeStr => {
  if (!timeStr) return '';
  const [hh, mm] = timeStr.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return timeStr;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  let hour12 = hh % 12;
  if (hour12 === 0) hour12 = 12;
  return `${String(hour12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
};

const Leave = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [leaveList, setLeaveList] = useState([]);
  const [expandedState, setExpandedState] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFromDatePickerVisible, setFromDatePickerVisibility] =
    useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] =
    useState(false);
  const [fromDate, setFromDate] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [FromDateError, setFromDateError] = useState();
  const [TillDateError, setTillDateError] = useState();
  const [fromDateDisplay, setFromDateDisplay] = useState('');
  const [tillDateDisplay, setTillDateDisplay] = useState('');
  const [count, setCount] = useState(0);
  const [modalvisible, setModalVisible] = useState(false);
  const [UpdateProjects, setUpdateProjects] = useState([]);
  const [LeaveId, setLeaveId] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [ThreedotModal, setThreedotModal] = useState(false);
  const [DeleteModal, setDeleteModal] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [memberPosition, setMemberPosition] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [leaveStatus, setLeaveStatus] = useState('Pending');
  const [buttonLayouts, setButtonLayouts] = useState({});
  const [dotPosition, setDotPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const dotRefs = React.useRef({});


  const screenWidth = Dimensions.get('window').width;
  // 👈 NAYA — admin (member_id '1') ya HR position wale ko same access
  const isAdminOrHR = memberPosition?.trim().toLowerCase() === 'ceo' || memberPosition?.trim().toLowerCase() === 'hr';
  const menuWidth = 160;
  let left = dotPosition.x - menuWidth + dotPosition.width; // dot ke right-align se left
  if (left < 10) left = 10;
  if (left + menuWidth > screenWidth - 10) left = screenWidth - menuWidth - 10;

  useEffect(() => {
    const loadMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      const position = await AsyncStorage.getItem('member_position'); // 👈 NAYA
      if (id) {
        setMemberId(id);
      }
      setMemberPosition(position || ''); // 👈 NAYA

      // 👈 NAYA — staff (CEO/HR ke alawa) ko default "All" tab dikhega,
      // taki approve/reject hone ke baad bhi unko status pata chal jaye
      const posLower = (position || '').trim().toLowerCase();
      const isAdmin = posLower === 'ceo' || posLower === 'hr';
      if (!isAdmin && !route.params?.initialStatus) {
        setLeaveStatus('all');
      }

      setIsReady(true); // <-- mark ready after loading
    };
    loadMemberId();
  }, []);

  const deleteLeave = async () => {
    setDeleteModal(false);
    const url = ENDPOINTS.DeleteLeave;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_id: LeaveId,
        }),
      });
      const result = await response.json();
      console.log('Delete', result);
      if (result.code == 200) {
        setThreedotModal(false);
        ListLeave();
      }
    } catch (error) { }
  };

  const ListLeave = async (statusOverride) => {
    if (!memberId) return;
    const url = ENDPOINTS.ListLeave;

    const start = fromDate || '';
    const end = tillDate || '';
    const statusToUse = statusOverride !== undefined ? statusOverride : leaveStatus;
    console.log('Fetching leave list with:', { memberId, start, end, statusToUse });

    try {
      setLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: memberId,
          start_date: start,
          end_date: end,
          leave_status: statusToUse === 'all' ? 'all' : statusToUse || '', // Optional: filter by status if needed
        }),
      });

      const result = await response.json();

      if (result.code === 200) {
        setLeaveList(result.payload);
        setCount(parseInt(result.leave_count));
      } else {
        setLeaveList([]);
        setCount(0);
      }
    } catch (error) {
      console.error('Error fetching leave list:', error);
      setLeaveList([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      if (isReady && memberId) {
        ListLeave();
      }
    }, [isReady, memberId, leaveStatus]),
  );

  const showFromDatePicker = () => {
    setFromDatePickerVisibility(true);
  };

  const hideFromDatePicker = () => {
    setFromDatePickerVisibility(false);
  };
  const formatDate = date => {
    if (!(date instanceof Date)) {
      console.warn('Invalid Date:', date);
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
    hideFromDatePicker(); // ⚠️ Hide first

    const { display, api } = formatDate(date);
    setFromDateDisplay(display); // UI ke liye
    setFromDate(api); // API ke liye
  };

  // Till Date Handlers
  const showTillDatePicker = () => {
    setTillDatePickerVisibility(true);
  };

  const hideTillDatePicker = () => {
    setTillDatePickerVisibility(false);
  };

  const handleTillDateConfirm = date => {
    hideTillDatePicker(); // ⚠️ Hide first

    const { display, api } = formatDate(date);
    setTillDateDisplay(display);
    setTillDate(api);
  };

  const handleExpand = leaveId => {
    setExpandedState(prevState => ({
      ...prevState,
      [leaveId]: true, // Set the state of the clicked item to true
    }));
  };

  const handleCollapse = leaveId => {
    setExpandedState(prevState => ({
      ...prevState,
      [leaveId]: false, // Set the state of the clicked item to false
    }));
  };

  const getStatusColor = status => {
    const lowerStatus = status?.trim().toLowerCase();

    if (lowerStatus === 'pending') return '#F59E0B'; // amber
    if (lowerStatus === 'approve') return '#22C55E'; // green
    if (lowerStatus === 'reject') return '#EF4444'; // red

    return '#7f90a4'; // default grey
  };

  const getStatusBg = status => {
    const lowerStatus = status?.trim().toLowerCase();

    if (lowerStatus === 'pending') return '#FEF3C7';
    if (lowerStatus === 'approve') return '#DCFCE7';
    if (lowerStatus === 'reject') return '#FEE2E2';

    return '#E5E9EF';
  };

  const dotmodal = data => {
    setLeaveId(data.leave_id);
    setUpdateProjects(data);
    setSelectedLeave(data);
    setModalVisible(true);
  };
  const ThreeDot = (item) => {
    const node = dotRefs.current[item.leave_id];
    if (node) {
      node.measureInWindow((x, y, width, height) => {
        setDotPosition({ x, y, width, height });
      });
    }
    setLeaveId(item.leave_id);
    setUpdateProjects(item);
    setSelectedLeave(item);
    setThreedotModal(true);
  };

  const Update = async actionType => {
    setModalVisible(false);
    const url = ENDPOINTS.ChangeLeaveStatus;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leave_id: LeaveId,
          status: actionType, // 'Approve' ya 'Reject'
        }),
      });

      const result = await response.json();
      console.log('Update Response:', result);

      if (result.code === 200 && result.status) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Leave ${actionType} successfully`,
          position: 'bottom', bottomOffset: 80,
          visibilityTime: 2000,
        });
        ListLeave();

        // 👇 Ye add karo — jis staff ne leave apply ki thi usko notify karo
        try {
          const notifyRes = await fetch(
            'https://us-central1-webmastersinfotech-ae0da.cloudfunctions.net/notifyLeaveResponse',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staff_id: selectedLeave?.member_id,
                status: actionType,
              }),
            }
          );
          const notifyResult = await notifyRes.json();
          console.log('Notify Response Result', notifyResult);
        } catch (notifyErr) {
          console.log('notify response error:', notifyErr);
        }
      } else {
        Alert.alert('Failed', 'Unable to update leave status.');
      }
    } catch (error) {
      console.error('Error updating leave status:', error);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  useEffect(() => {
    if (route.params?.initialStatus) {
      setLeaveStatus(route.params.initialStatus);
      // param use hone ke baad clear kar do, taaki agli baar manual open pe purana filter na chipke
      navigation.setParams({ initialStatus: undefined });
    }
  }, [route.params?.initialStatus]);

  // useEffect(() => {
  //   const today = new Date();
  //   const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  //   const formattedFrom = formatDate(firstDay); // 1st of month
  //   const formattedTill = formatDate(today); // today
  //   setFromDate(formattedFrom.api);
  //   setFromDateDisplay(formattedFrom.display);

  //   setTillDate(formattedTill.api);
  //   setTillDateDisplay(formattedTill.display);
  // }, []);

  const UpdateLeaves = () => {
    navigation.navigate('AddLeave', { LeaveData: UpdateProjects })
    setThreedotModal(false);
  };

  const deleteModal = () => {
    setThreedotModal(false);
    setDeleteModal(true);
  };

  const formatDatetochange = (dateStr) => {
    if (!dateStr) return 'dd-mm-yyyy';

    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');

    if (parts.length !== 3) return 'Invalid Date';

    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleTabPress = status => {
    setLeaveStatus(status);
    ListLeave(status);
  };

  const FILTER_TABS = [
    { key: 'all', label: 'All', icon: null, color: '#333' },
    {
      key: 'Pending',
      label: 'Pending',
      icon: 'account-clock-outline',
      color: '#F59E0B',
    },
    {
      key: 'Approve',
      label: 'Approved',
      icon: 'check-circle-outline',
      color: '#16A34A',
    },
    {
      key: 'Reject',
      label: 'Rejected',
      icon: 'close-circle-outline',
      color: '#EF4444',
    },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <LogoutUser />

      {/* Header */}
      <View
        style={{
          width: '100%',
          paddingTop: 10,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            fontSize: 18,
            color: '#fff',
          }}>
          Leaves
        </Text>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 14,
            backgroundColor: '#0EB58F',
          }}>
          <Text style={{ color: '#fff', fontFamily: 'SemiBold28', fontSize: 15 }}>
            {count}
          </Text>
          <Text style={{ color: '#fff', fontSize: 11 }}>Leaves</Text>
        </View>
      </View>

      {/* Date filter row */}
      {/* Date filter row */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#fff',
          marginHorizontal: 14,
          marginTop: 12,
          borderRadius: 14,
          paddingHorizontal: 10,
          paddingVertical: 10,
          elevation: 2,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 2 },
        }}>

        {/* From Date */}
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text
            style={{
              color: '#333',
              fontFamily: 'Montserrat-ExtraBold',
              fontSize: 11,
              marginBottom: 4,
            }}>
            From Date <Text style={{ color: 'red' }}>*</Text>
          </Text>

          <TouchableOpacity
            onPress={showFromDatePicker}
            style={{
              width: '100%',
              height: 40,
              borderWidth: 1,
              borderColor: '#E1E5EB',
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 9,
              backgroundColor: '#F9FAFC',
            }}>
            <Text
              style={{
                fontFamily: 'SemiBold24',
                color: '#000',
                fontSize: 12,
              }}>
              {formatDatetochange(fromDate) || 'dd/mm/yyyy'}
            </Text>

            <Image
              source={require('../assets/calendar.png')}
              style={{ width: 15, height: 15, tintColor: colors.primary }}
            />
          </TouchableOpacity>

          {FromDateError ? (
            <Text style={{ color: 'red', fontSize: 10, marginTop: 3 }}>
              {FromDateError}
            </Text>
          ) : null}
        </View>

        {/* Till Date */}
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text
            style={{
              color: '#333',
              fontFamily: 'Montserrat-ExtraBold',
              fontSize: 11,
              marginBottom: 4,
            }}>
            Till Date <Text style={{ color: 'red' }}>*</Text>
          </Text>

          <TouchableOpacity
            onPress={showTillDatePicker}
            style={{
              width: '100%',
              height: 40,
              borderWidth: 1,
              borderColor: '#E1E5EB',
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 9,
              backgroundColor: '#F9FAFC',
            }}>
            <Text
              style={{
                fontFamily: 'SemiBold24',
                color: '#000',
                fontSize: 12,
              }}>
              {formatDatetochange(tillDate) || 'dd/mm/yyyy'}
            </Text>

            <Image
              source={require('../assets/calendar.png')}
              style={{ width: 15, height: 15, tintColor: colors.primary }}
            />
          </TouchableOpacity>

          {TillDateError ? (
            <Text style={{ color: 'red', fontSize: 10, marginTop: 3 }}>
              {TillDateError}
            </Text>
          ) : null}
        </View>

        {/* Search button */}
        <TouchableOpacity
          onPress={() => ListLeave()}
          style={{
            width: 40,
            height: 40,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-end',
            borderRadius: 10,
            marginBottom: FromDateError || TillDateError ? 14 : 0,
          }}>
          <Image
            source={require('../assets/Search.png')}
            style={{ width: 16, height: 16, tintColor: '#fff' }}
          />
        </TouchableOpacity>

        <DateTimePicker
          isVisible={isFromDatePickerVisible}
          mode="date"
          date={fromDate ? new Date(fromDate) : new Date()}
          onConfirm={handleFromDateConfirm}
          onCancel={hideFromDatePicker}
        />

        <DateTimePicker
          isVisible={isTillDatePickerVisible}
          mode="date"
          date={tillDate ? new Date(tillDate) : new Date()}
          onConfirm={handleTillDateConfirm}
          onCancel={hideTillDatePicker}
          minimumDate={fromDate ? new Date(fromDate) : new Date()}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: 10,
          paddingHorizontal: 14,
          justifyContent: 'space-around',
        }}>
        {FILTER_TABS.map(tab => {
          const active = leaveStatus === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row', // icon + text side by side
                paddingHorizontal: 12,   // pehle 8 tha
                height: 40,
                borderRadius: 20,
                backgroundColor: active ? colors.primary : '#fff',
                borderWidth: 1,
                borderColor: active ? colors.primary : '#E1E5EB',
                flex: 1,
                marginHorizontal: 4,
              }}>
              {tab.icon ? (
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={14}
                  color={active ? '#fff' : tab.color}
                  style={{ marginRight: 5 }}
                />
              ) : null}

              <Text
                style={{
                  color: active ? '#fff' : '#333',
                  fontFamily: 'SemiBold28',
                  fontSize: 11,
                }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 50,
          }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1, marginTop: 18 }}
          data={leaveList}
          keyExtractor={(item, index) =>
            item?.leave_id ? item.leave_id.toString() : index.toString()
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingBottom: 110,
            flexGrow: leaveList.length === 0 ? 1 : 0,
          }}
          ListEmptyComponent={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
              <Image
                source={require('../assets/leaveimg.png')}
                style={{
                  width: 70,
                  height: 70,
                  marginBottom: 10,
                  opacity: 0.6,
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'SemiBold24',
                  color: '#888',
                  textAlign: 'center',
                }}>
                No Leaves available at the moment.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const statusColor = getStatusColor(item.leave_status);
            const statusBg = getStatusBg(item.leave_status);
            const isSameDay = item.from_date === item.to_date;
            const avatarColor = getAvatarColor(item.member_name);

            return (
              <Animatable.View
                animation="fadeInUp"
                duration={600}
                style={{
                  width: '100%',
                  backgroundColor: '#fff',
                  marginBottom: 14,
                  borderRadius: 18,
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  padding: 14,

                }}>
                {/* Top row: Avatar + Name + Status */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: avatarColor.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}>
                    <Text
                      style={{
                        color: avatarColor.text,
                        fontFamily: 'SemiBold28',
                        fontSize: 14,
                      }}>
                      {getInitials(item.member_name)}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'SemiBold28',
                        color: '#000',
                        fontSize: 15,
                      }}>
                      {item.member_name}

                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#7f90a4',
                        fontFamily: 'SemiBold24',
                        marginTop: 1,
                      }}>
                      {item.leave_type}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => dotmodal(item)}
                    disabled={!isAdminOrHR}
                    activeOpacity={isAdminOrHR ? 0.7 : 1}
                    style={{
                      paddingHorizontal: 12,
                      height: 26,
                      backgroundColor: statusBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 20,
                      flexDirection: 'row', // <-- added
                    }}>
                    <Text
                      style={{
                        color: statusColor,
                        fontFamily: 'SemiBold28',
                        fontSize: 11,
                        marginRight: isAdminOrHR ? 4 : 0, // <-- conditional margin
                      }}>
                      {item.leave_status?.toUpperCase()}
                    </Text>
                    {isAdminOrHR && (
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={14}
                        color={statusColor}
                      />
                    )}
                  </TouchableOpacity>

                  {!isAdminOrHR && item.leave_status?.toLowerCase() === 'pending' ? (
                    <TouchableOpacity
                      ref={(el) => { dotRefs.current[item.leave_id] = el; }}
                      onPress={() => ThreeDot(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ marginLeft: 8 }}
                    >
                      <Image source={require('../assets/dots.png')} style={{ width: 18, height: 18 }} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Date row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F5F7FA',
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    marginTop: 10,
                  }}>
                  <Image
                    source={require('../assets/calendar.png')}
                    style={{ width: 15, height: 15, tintColor: '#7f90a4' }}
                  />

                  {item.from_date || item.to_date ? (
                    isSameDay ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginLeft: 8,
                          flex: 1,
                          justifyContent: 'space-between',
                        }}>
                        <Text
                          style={{
                            fontFamily: 'SemiBold28',
                            fontSize: 13,
                            color: '#000',
                          }}>
                          {item.from_date}
                        </Text>

                        {item.start_time && item.end_time ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="clock-outline" size={13} color={colors.primary} />
                            <Text
                              style={{
                                marginLeft: 4,
                                fontSize: 12,
                                fontFamily: 'SemiBold28',
                                color: colors.primary,
                              }}>
                              {formatTimeDisplay(item.start_time)} - {formatTimeDisplay(item.end_time)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginLeft: 8,
                          flexWrap: 'wrap',
                          flex: 1,
                        }}>
                        <Text
                          style={{
                            fontFamily: 'SemiBold28',
                            fontSize: 13,
                            color: '#000',
                          }}>
                          {item.from_date || '--'}
                        </Text>

                        <Text
                          style={{
                            fontFamily: 'SemiBold24',
                            fontSize: 12,
                            color: '#7f90a4',
                            marginHorizontal: 6,
                          }}>
                          to
                        </Text>

                        <Text
                          style={{
                            fontFamily: 'SemiBold28',
                            fontSize: 13,
                            color: '#000',
                          }}>
                          {item.to_date || '--'}
                        </Text>
                      </View>
                    )
                  ) : (
                    <Text
                      style={{
                        marginLeft: 8,
                        fontFamily: 'SemiBold24',
                        fontSize: 12,
                        color: '#999',
                      }}>
                      Date not available
                    </Text>
                  )}
                </View>

                {/* Reason */}
                <Text
                  style={{
                    fontSize: 13,
                    color: '#333',
                    fontFamily: 'SemiBold24',
                    marginTop: 10,
                    lineHeight: 18,
                  }}
                  numberOfLines={expandedState[item.leave_id] ? undefined : 2}>
                  {item.reson}
                </Text>

                {item.reson?.length > 90 && (
                  <TouchableOpacity
                    onPress={() =>
                      expandedState[item.leave_id]
                        ? handleCollapse(item.leave_id)
                        : handleExpand(item.leave_id)
                    }
                    style={{ marginTop: 4 }}>
                    <Text
                      style={{
                        color: expandedState[item.leave_id] ? '#f45344' : colors.primary,
                        fontFamily: 'SemiBold28',
                        fontSize: 13,
                      }}>
                      {expandedState[item.leave_id] ? 'Show less' : 'Show more'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Footer */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 10,
                    borderTopWidth: 0.5,
                    borderTopColor: '#eee',
                    paddingTop: 8,
                  }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#999',
                      fontFamily: 'SemiBold24',
                    }}>
                    Applied on {item.entry_date}
                  </Text>
                </View>
              </Animatable.View>
            );
          }}
        />
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate('AddLeave')}
        style={{
          position: 'absolute',
          bottom: 12,
          width: '40%',          // yaha se width control hogi
          alignSelf: 'center',   // center me aa jayega
          height: 46,            // thoda chhota
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          flexDirection: 'row',
          elevation: 4,
        }}>
        <Image
          source={require('../assets/add.png')}
          style={{
            width: 16,
            height: 16,
            marginRight: 8,
            tintColor: '#fff',
          }}
        />
        <Text
          style={{
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 13,
            color: '#fff',
          }}>
          Apply Leave
        </Text>
      </TouchableOpacity>

      {/* Choose action modal (approve/pending/reject) */}
      <Modal
        visible={modalvisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onPress={() => setModalVisible(false)}>
          <View
            style={{
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 16,
              width: 200,
              elevation: 5,
            }}>
            <Text
              style={{
                fontFamily: 'Montserrat-ExtraBold',
                color: '#000',
                fontSize: 13,
                marginBottom: 12,
              }}>
              Choose an action
            </Text>

            {selectedLeave?.leave_status === 'Approve' && (
              <TouchableOpacity
                onPress={() => Update('Reject')}
                style={{
                  width: '100%',
                  height: 38,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                }}>
                <Text style={{ fontFamily: 'SemiBold28', color: '#fff' }}>
                  Reject
                </Text>
              </TouchableOpacity>
            )}

            {selectedLeave?.leave_status === 'Pending' && (
              <>
                <TouchableOpacity
                  onPress={() => Update('Approve')}
                  style={{
                    width: '100%',
                    marginBottom: 10,
                    height: 38,
                    backgroundColor: '#22C55E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                  }}>
                  <Text style={{ fontFamily: 'SemiBold28', color: '#fff' }}>
                    Approve
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Update('Reject')}
                  style={{
                    width: '100%',
                    height: 38,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                  }}>
                  <Text style={{ fontFamily: 'SemiBold28', color: '#fff' }}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {selectedLeave?.leave_status === 'Reject' && (
              <TouchableOpacity
                onPress={() => Update('Approve')}
                style={{
                  width: '100%',
                  height: 38,
                  backgroundColor: '#22C55E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                }}>
                <Text style={{ fontFamily: 'SemiBold28', color: '#fff' }}>
                  Approve
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Three dot modal (update/delete) */}
      <Modal
        visible={ThreedotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setThreedotModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setThreedotModal(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: dotPosition.y + dotPosition.height + 4,
              left: Math.max(
                10,
                Math.min(
                  dotPosition.x - 160 + dotPosition.width,
                  Dimensions.get('window').width - 170
                )
              ),
              backgroundColor: '#fff',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
              width: 160,
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
              onPress={UpdateLeaves}
            >
              <Icon name="pencil-outline" size={20} color="#000" />
              <Text style={{ color: '#000', marginLeft: 10, fontFamily: 'SemiBold24' }}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
              onPress={deleteModal}
            >
              <Image source={require('../assets/delete.png')} style={{ width: 20, height: 20 }} />
              <Text style={{ color: '#000', marginLeft: 10, fontFamily: 'SemiBold24' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete confirmation modal */}
      {/* Delete confirmation modal */}
      <Modal
        visible={DeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.55)',
            paddingHorizontal: 30,
          }}
          onPress={() => setDeleteModal(false)}
          activeOpacity={1}>
          <View
            style={{
              width: '100%',
              maxWidth: 300,
              backgroundColor: '#fff',
              borderRadius: 20,
              paddingTop: 26,
              paddingBottom: 18,
              paddingHorizontal: 20,
              elevation: 10,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              alignItems: 'center',
            }}
            onStartShouldSetResponder={() => true}>
            {/* Icon */}
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
              <MaterialCommunityIcons name="trash-can-outline" size={28} color="#EF4444" />
            </View>

            {/* Title */}
            <Text
              style={{
                color: '#111827',
                fontFamily: 'Montserrat-ExtraBold',
                fontSize: 16,
                textAlign: 'center',
              }}>
              Delete Leave Request?
            </Text>

            {/* Subtitle */}
            <Text
              style={{
                color: '#6B7280',
                fontFamily: 'SemiBold24',
                fontSize: 12.5,
                textAlign: 'center',
                marginTop: 6,
                lineHeight: 18,
              }}>
              Are you sure you want to delete this leave request?
            </Text>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', width: '100%', marginTop: 22, gap: 10 }}>
              <TouchableOpacity
                onPress={() => setDeleteModal(false)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ color: '#374151', fontFamily: 'SemiBold28', fontSize: 14 }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={deleteLeave}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#fff', fontFamily: 'SemiBold28', fontSize: 14 }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
export default Leave;
const styles = StyleSheet.create({});