/* eslint-disable prettier/prettier */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Login from './Login';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { setupNotificationListeners } from '../CommonFile/NotificationService';
import Deshboard from './Deshboard';
import CustomDrawer from '../Components/CustomDrawer';
import Leave from './Leave';
import AddLeave from './AddLeave';
import Attendance from './Attendance';
import Task from './Task';
import AddTask from './AddTask';
import AddModule from './AddModule';
import Module from './Module';

import Project from './Project';
import AddProject from './AddProject';
import AttendanceRepo from './AttendanceRepo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransitionPresets } from '@react-navigation/stack';
import Splash from './Splash';
import UpdateProject from './UpdateProject';
import UpdateModule from './UpdateModule';
import Password from './Password';
import AddProfile from './AddProfile';
import MyAttendances from './MyAttendances';
import UpdateLeave from './UpdateLeave';
import Allattendance from './Allattendance';
import ProjectReport from './ProjectReport';
import ProjectTaskList from './ProjectTaskList';
import ProjectDetails from './ProjectDetails';
import Staff from './Staff';
import AddStaff from './AddStaff';
import StaffDetails from './StaffDetails';
import UpdateStaff from './UpdateStaff';
import ProjectDetails2 from './ProjectDetails2';
import TaskDetails from './TaskDetails';
import UpdateTask from './UpdateTask';
import Toast from 'react-native-toast-message';
import toastConfig from '../CommonFile/ToastConfig';
import AdminLeave from './Leave/AdminLeave';
import AddFestival from './Festival/AddFestival';
import ListFestival from './Festival/ListFestival';
import Addbirthday from './Bithday/Addbirthday';
import Listbirthday from './Bithday/Listbirthday';
import ReportScreen from './Report/ReportScreen';
import AttendanceReport from './Report/AttendanceReport';
import TaskDetail from './TaskDetail';
import notifee from '@notifee/react-native';
import Rules from './Rules';


const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();
const MainStack = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const loggedIn = await AsyncStorage.getItem('isLoggedIn');
        setIsLoggedIn(loggedIn === 'true');
      } catch (error) {
        console.error('Error checking login status', error);
        setIsLoggedIn(false); // Default to false if there is an error
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      }
    };

    checkLoginStatus();
  }, []);

  if (loading) {
    return <Splash />;
  }
  return (


    <Stack.Navigator
      initialRouteName={isLoggedIn ? 'Deshboard' : 'Login'}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        ...TransitionPresets.FadeFromBottomAndroid,
      }}>
      <Stack.Screen
        component={Login}
        name="Login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Deshboard}
        name="Deshboard"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={CustomDrawer}
        name="CustomDrawer"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Leave}
        name="Leave"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={AddLeave}
        name="AddLeave"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Attendance}
        name="Attendance"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Task}
        name="Task"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={AddTask}
        name="AddTask"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={AddModule}
        name="AddModule"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Module}
        name="Module"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Project}
        name="Project"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={AddProject}
        name="AddProject"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={AttendanceRepo}
        name="AttendanceRepo"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={UpdateProject}
        name="UpdateProject"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={UpdateModule}
        name="UpdateModule"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Password}
        name="Password"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={AddProfile}
        name="AddProfile"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={MyAttendances}
        name="MyAttendances"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={UpdateLeave}
        name="UpdateLeave"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Allattendance}
        name="Allattendance"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={ProjectReport}
        name="ProjectReport"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={ProjectTaskList}
        name="ProjectTaskList"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={ProjectDetails}
        name="ProjectDetails"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Staff}
        name="Staff"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={AddStaff}
        name="AddStaff"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={StaffDetails}
        name="StaffDetails"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={UpdateStaff}
        name="UpdateStaff"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={ProjectDetails2}
        name="ProjectDetails2"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={TaskDetails}
        name="TaskDetails"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={UpdateTask}
        name="UpdateTask"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        component={AdminLeave}
        name="AdminLeave"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        component={AddFestival}
        name="AddFestival"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        component={ListFestival}
        name="ListFestival"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Addbirthday}
        name="Addbirthday"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        component={Listbirthday}
        name="Listbirthday"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        component={ReportScreen}
        name="ReportScreen"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        component={AttendanceReport}
        name="AttendanceReport"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={TaskDetail}
        name="TaskDetail"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={Rules}
        name="Rules"
        options={{ headerShown: false }}
      />









    </Stack.Navigator>
  );
};

const RoutNavigation = () => {
  useEffect(() => {
    const setupNotifeePermission = async () => {
      const settings = await notifee.requestPermission();
      console.log('🔔 Notifee permission status:', settings);
    };
    setupNotifeePermission();

    setupNotificationListeners(navigationRef);
  }, []);
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen component={MainStack} name="MainStack" options={{ headerShown: false }} />
      </Stack.Navigator>
      <Toast config={toastConfig} />
    </NavigationContainer>
  );
};

export default RoutNavigation;

const styles = StyleSheet.create({});
