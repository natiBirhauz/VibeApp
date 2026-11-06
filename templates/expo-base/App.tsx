import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  SafeAreaView,
  StatusBar,
} from 'react-native';

// RTL Support — Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.content}>
        <Text style={styles.title}>VibeApp</Text>
        <Text style={styles.subtitle}>האפליקציה שלך מוכנה!</Text>

        <View style={styles.card}>
          <Text style={styles.counter}>{count}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setCount(c => c + 1)}
          >
            <Text style={styles.buttonText}>לחץ כאן</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  counter: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
