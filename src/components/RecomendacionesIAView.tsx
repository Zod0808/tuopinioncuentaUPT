import { useState } from 'react';
import { EvaluacionData } from '../types';
import { MatriculadosEntry, calcularResumen } from '../services/reportCalculations';
import { generarRecomendaciones } from '../ai/recommendations';
import { ResultadosIA, RecomendacionDocente, RecomendacionCarrera, RecomendacionFacultad } from '../ai/types';
import { ASPECTOS_EVALUADOS } from '../config/universityStructure';

type Tab = 'institucional' | 'facultades' | 'carreras' | 'docentes';

const TAB_LABELS: Record<Tab, string> = {
  institucional: 'Institucional',
  facultades: 'Por Facultad',
  carreras: 'Por Carrera',
  docentes: 'Por Docente',
};

const CAL_COLOR: Record<string, string> = {
  INSATISFACTORIO: '#c53030',
  ACEPTABLE: '#c05621',
  BUENO: '#2b6cb0',
  DESTACADO: '#276749',
};

const AE_LABELS: Record<string, string> = {
  'AE-01': 'Sílabo',
  'AE-02': 'Enseñanza',
  'AE-03': 'Evaluación',
  'AE-04': 'Actitudinal',
};

interface Props {
  datos: EvaluacionData[];
  matriculados: MatriculadosEntry[];
  cicloActual: string;
}

function ScoreBadge({ valor, peor }: { valor: number; peor?: boolean }) {
  const color = valor >= 18 ? '#276749' : valor >= 15 ? '#2b6cb0' : valor >= 12 ? '#c05621' : '#c53030';
  return (
    <span className={`ia-score-badge ${peor ? 'ia-score-peor' : ''}`} style={{ backgroundColor: color }}>
      {valor.toFixed(2)}
    </span>
  );
}

function AEBar({ ae01, ae02, ae03, ae04 }: { ae01: number; ae02: number; ae03: number; ae04: number }) {
  const peor = Math.min(ae01, ae02, ae03, ae04);
  return (
    <div className="ia-ae-bars">
      {(['AE-01', 'AE-02', 'AE-03', 'AE-04'] as const).map((k, i) => {
        const v = [ae01, ae02, ae03, ae04][i];
        return (
          <div key={k} className="ia-ae-bar-item">
            <span className="ia-ae-bar-label">{AE_LABELS[k]}</span>
            <div className="ia-ae-bar-track">
              <div
                className="ia-ae-bar-fill"
                style={{
                  width: `${(v / 20) * 100}%`,
                  backgroundColor: v === peor ? '#c53030' : v >= 18 ? '#276749' : v >= 15 ? '#2b6cb0' : '#c05621',
                }}
              />
            </div>
            <ScoreBadge valor={v} peor={v === peor} />
          </div>
        );
      })}
    </div>
  );
}

