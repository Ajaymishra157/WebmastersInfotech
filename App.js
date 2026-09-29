/* eslint-disable prettier/prettier */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import RoutNavigation from './Screen/RoutNavigation'
import { enableScreens } from 'react-native-screens';
enableScreens(false);

const App = () => {
  return (
    <RoutNavigation />
  )
}
export default App;
