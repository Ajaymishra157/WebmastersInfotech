import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import colors from '../colors/Colors';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS } from '../CommonFile/Constant';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

const CustomDrawer = () => {
  const navigation = useNavigation();

  const [memberId, setMemberId] = useState([]);
  const [Details, setDetails] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVisible2, setModalVisible2] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [updatingDob, setUpdatingDob] = useState(false);

  const formatDobDisplay = (dobStr) => {
    if (!dobStr) return '';
    const parts = dobStr.split('-').map(p => parseInt(p, 10));
    if (parts.length === 3 && parts.every(n => !isNaN(n))) {
      let year, month, day;
      if (parts[0] > 31) {
        // YYYY-MM-DD
        [year, month, day] = parts;
      } else {
        // DD-MM-YYYY
        [day, month, year] = parts;
      }
      return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    }
    return dobStr;
  };

  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      setMemberId(id);
      console.log('Attendance Page Member ID:', id);
    };

    getMemberId();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        const id = await AsyncStorage.getItem('member_id');
        setMemberId(id);
        console.log('Attendance Page Member ID:', id);

        if (id) {


          try {
            const response = await fetch(ENDPOINTS.ListProfile, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                member_id: id,
              }),
            });

            const result = await response.json();
            console.log('Details:', result);
            if (result.code == 200) {
              setDetails(result.payload);
            }
          } catch (error) {
            console.log('Error fetching profile:', error);
          }
        }
      };

      fetchData(); // Jab bhi screen focus me aaye
    }, []),
  );

  useEffect(() => {
    if (Details?.member_dob) {
      const parts = Details.member_dob.split('-').map(p => parseInt(p, 10));

      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        let year, month, day;

        if (parts[0] > 31) {
          // Format: YYYY-MM-DD
          [year, month, day] = parts;
        } else {
          // Format: DD-MM-YYYY
          [day, month, year] = parts;
        }

        const d = new Date(year, month - 1, day);

        // Sanity check - agar year galat/purana/future ho to aaj ki date use karo
        if (!isNaN(d.getTime()) && year > 1900 && year <= new Date().getFullYear()) {
          setTempDate(d);
        } else {
          setTempDate(new Date());
        }
      } else {
        setTempDate(new Date());
      }
    } else {
      setTempDate(new Date());
    }
  }, [Details]);

  const updateDob = async (newDate) => {
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    setUpdatingDob(true);
    try {
      const response = await fetch(ENDPOINTS.UpdateProfile, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          member_dob: formattedDate,
        }),
      });
      const result = await response.json();
      if (result.code === 200) {
        // Update local state
        setDetails(prev => ({ ...prev, member_dob: formattedDate }));
        Toast.show({
          type: 'success',
          text1: 'Date of Birth updated',
          position: 'bottom',
          bottomOffset: 80,
          visibilityTime: 2000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to update DOB',
          text2: result.message || 'Please try again',
          position: 'bottom',
          bottomOffset: 80,
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Network error',
        text2: 'Could not update DOB',
        position: 'bottom',
        bottomOffset: 80,
        visibilityTime: 2000,
      });
    } finally {
      setUpdatingDob(false);

    }
  };

  const onDateChange = (event, selectedDate) => {
    // Pehle modal/picker state band karo - taaki re-render pe dobara open na ho
    setShowDatePickerModal(false);

    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      updateDob(selectedDate); // API call background me chalega
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'isLoggedIn',
        'member_id',
        'member_name',
        'punched_in',
        'punch_in_time',
        'punch_out_time',
      ]);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleImagePress = () => {
    const imageSource =
      Details?.member_image &&
        typeof Details.member_image === 'string' &&
        Details.member_image.startsWith('http')
        ? { uri: Details.member_image }
        : require('../assets/profile-picture.png'); // default image

    setSelectedImage(imageSource);
    setModalVisible2(true);
  };

  const handleCloseModal = () => {
    setModalVisible2(false); // Close the modal
  };

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View
        style={{
          width: '100%',
          backgroundColor: colors.primary,
          paddingTop: 10,
          paddingBottom: 15,
          paddingHorizontal: 15,
        }}>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 35,
            height: 35,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.15)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
          }}>
          <Image
            source={require('../assets/right-back.png')}
            style={{
              width: 18,
              height: 18,
              tintColor: '#fff',
            }}
          />
        </TouchableOpacity>

        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 5,
          }}>

          <TouchableOpacity onPress={handleImagePress}>
            {Details?.member_image ? (
              <Image
                source={{ uri: Details.member_image }}
                style={{
                  width: 65,
                  height: 65,
                  borderRadius: 32.5,
                }}
              />
            ) : (
              <Image
                source={require('../assets/profile-picture.png')}
                style={{
                  width: 65,
                  height: 65,
                  borderRadius: 32.5,
                }}
              />
            )}
          </TouchableOpacity>

          <View
            style={{
              flex: 1,
              marginLeft: 12,
            }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#111827',
              }}>
              {Details.member_name || '---'}
            </Text>

            <Text
              numberOfLines={1}
              style={{
                color: '#6B7280',
                marginTop: 3,
                fontSize: 13,
              }}>
              {Details.member_position || '---'}
            </Text>

            <Text
              numberOfLines={1}
              style={{
                color: '#9CA3AF',
                marginTop: 2,
                fontSize: 12,
              }}>
              {Details.member_email || ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('AddProfile', {
                Details,
              })
            }
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 14,
              height: 34,
              borderRadius: 17,
              justifyContent: 'center',
            }}>
            <Text
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: '700',
              }}>
              Edit
            </Text>
          </TouchableOpacity>

        </View>
      </View>
      <ScrollView
        style={{
          flex: 1,
          width: '100%',
          marginTop: 15,
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 30,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {[
          { label: 'Full Name', value: Details.member_name, icon: 'account' },

          { label: 'Position', value: Details.member_position, icon: 'briefcase' },
          { label: 'Employee Code', value: Details.member_code, icon: 'barcode' },
          { label: 'Email Address', value: Details.member_email, icon: 'email-outline' },
          { label: 'Mobile Number', value: Details.member_mobile, icon: 'phone' },
          { label: 'Gender', value: Details.member_gender, icon: 'gender-male-female' },
          { label: 'City', value: Details.member_city, icon: 'city' },
          { label: 'Address', value: Details.member_address, icon: 'map-marker' },
        ].map((item, index) => (
          <View
            key={index}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 3,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Left accent border - using primary color */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: colors.primary, // #002841
                borderTopLeftRadius: 16,
                borderBottomLeftRadius: 16,
              }}
            />

            {/* Icon container - light version of primary */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#E8F0F5', // soft blue-grey (light variant of #002841)
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}
            >
              <Icon name={item.icon} size={22} color={colors.primary} />
            </View>

            {/* Text content */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: '#9CA3AF',
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#1F2937',
                  marginTop: 2,
                }}
              >
                {item.value || '---'}
              </Text>
            </View>
          </View>
        ))}

        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 3,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Left border */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: colors.primary,
              borderTopLeftRadius: 16,
              borderBottomLeftRadius: 16,
            }}
          />
          {/* Icon */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#E8F0F5',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
            }}
          >
            <Icon name="cake-variant" size={22} color={colors.primary} />
          </View>

          {/* Text */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#9CA3AF',
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              Date of Birth
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#1F2937',
                marginTop: 2,
              }}
            >
              {Details.member_dob ? formatDobDisplay(Details.member_dob) : 'Not Updated'}
            </Text>
          </View>

          {/* Edit Button */}
          {!Details.member_dob && (
            <TouchableOpacity
              onPress={() => setShowDatePickerModal(true)}
              disabled={updatingDob}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: colors.primary + '15',
              }}
            >
              {updatingDob ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon name="pencil" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Two buttons in one row - 50-50 */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 12,
            gap: 12, // gap between buttons
          }}
        >
          {/* Change Password Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Password')}
            style={{
              flex: 1, // takes 50% (with gap)
              height: 58,
              borderRadius: 16,
              backgroundColor: colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 5,
            }}
            activeOpacity={0.8}
          >
            <Icon name="lock-reset" size={22} color="#fff" />
            <Text
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: '700',
                marginLeft: 10,
                letterSpacing: 0.5,
              }}
            >
              Change Password
            </Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{
              flex: 1, // takes 50% (with gap)
              height: 58,
              borderRadius: 16,
              backgroundColor: '#EF4444', // red remains as is
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 5,
            }}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={22} color="#fff" />
            <Text
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: '700',
                marginLeft: 10,
                letterSpacing: 0.5,
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
          onPress={() => setModalVisible(false)}
          activeOpacity={1}
        >
          <View
            style={{
              width: '85%',
              maxWidth: 340,
              backgroundColor: '#fff',
              borderRadius: 24,
              paddingVertical: 28,
              paddingHorizontal: 24,
              alignItems: 'center',
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
            }}
            onStartShouldSetResponder={() => true}
          >


            {/* Title */}
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Montserrat-ExtraBold',
                color: '#1F2937',
                marginBottom: 8,
              }}
            >
              Logout
            </Text>

            {/* Message */}
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'SemiBold24',
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              Are you sure you want to logout?
            </Text>

            {/* Buttons */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
                gap: 12,
              }}
            >
              {/* No (Cancel) - Left */}
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: '#4B5563',
                    fontFamily: 'SemiBold24',
                    fontSize: 15,
                  }}
                >
                  No
                </Text>
              </TouchableOpacity>

              {/* Yes (Logout) - Right */}
              <TouchableOpacity
                onPress={async () => {
                  setModalVisible(false);
                  await handleLogout();
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary, // #002841
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontFamily: 'SemiBold24',
                    fontSize: 15,
                  }}
                >
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        transparent={true}
        visible={modalVisible2}
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

      {/* Date Picker */}
      {showDatePickerModal && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {showDatePickerModal && Platform.OS === 'ios' && (
        <Modal
          visible={showDatePickerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePickerModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDatePickerModal(false)}>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              <TouchableWithoutFeedback onPress={() => { }}>
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    width: '90%',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 16,
                      marginBottom: 10,
                      textAlign: 'center',
                    }}
                  >
                    Select Date of Birth
                  </Text>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    style={{ width: '100%', height: 200 }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowDatePickerModal(false)}
                    style={{
                      marginTop: 10,
                      backgroundColor: colors.primary,
                      padding: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: 'SemiBold24', fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};
export default CustomDrawer;
const styles = StyleSheet.create({});
