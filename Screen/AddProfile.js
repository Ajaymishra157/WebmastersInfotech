import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import colors from '../colors/Colors';
import { ENDPOINTS } from '../CommonFile/Constant';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddProfile = () => {
  const route = useRoute();
  const { Details } = route.params || {};
  const navigation = useNavigation();

  // ----- Existing states -----
  const [selectedImage, setSelectedImage] = useState(null);
  const [memberName, setMemberName] = useState(Details?.member_name || '');
  const [memberEmail, setMemberEmail] = useState(Details?.member_email || '');
  const [memberNumber, setMemberNumber] = useState(Details?.member_mobile || '');
  const [memberPosition, setMemberPosition] = useState(Details?.member_position || '');
  const [ProfileImage, setProfileImage] = useState(Details?.member_image || '');
  const [memberAddress, setMemberAddress] = useState(Details?.member_address || '');
  const [MemberId, setMemberId] = useState(Details?.member_id);
  const [memberCode, setMemberCode] = useState(Details?.member_code || '');
  const [loading, setLoading] = useState(false);
  // ----- New states -----
  const [gender, setGender] = useState(Details?.member_gender || '');
  const parseInitialDob = (dobStr) => {
    if (!dobStr) return '';
    const parts = dobStr.split('-').map(p => parseInt(p, 10));
    if (parts.length === 3 && parts.every(n => !isNaN(n))) {
      let year, month, day;
      if (parts[0] > 31) {
        // already YYYY-MM-DD
        [year, month, day] = parts;
      } else {
        // DD-MM-YYYY
        [day, month, year] = parts;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return dobStr;
  };

  const [dateOfBirth, setDateOfBirth] = useState(parseInitialDob(Details?.member_dob));

  // City states
  const [cityList, setCityList] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  // ----- Error states -----
  const [memberNameError, setMemberNameError] = useState('');
  const [memberEmailError, setMemberEmailError] = useState('');
  const [memberNumberError, setMemberNumberError] = useState('');
  const [memberPositionError, setMemberPositionError] = useState('');
  const [genderError, setGenderError] = useState('');
  const [cityError, setCityError] = useState('');
  const [memberAddressError, setMemberAddressError] = useState('');
  const [dobError, setDobError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(() => {
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
        if (!isNaN(d.getTime()) && year > 1900 && year <= new Date().getFullYear()) {
          return d;
        }
      }
    }
    return new Date();
  });

  const [showPositionModal, setShowPositionModal] = useState(false);
  const [positions, setPositions] = useState([]);
  const [positionSearchQuery, setPositionSearchQuery] = useState('');
  const [loadingPositions, setLoadingPositions] = useState(false);


  const formatDobDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };
  useEffect(() => {
    if (showPositionModal) {
      fetchPositions();
    }
  }, [showPositionModal]);

  const fetchPositions = async () => {
    try {
      setLoadingPositions(true);
      const response = await fetch(ENDPOINTS.ListPosition);
      const data = await response.json();
      if (data.status && data.payload) {
        setPositions(data.payload);
      }
    } catch (error) {
      console.log('Error fetching positions:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const filteredPositions = positions.filter(item =>
    item.position_name?.toLowerCase().includes(positionSearchQuery.toLowerCase())
  );
  // ----- Fetch city list on mount & pre‑select if editing -----
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch(ENDPOINTS.list_City);
        const result = await response.json();
        if (response.ok && result.code === 200) {
          setCityList(result.payload);
          // Edit mode: pre‑select city if member_city matches
          if (Details?.member_city) {
            const matched = result.payload.find(
              c => c.city_name?.toLowerCase() === Details.member_city?.toLowerCase()
            );
            if (matched) setSelectedCity(matched);
          }
        }
      } catch (error) {
        console.log('City fetch error:', error);
      }
    };
    fetchCities();
  }, []);

  const onDateChange = (event, selectedDate) => {
    // Pehle picker band karo - taaki re-render pe dobara open na ho
    setShowDatePicker(false);

    if (event.type === 'set' && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      setDateOfBirth(formattedDate);
      setTempDate(selectedDate);
      setDobError('');
    }
  };

  // ----- Validation -----
  const handleAddProfile = () => {
    let isValid = true;

    if (!memberName.trim()) {
      setMemberNameError('Member Name is required');
      isValid = false;
    } else {
      setMemberNameError('');
    }

    if (!memberEmail.trim()) {
      setMemberEmailError('Email is required');
      isValid = false;
    } else {
      setMemberEmailError('');
    }

    if (!memberNumber.trim()) {
      setMemberNumberError('Number is required');
      isValid = false;
    } else if (memberNumber.length !== 10) {
      setMemberNumberError('Enter a valid 10‑digit mobile number');
      isValid = false;
    } else {
      setMemberNumberError('');
    }

    if (!memberPosition.trim()) {
      setMemberPositionError('Position is required');
      isValid = false;
    } else {
      setMemberPositionError('');
    }

    if (!gender.trim()) {
      setGenderError('Gender is required');
      isValid = false;
    } else {
      setGenderError('');
    }

    if (!selectedCity) {
      setCityError('City is required');
      isValid = false;
    } else {
      setCityError('');
    }

    if (!memberAddress.trim()) {
      setMemberAddressError('Address is required');
      isValid = false;
    } else {
      setMemberAddressError('');
    }

    // Date of Birth is optional – no validation needed

    return isValid;
  };

  // ----- API call (Update) -----
  const addProfiles = async () => {
    setLoading(true);
    const url = ENDPOINTS.UpdateProfile;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: MemberId,
          member_name: memberName,
          member_email: memberEmail,
          member_mobile: memberNumber,
          member_position: memberPosition,
          member_gender: gender,
          member_city: selectedCity?.city_name || '',
          member_address: memberAddress,
          member_image: userImageToSend,
          member_code: memberCode,
          member_dob: dateOfBirth, // added DOB
        }),
      });
      const result = await response.json();
      console.log('Update result', result);
      if (result.code == 200) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setLoading(false); // ✅ Loading end
    }
  };

  const addinput = () => {
    if (handleAddProfile()) {
      addProfiles();
    }
  };

  // ----- Image picker -----
  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 1,
      includeBase64: true,
    };
    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else {
        const image = response.assets[0];
        const source = {
          uri: image.uri,
          data: image.base64,
          mime: image.type,
        };
        setSelectedImage(source);
      }
    });
  };

  const userImageToSend = selectedImage
    ? 'data:' + selectedImage.mime + ';base64,' + selectedImage.data
    : null;

  // ----- Helpers for inline border styling -----
  const inputBorder = (error) => ({
    borderColor: error ? '#FF3B30' : '#1b1b1b',
    borderWidth: error ? 1.5 : 1,
  });

  // ----- Render -----
  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          width: '100%',
          height: 50,
          backgroundColor: colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 10 }}>
          <Image
            source={require('../assets/back.png')}
            style={{ width: 20, height: 20, tintColor: '#fff' }}
          />
        </TouchableOpacity>
        <Text
          style={{
            marginLeft: '24%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
          }}>
          Update Profile
        </Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ backgroundColor: '#fff' }}
        keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={{ width: '95%' }}>
            {/* ---- Profile Image ---- */}
            <View style={{ marginTop: 10, alignItems: 'center' }}>
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Image
                  source={
                    selectedImage
                      ? { uri: selectedImage.uri }
                      : ProfileImage && typeof ProfileImage === 'string'
                        ? { uri: ProfileImage }
                        : require('../assets/image.png')
                  }
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              </View>
              <TouchableOpacity
                onPress={selectImage}
                style={{
                  height: 26,
                  width: 26,
                  backgroundColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 13,
                  position: 'absolute',
                  top: 80,
                  right: 120,
                  elevation: 5,
                }}>
                <Image
                  source={require('../assets/open-camera.png')}
                  style={{ width: 20, height: 20 }}
                />
              </TouchableOpacity>
            </View>

            {/* ---- Member Name ---- */}
            <View style={{ marginTop: 30 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Member Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold' }}>*</Text>
              </Text>
              <View
                style={[
                  {
                    width: '100%',
                    height: 50,
                    borderRadius: 10,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                  },
                  inputBorder(memberNameError),
                ]}>
                <TextInput
                  placeholder="Enter Member Name"
                  placeholderTextColor={'#999'}
                  style={{ color: '#000', fontFamily: 'SemiBold24', fontSize: 14 }}
                  value={memberName}
                  onChangeText={text => {
                    setMemberName(text);
                    if (text) setMemberNameError('');
                  }}
                />
              </View>
              {memberNameError && (
                <Text
                  style={{
                    color: '#FF3B30',
                    fontFamily: 'SemiBold24',
                    marginLeft: 4,
                    marginTop: 4,
                    fontSize: 12,
                  }}>
                  {memberNameError}
                </Text>
              )}
            </View>

            {/* ---- Member Email ---- */}
            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Member Email <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold' }}>*</Text>
              </Text>
              <View
                style={[
                  {
                    width: '100%',
                    height: 50,
                    borderRadius: 10,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                  },
                  inputBorder(memberEmailError),
                ]}>
                <TextInput
                  placeholder="Enter Email"
                  placeholderTextColor={'#999'}
                  style={{ color: '#000', fontFamily: 'SemiBold24', fontSize: 14 }}
                  value={memberEmail}
                  onChangeText={text => {
                    setMemberEmail(text);
                    if (text) setMemberEmailError('');
                  }}
                />
              </View>
              {memberEmailError && (
                <Text
                  style={{
                    color: '#FF3B30',
                    fontFamily: 'SemiBold24',
                    marginLeft: 4,
                    marginTop: 4,
                    fontSize: 12,
                  }}>
                  {memberEmailError}
                </Text>
              )}
            </View>

            {/* ---- Member Number ---- */}
            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Member Number <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold' }}>*</Text>
              </Text>
              <View
                style={[
                  {
                    width: '100%',
                    height: 50,
                    borderRadius: 10,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                  },
                  inputBorder(memberNumberError),
                ]}>
                <TextInput
                  placeholder="Enter Number"
                  placeholderTextColor={'#999'}
                  keyboardType="numeric"
                  maxLength={10}
                  style={{ color: '#000', fontFamily: 'SemiBold24', fontSize: 14 }}
                  value={memberNumber}
                  onChangeText={text => {
                    const digits = text.replace(/[^0-9]/g, '').slice(0, 10);
                    setMemberNumber(digits);
                    if (digits.length === 10) setMemberNumberError('');
                    else if (digits.length === 0) setMemberNumberError('Number is required');
                    else setMemberNumberError('');
                  }}
                />
              </View>
              {memberNumberError && (
                <Text
                  style={{
                    color: '#FF3B30',
                    fontFamily: 'SemiBold24',
                    marginLeft: 4,
                    marginTop: 4,
                    fontSize: 12,
                  }}>
                  {memberNumberError}
                </Text>
              )}
            </View>

            {/* ---- Member Position (Dropdown) ---- */}
            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Member Position <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold' }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  {
                    width: '100%',
                    height: 50,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                  },
                  inputBorder(memberPositionError),
                ]}
                onPress={() => setShowPositionModal(true)}>
                <Text
                  style={{
                    fontFamily: 'SemiBold24',
                    fontSize: 14,
                    color: memberPosition ? '#000' : '#999',
                  }}>
                  {memberPosition || 'Select Member Position'}
                </Text>
                <FontAwesome name="chevron-down" size={14} color="#888" />
              </TouchableOpacity>
              {memberPositionError && (
                <Text
                  style={{
                    color: '#FF3B30',
                    fontFamily: 'SemiBold24',
                    marginLeft: 4,
                    marginTop: 4,
                    fontSize: 12,
                  }}>
                  {memberPositionError}
                </Text>
              )}
            </View>
            {/* ---- Gender (Radio buttons) ---- */}
            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Member Gender <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold' }}>*</Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                {['Male', 'Female', 'Others'].map(option => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setGender(option);
                      setGenderError('');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginRight: 20,
                    }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: gender === option ? colors.primary : '#999',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 6,
                      }}>
                      {gender === option && (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>
                    <Text style={{ fontFamily: 'SemiBold24', color: '#000', fontSize: 14 }}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {genderError && (
                <Text
                  style={{
                    color: '#FF3B30',
                    fontFamily: 'SemiBold24',
                    marginLeft: 4,
                    marginTop: 4,
                    fontSize: 12,
                  }}>
                  {genderError}
                </Text>
              )}
            </View>

            {/* ---- Date of Birth ---- */}
            {/* ---- Date of Birth ---- */}
            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Date of Birth
              </Text>

              {dateOfBirth ? (
                // ✅ Read‑only display when DOB already exists
                <View
                  style={{
                    width: '100%',
                    height: 50,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: '#1b1b1b',
                    backgroundColor: '#f5f5f5',
                  }}>
                  <Text
                    style={{
                      fontFamily: 'SemiBold24',
                      fontSize: 14,
                      color: '#000',
                    }}>
                    {formatDobDisplay(dateOfBirth)}
                  </Text>
                  <FontAwesome name="calendar" size={20} color="#ccc" />
                </View>
              ) : (
                // ✅ Editable touchable when NO DOB is set
                <TouchableOpacity
                  style={{
                    width: '100%',
                    height: 50,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: dobError ? '#FF3B30' : '#1b1b1b',
                  }}
                  onPress={() => setShowDatePicker(true)}>
                  <Text
                    style={{
                      fontFamily: 'SemiBold24',
                      fontSize: 14,
                      color: '#999',
                    }}>
                    Select Date of Birth
                  </Text>
                  <FontAwesome name="calendar" size={20} color="#888" />
                </TouchableOpacity>
              )}

              {dobError && (
                <Text
                  style={{
                    color: '#FF3B30',
                    fontFamily: 'SemiBold24',
                    marginLeft: 4,
                    marginTop: 4,
                    fontSize: 12,
                  }}>
                  {dobError}
                </Text>
              )}
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            {/* ---- City (Modal with search) ---- */}
            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Member City <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold' }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  {
                    width: '100%',
                    height: 50,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                  },
                  inputBorder(cityError),
                ]}
                onPress={() => setIsCityModalVisible(true)}>
                <Text
                  style={{
                    fontFamily: 'SemiBold24',
                    fontSize: 14,
                    color: selectedCity ? '#000' : '#999',
                  }}>
                  {selectedCity?.city_name || 'Select City'}
                </Text>
                <FontAwesome name="chevron-down" size={14} color="#888" />
              </TouchableOpacity>
              {cityError && (
                <Text
                  style={{
                    color: '#FF3B30',
                    fontFamily: 'SemiBold24',
                    marginLeft: 4,
                    marginTop: 4,
                    fontSize: 12,
                  }}>
                  {cityError}
                </Text>
              )}
            </View>

            {/* ---- Address (Multiline) ---- */}
            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Member Address <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold' }}>*</Text>
              </Text>
              <View
                style={[
                  {
                    width: '100%',
                    height: 90,
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                  },
                  inputBorder(memberAddressError),
                ]}>
                <TextInput
                  placeholder="Enter Address"
                  placeholderTextColor={'#999'}
                  style={{ color: '#000', fontFamily: 'SemiBold24', fontSize: 14, height: 74 }}
                  value={memberAddress}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  onChangeText={text => {
                    setMemberAddress(text);
                    if (text) setMemberAddressError('');
                  }}
                />
              </View>
              {memberAddressError && (
                <Text
                  style={{
                    color: '#FF3B30',
                    fontFamily: 'SemiBold24',
                    marginLeft: 4,
                    marginTop: 4,
                    fontSize: 12,
                  }}>
                  {memberAddressError}
                </Text>
              )}
            </View>

            {/* ---- Member Code (Read‑only) ---- */}
            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  marginBottom: 5,
                }}>
                Member Code
              </Text>
              <View
                style={{
                  width: '100%',
                  height: 50,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#999',
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                }}>
                <TextInput
                  placeholder="Enter City"
                  placeholderTextColor={'#999'}
                  style={{ color: '#999', fontFamily: 'SemiBold24', fontSize: 14 }}
                  value={memberCode}
                  editable={false}
                />
              </View>
            </View>

            {/* ---- Save Button ---- */}
            <TouchableOpacity
              onPress={addinput}
              disabled={loading}
              style={{
                width: '100%',
                height: 50,
                backgroundColor: loading ? '#a1887f' : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 30,
                marginBottom: 20,
                borderRadius: 10,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{
                    color: '#fff',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 16,
                  }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ---------- CITY MODAL (Inline styles) ---------- */}
      <Modal
        visible={isCityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCityModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCityModalVisible(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View
                style={{
                  width: '85%',
                  maxHeight: '70%',
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 18,
                }}>
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 16,
                    color: '#000',
                    marginBottom: 14,
                    textAlign: 'center',
                  }}>
                  Select City
                </Text>

                {/* Search */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    height: 42,
                    marginBottom: 10,
                  }}>
                  <FontAwesome name="search" size={14} color="#999" />
                  <TextInput
                    placeholder="Search City"
                    placeholderTextColor="#999"
                    value={citySearchQuery}
                    onChangeText={setCitySearchQuery}
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      fontFamily: 'SemiBold24',
                      color: '#000',
                      fontSize: 14,
                    }}
                  />
                  {citySearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setCitySearchQuery('')}>
                      <FontAwesome name="times-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* City List */}
                <FlatList
                  data={cityList.filter(city =>
                    city.city_name?.toLowerCase().includes(citySearchQuery.toLowerCase())
                  )}
                  keyExtractor={item => item.city_id.toString()}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 260 }}
                  ListEmptyComponent={
                    <Text
                      style={{
                        textAlign: 'center',
                        color: '#999',
                        marginTop: 20,
                        fontFamily: 'SemiBold24',
                      }}>
                      No city found
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const isSelected = selectedCity?.city_id === item.city_id;
                    return (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 8,
                          borderBottomWidth: 1,
                          borderColor: '#f0f0f0',
                          backgroundColor: isSelected ? '#f5f8ff' : 'transparent',
                          borderRadius: isSelected ? 8 : 0,
                        }}
                        onPress={() => {
                          setSelectedCity(item);
                          setCityError('');
                          setIsCityModalVisible(false);
                          setCitySearchQuery('');
                        }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: isSelected ? 'Montserrat-ExtraBold' : 'SemiBold24',
                            color: isSelected ? colors.primary : '#000',
                          }}>
                          {item.city_name}
                        </Text>
                        {isSelected && (
                          <FontAwesome name="check-circle" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />

                <TouchableOpacity
                  onPress={() => {
                    setIsCityModalVisible(false);
                    setCitySearchQuery('');
                  }}
                  style={{
                    marginTop: 14,
                    alignSelf: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 20,
                  }}>
                  <Text style={{ color: 'red', fontFamily: 'SemiBold24', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ---------- STAFF POSITION MODAL ---------- */}
      <Modal
        visible={showPositionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPositionModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowPositionModal(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View
                style={{
                  width: '85%',
                  maxHeight: '70%',
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 18,
                }}>
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 16,
                    color: '#000',
                    marginBottom: 14,
                    textAlign: 'center',
                  }}>
                  Select Member Position
                </Text>

                {/* Search */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    height: 42,
                    marginBottom: 10,
                  }}>
                  <FontAwesome name="search" size={14} color="#999" />
                  <TextInput
                    placeholder="Search Position"
                    placeholderTextColor="#999"
                    value={positionSearchQuery}
                    onChangeText={setPositionSearchQuery}
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      fontFamily: 'SemiBold24',
                      color: '#000',
                      fontSize: 14,
                    }}
                  />
                  {positionSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setPositionSearchQuery('')}>
                      <FontAwesome name="times-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                {loadingPositions ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={filteredPositions}
                    keyExtractor={item => item.position_id.toString()}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 260 }}
                    ListEmptyComponent={
                      <Text
                        style={{
                          textAlign: 'center',
                          color: '#999',
                          marginTop: 20,
                          fontFamily: 'SemiBold24',
                        }}>
                        No positions found
                      </Text>
                    }
                    renderItem={({ item }) => {
                      const isSelected = memberPosition === item.position_name;
                      return (
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 12,
                            paddingHorizontal: 8,
                            borderBottomWidth: 1,
                            borderColor: '#f0f0f0',
                            backgroundColor: isSelected ? '#f5f8ff' : 'transparent',
                            borderRadius: isSelected ? 8 : 0,
                          }}
                          onPress={() => {
                            setMemberPosition(item.position_name);
                            setMemberPositionError('');
                            setShowPositionModal(false);
                            setPositionSearchQuery('');
                          }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: isSelected ? 'Montserrat-ExtraBold' : 'SemiBold24',
                              color: isSelected ? colors.primary : '#000',
                            }}>
                            {item.position_name}
                          </Text>
                          {isSelected && (
                            <FontAwesome name="check-circle" size={18} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}

                <TouchableOpacity
                  onPress={() => {
                    setShowPositionModal(false);
                    setPositionSearchQuery('');
                  }}
                  style={{
                    marginTop: 14,
                    alignSelf: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 20,
                  }}>
                  <Text style={{ color: 'red', fontFamily: 'SemiBold24', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default AddProfile;