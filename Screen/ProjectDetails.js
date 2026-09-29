/* eslint-disable prettier/prettier */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import colors, { baseUrl } from '../colors/Colors';
import { ENDPOINTS } from '../CommonFile/Constant';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const ProjectDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { project_id, project_name } = route.params || {};
  console.log('Project ID:', project_id, 'Project Name:', project_name);
  const [projectData, setProjectData] = useState([]);
  // const [ProjectId, setProjectId] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Deactive');
  const [DeleteModal, setDeleteModal] = useState(false);
  const [modalvisible, setModalVisible] = useState(false);
  const [UpdateProjects, setUpdateProjects] = useState([]);

  const DeleteProject = async () => {
    setDeleteModal(false);
    setLoading(true);
    const url = ENDPOINTS.DeleteProject;

    try {
      const response = await fetch(url, {
        method: 'Delete',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project_id,
        }),
      });
      const result = await response.json();

      console.log('Delete SuccessFull !', result);

      if (result.code == 200) {
        navigation.goBack();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const deleteModal = () => {
    setDeleteModal(true);
  };

  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(ENDPOINTS.ListSingleProjectDetail, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id }),
      });
      const json = await response.json();
      if (json.code === 200) {
        setProjectData(json.payload[0]);
        setStatus(json.payload[0].project_status); // "Active" or "Deactive"
      } else {
        console.warn('No data found');
      }
    } catch (error) {
      console.error('API Error:', error);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (project_id) {
        fetchProjectDetails();
      }
    }, [project_id]),
  );

  const Update = () => {
    setModalVisible(false);
    navigation.navigate('AddProject', { projectData: projectData });
  };

  const StatusChange = async newStatus => {
    const url = ENDPOINTS.ChangeProjectStatus;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project_id,
          status: newStatus,
        }),
      });
      const result = await response.json();

      if (result.code == 200) {
        console.log('Status changeed');
      }
    } catch (error) { }
  };


  const SmoothStatusToggle = ({ status, onToggle }) => {
    const [isActive, setIsActive] = useState(status === 'Active');
    const animatedValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: isActive ? 1 : 0,
        duration: 250,
        easing: Easing.out(Easing.circle),
        useNativeDriver: false,
      }).start();
    }, [isActive]);

    const translateX = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 24],
    });

    const backgroundColor = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E53935', '#4CAF50'],
    });





    return (
      <TouchableOpacity
        onPress={() => {
          setIsActive(prev => !prev);
          onToggle();
        }}
        activeOpacity={0.8}>
        <Animated.View
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor,
            padding: 2,
            justifyContent: 'center',
          }}>
          <Animated.View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#fff',
              transform: [{ translateX }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 3,
            }}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View
        style={{
          width: '100%',
          height: 55,
          backgroundColor: colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          elevation: 3,
        }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/back.png')}
            style={{ width: 22, height: 22, tintColor: '#fff' }}
          />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
            marginLeft: 20,
          }}>
          {project_name || 'Project Details'}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 30 }}
        />
      ) : projectData ? (
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps='handled'>

          {/* Project Name */}
          <View style={{
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <Text style={{
              fontSize: 13,
              color: colors.primary,
              marginBottom: 4,
              fontFamily: 'Montserrat-ExtraBold',
            }}>
              Project Name
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#111',
              fontFamily: 'SemiBold24',
            }}>
              {projectData.project_name || 'N/A'}
            </Text>
          </View>

          {/* Description */}
          <View style={{
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <Text style={{
              fontSize: 13,
              color: colors.primary,
              marginBottom: 4,
              fontFamily: 'Montserrat-ExtraBold',
            }}>
              Description
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#111',
              fontFamily: 'SemiBold24',
            }}>
              {projectData.project_desc || 'N/A'}
            </Text>
          </View>

          {/* Project Contact & Client Name */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{
              width: '48%',
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
                Project Contact
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
                {projectData.project_contact || 'N/A'}
              </Text>
            </View>

            <View style={{
              width: '48%',
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
                Client Name
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
                {projectData.project_client_name || 'N/A'}
              </Text>
            </View>
          </View>

          {/* City, State, Area */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{
              width: '32%',
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
                City
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
                {projectData.project_client_city || 'N/A'}
              </Text>
            </View>

            <View style={{
              width: '32%',
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
                State
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
                {projectData.project_client_state || 'N/A'}
              </Text>
            </View>

            <View style={{
              width: '32%',
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
                Area
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
                {projectData.project_client_area || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Client Address */}
          <View style={{
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <Text style={{
              fontSize: 13,
              color: colors.primary,
              marginBottom: 4,
              fontFamily: 'Montserrat-ExtraBold',
            }}>
              Client Address
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#111',
              fontFamily: 'SemiBold24',
            }}>
              {projectData.project_client_address || 'N/A'}
            </Text>
          </View>

          {/* Start Date & End Date */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{
              width: '48%',
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
                Start Date
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
                {projectData.project_start_date
                  ? projectData.project_start_date.split('-').reverse().join('-')
                  : 'N/A'}
              </Text>
            </View>

            <View style={{
              width: '48%',
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{
                fontSize: 13,
                color: colors.primary,
                marginBottom: 4,
                fontFamily: 'Montserrat-ExtraBold',
              }}>
                End Date
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#111',
                fontFamily: 'SemiBold24',
              }}>
                {projectData.project_end_date === '0000-00-00' || !projectData.project_end_date
                  ? 'N/A'
                  : formatDate(projectData.project_end_date)}
              </Text>
            </View>
          </View>

          {/* Status Block */}
          <View style={{
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}>

            <View style={{ flexDirection: 'row', width: '100%' }}>
              {/* Edit & Delete buttons */}
              <View style={{ flexDirection: 'row', width: '66%' }}>
                <TouchableOpacity
                  onPress={Update}
                  style={{
                    width: '50%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Image
                    source={require('../assets/edit.png')}
                    style={{
                      width: 20,
                      height: 20,
                      tintColor: colors.primary,
                    }}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={deleteModal}
                  style={{
                    width: '50%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Image
                    source={require('../assets/delete.png')}
                    style={{
                      width: 20,
                      height: 20,
                      tintColor: colors.primary,
                    }}
                  />
                </TouchableOpacity>
              </View>

              {/* Toggle */}
              <View
                style={{
                  width: '34%',
                  marginRight: 10,
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}>
                <SmoothStatusToggle
                  status={status}
                  onToggle={() => {
                    const newStatus = status === 'Active' ? 'Deactive' : 'Active';
                    setStatus(newStatus);
                    StatusChange(newStatus);
                  }}
                />
              </View>
            </View>
          </View>


        </ScrollView>

      ) : (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>
          No project data available.
        </Text>
      )
      }
      {/* ============ IMPROVED DELETE CONFIRMATION MODAL ============ */}
      {/* Delete Confirmation Modal */}
      <Modal
        visible={DeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal(false)}>
        <TouchableWithoutFeedback onPress={() => setDeleteModal(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.35)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View
                style={{
                  width: '82%',
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 20,
                }}>

                {/* Title */}
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Montserrat-ExtraBold',
                    color: '#111',
                    textAlign: 'center',
                    marginBottom: 10,
                  }}>
                  Delete Project
                </Text>

                {/* Message */}
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: 'SemiBold24',
                    color: '#666',
                    textAlign: 'center',
                    lineHeight: 20,
                    marginBottom: 20,
                  }}>
                  Are you sure you want to delete this project?
                </Text>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity
                    onPress={() => setDeleteModal(false)}
                    style={{
                      flex: 1,
                      height: 42,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                      backgroundColor: '#fff',
                    }}>
                    <Text
                      style={{
                        fontFamily: 'Montserrat-ExtraBold',
                        fontSize: 14,
                        color: '#444',
                      }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={DeleteProject}
                    style={{
                      flex: 1,
                      height: 42,
                      backgroundColor: '#E53935',
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 8,
                    }}>
                    <Text
                      style={{
                        fontFamily: 'Montserrat-ExtraBold',
                        fontSize: 14,
                        color: '#fff',
                      }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View >
  );
};

export default ProjectDetails;

const styles = StyleSheet.create({});
