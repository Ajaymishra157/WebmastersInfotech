import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import * as Animatable from 'react-native-animatable';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { ENDPOINTS } from '../CommonFile/Constant';

const AVATAR_COLORS = [
  { bg: '#7C3AED' },
  { bg: '#F97316' },
  { bg: '#10B981' },
  { bg: '#3B82F6' },
  { bg: '#EC4899' },
  { bg: '#14B8A6' },
];

const getInitials = name => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getAvatarColor = index => AVATAR_COLORS[index % AVATAR_COLORS.length];

const getStatusStyle = status => {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return { bg: '#DCF5E6', text: '#2FA967' };
    case 'upcoming':
      return { bg: '#FDF0D5', text: '#D6971F' };
    case 'completed':
      return { bg: '#E4E9FB', text: '#5B6FE0' };
    case 'deactive':
    case 'inactive':
      return { bg: '#FBE0E0', text: '#E0555F' };
    default:
      return { bg: '#EEE', text: '#777' };
  }
};

const formatDisplayDate = dateStr => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const Project = () => {
  const navigation = useNavigation();
  const [modalvisible, setModalVisible] = useState(false);
  const [ProjectList, setProjectList] = useState([]);
  const [ProjectId, setProjectId] = useState(null);
  const [UpdateProjects, setUpdateProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [DeleteModal, setDeleteModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Active | Upcoming | Completed
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [tillDate, setTillDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatApi = d => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${year}-${month}-${day}`;
    };
    setFromDate(formatApi(firstDay));
    setTillDate(formatApi(today));
  }, []);

  const fetchProject = async () => {
    const url = ENDPOINTS.ListProject;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDate = new Date(year, month, 1);
    const formatDate = date => date.toLocaleDateString('en-GB').split('/').join('-');
    const start = fromDate || formatDate(firstDate);
    const end = tillDate || formatDate(today);

    try {
      setLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: start, end_date: end }),
      });

      const result = await response.json();
      if (result.code === 200) {
        setProjectList(result.payload || []);
        setCount(parseInt(result.project_count) || 0);
      } else {
        setProjectList([]);
        setCount(0);
      }
    } catch (error) {
      console.error('Error fetching project list:', error);
      setProjectList([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProject();
    }, []),
  );

  const dotmodal = data => {
    setProjectId(data.project_id);
    setUpdateProjects(data);
    setModalVisible(true);
  };

  const Update = () => {
    setModalVisible(false);
    navigation.navigate('AddProject', { projectData: projectData });
  };

  const deleteModalOpen = () => {
    setModalVisible(false);
    setDeleteModal(true);
  };

  const DeleteProject = async () => {
    setDeleteModal(false);
    setLoading(true);
    const url = ENDPOINTS.DeleteProject;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: ProjectId }),
      });
      const result = await response.json();
      if (result.code == 200) {
        fetchProject();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // ---- filtering (search + status) ----
  const filteredProjects = ProjectList.filter(item => {
    const status = (item.project_status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Deactive'
        ? (status === 'deactive' || status === 'inactive')
        : status === statusFilter.toLowerCase());

    const q = searchText.toLowerCase();
    const matchesSearch =
      !q ||
      item.project_name?.toLowerCase().includes(q) ||
      item.project_client_name?.toLowerCase().includes(q) ||
      item.project_domain_name?.toLowerCase().includes(q) ||
      item.project_contact?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });


  // ---- stats (client-side, since API sends overall count only) ----
  const totalCount = ProjectList.length;
  const activeCount = ProjectList.filter(
    p => (p.project_status || '').toLowerCase() === 'active',
  ).length;
  // 🔥 REPLACE KARO upcomingCount ki jagah
  const deactiveCount = ProjectList.filter(
    p => {
      const s = (p.project_status || '').toLowerCase();
      return s === 'deactive' || s === 'inactive';
    }
  ).length;
  const completedCount = ProjectList.filter(
    p => (p.project_status || '').toLowerCase() === 'completed',
  ).length;

  const renderItem = ({ item, index }) => {
    const avatarColor = getAvatarColor(index);
    const statusStyle = getStatusStyle(item.project_status);
    const dateRange =
      item.project_start_date && item.project_end_date
        ? `${formatDisplayDate(item.project_start_date)}  —  ${formatDisplayDate(
          item.project_end_date,
        )}`
        : null;
    const cityState = [item.project_client_city, item.project_client_state]
      .filter(Boolean)
      .join(', ');

    const statusDotColor = (() => {
      const s = (item.project_status || '').toLowerCase();
      if (s === 'active') return '#2FA967';
      if (s === 'upcoming') return '#D6971F';
      if (s === 'completed') return '#5B6FE0';
      return '#E0555F';
    })();

    const hasContact = item.project_contact && item.project_contact !== '0';
    const amountValue = item.project_total_amount
      ? Number(item.project_total_amount).toLocaleString('en-IN')
      : '0';

    return (
      <Animatable.View
        animation="fadeInUp"
        duration={500}
        delay={index * 60}
        style={{
          width: '95%',
          marginLeft: '2.5%',
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 14,
          paddingTop: 10,
          marginTop: 12,
          elevation: 3,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          position: 'relative',
        }}
        onPress={() =>
          navigation.navigate('ProjectDetails', {
            project_id: item.project_id,
            project_name: item.project_name,
          })
        }>
        {/* STATUS BADGE + AMOUNT - top right corner */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            alignItems: 'flex-end',
            zIndex: 2,
          }}>
          <View
            style={{
              backgroundColor: statusStyle.bg,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderBottomLeftRadius: 10,
              borderTopRightRadius: 16,
            }}>
            <Text
              style={{
                fontFamily: 'Montserrat-ExtraBold',
                fontSize: 10.5,
                color: statusStyle.text,
              }}>
              {item.project_status || '--'}
            </Text>
          </View>
          <Text
            style={{
              marginTop: 5,
              marginRight: 9,
              fontFamily: 'Montserrat-ExtraBold',
              fontSize: 13,
              color: '#101223',
            }}>
            ₹ {amountValue}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginTop: 6,
          }}>
          <View style={{ position: 'relative' }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: avatarColor.bg,
              }}>
              <Text
                style={{
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 15,
                  color: '#fff',
                }}>
                {getInitials(item.project_name)}
              </Text>
            </View>
            <View
              style={{
                width: 11,
                height: 11,
                borderRadius: 6,
                position: 'absolute',
                bottom: -2,
                right: -2,
                borderWidth: 2,
                borderColor: '#fff',
                backgroundColor: statusDotColor,
              }}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 12, marginRight: 60 }}>
            <Text
              style={{
                fontFamily: 'SemiBold24',
                fontWeight: '700',
                fontSize: 15,
                color: '#101223',
              }}
              numberOfLines={1}>
              {item.project_name}
            </Text>

            {(item.project_client_name || hasContact) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Text
                  style={{
                    fontFamily: 'SemiBold24',
                    fontSize: 13,
                    color: '#5B6FE0',
                    flexShrink: 1,
                  }}
                  numberOfLines={1}>
                  {item.project_client_name}
                  {item.project_client_name && hasContact ? ' - ' : ''}
                </Text>
                {hasContact && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${item.project_contact}`)}>
                    <Text
                      style={{
                        fontFamily: 'SemiBold24',
                        fontSize: 13,
                        color: '#5B6FE0',
                        textDecorationLine: 'underline',
                      }}>
                      {item.project_contact}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {cityState ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 3,
                }}>
                <FontAwesome name="map-marker" size={11} color="#8A8FA3" />
                <Text
                  style={{
                    marginLeft: 5,
                    fontFamily: 'SemiBold24',
                    fontSize: 12,
                    color: '#8A8FA3',
                  }}
                  numberOfLines={1}>
                  {cityState}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderColor: '#F1F2F6',
          }}>
          <View style={{ flex: 1 }}>
            {dateRange ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <FontAwesome name="calendar" size={12} color="#8A8FA3" />
                <Text
                  style={{
                    marginLeft: 6,
                    fontFamily: 'SemiBold24',
                    fontSize: 12,
                    color: '#8A8FA3',
                  }}>
                  {dateRange}
                </Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ProjectDetails', {
                project_id: item.project_id,
                project_name: item.project_name,
              })
            }
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#F1F3F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <FontAwesome name="chevron-right" size={14} color="#5B6FE0" />
          </TouchableOpacity>
        </View>
      </Animatable.View>
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F8FB' }}>
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
            marginLeft: '33%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
          }}>
          Project
        </Text>
      </View>



      {/* Search */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: '2.5%',
        marginTop: 12,
      }}>
        <View style={{
          flex: 1,
          height: 48,
          borderWidth: 1,
          borderColor: '#E3E5EC',
          borderRadius: 12,
          backgroundColor: '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
        }}>
          <FontAwesome name="search" size={15} color="#999" />
          <TextInput
            placeholder="Search projects, client, domain..."
            placeholderTextColor={'#999'}
            style={{
              flex: 1,
              marginLeft: 8,
              fontFamily: 'SemiBold24',
              color: '#000',
              fontSize: 13,
            }}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <FontAwesome name="times-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={{
          width: '95%',
          marginLeft: '2.5%',
          marginTop: 10,
          backgroundColor: '#fff',
          borderRadius: 12,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          borderWidth: 1,
          borderColor: '#EEF0F5',
        }}>

        {/* Total */}
        <TouchableOpacity
          onPress={() => setStatusFilter('All')}
          style={{
            alignItems: 'center',
            flex: 1,
            paddingVertical: 4,
            backgroundColor: statusFilter === 'All' ? '#F1F3FF' : 'transparent',
            borderRadius: 8,
          }}>
          <FontAwesome name="briefcase" size={12} color="#5B6FE0" />
          <Text style={{ fontSize: 9, fontFamily: 'SemiBold24', color: '#5B6FE0', marginTop: 1 }}>
            Total
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Montserrat-ExtraBold', color: '#000', marginTop: 1 }}>
            {totalCount || count}
          </Text>
        </TouchableOpacity>

        <View style={{ width: 1, height: 24, backgroundColor: '#EEF0F5' }} />

        {/* Active */}
        <TouchableOpacity
          onPress={() => setStatusFilter('Active')}
          style={{
            alignItems: 'center',
            flex: 1,
            paddingVertical: 4,
            backgroundColor: statusFilter === 'Active' ? '#E9F9EF' : 'transparent',
            borderRadius: 8,
          }}>
          <FontAwesome name="check-circle" size={12} color="#2FA967" />
          <Text style={{ fontSize: 9, fontFamily: 'SemiBold24', color: '#2FA967', marginTop: 1 }}>
            Active
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Montserrat-ExtraBold', color: '#000', marginTop: 1 }}>
            {activeCount}
          </Text>
        </TouchableOpacity>

        <View style={{ width: 1, height: 24, backgroundColor: '#EEF0F5' }} />

        {/* 🔥 Deactive — Upcoming ki jagah */}
        <TouchableOpacity
          onPress={() => setStatusFilter('Deactive')}
          style={{
            alignItems: 'center',
            flex: 1,
            paddingVertical: 4,
            backgroundColor: statusFilter === 'Deactive' ? '#FBE9E9' : 'transparent',
            borderRadius: 8,
          }}>
          <FontAwesome name="times-circle" size={12} color="#E0555F" />
          <Text style={{ fontSize: 9, fontFamily: 'SemiBold24', color: '#E0555F', marginTop: 1 }}>
            Deactive
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Montserrat-ExtraBold', color: '#000', marginTop: 1 }}>
            {deactiveCount}
          </Text>
        </TouchableOpacity>

        <View style={{ width: 1, height: 24, backgroundColor: '#EEF0F5' }} />

        {/* Completed */}
        <TouchableOpacity
          onPress={() => setStatusFilter('Completed')}
          style={{
            alignItems: 'center',
            flex: 1,
            paddingVertical: 4,
            backgroundColor: statusFilter === 'Completed' ? '#EEF0FF' : 'transparent',
            borderRadius: 8,
          }}>
          <FontAwesome name="check-circle" size={12} color="#5B6FE0" />
          <Text style={{ fontSize: 9, fontFamily: 'SemiBold24', color: '#5B6FE0', marginTop: 1 }}>
            Completed
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Montserrat-ExtraBold', color: '#000', marginTop: 1 }}>
            {completedCount}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item, index) => `${item.project_id}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 90, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text
              style={{
                textAlign: 'center',
                marginTop: 40,
                color: '#999',
                fontFamily: 'SemiBold24',
              }}>
              No projects found
            </Text>
          }
        />
      )}

      {/* Add Project Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('AddProject')}
        style={{
          position: 'absolute',
          bottom: 18,
          alignSelf: 'center',
          backgroundColor: colors.primary,
          borderRadius: 30,
          paddingHorizontal: 22,
          paddingVertical: 13,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.22,
          shadowRadius: 5,
          zIndex: 999,
        }}>
        <FontAwesome name="plus" size={16} color="#fff" />
        <Text
          style={{
            color: '#fff',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 14,
            marginLeft: 8,
          }}>
          Add Project
        </Text>
      </TouchableOpacity>

      {/* Action Modal (Update / Delete) */}
      <Modal
        visible={modalvisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <View
              style={{
                position: 'absolute',
                top: 90,
                right: 15,
              }}>
              <TouchableWithoutFeedback onPress={() => { }}>
                <View style={{
                  backgroundColor: '#fff',
                  padding: 14,
                  borderRadius: 12,
                  width: 180,
                  elevation: 6,
                }}>
                  <Text style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    color: '#000',
                    fontSize: 13,
                    marginBottom: 10,
                  }}>Choose an action</Text>
                  <TouchableOpacity onPress={Update} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 9,
                  }}>
                    <FontAwesome name="edit" size={16} color="#5B6FE0" />
                    <Text style={{
                      fontFamily: 'SemiBold24',
                      marginLeft: 10,
                      color: '#000',
                      fontSize: 13,
                    }}>Update</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={deleteModalOpen} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 9,
                  }}>
                    <FontAwesome name="trash" size={16} color="#E0555F" />
                    <Text style={{
                      fontFamily: 'SemiBold24',
                      marginLeft: 10,
                      color: '#E0555F',
                      fontSize: 13,
                    }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={DeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal(false)}>
        <TouchableWithoutFeedback onPress={() => setDeleteModal(false)}>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={{
                backgroundColor: '#fff',
                padding: 20,
                borderRadius: 14,
                width: 240,
                alignItems: 'center',
              }}>
                <View style={{
                  width: 36,
                  height: 36,
                  backgroundColor: '#FBE0E0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 18,
                }}>
                  <FontAwesome name="exclamation" size={16} color="#E0555F" />
                </View>
                <Text style={{
                  color: '#000',
                  fontFamily: 'Montserrat-ExtraBold',
                  fontSize: 15,
                  marginTop: 10,
                }}>Delete Confirmation</Text>
                <Text style={{
                  color: '#777',
                  fontFamily: 'SemiBold24',
                  fontSize: 12,
                  marginTop: 4,
                  textAlign: 'center',
                }}>
                  Are you sure you want to delete this project?
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={DeleteProject}
                    style={{
                      width: 90,
                      height: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: '#E0555F',
                    }}>
                    <Text style={{
                      color: '#fff',
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 13,
                    }}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDeleteModal(false)}
                    style={{
                      width: 90,
                      height: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: '#999',
                      marginLeft: 12,
                    }}>
                    <Text style={{
                      color: '#fff',
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 13,
                    }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={{
                width: '80%',
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 18,
              }}>
                <Text style={{
                  fontFamily: 'Montserrat-ExtraBold',
                  color: '#000',
                  fontSize: 13,
                  marginBottom: 10,
                }}>Filter Projects</Text>
                {['All', 'Active', 'Deactive', 'Completed'].map(option => {
                  const isSelected = statusFilter === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setStatusFilter(option);
                        setFilterModalVisible(false);
                      }}
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 8,
                          borderBottomWidth: 1,
                          borderColor: '#f0f0f0',
                        },
                        isSelected && {
                          backgroundColor: '#f5f8ff',
                          borderRadius: 8,
                        },
                      ]}>
                      <Text
                        style={[
                          {
                            fontSize: 14,
                            fontFamily: 'SemiBold24',
                            color: '#000',
                          },
                          isSelected && {
                            color: colors.primary,
                            fontFamily: 'Montserrat-ExtraBold',
                          },
                        ]}>
                        {option}
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
                })}
                <TouchableOpacity
                  onPress={() => setFilterModalVisible(false)}
                  style={{
                    marginTop: 14,
                    alignSelf: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 20,
                  }}>
                  <Text style={{
                    color: 'red',
                    fontFamily: 'SemiBold24',
                    fontSize: 14,
                  }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default Project;