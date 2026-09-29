import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { displayLeaveNotification, handleLeaveAction } from './CommonFile/NotificationHandler';


// App band ho tab bhi data-only FCM message aane par notification dikhao
messaging().setBackgroundMessageHandler(async remoteMessage => {
    if (remoteMessage?.data?.type === 'leave_request') {
        await displayLeaveNotification(remoteMessage.data);
    }
});

// App band ho tab bhi Approve/Reject button dabne par DB update ho
notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) {
        await handleLeaveAction(detail.pressAction.id, detail.notification?.data);
    }
});

AppRegistry.registerComponent(appName, () => App);