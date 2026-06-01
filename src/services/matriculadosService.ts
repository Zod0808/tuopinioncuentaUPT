import { supabase } from './supabaseService';
import { MatriculadosEntry } from './reportCalculations';

export async function saveMatriculados(ciclo: string, entries: MatriculadosEntry[]): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const rows = entries.map(e => ({
    user_id: user.id,
    ciclo,
    facultad: e.facultad,
    carrera: e.carrera,
    total_matriculados: e.totalMatriculados,
    total_encuestados: e.totalEncuestados ?? 0,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('matriculados_por_ciclo')
    .upsert(rows, { onConflict: 'user_id,ciclo,facultad,carrera' });

  if (error) { console.error('Error guardando matriculados:', error); return false; }
  return true;
}

export async function loadMatriculados(ciclo: string): Promise<MatriculadosEntry[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('matriculados_por_ciclo')
    .select('facultad, carrera, total_matriculados, total_encuestados')
    .eq('user_id', user.id)
    .eq('ciclo', ciclo);

  if (error || !data) return [];
  return data.map((r: { facultad: string; carrera: string; total_matriculados: number; total_encuestados?: number }) => ({
    facultad: r.facultad,
    carrera: r.carrera,
    totalMatriculados: r.total_matriculados,
    totalEncuestados: r.total_encuestados ?? 0,
  }));
}

export async function deleteMatriculados(ciclo: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('matriculados_por_ciclo')
    .delete()
    .eq('user_id', user.id)
    .eq('ciclo', ciclo);

  if (error) { console.error('Error eliminando matriculados:', error); return false; }
  return true;
}
