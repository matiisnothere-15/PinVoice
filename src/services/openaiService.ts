import { OPENAI_API_KEY } from '@env';

const BASE_URL = 'https://api.openai.com/v1';

const headers = {
  Authorization: `Bearer ${OPENAI_API_KEY}`,
};

export async function transcribeAudio(fileUri: string): Promise<string> {
  const formData = new FormData();
  const fileName = fileUri.split('/').pop() || 'audio.m4a';

  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'audio/m4a',
  } as any);
  formData.append('model', 'whisper-1');

  const response = await fetch(`${BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!response.ok) throw new Error(`Error transcribiendo audio`);

  const data = await response.json();
  return data.text;
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

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages,
    }),
  });

  const data = await response.json();
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

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages,
    }),
  });

  const data = await response.json();
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

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
  } catch (error) {
    throw new Error('Error procesando el mapa mental');
  }
}
