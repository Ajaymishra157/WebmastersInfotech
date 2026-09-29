/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prettier/prettier */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react'
import { View, Text } from 'react-native'
import { ENDPOINTS } from '../CommonFile/Constant';

const LogoutUser = () => {
  const navigation = useNavigation();

  const fetchData = async () => {
    console.log('abc')
    const id = await AsyncStorage.getItem('member_id');
    console.log('Attendance Page Member ID:', id);

    if (id) {


      try {

        const response = await fetch(ENDPOINTS.ListProfile, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            member_id: id,
          }),
        });

        const result = await response.json();
        console.log('Details:', result);
        if (result.code == 200) {
          const userstatus = result.payload.status;
          if (userstatus != 'Active') {
            await AsyncStorage.clear();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }], // make sure 'Login' matches your actual screen name
            });
          }
        }
      } catch (error) {
        console.log('Error fetching profile:', error);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  return <View />;
};

export default LogoutUser;