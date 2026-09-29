import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { ENDPOINTS } from './Constant';


// 👈 NAYA — "2026-08-21" ko "21 Aug 2026" me convert karta hai
const formatDateNice = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [yyyy, mm, dd] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(mm, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return dateStr;
    return `${dd} ${months[monthIndex]} ${yyyy}`;
};

// Alag channel — taaki leave wale notification easily pehchane jayein
const getLeaveChannelId = async () =>
    await notifee.createChannel({
        id: 'leave_channel',
        name: 'Leave Requests',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
    });

// 👉 Ye function hi notification dikhata hai — design + buttons dono yahan
export const displayLeaveNotification = async (data) => {
    const channelId = await getLeaveChannelId();

    const leaveTypeLabel = data.leave_type || 'Leave';
    const fromDateNice = formatDateNice(data.from_date);
    const toDateNice = formatDateNice(data.to_date);
    const reasonText = data.reason ? `\nReason: ${data.reason}` : '';

    const collapsedText = `${leaveTypeLabel} • ${data.member_name} has applied leave from ${fromDateNice} to ${toDateNice}`;
    const expandedText = `${leaveTypeLabel}\n${data.member_name} has applied leave from ${fromDateNice} to ${toDateNice}${reasonText}`;

    await notifee.displayNotification({
        title: 'New Leave Request',
        body: collapsedText, // 👈 collapsed state me ye dikhega (1 line)
        data,
        android: {
            channelId,
            smallIcon: 'ic_launcher',
            color: '#1565C0',
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default' },
            style: {
                type: AndroidStyle.BIGTEXT,
                text: expandedText, // 👈 expand karne pe ye proper multi-line dikhega
            },
            actions: [
                { title: '✓ Accept', pressAction: { id: 'approve' } },
                { title: '✗ Reject', pressAction: { id: 'reject' } },
            ],
        },
    });
};

// 👉 Approve/Reject button dabne par ye chalega — DB update yahi karta hai
export const handleLeaveAction = async (actionId, data) => {
    console.log('🔥 Button pressed:', actionId, data);
    if (!data?.leave_id) {
        console.log('🔥 leave_id missing, ruk gaya');
        return;
    }
    if (actionId !== 'approve' && actionId !== 'reject') return;

    const status = actionId === 'approve' ? 'Approve' : 'Reject';

    try {
        const response = await fetch(ENDPOINTS.ChangeLeaveStatus, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leave_id: data.leave_id, status }),
        });
        const result = await response.json();
        console.log('Action update result:', result);

        if (result.code === 200) {
            // 👈 Sirf staff ko notify karo — admin ko khud kuch nahi dikhna
            try {
                const notifyRes = await fetch(
                    'https://us-central1-webmastersinfotech-ae0da.cloudfunctions.net/notifyLeaveResponse',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            staff_id: data.staff_id,
                            status: status,
                            from_date: data.from_date,   // 👈 NAYA
                            to_date: data.to_date,       // 👈 NAYA
                        }),
                    }
                );
                const notifyResult = await notifyRes.json();
                console.log('🔥 Staff notify result:', notifyResult);
            } catch (notifyErr) {
                console.log('🔥 Staff notify error:', notifyErr);
            }
        }
    } catch (error) {
        console.log('handleLeaveAction error:', error);
    }
};