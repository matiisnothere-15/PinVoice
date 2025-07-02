import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Define a more specific type for navigation if your routes are typed
// type MainScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const MainScreen: React.FC = () => {
  // const navigation = useNavigation<MainScreenNavigationProp>(); // If using typed navigation
  const navigation = useNavigation(); // Using generic navigation for now

  const navigateToRecord = () => {
    navigation.navigate('Record'); // Assuming 'Record' is the route name for RecordScreen
  };

  const navigateToHistory = () => {
    navigation.navigate('History'); // Assuming 'History' is the route name for HistoryScreen
  };

  const navigateToSettings = () => {
    // navigation.navigate('Settings'); // TODO: Implement Settings screen and navigation
    console.log('Navigate to Settings (Not Implemented)');
  };

  return (
    <StyledView className="flex-1 justify-center items-center bg-gray-100 p-5">
      <StyledText className="text-3xl font-bold text-center mb-12 text-blue-600">
        Audio Analyzer AI
      </StyledText>

      <StyledTouchableOpacity
        className="bg-blue-500 w-full py-4 rounded-lg mb-6 shadow-md active:bg-blue-600"
        onPress={navigateToRecord}
      >
        <StyledText className="text-white text-xl text-center font-semibold">
          🎙 Grabar Nueva Nota
        </StyledText>
      </StyledTouchableOpacity>

      <StyledTouchableOpacity
        className="bg-green-500 w-full py-4 rounded-lg mb-6 shadow-md active:bg-green-600"
        onPress={navigateToHistory}
      >
        <StyledText className="text-white text-xl text-center font-semibold">
          🧾 Ver Historial
        </StyledText>
      </StyledTouchableOpacity>

      <StyledTouchableOpacity
        className="bg-gray-500 w-full py-4 rounded-lg shadow-md active:bg-gray-600"
        onPress={navigateToSettings}
      >
        <StyledText className="text-white text-xl text-center font-semibold">
          ⚙️ Configuración
        </StyledText>
      </StyledTouchableOpacity>
    </StyledView>
  );
};

export default MainScreen;
