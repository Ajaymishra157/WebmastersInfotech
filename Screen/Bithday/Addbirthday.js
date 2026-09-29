// Addbirthday.js
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    StatusBar,
    Modal,
    FlatList,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { ENDPOINTS } from '../../CommonFile/Constant';


const colors = {
    primary: '#002841',
    TextBtn: '#fff',
    IconColor: '#23a0d8',
    Light_color: '#c6e7f7',
    bg: '#F5F6FB',
    card: '#FFFFFF',
    border: '#EEF0F6',
    text: '#1F2233',
    subtext: '#8A8DA3',
    danger: '#DC2626',
};

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const formatDisplayDate = date => {
    if (!date) return '';
    return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const toApiDate = date => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// ---- NEW: member_dob "0000-00-00" ya empty ko invalid maano ----
const parseMemberDob = dob => {
    if (!dob || dob === '0000-00-00') return null;
    const d = new Date(dob);
    return isNaN(d.getTime()) ? null : d;
};

const Addbirthday = () => {
    const navigation = useNavigation();
    const route = useRoute();
    // ---- NEW: ListBirthday se ab "Staff" param aata hai (pehle "birthday" tha) ----
    const editItem = route.params?.Staff || route.params?.birthday || null;
    const isEdit = !!editItem;

    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [memberModalVisible, setMemberModalVisible] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    const [selectedMember, setSelectedMember] = useState(
        editItem ? { member_id: editItem.member_id, member_name: editItem.member_name } : null,
    );
    // ---- NEW: field ab member_dob hai (pehle birth_date tha) ----
    const [birthDate, setBirthDate] = useState(parseMemberDob(editItem?.member_dob));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // edit mode me member fixed hai, list fetch karne ki zaroorat nahi
        if (!isEdit) {
            fetchMembers();
        } else {
            setMembersLoading(false);
        }
    }, []);

    const fetchMembers = async () => {
        try {
            setMembersLoading(true);
            const response = await fetch(ENDPOINTS.ListMember);
            const json = await response.json();
            if (json?.status && Array.isArray(json.payload)) {
                setMembers(json.payload);
            } else {
                setMembers([]);
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load members',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        } finally {
            setMembersLoading(false);
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!selectedMember) newErrors.member = 'Please select a member';
        if (!birthDate) newErrors.date = 'Birth date is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'dismissed') {
            setShowDatePicker(false);
            return;
        }
        if (selectedDate) {
            setBirthDate(selectedDate);
            setErrors(prev => ({ ...prev, date: undefined }));
        }
        if (Platform.OS === 'android') setShowDatePicker(false);
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            setSubmitting(true);
            const url = isEdit ? ENDPOINTS.update_birthday : ENDPOINTS.add_birthday;
            // ---- NEW: member_id + member_dob hi bhejte hain, dono add/edit me ----
            const body = {
                member_id: selectedMember.member_id,
                member_dob: toApiDate(birthDate),
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await response.json();

            if (json?.status) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: json.message || `Birthday ${isEdit ? 'updated' : 'added'} successfully`,
                    position: 'bottom',
                    bottomOffset: 80,
                    visibilityTime: 2000,
                });
                navigation.goBack();
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: json?.message || 'Something went wrong',
                    position: 'bottom',
                    bottomOffset: 80,
                    visibilityTime: 2000,
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to save birthday',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.member_name?.toLowerCase().includes(memberSearch.toLowerCase()),
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-left" size={22} color={colors.IconColor} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Update Birthday' : 'Add Birthday'}</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.iconBanner}>
                    <View style={styles.iconCircle}>
                        <Icon name="cake-variant-outline" size={30} color={colors.primary} />
                    </View>
                    <Text style={styles.bannerText}>
                        {isEdit ? 'Update birthday details below' : 'Fill in the details to add a new birthday'}
                    </Text>
                </View>

                {/* Member Select */}
                <Text style={styles.label}>Member</Text>
                <TouchableOpacity
                    style={[
                        styles.inputWrap,
                        errors.member && styles.inputError,
                        // ---- NEW: edit mode me disabled look ----
                        isEdit && styles.inputDisabled,
                    ]}
                    activeOpacity={isEdit ? 1 : 0.7}
                    disabled={isEdit}
                    onPress={() => !isEdit && setMemberModalVisible(true)}>
                    <Icon name="account-outline" size={18} color={colors.subtext} />
                    <Text
                        style={[
                            styles.input,
                            {
                                paddingTop: Platform.OS === 'ios' ? 2 : 0,
                                color: selectedMember ? colors.text : colors.subtext,
                            },
                        ]}
                        numberOfLines={1}>
                        {selectedMember ? selectedMember.member_name : 'Select a member'}
                    </Text>
                    {!isEdit && <Icon name="chevron-down" size={18} color={colors.subtext} />}
                    {isEdit && <Icon name="lock-outline" size={16} color={colors.subtext} />}
                </TouchableOpacity>
                {errors.member ? <Text style={styles.errorText}>{errors.member}</Text> : null}
                {isEdit ? (
                    <Text style={styles.helperText}>Member can't be changed while editing a birthday</Text>
                ) : null}

                {/* Birth Date */}
                <Text style={[styles.label, { marginTop: 18 }]}>Birth Date</Text>
                <TouchableOpacity
                    style={[styles.inputWrap, errors.date && styles.inputError]}
                    activeOpacity={0.7}
                    onPress={() => setShowDatePicker(true)}>
                    <Icon name="calendar-outline" size={18} color={colors.subtext} />
                    <Text
                        style={[
                            styles.input,
                            {
                                paddingTop: Platform.OS === 'ios' ? 2 : 0,
                                color: birthDate ? colors.text : colors.subtext,
                            },
                        ]}>
                        {birthDate ? formatDisplayDate(birthDate) : 'Select a date'}
                    </Text>
                    <Icon name="chevron-down" size={18} color={colors.subtext} />
                </TouchableOpacity>
                {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}

                {showDatePicker && (
                    <DateTimePicker
                        value={birthDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={new Date()}
                        onChange={handleDateChange}
                    />
                )}
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.submitBtn}
                    activeOpacity={0.85}
                    disabled={submitting}
                    onPress={handleSubmit}>
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Icon name={isEdit ? 'content-save-outline' : 'plus'} size={20} color="#fff" />
                            <Text style={styles.submitBtnText}>{isEdit ? 'Update Birthday' : 'Add Birthday'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* ========== MEMBER PICKER MODAL (add mode only) ========== */}
            <Modal
                visible={memberModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMemberModalVisible(false)}>
                <View style={styles.sheetOverlay}>
                    <View style={styles.sheetBox}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Select Member</Text>

                        <View style={styles.searchWrap}>
                            <Icon name="magnify" size={18} color={colors.subtext} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search member..."
                                placeholderTextColor={colors.subtext}
                                value={memberSearch}
                                onChangeText={setMemberSearch}
                            />
                        </View>

                        {membersLoading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
                        ) : (
                            <FlatList
                                data={filteredMembers}
                                keyExtractor={item => String(item.member_id)}
                                style={{ marginTop: 8 }}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.memberRow}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            setSelectedMember(item);
                                            setErrors(prev => ({ ...prev, member: undefined }));
                                            setMemberModalVisible(false);
                                            setMemberSearch('');
                                        }}>
                                        <View style={styles.avatarCircle}>
                                            <Text style={styles.avatarText}>
                                                {item.member_name?.charAt(0)?.toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.memberRowName}>{item.member_name}</Text>
                                            {item.member_position ? (
                                                <Text style={styles.memberRowPosition}>{item.member_position}</Text>
                                            ) : null}
                                        </View>
                                        {selectedMember?.member_id === item.member_id && (
                                            <Icon name="check-circle" size={20} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyWrap}>
                                        <Icon name="account-search-outline" size={44} color={colors.subtext} />
                                        <Text style={styles.emptyText}>No members found</Text>
                                    </View>
                                }
                            />
                        )}

                        <TouchableOpacity
                            style={styles.sheetCloseBtn}
                            onPress={() => setMemberModalVisible(false)}>
                            <Text style={styles.sheetCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

export default Addbirthday;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 54 : 18,
        paddingBottom: 14,
        backgroundColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: colors.Light_color,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        marginRight: 38,
        fontSize: 17,
        fontFamily: 'Montserrat-ExtraBold',
        color: colors.TextBtn,
    },

    body: { padding: 20, paddingBottom: 40 },

    iconBanner: { alignItems: 'center', marginBottom: 28 },
    iconCircle: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: colors.Light_color,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    bannerText: {
        fontFamily: 'Roboto-Regular',
        fontSize: 13,
        color: colors.subtext,
        textAlign: 'center',
    },

    label: { fontFamily: 'Roboto-Bold', fontSize: 13, color: colors.text, marginBottom: 8 },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 52,
    },
    inputError: { borderColor: colors.danger },
    // ---- NEW: disabled (edit mode) look for member field ----
    inputDisabled: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontFamily: 'Roboto-Medium',
        fontSize: 14,
        color: colors.text,
    },
    errorText: {
        fontFamily: 'Roboto-Regular',
        fontSize: 11,
        color: colors.danger,
        marginTop: 6,
        marginLeft: 4,
    },
    // ---- NEW: helper text under locked member field ----
    helperText: {
        fontFamily: 'Roboto-Regular',
        fontSize: 11,
        color: colors.subtext,
        marginTop: 6,
        marginLeft: 4,
        fontStyle: 'italic',
    },

    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        height: 52,
        borderRadius: 14,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 5,
    },
    submitBtnText: {
        color: '#fff',
        fontFamily: 'Roboto-Bold',
        fontSize: 15,
        marginLeft: 8,
    },

    // Member picker bottom sheet
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheetBox: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        padding: 20,
        maxHeight: '80%',
        minHeight: '55%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: 12,
    },
    sheetTitle: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 16,
        color: colors.text,
        marginBottom: 14,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'Roboto-Medium',
        fontSize: 13,
        color: colors.text,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.Light_color,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontFamily: 'Montserrat-ExtraBold',
        fontSize: 14,
        color: colors.primary,
    },
    memberRowName: { fontFamily: 'Roboto-Bold', fontSize: 14, color: colors.text },
    memberRowPosition: { fontFamily: 'Roboto-Regular', fontSize: 12, color: colors.subtext, marginTop: 1 },

    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyText: { fontFamily: 'Roboto-Medium', color: colors.subtext, marginTop: 10, fontSize: 13 },

    sheetCloseBtn: {
        marginTop: 12,
        height: 46,
        borderRadius: 12,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetCloseBtnText: { fontFamily: 'Roboto-Bold', color: colors.text, fontSize: 14 },
});