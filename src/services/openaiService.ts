// IMPORTANT: User must replace these with their actual Cloud Function URLs after deployment.
const PROXY_TRANSCRIBE_AUDIO_URL = 'YOUR_CLOUD_FUNCTION_URL_FOR_proxyTranscribeAudio';
const PROXY_CHAT_COMPLETION_URL = 'YOUR_CLOUD_FUNCTION_URL_FOR_proxyOpenAIChatCompletion';
// Example format: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/proxyTranscribeAudio

// No longer need OPENAI_API_KEY here
// import { OPENAI_API_KEY } from '@env';

// const BASE_URL = 'https://api.openai.com/v1'; // No longer used directly
// const headers = { // No longer used directly
//   Authorization: `Bearer ${OPENAI_API_KEY}`,
// };


export async function transcribeAudio(fileUri: string): Promise<string> {
  const formData = new FormData();
  const fileName = fileUri.split('/').pop() || 'audio.m4a';
  const fileType = 'audio/m4a'; // Or determine dynamically if necessary

  // For React Native, when using FormData with a file URI,
  // react-native's fetch polyfill handles creating the correct blob/object.
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: fileType, // Ensure this matches the actual file type
  } as any);
  formData.append('model', 'whisper-1'); // Model can be sent as part of form data
  formData.append('type', fileType); // Sending file type for busboy on server

  const response = await fetch(PROXY_TRANSCRIBE_AUDIO_URL, {
    method: 'POST',
    // Content-Type is set automatically by browser/RN for FormData
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Error from proxyTranscribeAudio:", errorBody);
    throw new Error(`Error transcribiendo audio: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.text;
}

async function callOpenAIChatProxy(model: string, messages: any[], temperature?: number): Promise<any> {
  const body: {model: string, messages: any[], temperature?: number} = {
    model,
    messages,
  };
  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  const response = await fetch(PROXY_CHAT_COMPLETION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Error from proxyOpenAIChatCompletion:", errorBody);
    throw new Error(`Error en chat completion: ${response.status} ${errorBody}`);
  }
  return response.json();
}


export async function summarizeText(text: string): Promise<string> {
  const messages = [
    {
      role: 'system',
      content: 'Eres un asistente experto en resumir grabaciones de voz. Resume el texto en párrafos claros y concisos.',
    },
    {
      role: 'user',
      content: text,
    },
  ];

  const data = await callOpenAIChatProxy('gpt-4', messages);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export async function generateQuestions(text: string): Promise<string[]> {
  const messages = [
    {
      role: 'system',
      content:
        'Eres un asistente experto en generar preguntas. Dado el siguiente texto, entrega entre 3 y 5 preguntas clave para repasar o reflexionar sobre el contenido. Formato: lista simple.',
    },
    {
      role: 'user',
      content: text,
    },
  ];

  const data = await callOpenAIChatProxy('gpt-4', messages);
  const content = data.choices?.[0]?.message?.content?.trim() || '';
    return content
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
}

export async function generateMindMap(text: string): Promise<any> {
  const messages = [
    {
      role: 'system',
      content:
        'Eres un asistente que crea mapas mentales. Lee el texto y devuelve un objeto JSON con esta estructura: { "tema": "tema principal", "subtemas": [{ "titulo": "...", "ideas": ["...", "..."] }] }. No incluyas nada más que el JSON.',
    },
    {
      role: 'user',
      content: text,
    },
  ];

  const data = await callOpenAIChatProxy('gpt-4', messages, 0.7);
  try {
    // The proxy already returns JSON, so if data.choices is there, it's likely parsed.
    // However, the actual content from OpenAI is a string that needs parsing.
    // The Cloud Function returns OpenAI's direct response.data, which is already an object.
    const rawJson = data.choices?.[0]?.message?.content;
    if (!rawJson) {
      throw new Error('No content received for mind map from OpenAI');
    }
    const openAiMap = JSON.parse(rawJson);
    return transformOpenAIMindMap(openAiMap);
  } catch (error) {
    console.error("Error parsing or transforming mind map:", error);
    // Return a structure that AnalysisScreen can handle gracefully or throw specific error
    // For now, let's return an empty array or a specific error structure if preferred.
    // Throwing error so it's caught by RecordScreen's analysisError
    if (error instanceof Error && error.message.startsWith('No content')) {
        throw error;
    }
    throw new Error('Error procesando el mapa mental de OpenAI');
  }
}

// Helper type for the expected OpenAI structure
type OpenAIMindMapFormat = {
  tema?: string;
  subtemas?: {
    titulo?: string;
    ideas?: string[];
  }[];
};

// Type for the data structure AnalysisScreen expects
type MindMapDisplayNode = {
  title: string;
  children?: string[];
};

function transformOpenAIMindMap(openAiMap: OpenAIMindMapFormat): MindMapDisplayNode[] {
  const displayMap: MindMapDisplayNode[] = [];

  if (openAiMap.tema) {
    // Find if the main theme has direct ideas or if it's just a container for subtemas.
    // The current OpenAI prompt doesn't explicitly ask for ideas under "tema", only under "subtemas".
    // So, we'll add the main "tema" as a node. If it had 'ideas' directly, they could be its children.
    displayMap.push({ title: openAiMap.tema });
  }

  if (openAiMap.subtemas && Array.isArray(openAiMap.subtemas)) {
    openAiMap.subtemas.forEach(subtema => {
      if (subtema.titulo) {
        displayMap.push({
          title: subtema.titulo,
          children: subtema.ideas && Array.isArray(subtema.ideas) ? subtema.ideas.filter(idea => typeof idea === 'string') : undefined,
        });
      }
    });
  }

  // If displayMap is empty, it means the structure from OpenAI was not as expected or empty.
  // Return an empty array, AnalysisScreen will handle it by not displaying the mind map section.
  return displayMap;
}
