import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

const RecordScreen = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
    };
    requestPermission();
  }, []);

  const startRecording = async () => {
    try {
      if (!permissionGranted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRecording.startAsync();
      setRecording(newRecording);
    } catch (err) {
      console.error('Error al iniciar la grabación:', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedUri(uri || null);
      setRecording(null);
      console.log('Audio grabado en:', uri);
    } catch (err) {
      console.error('Error al detener la grabación:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙 Grabadora (Expo)</Text>
      <Button
        title={recording ? 'Detener Grabación' : 'Iniciar Grabación'}
        onPress={recording ? stopRecording : startRecording}
      />
      {recordedUri && (
        <Text style={styles.path}>Guardado en: {recordedUri}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20 },
  path: { marginTop: 20, fontSize: 14, color: 'gray', textAlign: 'center' },
});

export default RecordScreen;
