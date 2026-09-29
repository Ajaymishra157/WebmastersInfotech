/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prettier/prettier */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutUser from '../Components/LogoutUser';
import { ENDPOINTS } from '../CommonFile/Constant';

const Attendance = ({ route }) => {
  const { refresh } = route.params || {};
  const navigation = useNavigation();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState('');
  const [punchOutTime, setPunchOutTime] = useState('');
  const [memberId, setMemberId] = useState('');
  const [Attendances, setAttendances] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [attendanceDetails, setAttendanceDetails] = useState([]);
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [overTotalWorkingHours, setOverTotalWorkingHours] = useState([]);


  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      setMemberId(id);
      // console.log('Attendance Page Member ID:', id);
    };

    getMemberId();
  }, []);

  const getCurrentFormattedTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours; // if 0 => 12

    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const handlePress = async () => {
    const currentTime = getCurrentFormattedTime();
    const now = new Date();
    const date = `${now.getDate().toString().padStart(2, '0')}-${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}-${now.getFullYear()}`;

    const action = !punchedIn ? 'punch_in' : 'punch_out';



    setPunchedIn(!punchedIn);
    await Attendance(action, date, currentTime);
    await DetailsAttendance();
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Time formatting
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedTime = `${hours}:${minutes}:${seconds}`;
      setCurrentTime(formattedTime);

      // Date formatting
      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const dayName = days[now.getDay()];
      const date = now.getDate();
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      const formattedDate = `${dayName}, ${date} ${monthName} ${year}`;
      setCurrentDate(formattedDate);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const Attendance = async (action, date, punchTime) => {

    const url = ENDPOINTS.AddAttendance;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: memberId,
          action: action,
          date: date,
          punch_time: punchTime,
        }),
      });

      const data = await response.json();
      // console.log('Attendance Response:', data);
    } catch (error) {
      console.error('Error adding attendance:', error);
    }
  };
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = (time.getHours() % 12) + minutes / 60;

  const clockSize = 120;
  const center = clockSize / 2;

  const hourAngle = (360 * hours) / 12;
  const minuteAngle = (360 * minutes) / 60;
  const secondAngle = (360 * seconds) / 60;

  const getHandStyle = (length, width, color, angle) => ({
    position: 'absolute',
    width,
    height: length,
    backgroundColor: color,
    borderRadius: width / 2,
    top: center - length,
    left: center - width / 2,
    transform: [{ rotate: `${angle}deg` }],
    transformOrigin: 'center bottom',
  });

  const getNumberStyle = number => {
    const angle = (number - 3) * 30 * (Math.PI / 180);
    const radius = center - 18;
    const x = center + radius * Math.cos(angle) - 10;
    const y = center + radius * Math.sin(angle) - 10;

    return {
      position: 'absolute',
      left: x,
      top: y,
      color: '#000',
      fontSize: 10,
      fontWeight: 'bold',
    };
  };
  useFocusEffect(
    useCallback(() => {
      if (memberId || refresh) {
        DetailsAttendance();
      }
    }, [memberId, refresh]),
  );
  const DetailsAttendance = async () => {
    const url = ENDPOINTS.ListAttendance;
    const today = new Date().toISOString().split('T')[0];

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

        const attendanceArray = result.payload[0].attendance_details;
        const lastRecord = attendanceArray[attendanceArray.length - 1];

        if (lastRecord.attendance_out == '-') {
          setPunchedIn(true);
        } else {
          setPunchedIn(false);
        }
      }
    } catch (error) {
      console.log('Error:', error);
    }
  };

  const formatTime = timeStr => {
    if (!timeStr || timeStr == '-') return '';

    const [hrs, mins, secs] = timeStr.split(':');
    let formatted = '';

    if (hrs !== '00') {
      formatted += `${hrs} hr `;
    }

    // Always show minutes (assuming it's most important)
    formatted += `${mins} min`;

    if (secs !== '00') {
      formatted += ` ${secs} s`;
    }

    return formatted.trim();
  };

  const formatOverTotalTime = timeString => {
    const str = String(timeString); // force convert to string

    const parts = str.split(':');
    if (parts.length !== 3) return '--';

    const [hrs, mins] = parts;
    const hrNum = parseInt(hrs, 10);
    const minNum = parseInt(mins, 10);

    if (hrNum === 0) {
      return `${minNum}M`;
    } else {
      return `${hrNum}H : ${minNum}M`;
    }
  };

  return (
    <View style={styles.screen}>
      <LogoutUser />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Image
            source={require('../assets/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AttendanceRepo')}
          style={styles.reportBtn}
          activeOpacity={0.8}>
          <Image
            source={require('../assets/Attendance.png')}
            style={styles.reportIcon}
          />
          <Text style={styles.reportBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Clock + Punch Card */}
        <View style={styles.heroSection}>
          <SafeAreaView style={styles.heroInner}>
            <View style={styles.clockFace}>
              {/* Numbers */}
              {[...Array(12)].map((_, i) => (
                <Text key={i} style={getNumberStyle(i + 1)}>
                  {i + 1}
                </Text>
              ))}
              {/* Hour (Red) */}
              <View style={getHandStyle(25, 4, '#dc3545', hourAngle)} />
              {/* Minute (Blue) */}
              <View style={getHandStyle(35, 3, '#3b8fd6', minuteAngle)} />
              {/* Second (Grey) */}
              <View style={getHandStyle(45, 2, '#888', secondAngle)} />
              {/* Center Dot */}
              <View style={styles.clockCenterDot} />
            </View>

            <View
              style={[
                styles.punchRing,
                { borderColor: punchedIn ? '#dc3545' : '#28a745' },
              ]}>
              <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.85}
                style={[
                  styles.punchBtn,
                  { backgroundColor: punchedIn ? '#dc3545' : '#28a745' },
                ]}>
                <Text style={styles.punchBtnText}>
                  {punchedIn ? 'Punch Out' : 'Punch In'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Live time / date bar */}
          <View style={styles.timeBar}>
            <View style={styles.timeBarRow}>
              <Text style={styles.timeBarTime}>{currentTime}</Text>
              <View style={styles.timeBarDivider} />
              <Text style={styles.timeBarDate}>{currentDate}</Text>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: punchedIn
                    ? 'rgba(220,53,69,0.16)'
                    : 'rgba(40,167,69,0.18)',
                },
              ]}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: punchedIn ? '#ff8a94' : '#5fe089' },
                ]}
              />
              <Text style={styles.statusPillText}>
                {punchedIn ? 'Currently Punched In' : 'Not Punched In'}
              </Text>
            </View>
          </View>
        </View>

        {/* Today's attendance card */}
        <View style={styles.attendanceCard}>
          <View style={styles.attendanceCardHeader}>
            <View>
              <Text style={styles.attendanceCardTitle}>Today's Log</Text>
              <Text style={styles.attendanceCardDate}>
                {attendanceDates.length ? attendanceDates.join(', ') : '--'}
              </Text>
            </View>
            <View style={styles.totalHoursPill}>
              <Text style={styles.totalHoursPillLabel}>TOTAL</Text>
              <Text style={styles.totalHoursPillText}>
                {formatOverTotalTime(overTotalWorkingHours)}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            {['In Time', 'Out Time', 'Hours'].map((title, idx) => (
              <View key={idx} style={styles.tableHeaderCell}>
                <Text style={styles.tableHeaderText}>{title}</Text>
              </View>
            ))}
          </View>

          {/* Attendance List */}
          {attendanceDetails.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Image
                  source={require('../assets/Attendance.png')}
                  style={styles.emptyIcon}
                />
              </View>
              <Text style={styles.emptyTitle}>No Attendance Found</Text>
              <Text style={styles.emptySubtitle}>
                Punch in to start tracking today
              </Text>
            </View>
          ) : (
            attendanceDetails.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.dataRow,
                  index % 2 === 1 && styles.dataRowAlt,
                ]}>
                <View style={styles.dataCell}>
                  <Text style={styles.dataCellText}>
                    {item.attendance_in || '--'}
                  </Text>
                </View>
                <View style={styles.dataCell}>
                  <Text style={styles.dataCellText}>
                    {item.attendance_out || '--'}
                  </Text>
                </View>
                <View style={styles.dataCell}>
                  <Text style={[styles.dataCellText, styles.hoursText]}>
                    {item.total_working_hour === '00:00:00' ||
                      !item.total_working_hour
                      ? '--'
                      : formatOverTotalTime(item.total_working_hour)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};
