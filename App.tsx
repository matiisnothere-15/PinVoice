import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecordScreen from './src/screen/RecordScreen';
import 'nativewind/types';

export type RootStackParamList = {
  Record: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Record">
        <Stack.Screen name="Record" component={RecordScreen} options={{ title: 'Grabadora de Voz' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
