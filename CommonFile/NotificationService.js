import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';


/**
 * Login se PEHLE (ya login form open hote hi) call karo.
 * Permission maangta hai aur current FCM token return karta hai —
 * isko Login.js me login API ke body me device_id ki tarah bhej dena.
 */
export const getFcmToken = async () => {
    try {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
            console.log('Firebase permission not granted, status:', authStatus);
            return null;
        }

        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        return token;
    } catch (error) {
        console.log('getFcmToken error:', error);
        return null;
    }
};

/**
 * Token refresh hone par (rare, lekin hota hai) — naya token PHP ko
 * update karne ke liye ye function call karo apne UpdateFcmToken
 * API ke saath, jisme member_id aur naya token bhejna hai.
 *
 * Example wiring in App.js:
 *   useEffect(() => {
 *     const unsub = onTokenRefreshHandler(async (newToken) => {
 *       const memberId = await AsyncStorage.getItem('member_id');
 *       if (memberId) {
 *         await fetch(ENDPOINTS.UpdateFcmToken, {
 *           method: 'POST',
 *           headers: { 'Content-Type': 'application/json' },
 *           body: JSON.stringify({ member_id: memberId, fcm_token: newToken }),
 *         });
 *       }
 *     });
 *     return unsub;
 *   }, []);
 */
export const onTokenRefreshHandler = (callback) => {
    return messaging().onTokenRefresh(callback);
};

/**
 * App.js me ek baar call karo (top level, navigationRef ke saath).
 * Foreground, background aur quit state — teeno me notification
 * handle karta hai aur tap hone par navigationRef se redirect karta hai.
 */
export const setupNotificationListeners = (navigationRef) => {
    // Foreground me message aane par notifee se local notification dikhao
    messaging().onMessage(async remoteMessage => {
        console.log('🔔 FCM Message Received:', JSON.stringify(remoteMessage));

        if (remoteMessage?.data?.type === 'leave_request') {
            await displayLeaveNotification(remoteMessage.data); // 👈 buttons wala design
            return;
        }

        await notifee.displayNotification({
            title: remoteMessage.notification?.title || remoteMessage.data?.title || 'Notification',
            body: remoteMessage.notification?.body || remoteMessage.data?.body || '',
            data: remoteMessage.data,
            android: {
                channelId: await getChannelId(),
                importance: AndroidImportance.HIGH,
                pressAction: { id: 'default' },
                smallIcon: 'ic_launcher',
            },
        });
    });

    // Background me app open hui notification tap se (app minimized thi)
    messaging().onNotificationOpenedApp(remoteMessage => {
        if (remoteMessage?.data) {
            handleNotificationRedirect(remoteMessage.data, navigationRef);
        }
    });

    // App bilkul band thi, notification tap se khuli (cold start)
    messaging()
        .getInitialNotification()
        .then(remoteMessage => {
            if (remoteMessage?.data) {
                handleNotificationRedirect(remoteMessage.data, navigationRef);
            }
        });

    // Notifee foreground tap event (jab app open hi thi)
    notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.ACTION_PRESS) {
            handleLeaveAction(detail.pressAction.id, detail.notification?.data);
            return;
        }
        if (type === EventType.PRESS && detail.notification?.data) {
            handleNotificationRedirect(detail.notification.data, navigationRef);
        }
    });

    // Notifee background tap event
    notifee.onBackgroundEvent(async ({ type, detail }) => {
        if (type === EventType.PRESS && detail.notification?.data) {
            handleNotificationRedirect(detail.notification.data, navigationRef);
        }
    });
};

const getChannelId = async () => {
    return await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
    });
};

/**
 * data.type ke hisaab se Leave.js pe navigate karta hai.
 * - leave_request: CEO/HR ko us particular staff ka pending leave dikhana hai
 * - leave_response: Staff ko apna updated leave status dikhana hai
 */
const handleNotificationRedirect = (data, navigationRef) => {
    console.log('🔔 handleNotificationRedirect called with data:', data);

    if (!navigationRef?.current) {
        console.log('🔔 navigationRef abhi ready nahi hai, redirect ruk gaya');
        return;
    }

    if (data.type === 'leave_request' || data.type === 'leave_response') {
        console.log('🔔 Navigating to Leave screen (with Dashboard in stack)');
        navigationRef.current.dispatch(
            CommonActions.reset({
                index: 1,
                routes: [
                    { name: 'MainStack', params: { screen: 'Deshboard' } },
                    {
                        name: 'MainStack',
                        params: {
                            screen: 'Leave',
                            params: {
                                leave_id: data.leave_id,
                                initialStatus: data.type === 'leave_response' ? data.status : 'Pending',
                            },
                        },
                    },
                ],
            })
        );
    } else if (data.type === 'birthday_reminder') {
        // ---- NEW: pehle Dashboard, phir uske upar Listbirthday push karo ----
        // taaki back press karne par Dashboard pe wapis aa sake
        console.log('🔔 Navigating to Listbirthday screen with Dashboard in stack');
        navigationRef.current.dispatch(
            CommonActions.reset({
                index: 1,
                routes: [
                    { name: 'MainStack', params: { screen: 'Deshboard' } },
                    { name: 'MainStack', params: { screen: 'Listbirthday' } },
                ],
            })
        );
    } else if (data.type === 'announcement') {
        // ---- NAYA: Rules/Announcement notification tap se — pehle Dashboard,
        // phir uske upar Rules screen push karo (Announcements tab open karke) ----
        console.log('🔔 Navigating to Rules screen with Dashboard in stack');
        navigationRef.current.dispatch(
            CommonActions.reset({
                index: 1,
                routes: [
                    { name: 'MainStack', params: { screen: 'Deshboard' } },
                    {
                        name: 'MainStack',
                        params: {
                            screen: 'Rules',
                            params: {
                                initialTab: data.announce_type || 'announcements',
                            },
                        },
                    },
                ],
            })
        );
    } else {
        console.log('🔔 Type match nahi hua:', data.type);
    }
};

