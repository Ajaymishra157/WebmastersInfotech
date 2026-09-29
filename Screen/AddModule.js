import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import colors from '../colors/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import LogoutUser from '../Components/LogoutUser';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/Ionicons';
import { ENDPOINTS } from '../CommonFile/Constant';
import Toast from 'react-native-toast-message';

const showToast = (msg) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
};

const AddModule = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // 🔥 ADD KARO - agar moduleData aaya hai to Edit mode, warna Add mode
  const moduleData = route?.params?.moduleData || null;
  const isEditMode = !!moduleData;

  const [ProjectName, setProjectName] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(moduleData?.project_name || null);
  const [selectedProjectError, setSelectedProjectError] = useState('');
  const [ProjectId, setProjectId] = useState(moduleData?.project_id || null);

  const [Module, setModule] = useState(moduleData?.module_name || '');
  const [ModuleError, setModuleError] = useState('');
  const [ModuleDescription, setModuleDescription] = useState(moduleData?.module_desc || '');
  const [ModuleDescriptionError, setModuleDescriptionError] = useState('');
  const [memberId, setMemberId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filteredProjectList, setFilteredProjectList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      setMemberId(id);
    };
    getMemberId();
  }, []);

  const ProjectList = async () => {
    const url = ENDPOINTS.ListProject;
    const startDate = '01-01-1970';
    const endDate = new Date();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: formatDate(endDate) }),
      });
      const result = await response.json();
      if (result.code == 200) {
        setProjectName(result.payload);
        setFilteredProjectList(result.payload);
      }
    } catch (error) {
      console.error('Error fetching project list:', error);
    }
  };

  // 🔥 ADD - Add aur Update dono ke liye ek hi function, endpoint switch hoga
  const SaveModule = async () => {
    const url = isEditMode ? ENDPOINTS.UpdateModule : ENDPOINTS.AddModule;
    setLoading(true);

    try {
      const body = isEditMode
        ? {
          module_name: Module,
          module_desc: ModuleDescription,
          project_id: ProjectId,
          created_by_member_id: memberId,
          module_id: moduleData.module_id,
        }
        : {
          module_name: Module,
          module_desc: ModuleDescription,
          project_id: ProjectId,
          member_id: memberId,
        };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.code == 200) {
        Toast.show({
          type: 'success',
          text1: isEditMode ? 'Module Updated' : 'Module Added',
          text2: isEditMode
            ? 'Module updated successfully.'
            : 'Module added successfully.',
          position: 'bottom',
          bottomOffset: 80,
          visibilityTime: 2000,
        });

        setTimeout(() => navigation.goBack(), 800);
      } else {
        Toast.show({
          type: 'error',
          text1: isEditMode ? 'Update Failed' : 'Add Failed',
          text2: result.message || 'Please try again.',
          position: 'bottom',
          bottomOffset: 80,
        });
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { ProjectList(); }, []));

  const validation = () => {
    let isValid = true;
    if (!selectedProject) {
      setSelectedProjectError('Project is required');
      isValid = false;
    } else {
      setSelectedProjectError('');
    }
    if (!Module.trim()) {
      setModuleError('Module name is required');
      isValid = false;
    } else {
      setModuleError('');
    }
    if (!ModuleDescription.trim()) {
      setModuleDescriptionError('Description is required');
      isValid = false;
    } else {
      setModuleDescriptionError('');
    }
    return isValid;
  };

  const handleAdd = () => {
    if (validation()) SaveModule();
  };

  useEffect(() => {
    if (!ProjectName) return;
    if (searchText === '') {
      setFilteredProjectList(ProjectName);
    } else {
      const filtered = ProjectName.filter(item =>
        item.project_name.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredProjectList(filtered);
    }
  }, [searchText, ProjectName]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F2F5' }}>
      <LogoutUser />

      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../assets/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        {/* 🔥 CHANGE - title dynamic */}
        <Text style={styles.headerTitle}>{isEditMode ? 'Update Module' : 'Add Module'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Animatable.View animation="fadeInUp" duration={500} style={styles.card}>

          {/* ── Project Name ── */}
          <Text style={styles.label}>Project Name <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.inputBox, selectedProjectError ? styles.inputError : null]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}>
            <Text style={[styles.inputText, !selectedProject && { color: '#aaa' }]}>
              {selectedProject || 'Select Project'}
            </Text>
            <Icon2
              name={modalVisible ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#999"
            />
          </TouchableOpacity>
          {selectedProjectError ? <Text style={styles.errorText}>{selectedProjectError}</Text> : null}

          {/* ── Module Name ── */}
          <Text style={[styles.label, { marginTop: 16 }]}>Module Name <Text style={styles.required}>*</Text></Text>
          <View style={[styles.inputBox, ModuleError ? styles.inputError : null]}>
            <TextInput
              placeholder="Enter module name"
              placeholderTextColor="#aaa"
              style={styles.textInput}
              value={Module}
              onChangeText={text => {
                setModule(text);
                if (text.trim()) setModuleError('');
              }}
            />
          </View>
          {ModuleError ? <Text style={styles.errorText}>{ModuleError}</Text> : null}

          {/* ── Module Description ── */}
          <Text style={[styles.label, { marginTop: 16 }]}>Module Description <Text style={styles.required}>*</Text></Text>
          <View style={[styles.inputBox, styles.multilineBox, ModuleDescriptionError ? styles.inputError : null]}>
            <TextInput
              placeholder="Enter description"
              placeholderTextColor="#aaa"
              style={[styles.textInput, { textAlignVertical: 'top' }]}
              value={ModuleDescription}
              multiline={true}
              numberOfLines={4}
              onChangeText={text => {
                setModuleDescription(text);
                if (text.trim()) setModuleDescriptionError('');
              }}
            />
          </View>
          {ModuleDescriptionError ? <Text style={styles.errorText}>{ModuleDescriptionError}</Text> : null}

          {/* ── Submit Button ── */}
          <TouchableOpacity
            style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleAdd}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              // 🔥 CHANGE - button text dynamic
              <Text style={styles.submitText}>{isEditMode ? 'Update Module' : 'Add Module'}</Text>
            )}
          </TouchableOpacity>

        </Animatable.View>
      </ScrollView>

      {/* ─── Project Select Modal (center) ─── */}
      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <Animatable.View animation="zoomIn" duration={250} style={styles.modalSheet}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Project</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Icon2 name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.modalSearch}>
              <Icon name="search" size={16} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search project..."
                value={searchText}
                onChangeText={setSearchText}
                style={styles.modalSearchInput}
                placeholderTextColor="#aaa"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Icon2 name="close-circle" size={16} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <FlatList
              data={filteredProjectList}
              keyExtractor={item => String(item.project_id)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
              renderItem={({ item }) => {
                const isSelected = item.project_id === ProjectId;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedProject(item.project_name);
                      setProjectId(item.project_id);
                      setSelectedProjectError('');
                      setSearchText('');
                      setModalVisible(false);
                    }}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}>
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {item.project_name}
                    </Text>
                    {isSelected && (
                      <Icon2 name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 30 }}>
                  <Text style={{ color: '#ccc', fontFamily: 'SemiBold24', fontSize: 14 }}>No projects found</Text>
                </View>
              }
            />
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

