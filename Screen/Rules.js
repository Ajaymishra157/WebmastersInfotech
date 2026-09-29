import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RenderHtml from 'react-native-render-html';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import colors from '../colors/Colors';
import { ENDPOINTS } from '../CommonFile/Constant';

// ===== SCREEN: Rules =====
// READ MODE: HTML jaisa hai waisa hi render hota hai (list, bold, colored text — admin
//            panel jaisa hi design) — react-native-render-html se.
// EDIT MODE (sirf CEO): ab ek ASLI RICH TEXT EDITOR hai (react-native-pell-rich-editor)
//            jisme Bold/Italic/Underline/List/Color jaisi formatting toolbar se lagti hai —
//            bilkul admin panel ke CKEditor jaisa. Editor jo HTML deta hai wahi seedha
//            API ko jaata hai, isliye design/formatting save hone ke baad bhi wapas
//            plain nahi hoti — jaisa design lagaya waisa hi save hota hai.

const { width } = Dimensions.get('window');

const Rules = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const richText = useRef(null);

    const [memberId, setMemberId] = useState(''); // NAYA: editor ka ID bhi chahiye (notify ke liye)
    const [memberPosition, setMemberPosition] = useState('');

    // ===== NAYA: agar banner/notification se "View" karke aaye hain to seedha
    // announcements tab khulega (route.params.initialTab se) =====
    const [activeTab, setActiveTab] = useState(route.params?.initialTab || 'rules');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null); // { rule_id, rules, announcements, status, entry_date }
    const [errorMsg, setErrorMsg] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editorHtml, setEditorHtml] = useState(''); // rich editor ka live HTML content

    useFocusEffect(
        useCallback(() => {
            const getMemberData = async () => {
                const [id, position] = await Promise.all([
                    AsyncStorage.getItem('member_id'),
                    AsyncStorage.getItem('member_position'),
                ]);
                setMemberId(id);
                setMemberPosition(position);
            };
            getMemberData();
            fetchRuleAnnouncement();
        }, []),
    );

    // HR ko bhi edit access dena hai to ye line use karo:
    const isCEO = memberPosition === 'CEO' || memberPosition === 'HR';
    // Sirf CEO ko access chahiye to purani line use karo:
    // const isCEO = memberPosition === 'CEO';

    // ===== LIST: list_rules_announce API se current rules/announcements fetch karo =====
    const fetchRuleAnnouncement = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setErrorMsg('');
            setIsEditing(false);

            const response = await fetch(ENDPOINTS.list_rules_announce, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const result = await response.json();

            // payload ek ARRAY hai (single row), isliye [0] uthana hai
            if (
                (result?.status === true || result?.status === 'true' || result?.code === 200) &&
                Array.isArray(result?.payload) &&
                result.payload.length > 0
            ) {
                setData(result.payload[0]);

                // ===== NAYA: rules aur announcements dono content-wise "seen" mark karo =====
                if (result.payload[0]?.rules) {
                    await AsyncStorage.setItem('last_seen_rules_content', result.payload[0].rules);
                }
                if (result.payload[0]?.announcements) {
                    await AsyncStorage.setItem('last_seen_announcements_content', result.payload[0].announcements);
                }
            } else {
                setData(null);
                setErrorMsg(result?.message || 'No rules or announcements found');
            }
        } catch (error) {
            console.log('Rules fetch error:', error);
            setErrorMsg('Network error, please try again');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => fetchRuleAnnouncement(true);

    const currentHtml = activeTab === 'rules' ? data?.rules : data?.announcements;

    // ===== EDIT MODE: CEO ke liye — rich editor ko current HTML se load karo =====
    const startEdit = () => {
        setEditorHtml(currentHtml || '');
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditorHtml('');
    };

    // ===== CLEAR ALL: editor ko ek click mein poora khali karo =====
    const clearAllText = () => {
        richText.current?.setContentHTML('');
        setEditorHtml('');
    };

    // ===== UPDATE: update_rules_announce.php ko same row (rule_id) update karne bhejo =====
    const saveUpdate = async () => {
        const plainCheck = editorHtml.replace(/<[^>]+>/g, '').trim();
        if (!plainCheck) {
            Toast.show({ type: 'error', text1: 'Field khali nahi ho sakta', position: 'bottom' });
            return;
        }

        try {
            setSaving(true);

            // editor se jo HTML aaya hai wahi seedha bhejo — formatting (bold/list/color) preserve rahegi
            const payload = {
                rule_id: String(data?.rule_id),
                rules: activeTab === 'rules' ? editorHtml : (data?.rules || ''),
                announcements: activeTab === 'announcements' ? editorHtml : (data?.announcements || ''),
            };

            const response = await fetch(ENDPOINTS.update_rules_announce, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result?.status === true || result?.status === 'true' || result?.code === 200) {
                Toast.show({
                    type: 'success',
                    text1: activeTab === 'rules' ? 'Rules updated' : 'Announcement updated',
                    position: 'bottom',
                });
                setData(prev => ({ ...prev, [activeTab]: editorHtml }));
                setIsEditing(false);

                // ===== NAYA: editor ne khud abhi jo save kiya wahi content "seen" bhi mark kar do —
                // isse Dashboard pe editor (CEO ya HR) ko apna hi banner nahi dikhega =====
                if (activeTab === 'rules') {
                    await AsyncStorage.setItem('last_seen_rules_content', editorHtml);
                } else {
                    await AsyncStorage.setItem('last_seen_announcements_content', editorHtml);
                }

                // ===== NAYA: editor ko CHHODKAR baaki sabko (CEO ho ya HR, dono cases) notification
                // bhejo — background mein, user ko wait nahi karana, jaise AddLeave mein hota hai =====
                try {
                    const plainPreview = editorHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ');

                    const notifyPayload = {
                        type: activeTab, // 'rules' ya 'announcements'
                        content: plainPreview,
                        editor_id: String(memberId), // 👈 NAYA — backend isi ID ko exclude karega (position se nahi)
                    };

                    console.log('📤 Sending to notifyAnnouncement:', notifyPayload);

                    const notifyRes = await fetch(
                        'https://us-central1-webmastersinfotech-ae0da.cloudfunctions.net/notifyAnnouncement',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(notifyPayload),
                        }
                    );

                    const notifyText = await notifyRes.text();
                    let notifyResult;
                    try {
                        notifyResult = JSON.parse(notifyText);
                    } catch (e) {
                        notifyResult = { raw_response: notifyText };
                    }

                    console.log('📥 Notify Result:', notifyResult);

                    if (!notifyRes.ok) {
                        console.log('❌ Notification API Error:', notifyRes.status, notifyResult);
                    } else {
                        console.log('✅ Announcement notification sent successfully');
                    }
                } catch (notifyErr) {
                    console.log('❌ notify error:', notifyErr);
                }
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Update failed',
                    text2: result?.message || 'Something went wrong',
                    position: 'bottom',
                });
            }
        } catch (error) {
            console.log('Rules update error:', error);
            Toast.show({ type: 'error', text1: 'Network error', position: 'bottom' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
            <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

            {/* ===== HEADER ===== */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <Icon name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rules & Announcements</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ===== TAB SWITCHER ===== */}
            <View style={styles.tabWrapper}>
                <TouchableOpacity
                    onPress={() => {
                        setActiveTab('rules');
                        setIsEditing(false);
                    }}
                    style={[styles.tabBtn, activeTab === 'rules' && styles.tabBtnActive]}>
                    <Icon name="gavel" size={16} color={activeTab === 'rules' ? '#fff' : colors.primary} />
                    <Text style={[styles.tabText, { color: activeTab === 'rules' ? '#fff' : colors.primary }]}>
                        Rules
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        setActiveTab('announcements');
                        setIsEditing(false);
                    }}
                    style={[styles.tabBtn, activeTab === 'announcements' && styles.tabBtnActive]}>
                    <Icon
                        name="bullhorn-outline"
                        size={16}
                        color={activeTab === 'announcements' ? '#fff' : colors.primary}
                    />
                    <Text
                        style={[styles.tabText, { color: activeTab === 'announcements' ? '#fff' : colors.primary }]}>
                        Announcements
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ===== BODY ===== */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView
                        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                        }>
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <View style={styles.cardIconWrap}>
                                    <Icon
                                        name={activeTab === 'rules' ? 'gavel' : 'bullhorn-outline'}
                                        size={16}
                                        color={colors.primary}
                                    />
                                </View>
                                <Text style={styles.cardHeaderText}>
                                    {activeTab === 'rules' ? 'Company Rules' : 'Latest Announcement'}
                                </Text>

                                {data?.status ? (
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: data.status === 'Active' ? '#DCFCE7' : '#FEE2E2' },
                                        ]}>
                                        <Text
                                            style={{
                                                color: data.status === 'Active' ? '#16A34A' : '#DC2626',
                                                fontSize: 10,
                                                fontFamily: 'SemiBold24',
                                            }}>
                                            {data.status}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* ===== CEO EDIT BUTTON — sirf CEO ko dikhega ===== */}
                                {isCEO && !isEditing && !errorMsg && data ? (
                                    <TouchableOpacity onPress={startEdit} style={styles.editIconBtn}>
                                        <Icon name="pencil-outline" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {errorMsg ? (
                                <View style={styles.center}>
                                    <Icon name="information-outline" size={30} color="#9CA3AF" />
                                    <Text style={styles.emptyText}>{errorMsg}</Text>
                                </View>
                            ) : isEditing ? (
                                // ===== EDIT MODE: ASLI RICH TEXT EDITOR — toolbar se Bold/List/Color lagao =====
                                <>
                                    <View style={styles.editHeaderRow}>
                                        <Text style={styles.editLabel}>
                                            {activeTab === 'rules' ? 'Edit Rules' : 'Edit Announcement'}
                                        </Text>

                                        <TouchableOpacity onPress={clearAllText} style={styles.clearAllBtn}>
                                            <Icon name="close-circle-outline" size={14} color="#DC2626" />
                                            <Text style={styles.clearAllText}>Clear All</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.editorWrap}>
                                        <RichEditor
                                            ref={richText}
                                            initialContentHTML={editorHtml}
                                            onChange={html => setEditorHtml(html)}
                                            placeholder={
                                                activeTab === 'rules' ? 'Rules likho...' : 'Announcement likho...'
                                            }
                                            editorStyle={{
                                                backgroundColor: '#F9FAFB',
                                                color: '#111827',
                                                placeholderColor: '#9CA3AF',
                                                contentCSSText: 'font-size: 14px; padding: 4px;',
                                            }}
                                            style={styles.richEditor}
                                            initialHeight={180}
                                        />
                                    </View>

                                    {/* ===== TOOLBAR — Bold, Italic, Underline, List, Color, Undo/Redo ===== */}
                                    <RichToolbar
                                        editor={richText}
                                        selectedIconTint={colors.primary}
                                        iconTint="#6B7280"
                                        style={styles.richToolbar}
                                        actions={[
                                            actions.setBold,
                                            actions.setItalic,
                                            actions.setUnderline,
                                            actions.insertBulletsList,
                                            actions.insertOrderedList,
                                            actions.foreColor,
                                            actions.undo,
                                            actions.redo,
                                        ]}
                                    />

                                    <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={cancelEdit}
                                            disabled={saving}
                                            style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]}>
                                            <Text style={{ color: '#4B5563', fontFamily: 'SemiBold28', fontSize: 14 }}>
                                                Cancel
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={saveUpdate}
                                            disabled={saving}
                                            style={[
                                                styles.actionBtn,
                                                { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
                                            ]}>
                                            {saving ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Icon
                                                        name="content-save-outline"
                                                        size={16}
                                                        color="#fff"
                                                        style={{ marginRight: 6 }}
                                                    />
                                                    <Text style={{ color: '#fff', fontFamily: 'SemiBold28', fontSize: 14 }}>
                                                        Save
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : currentHtml ? (
                                // ===== READ-ONLY VIEW: design (list/bold/color) render hota hai =====
                                <View style={styles.htmlBox}>
                                    <RenderHtml
                                        contentWidth={width - 60}
                                        source={{ html: currentHtml }}
                                        baseStyle={styles.htmlBase}
                                        tagsStyles={htmlTagStyles}
                                    />
                                </View>
                            ) : (
                                <View style={styles.center}>
                                    <Icon name="text-box-remove-outline" size={30} color="#9CA3AF" />
                                    <Text style={styles.emptyText}>
                                        {activeTab === 'rules' ? 'No rules added yet' : 'No announcement yet'}
                                    </Text>
                                </View>
                            )}

                            {data?.entry_date && !isEditing ? (
                                <Text style={styles.updatedText}>Last updated: {data.entry_date}</Text>
                            ) : null}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </View>
    );
};

