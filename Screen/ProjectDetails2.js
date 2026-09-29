import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors, { baseUrl } from '../colors/Colors';
import { ENDPOINTS } from '../CommonFile/Constant';

/* -------------------------------------------------------------------------- */
/*  Status config                                                             */
/* -------------------------------------------------------------------------- */
const getStatusConfig = status => {
  const s = (status || '').trim().toLowerCase();
  if (s === 'active') return { color: '#16A34A', bg: '#E8F9EE', icon: 'checkmark-circle' };
  if (s === 'deactive' || s === 'inactive') return { color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' };
  return { color: '#8A8D9F', bg: '#F3F4F8', icon: 'help-circle' };
};

/* -------------------------------------------------------------------------- */
/*  Date helpers                                                              */
/* -------------------------------------------------------------------------- */
// "2025-11-01" -> "01/11/2025"
const formatDateDisplay = str => {
  if (!str || str === '0000-00-00') return 'N/A';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!match) return str;
  const [, yyyy, mm, dd] = match;
  return `${dd}/${mm}/${yyyy}`;
};

// "2026-07-18 13:39:19" -> "18/07/2026, 01:39 PM"
const formatTimestampDisplay = ts => {
  if (!ts) return 'N/A';
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(ts.trim());
  if (!match) return ts;
  const [, yyyy, mm, dd, hhRaw, min] = match;
  let hh = parseInt(hhRaw, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${dd}/${mm}/${yyyy}, ${String(hh).padStart(2, '0')}:${min} ${ampm}`;
};

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */
const SectionHeading = ({ icon, label }) => (
  <View style={styles.sectionHeadingRow}>
    <Icon name={icon} size={15} color={colors.primary} />
    <Text style={styles.sectionHeadingText}>{label}</Text>
  </View>
);

const InfoRow = ({ icon, label, value, last }) => (
  <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
    <View style={styles.infoIconWrap}>
      <Icon name={icon} size={15} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  </View>
);

const ProjectDetails2 = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { project_id } = route.params || {};
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(ENDPOINTS.ListSingleProjectDetail, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project_id,
        }),
      });
      const json = await response.json();
      if (json.code == 200) {
        setProjectData(json.payload[0]);
      } else {
        console.warn('No data found');
      }
    } catch (error) {
      console.error('API Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (project_id) {
      fetchProjectDetails();
    }
  }, [project_id]);

  const statusCfg = getStatusConfig(projectData?.project_status);

  // Client address ka pura combined string — city/state/area alag alag ho sakte
  // hain address field se, isliye sabko jodke dikhate hain.
  const fullAddress = [
    projectData?.project_client_address,
    projectData?.project_client_area,
    projectData?.project_client_city,
    projectData?.project_client_state,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <View style={[styles.headerBtn, { backgroundColor: 'transparent' }]} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : projectData ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Hero card — project name + status */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Icon name="briefcase" size={26} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {projectData.project_name || 'N/A'}
            </Text>
            {!!projectData.project_domain_name && (
              <Text style={styles.heroSubtitle} numberOfLines={1}>
                {projectData.project_domain_name}
              </Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Icon name={statusCfg.icon} size={13} color={statusCfg.color} />
              <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                {projectData.project_status || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Client Info */}
          <SectionHeading icon="person-circle-outline" label="Client Information" />
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Client Name" value={projectData.project_client_name} />
            <InfoRow icon="call-outline" label="Contact" value={projectData.project_contact} />
            <InfoRow icon="location-outline" label="Address" value={fullAddress} last />
          </View>

          {/* Timeline */}
          <SectionHeading icon="calendar-outline" label="Timeline" />
          <View style={styles.card}>
            <View style={styles.timelineRow}>
              <View style={styles.timelineCol}>
                <View style={[styles.timelineIconWrap, { backgroundColor: '#E8F9EE' }]}>
                  <Icon name="play-outline" size={15} color="#16A34A" />
                </View>
                <Text style={styles.timelineLabel}>Start Date</Text>
                <Text style={styles.timelineValue}>{formatDateDisplay(projectData.project_start_date)}</Text>
              </View>
              <View style={styles.timelineDivider} />
              <View style={styles.timelineCol}>
                <View style={[styles.timelineIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="flag-outline" size={15} color="#DC2626" />
                </View>
                <Text style={styles.timelineLabel}>End Date</Text>
                <Text style={styles.timelineValue}>{formatDateDisplay(projectData.project_end_date)}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <InfoRow icon="time-outline" label="Entry Date" value={formatTimestampDisplay(projectData.project_entry_date)} last />
          </View>

          {/* Description */}
          {!!projectData.project_desc && (
            <>
              <SectionHeading icon="document-text-outline" label="Description" />
              <View style={styles.card}>
                <Text style={styles.descText}>{projectData.project_desc}</Text>
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyWrap}>
          <Icon name="folder-open-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No project data available.</Text>
        </View>
      )}
    </View>
  );
};

export default ProjectDetails2;

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F8' },

  header: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 17,
    color: '#fff',
  },

  scrollContent: { padding: 14, paddingBottom: 30 },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EEF0FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
    color: '#1A1B2E',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: 'SemiBold24',
    fontSize: 12,
    color: '#9A9CAE',
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 12,
    gap: 5,
  },
  statusBadgeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11 },

  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    gap: 6,
  },
  sectionHeadingText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12.5,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F6',
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  infoLabel: { fontFamily: 'SemiBold24', fontSize: 10.5, color: '#9A9CAE' },
  infoValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13.5, color: '#1A1B2E', marginTop: 2 },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  timelineCol: { flex: 1, alignItems: 'center' },
  timelineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  timelineLabel: { fontFamily: 'SemiBold24', fontSize: 10.5, color: '#9A9CAE' },
  timelineValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, color: '#1A1B2E', marginTop: 2 },
  timelineDivider: { width: 1, height: 40, backgroundColor: '#F0F1F6' },
  divider: { height: 1, backgroundColor: '#F0F1F6' },

  descText: {
    fontFamily: 'SemiBold24',
    fontSize: 13.5,
    color: '#374151',
    lineHeight: 20,
    paddingVertical: 14,
  },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontFamily: 'SemiBold24', fontSize: 13, color: '#9CA3AF' },
});