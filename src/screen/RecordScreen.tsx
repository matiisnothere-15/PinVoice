import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { transcribeAudio, generateSummary, generateQuestions, generateMindMap } from '../services/openaiService';

// Firebase imports - User needs to ensure firebaseConfig.js is set up
import { db } from '../firebase/firebaseConfig'; // This will cause an error if file doesn't exist
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


const RecordScreen = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // This will cover summary, questions, and mind map
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Define the type for better clarity, matching AnalysisScreen's expectation
  type MindMapDisplayNode = { title: string; children?: string[] };
  const [mindMapData, setMindMapData] = useState<MindMapDisplayNode[] | null>(null);
  const [performFullAnalysis, setPerformFullAnalysis] = useState(true); // Default to full analysis

  const navigation = useNavigation();

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
      const tempUri = recording.getURI();
      if (!tempUri) {
        console.error('No se pudo obtener la URI de la grabación.');
        return;
      }

      // Reset transcription and analysis states
      setTranscription(null);
      setTranscriptionError(null);
      setSummary(null);
      setQuestions(null);
      setMindMapData(null); // Reset mind map data
      setAnalysisError(null);

      const fileName = `recording-${Date.now()}.m4a`; // Changed to .m4a for compatibility with openaiService
      const permanentPath = `${FileSystem.documentDirectory}recordings/${fileName}`;

      // Ensure the recordings directory exists
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}recordings/`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}recordings/`, { intermediates: true });
      }

      await FileSystem.moveAsync({
        from: tempUri,
        to: permanentPath,
      });

      setRecordedUri(permanentPath);
      setRecording(null);
      console.log('Audio guardado en:', permanentPath);

      // Start transcription
      setIsTranscribing(true);
      try {
        const transcriptText = await transcribeAudio(permanentPath);
        setTranscription(transcriptText);
        console.log('Transcripción:', transcriptText);

        // Variables to hold analysis results
        let currentSummary: string | null = null;
        let currentQuestions: string[] | null = null;
        let currentMindMap: MindMapDisplayNode[] | null = null;

        if (transcriptText) {
          if (performFullAnalysis) {
            setIsAnalyzing(true); // Set loading state for analysis part
            console.log('Iniciando análisis completo...');
            try {
              currentSummary = await generateSummary(transcriptText);
              setSummary(currentSummary);
              console.log('Resumen:', currentSummary);

              currentQuestions = await generateQuestions(transcriptText);
              setQuestions(currentQuestions);
              console.log('Preguntas:', currentQuestions);

              currentMindMap = await generateMindMap(transcriptText);
              setMindMapData(currentMindMap);
              console.log('Mapa Mental (Transformado):', currentMindMap);
            } catch (analysisErr) {
              console.error('Error durante el análisis completo:', analysisErr);
              setAnalysisError(analysisErr instanceof Error ? analysisErr.message : 'Error desconocido durante el análisis');
              // Clear potentially partial results on error
              setSummary(null); currentSummary = null;
              setQuestions(null); currentQuestions = null;
              setMindMapData(null); currentMindMap = null;
            } finally {
              setIsAnalyzing(false); // Clear loading state for analysis part
            }
          } else {
            // Not performing full analysis, ensure states are cleared
            console.log('Saltando análisis completo.');
            setSummary(null);
            setQuestions(null);
            setMindMapData(null);
          }

          // Save to Firestore
          // We always save the transcription if available.
          // Analysis data is saved if performFullAnalysis was true (even if some parts failed and are null)
          if (permanentPath && transcriptText) {
            try {
              const recordingDataToSave: any = {
                audioUri: permanentPath,
                transcription: transcriptText,
                createdAt: serverTimestamp(),
                analysisPerformed: performFullAnalysis, // Track if full analysis was attempted
                summary: performFullAnalysis ? currentSummary : null,
                questions: performFullAnalysis ? currentQuestions : null,
                mindMap: performFullAnalysis ? currentMindMap : null,
              };

              // Remove null properties before saving to Firestore if desired,
              // or Firestore will store them as null. For simplicity, we'll allow nulls.
              // Object.keys(recordingDataToSave).forEach(key =>
              //   recordingDataToSave[key] === null && delete recordingDataToSave[key]
              // );

              const docRef = await addDoc(collection(db, "recordings"), recordingDataToSave);
              console.log("Grabación guardada en Firestore con ID: ", docRef.id);
            } catch (e) {
              console.error("Error añadiendo documento a Firestore: ", e);
              setAnalysisError((prevError) => prevError ? `${prevError}\nError guardando en DB.` : 'Error guardando en DB.');
            }
          }
        } else {
          // transcriptText is null
          console.log('Transcripción fallida, no se procede con análisis ni guardado.');
        }
      } catch (error) {
        console.error('Error al transcribir audio:', error);
        setTranscriptionError(error instanceof Error ? error.message : 'Error desconocido al transcribir');
      } finally {
        setIsTranscribing(false);
      }
    } catch (err) {
      console.error('Error al detener y guardar la grabación:', err);
      setTranscriptionError('Error al guardar grabación: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      // Ensure loading states are reset if saving fails before transcription attempt
      setIsTranscribing(false);
      setIsAnalyzing(false);
    }
  };

  const isLoading = isTranscribing || isAnalyzing;
  let statusMessage = '';
  if (isTranscribing) {
    statusMessage = 'Transcribiendo audio...';
  } else if (isAnalyzing) {
    statusMessage = 'Generando análisis (resumen, preguntas, mapa mental)...';
  }


  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙 Grabadora (Expo)</Text>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Análisis Completo</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={performFullAnalysis ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={setPerformFullAnalysis}
          value={performFullAnalysis}
          disabled={isLoading || !!recording}
        />
      </View>

      <Button
        title={recording ? 'Detener Grabación' : (isLoading ? statusMessage : 'Iniciar Grabación')}
        onPress={recording ? stopRecording : startRecording}
        disabled={isLoading}
      />
      {recordedUri && !isLoading && (
        <Text style={styles.path}>Guardado en: {recordedUri}</Text>
      )}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>{statusMessage}</Text>
        </View>
      )}
      {transcriptionError && (
        <Text style={[styles.errorText]}>Error de Transcripción: {transcriptionError}</Text>
      )}
      {analysisError && (
        <Text style={[styles.errorText]}>Error de Análisis: {analysisError}</Text>
      )}
      {/* Displaying results directly on RecordScreen can be removed later if desired */}
      {transcription && !isLoading && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionTitle}>Transcripción:</Text>
          <Text style={styles.transcriptionText}>{transcription}</Text>
        </View>
      )}
      {summary && !isLoading && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen:</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      )}
      {questions && questions.length > 0 && !isLoading && (
        <View style={styles.questionsContainer}>
          <Text style={styles.questionsTitle}>Preguntas Clave:</Text>
          {questions.map((q, index) => (
            <Text key={index} style={styles.questionItem}>- {q}</Text>
          ))}
        </View>
      )}
      {/* Mind map data is not displayed directly on RecordScreen for now, only passed to AnalysisScreen */}

      {/* Button to navigate to AnalysisScreen:
          - Appears if transcription is successful.
          - Passes whatever data is available (transcription always, analysis parts if generated).
      */}
      {!isLoading && transcription && (
        <Button
          title={performFullAnalysis ? "Ver Análisis Completo" : "Ver Transcripción"}
          onPress={() => navigation.navigate('Analysis', {
            transcription: transcription, // Always pass transcription
            summary: summary,           // Pass current state, will be null if not generated
            questions: questions,       // Pass current state, will be null if not generated
            mindMap: mindMapData,       // Pass current state, will be null if not generated
          })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20 },
  path: { marginTop: 20, fontSize: 14, color: 'gray', textAlign: 'center' },
  transcriptionContainer: { marginTop: 20, paddingHorizontal: 10, width: '100%' },
  transcriptionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  transcriptionText: { fontSize: 16 },
  summaryContainer: { marginTop: 20, paddingHorizontal: 10, width: '100%' },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  summaryText: { fontSize: 16 },
  questionsContainer: { marginTop: 20, paddingHorizontal: 10, width: '100%' },
  questionsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  questionItem: { fontSize: 16, marginLeft: 10, marginBottom: 3 },
  loadingContainer: { marginTop: 20, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: 'gray' },
  errorText: { marginTop: 10, fontSize: 14, color: 'red', textAlign: 'center', paddingHorizontal:10 },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Or 'center' if you prefer them closer
    width: '80%', // Adjust width as needed
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal:15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  switchLabel: {
    fontSize: 16,
    marginRight: 10, // Add some space between label and switch
  },
});

export default RecordScreen;
