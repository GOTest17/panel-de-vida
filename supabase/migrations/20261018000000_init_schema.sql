-- Migración Inicial: Esquema de base de datos para Panel de Vida
-- Tablas: tasks, email_classifications, daily_briefs, integrations

-- 1. Tabla de Tareas (tasks)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descripcion text,
  fecha_limite timestamptz,
  prioridad text not null check (prioridad in ('alta', 'media', 'baja')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_progreso', 'hecha')),
  proyecto text,
  created_at timestamptz not null default now()
);

-- Índices para optimizar consultas de tareas por fecha y estado
create index if not exists idx_tasks_user_fecha on public.tasks (user_id, fecha_limite, estado);

-- 2. Tabla de Clasificaciones de Correos (email_classifications)
create table if not exists public.email_classifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_thread_id text not null,
  categoria text not null check (categoria in ('responder_hoy', 'esperando_respuesta', 'informativo')),
  resumen_una_linea text not null,
  fecha_limite_detectada timestamptz,
  updated_at timestamptz not null default now(),
  constraint uq_user_gmail_thread unique (user_id, gmail_thread_id)
);

create index if not exists idx_emails_user_categoria on public.email_classifications (user_id, categoria);

-- 3. Tabla de Resúmenes Matutinos (daily_briefs)
create table if not exists public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  contenido_markdown text not null,
  enviado boolean not null default false,
  created_at timestamptz not null default now(),
  constraint uq_user_brief_fecha unique (user_id, fecha)
);

-- 4. Tabla de Integraciones (integrations)
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proveedor text not null,
  refresh_token_cifrado text not null,
  ultima_sincronizacion timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_user_proveedor unique (user_id, proveedor)
);

-- Habilitar Row Level Security (RLS) en todas las tablas
alter table public.tasks enable row level security;
alter table public.email_classifications enable row level security;
alter table public.daily_briefs enable row level security;
alter table public.integrations enable row level security;

-- Políticas de RLS para el usuario dueño de los datos
drop policy if exists "tasks_user_policy" on public.tasks;
create policy "tasks_user_policy" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "emails_user_policy" on public.email_classifications;
create policy "emails_user_policy" on public.email_classifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "briefs_user_policy" on public.daily_briefs;
create policy "briefs_user_policy" on public.daily_briefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "integrations_user_policy" on public.integrations;
create policy "integrations_user_policy" on public.integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