export default Attendance;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  header: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,

    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
    color: '#fff',
  },
  reportBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  reportIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
  },
  reportBtnText: {
    fontSize: 10.5,
    fontFamily: 'SemiBold24',
    color: '#fff',
    marginTop: 1,
  },
  heroSection: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 18,
    elevation: 3,
  },
  heroInner: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: 18,
  },
  clockFace: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.IconColor,
    backgroundColor: '#fff',
    marginRight: 22,
    elevation: 3,
  },
  clockCenterDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#000',
    borderRadius: 5,
    top: 60 - 6,
    left: 60 - 6,
    elevation: 5,
  },
  punchRing: {
    width: 120,
    height: 120,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 22,
    elevation: 3,
  },
  punchBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchBtnText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    color: '#fff',
  },
  timeBar: {
    marginTop: 16,
    alignItems: 'center',
  },
  timeBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBarTime: {
    fontSize: 24,
    fontFamily: 'SemiBold28',
    color: '#fff',
    letterSpacing: 0.5,
  },
  timeBarDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 12,
  },
  timeBarDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'SemiBold24',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },
  statusPillText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 11,
    color: '#fff',
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 14,
    marginTop: 18,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  attendanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  attendanceCardTitle: {
    color: '#1B1D28',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
  },
  attendanceCardDate: {
    color: '#9A9DAE',
    fontFamily: 'SemiBold24',
    fontSize: 11.5,
    marginTop: 2,
  },
  totalHoursPill: {
    backgroundColor: '#F3F4F8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7F0',
  },
  totalHoursPillLabel: {
    fontFamily: 'SemiBold24',
    fontSize: 8.5,
    color: '#9A9DAE',
    letterSpacing: 0.4,
  },
  totalHoursPillText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12.5,
    color: colors.primary,
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F1F6',
    marginVertical: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F7F8FB',
    borderRadius: 9,
    paddingVertical: 8,
  },
  tableHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  tableHeaderText: {
    color: '#6B6E7F',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 11,
    marginTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
  },
  dataRowAlt: {
    backgroundColor: '#FBFBFD',
  },
  dataCell: {
    flex: 1,
    alignItems: 'center',
  },
  dataCellText: {
    color: '#1B1D28',
    fontFamily: 'SemiBold24',
    fontSize: 13,
  },
  hoursText: {
    color: colors.primary,
    fontFamily: 'Montserrat-ExtraBold',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EDEEF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyIcon: {
    width: 24,
    height: 24,
    tintColor: '#B4B7C9',
  },
  emptyTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13.5,
    color: '#4A4D5E',
  },
  emptySubtitle: {
    fontFamily: 'SemiBold24',
    fontSize: 11.5,
    color: '#9A9DAE',
    marginTop: 3,
    textAlign: 'center',
  },
});