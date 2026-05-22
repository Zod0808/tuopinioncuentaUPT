import { createClient, User } from '@supabase/supabase-js';
import { EvaluacionData } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://agswvyjifhrrwclfvwur.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnc3d2eWppZmhycndjbGZ2d3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTcyMzUsImV4cCI6MjA5NDk5MzIzNX0.4T3uLC7hiADUM91fvU8qHRIUYJaPKn7rROEHYwTv4mg';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

// ─── Data ────────────────────────────────────────────────────────────────────

export async function saveEvaluacionData(ciclo: string, datos: EvaluacionData[]): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('evaluaciones_data')
    .upsert(
      { user_id: user.id, ciclo, datos, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,ciclo' }
    );

  if (error) {
    console.error('Error al guardar en Supabase:', error);
    return false;
  }
  return true;
}

export async function loadEvaluacionData(ciclo: string): Promise<EvaluacionData[] | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('evaluaciones_data')
    .select('datos')
    .eq('user_id', user.id)
    .eq('ciclo', ciclo)
    .maybeSingle();

  if (error || !data) return null;
  return data.datos as EvaluacionData[];
}

export async function getCiclosDisponibles(): Promise<string[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('evaluaciones_data')
    .select('ciclo')
    .eq('user_id', user.id)
    .order('ciclo', { ascending: false });

  if (error || !data) return [];
  return data.map((row: { ciclo: string }) => row.ciclo);
}
