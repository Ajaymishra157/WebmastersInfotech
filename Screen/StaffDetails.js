/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prettier/prettier */
import React, { useCallback, useEffect, useState, } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import { Linking } from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import * as Animatable from 'react-native-animatable';
import { ENDPOINTS } from '../CommonFile/Constant';

const StaffDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { member_id } = route.params;
  const [StaffDetails, setStaffDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [Staff, setStaff] = useState([]);
  const [status, setStatus] = useState(StaffDetails?.status || 'Deactive');
  const [dotmodalVisible, setDotModalVisible] = useState(false);
  const [DeleteConfirmation, setDeleteConfirmation] = useState(false);
  const [StaffName, setStaffName] = useState();

  const ListofStaff = async () => {
    setLoading(true);
    const url = ENDPOINTS.ListProfile;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: member_id,
        }),
      });
      const result = await response.json();

      if (result.code == 200) {
        setStaffDetails(result.payload);
        setStatus(result.payload.status);
        setStaffName(result.payload.member_name);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      ListofStaff();
    }, []),
  );

  const openModal = memberId => {
    setSelectedMemberId(memberId);
    setModalVisible(true);
  };
  const updateStatus = async status => {
    try {
      const response = await fetch(ENDPOINTS.ChangeMemberStatus, {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: member_id,
          status: status,
        }),
      },
      );

      const result = await response.json();
      console.log('Update Status Response:', result);

      if (result.code === 200 && result.status) {
        await ListStaff(); // Optional: refresh data
        setModalVisible(false); // Optional: close modal
        return true; // ✅ important: return success
      } else {
        console.warn('Unexpected response format:', result);
        return false;
      }
    } catch (error) {
      console.error('Status update failed:', error);
      return false;
    }
  };

  const ListStaff = async () => {
    const url = ENDPOINTS.ListMember;

    try {
      const response = await fetch(url);
      const result = await response.json();
      if (result.code == 200) {
        setStaff(result.payload);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      ListStaff();
    }, []),
  );

  const Update = () => {
    setDotModalVisible(false);
    navigation.navigate('AddStaff', { Staff: StaffDetails });
  };

  const DeleteStaff = async () => {
    const url = ENDPOINTS.DeleteMember;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        member_id: member_id,
      }),
    });

    const result = await response.json();
    if (result.code == 200) {
      navigation.goBack();
    }
  };
  const DeleteConfirm = () => {
    setDotModalVisible(false);
    setDeleteConfirmation(true);
  };

  const Delete = () => {
    setDeleteConfirmation(false);
    DeleteStaff();
  };

  const StatusToggle = ({ status, onToggle }) => {
    const isActive = status === 'Active';
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animatable.View
          animation="pulse"
          duration={400}
          iterationCount={1}
          style={{
            borderRadius: 20,
            backgroundColor: isActive ? '#2e7d32' : '#e53935',
            width: 50,
            height: 28,
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}>
          <TouchableOpacity
            onPress={onToggle}
            activeOpacity={0.8}
            style={{ flex: 1, justifyContent: 'center' }}>
            <View
              animation={isActive ? 'bounceInRight' : 'bounceInLeft'}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: 'white',
                alignSelf: isActive ? 'flex-end' : 'flex-start',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 3,
              }}
            />
          </TouchableOpacity>
        </Animatable.View>
      </View>
    );
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
            marginLeft: '28%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
            marginTop: 5,
          }}>
          Staff Details
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 30 }}
        />
      ) : StaffDetails ? (
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps='handled'>
          {/* Name */}
          <View
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
            {/* '#888' */}
            <Text
              style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
              Name
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
              {StaffDetails.member_name || 'N/A'}
            </Text>
          </View>

          {/* Position and Staff Code */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
            {[
              { label: 'Position', value: StaffDetails.member_position },
              { label: 'Staff Code', value: StaffDetails.member_code },
            ].map((item, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: '#fff',
                  padding: 16,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                  width: '48%',
                }}>
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
                    color: '#111',
                    fontFamily: 'SemiBold24',
                  }}>
                  {item.value || 'N/A'}
                </Text>
              </View>
            ))}
          </View>

          {/* Gender and City in one row */}

          {/* Email */}
          <View
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
            <Text
              style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
              Email
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
              {StaffDetails.member_email || 'N/A'}
            </Text>
          </View>

          {/* Mobile with Call & WhatsApp buttons */}
          <View
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
            <Text
              style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
              Mobile
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text
                style={{
                  fontSize: 14,
                  color: '#111',
                  fontFamily: 'SemiBold24',
                }}>
                {StaffDetails.member_mobile || 'N/A'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(`tel:${StaffDetails.member_mobile}`)
                  }>
                  <Image
                    source={require('../assets/call.png')}
                    style={{
                      width: 24,
                      height: 24,
                      marginHorizontal: 5,
                      tintColor: 'skyblue',
                    }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      `whatsapp://send?phone=+91${StaffDetails.member_mobile}`,
                    )
                  }>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={{
                      width: 24,
                      height: 24,
                      marginHorizontal: 5,
                    }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
            {[
              { label: 'Gender', value: StaffDetails.member_gender },
              { label: 'City', value: StaffDetails.member_city },
            ].map((item, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: '#fff',
                  padding: 16,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                  width: '48%',
                }}>
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
                    color: '#111',
                    fontFamily: 'SemiBold24',
                  }}>
                  {item.value || 'N/A'}
                </Text>
              </View>
            ))}
          </View>

          {/* Address */}
          <View
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
            <Text
              style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
              Address
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
              {StaffDetails.member_address || 'N/A'}
            </Text>
          </View>

          {/* Status Toggle & Buttons */}
          <View
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
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <TouchableOpacity
              onPress={Update}
              style={{ width: '20%', alignItems: 'center' }}>
              <Image
                source={require('../assets/edit.png')}
                style={{ width: 20, height: 20, tintColor: '#002841' }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={DeleteConfirm}
              style={{ width: '30%', alignItems: 'center' }}>
              <Image
                source={require('../assets/delete.png')}
                style={{ width: 20, height: 20, tintColor: colors.primary }}
              />
            </TouchableOpacity>
            <StatusToggle
              status={status}
              onToggle={async () => {
                const newStatus = status === 'Active' ? 'Deactive' : 'Active';
                const success = await updateStatus(newStatus);
                if (success) setStatus(newStatus);
              }}
            />
          </View>
        </ScrollView>
      ) : (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>
          No staff data available.
        </Text>
      )}
      <Modal
        visible={dotmodalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDotModalVisible(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPressOut={() => setDotModalVisible(false)}>
          <View style={{ marginBottom: 26, marginLeft: '35%' }}>
            <TouchableOpacity
              style={{
                width: 26,
                height: 26,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 13,
              }}
              onPress={() => setDotModalVisible(false)}>
              <Image
                source={require('../assets/close.png')}
                style={{ width: 12, height: 12 }}
              />
            </TouchableOpacity>
          </View>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 20,
              width: 150,
              height: 130,
              elevation: 5,
            }}>
            {/* Update Option */}
            <TouchableOpacity style={{ flexDirection: 'row' }} onPress={Update}>
              <Image
                source={require('../assets/transfer.png')}
                style={{ width: 20, height: 20, marginTop: 10 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  paddingVertical: 10,
                  marginLeft: 5,
                  color: '#000',
                  fontFamily: 'SemiBold24',
                }}>
                Update
              </Text>
            </TouchableOpacity>

            <View
              style={{ height: 1, backgroundColor: '#000', marginVertical: 5 }}
            />

            {/* Delete Option */}
            <TouchableOpacity
              style={{ flexDirection: 'row' }}
              onPress={DeleteConfirm}>
              <Image
                source={require('../assets/delete.png')}
                style={{ width: 20, height: 20, marginTop: 10 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  paddingVertical: 10,
                  marginLeft: 5,
                  color: '#000',
                  fontFamily: 'SemiBold24',
                }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={DeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmation(false)}>
        <TouchableWithoutFeedback onPress={() => setDeleteConfirmation(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View
                style={{
                  width: '82%',
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 20,
                }}>

                <Text
                  style={{
                    fontSize: 18,
                    color: '#111',
                    fontFamily: 'Montserrat-ExtraBold',
                    textAlign: 'center',
                  }}>
                  Delete Staff
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: '#666',
                    fontFamily: 'SemiBold24',
                    textAlign: 'center',
                    marginTop: 12,
                    lineHeight: 20,
                  }}>
                  Are you sure you want to delete{' '}
                  <Text style={{ fontFamily: 'Montserrat-ExtraBold', color: '#111' }}>
                    {StaffName}
                  </Text>
                  ?
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    marginTop: 24,
                  }}>
                  <TouchableOpacity
                    onPress={() => setDeleteConfirmation(false)}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 8,
                    }}>
                    <Text
                      style={{
                        color: '#555',
                        fontSize: 14,
                        fontFamily: 'Montserrat-ExtraBold',
                      }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={Delete}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 8,
                      backgroundColor: '#E53935',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginLeft: 8,
                    }}>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 14,
                        fontFamily: 'Montserrat-ExtraBold',
                      }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};
export default StaffDetails;
const styles = StyleSheet.create({});
