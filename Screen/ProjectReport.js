/* eslint-disable prettier/prettier */
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors, { baseUrl } from '../colors/Colors';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { ENDPOINTS } from '../CommonFile/Constant';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';

const PRIMARY = colors.primary;

const pad2 = n => (n < 10 ? `0${n}` : `${n}`);

// "2026-07-18 13:39:19" -> "18 Jul 2026, 01:39 PM"
const formatCreatedDate = dateStr => {
  if (!dateStr) return '-';
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return '-';
  const [yyyy, mm, dd] = datePart.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = parseInt(mm, 10) - 1;
  const dateLabel = `${dd} ${months[monthIndex] || mm} ${yyyy}`;

  if (!timePart) return dateLabel;
  const [hhRaw, minRaw] = timePart.split(':');
  let hh = parseInt(hhRaw, 10) || 0;
  const min = parseInt(minRaw, 10) || 0;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  if (hh === 0) hh = 12;

  return `${dateLabel}, ${pad2(hh)}:${pad2(min)} ${ampm}`;
};

// Same logic jo ProjectTaskList me hai — taaki Assigned/Taken/Difference dono
// jagah EXACT same format me dikhein. Pehle wala formatHMS days/hours hone par
// minutes drop kar deta tha, isliye minute kabhi dikhta hi nahi tha.
const parseTimeToMinutes = timeStr => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.replace(/\s*(Early|Late)\s*/i, '').trim();
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 60 + m + Math.round((s || 0) / 60);
  }
  if (parts.length === 2) {
    const [h, m] = parts;
    return h * 60 + m;
  }
  return parts[0] || 0;
};

