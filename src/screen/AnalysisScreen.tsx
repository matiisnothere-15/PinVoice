import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface AnalysisProps {
  transcription: string;
  summary: string;
  questions: string[];
  mindMap: { title: string; children?: string[] }[];
}

const AnalysisScreen: React.FC<AnalysisProps> = ({
  transcription,
  summary,
  questions,
  mindMap,
}) => {
  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      <Text className="text-center text-2xl font-bold mb-6 text-black">
        📝 Análisis de la Grabación
      </Text>

      <View className="mb-6 p-4 bg-gray-100 rounded-xl shadow">
        <Text className="text-lg font-semibold mb-2 text-black">🎤 Transcripción</Text>
        <Text className="text-base text-gray-800">{transcription}</Text>
      </View>

      <View className="mb-6 p-4 bg-gray-100 rounded-xl shadow">
        <Text className="text-lg font-semibold mb-2 text-black">📄 Resumen</Text>
        <Text className="text-base text-gray-800">{summary}</Text>
      </View>

      <View className="mb-6 p-4 bg-gray-100 rounded-xl shadow">
        <Text className="text-lg font-semibold mb-2 text-black">❓ Posibles preguntas</Text>
        {questions.map((q, index) => (
          <Text key={index} className="text-base text-gray-700 ml-2 mb-1">• {q}</Text>
        ))}
      </View>

      <View className="mb-6 p-4 bg-gray-100 rounded-xl shadow">
        <Text className="text-lg font-semibold mb-2 text-black">🧠 Mapa Mental</Text>
        {mindMap.map((item, index) => (
          <View key={index} className="mb-2">
            <Text className="text-base text-gray-800 ml-1">• {item.title}</Text>
            {item.children?.map((child, i) => (
              <Text key={i} className="text-sm text-gray-600 ml-5">◦ {child}</Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default AnalysisScreen;
