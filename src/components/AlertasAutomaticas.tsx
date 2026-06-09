import { EvaluacionData } from '../types';
import { MatriculadosEntry, calcularResumen } from '../services/reportCalculations';
import { calcularCalificacion, QUORUM_MINIMO_ENCUESTADOS } from '../config/universityStructure';
import type { Calificacion } from '../config/universityStructure';
import { esValidoParaReporte } from '../services/reportCalculations';

interface AlertasAutomaticasProps {
  datos: EvaluacionData[];
  matriculados: MatriculadosEntry[];
  cicloActual: string;
}

interface Alerta {
  tipo: 'warning' | 'danger' | 'info';
  titulo: string;
  detalle: string;
}

export default function AlertasAutomaticas({ datos, matriculados, cicloActual }: AlertasAutomaticasProps) {
  if (datos.length === 0) return null;

  const resumen = calcularResumen(datos, matriculados);
  const alertas: Alerta[] = [];

  // 1. Carreras con participación < 70%
  for (const [, fac] of resumen.facultades) {
    for (const [, carr] of fac.carreras) {
      if (carr.totalMatriculados > 0 && carr.porcentajeEncuestados < 70) {
        alertas.push({
          tipo: 'warning',
          titulo: `Baja participación: ${carr.carrera}`,
          detalle: `${carr.porcentajeEncuestados.toFixed(1)}% de los ${carr.totalMatriculados} matriculados han respondido (meta: 70%).`,
        });
      }
    }
  }

  // 2. Secciones con calificación INSATISFACTORIO
  // Solo se alertan secciones que: (a) son válidas para reporte y (b) superan el quórum mínimo.
  // Las que tienen muestra insuficiente se reportan como informativas, no como alerta de riesgo.
  const esInsatisfactorio = (r: typeof datos[0]) => {
    const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
      ? r.calificacion as Calificacion
      : calcularCalificacion(r.nota);
    return c === 'INSATISFACTORIO';
  };

  const insatisfactorios = datos.filter(r =>
    esValidoParaReporte(r) &&
    r.encuestados >= QUORUM_MINIMO_ENCUESTADOS &&
    esInsatisfactorio(r)
  );
  const insatisfactoriosSubQuorum = datos.filter(r =>
    esValidoParaReporte(r) &&
    r.encuestados > 0 &&
    r.encuestados < QUORUM_MINIMO_ENCUESTADOS &&
    esInsatisfactorio(r)
  );

  if (insatisfactorios.length > 0) {
    const unicos = [...new Set(insatisfactorios.map(r => r.docente))];
    alertas.push({
      tipo: 'danger',
      titulo: `${insatisfactorios.length} sección(es) con calificación INSATISFACTORIO`,
      detalle: `Docentes: ${unicos.slice(0, 5).join(' | ')}${unicos.length > 5 ? ` y ${unicos.length - 5} más.` : '.'}`,
    });
  }

  if (insatisfactoriosSubQuorum.length > 0) {
    const detalles = insatisfactoriosSubQuorum
      .slice(0, 3)
      .map(r => `${r.docente.split(' ')[0]} (${r.encuestados} enc.)`)
      .join(' | ');
    alertas.push({
      tipo: 'info',
      titulo: `${insatisfactoriosSubQuorum.length} sección(es) INSATISFACTORIO excluidas por sub-quórum`,
      detalle: `Muestra insuficiente (< ${QUORUM_MINIMO_ENCUESTADOS} encuestados). No estadísticamente representativas. ${detalles}${insatisfactoriosSubQuorum.length > 3 ? '...' : ''}`,
    });
  }

  // 3. AEs por debajo del promedio institucional
  const umbrales: Array<{ key: keyof typeof resumen; label: string }> = [
    { key: 'promedioAE01', label: 'AE-01 (Contenido silábico)' },
    { key: 'promedioAE02', label: 'AE-02 (Enseñanza-aprendizaje)' },
    { key: 'promedioAE03', label: 'AE-03 (Evaluación)' },
    { key: 'promedioAE04', label: 'AE-04 (Actitudinal)' },
  ];
  for (const { key, label } of umbrales) {
    const val = resumen[key] as number;
    if (val < 12) {
      alertas.push({
        tipo: 'danger',
        titulo: `${label} por debajo de ACEPTABLE`,
        detalle: `Promedio institucional: ${val.toFixed(2)} (mínimo aceptable: 12.00).`,
      });
    } else if (val < resumen.promedioGeneral - 1) {
      alertas.push({
        tipo: 'warning',
        titulo: `${label} por debajo del promedio general`,
        detalle: `${val.toFixed(2)} vs promedio general ${resumen.promedioGeneral.toFixed(2)}.`,
      });
    }
  }

  // 4. Indicador plan estratégico
  if (resumen.indicadorPlanEstrategico < 70) {
    alertas.push({
      tipo: 'warning',
      titulo: 'Indicador de Plan Estratégico bajo',
      detalle: `${resumen.indicadorPlanEstrategico.toFixed(1)}% de secciones con calificación BUENO o DESTACADO (meta: 70%).`,
    });
  }

  if (alertas.length === 0) {
    return (
      <div className="alertas-container">
        <h3 className="alertas-titulo">Alertas Automáticas · Ciclo {cicloActual}</h3>
        <div className="alerta alerta-ok">
          ✓ No se detectaron alertas críticas para el ciclo {cicloActual}.
        </div>
      </div>
    );
  }

  return (
    <div className="alertas-container">
      <h3 className="alertas-titulo">
        Alertas Automáticas · Ciclo {cicloActual}
        <span className="alertas-badge">{alertas.length}</span>
      </h3>
      <div className="alertas-lista">
        {alertas.map((a, i) => (
          <div key={i} className={`alerta alerta-${a.tipo}`}>
            <div className="alerta-icon">
              {a.tipo === 'danger' ? '🔴' : a.tipo === 'warning' ? '🟡' : 'ℹ️'}
            </div>
            <div className="alerta-content">
              <strong>{a.titulo}</strong>
              <span>{a.detalle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
