import OpenAI from 'openai';

interface ReqBody {
  tipoGrafico: string;
  titulo: string;
  datos: unknown;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'IA no configurada.' });
  }

  const { tipoGrafico, titulo, datos } = req.body as ReqBody;
  if (!tipoGrafico || !titulo) {
    return res.status(400).json({ error: 'Datos insuficientes' });
  }

  const openai = new OpenAI({ apiKey });

  const prompt = `Eres un analista de datos educativos. Analiza el siguiente gráfico y proporciona una interpretación concisa y profesional en español.

Tipo de gráfico: ${tipoGrafico}
Título: ${titulo}
Datos: ${JSON.stringify(datos, null, 2)}

Proporciona una interpretación de máximo 3 párrafos que explique:
1. Qué muestra el gráfico
2. Los hallazgos principales
3. Conclusiones relevantes

Sé conciso y profesional.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Eres un experto analista de datos educativos que proporciona interpretaciones claras y concisas.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  const interpretacion = completion.choices[0]?.message?.content ?? '';
  return res.json({ interpretacion });
}
