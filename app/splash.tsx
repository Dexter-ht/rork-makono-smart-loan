import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [displayNumber, setDisplayNumber] = useState<string>('0');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const shuffleInterval = setInterval(() => {
      const randomNum = Math.floor(Math.random() * 1000000);
      setDisplayNumber(randomNum.toLocaleString());
    }, 50);

    const slowDownPhase = setTimeout(() => {
      clearInterval(shuffleInterval);
      
      let current = 0;
      const target = 1000000;
      const increment = 50000;
      
      const countUp = setInterval(() => {
        current += increment;
        if (current >= target) {
          setDisplayNumber('1,000,000');
          clearInterval(countUp);
          
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start(() => {
              router.replace('/');
            });
          }, 1000);
        } else {
          setDisplayNumber(current.toLocaleString());
        }
      }, 50);
    }, 1500);

    return () => {
      clearInterval(shuffleInterval);
      clearTimeout(slowDownPhase);
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7c3aed', '#a855f7', '#c084fc']}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.appName}>Makono Smart Loan</Text>
          
          <View style={styles.amountContainer}>
            <View style={styles.numberBox}>
              <Text style={styles.number}>{displayNumber}</Text>
            </View>
            <Text style={styles.currency}>MKW</Text>
          </View>
          
          <Text style={styles.tagline}>Your Financial Partner</Text>
        </Animated.View>

        <View style={styles.decorativeElements}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  numberBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
  },
  number: {
    fontSize: 60,
    fontWeight: '900' as const,
    color: '#fff',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  currency: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  decorativeElements: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    top: '40%',
    left: -20,
  },
});
