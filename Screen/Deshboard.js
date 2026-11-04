import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutUser from '../Components/LogoutUser';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ENDPOINTS } from '../CommonFile/Constant';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import RNExitApp from 'react-native-exit-app';
import LeaveNotificationModal from '../Components/LeaveNotificationModal';
import ReactNativeBiometrics from 'react-native-biometrics';
import { stripHtml } from '../CommonFile/htmlUtils';
import { useLang } from '../src/i18n/autoTranslate';

const Deshboard = () => {
  useLang();
  const navigation = useNavigation();
  const [memberName, setMemberName] = useState('');
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [punchedIn, setPunchedIn] = useState(false);
  const [notificationCount, setNotificationcount] = useState(10)
  const [workingHours, setworkingHours] = useState('')
  const [imageError, setImageError] = useState(false);

  const todayDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const [punchInTime, setPunchInTime] = useState('');
  const [punchOutTime, setPunchOutTime] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberPosition, setMemberPosition] = useState('');
  const [Images, setImage] = useState([]);
  const [Details, setDetails] = useState([]);
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null);


  // ===== Remark modal states =====
  const [remarkModalVisible, setRemarkModalVisible] = useState(false);
  const [remarkText, setRemarkText] = useState('');
  const [pendingAction, setPendingAction] = useState(''); // 'punch_in' ya 'punch_out' store karega
  const [punchSubmitting, setPunchSubmitting] = useState(false); // NAYA: submit ke dauran button disable karne ke liye
  const [leaveNotifModalVisible, setLeaveNotifModalVisible] = useState(false);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [todayBirthdayCount, setTodayBirthdayCount] = useState(0);
  // ===== NAYA STATE: Share Report modal ke liye (Punch Out ke baad dikhega) =====
  const [shareReportModalVisible, setShareReportModalVisible] = useState(false);
  const [isMyBirthdayToday, setIsMyBirthdayToday] = useState(false);
  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState(false);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null); // { rule_id, announcements, entry_date }
  const [showRulesBanner, setShowRulesBanner] = useState(false);
  const [latestRulesData, setLatestRulesData] = useState(null);
  const remarkInputRef = useRef(null);

  const rnBiometrics = useRef(new ReactNativeBiometrics({ allowDeviceCredentials: true })).current;

  const [bellY, setBellY] = useState(0);
  const bellRef = useRef(null);

  const onBellLayout = () => {
    // measure() se measureInWindow() zyada reliable hai position ke liye
    bellRef.current?.measureInWindow((x, y, width, height) => {
      setBellY(y + height + 8);
    });
  };

  useEffect(() => {
    const getMemberData = async () => {
      const [id, position] = await Promise.all([
        AsyncStorage.getItem('member_id'),
        AsyncStorage.getItem('member_position'),
      ]);

      setMemberId(id);
      setMemberPosition(position);
    };

    getMemberData();
  }, []);

  const hour = new Date().getHours();
  let greeting = 'Good Day';
  if (hour >= 6 && hour < 12) {
    greeting = 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
  } else if (hour >= 18 && hour < 21) {
    greeting = 'Good Evening';
  }

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        setExitModalVisible(true);
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => backHandler.remove();
    }, []),
  );


  useEffect(() => {
    const checkAndRequestNotificationPermission = async () => {
      if (Platform.OS === 'android') {
        // 👇 NAYA — sirf ek baar hi ye poora flow chalao (per app install, na ki har dashboard mount pe)
        const alreadyAsked = await AsyncStorage.getItem('notif_permission_asked');
        if (alreadyAsked === 'true') {
          // Permission already handle ho chuki hai (grant ya deny), silently token le lo agar granted hai
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted && memberId) {
            const fcmToken = await getFcmToken();
            console.log('Dashboard se FCM token mila:', fcmToken);
          }
          return; // 👈 yaha se bahar — Settings khud se kabhi nahi khulega
        }

        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (!alreadyGranted) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );

          // 👇 Chahe grant ho, deny ho, ya never_ask_again — bas flag set karo, dobara mat pucho
          await AsyncStorage.setItem('notif_permission_asked', 'true');

          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Permission denied — status:', result);
            // 👇 REMOVE KIYA: Linking.openSettings() — ab automatic nahi khulega
            return;
          }
        } else {
          await AsyncStorage.setItem('notif_permission_asked', 'true');
        }
      }

      const fcmToken = await getFcmToken();
      if (fcmToken && memberId) {
        console.log('Dashboard se FCM token mila:', fcmToken);
      }
    };

    checkAndRequestNotificationPermission();
  }, [memberId]); // memberId aane ke baad hi chalao

  const handleExit = () => {
    setExitModalVisible(false);
    RNExitApp.exitApp();
  };

  const handleImagePress = () => {
    const imageSource =
      Images &&
        typeof Images === 'string' &&
        Images.startsWith('http')
        ? { uri: Images }
        : require('../assets/profile-picture.png');

    setSelectedImage(imageSource);
    setModalVisible(true);
  };
  const handleCloseModal = () => {
    setModalVisible(false);
  };


  const getCurrentFormattedTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  };

  const handlePress = () => {
    const action = !punchedIn ? 'punch_in' : 'punch_out';
    setPendingAction(action);
    setRemarkText('');
    setRemarkModalVisible(true);
  };

  // ===== Fingerprint se direct Punch In/Out (remark ke bina) =====
  const handleFingerprintPunch = async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();

      if (!available) {
        Toast.show({
          type: 'error',
          text1: 'Fingerprint not available',
          text2: 'Please use the button to punch in/out',
          position: 'bottom',
        });
        return;
      }

      const action = !punchedIn ? 'punch_in' : 'punch_out';

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: action === 'punch_in' ? 'Confirm Punch In' : 'Confirm Punch Out',
        cancelButtonText: 'Cancel',
      });

      if (!success) return; // user ne cancel kiya

      // const currentTime = getCurrentFormattedTime();
      // const now = new Date();
      // const date = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1)
      //   .toString()
      //   .padStart(2, '0')}-${now.getFullYear()}`;

      setPunchSubmitting(true);
      const result = await Attendance(action, '', '', ''); // remark khali
      setPunchSubmitting(false);

      if (!result?.success) {
        Toast.show({
          type: 'error',
          text1: action === 'punch_in' ? 'Punch In Failed' : 'Punch Out Failed',
          text2: result?.message || 'Something went wrong',
          position: 'bottom',
          bottomOffset: 80,
          visibilityTime: 3000,
        });
        return;
      }

      setPunchedIn(!punchedIn);
      await DetailsAttendance();

      if (action === 'punch_out') {
        setShareReportModalVisible(true);
      }
    } catch (error) {
      console.log('Biometric error:', error);
      Toast.show({
        type: 'error',
        text1: 'Fingerprint authentication failed',
        position: 'bottom',
      });
    }
  };

  // ===== CHANGE: ab Attendance() ka result check hota hai. Agar task chalu hone ki wajah se
  // API fail ho (code 400, status false), to state toggle nahi hoga, Share modal nahi khulega,
  // sirf error Toast dikhega aur remark modal open rahega taaki user dobara try kar sake. =====
  const confirmPunch = async () => {
    // const currentTime = getCurrentFormattedTime();
    // const now = new Date();
    // const date = `${now.getDate().toString().padStart(2, '0')}-${(
    //   now.getMonth() + 1
    // )
    //   .toString()
    //   .padStart(2, '0')}-${now.getFullYear()}`;

    const actionJustDone = pendingAction; // reset hone se pehle yaad rakh lo

    setPunchSubmitting(true);
    const result = await Attendance(pendingAction, '', '', remarkText.trim());
    setPunchSubmitting(false);

    if (!result?.success) {
      // Task chalu hai ya koi aur error - punch confirm nahi hua
      Toast.show({
        type: 'error',
        text1: 'Punch Out Failed',
        text2: result?.message || 'Something went wrong',
        position: 'bottom',
        bottomOffset: 80,
        visibilityTime: 3000,
      });
      return setRemarkModalVisible(false); // modal open hi rehne do, state kuch change nahi hua

    }

    // Success - ab hi state update aur modal close karo
    setRemarkModalVisible(false);
    setPunchedIn(!punchedIn);
    await DetailsAttendance();

    setRemarkText('');
    setPendingAction('');

    // Agar abhi Punch Out hua hai, to Report Share confirmation dikhao
    if (actionJustDone === 'punch_out') {
      setShareReportModalVisible(true);
    }
  };

  // ===== NAYA FUNCTION: WhatsApp par report share karne ke liye =====
  // ===== WhatsApp Report Sharing =====
  const shareReportOnWhatsApp = async () => {
    try {
      const response = await fetch(ENDPOINTS.DailyWorkReport, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        }),
      });

      const data = await response.json();

      if (!data?.status) {
        Toast.show({
          type: 'error',
          text1: 'Report Failed',
          text2: data?.message || 'Something went wrong',
          position: 'bottom',
        });
        return;
      }

      let message = `*Daily Work Report*\n\n`;
      message += `Name: ${data.member_name} (${data.designation})\n`;
      message += `Date: ${data.date}\n\n`;

      // Pending Task
      message += `*Pending Task*\n\n`;
      if (data.pending_task.length === 0) {
        message += `-\n\n`;
      } else {
        data.pending_task.forEach((t, i) => {
          message += `${t.project_name}\n${i + 1}) ${t.task_name}\n\n`;
        });
      }

      // Ongoing Task
      message += `*Ongoing Task*\n\n`;
      if (data.ongoing_task.length === 0) {
        message += `-\n\n`;
      } else {
        let grouped = {};
        data.ongoing_task.forEach((t) => {
          if (!grouped[t.project_name]) grouped[t.project_name] = [];
          grouped[t.project_name].push(t);
        });
        let count = 1;
        Object.keys(grouped).forEach((project) => {
          message += `${project}\n`;
          grouped[project].forEach((t) => {
            message += `${count}) ${t.task_name} ( A.T -> ${t.actual_time} T.T -> ${t.total_time} )\n`;
            count++;
          });
          message += `\n`;
        });
      }

      // Completed Task
      message += `*Completed Task*\n\n`;
      if (data.completed_task.length === 0) {
        message += `-\n\n`;
      } else {
        data.completed_task.forEach((t) => {
          message += `${t.project_name} - ${t.task_name} ( A.T -> ${t.actual_time} T.T -> ${t.total_time} )\n`;
        });
        message += `\n`;
      }

      // I/O
      message += `*I/O : ${data.attendance_in || '--:--'} - ${data.attendance_out || '*'}*`;

      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      Linking.openURL(url).catch(() => {
        Toast.show({
          type: 'error',
          text1: 'WhatsApp not installed',
          position: 'bottom',
        });
      });
    } catch (error) {
      console.error('Report share error:', error);
      Toast.show({
        type: 'error',
        text1: 'Network error',
        position: 'bottom',
      });
    }
  };

  // ===== CHANGE: ab {success, message} return karta hai taaki confirmPunch decide kar sake
  // ki state toggle karni hai ya nahi (jaise "task chalu hai" wale case mein). =====
  const Attendance = async (action, date, punchTime, remark = '') => {
    if (!memberId) return { success: false, message: 'Member not found' };
    const url = ENDPOINTS.AddAttendance;

    const payload = {
      member_id: memberId,
      action: action,
      // date: date,
      // punch_time: punchTime,
    };

    if (action === 'punch_in') {
      payload.attendance_notes = remark;
    } else if (action === 'punch_out') {
      payload.punchout_note = remark;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data?.status) {
        return { success: true, message: data?.message };
      }

      // status false - jaise "Task chalu hai, pehle task complete/pause karke hi punch out karein"
      return { success: false, message: data?.message || 'Something went wrong' };
    } catch (error) {
      console.error('Error adding attendance:', error);
      return { success: false, message: 'Network error, please try again' };
    }
  };

  const DetailsAttendance = async () => {
    const url = ENDPOINTS.ListAttendance;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: memberId,
          start_date: today,
          end_date: today,
        }),
      });

      const result = await response.json();

      if (result.code == 200 && result.payload && result.payload.length > 0) {
        const attendanceArray = result.payload[0].attendance_details;
        const workingHours = result.payload[0].over_total_working_hour;

        setworkingHours(workingHours || '');

        if (attendanceArray && attendanceArray.length > 0) {
          const lastRecord = attendanceArray[attendanceArray.length - 1];

          setPunchInTime(lastRecord.attendance_in);
          setPunchOutTime(lastRecord.attendance_out);

          if (lastRecord.attendance_out == '-') {
            setPunchedIn(true);
          } else {
            setPunchedIn(false);
          }
        } else {
          setPunchInTime('');
          setPunchOutTime('');
          setPunchedIn(false);
        }
      } else {
        setPunchInTime('');
        setPunchOutTime('');
        setworkingHours('');
        setPunchedIn(false);
      }
    } catch (error) {
      console.log('Error:', error);
    }
  };

  const fetchPendingLeaveCount = async () => {
    if (!memberId) return;

    // Admin (member_id '1') aur HR dono ko pending leave count dikhana hai
    const isCEO = memberPosition === 'CEO';
    const isHR = memberPosition === 'HR';

    if (!isCEO && !isHR) {
      setPendingLeaveCount(0);
      return;
    }

    try {
      const response = await fetch(ENDPOINTS.ListLeave, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          start_date: '',   // Leave screen jaisa: koi date filter nahi
          end_date: '',
          leave_status: 'Pending',
        }),
      });

      const result = await response.json();

      if (result.code === 200) {
        setPendingLeaveCount(parseInt(result.leave_count) || (result.payload?.length || 0));
      } else {
        setPendingLeaveCount(0);
      }
    } catch (error) {
      console.log('Pending Leave Count Error:', error);
      setPendingLeaveCount(0);
    }
  };

  // ---- CHANGE: khud ka birthday + already-dismissed (ek baar dekh liye hue)
  // birthdays badge count se bhi exclude, taaki bell ka number bhi sahi rahe ----
  const fetchTodayBirthdayCount = async () => {
    try {
      const response = await fetch(ENDPOINTS.list_bithday, { method: 'GET' });
      const result = await response.json();

      if (result?.status && Array.isArray(result.payload)) {
        const today = new Date();
        const todayDay = today.getDate();
        const todayMonth = today.getMonth();

        const todaysList = result.payload.filter(item => {
          if (!item.member_dob || item.member_dob === '0000-00-00') return false;
          const d = new Date(item.member_dob);
          return d.getDate() === todayDay && d.getMonth() === todayMonth;
        });

        const myBirthday = todaysList.some(
          item => String(item.member_id) === String(memberId)
        );
        setIsMyBirthdayToday(myBirthday);

        const dismissedKey = `dismissed_birthdays_${today.toISOString().split('T')[0]}`;
        const dismissedRaw = await AsyncStorage.getItem(dismissedKey);
        const dismissedIds = dismissedRaw ? JSON.parse(dismissedRaw) : [];

        const othersCount = todaysList.filter(
          item =>
            String(item.member_id) !== String(memberId) &&
            !dismissedIds.includes(String(item.member_id))
        ).length;
        setTodayBirthdayCount(othersCount);
      } else {
        setTodayBirthdayCount(0);
        setIsMyBirthdayToday(false);
      }
    } catch (error) {
      console.log('Today Birthday Count Error:', error);
      setTodayBirthdayCount(0);
      setIsMyBirthdayToday(false);
    }
  };

  const checkNewAnnouncement = async () => {


    try {
      const response = await fetch(ENDPOINTS.list_rules_announce, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (
        (result?.status === true || result?.status === 'true' || result?.code === 200) &&
        Array.isArray(result?.payload) &&
        result.payload.length > 0
      ) {
        const latest = result.payload[0];

        // ---- ANNOUNCEMENTS content compare ----
        const lastSeenAnnouncement = await AsyncStorage.getItem('last_seen_announcements_content');
        if (latest.announcements && latest.announcements !== lastSeenAnnouncement) {
          setLatestAnnouncement(latest);
          setShowAnnouncementBanner(true);
        } else {
          setShowAnnouncementBanner(false);
        }

        // ---- RULES content compare (naya) ----
        const lastSeenRules = await AsyncStorage.getItem('last_seen_rules_content');
        if (latest.rules && latest.rules !== lastSeenRules) {
          setLatestRulesData(latest);
          setShowRulesBanner(true);
        } else {
          setShowRulesBanner(false);
        }
      }
    } catch (error) {
      console.log('Announcement check error:', error);
    }
  };



  useEffect(() => {
    const fetchName = async () => {
      try {
        const name = await AsyncStorage.getItem('member_name');
        if (name !== null) {
          setMemberName(name);
        }
      } catch (error) {
        console.error('Error fetching member_name:', error);
      }
    };

    fetchName();
  }, []);

  const profile = async () => {
    const url = ENDPOINTS.ListProfile;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: memberId,
        }),
      });
      const result = await response.json();

      if (result?.status && result?.payload?.member_image) {
        setImage(result.payload.member_image);
        setDetails(result.payload);
      }
    } catch (error) { }
  };
  useFocusEffect(
    useCallback(() => {
      if (memberId) {
        profile();
        DetailsAttendance();
        fetchPendingLeaveCount();
        fetchTodayBirthdayCount();
        checkNewAnnouncement(); // 👈 NAYA add karo
      }
    }, [memberId, memberPosition]),   // 👈 ye add karo
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
      <LogoutUser />
      <StatusBar backgroundColor={colors.primary} barStyle={'light-content'} />

      {/* ========== HEADER SECTION ========== */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: 10,
          paddingBottom: 20,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            marginTop: 10,
          }}>
          <TouchableOpacity onPress={() => navigation.navigate('CustomDrawer')}>
            <Icon name="menu" size={28} color="#fff" />
          </TouchableOpacity>

          <Text
            style={{
              color: '#fff',
              fontSize: 20,
              fontFamily: 'Montserrat-ExtraBold',
              flex: 1,
              textAlign: 'center',
            }}>
            WebMasters
          </Text>
          {(memberPosition === 'CEO' || memberPosition === 'HR') ? (
            <TouchableOpacity
              ref={bellRef}
              onLayout={onBellLayout}
              onPress={() => {
                bellRef.current?.measureInWindow((x, y, width, height) => {
                  setBellY(y + height + 8);
                  setLeaveNotifModalVisible(true);
                });
              }}
              style={{ width: 28 }}>
              <View>
                <Icon name="bell-outline" size={24} color="#fff" />
                {(() => {
                  const isCEO = memberPosition === 'CEO';
                  const badgeCount = isCEO
                    ? pendingLeaveCount + todayBirthdayCount // CEO: leave + birthday
                    : pendingLeaveCount; // HR: sirf leave

                  return badgeCount > 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -4,
                        backgroundColor: '#EF4444',
                        borderRadius: 8,
                        minWidth: 16,
                        height: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 3,
                      }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
                        {badgeCount}
                      </Text>
                    </View>
                  ) : null;
                })()}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28 }} />
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 15 }}>
          <TouchableOpacity onPress={handleImagePress}>
            <View
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                borderWidth: 3,
                borderColor: 'rgba(255,255,255,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}>
              <Image
                source={
                  Images &&
                    typeof Images === 'string' &&
                    Images.trim() !== '' &&
                    Images.startsWith('http') &&
                    !imageError
                    ? { uri: Images }
                    : require('../assets/profile-picture.png')
                }
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            </View>
          </TouchableOpacity>

          <View style={{ marginLeft: 14, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'SemiBold24' }}>
                {greeting},
              </Text>
              <Text style={{ fontSize: 16, marginLeft: 4 }}>☀️</Text>
            </View>
            <Text
              numberOfLines={1}
              style={{ color: '#fff', fontSize: 20, fontFamily: 'Montserrat-ExtraBold', marginTop: 2 }}>
              {memberName || '---'}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 18,
                marginTop: 6,
              }}>
              <Icon name="briefcase-outline" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12.5, fontFamily: 'SemiBold24', marginLeft: 5 }}>
                {Details.member_position || '--'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginHorizontal: 5 }}>|</Text>
              <Text style={{ color: '#fff', fontSize: 12.5, fontFamily: 'SemiBold24' }}>
                {Details.member_code || '--'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ========== OUTER SCROLL VIEW ========== */}
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          paddingBottom: 30,
          paddingTop: 10,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ========== NEW: BIRTHDAY BANNER (sirf khud ka birthday hone par) ========== */}
        {isMyBirthdayToday && (
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View
              style={{
                width: '92%',
                borderRadius: 12,
                overflow: 'hidden',
                elevation: 3,
                shadowColor: '#DB2777',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
              }}>
              <View
                style={{
                  backgroundColor: '#FDF2F8',
                  borderWidth: 1,
                  borderColor: '#F9A8D4',
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#FCE7F3',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}>
                  <Text style={{ fontSize: 16 }}>🎂</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Montserrat-ExtraBold',
                      color: '#DB2777',
                    }}>
                    Happy Birthday, {memberName || 'there'}! 🎉
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: 'SemiBold24',
                      color: '#BE185D',
                      marginTop: 1,
                    }}>
                    Wishing you a fantastic day ahead ✨
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ========== NEW: ANNOUNCEMENT BANNER ========== */}
        {showAnnouncementBanner && latestAnnouncement && (
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View
              style={{
                width: '92%',
                borderRadius: 12,
                overflow: 'hidden',
                elevation: 3,
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
              }}>
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  borderWidth: 1,
                  borderColor: '#93C5FD',
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#DBEAFE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}>
                  <Icon name="bullhorn-outline" size={16} color="#2563EB" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Montserrat-ExtraBold',
                      color: '#1D4ED8',
                    }}>
                    New Announcement
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 10.5,
                      fontFamily: 'SemiBold24',
                      color: '#3B82F6',
                      marginTop: 1,
                    }}>
                    {stripHtml(latestAnnouncement.announcements) || 'Tap to view details'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    await AsyncStorage.setItem('last_seen_announcements_content', latestAnnouncement.announcements);
                    setShowAnnouncementBanner(false);
                    navigation.navigate('Rules', { initialTab: 'announcements' });
                  }}
                  style={{
                    backgroundColor: '#2563EB',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginLeft: 8,
                  }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'SemiBold28' }}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}


        {/* ========== NEW: RULES UPDATE BANNER ========== */}
        {showRulesBanner && latestRulesData && (
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View
              style={{
                width: '92%',
                borderRadius: 12,
                overflow: 'hidden',
                elevation: 3,
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
              }}>
              <View
                style={{
                  backgroundColor: '#F5F3FF',
                  borderWidth: 1,
                  borderColor: '#C4B5FD',
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#EDE9FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}>
                  <Icon name="gavel" size={16} color="#7C3AED" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Montserrat-ExtraBold', color: '#6D28D9' }}>
                    Rules Updated
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 10.5, fontFamily: 'SemiBold24', color: '#7C3AED', marginTop: 1 }}>
                    {stripHtml(latestRulesData.rules) || 'Tap to view details'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    await AsyncStorage.setItem('last_seen_rules_content', latestRulesData.rules);
                    setShowRulesBanner(false);
                    navigation.navigate('Rules', { initialTab: 'rules' });
                  }}
                  style={{
                    backgroundColor: '#7C3AED',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginLeft: 8,
                  }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'SemiBold28' }}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ========== ATTENDANCE CARD ========== */}
        <View style={{ alignItems: 'center', marginTop: 15 }}>
          <View
            style={{
              backgroundColor: '#fff',
              width: '92%',
              alignSelf: 'center',
              borderRadius: 16,
              padding: 14,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: '#E0EAFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name="calendar-check-outline" size={16} color={colors.primary} />
                </View>
                <Text style={{ marginLeft: 8, fontSize: 14, fontFamily: 'Montserrat-ExtraBold', color: '#1F2937' }}>
                  Today's Attendance
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: punchedIn ? '#DCFCE7' : '#FEE2E2',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                }}>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: punchedIn ? '#16A34A' : '#DC2626',
                    marginRight: 4,
                  }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: 'SemiBold24',
                    color: punchedIn ? '#16A34A' : '#DC2626',
                  }}>
                  {punchedIn ? 'Present' : 'Absent'}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 12,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F3F6',
              }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: '#DCFCE7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon name="login" size={13} color="#16A34A" />
                  </View>
                  <Text style={{ marginLeft: 6, fontSize: 11, color: '#6B7280', fontFamily: 'SemiBold24' }}>
                    Punch In
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    color: '#16A34A',
                    fontFamily: 'Montserrat-ExtraBold',
                    marginTop: 2,
                    marginLeft: 30,
                  }}>
                  {punchInTime || '--:--'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: '#FEE2E2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon name="logout" size={13} color="#DC2626" />
                  </View>
                  <Text style={{ marginLeft: 6, fontSize: 11, color: '#6B7280', fontFamily: 'SemiBold24' }}>
                    Punch Out
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    color: punchOutTime ? '#DC2626' : '#9CA3AF',
                    fontFamily: 'Montserrat-ExtraBold',
                    marginTop: 2,
                    marginLeft: 30,
                  }}>
                  {punchOutTime || '--:--'}
                </Text>
              </View>

              <View
                style={{
                  width: 95,
                  height: 95,
                  borderRadius: 47.5,
                  backgroundColor: '#EFF4FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  paddingVertical: 4,
                }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 2,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }}>
                  <Icon name="clock-time-four-outline" size={18} color={'#0a63ec'} />
                </View>

                <Text
                  style={{
                    fontSize: 8.5,
                    color: '#6B7280',
                    fontFamily: 'SemiBold24',
                    marginTop: 2,
                    textAlign: 'center',
                    letterSpacing: 0.3,
                  }}>
                  Status
                </Text>

                <Text
                  style={{
                    fontSize: 11,
                    color: '#0a63ec',
                    fontFamily: 'Montserrat-ExtraBold',
                    textAlign: 'center',
                    marginTop: -1,
                    letterSpacing: 0.2,
                  }}>
                  {punchedIn ? 'Working' : 'Off'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <TouchableOpacity
                onPress={handlePress}
                onLongPress={handleFingerprintPunch}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  backgroundColor: punchedIn ? '#DC3545' : colors.primary,
                  height: 44,
                  borderRadius: 22,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 2,
                }}>
                <Icon name="fingerprint" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Montserrat-ExtraBold', marginLeft: 8 }}>
                  {punchedIn ? 'Punch Out' : 'Punch In'}
                </Text>
              </TouchableOpacity>

              {/* NAYA: Share Report button - hamesha available, "No" click karne ke baad bhi */}
              <TouchableOpacity
                onPress={shareReportOnWhatsApp}
                activeOpacity={0.85}
                style={{
                  width: 44,
                  height: 44,
                  marginLeft: 10,
                  backgroundColor: '#16A34A',
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 2,
                }}>
                <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#F5F7FB',
                borderRadius: 12,
                marginTop: 10,
                paddingVertical: 8,
              }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="clock-outline" size={14} color="#6B7280" />
                <View style={{ marginLeft: 6 }}>
                  <Text style={{ fontSize: 9, color: '#6B7280', fontFamily: 'SemiBold24' }}>Present Hours</Text>
                  <Text style={{ fontSize: 12, color: colors.primary, fontFamily: 'Montserrat-ExtraBold' }}>
                    {workingHours || '00h 00m'}
                  </Text>
                </View>
              </View>

              <View style={{ width: 1, backgroundColor: '#E5E7EB' }} />

              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="calendar-blank-outline" size={14} color="#6B7280" />
                <View style={{ marginLeft: 6 }}>
                  <Text style={{ fontSize: 9, color: '#6B7280', fontFamily: 'SemiBold24' }}>Date</Text>
                  <Text style={{ fontSize: 12, color: colors.primary, fontFamily: 'Montserrat-ExtraBold' }}>
                    {todayDate || moment().format('DD MMM')}
                  </Text>
                </View>
              </View>
            </View> */}
          </View>
        </View>

        {/* ========== QUICK ACTIONS CARD ========== */}
        <View
          style={{
            width: '96%',
            backgroundColor: '#fff',
            marginTop: 15,
            marginLeft: '2%',
            elevation: 3,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 8,
            marginBottom: 10,
          }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'Montserrat-ExtraBold',
              color: '#1F2937',
              marginBottom: 10,
              paddingHorizontal: 4,
            }}>
            Quick Actions
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              gap: 12,
            }}>
            {(() => {
              const items =
                memberPosition === 'CEO'
                  ? [
                    { label: 'Attendance', icon: 'calendar-check-outline', bg: '#E0F2FE', tint: '#0284C7', screen: 'Allattendance' },
                    { label: 'Leave', icon: 'beach', bg: '#FEE2E2', tint: '#DC2626', screen: 'Leave' },
                    { label: 'Staff', icon: 'account-group-outline', bg: '#DCFCE7', tint: '#16A34A', screen: 'Staff' },
                    { label: 'Project', icon: 'briefcase-outline', bg: '#EDE9FE', tint: '#7C3AED', screen: 'Project' },
                    { label: 'Module', icon: 'puzzle-outline', bg: '#DBEAFE', tint: '#2563EB', screen: 'Module' },
                    { label: 'Task', icon: 'clipboard-text-outline', bg: '#FFEDD5', tint: '#EA580C', screen: 'Task' },
                    { label: 'Festival', icon: 'party-popper', bg: '#FFF7ED', tint: '#F97316', screen: 'ListFestival' },
                    { label: 'Birthday', icon: 'cake-variant-outline', bg: '#FCE7F3', tint: '#DB2777', screen: 'Listbirthday' },
                    { label: 'Report', icon: 'chart-box-outline', bg: '#EFF6FF', tint: '#2563EB', screen: 'ReportScreen' },
                    { label: 'Rules', icon: 'gavel', bg: '#EDE9FE', tint: '#7C3AED', screen: 'Rules' },
                    { label: 'Settings', icon: 'cog-outline', bg: '#F3F4F6', tint: '#374151', screen: 'settingscreen' },
                  ]

                  : memberPosition === 'HR'

                    ? [
                      { label: 'Attendance', icon: 'calendar-check-outline', bg: '#E0F2FE', tint: '#0284C7', screen: 'Allattendance' },
                      { label: 'Leave', icon: 'beach', bg: '#FEE2E2', tint: '#DC2626', screen: 'Leave' },
                      { label: 'Staff', icon: 'account-group-outline', bg: '#DCFCE7', tint: '#16A34A', screen: 'Staff' },
                      { label: 'Task', icon: 'clipboard-text-outline', bg: '#FFEDD5', tint: '#EA580C', screen: 'Task' },
                      { label: 'Festival', icon: 'party-popper', bg: '#FFF7ED', tint: '#F97316', screen: 'ListFestival' },
                      { label: 'Birthday', icon: 'cake-variant-outline', bg: '#FCE7F3', tint: '#DB2777', screen: 'Listbirthday' },
                      { label: 'Report', icon: 'chart-box-outline', bg: '#EFF6FF', tint: '#2563EB', screen: 'ReportScreen' },
                      { label: 'Rules', icon: 'gavel', bg: '#EDE9FE', tint: '#7C3AED', screen: 'Rules' },
                      { label: 'Settings', icon: 'cog-outline', bg: '#F3F4F6', tint: '#374151', screen: 'settingscreen' },
                    ]
                    : memberPosition === 'Project Manager'

                      ? [
                        { label: 'Attendance', icon: 'calendar-check-outline', bg: '#E0F2FE', tint: '#0284C7', screen: 'Attendance' },
                        { label: 'Leave', icon: 'beach', bg: '#FEE2E2', tint: '#DC2626', screen: 'Leave' },
                        { label: 'Project', icon: 'briefcase-outline', bg: '#EDE9FE', tint: '#7C3AED', screen: 'Project' },
                        { label: 'Module', icon: 'puzzle-outline', bg: '#DBEAFE', tint: '#2563EB', screen: 'Module' },
                        { label: 'Task', icon: 'clipboard-text-outline', bg: '#FFEDD5', tint: '#EA580C', screen: 'Task' },
                        { label: 'Festival', icon: 'party-popper', bg: '#FFF7ED', tint: '#F97316', screen: 'ListFestival' },
                        { label: 'Birthday', icon: 'cake-variant-outline', bg: '#FCE7F3', tint: '#DB2777', screen: 'Listbirthday' },
                        { label: 'Report', icon: 'chart-box-outline', bg: '#EFF6FF', tint: '#2563EB', screen: 'ReportScreen' },
                        { label: 'Rules', icon: 'gavel', bg: '#EDE9FE', tint: '#7C3AED', screen: 'Rules' },
                        { label: 'Settings', icon: 'cog-outline', bg: '#F3F4F6', tint: '#374151', screen: 'settingscreen' },
                      ]

                      : [
                        { label: 'Attendance', icon: 'calendar-check-outline', bg: '#E0F2FE', tint: '#0284C7', screen: 'Attendance' },
                        { label: 'Leave', icon: 'beach', bg: '#FEE2E2', tint: '#DC2626', screen: 'Leave' },
                        { label: 'Module', icon: 'puzzle-outline', bg: '#DBEAFE', tint: '#2563EB', screen: 'Module' },
                        { label: 'Task', icon: 'clipboard-text-outline', bg: '#DCFCE7', tint: '#16A34A', screen: 'Task' },
                        { label: 'Festival', icon: 'party-popper', bg: '#FFF7ED', tint: '#F97316', screen: 'ListFestival' },
                        { label: 'Birthday', icon: 'cake-variant-outline', bg: '#FCE7F3', tint: '#DB2777', screen: 'Listbirthday' },
                        { label: 'Rules', icon: 'gavel', bg: '#EDE9FE', tint: '#7C3AED', screen: 'Rules' },
                        { label: 'Settings', icon: 'cog-outline', bg: '#F3F4F6', tint: '#374151', screen: 'settingscreen' },
                      ];

              return items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    width: '22%',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.screen) {
                      navigation.navigate(item.screen);
                    } else if (item.action) {
                      item.action();
                    }
                  }}>
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 16,
                      backgroundColor: item.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }}>
                    <View style={{ position: 'relative' }}>
                      <Icon name={item.icon} size={22} color={item.tint} />
                      {item.label === 'Leave' && pendingLeaveCount > 0 && (
                        <View style={{
                          position: 'absolute', top: -15, right: -15,
                          backgroundColor: '#EF4444', borderRadius: 8,
                          minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>{pendingLeaveCount}</Text>
                        </View>
                      )}
                      {/* ---- NEW: Birthday badge ---- */}
                      {item.label === 'Birthday' && todayBirthdayCount > 0 && (
                        <View style={{
                          position: 'absolute', top: -15, right: -15,
                          backgroundColor: '#EF4444', borderRadius: 8,
                          minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>{todayBirthdayCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'SemiBold24',
                      color: '#374151',
                      fontSize: 11,
                      marginTop: 5,
                      textAlign: 'center',
                      lineHeight: 13,
                    }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ));
            })()}
          </View>
        </View>
      </ScrollView>

      {/* ===== Punch In / Punch Out Remark Modal ===== */}
      {/* ===== Punch In / Punch Out Remark Modal ===== */}
      <Modal
        transparent
        visible={remarkModalVisible}
        animationType="slide"
        onShow={() => {
          setTimeout(() => {
            remarkInputRef.current?.focus();
          }, 250); // bottom-sheet slide-up animation ke baad focus
        }}
        onRequestClose={() => {
          setRemarkModalVisible(false);
          setRemarkText('');
          setPendingAction('');
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setRemarkModalVisible(false);
            setRemarkText('');
            setPendingAction('');
          }}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { }}
            style={{
              width: '100%',
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 24,
              elevation: 12,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: -4 },
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <View
                style={{
                  width: 42,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#E5E7EB',
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor:
                      pendingAction === 'punch_in' ? '#DCFCE7' : '#FEE2E2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <MaterialCommunityIcons
                    name={pendingAction === 'punch_in' ? 'login' : 'logout'}
                    size={20}
                    color={pendingAction === 'punch_in' ? '#16A34A' : '#DC2626'}
                  />
                </View>
                <View>
                  <Text
                    style={{
                      color: '#111827',
                      fontSize: 16,
                      fontFamily: 'Montserrat-ExtraBold',
                    }}
                  >
                    {pendingAction === 'punch_in' ? 'Punch In' : 'Punch Out'}
                  </Text>
                  <Text
                    style={{
                      color: '#9CA3AF',
                      fontSize: 12,
                      fontFamily: 'SemiBold24',
                      marginTop: 2,
                    }}
                  >
                    Add a remark before you continue
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setRemarkModalVisible(false);
                  setRemarkText('');
                  setPendingAction('');
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#F3F4F6',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={16} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={{ paddingHorizontal: 20 }}>
              <TextInput
                ref={remarkInputRef}
                value={remarkText}
                onChangeText={setRemarkText}
                placeholder="Type your remark here..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                style={{
                  width: '100%',
                  minHeight: 90,
                  maxHeight: 140,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 12,
                  backgroundColor: '#F9FAFB',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: '#111827',
                  fontFamily: 'SemiBold24',
                }}
              />

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', marginTop: 18, gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setRemarkModalVisible(false);
                    setRemarkText('');
                    setPendingAction('');
                  }}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: '#F3F4F6',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#4B5563',
                      fontSize: 14,
                      fontFamily: 'SemiBold28',
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmPunch}
                  disabled={punchSubmitting}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor:
                      pendingAction === 'punch_in' ? '#16A34A' : '#DC2626',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: punchSubmitting ? 0.7 : 1,
                  }}
                >
                  {!punchSubmitting && (
                    <MaterialCommunityIcons
                      name={pendingAction === 'punch_in' ? 'login' : 'logout'}
                      size={16}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 14,
                      fontFamily: 'SemiBold28',
                    }}
                  >
                    {punchSubmitting
                      ? 'Please wait...'
                      : pendingAction === 'punch_in'
                        ? 'Punch In'
                        : 'Punch Out'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===== NAYA MODAL: Punch Out ke baad Report Share confirmation ===== */}
      <Modal
        transparent
        visible={shareReportModalVisible}
        animationType="fade"
        onRequestClose={() => setShareReportModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              width: '85%',
              maxWidth: 340,
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 20,
              elevation: 10,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#DCFCE7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons name="whatsapp" size={26} color="#16A34A" />
            </View>

            <Text
              style={{
                fontSize: 16,
                fontFamily: 'Montserrat-ExtraBold',
                color: '#1F2937',
                textAlign: 'center',
                marginBottom: 6,
              }}
            >
              Punch Out Successful
            </Text>

            <Text
              style={{
                fontSize: 13.5,
                fontFamily: 'SemiBold24',
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: 18,
              }}
            >
              Do you need to share the attendance report on WhatsApp?
            </Text>

            <View style={{ flexDirection: 'row', width: '100%' }}>
              <TouchableOpacity
                onPress={() => setShareReportModalVisible(false)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                <Text style={{ color: '#374151', fontFamily: 'SemiBold28', fontSize: 14 }}>
                  No
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareReportOnWhatsApp}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: '#16A34A',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'SemiBold28', fontSize: 14 }}>
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={exitModalVisible}
        animationType="fade"
        onRequestClose={() => setExitModalVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: '80%',
              backgroundColor: 'white',
              borderRadius: 10,
              padding: 25,
              elevation: 10,
            }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                marginBottom: 10,
                color: '#000',
                fontFamily: 'Montserrat-ExtraBold',
              }}>
              Exit App
            </Text>

            <Text
              style={{
                fontSize: 16,
                marginBottom: 20,
                color: '#000',
                fontFamily: 'SemiBold24',
              }}>
              Are you sure you want to exit?
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}>
              <TouchableOpacity
                onPress={() => setExitModalVisible(false)}
                style={{
                  backgroundColor: '#aaa',
                  paddingVertical: 10,
                  paddingHorizontal: 15,
                  borderRadius: 5,
                  marginRight: 10,
                }}>
                <Text style={{ color: '#fff', fontFamily: 'SemiBold28' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExit}
                style={{
                  backgroundColor: '#e53935',
                  paddingVertical: 10,
                  paddingHorizontal: 15,
                  borderRadius: 5,
                }}>
                <Text style={{ color: '#fff', fontFamily: 'SemiBold28' }}>
                  Yes, Exit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
          onPress={handleCloseModal}
          activeOpacity={1}
        >
          <View
            style={{
              width: '80%',
              height: '40%',
              backgroundColor: 'white',
              borderRadius: 150,
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {selectedImage && (
              <Image
                source={selectedImage}
                style={{
                  width: '100%',
                  height: '100%',
                  resizeMode: 'stretch',
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <LeaveNotificationModal
        visible={leaveNotifModalVisible}
        onClose={() => setLeaveNotifModalVisible(false)}
        memberId={memberId}
        navigation={navigation}
        topOffset={bellY}
        showBirthdays={memberPosition === 'CEO'}
      />

    </View>
  );
};
export default Deshboard;