const htmlTagStyles = {
    p: { fontSize: 13.5, color: '#374151', lineHeight: 20, marginBottom: 6 },
    li: { fontSize: 13.5, color: '#374151', lineHeight: 20, marginBottom: 6 },
    strong: { fontFamily: 'Montserrat-ExtraBold', color: '#111827' },
    ol: { marginLeft: 4 },
    ul: { marginLeft: 4 },
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 16,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Montserrat-ExtraBold',
    },
    tabWrapper: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 14,
        marginTop: -14,
        borderRadius: 14,
        padding: 5,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    tabBtnActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 12.5,
        fontFamily: 'SemiBold24',
        marginLeft: 6,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#E0EAFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    cardHeaderText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Montserrat-ExtraBold',
        color: '#1F2937',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginRight: 8,
    },
    editIconBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    editLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontFamily: 'SemiBold24',
        flex: 1,
        marginRight: 8,
    },
    clearAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    clearAllText: {
        color: '#DC2626',
        fontSize: 11,
        fontFamily: 'SemiBold24',
        marginLeft: 4,
    },
    editorWrap: {
        borderWidth: 1,
        borderColor: colors.primary,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    richEditor: {
        minHeight: 180,
        backgroundColor: '#F9FAFB',
    },
    richToolbar: {
        backgroundColor: '#F3F4F6',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: colors.primary,
    },
    htmlBox: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 90,
    },
    htmlBase: {
        fontSize: 13.5,
        color: '#374151',
    },
    actionBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    updatedText: {
        marginTop: 14,
        fontSize: 10.5,
        color: '#9CA3AF',
        fontFamily: 'SemiBold24',
        textAlign: 'right',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    emptyText: {
        marginTop: 8,
        fontSize: 12.5,
        color: '#9CA3AF',
        fontFamily: 'SemiBold24',
    },
});

export default Rules;