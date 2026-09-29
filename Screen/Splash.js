/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import {
  View,
  StatusBar,
  Animated,
  Easing,
  Image,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Premium Palette
const COLOR_BG = '#030A16';
const COLOR_PRIMARY_BLUE = '#00A3FF';
const COLOR_NAVY_DARK = '#0A213D';
const COLOR_TEXT_MUTED = '#94A3B8';
const COLOR_GLOW = 'rgba(0, 163, 255, 0.55)';

const Splash = () => {
  // Logo
  const logoScale = useRef(new Animated.Value(0.35)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  // Glow
  const glowPulse = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Text
  const webTextX = useRef(new Animated.Value(-40)).current;
  const webTextOpacity = useRef(new Animated.Value(0)).current;
  const mastersTextX = useRef(new Animated.Value(40)).current;
  const mastersTextOpacity = useRef(new Animated.Value(0)).current;

  // Line + Tagline
  const lineScaleX = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;

  // Particles
  const p1Y = useRef(new Animated.Value(0)).current;
  const p2Y = useRef(new Animated.Value(0)).current;
  const p3Y = useRef(new Animated.Value(0)).current;
  const p4X = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous loops
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.4,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.85,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particles floating
    const float = (anim, to, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: to,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();

    float(p1Y, -18, 2800);
    float(p2Y, 16, 3200);
    float(p3Y, -12, 2400);
    float(p4X, 14, 3600);

    // Main entrance sequence
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4.8,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),

      // Text split
      Animated.parallel([
        Animated.timing(webTextOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(webTextX, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(mastersTextOpacity, {
          toValue: 1,
          duration: 380,
          delay: 40,
          useNativeDriver: true,
        }),
        Animated.timing(mastersTextX, {
          toValue: 0,
          duration: 380,
          delay: 40,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Line
      Animated.timing(lineScaleX, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // Tagline
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const spinLogo = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-14deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLOR_BG} />

      {/* Floating Particles */}
      <Animated.View
        style={[
          styles.particle,
          {
            top: height * 0.22,
            left: width * 0.15,
            transform: [{ translateY: p1Y }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            top: height * 0.38,
            right: width * 0.12,
            width: 5,
            height: 5,
            opacity: 0.35,
            transform: [{ translateY: p2Y }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            bottom: height * 0.28,
            left: width * 0.22,
            width: 8,
            height: 8,
            borderRadius: 4,
            opacity: 0.5,
            transform: [{ translateY: p3Y }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            bottom: height * 0.18,
            right: width * 0.28,
            width: 4,
            height: 4,
            opacity: 0.45,
            transform: [{ translateX: p4X }],
          },
        ]}
      />

      {/* Main Content */}
      <View style={styles.centerContainer}>
        {/* Soft outer glow ring */}
        <Animated.View
          style={[
            styles.outerRing,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowPulse }],
            },
          ]}
        />

        {/* Main glow halo */}
        <Animated.View
          style={[
            styles.glowHalo,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowPulse }],
            },
          ]}
        />

        {/* Logo Card */}
        <Animated.View
          style={[
            styles.logoCard,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { rotate: spinLogo }],
            },
          ]}>
          {/* Inner soft highlight */}
          <View style={styles.logoInnerGlow} />
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand Title */}
        <View style={styles.titleRow}>
          <Animated.Text
            style={[
              styles.brandText,
              {
                opacity: webTextOpacity,
                transform: [{ translateX: webTextX }],
              },
            ]}>
            Web
          </Animated.Text>
          <Animated.Text
            style={[
              styles.brandText,
              styles.mastersText,
              {
                opacity: mastersTextOpacity,
                transform: [{ translateX: mastersTextX }],
              },
            ]}>
            Masters
          </Animated.Text>
        </View>

        {/* Tech Line with glow */}
        <Animated.View
          style={[
            styles.techLineWrapper,
            { transform: [{ scaleX: lineScaleX }] },
          ]}>
          <View style={styles.techLineGlow} />
          <View style={styles.techLine} />
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineY }],
          }}>
          <Text style={styles.taglineText}>I N F O T E C H</Text>
        </Animated.View>
      </View>

      {/* Bottom Progress */}
      <View style={styles.bottomBarContainer}>
        <Animated.View
          style={[
            styles.bottomBarFill,
            { transform: [{ scaleX: lineScaleX }] },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Glow layers
  outerRing: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(0, 163, 255, 0.15)',
  },
  glowHalo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLOR_PRIMARY_BLUE,
  },

  // Particles
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLOR_PRIMARY_BLUE,
    opacity: 0.55,
  },

  // Logo
  logoCard: {
    width: 122,
    height: 122,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: COLOR_PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
  },
  logoInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  logoImage: {
    width: 84,
    height: 84,
  },

  // Title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  mastersText: {
    color: COLOR_PRIMARY_BLUE,
  },

  // Tech line
  techLineWrapper: {
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techLineGlow: {
    position: 'absolute',
    height: 6,
    width: width * 0.42,
    backgroundColor: COLOR_GLOW,
    borderRadius: 3,
    opacity: 0.6,
  },
  techLine: {
    height: 2.5,
    width: width * 0.4,
    backgroundColor: COLOR_PRIMARY_BLUE,
    borderRadius: 2,
  },

  // Tagline
  taglineText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR_TEXT_MUTED,
    letterSpacing: 8,
  },

  // Bottom bar
  bottomBarContainer: {
    position: 'absolute',
    bottom: 42,
    width: 110,
    height: 3.5,
    backgroundColor: COLOR_NAVY_DARK,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bottomBarFill: {
    flex: 1,
    backgroundColor: COLOR_PRIMARY_BLUE,
    borderRadius: 3,
  },
});

export default Splash;