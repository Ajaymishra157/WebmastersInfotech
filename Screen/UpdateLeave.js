/* eslint-disable prettier/prettier */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
/* eslint-disable react/self-closing-comp */
/* eslint-disable prettier/prettier */
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
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
import DateTimePicker from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS } from '../CommonFile/Constant';

const UpdateLeave = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { LeaveData } = route.params || {};
  console.log('Leave Data', LeaveData)
  const [isFromDatePickerVisible, setFromDatePickerVisibility] =
    useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] =
    useState(false);
  const [fromDate, setFromDate] = useState(LeaveData.from_date || '');
  const [tillDate, setTillDate] = useState(LeaveData.to_date || '');
  const [FromDateError, setFromDateError] = useState();
  const [TillDateError, setTillDateError] = useState();
  const [fromDateDisplay, setFromDateDisplay] = useState(

  );
  const [tillDateDisplay, setTillDateDisplay] = useState(

  );
  const [selectedleave, setSelectedLeave] = useState(
    LeaveData.leave_type || '',
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [leaveType, setLeaveType] = useState([]);
  const [Reason, setReason] = useState(LeaveData.reson || '');

  const [LeaveId, setLeaveId] = useState(LeaveData.leave_id);

  const [memberId, setMemberId] = useState([]);

  console.log(LeaveId, memberId, selectedleave, fromDate, tillDate, Reason);

  const Updates = async () => {
    const url = ENDPOINTS.UpdateLeave;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leave_id: LeaveId,
          member_id: memberId,
          leave_type: selectedleave,
          from_date: fromDate,
          to_date: tillDate,
          reason: Reason
        }),
      });
      const result = await response.json();
      console.log("Result", result);
      if (result.code == 200) {
        navigation.goBack()
      }
    } catch (error) {

    }
  }

  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      setMemberId(id);
      console.log('Attendance Page Member ID:', id);
    };

    getMemberId();
  }, []);

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
    const { display, api } = formatDate(date);
    setFromDateDisplay(display); // Show in UI
    setFromDate(api); // Send to API
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
    hideTillDatePicker();
  };

  const ListOfLeaveType = async () => {
    const url = ENDPOINTS.ListLeaveType;

    try {
      const response = await fetch(url);
      const result = await response.json();
      // console.log("Leave Type", result);
      if (result.code == 200) {
        setLeaveType(result.payload);
      }
    } catch (error) { }
  };

  useFocusEffect(
    useCallback(() => {
      ListOfLeaveType();
    }, []),
  );

  return (
    <View>
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
            marginLeft: '23%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
            marginTop: 5,
          }}>
          Update Leave
        </Text>
      </View>
      <ScrollView keyboardShouldPersistTaps='handled'>
        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={{ width: '95%' }}>
            <View style={{ marginTop: 20, marginBottom: 10 }}>
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
                  borderRadius: 10,
                  justifyContent: 'center',
                }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text
                    style={{
                      color: '#000',
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
            <View style={{ width: '100%', flexDirection: 'row', marginTop: 5 }}>
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
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                  }}>
                  <Text
                    style={{
                      width: '75%',
                      fontFamily: 'SemiBold24',
                      color: '#000',
                    }}>
                    {fromDate || 'dd/mm/yyyy'}
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
                      fontSize: 12,
                    }}>
                    {FromDateError}
                  </Text>
                ) : null}
              </View>

              {/* Till Date */}
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
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                  }}>
                  <Text
                    style={{
                      width: '75%',
                      fontFamily: 'SemiBold24',
                      color: '#000',
                    }}>
                    {tillDate || 'dd/mm/yyyy'}
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
                      fontSize: 12,
                    }}>
                    {TillDateError}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Date Picker Modal */}
            <DateTimePicker
              isVisible={isFromDatePickerVisible}
              mode="date"
              onConfirm={handleFromDateConfirm}
              onCancel={hideFromDatePicker}
            />

            {/* Till Date Picker */}
            <DateTimePicker
              isVisible={isTillDatePickerVisible}
              mode="date"
              onConfirm={handleTillDateConfirm}
              onCancel={hideTillDatePicker}
            />

            <View>
              <Text
                style={{
                  marginTop: 15,
                  marginBottom: 10,
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                }}>
                Reason <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
              </Text>
              <View
                style={{
                  width: '100%',
                  minHeight: 50,
                  maxHeight: 150, // height thoda zyada rakho multiline ke liye
                  borderWidth: 1,
                  borderRadius: 10,
                }}>
                <TextInput
                  value={Reason}
                  placeholder="Enter Reason"
                  placeholderTextColor={'#000'}
                  multiline={true} // ✅ Multiline enabled
                  textAlignVertical="top" // ✅ Text top se start hoga
                  style={{
                    fontFamily: 'SemiBold24',
                    color: '#000',
                    padding: 10, // thoda padding bhi de do better UX ke liye
                  }}
                  onChangeText={text => {
                    setReason(text);
                  }}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={Updates}
              style={{
                width: '100%',
                height: 50,
                marginTop: 20,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
              }}>
              <Text
                style={{
                  color: '#fff',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 16,
                }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={modalVisible}
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
              width: '95%',
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
            }}>
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    padding: 10,
                    borderBottomWidth: 1,
                    borderColor: '#ccc',
                  }}
                  onPress={() => {
                    setSelectedLeave(item.leave_type);
                    setModalVisible(false);
                  }}>
                  <Text style={{ color: '#000', fontFamily: 'SemiBold24' }}>
                    {item.leave_type}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ textAlign: 'right', color: 'blue', marginTop: 10 }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default UpdateLeave;

const styles = StyleSheet.create({});
