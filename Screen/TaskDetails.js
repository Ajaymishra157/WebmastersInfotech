/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS } from '../CommonFile/Constant';

const TaskDetails = () => {
  const route = useRoute();
  const { task_id } = route.params || {};

  const navigation = useNavigation();

  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [DeleteModal, setDeleteModal] = useState(false);

  const [memberId, setMemberId] = useState('');
  const [memberPosition, setMemberPosition] = useState('');

  //   useFocusEffect(
  //     React.useCallback(() => {
  //       const onBackPress = () => {
  //         navigation.navigate('Task', {
  //           filterStatus: taskData?.task_status || 'Pending',
  //         });
  //         return true; // 👈 prevent default hardware back
  //       };

  //       BackHandler.addEventListener('hardwareBackPress', onBackPress);

  //       return () =>
  //         BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  //     }, [taskData]),
  //   );

  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      const position = await AsyncStorage.getItem('member_position');
      setMemberId(id);
      setMemberPosition(position || '');
    };

    getMemberId();
  }, []);

  const fetchTaskDetails = async () => {
    try {
      const url = ENDPOINTS.SingleTaskList;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_id }),
      });

      const result = await response.json();

      if (result?.status && result?.payload?.length > 0) {
        setTaskData(result.payload[0]);
      } else {
        setError('No task data found');
      }
    } catch (err) {
      setError('Failed to fetch task details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTaskDetails();
    }, []),
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  const formatOverTotalTime = timeString => {
    if (!timeString || typeof timeString !== 'string') return '--';

    const parts = timeString.split(':');

    if (parts.length < 2) return '--';

    const hrs = parts[0] || '00';
    const mins = parts[1] || '00';

    const hrNum = parseInt(hrs, 10);
    const minNum = parseInt(mins, 10);

    if (isNaN(hrNum) || isNaN(minNum)) return '--';

    if (hrNum === 0) return `${minNum}M`;
    return `${hrNum}H ${minNum}M`;
  };

  const DeleteTask = async () => {
    setDeleteModal(false);
    const url = ENDPOINTS.DeleteTask;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: task_id,
        }),
      });

      const result = await response.json();

      if (result.code == 200) {
        navigation.navigate('TaskScreen', { filterStatus: taskData.task_status });
      }
    } catch (error) { }
  };

  const deleteModal = () => {
    setDeleteModal(true);
  };

  const Update = () => {
    navigation.navigate('UpdateTask', { taskData: taskData });
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          width: '100%',
          height: 55,
          backgroundColor: colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          elevation: 3,
        }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/back.png')}
            style={{ width: 22, height: 22, tintColor: '#fff' }}
          />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
            marginLeft: 20,
          }}>
          Task Details
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, backgroundColor: '#f1f3f5' }} keyboardShouldPersistTaps='handled'>
        {[
          { label: 'Task Name', value: taskData.task_name },
          { label: 'Description', value: taskData.task_description },
          { label: 'Project', value: taskData.project_name },
          { label: 'Module', value: taskData.module_name },
          { label: 'Assigned To', value: taskData.member_name },
          {
            label: 'Hours Assigned',
            value: formatOverTotalTime(taskData.hours_assigned),
          },
          { label: 'Created On', value: taskData.timestamp },

          { label: 'Status', value: taskData.task_status }, // handled conditionally below
        ].map((item, index) => (
          <View
            key={index}
            style={{
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
            {
              item.label !== 'Status' ? (
                <>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.primary,
                      marginBottom: 4,
                      fontFamily: 'Montserrat-ExtraBold',
                    }}>
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#212529',
                      fontFamily: 'SemiBold24',
                    }}>
                    {item.value || 'N/A'}
                  </Text>
                </>
              ) : memberPosition?.trim().toLowerCase() === 'ceo' ? (
                <View style={{ flexDirection: 'row', width: '100%' }}>
                  <View style={{ width: '33%', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={Update}
                      // ⬅️ define this function
                      style={{
                        marginRight: 12,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: '#e7f1ff',
                        width: 40,
                      }}>
                      <Image
                        source={require('../assets/edit.png')}
                        style={{
                          width: 20,
                          height: 20,
                          tintColor: colors.primary,
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={{ alignItems: 'center', width: '33%' }}>
                    <TouchableOpacity
                      onPress={deleteModal}
                      // ⬅️ define this function
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: '#e7f1ff',
                      }}>
                      <Image
                        source={require('../assets/delete.png')}
                        style={{
                          width: 20,
                          height: 20,
                          tintColor: colors.primary,
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.primary,
                      marginBottom: 4,
                      fontFamily: 'Montserrat-ExtraBold',
                    }}>
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#212529',
                      fontFamily: 'SemiBold24',
                    }}>
                    {item.value || 'N/A'}
                  </Text>
                </>
              )
              // Custom buttons for Status
            }
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={DeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModal(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 5,
          }}
          onPress={() => setDeleteModal(false)}>
          <View
            style={{
              backgroundColor: '#fff',
              padding: 15,
              borderRadius: 10,
              width: 220,
              elevation: 5,
              height: 150,
            }}>
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: '#ffccdd',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 15,
                }}>
                <Image
                  source={require('../assets/exclamation-mark.png')}
                  style={{ width: 20, height: 20 }}
                />
              </View>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'SemiBold28',
                  fontSize: 15,
                  marginTop: 10,
                }}>
                Delete Confirmation
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 15 }}>
                <TouchableOpacity
                  onPress={DeleteTask}
                  style={{
                    width: '40%',
                    height: 35,
                    backgroundColor: 'red',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                  }}>
                  <Text style={{ color: '#fff', fontFamily: 'SemiBold28' }}>
                    Delete
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeleteModal(false)}
                  style={{
                    width: '40%',
                    height: 35,
                    backgroundColor: 'grey',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 15,
                    borderRadius: 10,
                  }}>
                  <Text style={{ color: '#fff', fontFamily: 'SemiBold28' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default TaskDetails;

const styles = StyleSheet.create({});
