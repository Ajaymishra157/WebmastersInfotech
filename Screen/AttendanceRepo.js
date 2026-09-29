/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../colors/Colors';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import DateTimePicker from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS } from '../CommonFile/Constant';

const AttendanceRepo = () => {
  const navigation = useNavigation();
  const [isFromDatePickerVisible, setFromDatePickerVisibility] =
    useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] =
    useState(false);
  const [fromDate, setFromDate] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [FromDateError, setFromDateError] = useState();
  const [TillDateError, setTillDateError] = useState();
  const [memberId, setMemberId] = useState('');
  const [totalWorkingHours, setTotalWorkingHours] = useState({});
  const [fromDateDisplay, setFromDateDisplay] = useState('');
  const [tillDateDisplay, setTillDateDisplay] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [attendanceDetails, setAttendanceDetails] = useState([]);

  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      setMemberId(id);
      console.log('Attendance Page Member ID:', id);
    };
    getMemberId();
  }, []);

  const showFromDatePicker = () => setFromDatePickerVisibility(true);
  const hideFromDatePicker = () => setFromDatePickerVisibility(false);

  const showTillDatePicker = () => setTillDatePickerVisibility(true);
  const hideTillDatePicker = () => setTillDatePickerVisibility(false);

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
      display: `${day}/${month}/${year}`,
      api: `${year}-${month}-${day}`,
    };
  };

  const handleFromDateConfirm = date => {
    hideFromDatePicker();
    const { display, api } = formatDate(date);
    setFromDateDisplay(display);
    setFromDate(api);

    // Agar already selected Till date, naye From date se pehle ka hai,
    // to Till date ko bhi From date jitna set kar do (invalid range na bane)
    if (tillDate && new Date(api) > new Date(tillDate)) {
      setTillDateDisplay(display);
      setTillDate(api);
    }
  };

  const handleTillDateConfirm = date => {
    hideTillDatePicker();
    const { display, api } = formatDate(date);
    setTillDateDisplay(display);
    setTillDate(api);
  };

  const DetailsAttendance = async (customStartDate, customEndDate) => {
    if (!memberId) {
      console.log('Member ID not available yet.');
      return;
    }

    setLoading(true);

    const url = ENDPOINTS.ListAttendance;
    const today = new Date();

    const formatApiDate = date =>
      date.toLocaleDateString('en-GB').split('/').join('-');

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const startDate = customStartDate || formatApiDate(firstDayOfMonth);
    const endDate = customEndDate || formatApiDate(today);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.code === 200) {
        const groupedDetails = {};
        const totalHours = {};

        result.payload.forEach(item => {
          const date = item.attendance_date;
          if (!groupedDetails[date]) {
            groupedDetails[date] = [];
          }
          groupedDetails[date].push(...item.attendance_details);
          totalHours[date] = item.over_total_working_hour;
        });

        setAttendanceDetails(groupedDetails);
        setAttendanceDates(Object.keys(groupedDetails));
        setTotalWorkingHours(totalHours);
      } else {
        setAttendanceDetails({});
        setAttendanceDates([]);
        setTotalWorkingHours({});
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendanceDetails({});
      setAttendanceDates([]);
      setTotalWorkingHours({});
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (memberId) {
        DetailsAttendance();
      }
    }, [memberId]),
  );

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const formattedFrom = formatDate(firstDay);
    const formattedTill = formatDate(today);

    setFromDate(formattedFrom.api);
    setFromDateDisplay(formattedFrom.display);

    setTillDate(formattedTill.api);
    setTillDateDisplay(formattedTill.display);
  }, []);

  const formatOverTotalTime = timeString => {
    const str = String(timeString);
    const parts = str.split(':');

    if (parts.length !== 3) return '--';

    const [hrs, mins] = parts;
    const hrNum = parseInt(hrs, 10);
    const minNum = parseInt(mins, 10);

    if (hrNum === 0) {
      return `${minNum}M`;
    } else {
      return `${hrNum}H ${minNum}M`;
    }
  };

  const getDayLabel = dateStr => {
    try {
      if (!dateStr) {
        return { day: '--', month: '', weekday: '' };
      }

      // API format: dd-mm-yyyy
      const [dayStr, monthStr, yearStr] = dateStr.split('-');

      const dayNum = parseInt(dayStr, 10);
      const monthNum = parseInt(monthStr, 10);
      const yearNum = parseInt(yearStr, 10);

      if (!dayNum || !monthNum || !yearNum) {
        return { day: '--', month: '', weekday: dateStr };
      }

      // month JS me 0-based hota hai
      const d = new Date(yearNum, monthNum - 1, dayNum);

      const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
      const month = d.toLocaleDateString('en-GB', { month: 'short' });

      return {
        weekday,
        day: String(dayNum).padStart(2, '0'),
        month,
      };
    } catch (e) {
      return { day: '--', month: '', weekday: dateStr };
    }
  };

  const totalDaysCount = attendanceDates.length;

  const presentDaysCount = attendanceDates.filter(date =>
    attendanceDetails[date]?.some(
      item =>
        item.attendance_in &&
        item.attendance_in !== '-' &&
        item.attendance_out &&
        item.attendance_out !== '-'
    )
  ).length;

  return (
    <View style={styles.screen}>
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

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Attendance Report</Text>
          <Text style={styles.headerSubtitle}>
            View daily in / out & working hours
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 22 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Compact Filter Card */}
        <View style={styles.filterCard}>
          <Text style={styles.filterCardTitle}>Select Date Range</Text>

          <View style={styles.compactFilterRow}>
            {/* From */}
            <TouchableOpacity
              onPress={showFromDatePicker}
              activeOpacity={0.8}
              style={styles.compactDateBox}>
              <Image
                source={require('../assets/calendar.png')}
                style={styles.compactCalendarIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.compactLabel}>From</Text>
                <Text
                  style={[
                    styles.compactDateText,
                    !fromDateDisplay && styles.placeholderText,
                  ]}
                  numberOfLines={1}>
                  {fromDateDisplay || 'dd/mm/yyyy'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Till */}
            <TouchableOpacity
              onPress={showTillDatePicker}
              activeOpacity={0.8}
              style={styles.compactDateBox}>
              <Image
                source={require('../assets/calendar.png')}
                style={styles.compactCalendarIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.compactLabel}>Till</Text>
                <Text
                  style={[
                    styles.compactDateText,
                    !tillDateDisplay && styles.placeholderText,
                  ]}
                  numberOfLines={1}>
                  {tillDateDisplay || 'dd/mm/yyyy'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Search */}
            <TouchableOpacity
              onPress={() => DetailsAttendance(fromDate, tillDate)}
              activeOpacity={0.85}
              style={styles.compactSearchBtn}>
              <Image
                source={require('../assets/Search.png')}
                style={styles.compactSearchIcon}
              />
            </TouchableOpacity>
          </View>

          {FromDateError ? (
            <Text style={styles.errorText}>{FromDateError}</Text>
          ) : null}
          {TillDateError ? (
            <Text style={styles.errorText}>{TillDateError}</Text>
          ) : null}

          <DateTimePicker
            isVisible={isFromDatePickerVisible}
            mode="date"
            date={fromDate ? new Date(fromDate) : new Date()}
            onConfirm={handleFromDateConfirm}
            onCancel={hideFromDatePicker}
            maximumDate={new Date()}
          />

          <DateTimePicker
            isVisible={isTillDatePickerVisible}
            mode="date"
            date={tillDate ? new Date(tillDate) : new Date()}
            onConfirm={handleTillDateConfirm}
            onCancel={hideTillDatePicker}
            minimumDate={fromDate ? new Date(fromDate) : new Date()}
            maximumDate={new Date()}
          />
        </View>

        {/* Summary Strip */}
        {!loading && attendanceDates.length > 0 && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalDaysCount}</Text>
              <Text style={styles.summaryLabel}>Days</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{presentDaysCount}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryValueSmall} numberOfLines={1}>
                {fromDateDisplay || '--'}
              </Text>
              <Text style={styles.summaryLabel}>From</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryValueSmall} numberOfLines={1}>
                {tillDateDisplay || '--'}
              </Text>
              <Text style={styles.summaryLabel}>Till</Text>
            </View>
          </View>
        )}

        {/* Body */}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Loading attendance...</Text>
          </View>
        ) : attendanceDates.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Image
                source={require('../assets/calendar.png')}
                style={styles.emptyIcon}
              />
            </View>
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptySubtitle}>
              Try changing the date range and search again
            </Text>
          </View>
        ) : (
          attendanceDates.map(date => {
            const dayLabel = getDayLabel(date);

            return (
              <View key={date} style={styles.dayCard}>
                {/* Card Header */}
                <View style={styles.dayCardHeader}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeNum}>{dayLabel.day}</Text>
                    <Text style={styles.dayBadgeMonth}>{dayLabel.month}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.dayCardWeekday}>
                      {dayLabel.weekday}
                    </Text>
                    <Text style={styles.dayCardDate}>{date}</Text>
                  </View>


                </View>

                <View style={styles.cardDivider} />

                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <View style={styles.tableHeaderCell}>
                    <Text style={styles.tableHeaderText}>In Time</Text>
                  </View>
                  <View style={styles.tableHeaderCell}>
                    <Text style={styles.tableHeaderText}>Out Time</Text>
                  </View>
                  <View style={styles.tableHeaderCell}>
                    <Text style={styles.tableHeaderText}>Hours</Text>
                  </View>
                </View>

                {/* Rows */}
                {/* Rows */}
                {attendanceDetails[date]?.map((item, index) => (
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
                        {formatOverTotalTime(item.total_working_hour)}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Total Row - saare punches ka combined total, taaki clear pata chale */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalRowLabel}>Total (In + Out combined)</Text>
                  <Text style={styles.totalRowValue}>
                    {formatOverTotalTime(totalWorkingHours[date] || '--')}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default AttendanceRepo;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },

  /* HEADER */
  header: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backIcon: {
    width: 17,
    height: 17,
    tintColor: '#fff',
  },
  headerTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 17,
    color: '#fff',
  },
  headerSubtitle: {
    fontFamily: 'SemiBold24',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 1,
  },

  body: {
    flex: 1,
    paddingHorizontal: 12,
  },

  /* FILTER CARD */
  filterCard: {
    backgroundColor: '#fff',
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  filterCardTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12,
    color: '#1B1D28',
    marginBottom: 10,
  },
  compactFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDateBox: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#FAFBFE',
    borderWidth: 1,
    borderColor: '#E5E7F0',
    borderRadius: 11,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  compactCalendarIcon: {
    width: 15,
    height: 15,
    tintColor: colors.primary,
    marginRight: 8,
  },
  compactLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 9,
    color: '#8D90A1',
    marginBottom: 1,
  },
  compactDateText: {
    fontFamily: 'SemiBold24',
    color: '#1B1D28',
    fontSize: 12,
  },
  compactSearchBtn: {
    width: 46,
    height: 46,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSearchIcon: {
    width: 17,
    height: 17,
    tintColor: '#fff',
  },
  placeholderText: {
    color: '#A3A6B5',
  },
  errorText: {
    color: '#E4453A',
    fontFamily: 'SemiBold24',
    marginTop: 4,
    fontSize: 10.5,
  },

  /* SUMMARY */
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 10,
    paddingVertical: 10,
    elevation: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  summaryValue: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12.5,
    color: colors.primary,
  },
  summaryValueSmall: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    color: colors.primary,
  },
  summaryLabel: {
    fontFamily: 'SemiBold24',
    fontSize: 9,
    color: '#9A9DAE',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#EDEEF4',
  },

  /* LOADER / EMPTY */
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },
  loaderText: {
    fontFamily: 'SemiBold24',
    fontSize: 11.5,
    color: '#9A9DAE',
    marginTop: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 25,
  },
  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EDEEF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIcon: {
    width: 24,
    height: 24,
    tintColor: '#B4B7C9',
  },
  emptyTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    color: '#4A4D5E',
  },
  emptySubtitle: {
    fontFamily: 'SemiBold24',
    fontSize: 11,
    color: '#9A9DAE',
    marginTop: 4,
    textAlign: 'center',
  },

  /* DAY CARD */
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginTop: 10,
    padding: 11,
    elevation: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayBadge: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeNum: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    color: '#fff',
    lineHeight: 16,
  },
  dayBadgeMonth: {
    fontFamily: 'SemiBold24',
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.88)',
    textTransform: 'uppercase',
  },
  dayCardWeekday: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12.5,
    color: '#1B1D28',
  },
  dayCardDate: {
    fontFamily: 'SemiBold24',
    fontSize: 10,
    color: '#9A9DAE',
    marginTop: 1,
  },
  totalHoursPill: {
    backgroundColor: '#F7F8FB',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EAF2',
  },
  totalHoursPillLabel: {
    fontFamily: 'SemiBold24',
    fontSize: 8,
    color: '#9A9DAE',
    letterSpacing: 0.3,
  },
  totalHoursPillText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 11.5,
    color: colors.primary,
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F1F6',
    marginVertical: 10,
  },

  /* TABLE */
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F7F8FB',
    borderRadius: 8,
    paddingVertical: 7,
  },
  tableHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  tableHeaderText: {
    color: '#6B6E7F',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 9,
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
    fontSize: 12,
  },
  hoursText: {
    color: colors.primary,
    fontFamily: 'Montserrat-ExtraBold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F8FB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E8EAF2',
  },
  totalRowLabel: {
    fontFamily: 'SemiBold24',
    fontSize: 10.5,
    color: '#6B6E7F',
  },
  totalRowValue: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    color: colors.primary,
    paddingRight: 20
  },
});