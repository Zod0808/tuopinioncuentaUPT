export interface InterpretacionRequest {
  tipoGrafico: string;
  datos: any;
  titulo: string;
}

export async function generarInterpretacion(
  request: InterpretacionRequest
): Promise<string> {
  try {
    const response = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return generarInterpretacionGenerica(request);
    }

    const data = await response.json();
    return data.interpretacion || generarInterpretacionGenerica(request);
  } catch (error) {
    console.error('Error al generar interpretación:', error);
    return generarInterpretacionGenerica(request);
  }
}

function generarInterpretacionGenerica(request: InterpretacionRequest): string {
  const { titulo, datos } = request;

  if (datos && typeof datos === 'object') {
    const valores = Object.values(datos);
    let promedio = 0;

    if (Array.isArray(valores)) {
      const numeros = valores.filter((v): v is number => typeof v === 'number');
      if (numeros.length > 0) {
        promedio = numeros.reduce((a, b) => a + b, 0) / numeros.length;
      }
    }

    return `El gráfico "${titulo}" muestra los resultados de la evaluación docente. El valor promedio observado es de ${promedio.toFixed(2)}.
Este análisis permite identificar tendencias y patrones en los datos evaluados, proporcionando una visión clara del desempeño académico.`;
  }

  return `El gráfico "${titulo}" presenta información relevante sobre la evaluación académica.
Los datos muestran variaciones que requieren atención para mejorar el desempeño general del curso.`;
}
