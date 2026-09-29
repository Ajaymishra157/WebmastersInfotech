import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors, { baseUrl } from '../colors/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS } from '../CommonFile/Constant';

const Password = () => {
  const navigation = useNavigation();
  const [oldPassword, setOldPassword] = useState('');
  const [NewPassword, setNewPassword] = useState('');
  const [ConfirmPassword, setConfirmPassword] = useState('');
  const [memberId, setMemberId] = useState([]);
  const [loading, setLoading] = useState(false);

  // Show/Hide states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Error states
  const [oldPasswordError, setOldPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    const getMemberId = async () => {
      const id = await AsyncStorage.getItem('member_id');
      setMemberId(id);
    };
    getMemberId();
  }, []);

  const validateFields = () => {
    let valid = true;
    setOldPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    if (!oldPassword) {
      setOldPasswordError('Old password is required');
      valid = false;
    } else if (oldPassword.length < 6) {
      setOldPasswordError('Old password must be at least 6 characters');
      valid = false;
    }

    if (!NewPassword) {
      setNewPasswordError('New password is required');
      valid = false;
    } else if (NewPassword.length < 6) {
      setNewPasswordError('New password must be at least 6 characters');
      valid = false;
    }

    if (!ConfirmPassword) {
      setConfirmPasswordError('Confirm password is required');
      valid = false;
    } else if (ConfirmPassword.length < 6) {
      setConfirmPasswordError('Confirm password must be at least 6 characters');
      valid = false;
    } else if (NewPassword !== ConfirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  const ChangePass = async () => {
    if (!validateFields()) return;

    setLoading(true);
    const url = ENDPOINTS.ChangePassword;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          old_password: oldPassword,
          new_password: NewPassword,
          confirm_password: ConfirmPassword,
        }),
      });

      const result = await response.json();
      console.log('Change Password Result:', result);

      if (result.code === 200) {
        await AsyncStorage.multiRemove([
          'member_id',
          'member_name',
          'isLoggedIn',
          'password',
        ]);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        setOldPasswordError(result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change Password Error:', error);
      setOldPasswordError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {/* Header */}
      <View style={{
        width: '100%',
        height: 50,
        backgroundColor: colors.primary,
        flexDirection: 'row',
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 10, marginTop: 10 }}>
          <Image
            source={require('../assets/back.png')}
            style={{ width: 20, height: 20, tintColor: '#fff' }}
          />
        </TouchableOpacity>
        <Text style={{
          marginLeft: '20%',
          fontFamily: 'Montserrat-ExtraBold',
          fontSize: 18,
          color: '#fff',
          marginTop: 5,
        }}>
          Change Password
        </Text>
      </View>

      <View style={{ width: '100%', alignItems: 'center' }}>
        <View style={{ width: '95%' }}>

          {/* Old Password */}
          <Text style={{
            fontFamily: 'Montserrat-ExtraBold',
            color: '#000',
            fontSize: 12,
            marginBottom: 5,
            marginTop: 20,
          }}>
            Old Password <Text style={{ color: 'red' }}>*</Text>
          </Text>
          <View style={{
            width: '100%',
            height: 50,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: oldPasswordError ? 'red' : '#000',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
          }}>
            <TextInput
              placeholder="Old Password"
              placeholderTextColor={'#000'}
              secureTextEntry={!showOldPassword}
              value={oldPassword}
              onChangeText={text => {
                setOldPassword(text);
                if (oldPasswordError) setOldPasswordError('');
              }}
              style={{ color: '#000', fontFamily: 'SemiBold24', flex: 1 }}
            />
            <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
              <Icon name={showOldPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>
          {oldPasswordError ? (
            <Text style={{ color: 'red', fontSize: 12, marginTop: 4, marginLeft: 4 }}>
              {oldPasswordError}
            </Text>
          ) : null}

          {/* New Password */}
          <Text style={{
            fontFamily: 'Montserrat-ExtraBold',
            color: '#000',
            fontSize: 12,
            marginBottom: 5,
            marginTop: 20,
          }}>
            New Password <Text style={{ color: 'red' }}>*</Text>
          </Text>
          <View style={{
            width: '100%',
            height: 50,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: newPasswordError ? 'red' : '#000',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
          }}>
            <TextInput
              placeholder="New Password"
              placeholderTextColor={'#000'}
              secureTextEntry={!showNewPassword}
              value={NewPassword}
              onChangeText={text => {
                setNewPassword(text);
                if (newPasswordError) setNewPasswordError('');
                if (
                  ConfirmPassword &&
                  text.length >= ConfirmPassword.length &&
                  text !== ConfirmPassword
                ) {
                  setConfirmPasswordError('Passwords do not match');
                }
              }}
              style={{ color: '#000', fontFamily: 'SemiBold24', flex: 1 }}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
              <Icon name={showNewPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>
          {newPasswordError ? (
            <Text style={{ color: 'red', fontSize: 12, marginTop: 4, marginLeft: 4 }}>
              {newPasswordError}
            </Text>
          ) : null}

          {/* Confirm Password */}
          <Text style={{
            fontFamily: 'Montserrat-ExtraBold',
            color: '#000',
            fontSize: 12,
            marginBottom: 5,
            marginTop: 20,
          }}>
            Confirm New Password <Text style={{ color: 'red' }}>*</Text>
          </Text>
          <View style={{
            width: '100%',
            height: 50,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: confirmPasswordError ? 'red' : '#000',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
          }}>
            <TextInput
              placeholder="Confirm New Password"
              placeholderTextColor={'#000'}
              secureTextEntry={!showConfirmPassword}
              value={ConfirmPassword}
              onChangeText={text => {
                setConfirmPassword(text);
                if (confirmPasswordError) setConfirmPasswordError('');
                if (
                  NewPassword &&
                  text.length >= NewPassword.length &&
                  text !== NewPassword
                ) {
                  setConfirmPasswordError('Passwords do not match');
                }
              }}
              style={{ color: '#000', fontFamily: 'SemiBold24', flex: 1 }}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Icon name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? (
            <Text style={{ color: 'red', fontSize: 12, marginTop: 4, marginLeft: 4 }}>
              {confirmPasswordError}
            </Text>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={ChangePass}
            disabled={loading}
            style={{
              width: '100%',
              height: 50,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 20,
              borderRadius: 10,
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: '#fff', fontFamily: 'Montserrat-ExtraBold' }}>
                Change
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
};

export default Password;

const styles = StyleSheet.create({});