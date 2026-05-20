import { AppError } from '../../middleware/errorHandler';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';

type AiContext = 'restaurant_client' | 'restaurant_staff' | 'delivery_client' | 'delivery_driver';

const SYSTEM_PROMPTS: Record<AiContext, string> = {
  restaurant_client:
    'Eres Yessi, asistente virtual de restaurante. Respondes en espanol mexicano, amigable y concisa. Maximo 3 oraciones. Ayudas con el menu, horarios, recomendaciones y dudas generales del restaurante.',
  restaurant_staff:
    'Eres asistente para personal de restaurante. Espanol mexicano, directo y profesional. Ayudas con consultas de inventario, pedidos, reportes y operaciones. Maximo 3 oraciones.',
  delivery_client:
    'Eres Yessi, asistente de delivery en Tomatlan, Jalisco. Amigable, concisa, local. Ayudas con pedidos, recomendaciones de restaurantes, seguimiento de ordenes y dudas. Maximo 3 oraciones.',
  delivery_driver:
    'Eres asistente para repartidores. Espanol mexicano, directo. Ayudas con rutas, confirmacion de entregas, soporte tecnico y dudas operativas. Maximo 2 oraciones.',
};

export async function chat(context: AiContext, message: string, history?: { role: string; content: string }[]) {
  const systemPrompt = SYSTEM_PROMPTS[context];
  if (!systemPrompt) {
    throw new AppError(400, 'Contexto no valido', 'INVALID_AI_CONTEXT');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: message },
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'phi3:mini',
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 256,
      },
    }),
  });

  if (!response.ok) {
    throw new AppError(502, 'Error al comunicarse con el asistente IA', 'AI_SERVICE_ERROR');
  }

  const data = await response.json() as { message?: { content?: string } };
  return {
    response: data.message?.content || '',
    context,
  };
}
