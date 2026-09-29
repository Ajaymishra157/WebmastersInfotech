
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { Dropdown } from 'react-native-element-dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Icon from 'react-native-vector-icons/FontAwesome';
import { ENDPOINTS } from '../CommonFile/Constant';

const UpdateModule = ({ route }) => {

  const { moduleData } = route.params;
  console.log("My Module", moduleData);
  const navigation = useNavigation();
  const [ProjectName, setProjectName] = useState();
  console.log('Project Name', ProjectName);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(
    moduleData.project_name || ''
  );
  const [selectedProjectError, setSelectedProjectError] = useState();
  const [ProjectId, setProjectId] = useState();

  const [Module, setModule] = useState(moduleData.module_name || '');
  const [ModuleErro, setModuleError] = useState();
  const [ModuleDescription, setModuleDescription] = useState(
    moduleData.module_desc || ''
  );
  const [ModuleId, setModuleId] = useState(moduleData.module_id);
  const [ModuleDescriptioError, setModuleDescriptionError] = useState();
  const [memberId, setMemberId] = useState([]);

  const [searchText, setSearchText] = useState('');
  const [filteredProjects, setFilteredProjects] = useState(ProjectName);

  useEffect(() => {
    if (searchText === '') {
      setFilteredProjects(ProjectName);
    } else {
      const filtered = ProjectName.filter(item =>
        item.project_name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchText, ProjectName]);


  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      setMemberId(id);
      console.log('Attendance Page Member ID:', id);
    };

    getMemberId();
  }, []);

  const ProjectList = async () => {
    const url = ENDPOINTS.ListProject;

    const startDate = '01-01-1970'; // fixed starting date
    const endDate = new Date(); // current date

    // Format date as dd-mm-yyyy
    const formatDate = date => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: formatDate(endDate), // current date
        }),
      });

      const result = await response.json();

      if (result.code == 200) {
        setProjectName(result.payload);
      }
    } catch (error) {
      console.error('Error fetching project list:', error);
    }
  };

  const AddModu = async () => {
    const url = ENDPOINTS.UpdateModule;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module_name: Module,
          module_desc: ModuleDescription,
          project_id: ProjectId,
          created_by_member_id: memberId,
          module_id: ModuleId
        }),
      });

      const result = await response.json();
      console.log('My Reslut', result);

      if (result.code == 200) {
        console.log("My Data", result.payload);
        navigation.goBack();
      }
    } catch (error) { }
  };

  useFocusEffect(
    useCallback(() => {
      ProjectList(); // Jab bhi screen focus me aaye, API chale
    }, []),
  );

  const validation = () => {
    let isValid = true;

    if (!selectedProject) {
      setSelectedProjectError('Project is Required');
      isValid = false;
    } else {
      setSelectedProjectError('');
    }

    if (!Module) {
      setModuleError('Module is Required');
      isValid = false;
    } else {
      setModuleError('');
    }
    if (!ModuleDescription) {
      setModuleDescriptionError('Description is Required');
      isValid = false;
    } else {
      setModuleDescriptionError('');
    }
    return isValid;
  };
  const handleAdd = () => {
    if (validation()) {
      AddModu();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
            marginLeft: '24%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
            marginTop: 5,
          }}>
          Update Module
        </Text>
      </View>
      <ScrollView style={{ marginBottom: 50 }} keyboardShouldPersistTaps='handled'>
        <View
          style={{
            width: '100%',
            alignItems: 'center',
            backgroundColor: '#fff',
          }}>
          <View style={{ width: '95%', marginTop: 20, backgroundColor: '#fff' }}>
            <View>
              <Text
                style={{
                  marginBottom: 5,
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                }}>
                Project Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
              </Text>
              <TouchableOpacity
                style={{
                  width: '100%',
                  height: 50,
                  borderWidth: 1,
                  borderRadius: 10,
                  justifyContent: 'center',
                  paddingLeft: 10,
                }}
                onPress={() => setModalVisible(true)}>
                <Text style={{ color: '#000', fontFamily: 'SemiBold24' }}>
                  {selectedProject || 'Select Project'}
                </Text>
              </TouchableOpacity>

              {selectedProjectError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {selectedProjectError}
                </Text>
              ) : null}
              <Modal
                transparent={true}
                animationType="slide"
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}>
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                  }}>
                  <View style={{ width: '100%', marginTop: '100%' }}>
                    <View style={{ width: '100%', alignItems: 'flex-end' }}>
                      <TouchableOpacity
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                          width: 26,
                          height: 26,
                          backgroundColor: '#fff',
                          marginBottom: 10,
                          borderRadius: 13,
                          elevation: 5,
                        }}
                        onPress={() => setModalVisible(false)}>
                        <Image
                          source={require('../assets/close.png')}
                          style={{ width: 16, height: 16 }}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        width: '100%',
                        backgroundColor: '#fff',
                        borderRadius: 10,
                      }}>

                      <Text
                        style={{
                          color: '#000',
                          fontFamily: 'Montserrat-ExtraBold',
                          marginLeft: 10,
                          marginTop: 10,
                          marginBottom: 10,
                        }}>
                        Please Select The Project
                      </Text>


                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#ccc',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          marginHorizontal: 10,
                          marginBottom: 10,
                          backgroundColor: '#fff',
                        }}>
                        <Icon name="search" size={20} color="#888" style={{ marginRight: 8 }} />
                        <TextInput
                          placeholder="Search Project"
                          value={searchText}
                          onChangeText={setSearchText}
                          style={{
                            flex: 1,
                            fontFamily: 'SemiBold24',
                            color: '#000',
                            paddingVertical: 8,
                          }}
                          placeholderTextColor="#888"
                        />
                      </View>
                      <View
                        style={{
                          width: '90%',
                          marginLeft: '5%',
                          marginBottom: '50%',
                        }}>
                        <FlatList
                          data={filteredProjects}
                          keyExtractor={item => item.project_id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedProject(item.project_name); // show on UI
                                setProjectId(item.project_id); // send to API
                                setModalVisible(false);
                              }}
                              style={{ padding: 10, borderBottomWidth: 1, borderColor: '#ccc' }}>
                              <Text style={{ color: '#000', fontFamily: 'SemiBold24' }}>
                                {item.project_name}
                              </Text>
                            </TouchableOpacity>
                          )}
                          contentContainerStyle={{
                            paddingBottom: 50
                          }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
            <View style={{ marginTop: 10 }}>
              <Text
                style={{
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  color: '#000',
                }}>
                Module Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
              </Text>
              <View
                style={{
                  width: '100%',
                  height: 50,
                  borderWidth: 1,
                  borderRadius: 10,
                  marginTop: 5,
                }}>
                <TextInput
                  placeholder="Module Name"
                  placeholderTextColor={'#000'}
                  style={{
                    color: '#000',
                    fontFamily: 'SemiBold24',
                    width: '85%',
                  }}
                  value={Module}
                  onChangeText={text => {
                    setModule(text);
                    if (!text) {
                      setModuleError('Module is required');
                    } else {
                      setModuleError('');
                    }
                  }}></TextInput>
              </View>
              {ModuleErro ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {ModuleErro}
                </Text>
              ) : null}
            </View>
            <View style={{ marginTop: 10 }}>
              <Text
                style={{
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 12,
                  color: '#000',
                }}>
                Module Description <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
              </Text>
              <View
                style={{
                  width: '100%',
                  height: 50,
                  borderWidth: 1,
                  borderRadius: 10,
                  marginTop: 5,
                }}>
                <TextInput
                  placeholder="Description"
                  placeholderTextColor={'#000'}
                  style={{
                    color: '#000',
                    fontFamily: 'SemiBold24',
                    width: '85%',
                  }}
                  value={ModuleDescription}
                  onChangeText={text => {
                    setModuleDescription(text);
                    if (!text) {
                      setModuleDescriptionError('Description is required');
                    } else {
                      setModuleDescriptionError('');
                    }
                  }}></TextInput>
              </View>
              {ModuleDescriptioError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {ModuleDescriptioError}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={{
                width: '100%',
                height: 50,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 30,
                borderRadius: 10,
              }}
              onPress={handleAdd}>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: 'Montserrat-ExtraBold',
                  color: '#fff',
                }}>
                save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default UpdateModule;

const styles = StyleSheet.create({});
