import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { ENDPOINTS } from '../CommonFile/Constant';


const UpdateProject = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { projectData } = route.params || {};

  const [isFromDatePickerVisible, setFromDatePickerVisibility] =
    useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] =
    useState(false);
  const [selectedField, setSelectedField] = useState(null); // 'from' or 'till'
  const [fromDate, setFromDate] = useState(
    projectData.project_start_date || '',
  );
  const [tillDate, setTillDate] = useState(projectData.project_end_date || '');
  console.log("End Date", tillDate);
  const [FromDateError, setFromDateError] = useState();
  const [TillDateError, setTillDateError] = useState();
  const [fromDateDisplay, setFromDateDisplay] = useState(

  );
  const [tillDateDisplay, setTillDateDisplay] = useState(

  );
  const [loading, setLoading] = useState(false);


  const [Project, setProject] = useState(projectData.project_name || '');
  const [ProjectError, setProjectError] = useState();
  const [Client, setClient] = useState(projectData.project_client_name || '');
  const [ClientError, setClientError] = useState();
  const [Description, setDescription] = useState(

  );

  const [DescriptionError, setDescriptionError] = useState();
  const [ProjectId, setProjectId] = useState(projectData.project_id);
  const [Numbers, setNumbers] = useState(projectData.project_contact);
  const [NumbersError, setNumbersError] = useState('');
  // const [City, setCity] = useState(projectData.project_client_city);
  const [cityList, setCityList] = useState([projectData.project_client_city]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [State, setState] = useState(projectData.project_client_state);
  const [StateError, setStateError] = useState('');
  const [Address, setAdress] = useState(projectData.project_client_address);
  const [AddressError, setAdressError] = useState('');
  const [Area, setArea] = useState(projectData.project_client_area);
  const [AreaError, setAreaError] = useState('');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [stateList, setStateList] = useState([projectData.project_client_state]);
  console.log("stateList ye hai jo dusri screen se aya hai", projectData.project_client_state);
  const [selectedState, setSelectedState] = useState();
  const [stateDropdownVisible, setStateDropdownVisible] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');



  const filteredCities = cityList.filter(city =>
    city?.city_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  console.log('Update', projectData);

  useEffect(() => {
    if (projectData) {
      setProject(projectData.project_name || '');
      setClient(projectData.project_client_name || '');
      setFromDate(projectData.project_start_date || '');
      setTillDate(projectData.project_end_date || '');
      setDescription(projectData.project_desc || '');
      setNumbers(projectData.project_contact || '');
      // setCityList(projectData.project_client_city || '');
      // setState(projectData.project_client_state || '');
      setAdress(projectData.project_client_address || '');
      setArea(projectData.project_client_area || '');


      // ✅ Fetch state from city
      if (projectData.project_client_city) {
        fetchStateByCity(projectData.project_client_city);
      }
    }
  }, []);

  const validation = () => {
    let isValid = true;

    if (!Project) {
      setProjectError('Project is Required');
      isValid = false;
    } else {
      setProjectError('');
    }

    if (!Client) {
      setClientError('Client is Required');
      isValid = false;
    } else {
      setClientError('');
    }
    if (!fromDate) {
      setFromDateError('Date is Required');
      isValid = false;
    } else {
      setFromDateError('');
    }

    if (!tillDate) {
      setTillDateError('Date is Required');
      isValid = false;
    } else {
      setTillDateError('');
    }

    if (!Description) {
      setDescriptionError('Description is Required');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    return isValid;
  };

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

  const UpdateProduct = async () => {
    setLoading(true)
    const url = ENDPOINTS.UpdateProject;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: ProjectId,
          project_name: Project,
          client_name: Client,
          start_date: fromDate,
          end_date: tillDate,
          project_desc: Description,
          project_contact: Numbers,
          project_client_city: selectedCity?.city_name,
          project_client_state: selectedState?.state_name,
          project_client_area: Area,
          project_client_address: Address,
        }),
      });

      const result = await response.json();
      console.log('My Reslut', result);

      if (result.code == 200) {
        navigation.goBack();
      }
    } catch (error) {

    } finally {
      setLoading(false)
    }
  };

  const formatDatetochange = (dateStr) => {
    if (!dateStr) return 'dd/mm/yyyy';

    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');

    if (parts.length !== 3) return 'Invalid Date';

    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  };


  const filteredStates = stateList.filter(state =>
    state?.state_name?.toLowerCase().includes(stateSearchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchCityList = async () => {
      try {
        const response = await fetch(ENDPOINTS.list_City);
        const result = await response.json();

        if (result.code === 200) {
          setCityList(result.payload);

          // ✅ Set selected city from projectData if it exists
          const selected = result.payload.find(
            item => item.city_name === projectData.project_client_city
          );
          if (selected) {
            setSelectedCity(selected); // optional if you're using selectedCity
          }
        }
      } catch (error) {
        console.log('Error fetching cities:', error.message);
      }
    };

    fetchCityList();
  }, []);


  const fetchStateByCity = async (cityName) => {
    try {
      const response = await fetch(ENDPOINTS.list_State, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city_name: cityName }),
      });

      const result = await response.json();

      if (result.code === 200) {
        setStateList(result.payload);

        // Auto-select first state (optional)
        setSelectedState(result.payload[0]);
      } else {
        console.warn('State fetch failed:', result.message);
      }
    } catch (error) {
      console.error('Error fetching state:', error.message);
    }
  };


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
          Update Project
        </Text>
      </View>
      <ScrollView keyboardShouldPersistTaps='handled'>
        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={{ width: '95%', marginTop: 20, marginBottom: 70 }}>
            <Text
              style={{
                fontFamily: 'Montserrat-ExtraBold',
                color: colors.primary,
                fontSize: 12,
                marginBottom: 5,
              }}>
              Project Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
            </Text>
            <View
              style={{
                width: '100%',
                height: 50,
                borderWidth: 1,
                borderRadius: 10,
              }}>
              <TextInput
                placeholder="Project Name"
                placeholderTextColor={'#000'}
                style={{
                  color: '#000',
                  fontFamily: 'SemiBold24',
                  width: '85%',
                }}
                value={Project}
                onChangeText={text => {
                  setProject(text);
                  if (!text) {
                    setProjectError('Prject is required');
                  } else {
                    setProjectError('');
                  }
                }}></TextInput>
            </View>
            {ProjectError ? (
              <Text
                style={{
                  color: 'red',
                  fontFamily: 'SemiBold24',
                  marginLeft: 10,
                  fontSize: 12,
                }}>
                {ProjectError}
              </Text>
            ) : null}
            <Text
              style={{
                fontFamily: 'Montserrat-ExtraBold',
                color: colors.primary,
                fontSize: 12,
                marginBottom: 5,
                marginTop: 10,
              }}>
              Client Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
            </Text>
            <View
              style={{
                width: '100%',
                height: 50,
                borderWidth: 1,
                borderRadius: 10,
              }}>
              <TextInput
                placeholder="Client Name"
                placeholderTextColor={'#000'}
                style={{
                  color: '#000',
                  fontFamily: 'SemiBold24',
                  width: '85%',
                }}
                value={Client}
                onChangeText={text => {
                  setClient(text);
                  if (!text) {
                    setClientError('Client is required');
                  } else {
                    setClientError('');
                  }
                }}></TextInput>
            </View>
            {ClientError ? (
              <Text
                style={{
                  color: 'red',
                  fontFamily: 'SemiBold24',
                  marginLeft: 10,
                  fontSize: 12,
                }}>
                {ClientError}
              </Text>
            ) : null}
            <View style={{ marginTop: 10, flexDirection: 'row', width: '100%' }}>
              {/* From Date */}
              <View style={{ width: '45%' }}>
                <Text
                  style={{
                    color: colors.primary,
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
                    color: colors.primary,
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
                      fontSize: 12,
                    }}>
                    {TillDateError}
                  </Text>
                ) : null}
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
            </View>
            <Text
              style={{
                fontFamily: 'Montserrat-ExtraBold',
                color: colors.primary,
                fontSize: 12,
                marginBottom: 5,
                marginTop: 10,
              }}>
              Project Description <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
            </Text>
            <View
              style={{
                width: '100%',
                minHeight: 50,
                maxHeight: 100,
                borderWidth: 1,
                borderRadius: 10,
              }}>
              <TextInput
                placeholder="Description"
                placeholderTextColor={'#000'}
                style={{
                  color: '#000',
                  fontFamily: 'SemiBold24',
                  width: '85%',
                }}
                value={Description}
                onChangeText={text => {
                  setDescription(text);
                  if (!text) {
                    setDescriptionError('Description is required');
                  } else {
                    setDescriptionError('');
                  }
                }}></TextInput>
            </View>
            {DescriptionError ? (
              <Text
                style={{
                  color: 'red',
                  fontFamily: 'SemiBold24',
                  marginLeft: 10,
                  fontSize: 12,
                }}>
                {DescriptionError}
              </Text>
            ) : null}
            <Text
              style={{
                fontFamily: 'Montserrat-ExtraBold',
                color: colors.primary,
                fontSize: 12,
                marginBottom: 5,
                marginTop: 10,
              }}>
              Client Number
            </Text>
            <View
              style={{
                width: '100%',
                minHeight: 50,
                maxHeight: 100,
                borderWidth: 1,
                borderRadius: 10,
              }}>
              <TextInput
                placeholder="Contact Number"
                placeholderTextColor={'#000'}
                style={{
                  color: '#000',
                  fontFamily: 'SemiBold24',
                  width: '85%',
                }}
                onChangeText={text => {
                  setNumbers(text);
                }}
                value={Numbers}></TextInput>
            </View>
            {/* {NumbersError ? (
              <Text
                style={{
                  color: 'red',
                  fontFamily: 'SemiBold24',
                  marginLeft: 10,
                  fontSize: 12,
                }}>
                {NumbersError}
              </Text>
            ) : null} */}
            <View style={{ width: '100%', flexDirection: 'row', marginTop: 10 }}>
              {/* <View style={{ width: '45%' }}>
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 13,
                    marginBottom: 5,
                  }}>
                  City
                </Text>
                <View
                  style={{
                    width: '100%',
                    height: 50,
                    borderWidth: 1,
                    borderRadius: 10,
                  }}>
                  <TextInput
                    placeholder="City"
                    placeholderTextColor={'#000'}
                    style={{ fontFamily: 'SemiBold24', color: '#000' }}
                    value={City}
                    onChangeText={text => {
                      setCity(text);
                    }}
                  />
                </View>
               
              </View> */}

              <View style={{ width: '100%', flexDirection: 'row', marginTop: 10 }}>
                <View style={{ width: '45%', position: 'relative' }}>
                  {/* Label */}
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 13,
                      marginBottom: 5,
                    }}>
                    City <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                  </Text>

                  {/* Dropdown Button */}
                  <TouchableOpacity
                    style={{
                      width: '100%',
                      height: 50,
                      borderWidth: 1,
                      borderRadius: 10,
                      justifyContent: 'center',
                      paddingHorizontal: 10,
                    }}
                    onPress={() => setIsDropdownVisible(!isDropdownVisible)}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: 'SemiBold24',
                        color: selectedCity?.city_name ? '#000' : '#000',
                      }}>
                      {selectedCity?.city_name || 'Select City'}
                    </Text>
                  </TouchableOpacity>

                  {/* Absolute Positioned Dropdown Content */}

                  {isDropdownVisible && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 80,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        backgroundColor: 'white',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 10,
                        elevation: 5,
                        width: 380,


                      }}>
                      {/* Search Field */}
                      <View style={{ position: 'relative', marginBottom: 10 }}>
                        <TextInput
                          placeholder="Search City"
                          placeholderTextColor="#999"
                          value={searchQuery}
                          onChangeText={text => setSearchQuery(text)}
                          style={{
                            height: 40,
                            borderColor: '#ccc',
                            borderWidth: 1,
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            marginBottom: 10,
                            fontFamily: 'SemiBold24',
                            color: '#000',
                          }}
                        />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: 10,
                            }}>
                            <FontAwesome name="times-circle" size={18} color="#999" />
                          </TouchableOpacity>
                        )}
                      </View>
                      {/* City List */}

                      <FlatList
                        keyboardShouldPersistTaps='handled'
                        data={filteredCities}
                        nestedScrollEnabled={true}
                        keyExtractor={(item, index) => item.city_id.toString()}
                        style={{
                          maxHeight: 100, // 👈 Add this!
                        }}

                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 6,
                              borderBottomWidth: 1,
                              borderColor: '#eee',
                            }}
                            onPress={() => {
                              setSelectedCity(item); // save full city object
                              setSearchQuery('');
                              setIsDropdownVisible(false);
                              fetchStateByCity(item.city_name);
                            }}
                          >
                            <Text style={{ fontFamily: 'SemiBold24', color: '#000' }}>
                              {item.city_name}
                            </Text>
                          </TouchableOpacity>
                        )}
                      />


                    </View>
                  )}


                </View>

                <View style={{ width: '45%', marginLeft: '10%', position: 'relative' }}>
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 13,
                      marginBottom: 5,
                    }}>
                    State <Text style={{ color: 'red' }}>*</Text>
                  </Text>

                  <TouchableOpacity
                    style={{
                      width: '100%',
                      height: 50,
                      borderWidth: 1,
                      borderRadius: 10,
                      justifyContent: 'center',
                      paddingHorizontal: 10,
                    }}
                    onPress={() => setStateDropdownVisible(!stateDropdownVisible)}>
                    <Text style={{
                      fontSize: 14,
                      fontFamily: 'SemiBold24',
                      color: selectedState?.state_name ? '#000' : '#999'
                    }}>
                      {selectedState?.state_name || 'Select State'}
                    </Text>
                  </TouchableOpacity>

                  {stateDropdownVisible && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 80,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        backgroundColor: 'white',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 10,
                        elevation: 5,
                      }}>

                      <View style={{ position: 'relative', marginBottom: 10 }}>
                        <TextInput
                          placeholder="Search State"
                          placeholderTextColor="#999"
                          value={stateSearchQuery}
                          onChangeText={text => setStateSearchQuery(text)}
                          style={{
                            height: 40,
                            borderColor: '#ccc',
                            borderWidth: 1,
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            fontFamily: 'SemiBold24',
                            color: '#000',
                          }}
                        />
                        {stateSearchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setStateSearchQuery('')}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: 10,
                            }}>
                            <FontAwesome name="times-circle" size={18} color="#999" />
                          </TouchableOpacity>
                        )}
                      </View>


                      <FlatList
                        data={filteredStates}
                        keyExtractor={(item) => item.state_id.toString()}
                        style={{ maxHeight: 120 }}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 6,
                              borderBottomWidth: 1,
                              borderColor: '#eee',
                            }}
                            onPress={() => {
                              setSelectedState(item);
                              setStateSearchQuery(item.state_name); // optional if you use this elsewhere
                              setStateDropdownVisible(false);
                              setStateSearchQuery('');
                            }}
                          >
                            <Text style={{ fontFamily: 'SemiBold24', color: '#000' }}>
                              {item.state_name}
                            </Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  )}
                </View>
              </View>




              <View style={{ width: '45%', marginLeft: '10%' }}>
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 13,
                    marginBottom: 5,
                  }}>
                  State <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <View
                  style={{
                    width: '100%',
                    height: 50,
                    borderWidth: 1,
                    borderRadius: 10,
                  }}>
                  <TextInput
                    placeholder="State"
                    placeholderTextColor={'#000'}
                    style={{ fontFamily: 'SemiBold24', color: '#000' }}
                    value={State}
                    onChangeText={text => {
                      setState(text);
                    }}
                  />
                </View>
                {/* {StateError ? (
                  <Text
                    style={{
                      color: 'red',
                      fontFamily: 'SemiBold24',
                      marginLeft: 10,
                      fontSize: 12,
                    }}>
                    {StateError}
                  </Text>
                ) : null} */}
              </View>
            </View>
            <Text
              style={{
                fontFamily: 'Montserrat-ExtraBold',
                color: colors.primary,
                fontSize: 12,
                marginBottom: 5,
                marginTop: 10,
              }}>
              Address <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
            </Text>
            <View
              style={{
                width: '100%',
                minHeight: 50,
                maxHeight: 100,
                borderWidth: 1,
                borderRadius: 10,
              }}>
              <TextInput
                placeholder="Address"
                placeholderTextColor={'#000'}
                style={{
                  color: '#000',
                  fontFamily: 'SemiBold24',
                  width: '85%',
                }}
                onChangeText={text => {
                  setAdress(text);
                }}
                value={Address}></TextInput>
            </View>
            {/* {AddressError ? (
              <Text
                style={{
                  color: 'red',
                  fontFamily: 'SemiBold24',
                  marginLeft: 10,
                  fontSize: 12,
                }}>
                {AddressError}
              </Text>
            ) : null} */}
            <Text
              style={{
                fontFamily: 'Montserrat-ExtraBold',
                color: colors.primary,
                fontSize: 12,
                marginBottom: 5,
                marginTop: 10,
              }}>
              Area <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
            </Text>
            <View
              style={{
                width: '100%',
                minHeight: 50,
                maxHeight: 100,
                borderWidth: 1,
                borderRadius: 10,
              }}>
              <TextInput
                placeholder="Area"
                placeholderTextColor={'#000'}
                style={{
                  color: '#000',
                  fontFamily: 'SemiBold24',
                  width: '85%',
                }}
                onChangeText={text => {
                  setArea(text);
                }}
                value={Area}></TextInput>
            </View>
            {/* {AreaError ? (
              <Text
                style={{
                  color: 'red',
                  fontFamily: 'SemiBold24',
                  marginLeft: 10,
                  fontSize: 12,
                }}>
                {AreaError}
              </Text>
            ) : null} */}
            <TouchableOpacity
              onPress={UpdateProduct}
              disabled={loading}
              style={{
                width: '100%',
                height: 50,
                marginTop: 30,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 16,
                    color: '#fff',
                  }}>
                  save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
export default UpdateProject;
const styles = StyleSheet.create({});
