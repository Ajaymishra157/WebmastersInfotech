/* eslint-disable prettier/prettier */
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import LoginLogout from '../Components/LoginLogout';
import { ENDPOINTS } from '../CommonFile/Constant';
import Toast from 'react-native-toast-message';

const AddLeave = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // ---- NEW: agar LeaveData param aaya hai to ye "Update" mode hai, warna "Add" mode ----
  const { LeaveData } = route.params || {};
  const isEditMode = !!LeaveData;

  const [isFromDatePickerVisible, setFromDatePickerVisibility] = useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] = useState(false);
  const [fromDate, setFromDate] = useState(normalizeToApiDate(LeaveData?.from_date) || '');
  const [tillDate, setTillDate] = useState(normalizeToApiDate(LeaveData?.to_date) || '');
  const [modalVisible, setModalVisible] = useState(false);
  const [leaveType, setLeaveType] = useState([]);
  const [selectedleave, setSelectedLeave] = useState(LeaveData?.leave_type || undefined);
  const [LeaveError, setLeaveError] = useState();
  const [FromDateError, setFromDateError] = useState();
  const [TillDateError, setTillDateError] = useState();
  const [DescriptionError, setDescriptionError] = useState();
  const [Description, setDescription] = useState(LeaveData?.reason || LeaveData?.reson || '');
  const [memberId, setMemberId] = useState([]);
  const [fromDateDisplay, setFromDateDisplay] = useState(
    LeaveData?.from_date ? formatDatetochangeInit(normalizeToApiDate(LeaveData.from_date)) : '',
  );
  const [tillDateDisplay, setTillDateDisplay] = useState(
    LeaveData?.to_date ? formatDatetochangeInit(normalizeToApiDate(LeaveData.to_date)) : '',
  );
  const [submitting, setSubmitting] = useState(false);

  // ---- NEW: edit mode ke liye leave_id preserve karna hai ----
  const [LeaveId] = useState(LeaveData?.leave_id);

  // ---- Hourly Leave ke liye start/end time states ----
  const [isStartTimePickerVisible, setStartTimePickerVisibility] = useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);
  const [startTime, setStartTime] = useState(LeaveData?.start_time || '');
  const [endTime, setEndTime] = useState(LeaveData?.end_time || '');
  const [startTimeDisplay, setStartTimeDisplay] = useState('');
  const [endTimeDisplay, setEndTimeDisplay] = useState('');
  const [StartTimeError, setStartTimeError] = useState();
  const [EndTimeError, setEndTimeError] = useState();

  const isTodayOnlyLeave = selectedleave?.toLowerCase().includes('today');
  // ---- hyphen/extra spaces normalize karke check karo, taaki format kaisa bhi ho match ho jaye ----
  const normalizedLeave = selectedleave?.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() || '';
  const isHourlyLeave = normalizedLeave.includes('hourly');
  const isPreLunchLeave = normalizedLeave.includes('pre lunch') || normalizedLeave.includes('prelunch');
  const isPostLunchLeave = normalizedLeave.includes('post lunch') || normalizedLeave.includes('postlunch');
  // In sabme sirf ek hi date chahiye (From/Till ek jaisi hi rahegi)
  const isSingleDayLeave = isTodayOnlyLeave || isHourlyLeave || isPreLunchLeave || isPostLunchLeave;

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

  // ---- time formatting helper ----
  const formatTime = date => {
    if (!(date instanceof Date)) {
      return { display: '', api: '' };
    }
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    return {
      display: `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`, // UI ke liye
      api: `${String(date.getHours()).padStart(2, '0')}:${minutes}`,   // API ke liye 24hr
    };
  };

  // ---- NEW: LeaveData se aane wali date DD-MM-YYYY format mein hoti hai,
  // isko internal YYYY-MM-DD (API) format mein convert karta hai ----
  function normalizeToApiDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return dateStr;

    // Agar pehla part 4-digit hai, to already YYYY-MM-DD hai
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1]}-${parts[2]}`;
    }
    // Warna DD-MM-YYYY hai, ispe se YYYY-MM-DD banao
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm}-${dd}`;
  }

  // ---- NEW: edit mode mein start/end time ki display value HH:mm se banao ----
  useEffect(() => {
    if (isEditMode && LeaveData?.start_time) {
      const [h, m] = LeaveData.start_time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0);
      setStartTimeDisplay(formatTime(d).display);
    }
    if (isEditMode && LeaveData?.end_time) {
      const [h, m] = LeaveData.end_time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0);
      setEndTimeDisplay(formatTime(d).display);
    }
  }, []);

  const handleFromDateConfirm = date => {
    const { display, api } = formatDate(date);
    setFromDateDisplay(display); // Show in UI
    setFromDate(api); // Send to API
    setFromDateError(''); // ✅ error hatao select karte hi

    // ---- single-day leave types ke liye Till Date bhi automatically same set kardo ----
    if (isSingleDayLeave) {
      setTillDateDisplay(display);
      setTillDate(api);
      setTillDateError('');
    }

    hideFromDatePicker();
  };

  // Till Date Handlers
  const showTillDatePicker = () => {
    setTillDatePickerVisibility(true);
  };

  const hideTillDatePicker = () => {
    setTillDatePickerVisibility(false);
  };

  const handleTillDateConfirm = date => {
    const { display, api } = formatDate(date);
    setTillDateDisplay(display);
    setTillDate(api);
    setTillDateError(''); // ✅ error hatao select karte hi
    hideTillDatePicker();
  };

  // ---- Start/End Time Handlers ----
  const showStartTimePicker = () => setStartTimePickerVisibility(true);
  const hideStartTimePicker = () => setStartTimePickerVisibility(false);
  const handleStartTimeConfirm = date => {
    const { display, api } = formatTime(date);
    setStartTimeDisplay(display);
    setStartTime(api);
    setStartTimeError('');
    hideStartTimePicker();
  };

  const showEndTimePicker = () => setEndTimePickerVisibility(true);
  const hideEndTimePicker = () => setEndTimePickerVisibility(false);
  const handleEndTimeConfirm = date => {
    const { display, api } = formatTime(date);
    setEndTimeDisplay(display);
    setEndTime(api);
    setEndTimeError('');
    hideEndTimePicker();
  };

  const ListOfLeaveType = async () => {
    const url = ENDPOINTS.ListLeaveType;

    try {
      const response = await fetch(url);
      const result = await response.json();
      if (result.code == 200) {
        setLeaveType(result.payload);
      }
    } catch (error) { }
  };

  useFocusEffect(
    useCallback(() => {
      ListOfLeaveType(); // Jab bhi screen focus me aaye, API chale
    }, []),
  );

  useEffect(() => {
    const getMemberId = async () => {
      try {
        const storedId = await AsyncStorage.getItem('member_id');
        if (storedId !== null) {
          setMemberId(storedId);
        }
      } catch (error) {
        console.error('Failed to fetch member ID from AsyncStorage:', error);
      }
    };

    getMemberId();
  }, []);

  // ---- Add Leave API call ----
  const addleave = async () => {
    setSubmitting(true);
    const url = ENDPOINTS.AddLeave;
    try {
      const payload = {
        member_id: memberId,
        leave_type: selectedleave,
        from_date: fromDate,
        to_date: tillDate,
        reason: Description,
      };

      if (isHourlyLeave) {
        payload.start_time = startTime;
        payload.end_time = endTime;
      } else if (isPreLunchLeave) {
        payload.start_time = '10:00';
        payload.end_time = '14:00';
      } else if (isPostLunchLeave) {
        payload.start_time = '15:00';
        payload.end_time = '19:00';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log("My Result", result);
      if (result.code == 200) {
        Toast.show({
          type: 'success',
          text1: 'Leave Applied',
          text2: 'Aapka leave request submit ho gaya hai',
          position: 'bottom',
          bottomOffset: 80,
          visibilityTime: 2000,
        });

        // CEO/HR ko notification bhejo (background me, user ko dikhna nahi)
        try {
          const leaveId = result?.payload?.leave_id;

          const notifyPayload = {
            member_id: memberId,
            reason: Description || '',
            leave_id: leaveId ? String(leaveId) : '',
            from_date: fromDate,
            to_date: tillDate,
            leave_type: selectedleave,
          };

          console.log('📤 Sending to notifyLeaveRequest:', notifyPayload);

          const notifyRes = await fetch(
            'https://us-central1-webmastersinfotech-ae0da.cloudfunctions.net/notifyLeaveRequest',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(notifyPayload),
            }
          );

          const notifyText = await notifyRes.text();

          let notifyResult;

          try {
            notifyResult = JSON.parse(notifyText);
          } catch (e) {
            notifyResult = {
              raw_response: notifyText,
            };
          }

          console.log('📥 Notify Result:', notifyResult);

          if (!notifyRes.ok) {
            console.log('❌ Notification API Error:', notifyRes.status, notifyResult);
          } else {
            console.log('✅ Leave notification sent successfully');
          }

        } catch (notifyErr) {
          console.log('❌ notify error:', notifyErr);
        }

        navigation.goBack();
      }
    }
    catch (error) { }
    finally {
      setSubmitting(false);
    }
  };

  // ---- NEW: Update Leave API call (UpdateLeave.js se liya gaya) ----
  const updateLeave = async () => {
    setSubmitting(true);
    const url = ENDPOINTS.UpdateLeave;
    try {
      const payload = {
        leave_id: LeaveId,
        member_id: memberId,
        leave_type: selectedleave,
        from_date: fromDate,
        to_date: tillDate,
        reason: Description,
      };
      console.log('Update Payload:', payload);

      if (isHourlyLeave) {
        payload.start_time = startTime;
        payload.end_time = endTime;
      } else if (isPreLunchLeave) {
        payload.start_time = '10:00';
        payload.end_time = '14:00';
      } else if (isPostLunchLeave) {
        payload.start_time = '15:00';
        payload.end_time = '19:00';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log('Update Result', result);
      if (result.code == 200) {
        Toast.show({
          type: 'success',
          text1: 'Leave Updated',
          text2: 'Aapka leave request update ho gaya hai',
          position: 'bottom',
          bottomOffset: 80,
          visibilityTime: 2000,
        });
        navigation.goBack();
      }
    } catch (error) {
      console.log('Update Leave Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const validation = () => {
    let isValid = true;

    if (!selectedleave) {
      setLeaveError('Leave Type is Required');
      isValid = false;
    } else {
      setLeaveError('');
    }
    if (!fromDate) {
      setFromDateError(isSingleDayLeave ? 'Date is Required' : 'From Date is Required');
      isValid = false;
    } else {
      setFromDateError('');
    }

    if (!isSingleDayLeave) {
      if (!tillDate) {
        setTillDateError('Till Date is Required');
        isValid = false;
      } else {
        setTillDateError('');
      }
    }

    if (isHourlyLeave) {
      if (!startTime) {
        setStartTimeError('Start Time is Required');
        isValid = false;
      } else {
        setStartTimeError('');
      }
      if (!endTime) {
        setEndTimeError('End Time is Required');
        isValid = false;
      } else {
        setEndTimeError('');
      }
    }

    if (!Description || !Description.trim()) {
      setDescriptionError('Reason is Required');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    return isValid;
  };

  // ---- NEW: mode ke hisaab se add ya update call karega ----
  const handleAdd = () => {
    if (validation()) {
      if (isEditMode) {
        updateLeave();
      } else {
        addleave();
      }
    }
  };

  const formatDatetochange = (dateStr) => {
    if (!dateStr) return 'dd/mm/yyyy';

    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');

    if (parts.length !== 3) return 'Invalid Date';

    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          width: '100%',
          height: 50,
          backgroundColor: colors.primary,
          flexDirection: 'row',
        }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 10, marginTop: 10 }}>
          <Image
            source={require('../assets/back.png')}
            style={{ width: 20, height: 20, tintColor: '#fff' }}
          />
        </TouchableOpacity>
        <Text
          style={{
            marginLeft: '25%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
            marginTop: 10,
          }}>
          {isEditMode ? 'Update Leave' : 'Add Leave'}
        </Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            style={{ width: '95%', marginTop: 20 }}>
            <View>
              <Text
                style={{
                  marginBottom: 5,
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                }}>
                Select Leave Type <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={{
                  width: '100%',
                  height: 50,
                  borderWidth: 1,
                  borderColor: LeaveError ? 'red' : '#ccc',
                  borderRadius: 10,
                  justifyContent: 'center',
                }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text
                    style={{
                      color: selectedleave ? '#000' : '#888',
                      fontFamily: 'SemiBold24',
                      marginLeft: 10,
                      width: '88%',
                    }}>
                    {selectedleave || 'Select Leave Type'}
                  </Text>
                  <Image
                    source={require('../assets/Down.png')}
                    style={{ width: 20, height: 20, tintColor: '#000' }}
                  />
                </View>
              </TouchableOpacity>
            </View>
            {LeaveError ? (
              <Text
                style={{
                  color: 'red',
                  fontFamily: 'SemiBold24',
                  marginLeft: 10,
                  marginTop: 3,
                  fontSize: 12,
                }}>
                {LeaveError}
              </Text>
            ) : null}

            {isSingleDayLeave ? (
              <View style={{ marginTop: 20, width: '100%' }}>
                <Text
                  style={{
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                    marginBottom: 5,
                  }}>
                  Date <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={showFromDatePicker}
                  style={{
                    width: '100%',
                    height: 50,
                    borderWidth: 1,
                    borderColor: FromDateError ? 'red' : '#ccc',
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                  }}>
                  <Text
                    style={{
                      width: '90%',
                      fontFamily: 'SemiBold24',
                      color: fromDate ? '#000' : '#888',
                    }}>
                    {formatDatetochange(fromDate) || 'dd/mm/yyyy'}
                  </Text>
                  <Image
                    source={require('../assets/calendar.png')}
                    style={{ width: 20, height: 20, tintColor: '#000' }}
                  />
                </TouchableOpacity>
                {FromDateError ? (
                  <Text
                    style={{
                      color: 'red',
                      fontFamily: 'SemiBold24',
                      marginLeft: 10,
                      marginTop: 3,
                      fontSize: 12,
                    }}>
                    {FromDateError}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={{ marginTop: 20, flexDirection: 'row', width: '100%' }}>
                <View style={{ width: '45%' }}>
                  <Text
                    style={{
                      color: '#000',
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 12,
                      marginBottom: 5,
                    }}>
                    From Date <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={showFromDatePicker}
                    style={{
                      width: '100%',
                      height: 50,
                      borderWidth: 1,
                      borderColor: FromDateError ? 'red' : '#ccc',
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                    }}>
                    <Text
                      style={{
                        width: '75%',
                        fontFamily: 'SemiBold24',
                        color: fromDate ? '#000' : '#888',
                      }}>
                      {formatDatetochange(fromDate) || 'dd/mm/yyyy'}
                    </Text>
                    <Image
                      source={require('../assets/calendar.png')}
                      style={{ width: 20, height: 20, tintColor: '#000' }}
                    />
                  </TouchableOpacity>
                  {FromDateError ? (
                    <Text
                      style={{
                        color: 'red',
                        fontFamily: 'SemiBold24',
                        marginLeft: 10,
                        marginTop: 3,
                        fontSize: 12,
                      }}>
                      {FromDateError}
                    </Text>
                  ) : null}
                </View>

                <View style={{ width: '45%', marginLeft: '10%' }}>
                  <Text
                    style={{
                      color: '#000',
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 12,
                      marginBottom: 5,
                    }}>
                    Till Date <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={showTillDatePicker}
                    style={{
                      width: '100%',
                      height: 50,
                      borderWidth: 1,
                      borderColor: TillDateError ? 'red' : '#ccc',
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                    }}>
                    <Text
                      style={{
                        width: '75%',
                        fontFamily: 'SemiBold24',
                        color: tillDate ? '#000' : '#888',
                      }}>
                      {formatDatetochange(tillDate) || 'dd/mm/yyyy'}
                    </Text>
                    <Image
                      source={require('../assets/calendar.png')}
                      style={{ width: 20, height: 20, tintColor: '#000' }}
                    />
                  </TouchableOpacity>
                  {TillDateError ? (
                    <Text
                      style={{
                        color: 'red',
                        fontFamily: 'SemiBold24',
                        marginLeft: 10,
                        marginTop: 3,
                        fontSize: 12,
                      }}>
                      {TillDateError}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            <DateTimePicker
              isVisible={isFromDatePickerVisible}
              mode="date"
              onConfirm={handleFromDateConfirm}
              onCancel={hideFromDatePicker}
              minimumDate={isTodayOnlyLeave ? new Date() : new Date()}
              maximumDate={isTodayOnlyLeave ? new Date() : undefined}
            />

            <DateTimePicker
              isVisible={isTillDatePickerVisible}
              mode="date"
              onConfirm={handleTillDateConfirm}
              onCancel={hideTillDatePicker}
              minimumDate={isTodayOnlyLeave ? new Date() : (fromDate ? new Date(fromDate) : new Date())}
              maximumDate={isTodayOnlyLeave ? new Date() : undefined}
            />

            {isHourlyLeave && (
              <View style={{ marginTop: 20, flexDirection: 'row', width: '100%' }}>
                <View style={{ width: '45%' }}>
                  <Text
                    style={{
                      color: '#000',
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 12,
                      marginBottom: 5,
                    }}>
                    Start Time <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={showStartTimePicker}
                    style={{
                      width: '100%',
                      height: 50,
                      borderWidth: 1,
                      borderColor: StartTimeError ? 'red' : '#ccc',
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                    }}>
                    <Text
                      style={{
                        width: '75%',
                        fontFamily: 'SemiBold24',
                        color: startTime ? '#000' : '#888',
                      }}>
                      {startTimeDisplay || 'hh:mm'}
                    </Text>
                    <Image
                      source={require('../assets/calendar.png')}
                      style={{ width: 18, height: 18, tintColor: '#000' }}
                    />
                  </TouchableOpacity>
                  {StartTimeError ? (
                    <Text
                      style={{
                        color: 'red',
                        fontFamily: 'SemiBold24',
                        marginLeft: 10,
                        marginTop: 3,
                        fontSize: 12,
                      }}>
                      {StartTimeError}
                    </Text>
                  ) : null}
                </View>

                <View style={{ width: '45%', marginLeft: '10%' }}>
                  <Text
                    style={{
                      color: '#000',
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 12,
                      marginBottom: 5,
                    }}>
                    End Time <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={showEndTimePicker}
                    style={{
                      width: '100%',
                      height: 50,
                      borderWidth: 1,
                      borderColor: EndTimeError ? 'red' : '#ccc',
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                    }}>
                    <Text
                      style={{
                        width: '75%',
                        fontFamily: 'SemiBold24',
                        color: endTime ? '#000' : '#888',
                      }}>
                      {endTimeDisplay || 'hh:mm'}
                    </Text>
                    <Image
                      source={require('../assets/calendar.png')}
                      style={{ width: 18, height: 18, tintColor: '#000' }}
                    />
                  </TouchableOpacity>
                  {EndTimeError ? (
                    <Text
                      style={{
                        color: 'red',
                        fontFamily: 'SemiBold24',
                        marginLeft: 10,
                        marginTop: 3,
                        fontSize: 12,
                      }}>
                      {EndTimeError}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            <DateTimePicker
              isVisible={isStartTimePickerVisible}
              mode="time"
              onConfirm={handleStartTimeConfirm}
              onCancel={hideStartTimePicker}
            />
            <DateTimePicker
              isVisible={isEndTimePickerVisible}
              mode="time"
              onConfirm={handleEndTimeConfirm}
              onCancel={hideEndTimePicker}
            />

            <View style={{ width: '100%' }}>
              <View>
                <Text
                  style={{
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                    marginTop: 15,
                  }}>
                  Reason <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <View
                  style={{
                    width: '100%',
                    borderWidth: 1,
                    borderColor: DescriptionError ? 'red' : '#ccc',
                    minHeight: 90,
                    maxHeight: 160,
                    borderRadius: 10,
                    marginTop: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}>
                  <TextInput
                    placeholder="Enter Reason"
                    style={{
                      color: '#000',
                      fontFamily: 'SemiBold24',
                      textAlignVertical: 'top',
                      minHeight: 74,
                    }}
                    placeholderTextColor={'#888'}
                    value={Description}
                    onChangeText={text => {
                      setDescription(text);
                      if (text && text.trim()) {
                        setDescriptionError('');
                      }
                    }}
                    multiline={true}
                    numberOfLines={4}
                    maxLength={250}
                  />
                </View>
                <Text
                  style={{
                    alignSelf: 'flex-end',
                    color: '#888',
                    fontSize: 11,
                    marginTop: 2,
                  }}>
                  {(Description?.length || 0)}/250
                </Text>
              </View>
              {DescriptionError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    marginTop: -12,
                    fontSize: 12,
                  }}>
                  {DescriptionError}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={handleAdd}
              disabled={submitting}
              style={{
                width: '100%',
                height: 50,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
                borderRadius: 10,
                opacity: submitting ? 0.7 : 1,
              }}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Montserrat-ExtraBold',
                    color: '#fff',
                  }}>
                  {isEditMode ? 'Update Leave' : 'Add Leave'}
                </Text>
              )}
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </ScrollView>
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          onPress={() => setModalVisible(false)}
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: '95%',
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
              maxHeight: '70%',
            }}
            onStartShouldSetResponder={() => true}>
            <Text
              style={{
                fontSize: 18,
                marginBottom: 10,
                fontFamily: 'SemiBold28',
                color: '#000',
              }}>
              Select Leave Type
            </Text>

            <FlatList
              data={leaveType}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedleave === item.leave_type;
                return (
                  <TouchableOpacity
                    style={{
                      padding: 10,
                      borderBottomWidth: 1,
                      borderColor: '#ccc',
                      backgroundColor: isSelected ? '#f0f0ff' : '#fff',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setSelectedLeave(item.leave_type);
                      setLeaveError('');
                      setModalVisible(false);

                      // leave type switch hote hi purani date/time selections reset kardo
                      setFromDate('');
                      setFromDateDisplay('');
                      setTillDate('');
                      setTillDateDisplay('');
                      setFromDateError('');
                      setTillDateError('');
                      setStartTime('');
                      setStartTimeDisplay('');
                      setEndTime('');
                      setEndTimeDisplay('');
                      setStartTimeError('');
                      setEndTimeError('');

                      if (item.leave_type?.toLowerCase().includes('today')) {
                        const today = new Date();
                        const { display, api } = formatDate(today);
                        setFromDateDisplay(display);
                        setFromDate(api);
                        setTillDateDisplay(display);
                        setTillDate(api);
                        setFromDateError('');
                        setTillDateError('');
                      }
                    }}>
                    <Text style={{ color: '#000', fontFamily: 'SemiBold24' }}>
                      {item.leave_type}
                    </Text>
                    {isSelected ? (
                      <Text style={{ color: colors.primary, fontFamily: 'SemiBold24' }}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              keyboardShouldPersistTaps='handled'
            />

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ textAlign: 'right', color: 'blue', marginTop: 10 }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ---- NEW: helper — component ke bahar, initial state set karne ke liye use hota hai ----
function formatDatetochangeInit(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
  if (parts.length !== 3) return '';
  const [yyyy, mm, dd] = parts;
  return `${dd}/${mm}/${yyyy}`;
}

export default AddLeave;

const styles = StyleSheet.create({});