function IndiceMejoraCard({ indice }: { indice: ResultadosIA['institucional']['indicesMejora'][0] }) {
  const [open, setOpen] = useState(false);
  const pct = Math.min((indice.valorActual / Math.max(indice.valorMeta, 1)) * 100, 100);
  return (
    <div className="ia-indice-card">
      <button type="button" className="ia-indice-header" onClick={() => setOpen(o => !o)}>
        <div className="ia-indice-header-left">
          <span className="ia-indice-nombre">{indice.nombre}</span>
          <div className="ia-indice-progress-row">
            <div className="ia-indice-progress">
              <div className="ia-indice-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="ia-indice-valores">
              <strong>{indice.valorActual.toFixed(1)}{indice.unidad}</strong>
              <span className="ia-indice-flecha">→</span>
              <strong className="ia-indice-meta">{indice.valorMeta.toFixed(1)}{indice.unidad}</strong>
            </span>
          </div>
        </div>
        <span className="ia-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ia-indice-body">
          <p className="ia-indice-desc">{indice.descripcion}</p>
          <p className="ia-indice-estrategia"><strong>Estrategia:</strong> {indice.estrategia}</p>
          {indice.acciones.length > 0 && (
            <ul className="ia-acciones-lista">
              {indice.acciones.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DocenteCard({ d }: { d: RecomendacionDocente }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ia-card ia-card-${d.calificacion.toLowerCase()}`}>
      <button type="button" className="ia-card-header" onClick={() => setOpen(o => !o)}>
        <div className="ia-card-header-left">
          <span className="ia-card-badge" style={{ backgroundColor: CAL_COLOR[d.calificacion] }}>{d.calificacion}</span>
          <div>
            <span className="ia-card-titulo">{d.docente}</span>
            <span className="ia-card-sub">{d.curso} · Secc. {d.seccion} · {d.carrera}</span>
          </div>
        </div>
        <div className="ia-card-header-right">
          <ScoreBadge valor={d.nota} />
          <span className="ia-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="ia-card-body">
          <p className="ia-diagnostico">{d.diagnostico}</p>
          <AEBar ae01={d.ae01} ae02={d.ae02} ae03={d.ae03} ae04={d.ae04} />

          {d.areasMejora.length > 0 && (
            <div className="ia-areas-mejora">
              <p className="ia-section-label">Áreas críticas detectadas:</p>
              {d.areasMejora.map(a => (
                <div key={a.codigo} className={`ia-area-tag ia-area-${a.severidad}`}>
                  <strong>{a.codigo}</strong> — {a.descripcion}
                  <span className="ia-area-score">{a.puntuacion.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="ia-acciones">
            <p className="ia-section-label">Acciones recomendadas:</p>
            <ul className="ia-acciones-lista">
              {d.accionesSugeridas.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>

          <div className="ia-meta-row">
            <span className="ia-meta-label">Meta próximo ciclo:</span>
            <span className="ia-meta-valor">{d.metaProximoCiclo.toFixed(1)} / 20</span>
            <span className="ia-plazo">{d.plazoEjecucion}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CarreraCard({ c }: { c: RecomendacionCarrera }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ia-card">
      <button type="button" className="ia-card-header" onClick={() => setOpen(o => !o)}>
        <div className="ia-card-header-left">
          <div>
            <span className="ia-card-titulo">{c.carrera}</span>
            <span className="ia-card-sub">{c.facultad}</span>
          </div>
        </div>
        <div className="ia-card-header-right">
          <span className="ia-mini-stat ia-mini-red">{c.porcInsatisfactorio.toFixed(1)}% Insatisf.</span>
          <span className="ia-mini-stat ia-mini-orange">{c.porcAceptable.toFixed(1)}% Aceptable</span>
          <ScoreBadge valor={c.promedioGeneral} />
          <span className="ia-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="ia-card-body">
          <p className="ia-diagnostico">{c.diagnostico}</p>
          <AEBar ae01={c.ae01} ae02={c.ae02} ae03={c.ae03} ae04={c.ae04} />

          <div className="ia-meta-row ia-meta-row-sm">
            <span>Indicador actual: <strong>{c.indicadorActual.toFixed(1)}%</strong></span>
            <span className="ia-flecha">→</span>
            <span>Meta: <strong className="ia-indice-meta">{c.indicadorMeta.toFixed(1)}%</strong></span>
            <span>({c.seccionesCriticas} sección(es) crítica(s) de {c.seccionesTotal})</span>
          </div>

          <div className="ia-acciones">
            <p className="ia-section-label">Estrategias de mejora:</p>
            <ul className="ia-acciones-lista">
              {c.estrategias.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>

          <div className="ia-plan-tabla">
            <p className="ia-section-label">Plan de acción:</p>
            <table className="ia-tabla">
              <thead>
                <tr><th>Acción</th><th>Responsable</th><th>Plazo</th></tr>
              </thead>
              <tbody>
                {c.acciones.map((a, i) => (
                  <tr key={i}><td>{a.accion}</td><td>{a.responsable}</td><td>{a.plazo}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FacultadCard({ f }: { f: RecomendacionFacultad }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ia-card">
      <button type="button" className="ia-card-header" onClick={() => setOpen(o => !o)}>
        <div className="ia-card-header-left">
          <div>
            <span className="ia-card-titulo">{f.facultad}</span>
            <span className="ia-card-sub">Criterio más débil: {f.criterioMasDebil} — {ASPECTOS_EVALUADOS[f.criterioMasDebil]}</span>
          </div>
        </div>
        <div className="ia-card-header-right">
          <span className="ia-mini-stat">Indicador: <strong>{f.indicadorActual.toFixed(1)}%</strong></span>
          <ScoreBadge valor={f.promedioGeneral} />
          <span className="ia-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="ia-card-body">
          <p className="ia-diagnostico">{f.diagnostico}</p>

          {f.carrerasCriticas.length > 0 && (
            <div className="ia-criticas">
              <p className="ia-section-label">Carreras con atención prioritaria:</p>
              <div className="ia-criticas-tags">
                {f.carrerasCriticas.map(c => <span key={c} className="ia-critica-tag">{c}</span>)}
              </div>
            </div>
          )}

          <div className="ia-meta-row ia-meta-row-sm">
            <span>Indicador actual: <strong>{f.indicadorActual.toFixed(1)}%</strong></span>
            <span className="ia-flecha">→</span>
            <span>Meta: <strong className="ia-indice-meta">{f.indicadorMeta.toFixed(1)}%</strong></span>
            <span>(en {f.ciclosMeta} ciclo{f.ciclosMeta > 1 ? 's' : ''})</span>
          </div>

          <div className="ia-acciones">
            <p className="ia-section-label">Planes de acción:</p>
            <ul className="ia-acciones-lista">
              {f.planesAccion.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecomendacionesIAView({ datos, matriculados, cicloActual }: Props) {
  const [tab, setTab] = useState<Tab>('institucional');
  const [resultado, setResultado] = useState<ResultadosIA | null>(null);
  const [generando, setGenerando] = useState(false);
  const [usarIA, setUsarIA] = useState(false);
  const [filtroCalificacion, setFiltroCalificacion] = useState<'todos' | 'INSATISFACTORIO' | 'ACEPTABLE'>('todos');
  const [busquedaDocente, setBusquedaDocente] = useState('');

  const hayApiKey = Boolean(import.meta.env.VITE_OPENAI_API_KEY);

  const handleGenerar = async () => {
    if (datos.length === 0) return;
    setGenerando(true);
    try {
      const resumen = calcularResumen(datos, matriculados);
      const res = await generarRecomendaciones(datos, resumen, cicloActual, usarIA);
      setResultado(res);
    } finally {
      setGenerando(false);
    }
  };

  if (datos.length === 0) {
    return (
      <div className="ia-empty">
        <div className="ia-empty-icon">🤖</div>
        <h3>No hay datos cargados</h3>
        <p>Importa el Excel del ciclo {cicloActual} en "Ingreso de Datos" para generar recomendaciones.</p>
      </div>
    );
  }

  const registrosCriticos = datos.filter(r => r.nota <= 14 && r.validez === 'Válido').length;

  return (
    <div className="ia-view">
      {/* ── Panel de control ── */}
      <div className="ia-control-panel">
        <div className="ia-control-info">
          <h2 className="ia-titulo">Recomendaciones de Mejora Continua</h2>
          <p className="ia-subtitulo">
            Ciclo <strong>{cicloActual}</strong> · {datos.length} registros · {registrosCriticos} secciones con calificación ACEPTABLE o INSATISFACTORIO
          </p>
        </div>
        <div className="ia-control-actions">
          {hayApiKey && (
            <label className="ia-toggle-ia">
              <input
                type="checkbox"
                checked={usarIA}
                onChange={e => setUsarIA(e.target.checked)}
              />
              <span>Mejorar con IA (OpenAI)</span>
            </label>
          )}
          <button
            type="button"
            className="btn-primary ia-btn-generar"
            onClick={handleGenerar}
            disabled={generando}
          >
            {generando ? (
              <><span className="ia-spinner" /> Analizando datos...</>
            ) : resultado ? (
              '↺ Regenerar análisis'
            ) : (
              '▶ Generar recomendaciones'
            )}
          </button>
        </div>
      </div>

      {!resultado && !generando && (
        <div className="ia-placeholder">
          <div className="ia-placeholder-icon">📊</div>
          <p>Presiona <strong>"Generar recomendaciones"</strong> para analizar los datos del ciclo {cicloActual} y obtener recomendaciones personalizadas de mejora continua a nivel de docente, carrera, facultad e institucional.</p>
          {hayApiKey && (
            <p className="ia-placeholder-ia">Con <strong>IA activada</strong>, el análisis institucional se enriquece con inteligencia artificial.</p>
          )}
        </div>
      )}

      {resultado && (
        <>
          {/* ── Resumen estadístico ── */}
          <div className="ia-stats-row">
            <div className="ia-stat-card ia-stat-red">
              <span className="ia-stat-num">{resultado.docentes.filter(d => d.calificacion === 'INSATISFACTORIO').length}</span>
              <span className="ia-stat-label">Secciones Insatisfactorias</span>
            </div>
            <div className="ia-stat-card ia-stat-orange">
              <span className="ia-stat-num">{resultado.docentes.filter(d => d.calificacion === 'ACEPTABLE').length}</span>
              <span className="ia-stat-label">Secciones Aceptables</span>
            </div>
            <div className="ia-stat-card ia-stat-blue">
              <span className="ia-stat-num">{resultado.carreras.length}</span>
              <span className="ia-stat-label">Carreras con plan de mejora</span>
            </div>
            <div className="ia-stat-card ia-stat-green">
              <span className="ia-stat-num">{resultado.institucional.indicadorActual.toFixed(1)}%</span>
              <span className="ia-stat-label">Indicador Plan Estratégico</span>
            </div>
          </div>

          {resultado.usandoIA && (
            <div className="ia-badge-ia">✨ Análisis enriquecido con Inteligencia Artificial</div>
          )}

          {/* ── Tabs ── */}
          <div className="ia-tabs">
            {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
              <button
                key={t}
                type="button"
                className={`ia-tab ${tab === t ? 'ia-tab-active' : ''}`}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
                {t === 'docentes' && <span className="ia-tab-count">{resultado.docentes.length}</span>}
                {t === 'carreras' && <span className="ia-tab-count">{resultado.carreras.length}</span>}
                {t === 'facultades' && <span className="ia-tab-count">{resultado.facultades.length}</span>}
              </button>
            ))}
          </div>

          {/* ── Contenido por tab ── */}
          <div className="ia-tab-content">

            {/* INSTITUCIONAL */}
            {tab === 'institucional' && (
              <div className="ia-seccion">
                <div className="ia-resumen-ejecutivo">
                  <h3 className="ia-seccion-titulo">Resumen Ejecutivo</h3>
                  <p className="ia-resumen-texto">{resultado.institucional.resumenEjecutivo}</p>
                </div>

                <h3 className="ia-seccion-titulo">Índices de Mejora Continua</h3>
                <p className="ia-seccion-desc">Métricas clave con valores actuales, metas para el próximo ciclo y estrategias de acción.</p>
                <div className="ia-indices-lista">
                  {resultado.institucional.indicesMejora.map((ind, i) => (
                    <IndiceMejoraCard key={i} indice={ind} />
                  ))}
                </div>

                <h3 className="ia-seccion-titulo" style={{ marginTop: '2rem' }}>Planes Estratégicos Institucionales</h3>
                <ol className="ia-planes-lista">
                  {resultado.institucional.planesEstrategicos.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* FACULTADES */}
            {tab === 'facultades' && (
              <div className="ia-seccion">
                <p className="ia-seccion-desc">Recomendaciones estratégicas para cada facultad, ordenadas por indicador actual.</p>
                {resultado.facultades
                  .sort((a, b) => a.indicadorActual - b.indicadorActual)
                  .map((f, i) => <FacultadCard key={i} f={f} />)
                }
              </div>
            )}

            {/* CARRERAS */}
            {tab === 'carreras' && (
              <div className="ia-seccion">
                <p className="ia-seccion-desc">{resultado.carreras.length} carrera(s) con plan de mejora. Ordenadas por mayor proporción de secciones críticas.</p>
                {resultado.carreras
                  .sort((a, b) => (b.porcInsatisfactorio + b.porcAceptable) - (a.porcInsatisfactorio + a.porcAceptable))
                  .map((c, i) => <CarreraCard key={i} c={c} />)
                }
              </div>
            )}

            {/* DOCENTES */}
            {tab === 'docentes' && (
              <div className="ia-seccion">
                <div className="ia-docentes-filtros">
                  <input
                    type="text"
                    className="ia-busqueda"
                    placeholder="Buscar docente o curso..."
                    value={busquedaDocente}
                    onChange={e => setBusquedaDocente(e.target.value)}
                  />
                  <div className="ia-filtro-buttons">
                    {(['todos', 'INSATISFACTORIO', 'ACEPTABLE'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        className={`ia-filtro-btn ${filtroCalificacion === f ? 'ia-filtro-active' : ''}`}
                        onClick={() => setFiltroCalificacion(f)}
                      >
                        {f === 'todos' ? 'Todos' : f}
                      </button>
                    ))}
                  </div>
                </div>
                {resultado.docentes
                  .filter(d =>
                    (filtroCalificacion === 'todos' || d.calificacion === filtroCalificacion) &&
                    (busquedaDocente === '' ||
                      d.docente.toLowerCase().includes(busquedaDocente.toLowerCase()) ||
                      d.curso.toLowerCase().includes(busquedaDocente.toLowerCase()))
                  )
                  .sort((a, b) => a.nota - b.nota)
                  .map((d, i) => <DocenteCard key={i} d={d} />)
                }
                {resultado.docentes.filter(d =>
                  (filtroCalificacion === 'todos' || d.calificacion === filtroCalificacion) &&
                  (busquedaDocente === '' ||
                    d.docente.toLowerCase().includes(busquedaDocente.toLowerCase()) ||
                    d.curso.toLowerCase().includes(busquedaDocente.toLowerCase()))
                ).length === 0 && (
                  <div className="ia-empty-result">No se encontraron docentes con los filtros aplicados.</div>
                )}
              </div>
            )}
          </div>

          <p className="ia-generado-en">
            Análisis generado el {new Date(resultado.generadoEn).toLocaleString('es-PE')}
            {resultado.usandoIA ? ' · Con asistencia de IA' : ' · Análisis basado en reglas'}
          </p>
        </>
      )}
    </div>
  );
}
