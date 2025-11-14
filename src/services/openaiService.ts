import OpenAI from 'openai';

// Configuración de OpenAI
// IMPORTANTE: En producción, esto debe estar en variables de entorno
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Solo para desarrollo
});

export interface InterpretacionRequest {
  tipoGrafico: string;
  datos: any;
  titulo: string;
}

export async function generarInterpretacion(
  request: InterpretacionRequest
): Promise<string> {
  try {
    // Si no hay API key, retornar interpretación genérica
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      return generarInterpretacionGenerica(request);
    }

    const prompt = `Eres un analista de datos educativos. Analiza el siguiente gráfico y proporciona una interpretación concisa y profesional en español.

Tipo de gráfico: ${request.tipoGrafico}
Título: ${request.titulo}
Datos: ${JSON.stringify(request.datos, null, 2)}

Proporciona una interpretación de máximo 3 párrafos que explique:
1. Qué muestra el gráfico
2. Los hallazgos principales
3. Conclusiones relevantes

Sé conciso y profesional.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto analista de datos educativos que proporciona interpretaciones claras y concisas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return completion.choices[0]?.message?.content || 'No se pudo generar la interpretación.';
  } catch (error) {
    console.error('Error al generar interpretación:', error);
    return generarInterpretacionGenerica(request);
  }
}

function generarInterpretacionGenerica(request: InterpretacionRequest): string {
  const { tipoGrafico, datos, titulo } = request;
  
  if (tipoGrafico === 'bar' || tipoGrafico === 'line') {
    const valores = Object.values(datos);
    let promedio = 0;
    
    if (Array.isArray(valores)) {
      const numeros = valores.filter((v): v is number => typeof v === 'number');
      if (numeros.length > 0) {
        promedio = numeros.reduce((a, b) => a + b, 0) / numeros.length;
      }
    }
    
    return `El gráfico "${titulo}" muestra una distribución de datos mediante ${tipoGrafico === 'bar' ? 'barras' : 'líneas'}. 
    El valor promedio observado es de ${promedio.toFixed(2)}. 
    Este análisis permite identificar tendencias y patrones en los datos evaluados, proporcionando una visión clara del desempeño académico.`;
  }
  
  return `El gráfico "${titulo}" presenta información relevante sobre la evaluación académica. 
  Los datos muestran variaciones que requieren atención para mejorar el desempeño general del curso.`;
}

