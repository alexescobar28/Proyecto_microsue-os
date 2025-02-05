import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useEffect, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import { Audio } from 'expo-av';

import { StatusBar } from 'expo-status-bar';

import Ionicons from '@expo/vector-icons/Ionicons';

export default function RootLayout() {
  const [permission, requestPermission] = useCameraPermissions();
  const [monitoring, setMonitoring] = useState(false);
  const [serverResponse, setServerResponse] = useState(null);
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);
  const lastDetectionTime = useRef(0);
  const [sound, setSound] = useState(null);

  const SERVER_URL = 'http:/192.168.100.10:5000/process_frame';

  useEffect(() => {  // loud sound when app is opened
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm.mp3')
        );
        setSound(sound);
      } catch (error) {
        console.error('Error loading sound', error);
      }
    }
    loadSound();
    return () => sound?.unloadAsync();
  }, []);

  useEffect(() => {
    monitoring ? startMonitoring() : stopMonitoring();
    return stopMonitoring;
  }, [monitoring]);

  const startMonitoring = () => {
    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.1,
          animateShutter: false,
          shutterSound: false,
          mute: true,
        });

        const formData = new FormData();
        formData.append('frame', {
          uri: photo.uri,
          name: 'frame.jpg',
          type: 'image/jpeg',
        });

        const response = await fetch(SERVER_URL, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const data = await response.json();
        setServerResponse(data);

        if (data.is_microsleep && Date.now() - lastDetectionTime.current > 3000) {
          sound?.replayAsync({ isLooping: true }).catch(console.error);
          lastDetectionTime.current = Date.now();
        } else if (!data.is_microsleep) {
          sound?.stopAsync().catch(console.error);
        }
      } catch (error) {
        console.error('Error processing frame:', error);
      }
    }, 1000);
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      sound?.stopAsync().catch(console.error);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => sound?.stopAsync().catch(console.error);
  }, [sound]);

  const toggleMonitoring = () => {
    setMonitoring(prev => !prev);
    if (!monitoring) {
      fetch('http://192.168.100.10:5000/reset', { method: 'POST' }).catch(console.error);
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
      <CameraView ref={cameraRef} style={styles.camera} facing={'front'} animateShutter={false}>
        <StatusBar hidden/>
        <View style={styles.buttonContainer}>
         <View style={styles.monitoringTextContainer}>
            {monitoring ? <Ionicons name="camera" size={16} color="black"/> : ''}
            <Text style={styles.monitoringText}>{monitoring ? 'Monitoreando' : 'Pausado'}</Text>
         </View>
          <TouchableOpacity onPress={toggleMonitoring}>
            <Text style={styles.text}>{monitoring ? 
            <Ionicons name="pause" size={16} color="black" /> : 
            <Ionicons name="play" size={16} color="black" />}</Text>
          </TouchableOpacity>
        </View>
        {serverResponse?.is_microsleep && (
          <View style={styles.statsContainer}>
            <Ionicons name="alert-circle" size={24} color="white" />
            <Text style={styles.statsText}>¡Alerta! Posible somnolencia detectada.</Text>
          </View>
        )}
      </CameraView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -32,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
    marginTop: -32,
    width: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    top: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  monitoringText: {
    color: 'black',
    position: 'relative',
  },
  monitoringTextContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 10,
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
  },
  text: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 10,
    borderRadius: 10,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
  },
  statsContainer: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    bottom: 80,
    backgroundColor: 'rgba(112, 50, 50, 0.5)',
    borderColor: 'rgba(82, 45, 45, 0.8)',
    borderWidth: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: 'fit-content',
    alignSelf: 'center',
  },
  statsText: {
    color: 'white',
    fontSize: 16,
    marginVertical: 2,
  },
});
