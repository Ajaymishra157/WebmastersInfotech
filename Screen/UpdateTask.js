/* eslint-disable prettier/prettier */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
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
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Dropdown } from 'react-native-element-dropdown';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutUser from '../Components/LogoutUser';
import { ENDPOINTS } from '../CommonFile/Constant';

const UpdateTask = ({ route }) => {
  const { taskData } = route.params || {};
  const navigation = useNavigation();
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [ProjectModal, setProjectModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(
    taskData.project_id,
  );
  // console.log("Project Id",selectedProjectId);
  const [ModuleModal, setModuleModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(
    taskData.project_name || '',
  );
  const [selectedModule, setSelectedModule] = useState(
    taskData.module_name || '',
  );
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(taskData.module_id);

  const [ProjectNameError, setProjectNameError] = useState();
  const [ModuleNameError, setModuleNameError] = useState();
  const [TaskNameError, setTaskNameError] = useState();
  const [TaskName, setTaskName] = useState(taskData.task_name);
  // console.log("Task Name",TaskName);
  const [Description, setDescription] = useState(taskData.task_description);
  // console.log("My Description",Description);
  const [DescriptionError, setDescriptionError] = useState();
  const [Houre, setHour] = useState(taskData.assigned_hours);
  // console.log("Houre",Houre);
  const [Min, setMin] = useState(taskData.assigned_minutes);
  // console.log("MIN" ,Min);
  const [memberList, setMemberList] = useState([]);
  const [selectedMember, setSelectedMember] = useState(
    taskData.member_name || '',
  );
  const [selectedMemberId, setSelectedMemberId] = useState(taskData.user_id);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [memberId, setMemberId] = useState([]);
  const [memberPosition, setMemberPosition] = useState('');
  const [searchTexts, setSearchTexts] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [filteredModules, setFilteredModules] = useState(modules);
  const [memberError, setMemberError] = useState('');
  const [TaskId, setTaskId] = useState(taskData.task_id);
  console.log('Task Id', TaskId);

  console.log(
    'All Input data',
    selectedProjectId,
    selectedModuleId,
    selectedMemberId,
    TaskName,
    Description,
    Houre,
    Min,
  );

  console.log('My Task', taskData);

  useEffect(() => {
    if (moduleSearch === '') {
      setFilteredModules(modules);
    } else {
      const filtered = modules.filter(module =>
        module.name.toLowerCase().includes(moduleSearch.toLowerCase()),
      );
      setFilteredModules(filtered);
    }
  }, [moduleSearch, modules]);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTexts.toLowerCase()),
  );

  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      const position = await AsyncStorage.getItem('member_position');
      setMemberId(id);
      setMemberPosition(position || '');
      console.log('Attendance Page Member ID:', id);
    };

    getMemberId();
  }, []);

  console.log('Module ID', selectedModuleId);

  const ProjectName = async () => {
    const url = ENDPOINTS.ListProject;

    // Start date jab se data chahiye (maan lo database 2000 me bana)
    const startDate = '01-01-2000';

    // End date aaj ki date
    const today = new Date();
    const endDate = today.toLocaleDateString('en-GB').split('/').join('-'); // DD-MM-YYYY format

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const result = await response.json();

      if (result.code == 200 && Array.isArray(result.payload)) {
        const projectList = result.payload.map(item => ({
          id: item.project_id,
          name: item.project_name,
        }));
        setProjects(projectList);
      } else {
        console.log('Invalid response');
      }
    } catch (error) {
      console.error('API Error:', error);
    }
  };
  useFocusEffect(
    useCallback(() => {
      ProjectName(); // Jab bhi screen focus me aaye, API chale
    }, []),
  );
  const ModuleName = async () => {
    const url = ENDPOINTS.ListModule;

    // Start date jabse data chahiye
    const startDate = '01-01-2000';

    // End date aaj ki date
    const today = new Date();
    const endDate = today.toLocaleDateString('en-GB').split('/').join('-'); // DD-MM-YYYY

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const result = await response.json();

      if (result.code == 200 && Array.isArray(result.payload)) {
        const modulesName = result.payload.map(item => ({
          id: item.module_id,
          name: item.module_name,
        }));
        setModules(modulesName);
      } else {
        console.log('Invalid response');
      }
    } catch (error) {
      console.error('API Error:', error);
    }
  };
  useFocusEffect(
    useCallback(() => {
      ModuleName(); // Jab bhi screen focus me aaye, API chale
    }, []),
  );

  const AddTask = async () => {
    const url = ENDPOINTS.UpdateTask;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_id: TaskId,
        project_id: selectedProjectId,
        module_id: selectedModuleId,
        task_name: TaskName,
        task_description: Description,
        hours: Houre,
        minutes: Min,
        member_id: selectedMemberId,
      }),
    });
    const result = await response.json();
    console.log('My Result', result);

    if (result.code == 200) {
      navigation.goBack();
    }
  };

  const validation = () => {
    let isValid = true;

    if (!selectedProjectId) {
      setProjectNameError('Project is Required');
      isValid = false;
    } else {
      setProjectNameError('');
    }

    if (!selectedModuleId) {
      setModuleNameError('Module is Required');
      isValid = false;
    } else {
      setModuleNameError('');
    }
    if (!TaskName) {
      setTaskNameError('Task Name is Required');
      isValid = false;
    } else {
      setTaskNameError('');
    }
    if (!Description) {
      setDescriptionError('Description is Required');
      isValid = false;
    } else {
      setDescriptionError('');
    }
    if (!selectedMember) {
      setMemberError('Member is Required');
      isValid = false;
    } else {
      setMemberError('');
    }

    return isValid;
  };

  const handleAdd = () => {
    if (validation()) {
      AddTask();
    }
  };



  const fetchMembers = async () => {
    try {
      const response = await fetch(ENDPOINTS.ListMember);
      const data = await response.json();
      if (data.status) {
        setMemberList(data.payload);
      } else {
        console.warn('Failed to fetch members');
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  return (
    <View style={{ backgroundColor: '#fff', flex: 1 }}>
      <LogoutUser />
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
            marginTop: 5,
          }}>
          Update Task
        </Text>
      </View>
      {memberPosition?.trim().toLowerCase() === 'ceo' ? (
        <ScrollView
          style={{ marginBottom: 5 }}
          keyboardShouldPersistTaps="handled">
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            style={{
              flex: 1,
              width: '100%',
              alignItems: 'center',
              backgroundColor: '#fff',
            }}>
            <View
              style={{ width: '95%', marginTop: 20, backgroundColor: '#fff' }}>
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    marginBottom: 5,
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                  }}>
                  Staff Member <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={{
                    width: '100%',
                    height: 50,
                    borderWidth: 1,
                    borderRadius: 10,
                    justifyContent: 'center',
                  }}
                  onPress={() => setMemberModalVisible(true)}>
                  <Text
                    style={{
                      color: selectedMember ? '#000' : '#000',
                      marginLeft: 10,
                      fontFamily: 'SemiBold24',
                    }}>
                    {selectedMember ? selectedMember : 'Select Staff Member'}
                  </Text>
                </TouchableOpacity>
              </View>
              {memberError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {memberError}
                </Text>
              ) : null}
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
                  }}
                  onPress={() => setProjectModal(true)}>
                  <Text
                    style={{
                      color: '#000',
                      marginLeft: 10,
                      fontFamily: 'SemiBold24',
                    }}>
                    {selectedProject ? selectedProject : 'Select Project'}
                  </Text>
                </TouchableOpacity>
              </View>
              {ProjectNameError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {ProjectNameError}
                </Text>
              ) : null}
              <View>
                <Text
                  style={{
                    marginBottom: 5,
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                    marginTop: 10,
                  }}>
                  Module Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={{
                    width: '100%',
                    height: 50,
                    borderWidth: 1,
                    borderRadius: 10,
                    justifyContent: 'center',
                  }}
                  onPress={() => setModuleModal(true)}>
                  <Text
                    style={{
                      color: '#000',
                      marginLeft: 10,
                      fontFamily: 'SemiBold24',
                    }}>
                    {selectedModule ? selectedModule : 'Select Module'}
                  </Text>
                </TouchableOpacity>
              </View>
              {ModuleNameError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {ModuleNameError}
                </Text>
              ) : null}
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                  }}>
                  Task Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <View
                  style={{
                    width: '100%',
                    minHeight: 50,
                    maxHeight: 100,
                    borderWidth: 1,
                    borderRadius: 10,
                    marginTop: 5,
                  }}>
                  <TextInput
                    placeholder="Task Name"
                    style={{
                      fontFamily: 'SemiBold24',
                      color: '#000',
                      marginLeft: 10,
                    }}
                    placeholderTextColor={'#000'}
                    value={TaskName}
                    onChangeText={text => {
                      setTaskName(text);
                      if (!text) {
                        setTaskNameError('Task is required');
                      } else {
                        setTaskNameError('');
                      }
                    }}
                  />
                </View>
              </View>
              {TaskNameError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {TaskNameError}
                </Text>
              ) : null}
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                  }}>
                  Task Description <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <View
                  style={{
                    width: '100%',
                    minHeight: 50,
                    maxHeight: 100,
                    borderWidth: 1,
                    borderRadius: 10,
                    marginTop: 5,
                  }}>
                  <TextInput
                    placeholder="Task Description"
                    style={{
                      fontFamily: 'SemiBold24',
                      color: '#000',
                      marginLeft: 10,
                    }}
                    placeholderTextColor={'#000'}
                    value={Description}
                    onChangeText={text => {
                      setDescription(text);
                      if (!text) {
                        setDescriptionError('Description is required');
                      } else {
                        setDescriptionError('');
                      }
                    }}
                  />
                </View>
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
              <View style={{ width: '30%', marginLeft: '2.5%' }}>
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    marginTop: 10,
                    marginBottom: 5,
                    color: '#000',
                    fontSize: 12,
                  }}>
                  Estimated Time <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <View
                    style={{
                      width: '100%',
                      borderWidth: 1,
                      flexWrap: 'wrap',
                      minHeight: 50,
                      maxHeight: 100,
                      flexDirection: 'row',
                      borderRadius: 10,
                    }}>
                    <TextInput
                      placeholder="Hr.."
                      style={{
                        width: '80%',
                        fontFamily: 'SemiBold24',
                        color: '#000',
                      }}
                      value={Houre}
                      onChangeText={text => {
                        setHour(text);
                        if (!text) {
                          setDescriptionError('Time is required');
                        } else {
                          setDescriptionError('');
                        }
                      }}
                      placeholderTextColor={'#000'}
                    />
                  </View>
                  <View
                    style={{
                      width: '100%',
                      borderWidth: 1,
                      flexWrap: 'wrap',
                      minHeight: 50,
                      maxHeight: 100,
                      flexDirection: 'row',
                      borderRadius: 10,
                      marginLeft: 10,
                    }}>
                    <TextInput
                      placeholder="Min.."
                      style={{
                        width: '80%',
                        fontFamily: 'SemiBold24',
                        color: '#000',
                      }}
                      value={Min}
                      onChangeText={text => {
                        setMin(text);
                      }}
                      placeholderTextColor={'#000'}
                    />
                  </View>
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
              </View>
              <TouchableOpacity
                onPress={handleAdd}
                style={{
                  width: '100%',
                  height: 50,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  elevation: 5,
                  marginTop: 30,
                  marginBottom: 10,
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#fff',
                    fontFamily: 'Montserrat-ExtraBold',
                  }}>
                  Update Task
                </Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ marginBottom: 20 }}
          keyboardShouldPersistTaps="handled">
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            style={{
              flex: 1,
              width: '100%',
              alignItems: 'center',
              backgroundColor: '#fff',
            }}>
            <View
              style={{ width: '95%', marginTop: 20, backgroundColor: '#fff' }}>
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
                  }}
                  onPress={() => setProjectModal(true)}>
                  <Text
                    style={{
                      color: '#000',
                      marginLeft: 10,
                      fontFamily: 'SemiBold24',
                    }}>
                    {selectedProject} {/* 👈 yahan dikh raha selected */}
                  </Text>
                </TouchableOpacity>
              </View>
              {ProjectNameError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {ProjectNameError}
                </Text>
              ) : null}
              <View>
                <Text
                  style={{
                    marginBottom: 5,
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                    marginTop: 10,
                  }}>
                  Module Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={{
                    width: '100%',
                    height: 50,
                    borderWidth: 1,
                    borderRadius: 10,
                    justifyContent: 'center',
                  }}
                  onPress={() => setModuleModal(true)}>
                  <Text
                    style={{
                      color: '#000',
                      marginLeft: 10,
                      fontFamily: 'SemiBold24',
                    }}>
                    {selectedModule}
                  </Text>
                </TouchableOpacity>
              </View>
              {ModuleNameError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {ModuleNameError}
                </Text>
              ) : null}
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                  }}>
                  Task Name <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <View
                  style={{
                    width: '100%',
                    minHeight: 50,
                    maxHeight: 100,
                    borderWidth: 1,
                    borderRadius: 10,
                    marginTop: 5,
                  }}>
                  <TextInput
                    placeholder="Task Name"
                    style={{
                      fontFamily: 'SemiBold24',
                      color: '#000',
                      marginLeft: 10,
                    }}
                    placeholderTextColor={'#000'}
                    value={TaskName}
                    onChangeText={text => {
                      setTaskName(text);
                      if (!text) {
                        setTaskNameError('Task is required');
                      } else {
                        setTaskNameError('');
                      }
                    }}
                  />
                </View>
              </View>
              {TaskNameError ? (
                <Text
                  style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    marginLeft: 10,
                    fontSize: 12,
                  }}>
                  {TaskNameError}
                </Text>
              ) : null}
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    color: '#000',
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 12,
                  }}>
                  Task Description <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <View
                  style={{
                    width: '100%',
                    minHeight: 50,
                    maxHeight: 100,
                    borderWidth: 1,
                    borderRadius: 10,
                    marginTop: 5,
                  }}>
                  <TextInput
                    placeholder="Task Description"
                    style={{
                      fontFamily: 'SemiBold24',
                      color: '#000',
                      marginLeft: 10,
                    }}
                    placeholderTextColor={'#000'}
                    value={Description}
                    onChangeText={text => {
                      setDescription(text);
                      if (!text) {
                        setDescriptionError('Description is required');
                      } else {
                        setDescriptionError('');
                      }
                    }}
                  />
                </View>
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
              <View style={{ width: '30%', marginLeft: '2.5%' }}>
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    marginTop: 10,
                    marginBottom: 5,
                    color: '#000',
                    fontSize: 12,
                  }}>
                  Estimated Time <Text style={{ color: 'red', fontFamily: 'Montserrat-ExtraBold', }}>*</Text>
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <View
                    style={{
                      width: '100%',
                      borderWidth: 1,
                      flexWrap: 'wrap',
                      minHeight: 50,
                      maxHeight: 100,
                      flexDirection: 'row',
                      borderRadius: 10,
                    }}>
                    <TextInput
                      placeholder="Hr.."
                      style={{
                        width: '80%',
                        fontFamily: 'SemiBold24',
                        color: '#000',
                      }}
                      value={Houre}
                      onChangeText={text => {
                        setHour(text);
                        if (!text) {
                          setDescriptionError('Time is required');
                        } else {
                          setDescriptionError('');
                        }
                      }}
                      placeholderTextColor={'#000'}
                    />
                  </View>
                  <View
                    style={{
                      width: '100%',
                      borderWidth: 1,
                      flexWrap: 'wrap',
                      minHeight: 50,
                      maxHeight: 100,
                      flexDirection: 'row',
                      borderRadius: 10,
                      marginLeft: 10,
                    }}>
                    <TextInput
                      placeholder="Min.."
                      style={{
                        width: '80%',
                        fontFamily: 'SemiBold24',
                        color: '#000',
                      }}
                      value={Min}
                      onChangeText={text => {
                        setMin(text);
                      }}
                      placeholderTextColor={'#000'}
                    />
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleAdd}
                style={{
                  width: '100%',
                  height: 50,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  elevation: 5,
                  marginTop: 30,
                  marginBottom: 10,
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#fff',
                    fontFamily: 'Montserrat-ExtraBold',
                  }}>
                  Update Task
                </Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </ScrollView>
      )}
      <Modal
        visible={ProjectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProjectModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: '100%',
              backgroundColor: '#fff',
              padding: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '80%',
            }}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
                justifyContent: 'space-between',
              }}>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'SemiBold28',
                  color: '#000',
                }}>
                Select a Project
              </Text>
              <TouchableOpacity onPress={() => setProjectModal(false)}>
                <Image
                  source={require('../assets/close.png')}
                  style={{ width: 18, height: 18, tintColor: '#000' }}
                />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View
              style={{
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 10,
                paddingHorizontal: 10,
                alignItems: 'center',
                marginBottom: 15,
              }}>
              {/* <Image
                source={require('../assets/search.png')}
                style={{
                  width: 16,
                  height: 16,
                  tintColor: '#666',
                  marginRight: 8,
                }}
              /> */}
              <TextInput
                placeholder="Search Projects..."
                placeholderTextColor="#999"
                style={{ flex: 1, height: 40, color: '#000' }}
                value={searchTexts}
                onChangeText={setSearchTexts}
              />
            </View>

            {/* Project List */}
            <FlatList
              data={filteredProjects}
              keyExtractor={(item, index) => index.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderColor: '#eee',
                  }}
                  onPress={() => {
                    setSelectedProject(item.name);
                    setSelectedProjectId(item.id);
                    setProjectModal(false);
                  }}>
                  <Text style={{ color: '#000', fontFamily: 'SemiBold24' }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>
                  No projects found.
                </Text>
              }
            />

            {/* Close Button */}
          </View>
        </View>
      </Modal>
      <Modal
        visible={ModuleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModuleModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: '100%',
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
              marginTop: '100%',
            }}>
            {/* Header */}
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text
                style={{
                  fontSize: 18,
                  marginBottom: 10,
                  fontFamily: 'SemiBold28',
                  color: '#000',
                }}>
                Select a Module
              </Text>
              <TouchableOpacity onPress={() => setModuleModal(false)}>
                <Image
                  source={require('../assets/close.png')}
                  style={{ width: 18, height: 18, tintColor: '#000' }}
                />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <TextInput
              placeholder="Search modules..."
              placeholderTextColor="#999"
              value={moduleSearch}
              onChangeText={setModuleSearch}
              style={{
                backgroundColor: '#f1f1f1',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 10,
                fontFamily: 'Regular16',
                color: '#000',
              }}
            />

            {/* Module List */}
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={filteredModules}
              keyExtractor={(item, index) => index.toString()}
              style={{ maxHeight: 250 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderColor: '#eee',
                  }}
                  onPress={() => {
                    setSelectedModule(item.name);
                    setSelectedModuleId(item.id);
                    setModuleModal(false);
                  }}>
                  <Text style={{ color: '#000', fontFamily: 'SemiBold24' }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Close Button */}
          </View>
        </View>
      </Modal>
      <Modal
        visible={memberModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMemberModalVisible(false)}
        onShow={fetchMembers}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: '100%',
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 20,
              maxHeight: '80%',
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              marginTop: 150,
            }}>
            {/* Header */}
            <View style={{ width: '100%', flexDirection: 'row' }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  marginBottom: 10,
                  color: '#333',
                }}>
                Select Staff Member
              </Text>
              <View style={{ width: '50%', alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={() => setMemberModalVisible(false)}>
                  <Image
                    source={require('../assets/close.png')}
                    style={{ width: 18, height: 18 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Box */}
            <TextInput
              placeholder="Search by name..."
              value={searchText}
              onChangeText={text => setSearchText(text)}
              placeholderTextColor="#999"
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 15,
                marginBottom: 10,
                fontSize: 15,
                color: '#000',
              }}
            />

            {/* List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {memberList
                .filter(member =>
                  member.member_name
                    .toLowerCase()
                    .includes(searchText.toLowerCase()),
                )
                .map(member => (
                  <TouchableOpacity
                    key={member.member_id}
                    onPress={() => {
                      setSelectedMember(member.member_name);
                      setSelectedMemberId(member.member_id);
                      setMemberModalVisible(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 1,
                      borderColor: '#eee',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          color: '#111',
                          fontWeight: '600',
                        }}>
                        {member.member_name}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#777' }}>
                        {member.member_position}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Cancel Button */}
          </View>
        </View>
      </Modal>
    </View>
  );
};
export default UpdateTask;
