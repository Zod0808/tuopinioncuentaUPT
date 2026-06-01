-- ============================================================
-- EJECUTAR ESTE SQL EN: Supabase > SQL Editor > New Query
-- Es idempotente: se puede ejecutar varias veces sin error.
-- ============================================================

-- ── TABLA 1: evaluaciones ────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluaciones_data (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ciclo       text        NOT NULL,
  datos       jsonb       DEFAULT '[]' NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, ciclo)
);

ALTER TABLE evaluaciones_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver_propios_datos"         ON evaluaciones_data;
DROP POLICY IF EXISTS "insertar_propios_datos"    ON evaluaciones_data;
DROP POLICY IF EXISTS "actualizar_propios_datos"  ON evaluaciones_data;
DROP POLICY IF EXISTS "eliminar_propios_datos"    ON evaluaciones_data;

CREATE POLICY "ver_propios_datos"         ON evaluaciones_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insertar_propios_datos"    ON evaluaciones_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "actualizar_propios_datos"  ON evaluaciones_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "eliminar_propios_datos"    ON evaluaciones_data FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_user_ciclo ON evaluaciones_data(user_id, ciclo);

-- ── TABLA 2: matriculados ─────────────────────────────────
CREATE TABLE IF NOT EXISTS matriculados_por_ciclo (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ciclo               text        NOT NULL,
  facultad            text        NOT NULL,
  carrera             text        NOT NULL,
  total_matriculados  integer     NOT NULL DEFAULT 0,
  total_encuestados   integer     NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(user_id, ciclo, facultad, carrera)
);

-- Migración: agregar columna si la tabla ya existía sin ella
ALTER TABLE matriculados_por_ciclo
  ADD COLUMN IF NOT EXISTS total_encuestados integer NOT NULL DEFAULT 0;

ALTER TABLE matriculados_por_ciclo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver_matriculados"         ON matriculados_por_ciclo;
DROP POLICY IF EXISTS "insertar_matriculados"    ON matriculados_por_ciclo;
DROP POLICY IF EXISTS "actualizar_matriculados"  ON matriculados_por_ciclo;
DROP POLICY IF EXISTS "eliminar_matriculados"    ON matriculados_por_ciclo;

CREATE POLICY "ver_matriculados"         ON matriculados_por_ciclo FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insertar_matriculados"    ON matriculados_por_ciclo FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "actualizar_matriculados"  ON matriculados_por_ciclo FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "eliminar_matriculados"    ON matriculados_por_ciclo FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_matriculados_user_ciclo ON matriculados_por_ciclo(user_id, ciclo);

-- ── TABLA 3: reportes públicos ────────────────────────────
-- El público lee sin autenticar; solo admins escriben.
CREATE TABLE IF NOT EXISTS public_reports (
  ciclo         text        PRIMARY KEY,
  datos         jsonb       NOT NULL DEFAULT '[]',
  matriculados  jsonb       NOT NULL DEFAULT '[]',
  published_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_reports_read"  ON public_reports;
DROP POLICY IF EXISTS "public_reports_write" ON public_reports;

CREATE POLICY "public_reports_read"  ON public_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_reports_write" ON public_reports FOR ALL   TO authenticated        USING (true) WITH CHECK (true);
