import "./global.css"; // Añadido
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecordScreen from './src/screen/RecordScreen';
// import 'nativewind/types'; // Eliminado - se gestionará con nativewind-env.d.ts
import { View, Text } from 'react-native'; // Asegurarse que View y Text estén importados

export type RootStackParamList = {
  Record: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <View className="flex-1 bg-neutral-800"> {/* View de prueba con Tailwind */}
      {/* Texto de prueba para asegurar que las clases de texto también funcionan */}
      <Text className="text-center text-2xl text-white pt-12">Probando NativeWind</Text>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Record">
          <Stack.Screen
            name="Record"
            component={RecordScreen}
            options={{
              title: 'Grabadora de Voz',
              headerStyle: { backgroundColor: '#333' }, // Ejemplo de estilo de header
              headerTitleStyle: { color: '#fff' }
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
