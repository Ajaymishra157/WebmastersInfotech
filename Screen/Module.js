import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
} from 'react-native';
import colors from '../colors/Colors';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from 'react-native-modal-datetime-picker';
import LogoutUser from '../Components/LogoutUser';
import { ENDPOINTS } from '../CommonFile/Constant';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const Module = () => {
  const navigation = useNavigation();
  const [modalvisible, setModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [ModuleList, setModuleList] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [DeleteModal, setDeleteModal] = useState(false);

  const [isFromDatePickerVisible, setFromDatePickerVisibility] = useState(false);
  const [isTillDatePickerVisible, setTillDatePickerVisibility] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [fromDateDisplay, setFromDateDisplay] = useState('');
  const [tillDateDisplay, setTillDateDisplay] = useState('');

  const [fromDateSelected, setFromDateSelected] = useState(false);
  const [tillDateSelected, setTillDateSelected] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [filteredList, setFilteredList] = useState([]);

  useEffect(() => {
    if (searchText === '') {
      setFilteredList(ModuleList);
    } else {
      const lower = searchText.toLowerCase();

      const filtered = ModuleList
        .map(projectGroup => {
          // project name match → saare modules dikhao
          if (projectGroup.project_name?.toLowerCase().includes(lower)) {
            return projectGroup;
          }

          // nested modules filter karo
          const matchedModules = projectGroup.module?.filter(
            mod =>
              mod.module_name?.toLowerCase().includes(lower) ||
              mod.module_desc?.toLowerCase().includes(lower) ||
              mod.member_name?.toLowerCase().includes(lower)
          );

          if (matchedModules?.length > 0) {
            return { ...projectGroup, module: matchedModules };
          }

          return null; // koi match nahi
        })
        .filter(Boolean); // null hata do

      setFilteredList(filtered);
    }
  }, [searchText, ModuleList]);

  const formatDate = date => {
    if (!(date instanceof Date)) return { display: '', api: '' };
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return { display: `${day}/${month}/${year}`, api: `${year}-${month}-${day}` };
  };

  const formatDateForAPI = date => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB').split('/').join('-');
  };

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formattedFrom = formatDate(firstDay);
    const formattedTill = formatDate(today);
    setFromDate(formattedFrom.api);
    setTillDate(formattedTill.api);
  }, []);
  const handleFromDateConfirm = date => {
    setFromDatePickerVisibility(false);
    const { display, api } = formatDate(date);
    setFromDateDisplay(display);
    setFromDate(api);
    setFromDateSelected(true); // ← add karo
  };

  const handleTillDateConfirm = date => {
    setTillDatePickerVisibility(false);
    const { display, api } = formatDate(date);
    setTillDateDisplay(display);
    setTillDate(api);
    setTillDateSelected(true); // ← add karo
  };
  const ListModule = async () => {
    const url = ENDPOINTS.ListModule;

    // 🔥 ADD KARO - login ke time save hua member_id nikaalo
    const memberId = await AsyncStorage.getItem('member_id');

    const body = {
      project_id: 'All',
      member_id: memberId,
      start_date: fromDate ? formatDateForAPI(fromDate) : '',
      end_date: tillDate ? formatDateForAPI(tillDate) : '',
    };
    try {
      setLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.code === 200) {
        setModuleList(result.payload);
        setCount(parseInt(result.module_count));
      } else {
        setModuleList([]);
        setCount(0);
      }
    } catch (error) {
      setModuleList([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(useCallback(() => { ListModule(); }, []));

  const DeleteModule = async () => {
    setDeleteModal(false);

    try {
      const response = await fetch(ENDPOINTS.DeleteModule, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: selectedModule.module_id,
        }),
      });

      const result = await response.json();

      if (result.code == 200) {
        Toast.show({
          type: 'success',
          text1: 'Module Deleted',
          text2: 'Module has been deleted successfully.',
          position: 'bottom',
          bottomOffset: 80,
          visibilityTime: 2000,
        });

        ListModule();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Delete Failed',
          text2: result.message || 'Unable to delete module.',
          position: 'bottom',
          bottomOffset: 80,
        });
      }
    } catch (error) {
      console.error('Error deleting module:', error);


    }
  };

  // Three dot press → measure position → show modal near it
  const dotRefs = useRef({});

  const dotmodal = (item, moduleId) => {
    setSelectedModule(item);
    const ref = dotRefs.current[moduleId];
    if (ref) {
      ref.measure((fx, fy, w, h, px, py) => {
        setModalPosition({ x: px, y: py });
        setModalVisible(true);
      });
    }
  };

  const opendelete = () => {
    setModalVisible(false);
    setDeleteModal(true);
  };

  const StatusBadge = ({ text, color, bg }) => (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 }}>
      <Text style={{ color, fontSize: 11, fontFamily: 'SemiBold24' }}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F2F5' }}>
      <LogoutUser />

      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../assets/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modules</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countNum}>{count}</Text>
          <Text style={styles.countLabel}>Total</Text>
        </View>
      </View>

      {/* ─── Date Filter Row ─── */}
      <View style={styles.filterCard}>
        {/* From Date */}
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>From Date</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setFromDatePickerVisibility(true)}>
            <Image source={require('../assets/calendar.png')} style={styles.calIcon} />
            <Text style={styles.dateText}>{fromDateDisplay || 'dd/mm/yyyy'}</Text>
          </TouchableOpacity>
        </View>

        {/* Divider arrow */}
        <Text style={{ color: '#aaa', fontSize: 18, marginTop: 20, marginHorizontal: 4 }}>→</Text>

        {/* Till Date */}
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Till Date</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setTillDatePickerVisibility(true)}>
            <Image source={require('../assets/calendar.png')} style={styles.calIcon} />
            <Text style={styles.dateText}>{tillDateDisplay || 'dd/mm/yyyy'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Button */}
        <TouchableOpacity
          onPress={ListModule}
          disabled={!fromDateSelected || !tillDateSelected}
          style={[styles.searchBtn, { opacity: (!fromDateSelected || !tillDateSelected) ? 0.4 : 1 }]}>
          <Image source={require('../assets/Search.png')} style={{ width: 18, height: 18, tintColor: '#fff' }} />
        </TouchableOpacity>
      </View>

      {ModuleList.length > 0 && (
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Image
              source={require('../assets/Search.png')}
              style={{ width: 16, height: 16, tintColor: '#999', marginRight: 8 }}
            />
            <TextInput
              placeholder="Search project or module..."
              placeholderTextColor="#aaa"
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={{ color: '#aaa', fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ─── Date Pickers ─── */}
      <DateTimePicker
        isVisible={isFromDatePickerVisible}
        mode="date"
        onConfirm={handleFromDateConfirm}
        onCancel={() => setFromDatePickerVisibility(false)}
      />
      <DateTimePicker
        isVisible={isTillDatePickerVisible}
        mode="date"
        onConfirm={handleTillDateConfirm}
        onCancel={() => setTillDatePickerVisibility(false)}
        minimumDate={fromDate ? new Date(fromDate) : new Date()}
      />

      {/* ─── List ─── */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: '#aaa', marginTop: 10, fontFamily: 'SemiBold24', fontSize: 13 }}>Loading modules...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {filteredList.length > 0 ? (
            filteredList.map((projectGroup, index) => (
              <Animatable.View key={index} animation="fadeInUp" duration={500} delay={index * 60}>
                {/* Project Header */}
                <View style={styles.projectHeader}>
                  <View style={styles.projectDot} />
                  <Text style={styles.projectName}>{projectGroup.project_name || 'No Project Name'}</Text>
                  <View style={styles.moduleCountPill}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'SemiBold24' }}>
                      {projectGroup.module?.length || 0} modules
                    </Text>
                  </View>
                </View>

                {/* Module Cards */}
                {projectGroup.module?.map((item) => (
                  <View key={item.module_id} style={styles.card}>
                    {/* Top row: name + 3 dots */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Text style={styles.moduleName} numberOfLines={2}>{item.module_name}</Text>
                      <TouchableOpacity
                        ref={ref => { dotRefs.current[item.module_id] = ref; }}
                        onPress={() => dotmodal({ ...item, project_name: projectGroup.project_name }, item.module_id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.dotBtn}>
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                      </TouchableOpacity>
                    </View>

                    {/* Description */}
                    {item.module_desc ? (
                      <Text style={styles.moduleDesc} numberOfLines={2}>{item.module_desc}</Text>
                    ) : (
                      <Text style={[styles.moduleDesc, { color: '#ccc' }]}>No description</Text>
                    )}

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.footerItem}>
                        <Image source={require('../assets/calendar.png')} style={{ width: 12, height: 12, tintColor: '#aaa', marginRight: 4 }} />
                        <Text style={styles.footerText}>{item.module_timestamp || 'N/A'}</Text>
                      </View>
                      <View style={styles.footerItem}>
                        <Text style={styles.footerText}>👤 {item.member_name || 'Unknown'}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Animatable.View>
            ))
          ) : (
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Image source={require('../assets/modules2.png')} style={{ width: 100, height: 100, opacity: 0.3, marginBottom: 16 }} resizeMode="contain" />
              <Text style={{ fontSize: 16, fontFamily: 'SemiBold24', color: '#ccc' }}>No modules found</Text>
              <Text style={{ fontSize: 13, fontFamily: 'SemiBold24', color: '#ddd', marginTop: 6, textAlign: 'center' }}>
                Try a different date range or search term.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── FAB Add Button ─── */}
      <View style={styles.fabWrap}>
        <TouchableOpacity onPress={() => navigation.navigate('AddModule')} style={[styles.fab, { backgroundColor: colors.primary }]}>
          <Image source={require('../assets/add.png')} style={{ width: 18, height: 18, tintColor: '#fff', marginRight: 8 }} />
          <Text style={styles.fabText}>Add Module</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Three Dot Context Modal ─── */}
      {/* ─── Three Dot Context Modal ─── */}
      <Modal
        visible={modalvisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[styles.contextMenu, {
            top: modalPosition.y - 10,
            left: Math.min(modalPosition.x - 120, width - 140),   // 🔥 CHANGE - width ke hisab se position adjust
          }]}>
            <TouchableOpacity
              style={styles.contextItem}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('AddModule', { moduleData: selectedModule });   // 🔥 CHANGE - UpdateModule se AddModule
              }}>
              <Image source={require('../assets/transfer.png')} style={{ width: 14, height: 14, marginRight: 8, tintColor: colors.primary }} />
              <Text style={[styles.contextItemText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contextItem} onPress={opendelete}>
              <Image source={require('../assets/delete.png')} style={{ width: 14, height: 14, marginRight: 8, tintColor: '#EF4444' }} />
              <Text style={[styles.contextItemText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Delete Confirm Modal ─── */}
      <Modal
        visible={DeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal(false)}>
        <View style={styles.deleteOverlay}>
          <Animatable.View animation="zoomIn" duration={250} style={styles.deleteBox}>
            <View style={styles.deleteIconWrap}>
              <Text style={{ fontSize: 28 }}>🗑️</Text>
            </View>
            <Text style={styles.deleteTitle}>Delete Module?</Text>
            <Text style={styles.deleteSubtitle}>
              Are you sure you want to delete{" "}
              <Text style={{ fontFamily: 'Montserrat-ExtraBold', color: '#111827' }}>
                "{selectedModule?.module_name}"
              </Text>
              ?

            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity onPress={() => setDeleteModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={DeleteModule} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

export default Module;

const styles = StyleSheet.create({
  // Header
  header: {
    height: 56,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  backBtn: { padding: 4, marginRight: 10 },
  backIcon: { width: 20, height: 20, tintColor: '#fff' },
  headerTitle: { flex: 1, color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 18 },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  countNum: { color: '#fff', fontFamily: 'Montserrat-ExtraBold', fontSize: 14, lineHeight: 18 },
  countLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: 'SemiBold24' },

  // Filter
  filterCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  dateBlock: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#888', fontFamily: 'SemiBold24', marginBottom: 4 },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
  calIcon: { width: 14, height: 14, tintColor: colors.primary, marginRight: 6 },
  dateText: { fontSize: 12, fontFamily: 'SemiBold24', color: '#333', flex: 1 },
  searchBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 16,
    elevation: 2,
  },

  // Search Row
  searchRow: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'SemiBold24',
    color: '#333',
    fontSize: 13,
    paddingVertical: 0,
  },

  // Project
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  projectName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Montserrat-ExtraBold',
    color: '#1F2937',
  },
  moduleCountPill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  moduleName: {
    fontSize: 15,
    fontFamily: 'SemiBold24',
    color: '#111827',
    flex: 1,
    paddingRight: 8,
  },
  moduleDesc: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'SemiBold24',
    marginTop: 6,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 11, color: '#9CA3AF', fontFamily: 'SemiBold24' },

  // Three dot button
  dotBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
    marginVertical: 1,
  },
  // Context Menu
  // Context Menu
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 120,              // 🔥 CHANGE - 180 se 120
    paddingVertical: 4,      // 🔥 CHANGE - 6 se 4
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,   // 🔥 CHANGE - 16 se 12
    paddingVertical: 9,      // 🔥 CHANGE - 12 se 9
  },
  contextItemText: { fontFamily: 'SemiBold24', fontSize: 13 },   // 🔥 CHANGE - fontSize 14 se 13,
  contextDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 4 },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },


  // FAB
  fabWrap: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabText: { color: '#fff', fontFamily: 'SemiBold24', fontSize: 15 },

  // Delete Modal
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: 280,
    alignItems: 'center',
    elevation: 10,
  },
  deleteIconWrap: {
    width: 64,
    height: 64,
    backgroundColor: '#FEF2F2',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  deleteTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-ExtraBold',
    color: '#111827',
    marginBottom: 8,
  },
  deleteSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'SemiBold24',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: 'SemiBold24', color: '#374151', fontSize: 14 },
  deleteBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontFamily: 'SemiBold24', color: '#fff', fontSize: 14 },
});