const ProjectCardShimmer = () => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardTopRow}>
        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            marginRight: 8,
          }}
        />

        <View style={{ flex: 1 }}>
          <ShimmerPlaceholder
            LinearGradient={LinearGradient}
            style={{
              width: '65%',
              height: 13,
              borderRadius: 4,
              marginBottom: 6,
            }}
          />

          <ShimmerPlaceholder
            LinearGradient={LinearGradient}
            style={{
              width: '45%',
              height: 10,
              borderRadius: 4,
            }}
          />
        </View>

        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
          }}
        />
      </View>

      {/* Created */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: 30,
          marginTop: 6,
        }}>
        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={{
            width: 120,
            height: 9,
            borderRadius: 4,
          }}
        />
      </View>

      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: '#F2F2F2',
          marginVertical: 6,
        }}
      />

      {/* Stats */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        {[1, 2, 3].map((item, index) => (
          <React.Fragment key={item}>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
              }}>
              <ShimmerPlaceholder
                LinearGradient={LinearGradient}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  marginBottom: 3,
                }}
              />

              <ShimmerPlaceholder
                LinearGradient={LinearGradient}
                style={{
                  width: 45,
                  height: 8,
                  borderRadius: 4,
                  marginBottom: 4,
                }}
              />

              <ShimmerPlaceholder
                LinearGradient={LinearGradient}
                style={{
                  width: 55,
                  height: 9,
                  borderRadius: 4,
                }}
              />
            </View>

            {index !== 2 && (
              <View
                style={{
                  width: 1,
                  height: 26,
                  backgroundColor: '#ECECEC',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const formatMinutesReadable = totalMinutes => {
  const abs = Math.abs(Math.round(totalMinutes));
  const days = Math.floor(abs / (24 * 60));
  const remAfterDays = abs % (24 * 60);
  const hours = Math.floor(remAfterDays / 60);
  const mins = remAfterDays % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}D`);
  if (hours > 0) parts.push(`${hours}H`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}M`);

  return parts.join(' ');
};

// "628:24:44" -> "26D 4H 24M" | "07:28:50" -> "7H 28M"
const formatHMS = timeStr => {
  if (!timeStr) return '-';
  return formatMinutesReadable(parseTimeToMinutes(timeStr));
};

// "602:59:44 Late" -> { text: "25D 2H 59M", status: "Late" }
const parseDifference = diffStr => {
  if (!diffStr) return { text: '-', status: '' };
  const statusMatch = diffStr.match(/(Early|Late)/i);
  const status = statusMatch ? statusMatch[0] : '';
  return { text: formatHMS(diffStr), status };
};

const ProjectReport = () => {
  const navigation = useNavigation();
  const [projects, setProjects] = useState([]);

  const [searchText, setSearchText] = useState('');
  const [filteredProjects, setFilteredProjects] = useState(projects);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchText === '') {
      setFilteredProjects(projects); // reset to original list
    } else {
      const filtered = projects.filter(item =>
        `${item.project_name} ${item.project_client_name}`
          .toLowerCase()
          .includes(searchText.toLowerCase()),
      );
      setFilteredProjects(filtered);
    }
  }, [searchText, projects]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    setFilteredProjects(projects);
  }, [projects]);

  const fetchProjects = async () => {
    const url = ENDPOINTS.ListProjectName;
    setLoading(true);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      console.log('Project API Response:', result);

      if (result.code == 200) {
        setProjects(result.payload);
        setFilteredProjects(result.payload);
      } else {
        console.warn('Unexpected response:', result);
      }
    } catch (error) {
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProjectCard = ({ item, index }) => {
    const diff = parseDifference(item?.total_difference);
    const isLate = (diff?.status || '').toLowerCase() === 'late';
    const diffColor = isLate ? '#DC2626' : '#16A34A';

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardTopRow}>
          <View style={styles.indexWrap}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() =>
              navigation.navigate('ProjectDetails2', {
                project_id: item?.project_id,
              })
            }>
            <Text numberOfLines={1} style={styles.projectName}>
              {item?.project_name || '--'}
            </Text>

            <Text numberOfLines={1} style={styles.clientName}>
              {item?.project_client_name || '--'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.arrowBtn}
            onPress={() =>
              navigation.navigate('ProjectTaskList', {
                projectId: item?.project_id,
                projectName: item?.project_name,
              })
            }>
            <Image
              source={require('../assets/right-arrow.png')}
              style={{ width: 14, height: 14, tintColor: colors.primary }}
            />
          </TouchableOpacity>
        </View>

        {/* Created */}
        <View style={styles.createdRow}>
          <Icon name="calendar-outline" size={10} color="#9CA3AF" />
          <Text style={styles.createdText}>
            {item?.project_entry_date
              ? formatCreatedDate(item.project_entry_date)
              : '--'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Stats */}
        <View style={styles.statsRow}>

          <View style={styles.statCol}>
            <View style={[styles.statTitleRow, { backgroundColor: '#EDE9FE' }]}>
              <Icon name="time-outline" size={10} color="#7C3AED" />
            </View>

            <Text style={styles.statLabel}>Assigned</Text>

            <Text style={styles.statValue}>
              {item?.total_assigned_hours
                ? formatHMS(item.total_assigned_hours)
                : '--'}
            </Text>
          </View>

          <View style={styles.statColDivider} />

          <View style={styles.statCol}>
            <View style={[styles.statTitleRow, { backgroundColor: '#DBEAFE' }]}>
              <Icon name="stopwatch-outline" size={10} color="#2563EB" />
            </View>

            <Text style={styles.statLabel}>Taken</Text>

            <Text style={styles.statValue}>
              {item?.total_taken_time
                ? formatHMS(item.total_taken_time)
                : '--'}
            </Text>
          </View>

          <View style={styles.statColDivider} />

          <View style={styles.statCol}>
            <View
              style={[
                styles.statTitleRow,
                {
                  backgroundColor: isLate ? '#FEE2E2' : '#DCFCE7',
                },
              ]}>
              <Icon
                name={
                  isLate
                    ? 'alert-circle-outline'
                    : 'checkmark-circle-outline'
                }
                size={10}
                color={diffColor}
              />
            </View>

            <Text style={[styles.statLabel, { color: diffColor }]}>
              {diff?.status || '--'}
            </Text>

            <Text style={[styles.statValue, { color: diffColor }]}>
              {diff?.text || '--'}
            </Text>
          </View>

        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
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
            marginLeft: '33%',
            fontFamily: 'Montserrat-ExtraBold',
            fontSize: 18,
            color: '#fff',
            marginTop: 5,
          }}>
          All Projects
        </Text>
      </View>

      <View
        style={{
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}>
        <View
          style={{
            width: '95%',
            height: 50,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginTop: 10,
            borderRadius: 10,
          }}>
          <TextInput
            placeholder="Search Project/Client Name..."
            placeholderTextColor={'#000'}
            style={{
              fontFamily: 'SemiBold24',
              paddingHorizontal: 10,
              height: '100%',
              color: '#000',
            }}
            onChangeText={text => setSearchText(text)}
            value={searchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              style={{
                position: 'absolute',
                right: 14,
                top: 15,
              }}>
              <FontAwesome name="times-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <ProjectCardShimmer />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 8,
            paddingBottom: 100,
          }}
        />
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item, index) => item.project_id?.toString() || index.toString()}
          renderItem={renderProjectCard}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ padding: 8 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Icon name="folder-open-outline" size={40} color="#D1D5DB" />
              <Text style={{ color: '#9CA3AF', marginTop: 8, fontFamily: 'SemiBold24' }}>
                No projects found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ProjectReport;

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  indexWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF0FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  indexText: {
    fontSize: 10,
    fontFamily: 'Montserrat-ExtraBold',
    color: PRIMARY,
  },

  projectName: {
    fontSize: 13,
    color: PRIMARY,
    fontFamily: 'Montserrat-ExtraBold',
  },

  clientName: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'SemiBold24',
    marginTop: 1,
  },

  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  createdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 30,
    marginTop: 4,
  },

  createdText: {
    fontSize: 9,
    color: '#9CA3AF',
    marginLeft: 4,
    fontFamily: 'SemiBold24',
  },

  divider: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginVertical: 6,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statCol: {
    flex: 1,
    alignItems: 'center',
  },

  statColDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#ECECEC',
  },

  statTitleRow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    fontFamily: 'SemiBold24',
  },

  statValue: {
    fontSize: 9,
    color: '#111827',
    fontFamily: 'Montserrat-ExtraBold',
    marginTop: 1,
  },
});