export default AddModule;

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  backBtn: { padding: 4, marginRight: 10 },
  backIcon: { width: 20, height: 20, tintColor: '#fff' },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  label: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12,
    color: colors.primary,
    marginBottom: 6,
  },
  required: { color: 'red' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    backgroundColor: '#FAFAFA',
  },
  multilineBox: {
    alignItems: 'flex-start',
    paddingVertical: 10,
    minHeight: 100,
  },
  inputError: { borderColor: 'red' },
  inputText: { flex: 1, fontFamily: 'SemiBold24', color: '#111', fontSize: 14 },
  textInput: { flex: 1, fontFamily: 'SemiBold24', color: '#111', fontSize: 14, paddingVertical: 0 },
  errorText: { color: 'red', fontFamily: 'SemiBold24', fontSize: 12, marginTop: 4, marginLeft: 4 },
  submitBtn: {
    height: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: 28,
    elevation: 3,
  },
  submitText: { color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 15 },

  // Modal (center)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 16,
    width: '100%',
    maxHeight: '75%',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalTitle: { flex: 1, fontFamily: 'Montserrat-ExtraBold', fontSize: 16, color: '#111' },
  closeBtn: {
    width: 32, height: 32, backgroundColor: '#F3F4F6', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6',
    borderRadius: 10, paddingHorizontal: 12, height: 42, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  modalSearchInput: { flex: 1, fontFamily: 'SemiBold24', color: '#111', fontSize: 13, paddingVertical: 0 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalItemSelected: {
    backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, borderBottomColor: 'transparent',
  },
  modalItemText: { flex: 1, fontFamily: 'SemiBold24', color: '#374151', fontSize: 14 },
  modalItemTextSelected: { color: colors.primary, fontFamily: 'Montserrat-ExtraBold' },
});