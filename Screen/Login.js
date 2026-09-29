import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import colors, { baseUrl } from '../colors/Colors';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { ENDPOINTS } from '../CommonFile/Constant';
import { getFcmToken } from '../CommonFile/NotificationService';

const Login = () => {
  const navigation = useNavigation();
  const [number, setNumber] = useState('');
  const [numbererror, setNumberError] = useState('');
  const [password, setPassword] = useState('');
  const [passworderror, setPasswordError] = useState('');
  const [loginerror, setLoginError] = useState('');
  const [securtext, setSecureText] = useState(true);
  const [deviceId, setDeviceId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    getFcmToken().then(token => setFcmToken(token));
  }, []);




  useEffect(() => {
    DeviceInfo.getUniqueId()
      .then(id => setDeviceId(id))
      .catch(err => console.log('Device ID error', err));
  }, []);

  useEffect(() => {
    const checkLogin = async () => {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const memberId = await AsyncStorage.getItem('member_id');

      if (isLoggedIn === 'true' && memberId) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Deshboard' }],
        });
      }
    };
    checkLogin();
  }, []);

  const validation = () => {
    let isValid = true;

    if (!number) {
      setNumberError('Contact/Email is required');
      isValid = false;
    } else {
      setNumberError('');
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleLogin = () => {
    if (validation()) {
      logindata();
    }
  };

  const logindata = async () => {
    setLoginError('');
    setSubmitting(true);
    try {
      const response = await fetch(ENDPOINTS.Login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: number, password: password, device_id: deviceId, fcm_token: fcmToken, }),
      });

      const result = await response.json();

      if (result.code == 200) {
        const memberId = result.payload.member_id;
        const memberName = result.payload.member_name;
        const memberPosition = result.payload.member_position;

        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('member_id', memberId.toString());
        await AsyncStorage.setItem('member_name', memberName);
        await AsyncStorage.setItem('member_position', memberPosition);

        Toast.show({
          type: 'success',
          text1: 'Login Successful!',
          text2: `Welcome back, ${memberName}`,
          position: 'bottom',
          bottomOffset: 80,
          visibilityTime: 2000,
        });

        navigation.reset({
          index: 0,
          routes: [{ name: 'Deshboard' }],
        });
      } else {
        const msg =
          result.code == 400
            ? result.message
            : 'Login failed. Please enter valid credentials.';
        setLoginError(msg);

      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An error occurred during login. Please try again.');
      Toast.show({
        type: 'error',
        text1: 'Something went wrong',
        text2: 'Please check your internet and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={colors.TextBtn} barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/applogos.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>Welcome Back</Text>
            <Text style={styles.appSubtitle}>Login to continue</Text>
          </View>

          <View style={styles.card}>
            {/* Email / Number */}
            <Text style={styles.label}>
              Email / Number <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputBox,
                focusedField === 'number' && styles.inputBoxFocused,
                numbererror ? styles.inputBoxError : null,
              ]}>
              <TextInput
                placeholder="Enter contact number or email"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={number}
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={
                  /^[0-9]*$/.test(number) // agar sirf digits hain
                    ? 10
                    : undefined // email hai to unlimited
                }
                onFocus={() => setFocusedField('number')}
                onBlur={() => setFocusedField('')}
                onChangeText={text => {
                  // Sirf number type ho raha hai
                  if (/^[0-9]*$/.test(text)) {
                    setNumber(text.slice(0, 10));
                  } else {
                    // Email ya mixed text allow
                    setNumber(text);
                  }

                  if (!text) {
                    setNumberError('Contact/Email is required');
                  } else {
                    setNumberError('');
                  }
                }}
              />
            </View>
            {numbererror ? <Text style={styles.errorText}>{numbererror}</Text> : null}

            {/* Password */}
            <Text style={[styles.label, { marginTop: 18 }]}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputBox,
                styles.passwordBox,
                focusedField === 'password' && styles.inputBoxFocused,
                passworderror ? styles.inputBoxError : null,
              ]}>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, { flex: 1 }]}
                secureTextEntry={securtext}
                value={password}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                onChangeText={text => {
                  setPassword(text);
                  if (!text) {
                    setPasswordError('Password is required');
                  } else {
                    setPasswordError('');
                  }
                }}
              />
              <TouchableOpacity
                onPress={() => setSecureText(!securtext)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Image
                  source={
                    securtext
                      ? require('../assets/eye-close.png')
                      : require('../assets/eye-open.png')
                  }
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>
            {passworderror ? <Text style={styles.errorText}>{passworderror}</Text> : null}

            {loginerror ? (
              <View style={styles.loginErrorBox}>
                <Text style={styles.loginErrorText}>{loginerror}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={submitting}
              style={[styles.loginBtn, submitting && styles.loginBtnDisabled]}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>v1.0 · Internal Office App</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingTop: 50, paddingBottom: 30 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 140, height: 140 },
  appTitle: { fontSize: 22, fontFamily: 'Montserrat-ExtraBold', color: '#111827', marginTop: 8 },
  appSubtitle: { fontSize: 13, fontFamily: 'SemiBold24', color: '#6B7280', marginTop: 4 },
  card: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  label: { color: '#111827', fontFamily: 'Montserrat-ExtraBold', fontSize: 13, marginBottom: 8 },
  required: { color: '#DC2626' },
  inputBox: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  passwordBox: { flexDirection: 'row', alignItems: 'center' },
  inputBoxFocused: { borderColor: colors.primary, backgroundColor: '#fff' },
  inputBoxError: { borderColor: '#DC2626' },
  input: { color: '#111827', fontFamily: 'SemiBold24', fontSize: 14 },
  eyeIcon: { width: 20, height: 20, tintColor: '#6B7280' },
  errorText: { color: '#DC2626', fontFamily: 'SemiBold24', marginTop: 6, marginLeft: 4, fontSize: 12 },
  loginErrorBox: { marginTop: 14, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  loginErrorText: { color: '#DC2626', fontFamily: 'SemiBold24', textAlign: 'center', fontSize: 13 },
  loginBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    borderRadius: 12,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Montserrat-ExtraBold', letterSpacing: 0.3 },
  footerText: { marginTop: 24, color: '#9CA3AF', fontSize: 12, fontFamily: 'SemiBold24' },
});