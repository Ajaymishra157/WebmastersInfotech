/* eslint-disable prettier/prettier */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import * as Animatable from 'react-native-animatable';
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import { ENDPOINTS } from '../CommonFile/Constant';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const UpdateStaff = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { Staff } = route.params;

  const [Project, setProject] = useState(Staff.member_name || '');
  const [ProjectError, setProjectError] = useState('');
  const [Client, setClient] = useState(Staff.member_position || '');
  const [ClientError, setClientError] = useState('');
  const [Description, setDescription] = useState(Staff.member_email || '');
  const [DescriptionError, setDescriptionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [Numbers, setNumbers] = useState(Staff.member_mobile || '');
  const [NumbersError, setNumbersError] = useState('');
  const [Address, setAdress] = useState(Staff.member_address || '');
  const [AddressError, setAdressError] = useState('');
  const [Area, setArea] = useState(Staff.member_code || '');
  const [AreaError, setAreaError] = useState('');
  const [memberId] = useState(Staff.member_id);
  const [gender, setGender] = useState(Staff.member_gender || '');
  const [genderError, setGenderError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [positions, setPositions] = useState([]);
  const [positionSearchQuery, setPositionSearchQuery] = useState('');

  const [cityList, setCityList] = useState([]);
  const [selectedStaffCity, setSelectedStaffCity] = useState(null);
  const [isStaffCityModalVisible, setIsStaffCityModalVisible] = useState(false);
  const [staffCitySearchQuery, setStaffCitySearchQuery] = useState('');
  const [staffCityError, setStaffCityError] = useState('');

  const genderOptions = ['Male', 'Female', 'Others'];

  // ---------- helpers ----------
  const inputBorder = error => ({
    borderColor: error ? '#FF3B30' : '#1b1b1b',
    borderWidth: error ? 1.5 : 1,
  });

  useEffect(() => {
    if (showModal) {
      fetchPositions();
    }
  }, [showModal]);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await fetch(ENDPOINTS.ListPosition);
      const data = await response.json();

      if (data.status && data.payload) {
        setPositions(data.payload);
      } else {
        console.warn('No positions found');
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  // fetch city list, aur Staff.member_city ke hisaab se pre-select bhi kar do
  useEffect(() => {
    const fetchCityList = async () => {
      try {
        const response = await fetch(ENDPOINTS.list_City);
        const result = await response.json();

        if (response.ok && result.code === 200) {
          setCityList(result.payload);

          if (Staff.member_city) {
            const matchedCity = result.payload.find(
              c =>
                c.city_name?.toLowerCase() ===
                Staff.member_city?.toLowerCase(),
            );
            if (matchedCity) {
              setSelectedStaffCity(matchedCity);
            }
          }
        } else {
          console.log('City list fetch failed:', result.message);
        }
      } catch (error) {
        console.log('Error fetching cities:', error.message);
      }
    };

    fetchCityList();
  }, []);

  const validation = () => {
    let isValid = true;

    if (!Project) {
      setProjectError('Staff Name is Required');
      isValid = false;
    } else {
      setProjectError('');
    }

    if (!Client) {
      setClientError('Staff Position is Required');
      isValid = false;
    } else {
      setClientError('');
    }

    if (!Description) {
      setDescriptionError('Staff Email is Required');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    if (!Numbers) {
      setNumbersError('Staff Number is Required');
      isValid = false;
    } else if (Numbers.length !== 10) {
      setNumbersError('Enter a valid 10 digit number');
      isValid = false;
    } else {
      setNumbersError('');
    }

    if (!gender) {
      setGenderError('Staff Gender is Required');
      isValid = false;
    } else {
      setGenderError('');
    }

    if (!selectedStaffCity) {
      setStaffCityError('Staff City is Required');
      isValid = false;
    } else {
      setStaffCityError('');
    }

    if (!Address) {
      setAdressError('Staff Address is Required');
      isValid = false;
    } else {
      setAdressError('');
    }

    if (!Area) {
      setAreaError('Staff Code is Required');
      isValid = false;
    } else {
      setAreaError('');
    }

    return isValid;
  };

  const handleAdd = () => {
    if (validation()) {
      AddPro();
    }
  };

  const AddPro = async () => {
    setLoading(true);
    const url = ENDPOINTS.UpdateProfile;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: memberId,
          member_name: Project,
          member_position: Client,
          member_email: Description,
          member_mobile: Numbers,
          member_gender: gender,
          member_city: selectedStaffCity?.city_name || '',
          member_address: Address,
          member_code: Area,
        }),
      });

      const result = await response.json();
      console.log('My Reslut', result);

      if (result.code == 200) {
        navigation.goBack();
      } else {
        const msg = result?.message || 'Something went wrong';
        setNumbersError(msg);
      }
    } catch (error) {
      setNumbersError('Something went wrong, please try again');
    } finally {
      setLoading(false);
    }
  };

  const filteredPositions = positions.filter(item =>
    item.position_name
      ?.toLowerCase()
      .includes(positionSearchQuery.toLowerCase()),
  );

  const filteredCities = cityList.filter(city =>
    city.city_name
      ?.toLowerCase()
      .includes(staffCitySearchQuery.toLowerCase()),
  );

  return (
    <View style={{ flex: 1 }}>
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
            marginLeft: '25%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
          }}>
          Update Staff
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', alignItems: 'center', marginBottom: 60 }}>
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            style={{ width: '95%', marginTop: 20 }}>

            {/* Staff Name */}
            <Text style={styles.label}>
              Staff Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputBox, inputBorder(ProjectError)]}>
              <TextInput
                placeholder="Staff Name"
                placeholderTextColor={'#999'}
                style={styles.input}
                value={Project}
                onChangeText={text => {
                  setProject(text);
                  if (text) setProjectError('');
                }}
              />
            </View>
            {ProjectError ? <Text style={styles.errorText}>{ProjectError}</Text> : null}

            {/* Staff Position */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Staff Position <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              activeOpacity={0.8}
              style={[styles.inputBox, styles.dropdownBox, inputBorder(ClientError)]}>
              <Text style={{ color: Client ? '#000' : '#999', fontFamily: 'SemiBold24' }}>
                {Client || 'Select Staff Position'}
              </Text>
              <FontAwesome name="chevron-down" size={14} color="#888" />
            </TouchableOpacity>
            {ClientError ? <Text style={styles.errorText}>{ClientError}</Text> : null}

            {/* Staff Email */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Staff Email <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputBox, inputBorder(DescriptionError)]}>
              <TextInput
                placeholder="Staff Email"
                placeholderTextColor={'#999'}
                style={styles.input}
                value={Description}
                onChangeText={text => {
                  setDescription(text);
                  if (text) setDescriptionError('');
                }}
              />
            </View>
            {DescriptionError ? <Text style={styles.errorText}>{DescriptionError}</Text> : null}

            {/* Staff Number */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Staff Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputBox, inputBorder(NumbersError)]}>
              <TextInput
                placeholder="Staff Number"
                placeholderTextColor={'#999'}
                keyboardType="numeric"
                maxLength={10}
                style={styles.input}
                value={Numbers}
                onChangeText={text => {
                  const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 10);
                  setNumbers(digitsOnly);
                  if (digitsOnly.length === 10) {
                    setNumbersError('');
                  } else if (digitsOnly.length === 0) {
                    setNumbersError('Staff Number is required');
                  } else {
                    setNumbersError('');
                  }
                }}
              />
            </View>
            {NumbersError ? <Text style={styles.errorText}>{NumbersError}</Text> : null}

            {/* Gender + City row */}
            <View style={{ width: '100%', flexDirection: 'row', marginTop: 10 }}>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>
                  Staff Gender <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(true)}
                  style={[styles.inputBox, styles.dropdownBox, inputBorder(genderError)]}>
                  <Text style={{ fontFamily: 'SemiBold24', color: gender ? '#000' : '#999' }}>
                    {gender || 'Select Gender'}
                  </Text>
                  <FontAwesome name="chevron-down" size={13} color="#888" />
                </TouchableOpacity>
                {genderError ? <Text style={styles.errorText}>{genderError}</Text> : null}
              </View>

              <View style={{ width: '48%', marginLeft: '4%' }}>
                <Text style={styles.label}>
                  Staff City <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.inputBox, styles.dropdownBox, inputBorder(staffCityError)]}
                  onPress={() => setIsStaffCityModalVisible(true)}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'SemiBold24',
                      color: selectedStaffCity?.city_name ? '#000' : '#999',
                      flexShrink: 1,
                    }}>
                    {selectedStaffCity?.city_name || 'Select City'}
                  </Text>
                  <FontAwesome name="chevron-down" size={13} color="#888" />
                </TouchableOpacity>
                {staffCityError ? <Text style={styles.errorText}>{staffCityError}</Text> : null}
              </View>
            </View>

            {/* Address */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Staff Address <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputBox, styles.multilineBox, inputBorder(AddressError)]}>
              <TextInput
                placeholder="Address"
                placeholderTextColor={'#999'}
                style={[styles.input, styles.multilineInput]}
                value={Address}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onChangeText={text => {
                  setAdress(text);
                  if (text) setAdressError('');
                }}
              />
            </View>
            {AddressError ? <Text style={styles.errorText}>{AddressError}</Text> : null}

            {/* Staff Code */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Staff Code <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputBox, inputBorder(AreaError)]}>
              <TextInput
                placeholder="Staff Code"
                placeholderTextColor={'#999'}
                keyboardType="numeric"
                style={styles.input}
                value={Area}
                onChangeText={text => {
                  setArea(text);
                  if (text) setAreaError('');
                }}
              />
            </View>
            {AreaError ? <Text style={styles.errorText}>{AreaError}</Text> : null}

            <TouchableOpacity
              onPress={handleAdd}
              disabled={loading}
              style={{
                width: '100%',
                height: 50,
                marginTop: 30,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
              }}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontFamily: 'Montserrat-ExtraBold', fontSize: 16, color: '#fff' }}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </ScrollView>

      {/* ---------------- GENDER MODAL ---------------- */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                {genderOptions.map(option => {
                  const isSelected = gender === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setGender(option);
                        setModalVisible(false);
                        setGenderError('');
                      }}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}>
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && { color: colors.primary, fontFamily: 'Montserrat-ExtraBold' },
                        ]}>
                        {option}
                      </Text>
                      {isSelected && (
                        <FontAwesome name="check-circle" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ---------------- STAFF POSITION MODAL ---------------- */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={[styles.modalCard, { maxHeight: '70%' }]}>
                <Text style={styles.modalTitle}>Select Staff Position</Text>

                <View style={styles.searchBox}>
                  <FontAwesome name="search" size={14} color="#999" />
                  <TextInput
                    placeholder="Search Position"
                    placeholderTextColor="#999"
                    value={positionSearchQuery}
                    onChangeText={setPositionSearchQuery}
                    style={styles.searchInput}
                  />
                  {positionSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setPositionSearchQuery('')}>
                      <FontAwesome name="times-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={filteredPositions}
                    keyExtractor={item => item.position_id.toString()}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 260 }}
                    ListEmptyComponent={
                      <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>
                        No positions found
                      </Text>
                    }
                    renderItem={({ item }) => {
                      const isSelected = Client === item.position_name;
                      return (
                        <TouchableOpacity
                          style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                          onPress={() => {
                            setClient(item.position_name);
                            setClientError('');
                            setShowModal(false);
                            setPositionSearchQuery('');
                          }}>
                          <Text
                            style={[
                              styles.optionText,
                              isSelected && { color: colors.primary, fontFamily: 'Montserrat-ExtraBold' },
                            ]}>
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
                    setShowModal(false);
                    setPositionSearchQuery('');
                  }}
                  style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ---------------- STAFF CITY MODAL ---------------- */}
      <Modal
        visible={isStaffCityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStaffCityModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsStaffCityModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={[styles.modalCard, { maxHeight: '70%' }]}>
                <Text style={styles.modalTitle}>Select Staff City</Text>

                <View style={styles.searchBox}>
                  <FontAwesome name="search" size={14} color="#999" />
                  <TextInput
                    placeholder="Search City"
                    placeholderTextColor="#999"
                    value={staffCitySearchQuery}
                    onChangeText={setStaffCitySearchQuery}
                    style={styles.searchInput}
                  />
                  {staffCitySearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setStaffCitySearchQuery('')}>
                      <FontAwesome name="times-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                <FlatList
                  data={filteredCities}
                  keyExtractor={item => item.city_id.toString()}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 260 }}
                  ListEmptyComponent={
                    <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>
                      No city found
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const isSelected = selectedStaffCity?.city_id === item.city_id;
                    return (
                      <TouchableOpacity
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                        onPress={() => {
                          setSelectedStaffCity(item);
                          setStaffCityError('');
                          setIsStaffCityModalVisible(false);
                          setStaffCitySearchQuery('');
                        }}>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && { color: colors.primary, fontFamily: 'Montserrat-ExtraBold' },
                          ]}>
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
                    setIsStaffCityModalVisible(false);
                    setStaffCitySearchQuery('');
                  }}
                  style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default UpdateStaff;

const styles = StyleSheet.create({
  label: {
    fontFamily: 'Montserrat-ExtraBold',
    color: '#000',
    fontSize: 12,
    marginBottom: 5,
  },
  required: {
    color: 'red',
    fontFamily: 'Montserrat-ExtraBold',
  },
  inputBox: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  input: {
    color: '#000',
    fontFamily: 'SemiBold24',
    fontSize: 14,
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  multilineBox: {
    height: 90,
    paddingVertical: 8,
  },
  multilineInput: {
    height: 74,
  },
  errorText: {
    color: '#FF3B30',
    fontFamily: 'SemiBold24',
    marginLeft: 4,
    marginTop: 4,
    fontSize: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },
  modalTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 16,
    color: '#000',
    marginBottom: 14,
    textAlign: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: 'SemiBold24',
    color: '#000',
    fontSize: 14,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  optionRowSelected: {
    backgroundColor: '#f5f8ff',
    borderRadius: 8,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'SemiBold24',
    color: '#000',
  },
  cancelBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: 'red',
    fontFamily: 'SemiBold24',
    fontSize: 14,
  },
});