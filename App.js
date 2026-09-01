import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ASCENSÃO</Text>
      <Text style={styles.subtitle}>O aplicativo está funcionando.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050509',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: '#9B84FF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  subtitle: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});
