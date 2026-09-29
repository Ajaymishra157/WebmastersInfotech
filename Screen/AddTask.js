/* eslint-disable prettier/prettier */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Dropdown } from 'react-native-element-dropdown';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutUser from '../Components/LogoutUser';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Entypo from 'react-native-vector-icons/Entypo';
import { ENDPOINTS } from '../CommonFile/Constant';

const AddTask = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { task_id: editTaskId, isEdit, taskData } = route.params || {};
  const isEditMode = !!isEdit;

  const [ProjectModal, setProjectModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [ModuleModal, setModuleModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('Select Project');
  const [selectedModule, setSelectedModule] = useState('Select Module');
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(null);

  const [ProjectNameError, setProjectNameError] = useState('');
  const [ModuleNameError, setModuleNameError] = useState('');
  const [TaskNameError, setTaskNameError] = useState('');
  const [TaskName, setTaskName] = useState('');
  const [Description, setDescription] = useState('');
  const [DescriptionError, setDescriptionError] = useState('');
  const [EstimateError, setEstimateError] = useState('');
  const [Houre, setHour] = useState('');
  const [Min, setMin] = useState('');
  const [memberList, setMemberList] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberPosition, setMemberPosition] = useState('');
  const [searchTexts, setSearchTexts] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [filteredModules, setFilteredModules] = useState([]);
  const [memberError, setMemberError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [noModulesForProject, setNoModulesForProject] = useState(false);

  const isAdmin = memberPosition?.trim().toLowerCase() === 'ceo';
  // 👈 NAYA — Project Manager ko bhi admin jaisa Staff Member selection milega
  const isPM = memberPosition?.trim().toLowerCase() === 'project manager' && !isAdmin;
  const isAdminLevel = isAdmin || isPM;

  // Modules are fetched project-wise from the API, so `modules` is already
  // scoped to whichever project is selected — just apply the search text.
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
      const position = await AsyncStorage.getItem('member_position'); // 👈 NAYA
      setMemberId(id);
      setMemberPosition(position || ''); // 👈 NAYA
    };

    getMemberId();
  }, []);
  // 👇 FIX — pehle project ID resolve karo, uske baad USI project ke modules
  // fetch karke module ID resolve karo. Sequential hone se koi race condition
  // nahi rahegi (pehle wala teen alag effects wala approach isi wajah se fail
  // ho raha tha — display text set ho jaata tha but ID kabhi resolve nahi
  // hoti thi agar timing match na ho).
  useEffect(() => {
    const resolveEditIds = async () => {
      if (!isEditMode || !taskData) return;

      setSelectedProject(taskData.project_name || 'Select Project');
      setSelectedModule(taskData.module_name || 'Select Module');
      setTaskName(taskData.task_name || '');
      setDescription(taskData.task_description || '');

      if (taskData.hours_assigned) {
        const parts = String(taskData.hours_assigned).split(':');
        setHour(parts[0] || '');
        setMin(parts[1] || '');
      }

      if (taskData.user_id) setSelectedMemberId(taskData.user_id);
      if (taskData.member_name) setSelectedMember(taskData.member_name);

      // 1) Project ID resolve karo
      let projId = taskData.project_id || null;
      if (!projId) {
        try {
          const res = await fetch(ENDPOINTS.ListProject, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start_date: '01-01-2000',
              end_date: new Date().toLocaleDateString('en-GB').split('/').join('-'),
            }),
          });
          const result = await res.json();
          if (result.code == 200 && Array.isArray(result.payload)) {
            const match = result.payload.find(
              p => p.project_name?.trim().toLowerCase() === taskData.project_name?.trim().toLowerCase()
            );
            projId = match?.project_id || null;
          }
        } catch (e) {
          console.error('Edit project resolve error:', e);
        }
      }
      setSelectedProjectId(projId);

      // 2) Isi project ke modules laake module ID resolve karo
      if (!projId) return;
      let modId = taskData.module_id || null;
      try {
        const res2 = await fetch(ENDPOINTS.ListModuleProjectWise, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projId }),
        });
        const result2 = await res2.json();
        if (result2.code == 200 && Array.isArray(result2.payload)) {
          if (!modId) {
            const matchM = result2.payload.find(
              m => m.module_name?.trim().toLowerCase() === taskData.module_name?.trim().toLowerCase()
            );
            modId = matchM?.module_id || null;
          }
        }
      } catch (e) {
        console.error('Edit module resolve error:', e);
      }
      setSelectedModuleId(modId);
    };

    resolveEditIds();
  }, [isEditMode, taskData]);

  const ProjectName = async () => {
    const url = ENDPOINTS.ListProject;
    const startDate = '01-01-2000';
    const today = new Date();
    const endDate = today.toLocaleDateString('en-GB').split('/').join('-');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
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
      ProjectName();
    }, []),
  );

  // Fetches modules for a specific project. Backend returns code 400 with
  // no payload when that project has no modules — we treat that as an
  // empty (not an error) state and show "No modules present for this project".
  const ModuleName = async projectId => {
    if (!projectId) {
      setModules([]);
      setNoModulesForProject(false);
      return;
    }

    const url = ENDPOINTS.ListModuleProjectWise;
    setModuleLoading(true);
    setNoModulesForProject(false);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });

      const result = await response.json();

      if (result.code == 200 && Array.isArray(result.payload)) {
        const modulesName = result.payload.map(item => ({
          id: item.module_id,
          name: item.module_name,
        }));
        setModules(modulesName);
        setNoModulesForProject(modulesName.length === 0);
      } else {
        // code 400 / "No Records Found" from the API
        setModules([]);
        setNoModulesForProject(true);
      }
    } catch (error) {
      console.error('API Error:', error);
      setModules([]);
      setNoModulesForProject(true);
    } finally {
      setModuleLoading(false);
    }
  };

  // Re-fetch modules whenever the selected project changes
  useEffect(() => {
    ModuleName(selectedProjectId);
  }, [selectedProjectId]);

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

  const validateForm = () => {
    let isValid = true;

    if (isAdminLevel && !selectedMemberId) {
      setMemberError('Staff member is required');
      isValid = false;
    } else {
      setMemberError('');
    }

    if (!selectedProjectId) {
      setProjectNameError('Project is required');
      isValid = false;
    } else {
      setProjectNameError('');
    }

    if (!selectedModuleId) {
      setModuleNameError('Module is required');
      isValid = false;
    } else {
      setModuleNameError('');
    }

    if (!TaskName || !TaskName.trim()) {
      setTaskNameError('Task name is required');
      isValid = false;
    } else {
      setTaskNameError('');
    }

    if (!Description || !Description.trim()) {
      setDescriptionError('Description is required');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    if (!Houre || !String(Houre).trim()) {
      setEstimateError('Estimated time is required');
      isValid = false;
    } else {
      setEstimateError('');
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const effectiveMemberId = isAdminLevel ? selectedMemberId : memberId;

    const requestBody = {
      project_id: selectedProjectId,
      module_id: selectedModuleId,
      task_name: TaskName,
      task_description: Description,
      hours: Houre,
      minutes: Min,
      user_id: effectiveMemberId,
    };

    if (isEditMode) {
      requestBody.task_id = editTaskId;
      requestBody.updated_by = memberId;
    } else {
      requestBody.created_by = memberId;
    }

    console.log('AddTask Request Body:', requestBody);
    console.log('AddTask Request Body JSON:', JSON.stringify(requestBody));

    try {
      const url = isEditMode ? ENDPOINTS.UpdateTask : ENDPOINTS.AddTask;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();
      console.log('AddTask Response:', result);

      if (result.code == 200) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error adding/updating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModuleModal = () => {
    if (!selectedProjectId) {
      setProjectNameError('Please select a project first');
      return;
    }
    setModuleModal(true);
  };

  return (
    <View style={styles.screen}>
      <LogoutUser />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Image
            source={require('../assets/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Task' : 'Add Task'}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInUp" duration={600} style={styles.animWrap}>
          <View style={styles.card}>
            {/* Staff Member (admin only) */}
            {isAdminLevel && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Staff Member <Text style={styles.asterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selectInput,
                    memberError && styles.inputError,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setMemberModalVisible(true)}>
                  <Text
                    style={[
                      styles.selectInputText,
                      !selectedMember && styles.placeholderText,
                    ]}
                    numberOfLines={1}>
                    {selectedMember || 'Select Staff Member'}
                  </Text>
                  <Entypo name="chevron-down" size={18} color="#6B6E7F" />
                </TouchableOpacity>
                {memberError ? (
                  <Text style={styles.errorText}>{memberError}</Text>
                ) : null}
              </View>
            )}

            {/* Project */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Project Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  ProjectNameError && styles.inputError,
                ]}
                activeOpacity={0.75}
                onPress={() => setProjectModal(true)}>
                <Text
                  style={[
                    styles.selectInputText,
                    selectedProject === 'Select Project' &&
                    styles.placeholderText,
                  ]}
                  numberOfLines={1}>
                  {selectedProject}
                </Text>
                <Entypo name="chevron-down" size={18} color="#6B6E7F" />
              </TouchableOpacity>
              {ProjectNameError ? (
                <Text style={styles.errorText}>{ProjectNameError}</Text>
              ) : null}
            </View>

            {/* Module */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Module Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  ModuleNameError && styles.inputError,
                ]}
                activeOpacity={0.75}
                onPress={openModuleModal}>
                <Text
                  style={[
                    styles.selectInputText,
                    selectedModule === 'Select Module' &&
                    styles.placeholderText,
                  ]}
                  numberOfLines={1}>
                  {selectedModule}
                </Text>
                <Entypo name="chevron-down" size={18} color="#6B6E7F" />
              </TouchableOpacity>
              {ModuleNameError ? (
                <Text style={styles.errorText}>{ModuleNameError}</Text>
              ) : null}
            </View>

            {/* Task Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Task Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.textInputWrap,
                  TaskNameError && styles.inputError,
                ]}>
                <TextInput
                  placeholder="Enter task name"
                  style={styles.textInput}
                  placeholderTextColor="#A3A6B5"
                  value={TaskName}
                  onChangeText={text => {
                    setTaskName(text);
                    if (text.trim()) setTaskNameError('');
                  }}
                />
              </View>
              {TaskNameError ? (
                <Text style={styles.errorText}>{TaskNameError}</Text>
              ) : null}
            </View>

            {/* Task Description (multiline) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Task Description <Text style={styles.asterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.textAreaWrap,
                  DescriptionError && styles.inputError,
                ]}>
                <TextInput
                  placeholder="Enter task description"
                  style={styles.textArea}
                  placeholderTextColor="#A3A6B5"
                  value={Description}
                  onChangeText={text => {
                    setDescription(text);
                    if (text.trim()) setDescriptionError('');
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              {DescriptionError ? (
                <Text style={styles.errorText}>{DescriptionError}</Text>
              ) : null}
            </View>

            {/* Estimated Time */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Estimated Time <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.timeRow}>
                <View
                  style={[
                    styles.timeInputWrap,
                    EstimateError && styles.inputError,
                  ]}>
                  <TextInput
                    placeholder="Hr"
                    style={styles.timeInput}
                    value={Houre}
                    onChangeText={text => {
                      setHour(text);
                      if (text && String(text).trim()) setEstimateError('');
                    }}
                    placeholderTextColor="#A3A6B5"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.timeInputWrap, { marginLeft: 10 }]}>
                  <TextInput
                    placeholder="Min"
                    style={styles.timeInput}
                    value={Min}
                    onChangeText={text => setMin(text)}
                    placeholderTextColor="#A3A6B5"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {EstimateError ? (
                <Text style={styles.errorText}>{EstimateError}</Text>
              ) : null}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={isSubmitting}
              style={[
                styles.submitBtn,
                isSubmitting && styles.submitBtnDisabled,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{isEditMode ? 'Update Task' : 'Add Task'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </ScrollView>

      {/* Project Modal */}
      <Modal
        visible={ProjectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProjectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCloseRow}>
            <TouchableOpacity
              onPress={() => {
                setProjectModal(false);
                setSearchTexts('');
              }}
              style={styles.modalCloseBtn}>
              <Entypo name="cross" size={22} color="#1B1D28" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select a Project</Text>

            <View style={styles.modalSearchWrap}>
              <TextInput
                placeholder="Search Projects..."
                placeholderTextColor="#999"
                style={styles.modalSearchInput}
                value={searchTexts}
                onChangeText={setSearchTexts}
              />
              {searchTexts.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTexts('')}>
                  <FontAwesome name="times-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredProjects}
              keyExtractor={(item, index) => index.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.id === selectedProjectId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalListItem,
                      isSelected && styles.modalListItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedProject(item.name);
                      setSelectedProjectId(item.id);
                      setProjectNameError('');
                      // reset module selection since it belonged to the old project
                      setSelectedModule('Select Module');
                      setSelectedModuleId(null);
                      setModuleNameError('');
                      setProjectModal(false);
                    }}>
                    <Text
                      style={[
                        styles.modalListItemText,
                        isSelected && styles.modalListItemTextSelected,
                      ]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <FontAwesome
                        name="check-circle"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.modalEmptyWrap}>
                  <Image
                    source={require('../assets/project.png')}
                    style={styles.modalEmptyIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.modalEmptyText}>No Project Found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Module Modal */}
      <Modal
        visible={ModuleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModuleModal(false)}>
        <TouchableWithoutFeedback onPress={() => setModuleModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCloseRow}>
              <TouchableOpacity
                onPress={() => {
                  setModuleModal(false);
                  setModuleSearch('');
                }}
                style={styles.modalCloseBtn}>
                <Entypo name="cross" size={22} color="#1B1D28" />
              </TouchableOpacity>
            </View>

            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Select a Module</Text>
                <Text style={styles.modalSubTitle} numberOfLines={1}>
                  For: {selectedProject}
                </Text>

                <View style={[styles.modalSearchWrap, { marginTop: 10 }]}>
                  <TextInput
                    placeholder="Search modules..."
                    placeholderTextColor="#999"
                    value={moduleSearch}
                    onChangeText={setModuleSearch}
                    style={styles.modalSearchInput}
                  />
                  {moduleSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setModuleSearch('')}>
                      <FontAwesome
                        name="times-circle"
                        size={20}
                        color="#999"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {moduleLoading ? (
                  <View style={styles.modalLoaderWrap}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.modalLoaderText}>
                      Loading modules...
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    keyboardShouldPersistTaps="handled"
                    data={filteredModules}
                    keyExtractor={(item, index) => index.toString()}
                    style={{ maxHeight: 250 }}
                    renderItem={({ item }) => {
                      const isSelected = item.id === selectedModuleId;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.modalListItem,
                            isSelected && styles.modalListItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedModule(item.name);
                            setSelectedModuleId(item.id);
                            setModuleNameError('');
                            setModuleModal(false);
                          }}>
                          <Text
                            style={[
                              styles.modalListItemText,
                              isSelected && styles.modalListItemTextSelected,
                            ]}>
                            {item.name}
                          </Text>
                          {isSelected && (
                            <FontAwesome
                              name="check-circle"
                              size={18}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={() => (
                      <View style={styles.modalEmptyWrap}>
                        <Image
                          source={require('../assets/modules2.png')}
                          style={styles.modalEmptyIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.modalEmptyText}>
                          {noModulesForProject
                            ? 'No modules present for this project'
                            : 'No Module Found'}
                        </Text>
                      </View>
                    )}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Staff Member Modal */}
      <Modal
        visible={memberModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMemberModalVisible(false)}
        onShow={fetchMembers}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalCard}>
            <View style={styles.centerModalHeader}>
              <Text style={styles.modalTitle}>Select Staff Member</Text>
              <TouchableOpacity
                onPress={() => setMemberModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Image
                  source={require('../assets/close.png')}
                  style={{ width: 18, height: 18 }}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchWrap, { marginTop: 10 }]}>
              <TextInput
                placeholder="Search by name..."
                value={searchText}
                onChangeText={text => setSearchText(text)}
                placeholderTextColor="#999"
                style={styles.modalSearchInput}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <FontAwesome name="times-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {memberList.filter(
              member =>
                member.status === 'Active' &&
                member.member_name
                  .toLowerCase()
                  .includes(searchText.toLowerCase()),
            ).length === 0 ? (
              <View style={styles.modalEmptyWrap}>
                <Image
                  source={require('../assets/staffweb.png')}
                  style={styles.modalEmptyIcon}
                  resizeMode="contain"
                />
                <Text style={styles.modalEmptyText}>No Staff Found</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {memberList
                  .filter(
                    member =>
                      member.status === 'Active' &&
                      member.member_name
                        .toLowerCase()
                        .includes(searchText.toLowerCase()),
                  )
                  .map(member => {
                    const isSelected = member.member_id === selectedMemberId;
                    return (
                      <TouchableOpacity
                        key={member.member_id}
                        onPress={() => {
                          setSelectedMember(member.member_name);
                          setSelectedMemberId(member.member_id);
                          setMemberError('');
                          setMemberModalVisible(false);
                        }}
                        style={[
                          styles.memberListItem,
                          isSelected && styles.modalListItemSelected,
                        ]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>
                            {member.member_name}
                          </Text>
                          <Text style={styles.memberPosition}>
                            {member.member_position}
                          </Text>
                        </View>
                        {isSelected && (
                          <FontAwesome
                            name="check-circle"
                            size={18}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
export default AddTask;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  header: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
    color: '#fff',
  },
  animWrap: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '95%',
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#1B1D28',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12,
    marginBottom: 6,
  },
  asterisk: {
    color: '#E4453A',
    fontFamily: 'Montserrat-ExtraBold',
  },
  selectInput: {
    width: '100%',
    height: 50,
    borderWidth: 1.2,
    borderColor: '#E2E4EC',
    backgroundColor: '#FAFBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    flex: 1,
    color: '#1B1D28',
    fontFamily: 'SemiBold24',
    fontSize: 13.5,
    marginRight: 8,
  },
  placeholderText: {
    color: '#A3A6B5',
  },
  textInputWrap: {
    width: '100%',
    height: 50,
    borderWidth: 1.2,
    borderColor: '#E2E4EC',
    backgroundColor: '#FAFBFE',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  textInput: {
    fontFamily: 'SemiBold24',
    color: '#1B1D28',
    fontSize: 13.5,
    padding: 0,
  },
  textAreaWrap: {
    width: '100%',
    minHeight: 100,
    borderWidth: 1.2,
    borderColor: '#E2E4EC',
    backgroundColor: '#FAFBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    fontFamily: 'SemiBold24',
    color: '#1B1D28',
    fontSize: 13.5,
    padding: 0,
    minHeight: 80,
  },
  timeRow: {
    flexDirection: 'row',
  },
  timeInputWrap: {
    flex: 1,
    height: 50,
    borderWidth: 1.2,
    borderColor: '#E2E4EC',
    backgroundColor: '#FAFBFE',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  timeInput: {
    fontFamily: 'SemiBold24',
    color: '#1B1D28',
    fontSize: 13.5,
    padding: 0,
  },
  inputError: {
    borderColor: '#E4453A',
    borderWidth: 1.4,
    backgroundColor: '#FFF7F6',
  },
  errorText: {
    color: '#E4453A',
    fontFamily: 'SemiBold24',
    marginTop: 4,
    marginLeft: 2,
    fontSize: 11.5,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    elevation: 3,
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Montserrat-ExtraBold',
    letterSpacing: 0.3,
  },
  // Modal (bottom-sheet) shared styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCloseRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'SemiBold28',
    color: '#1B1D28',
  },
  modalSubTitle: {
    fontSize: 12,
    fontFamily: 'SemiBold24',
    color: '#9A9DAE',
    marginTop: 2,
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E4EC',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: '#FAFBFE',
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    color: '#1B1D28',
    fontFamily: 'SemiBold24',
    fontSize: 13.5,
  },
  modalListItem: {
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#F0F1F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
  },
  modalListItemSelected: {
    backgroundColor: '#F3F4F8',
  },
  modalListItemText: {
    color: '#1B1D28',
    fontFamily: 'SemiBold24',
    fontSize: 13.5,
  },
  modalListItemTextSelected: {
    color: colors.primary,
    fontFamily: 'Montserrat-ExtraBold',
  },
  modalEmptyWrap: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  modalEmptyIcon: {
    width: 56,
    height: 56,
    marginBottom: 10,
    opacity: 0.5,
  },
  modalEmptyText: {
    fontSize: 13.5,
    color: '#9A9DAE',
    fontFamily: 'Montserrat-ExtraBold',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalLoaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalLoaderText: {
    marginTop: 8,
    fontSize: 12.5,
    color: '#9A9DAE',
    fontFamily: 'SemiBold24',
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerModalCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '75%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  centerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberListItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#F0F1F6',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  memberName: {
    fontSize: 14.5,
    color: '#1B1D28',
    fontFamily: 'Montserrat-ExtraBold',
  },
  memberPosition: {
    fontSize: 12,
    color: '#9A9DAE',
    fontFamily: 'SemiBold24',
    marginTop: 1,
  },
});