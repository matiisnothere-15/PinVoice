import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styled } from 'nativewind';

// Firebase imports - User needs to ensure firebaseConfig.js is set up
import { db } from '../firebase/firebaseConfig'; // This will cause an error if file doesn't exist
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledActivityIndicator = styled(ActivityIndicator);

// Define the structure of a recording item, mirroring what's saved in Firestore
// and what AnalysisScreen expects for mindMap.
type MindMapDisplayNode = { title: string; children?: string[] };
export type RecordingItem = {
  id: string;
  audioUri: string;
  transcription: string;
  summary: string;
  questions: string[];
  mindMap: MindMapDisplayNode[];
  createdAt: Timestamp; // Firestore Timestamp
};

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecordings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const recordingsCol = collection(db, "recordings");
      const q = query(recordingsCol, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedRecordings: RecordingItem[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRecordings.push({ id: doc.id, ...doc.data() } as RecordingItem);
      });
      setRecordings(fetchedRecordings);
    } catch (e) {
      console.error("Error fetching recordings: ", e);
      setError(e instanceof Error ? e.message : "Failed to fetch recordings.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecordings();
  };

  const handlePressItem = (item: RecordingItem) => {
    // Convert Firestore Timestamp to Date, then toISOString, or pass as is if AnalysisScreen can handle it.
    // For simplicity, AnalysisScreen might not need createdAt. If it does, ensure it's serializable.
    // The core data (transcription, summary, etc.) is what AnalysisScreen primarily uses.
    navigation.navigate('Analysis', {
      transcription: item.transcription,
      summary: item.summary,
      questions: item.questions,
      mindMap: item.mindMap,
      // audioUri: item.audioUri, // Optional: if AnalysisScreen needs to show/play it
      // title: item.id, // Optional: pass ID as a title or for other purposes
    });
  };

  if (isLoading && !refreshing) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-white">
        <StyledActivityIndicator size="large" color="#0000ff" />
        <StyledText className="mt-2 text-gray-600">Cargando historial...</StyledText>
      </StyledView>
    );
  }

  if (error) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-white p-5">
        <StyledText className="text-red-500 text-center text-lg">Error: {error}</StyledText>
        <StyledTouchableOpacity
          className="mt-4 bg-blue-500 py-2 px-4 rounded active:bg-blue-600"
          onPress={fetchRecordings}
        >
          <StyledText className="text-white font-semibold">Reintentar</StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  if (recordings.length === 0) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-white p-5">
        <StyledText className="text-gray-600 text-lg text-center">No hay grabaciones en el historial.</StyledText>
         <StyledTouchableOpacity
          className="mt-6 bg-blue-500 py-3 px-6 rounded-lg active:bg-blue-600 shadow-md"
          onPress={() => navigation.navigate('Record')}
        >
          <StyledText className="text-white font-semibold text-lg">Grabar Nueva Nota</StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  const renderItem = ({ item }: { item: RecordingItem }) => (
    <StyledTouchableOpacity
      className="bg-gray-100 p-4 mb-3 mx-3 rounded-lg shadow active:bg-gray-200"
      onPress={() => handlePressItem(item)}
    >
      <StyledText className="text-lg font-semibold text-blue-700">
        Grabación - {new Date(item.createdAt?.toDate()).toLocaleString()}
      </StyledText>
      <StyledText className="text-sm text-gray-700 mt-1" numberOfLines={2}>
        Transcripción: {item.transcription || "N/A"}
      </StyledText>
      <StyledText className="text-sm text-gray-600 mt-1" numberOfLines={1}>
        Resumen: {item.summary || "N/A"}
      </StyledText>
    </StyledTouchableOpacity>
  );

  return (
    <StyledView className="flex-1 bg-white pt-3">
      <FlatList
        data={recordings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0000ff"]} />
        }
      />
    </StyledView>
  );
};

export default HistoryScreen;
