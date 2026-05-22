-- ============================================================
-- EJECUTAR ESTE SQL EN: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Crear tabla de datos de evaluación por ciclo y usuario
create table if not exists evaluaciones_data (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  ciclo       text        not null,
  datos       jsonb       default '[]'::jsonb not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, ciclo)
);

-- 2. Habilitar Row Level Security (cada usuario solo ve sus datos)
alter table evaluaciones_data enable row level security;

-- 3. Políticas de seguridad
create policy "ver_propios_datos"
  on evaluaciones_data for select
  using (auth.uid() = user_id);

create policy "insertar_propios_datos"
  on evaluaciones_data for insert
  with check (auth.uid() = user_id);

create policy "actualizar_propios_datos"
  on evaluaciones_data for update
  using (auth.uid() = user_id);

create policy "eliminar_propios_datos"
  on evaluaciones_data for delete
  using (auth.uid() = user_id);

-- 4. Índice para consultas rápidas por usuario y ciclo
create index if not exists idx_evaluaciones_user_ciclo
  on evaluaciones_data(user_id, ciclo);
