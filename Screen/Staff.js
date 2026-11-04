import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { ENDPOINTS } from '../CommonFile/Constant';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslatedList } from '../src/i18n/useTranslatedList';
import { getLang } from '../src/i18n/autoTranslate';

const AVATAR_COLORS = [
  { bg: '#E4E9FB', text: '#5B6FE0' },
  { bg: '#DCF5E6', text: '#2FA967' },
  { bg: '#FDF0D5', text: '#D6971F' },
  { bg: '#FBE0E0', text: '#E0555F' },
  { bg: '#EBE0FB', text: '#8A5CE0' },
  { bg: '#DFF3F7', text: '#2C9AAE' },
];


const getInitials = name => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getAvatarColor = index => AVATAR_COLORS[index % AVATAR_COLORS.length];

const Staff = () => {
  const navigation = useNavigation();
  const [Staff, setStaff] = useState([]);





  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Deactive'

  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [memberId, setMemberId] = useState(null);
  const [memberPosition, setMemberPosition] = useState('');
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [selectedDeviceMember, setSelectedDeviceMember] = useState(null); // { member_id, member_name, device_id }
  const [resettingDevice, setResettingDevice] = useState(false);

  const ListStaff = async () => {
    const url = ENDPOINTS.ListMember;
    try {
      const response = await fetch(url);
      const result = await response.json();
      if (result.code === 200) {
        setStaff(result.payload || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetDeviceId = async () => {
    if (!selectedDeviceMember) return;
    setResettingDevice(true);
    const url = ENDPOINTS.reset_device; // 👈 apne Constant.js me ye endpoint add/confirm kar lena
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: selectedDeviceMember.member_id,
        }),
      });
      const result = await response.json();
      console.log('Reset Device ID Response:', result);

      if (result.code === 200 && result.status) {
        await ListStaff(); // list refresh taaki device_id updated ho jaaye
        setDeviceModalVisible(false);
      } else {
        console.warn('Failed to reset device id:', result);
      }
    } catch (error) {
      console.error('Reset device id failed:', error);
    } finally {
      setResettingDevice(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      ListStaff();
    }, []),
  );

  useEffect(() => {
    const loadMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      const position = await AsyncStorage.getItem('member_position');
      if (id) setMemberId(id);
      setMemberPosition(position || '');
    };
    loadMemberId();
  }, []);

  const updateStatus = async status => {
    const url = ENDPOINTS.ChangeMemberStatus;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: selectedMemberId,
          status: status,
        }),
      });

      const result = await response.json();
      console.log('Update Status Response:', result);

      if (result.code === 200 && result.status) {
        await ListStaff();
        setModalVisible(false);
      } else {
        console.warn('Unexpected response format:', result);
      }
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  // combined search + status filter (client side, since API doesn't support it yet)
  useEffect(() => {
    let data = [...Staff];

    if (statusFilter !== 'All') {
      data = data.filter(item => item.status === statusFilter);
    }

    if (searchText.trim() !== '') {
      const q = searchText.toLowerCase();
      data = data.filter(
        item =>
          item.member_name?.toLowerCase().includes(q) ||
          item.member_position?.toLowerCase().includes(q) ||
          item.member_mobile?.toLowerCase().includes(q),
      );
    }

    setFilteredStaff(data);
  }, [searchText, Staff, statusFilter]);



  // Staff state ke baad:
  const translatedFilteredStaff = useTranslatedList(filteredStaff, [
    'member_name',
    'member_position',
    'member_city',
  ]);

  console.log(
    'lang:', getLang(),
    '| staff:', Staff?.length,
    '| filtered:', filteredStaff?.length,
    '| translated:', translatedFilteredStaff?.length,
  );

  // ---- client-side stats (API doesn't send counts yet) ----
  const totalStaff = Staff.length;
  const activeCount = Staff.filter(s => s.status === 'Active').length;
  const inactiveCount = Staff.filter(s => s.status === 'Deactive').length;

  const renderItem = ({ item, index }) => {
    const avatarColor = getAvatarColor(index);
    const isActive = item.status !== 'Deactive';

    return (
      <Animatable.View
        animation="fadeInUp"
        duration={500}
        delay={index * 60}
        style={{
          width: '95%',
          marginLeft: '2.5%',
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 14,
          paddingTop: 10,
          marginTop: 12,
          borderWidth: 1,
          borderColor: '#EEF0F5',
          elevation: 2,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          position: 'relative',
        }}>
        {/* STATUS BADGE - top right corner, small */}
        <TouchableOpacity
          onPress={() => {
            setSelectedMemberId(item.member_id);
            setModalVisible(true);
          }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: isActive ? '#DCF5E6' : '#FBE0E0',
            paddingHorizontal: 7,
            paddingVertical: 2.5,
            borderBottomLeftRadius: 10,
            borderTopRightRadius: 14,
            zIndex: 2,
          }}>
          <Text
            style={{
              color: isActive ? '#2FA967' : '#E0555F',
              fontFamily: 'Montserrat-ExtraBold',
              fontSize: 10,
            }}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginTop: 6,
          }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (item.member_image) {
                setSelectedImage(item.member_image);
                setImagePreviewVisible(true);
              }
            }}
            style={{ position: 'relative' }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: avatarColor.bg,
                overflow: 'hidden',
              }}>
              {item.member_image ? (
                <Image
                  source={{ uri: item.member_image }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 15,
                    color: avatarColor.text,
                  }}>
                  {getInitials(item.member_name)}
                </Text>
              )}
            </View>

            <View
              style={{
                width: 11,
                height: 11,
                borderRadius: 6,
                position: 'absolute',
                bottom: 0,
                right: 0,
                borderWidth: 2,
                borderColor: '#fff',
                backgroundColor: isActive ? '#2FA967' : '#E0555F',
              }}
            />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12, marginTop: 2 }}>
            <Text
              style={{
                fontFamily: 'SemiBold24',
                fontWeight: '700',
                fontSize: 15,
                color: '#101223',
                lineHeight: 19,
              }}>
              {item.member_name}
            </Text>
            <Text
              style={{
                fontFamily: 'SemiBold24',
                fontSize: 13,
                color: '#5B6FE0',
                marginTop: 3,
              }}
              numberOfLines={1}>
              {item.member_position}
            </Text>
          </View>
          {/* ARROW - circle design */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('StaffDetails', { member_id: item.member_id })
            }
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#F1F3F9',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
              marginTop: 18,
            }}>
            <FontAwesome name="chevron-right" size={13} color="#5B6FE0" />
          </TouchableOpacity>

          {/* 👈 Sirf admin (member_id === '1') ko dikhega */}
          {memberPosition?.trim().toLowerCase() === 'ceo' && (
            <TouchableOpacity
              onPress={() => {
                setSelectedDeviceMember({
                  member_id: item.member_id,
                  member_name: item.member_name,
                  device_id: item.device_id,
                });
                setDeviceModalVisible(true);
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: '#F1F3F9',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 8,
                marginTop: 18,
              }}>
              <FontAwesome name="mobile-phone" size={16} color="#5B6FE0" />
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderColor: '#F1F2F6',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 14,
              marginBottom: 4,
              maxWidth: '100%',
            }}>
            <FontAwesome name="envelope-o" size={13} color="#8A8FA3" />
            <Text
              style={{
                marginLeft: 6,
                fontFamily: 'SemiBold24',
                fontSize: 12.5,
                color: '#555',
              }}
              numberOfLines={1}>
              {item.member_email || '-'}
            </Text>
          </View>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 14,
              marginBottom: 4,
              maxWidth: '100%',
            }}
            onPress={() =>
              item.member_mobile && Linking.openURL(`tel:${item.member_mobile}`)
            }>
            <FontAwesome name="phone" size={14} color="#8A8FA3" />
            <Text
              style={{
                marginLeft: 6,
                fontFamily: 'SemiBold24',
                fontSize: 12.5,
                color: '#555',
              }}>
              {item.member_mobile || '-'}
            </Text>
          </TouchableOpacity>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 14,
              marginBottom: 4,
              maxWidth: '100%',
            }}>
            <FontAwesome name="map-marker" size={14} color="#8A8FA3" />
            <Text
              style={{
                marginLeft: 6,
                fontFamily: 'SemiBold24',
                fontSize: 12.5,
                color: '#555',
              }}>
              {item.member_city || 'Surat'}
            </Text>
          </View>
        </View>
      </Animatable.View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
            marginLeft: '35%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
          }}>
          Staff
        </Text>
      </View>

      {/* Search + Filter */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: '2.5%',
          marginTop: 12,
        }}>
        <View
          style={{
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
            placeholder="Search staff by name, role or phone..."
            placeholderTextColor={'#999'}
            style={{
              flex: 1,
              marginLeft: 8,
              fontFamily: 'SemiBold24',
              color: '#000',
              fontSize: 13,
            }}
            onChangeText={text => setSearchText(text)}
            value={searchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <FontAwesome name="times-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      {/* Compact clickable stats tabs */}
      <View
        style={{
          width: '95%',
          marginLeft: '2.5%',
          marginTop: 10,
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 4,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#EEF0F5',
        }}>

        {/* Total */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setStatusFilter('All')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            paddingHorizontal: 8,
            borderRadius: 10,
            backgroundColor: statusFilter === 'All' ? '#EEF3FF' : 'transparent',
            borderWidth: statusFilter === 'All' ? 1 : 0,
            borderColor: '#D9E4FF',
          }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: '#E8EEFF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6,
            }}>
            <FontAwesome name="users" size={10} color="#4F6EF7" />
          </View>

          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: 'SemiBold24',
                color: '#6B7280',
                textAlign: 'center',
              }}>
              Total
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Montserrat-ExtraBold',
                color: '#111827',
                marginTop: 1,
                textAlign: 'center',
              }}>
              {totalStaff}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Active */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setStatusFilter('Active')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            paddingHorizontal: 8,
            borderRadius: 10,
            marginHorizontal: 4,
            backgroundColor: statusFilter === 'Active' ? '#ECFDF3' : 'transparent',
            borderWidth: statusFilter === 'Active' ? 1 : 0,
            borderColor: '#CDEEDB',
          }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: '#E8F8EE',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6,
            }}>
            <FontAwesome name="check-circle" size={10} color="#23A55A" />
          </View>

          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: 'SemiBold24',
                color: '#6B7280',
                textAlign: 'center',
              }}>
              Active
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Montserrat-ExtraBold',
                color: '#111827',
                marginTop: 1,
                textAlign: 'center',
              }}>
              {activeCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Inactive */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setStatusFilter('Deactive')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            paddingHorizontal: 8,
            borderRadius: 10,
            backgroundColor: statusFilter === 'Deactive' ? '#FEF2F2' : 'transparent',
            borderWidth: statusFilter === 'Deactive' ? 1 : 0,
            borderColor: '#F6D3D6',
          }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: '#FDEBEC',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6,
            }}>
            <FontAwesome name="times-circle" size={10} color="#E0555F" />
          </View>

          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: 'SemiBold24',
                color: '#6B7280',
                textAlign: 'center',
              }}>
              Inactive
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Montserrat-ExtraBold',
                color: '#111827',
                marginTop: 1,
                textAlign: 'center',
              }}>
              {inactiveCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      {/* List */}
      <FlatList
        data={translatedFilteredStaff}
        keyExtractor={(item, index) =>
          item.member_id ? item.member_id.toString() : index.toString()
        }
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 4 }}
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
            No staff found
          </Text>
        }
      />
      <TouchableOpacity
        onPress={() => navigation.navigate('AddStaff')}
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
          Add Staff
        </Text>
      </TouchableOpacity>

      {/* Change Status Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
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
                  width: '80%',
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 20,
                }}>
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 16,
                    color: '#000',
                    marginBottom: 14,
                    textAlign: 'center',
                  }}>
                  Change Status
                </Text>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    borderRadius: 10,
                    marginVertical: 5,
                    backgroundColor: '#DCF5E6',
                  }}
                  onPress={() => updateStatus('Active')}>
                  <FontAwesome name="check-circle" size={16} color="#2FA967" />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 14,
                      color: '#2FA967',
                    }}>
                    Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    borderRadius: 10,
                    marginVertical: 5,
                    backgroundColor: '#FBE0E0',
                  }}
                  onPress={() => updateStatus('Deactive')}>
                  <FontAwesome name="times-circle" size={16} color="#E0555F" />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 14,
                      color: '#E0555F',
                    }}>
                    Deactive
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    marginTop: 14,
                    alignSelf: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 20,
                  }}>
                  <Text
                    style={{
                      color: 'red',
                      fontFamily: 'SemiBold24',
                      fontSize: 14,
                    }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Filter Modal */}
      {/* <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
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
                  width: '80%',
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 20,
                }}>
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 16,
                    color: '#000',
                    marginBottom: 14,
                    textAlign: 'center',
                  }}>
                  Filter Staff
                </Text>

                {['All', 'Active', 'Deactive'].map(option => {
                  const isSelected = statusFilter === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setStatusFilter(option);
                        setFilterModalVisible(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        borderBottomWidth: 1,
                        borderColor: '#f0f0f0',
                        ...(isSelected && {
                          backgroundColor: '#f5f8ff',
                          borderRadius: 8,
                        }),
                      }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: isSelected
                            ? 'Montserrat-ExtraBold'
                            : 'SemiBold24',
                          color: isSelected ? colors.primary : '#000',
                        }}>
                        {option === 'Deactive' ? 'Inactive' : option}
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
                  <Text
                    style={{
                      color: 'red',
                      fontFamily: 'SemiBold24',
                      fontSize: 14,
                    }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal> */}

      <Modal
        visible={imagePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setImagePreviewVisible(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 20,
            }}>
            <TouchableWithoutFeedback>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 260,
                    height: 260,
                    borderRadius: 130,
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                    borderWidth: 4,
                    borderColor: '#fff',
                  }}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>

                <TouchableOpacity
                  onPress={() => setImagePreviewVisible(false)}
                  style={{
                    marginTop: 20,
                    backgroundColor: '#fff',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}>
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: 'Montserrat-ExtraBold',
                      fontSize: 14,
                    }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Reset Device ID Modal */}
      <Modal
        visible={deviceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeviceModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setDeviceModalVisible(false)}>
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
                  width: '82%',
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 20,
                }}>
                <Text
                  style={{
                    fontFamily: 'Montserrat-ExtraBold',
                    fontSize: 16,
                    color: '#000',
                    textAlign: 'center',
                  }}>
                  Reset Device ID
                </Text>

                <Text
                  style={{
                    fontFamily: 'SemiBold24',
                    fontSize: 13,
                    color: '#666',
                    textAlign: 'center',
                    marginTop: 6,
                  }}>
                  {selectedDeviceMember?.member_name}
                </Text>

                <View
                  style={{
                    backgroundColor: '#F7F8FB',
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    marginTop: 14,
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontSize: 11, fontFamily: 'SemiBold24', color: '#8A8FA3' }}>
                    Device ID
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: 'Montserrat-ExtraBold',
                      color: '#101223',
                      marginTop: 4,
                    }}>
                    {selectedDeviceMember?.device_id || '--'}
                  </Text>
                </View>

                <Text
                  style={{
                    fontFamily: 'SemiBold24',
                    fontSize: 13,
                    color: '#333',
                    textAlign: 'center',
                    marginTop: 16,
                  }}>
                  Are you sure you want to reset device id?
                </Text>

                <View style={{ flexDirection: 'row', marginTop: 18 }}>
                  <TouchableOpacity
                    onPress={() => setDeviceModalVisible(false)}
                    disabled={resettingDevice}
                    style={{
                      flex: 1,
                      height: 42,
                      backgroundColor: '#9CA3AF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      marginRight: 8,

                    }}>
                    <Text style={{ color: '#fff', fontFamily: 'SemiBold28' }}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={resetDeviceId}
                    disabled={resettingDevice}
                    style={{
                      flex: 1,
                      height: 42,
                      backgroundColor: '#5B6FE0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      marginLeft: 8,
                    }}>
                    {resettingDevice ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontFamily: 'SemiBold28' }}>Yes</Text>
                    )}
                  </TouchableOpacity>


                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default Staff;