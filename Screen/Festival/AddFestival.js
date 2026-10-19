// AddFestival.js
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
    StatusBar,                // added
} from 'react-native';
import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { ENDPOINTS } from '../../CommonFile/Constant';

// Updated colors with new primary palette
const colors = {
    primary: '#002841',        // new primary
    TextBtn: '#fff',           // for header text & button text
    IconColor: '#23a0d8',      // for icons (back arrow, etc.)
    Light_color: '#c6e7f7',    // for back button background
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

const AddFestival = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const editItem = route.params?.festival || null;
    const isEdit = !!editItem;

    const [festivalName, setFestivalName] = useState(editItem?.festival_name || '');
    const [festivalDate, setFestivalDate] = useState(
        editItem?.festival_date ? new Date(editItem.festival_date) : null,
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const [endDate, setEndDate] = useState(null);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!festivalName.trim()) newErrors.name = 'Festival name is required';
        if (!festivalDate) newErrors.date = 'Festival date is required';
        if (!isEdit && endDate && festivalDate && endDate < festivalDate) {
            newErrors.endDate = 'End date cannot be before start date';
        }
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
            setFestivalDate(selectedDate);
            if (endDate && endDate < selectedDate) setEndDate(null);
            setErrors(prev => ({ ...prev, date: undefined }));
        }
        if (Platform.OS === 'android') setShowDatePicker(false);
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            setSubmitting(true);
            const url = isEdit ? ENDPOINTS.update_festival : ENDPOINTS.add_festival;
            const body = isEdit
                ? {
                    festival_id: editItem.festival_id,
                    festival_name: festivalName.trim(),
                    festival_date: toApiDate(festivalDate),
                }
                : {
                    festival_name: festivalName.trim(),
                    festival_date: toApiDate(festivalDate),
                    end_date: endDate ? toApiDate(endDate) : '',
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
                    text2: json.message || `Festival ${isEdit ? 'updated' : 'added'} successfully`,
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
                text2: 'Failed to save festival',
                position: 'bottom',
                bottomOffset: 80,
                visibilityTime: 2000,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Status Bar */}
            <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

            {/* Updated Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-left" size={22} color={colors.IconColor} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Update Festival' : 'Add Festival'}</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.iconBanner}>
                    <View style={styles.iconCircle}>
                        <Icon name="party-popper" size={30} color={colors.primary} />
                    </View>
                    <Text style={styles.bannerText}>
                        {isEdit ? 'Update festival details below' : 'Fill in the details to add a new festival'}
                    </Text>
                </View>

                {/* Festival Name */}
                <Text style={styles.label}>Festival Name</Text>
                <View style={[styles.inputWrap, errors.name && styles.inputError]}>
                    <Icon name="party-popper" size={18} color={colors.subtext} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Diwali"
                        placeholderTextColor={colors.subtext}
                        value={festivalName}
                        onChangeText={text => {
                            setFestivalName(text);
                            if (text.trim()) setErrors(prev => ({ ...prev, name: undefined }));
                        }}
                    />
                </View>
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

                {/* Festival Date */}
                <Text style={[styles.label, { marginTop: 18 }]}>Festival Date</Text>
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
                                color: festivalDate ? colors.text : colors.subtext,
                            },
                        ]}>
                        {festivalDate ? formatDisplayDate(festivalDate) : 'Select a date'}
                    </Text>
                    <Icon name="chevron-down" size={18} color={colors.subtext} />
                </TouchableOpacity>
                {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}

                {showDatePicker && (
                    <DateTimePicker
                        value={festivalDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                    />
                )}
                {/* End Date (sirf add mode me) */}
                {!isEdit && (
                    <>
                        <Text style={[styles.label, { marginTop: 18 }]}>
                            End Date{' '}
                            <Text style={{ color: colors.subtext, fontFamily: 'Roboto-Regular' }}>
                                (optional, for multi-day)
                            </Text>
                        </Text>
                        <TouchableOpacity
                            style={[styles.inputWrap, errors.endDate && styles.inputError]}
                            activeOpacity={0.7}
                            onPress={() => setShowEndPicker(true)}>
                            <Icon name="calendar-range-outline" size={18} color={colors.subtext} />
                            <Text style={[styles.input, { color: endDate ? colors.text : colors.subtext }]}>
                                {endDate ? formatDisplayDate(endDate) : 'Same day (single day)'}
                            </Text>
                            {endDate ? (
                                <TouchableOpacity onPress={() => setEndDate(null)}>
                                    <Icon name="close-circle" size={18} color={colors.subtext} />
                                </TouchableOpacity>
                            ) : (
                                <Icon name="chevron-down" size={18} color={colors.subtext} />
                            )}
                        </TouchableOpacity>
                        {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}

                        {festivalDate && endDate && endDate >= festivalDate && (
                            <Text style={{ marginTop: 8, marginLeft: 4, fontSize: 12, color: colors.primary, fontFamily: 'Roboto-Medium' }}>
                                {Math.round((endDate - festivalDate) / 86400000) + 1} days holiday
                            </Text>
                        )}
                    </>
                )}

                {showEndPicker && (
                    <DateTimePicker
                        value={endDate || festivalDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={festivalDate || undefined}
                        onChange={(event, d) => {
                            setShowEndPicker(Platform.OS === 'ios');
                            if (event.type === 'dismissed') {
                                setShowEndPicker(false);
                                return;
                            }
                            if (d) setEndDate(d);
                            if (Platform.OS === 'android') setShowEndPicker(false);
                        }}
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
                            <Text style={styles.submitBtnText}>{isEdit ? 'Update Festival' : 'Add Festival'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default AddFestival;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    // Updated header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 54 : 18,
        paddingBottom: 14,
        backgroundColor: colors.primary,        // new primary
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: colors.Light_color,    // light background
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        marginRight: 38,
        fontSize: 17,
        fontFamily: 'Montserrat-ExtraBold',
        color: colors.TextBtn,                 // white text
    },

    body: { padding: 20, paddingBottom: 40 },

    iconBanner: { alignItems: 'center', marginBottom: 28 },
    iconCircle: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: colors.Light_color,   // using Light_color for consistency
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
});