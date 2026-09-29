/* eslint-disable prettier/prettier */
/* eslint-disable react/self-closing-comp */
/* eslint-disable react-native/no-inline-styles */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
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
import DateTimePicker from 'react-native-modal-datetime-picker';
import * as Animatable from 'react-native-animatable';
import { ENDPOINTS } from '../CommonFile/Constant';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const AddProject = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { projectData } = route.params || {};
  const isUpdateMode = !!projectData;

  const [isFromDatePickerVisible, setFromDatePickerVisibility] = useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [FromDateError, setFromDateError] = useState('');
  const [TillDateError, setTillDateError] = useState('');

  const [Project, setProject] = useState('');
  const [ProjectError, setProjectError] = useState('');
  const [Client, setClient] = useState('');
  const [ClientError, setClientError] = useState('');
  const [Description, setDescription] = useState('');
  const [DescriptionError, setDescriptionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [Numbers, setNumbers] = useState('');
  const [NumbersError, setNumbersError] = useState('');

  const [Address, setAdress] = useState('');
  const [AddressError, setAdressError] = useState('');
  const [Area, setArea] = useState('');
  const [AreaError, setAreaError] = useState('');

  // ---- State ----
  const [stateList, setStateList] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [StateError, setStateError] = useState('');

  // ---- City (depends on state) ----
  const [cityList, setCityList] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [CityError, setCityError] = useState('');
  const [cityLoading, setCityLoading] = useState(false);

  // ---------- helpers ----------
  const inputBorder = error => ({
    borderColor: error ? '#FF3B30' : '#1b1b1b',
    borderWidth: error ? 1.5 : 1,
  });

  const formatDateForDisplay = dateStr => {
    // handles both 'yyyy-mm-dd' and 'dd/mm/yyyy'
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr; // already display format
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  };

  // ---------- Prefill on update mode ----------
  useEffect(() => {
    if (isUpdateMode) {
      setProject(projectData.project_name || '');
      setClient(projectData.project_client_name || '');
      setDescription(projectData.project_desc || '');
      setNumbers(projectData.project_contact && projectData.project_contact !== '0' ? projectData.project_contact : '');
      setAdress(projectData.project_client_address || '');
      setArea(projectData.project_client_area || '');
      setFromDate(formatDateForDisplay(projectData.project_start_date));
      setTillDate(formatDateForDisplay(projectData.project_end_date));
    }
  }, []);

  // Fetch all states on mount
  useEffect(() => {
    const fetchStateList = async () => {
      try {
        const response = await fetch(ENDPOINTS.list_State);
        const result = await response.json();
        if (result.code === 200) {
          setStateList(result.payload);

          // agar update mode hai to matching state find karke select karo
          if (isUpdateMode && projectData.project_client_state) {
            const matchedState = result.payload.find(
              s => s.state_name?.toLowerCase() === projectData.project_client_state.toLowerCase(),
            );
            if (matchedState) {
              setSelectedState(matchedState);
              fetchCityByState(matchedState.state_id, matchedState.state_name === projectData.project_client_state);
            }
          }
        } else {
          console.warn('State list fetch failed:', result.message);
        }
      } catch (error) {
        console.log('Error fetching states:', error.message);
      }
    };
    fetchStateList();
  }, []);

  // Fetch cities based on selected state
  const fetchCityByState = async (stateId, autoSelectCity = false) => {
    setCityLoading(true);
    try {
      const response = await fetch(ENDPOINTS.list_City, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state_id: stateId }),
      });

      const result = await response.json();
      if (result.code === 200) {
        setCityList(result.payload);

        // update mode: matching city find karke select karo
        if (autoSelectCity && isUpdateMode && projectData.project_client_city) {
          const matchedCity = result.payload.find(
            c => c.city_name?.toLowerCase() === projectData.project_client_city.toLowerCase(),
          );
          if (matchedCity) {
            setSelectedCity(matchedCity);
          }
        }
      } else {
        console.warn('City list fetch failed:', result.message);
        setCityList([]);
      }
    } catch (error) {
      console.log('Error fetching cities:', error.message);
      setCityList([]);
    } finally {
      setCityLoading(false);
    }
  };

  const filteredStates = stateList.filter(state =>
    state?.state_name?.toLowerCase().includes(stateSearchQuery.toLowerCase()),
  );

  const filteredCities = cityList.filter(city =>
    city?.city_name?.toLowerCase().includes(citySearchQuery.toLowerCase()),
  );

  const validation = () => {
    let isValid = true;

    if (!Project) {
      setProjectError('Project name is Required');
      isValid = false;
    } else setProjectError('');

    if (!Client) {
      setClientError('Client name is Required');
      isValid = false;
    } else setClientError('');

    // Baaki sab fields optional hai
    setFromDateError('');
    setTillDateError('');
    setDescriptionError('');

    // Number optional hai, lekin agar bhara hai to valid 10 digit hona chahiye
    if (Numbers && Numbers.length !== 10) {
      setNumbersError('Enter a valid 10 digit number');
      isValid = false;
    } else setNumbersError('');

    setStateError('');
    setCityError('');
    setAdressError('');
    setAreaError('');

    return isValid;
  };

  const handleSubmit = () => {
    if (validation()) {
      isUpdateMode ? UpdateProjectApi() : AddPro();
    }
  };

  const showFromDatePicker = () => setFromDatePickerVisibility(true);
  const hideFromDatePicker = () => setFromDatePickerVisibility(false);
  const showTillDatePicker = () => setTillDatePickerVisibility(true);
  const hideTillDatePicker = () => setTillDatePickerVisibility(false);

  const formatDate = date => {
    if (!(date instanceof Date)) {
      return { display: '', api: '' };
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
    const { display } = formatDate(date);
    setFromDate(display);
    hideFromDatePicker();
  };

  const handleTillDateConfirm = date => {
    const { display } = formatDate(date);
    setTillDate(display);
    hideTillDatePicker();
  };

  const convertDisplayToApiDate = dateStr => {
    if (!dateStr) return '';

    // अगर dd/mm/yyyy aa raha hai to dd-mm-yyyy bana do
    if (dateStr.includes('/')) {
      const [dd, mm, yyyy] = dateStr.split('/');
      return `${dd}-${mm}-${yyyy}`;
    }

    // agar pehle se dd-mm-yyyy hai to wahi return
    return dateStr;
  };

  const AddPro = async () => {
    setLoading(true);
    const url = ENDPOINTS.AddProject;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: Project,
          client_name: Client,
          start_date: convertDisplayToApiDate(fromDate),
          end_date: convertDisplayToApiDate(tillDate),
          project_desc: Description,
          project_contact: Numbers,
          project_client_city: selectedCity?.city_name || '',
          project_client_state: selectedState?.state_name || '',
          project_client_address: Address,
          project_client_area: Area,
        }),
      });

      console.log("body", {
        project_name: Project,
        client_name: Client,
        start_date: convertDisplayToApiDate(fromDate),
        end_date: convertDisplayToApiDate(tillDate),
        project_desc: Description,
        project_contact: Numbers,
        project_client_city: selectedCity?.city_name || '',
        project_client_state: selectedState?.state_name || '',
        project_client_address: Address,
        project_client_area: Area,
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

  const UpdateProjectApi = async () => {
    setLoading(true);
    const url = ENDPOINTS.updateProject;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectData.project_id,
          project_name: Project,
          client_name: Client,
          start_date: convertDisplayToApiDate(fromDate),
          end_date: convertDisplayToApiDate(tillDate),
          project_desc: Description,
          project_contact: Numbers,
          project_client_city: selectedCity?.city_name || '',
          project_client_state: selectedState?.state_name || '',
          project_client_address: Address,
          project_client_area: Area,
        }),
      });

      console.log("Updatebody", {
        project_id: projectData.project_id,
        project_name: Project,
        client_name: Client,
        start_date: convertDisplayToApiDate(fromDate),
        end_date: convertDisplayToApiDate(tillDate),
        project_desc: Description,
        project_contact: Numbers,
        project_client_city: selectedCity?.city_name || '',
        project_client_state: selectedState?.state_name || '',
        project_client_address: Address,
        project_client_area: Area,
      });

      const result = await response.json();
      console.log('Update Result', result);

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
            marginLeft: isUpdateMode ? '22%' : '28%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
          }}>
          {isUpdateMode ? 'Update Project' : 'Add Project'}
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', alignItems: 'center', marginBottom: 60 }}>
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            style={{ width: '95%', marginTop: 20 }}>

            {/* Project Name */}
            <Text style={styles.label}>
              Project Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputBox, inputBorder(ProjectError)]}>
              <TextInput
                placeholder="Project Name"
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

            {/* Client Name */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Client Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputBox, inputBorder(ClientError)]}>
              <TextInput
                placeholder="Client Name"
                placeholderTextColor={'#999'}
                style={styles.input}
                value={Client}
                onChangeText={text => {
                  setClient(text);
                  if (text) setClientError('');
                }}
              />
            </View>
            {ClientError ? <Text style={styles.errorText}>{ClientError}</Text> : null}

            {/* Dates */}
            <View style={{ marginTop: 10, flexDirection: 'row', width: '100%' }}>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>
                  From Date
                </Text>
                <TouchableOpacity
                  onPress={showFromDatePicker}
                  style={[styles.inputBox, styles.dropdownBox, inputBorder(FromDateError)]}>
                  <Text style={{ fontFamily: 'SemiBold24', color: fromDate ? '#000' : '#999' }}>
                    {fromDate || 'dd/mm/yyyy'}
                  </Text>
                  <Image
                    source={require('../assets/calendar.png')}
                    style={{ width: 18, height: 18, tintColor: '#888' }}
                  />
                </TouchableOpacity>
                {FromDateError ? <Text style={styles.errorText}>{FromDateError}</Text> : null}
              </View>

              <View style={{ width: '48%', marginLeft: '4%' }}>
                <Text style={styles.label}>
                  Till Date
                </Text>
                <TouchableOpacity
                  onPress={showTillDatePicker}
                  style={[styles.inputBox, styles.dropdownBox, inputBorder(TillDateError)]}>
                  <Text style={{ fontFamily: 'SemiBold24', color: tillDate ? '#000' : '#999' }}>
                    {tillDate || 'dd/mm/yyyy'}
                  </Text>
                  <Image
                    source={require('../assets/calendar.png')}
                    style={{ width: 18, height: 18, tintColor: '#888' }}
                  />
                </TouchableOpacity>
                {TillDateError ? <Text style={styles.errorText}>{TillDateError}</Text> : null}
              </View>

              <DateTimePicker
                isVisible={isFromDatePickerVisible}
                mode="date"
                onConfirm={handleFromDateConfirm}
                onCancel={hideFromDatePicker}
              />
              <DateTimePicker
                isVisible={isTillDatePickerVisible}
                mode="date"
                onConfirm={handleTillDateConfirm}
                onCancel={hideTillDatePicker}
              />
            </View>

            {/* Description */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Project Description
            </Text>
            <View style={[styles.inputBox, styles.multilineBox, inputBorder(DescriptionError)]}>
              <TextInput
                placeholder="Description"
                placeholderTextColor={'#999'}
                style={[styles.input, styles.multilineInput]}
                value={Description}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onChangeText={text => {
                  setDescription(text);
                  if (text) setDescriptionError('');
                }}
              />
            </View>
            {DescriptionError ? <Text style={styles.errorText}>{DescriptionError}</Text> : null}

            {/* Client Number */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Client Number
            </Text>
            <View style={[styles.inputBox, inputBorder(NumbersError)]}>
              <TextInput
                placeholder="Contact Number"
                placeholderTextColor={'#999'}
                keyboardType="numeric"
                maxLength={10}
                style={styles.input}
                value={Numbers}
                onChangeText={text => {
                  const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 10);
                  setNumbers(digitsOnly);
                  if (digitsOnly.length === 10 || digitsOnly.length === 0) {
                    setNumbersError(digitsOnly.length === 0 ? 'Client Number is Required' : '');
                  } else {
                    setNumbersError('');
                  }
                }}
              />
            </View>
            {NumbersError ? <Text style={styles.errorText}>{NumbersError}</Text> : null}

            {/* State + City */}
            <View style={{ width: '100%', flexDirection: 'row', marginTop: 10 }}>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>
                  State
                </Text>
                <TouchableOpacity
                  style={[styles.inputBox, styles.dropdownBox, inputBorder(StateError)]}
                  onPress={() => setStateModalVisible(true)}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'SemiBold24',
                      color: selectedState?.state_name ? '#000' : '#999',
                      flexShrink: 1,
                    }}>
                    {selectedState?.state_name || 'Select State'}
                  </Text>
                  <FontAwesome name="chevron-down" size={13} color="#888" />
                </TouchableOpacity>
                {StateError ? <Text style={styles.errorText}>{StateError}</Text> : null}
              </View>

              <View style={{ width: '48%', marginLeft: '4%' }}>
                <Text style={styles.label}>
                  City
                </Text>
                <TouchableOpacity
                  disabled={!selectedState}
                  style={[
                    styles.inputBox,
                    styles.dropdownBox,
                    inputBorder(CityError),
                    !selectedState && styles.disabledBox,
                  ]}
                  onPress={() => selectedState && setCityModalVisible(true)}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'SemiBold24',
                      color: selectedCity?.city_name ? '#000' : '#999',
                      flexShrink: 1,
                    }}>
                    {selectedCity?.city_name || (selectedState ? 'Select City' : 'Select State first')}
                  </Text>
                  <FontAwesome name="chevron-down" size={13} color="#888" />
                </TouchableOpacity>
                {CityError ? <Text style={styles.errorText}>{CityError}</Text> : null}
              </View>
            </View>

            {/* Address */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Address
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

            {/* Area */}
            <Text style={[styles.label, { marginTop: 10 }]}>
              Area
            </Text>
            <View style={[styles.inputBox, inputBorder(AreaError)]}>
              <TextInput
                placeholder="Area"
                placeholderTextColor={'#999'}
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
              onPress={handleSubmit}
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
                  {isUpdateMode ? 'Update Project' : 'Add Project'}
                </Text>
              )}
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </ScrollView>

      {/* ---------------- STATE MODAL ---------------- */}
      <Modal
        visible={stateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStateModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setStateModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={[styles.modalCard, { maxHeight: '70%' }]}>
                <Text style={styles.modalTitle}>Select State</Text>

                <View style={styles.searchBox}>
                  <FontAwesome name="search" size={14} color="#999" />
                  <TextInput
                    placeholder="Search State"
                    placeholderTextColor="#999"
                    value={stateSearchQuery}
                    onChangeText={setStateSearchQuery}
                    style={styles.searchInput}
                  />
                  {stateSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setStateSearchQuery('')}>
                      <FontAwesome name="times-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                <FlatList
                  data={filteredStates}
                  keyExtractor={item => item.state_id.toString()}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 260 }}
                  ListEmptyComponent={
                    <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>
                      No state found
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const isSelected = selectedState?.state_id === item.state_id;
                    return (
                      <TouchableOpacity
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                        onPress={() => {
                          setSelectedState(item);
                          setStateError('');
                          setStateModalVisible(false);
                          setStateSearchQuery('');
                          setSelectedCity(null);
                          setCityList([]);
                          fetchCityByState(item.state_id, false);
                        }}>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && { color: colors.primary, fontFamily: 'Montserrat-ExtraBold' },
                          ]}>
                          {item.state_name}
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
                    setStateModalVisible(false);
                    setStateSearchQuery('');
                  }}
                  style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ---------------- CITY MODAL ---------------- */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setCityModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={[styles.modalCard, { maxHeight: '70%' }]}>
                <Text style={styles.modalTitle}>Select City</Text>

                <View style={styles.searchBox}>
                  <FontAwesome name="search" size={14} color="#999" />
                  <TextInput
                    placeholder="Search City"
                    placeholderTextColor="#999"
                    value={citySearchQuery}
                    onChangeText={setCitySearchQuery}
                    style={styles.searchInput}
                  />
                  {citySearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setCitySearchQuery('')}>
                      <FontAwesome name="times-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                {cityLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
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
                      const isSelected = selectedCity?.city_id === item.city_id;
                      return (
                        <TouchableOpacity
                          style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                          onPress={() => {
                            setSelectedCity(item);
                            setCityError('');
                            setCityModalVisible(false);
                            setCitySearchQuery('');
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
                )}

                <TouchableOpacity
                  onPress={() => {
                    setCityModalVisible(false);
                    setCitySearchQuery('');
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

export default AddProject;

const styles = StyleSheet.create({
  label: {
    fontFamily: 'Montserrat-ExtraBold',
    color: colors.primary,
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
  disabledBox: {
    backgroundColor: '#F2F2F2',
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