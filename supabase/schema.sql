-- =====================================================================
-- Código y Mazmorra · base de datos para Supabase
--
-- 1. Baja hasta la ÚLTIMA SECCIÓN y cambia la clave de profesor.
-- 2. Pega todo el fichero en Supabase → SQL Editor → Run.
--
-- Se puede volver a ejecutar sin perder datos (sirve también para
-- cambiar la clave de profesor más adelante).
--
-- Seguridad: las tablas no son accesibles desde fuera (RLS sin
-- políticas). Todo pasa por las funciones de abajo, que comprueban el
-- token de sesión del alumno o del profesor.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- tablas ----------
create table if not exists public.ajustes (
  id            int primary key default 1 check (id = 1),
  clave_profe   text not null,
  fallos        int not null default 0,
  bloqueo_hasta timestamptz
);

create table if not exists public.clases (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null,
  desbloquear boolean not null default false,
  creada      timestamptz not null default now()
);

create table if not exists public.alumnos (
  id            uuid primary key default gen_random_uuid(),
  clase_id      uuid not null references public.clases(id) on delete cascade,
  alias         text not null,
  pin           text not null,
  fallos        int not null default 0,
  bloqueo_hasta timestamptz,
  creado        timestamptz not null default now(),
  ultima        timestamptz not null default now()
);
create unique index if not exists alumnos_alias_uq on public.alumnos (clase_id, lower(alias));

create table if not exists public.progreso (
  alumno_id   uuid not null references public.alumnos(id) on delete cascade,
  nivel       int  not null check (nivel between 1 and 100),
  estrellas   int  not null default 0,
  intentos    int  not null default 0,
  superado    timestamptz,
  codigo      text not null default '',   -- último código ejecutado
  solucion    text not null default '',   -- mejor código que superó el nivel
  actualizado timestamptz not null default now(),
  primary key (alumno_id, nivel)
);

create table if not exists public.sesiones (
  token     uuid primary key default gen_random_uuid(),
  alumno_id uuid references public.alumnos(id) on delete cascade,
  es_profe  boolean not null default false,
  caduca    timestamptz not null
);
create index if not exists sesiones_alumno_idx on public.sesiones (alumno_id);

alter table public.ajustes  enable row level security;
alter table public.clases   enable row level security;
alter table public.alumnos  enable row level security;
alter table public.progreso enable row level security;
alter table public.sesiones enable row level security;
revoke all on public.ajustes, public.clases, public.alumnos, public.progreso, public.sesiones
  from public, anon, authenticated;

-- ---------- funciones internas ----------
create or replace function public._alumno(p_token uuid) returns public.alumnos
language plpgsql security definer set search_path = public, extensions as $$
declare a public.alumnos;
begin
  select al.* into a from sesiones s join alumnos al on al.id = s.alumno_id
   where s.token = p_token and not s.es_profe and s.caduca > now();
  if not found then
    raise exception 'Tu sesión ha caducado. Vuelve a entrar.' using errcode = 'P0001';
  end if;
  return a;
end $$;

create or replace function public._profe(p_token uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from sesiones where token = p_token and es_profe and caduca > now()) then
    raise exception 'Tu sesión de profesor ha caducado. Vuelve a entrar.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public._estado(a public.alumnos, t uuid) returns json
language sql security definer set search_path = public, extensions as $$
  select json_build_object(
    'token', t, 'alias', a.alias, 'clase', c.nombre, 'codigo', c.codigo, 'desbloquear', c.desbloquear,
    'progreso', coalesce((select json_agg(json_build_object('nivel', p.nivel, 'estrellas', p.estrellas,
                          'codigo', case when p.solucion <> '' then p.solucion else p.codigo end) order by p.nivel)
                          from progreso p where p.alumno_id = a.id), '[]'::json))
  from clases c where c.id = a.clase_id;
$$;

create or replace function public._limpiar_alias(p text) returns text
language sql immutable as $$ select btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')) $$;

-- ---------- alumnos ----------
create or replace function public.alumno_registrar(p_codigo text, p_alias text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare c clases; a alumnos; t uuid; v_alias text := _limpiar_alias(p_alias);
begin
  select * into c from clases where codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found then return json_build_object('error', 'No existe ninguna clase con ese código.'); end if;
  if v_alias !~ '^[A-Za-z0-9áéíóúüñÁÉÍÓÚÜÑ _.-]{2,20}$' then
    return json_build_object('error', 'El alias tiene que tener entre 2 y 20 letras o números.');
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then
    return json_build_object('error', 'El PIN tienen que ser 4 números.');
  end if;
  if exists (select 1 from alumnos where clase_id = c.id and lower(alias) = lower(v_alias)) then
    return json_build_object('error', 'Ese alias ya existe en tu clase. Si es tuyo, usa «Entrar».');
  end if;
  insert into alumnos (clase_id, alias, pin) values (c.id, v_alias, crypt(p_pin, gen_salt('bf', 8))) returning * into a;
  insert into sesiones (alumno_id, caduca) values (a.id, now() + interval '180 days') returning token into t;
  return _estado(a, t);
end $$;

create or replace function public.alumno_entrar(p_codigo text, p_alias text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare c clases; a alumnos; t uuid;
begin
  select * into c from clases where codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found then return json_build_object('error', 'No existe ninguna clase con ese código.'); end if;
  select * into a from alumnos where clase_id = c.id and lower(alias) = lower(_limpiar_alias(p_alias));
  if not found then
    return json_build_object('error', 'No hay nadie con ese alias en la clase. Si eres nuevo, crea tu cuenta.');
  end if;
  if a.bloqueo_hasta > now() then
    return json_build_object('error', format('Demasiados intentos. Espera %s min o pide al profe que te cambie el PIN.',
                                             ceil(extract(epoch from a.bloqueo_hasta - now()) / 60)));
  end if;
  if a.pin <> crypt(coalesce(p_pin, ''), a.pin) then
    update alumnos set
      fallos = case when fallos + 1 >= 5 then 0 else fallos + 1 end,
      bloqueo_hasta = case when fallos + 1 >= 5 then now() + interval '10 minutes' else bloqueo_hasta end
    where id = a.id;
    return json_build_object('error', 'PIN incorrecto.');
  end if;
  update alumnos set fallos = 0, ultima = now() where id = a.id;
  delete from sesiones where caduca < now();
  insert into sesiones (alumno_id, caduca) values (a.id, now() + interval '180 days') returning token into t;
  return _estado(a, t);
end $$;

create or replace function public.alumno_estado(p_token uuid) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare a alumnos;
begin
  a := _alumno(p_token);
  update alumnos set ultima = now() where id = a.id;
  return _estado(a, p_token);
end $$;

create or replace function public.alumno_ejecucion(p_token uuid, p_nivel int, p_superado boolean, p_estrellas int, p_codigo text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare a alumnos; v_est int := case when p_superado then least(greatest(coalesce(p_estrellas, 1), 1), 3) else 0 end;
        v_cod text := left(coalesce(p_codigo, ''), 20000);
begin
  a := _alumno(p_token);
  if p_nivel is null or p_nivel not between 1 and 100 then
    raise exception 'Nivel no válido.' using errcode = 'P0001';
  end if;
  insert into progreso as p (alumno_id, nivel, estrellas, intentos, superado, codigo, solucion, actualizado)
  values (a.id, p_nivel, v_est, 1, case when p_superado then now() end, v_cod,
          case when p_superado then v_cod else '' end, now())
  on conflict (alumno_id, nivel) do update set
    estrellas   = greatest(p.estrellas, excluded.estrellas),
    intentos    = p.intentos + 1,
    superado    = coalesce(p.superado, excluded.superado),
    codigo      = excluded.codigo,
    solucion    = case when p_superado and excluded.estrellas >= p.estrellas then excluded.solucion else p.solucion end,
    actualizado = now();
  update alumnos set ultima = now() where id = a.id;
end $$;

create or replace function public.alumno_salir(p_token uuid) returns void
language sql security definer set search_path = public, extensions as $$
  delete from sesiones where token = p_token and not es_profe;
$$;

-- ---------- profesor ----------
create or replace function public.profe_entrar(p_clave text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare s ajustes; t uuid;
begin
  select * into s from ajustes where id = 1;
  if not found then return json_build_object('error', 'Falta configurar la clave de profesor (última sección de schema.sql).'); end if;
  if s.bloqueo_hasta > now() then
    return json_build_object('error', 'Demasiados intentos fallidos. Espera unos minutos.');
  end if;
  if s.clave_profe <> crypt(coalesce(p_clave, ''), s.clave_profe) then
    update ajustes set
      fallos = case when fallos + 1 >= 8 then 0 else fallos + 1 end,
      bloqueo_hasta = case when fallos + 1 >= 8 then now() + interval '10 minutes' else bloqueo_hasta end
    where id = 1;
    return json_build_object('error', 'Clave incorrecta.');
  end if;
  update ajustes set fallos = 0 where id = 1;
  delete from sesiones where caduca < now();
  insert into sesiones (es_profe, caduca) values (true, now() + interval '12 hours') returning token into t;
  return json_build_object('token', t);
end $$;

create or replace function public.profe_salir(p_token uuid) returns void
language sql security definer set search_path = public, extensions as $$
  delete from sesiones where token = p_token and es_profe;
$$;

create or replace function public.profe_clases(p_token uuid) returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _profe(p_token);
  return coalesce((select json_agg(json_build_object('id', c.id, 'codigo', c.codigo, 'nombre', c.nombre,
           'desbloquear', c.desbloquear, 'alumnos', (select count(*) from alumnos a where a.clase_id = c.id))
           order by c.creada) from clases c), '[]'::json);
end $$;

create or replace function public.profe_crear_clase(p_token uuid, p_nombre text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v text; c clases; n text := btrim(coalesce(p_nombre, ''));
begin
  perform _profe(p_token);
  if length(n) < 1 or length(n) > 60 then raise exception 'Ponle un nombre a la clase.' using errcode = 'P0001'; end if;
  loop
    v := '';
    for i in 1..6 loop
      v := v || substr(alfabeto, 1 + (get_byte(gen_random_bytes(1), 0) % length(alfabeto)), 1);
    end loop;
    exit when not exists (select 1 from clases where codigo = v);
  end loop;
  insert into clases (codigo, nombre) values (v, n) returning * into c;
  return json_build_object('id', c.id, 'codigo', c.codigo, 'nombre', c.nombre, 'desbloquear', c.desbloquear, 'alumnos', 0);
end $$;

create or replace function public.profe_desbloquear(p_token uuid, p_clase uuid, p_valor boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _profe(p_token);
  update clases set desbloquear = coalesce(p_valor, false) where id = p_clase;
end $$;

create or replace function public.profe_borrar_clase(p_token uuid, p_clase uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _profe(p_token);
  delete from clases where id = p_clase;
end $$;

create or replace function public.profe_detalle(p_token uuid, p_clase uuid) returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _profe(p_token);
  return coalesce((select json_agg(json_build_object(
      'id', a.id, 'alias', a.alias, 'creado', a.creado, 'ultima', a.ultima,
      'bloqueado', a.bloqueo_hasta > now(),
      'progreso', coalesce((select json_agg(json_build_object('nivel', p.nivel, 'estrellas', p.estrellas,
                    'intentos', p.intentos, 'superado', p.superado, 'actualizado', p.actualizado) order by p.nivel)
                    from progreso p where p.alumno_id = a.id), '[]'::json))
    order by lower(a.alias)) from alumnos a where a.clase_id = p_clase), '[]'::json);
end $$;

create or replace function public.profe_codigo(p_token uuid, p_alumno uuid, p_nivel int) returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _profe(p_token);
  return (select json_build_object('alias', a.alias, 'nivel', p.nivel, 'estrellas', p.estrellas, 'intentos', p.intentos,
            'superado', p.superado, 'actualizado', p.actualizado, 'codigo', p.codigo, 'solucion', p.solucion)
          from progreso p join alumnos a on a.id = p.alumno_id
          where p.alumno_id = p_alumno and p.nivel = p_nivel);
end $$;

create or replace function public.profe_cambiar_pin(p_token uuid, p_alumno uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _profe(p_token);
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then raise exception 'El PIN tienen que ser 4 números.' using errcode = 'P0001'; end if;
  update alumnos set pin = crypt(p_pin, gen_salt('bf', 8)), fallos = 0, bloqueo_hasta = null where id = p_alumno;
  delete from sesiones where alumno_id = p_alumno;
end $$;

create or replace function public.profe_borrar_alumno(p_token uuid, p_alumno uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _profe(p_token);
  delete from alumnos where id = p_alumno;
end $$;

-- ---------- permisos ----------
revoke all on function public._alumno(uuid), public._profe(uuid), public._estado(public.alumnos, uuid)
  from public, anon, authenticated;
grant execute on function
  public.alumno_registrar(text, text, text), public.alumno_entrar(text, text, text), public.alumno_estado(uuid),
  public.alumno_ejecucion(uuid, int, boolean, int, text), public.alumno_salir(uuid),
  public.profe_entrar(text), public.profe_salir(uuid), public.profe_clases(uuid), public.profe_crear_clase(uuid, text),
  public.profe_desbloquear(uuid, uuid, boolean), public.profe_borrar_clase(uuid, uuid), public.profe_detalle(uuid, uuid),
  public.profe_codigo(uuid, uuid, int), public.profe_cambiar_pin(uuid, uuid, text), public.profe_borrar_alumno(uuid, uuid)
  to anon, authenticated;

-- =====================================================================
-- ÚLTIMA SECCIÓN · CLAVE DE PROFESOR
-- Cambia el texto entre comillas por tu clave (8 caracteres o más).
-- Con ella entras en profe.html. No la compartas con los alumnos.
-- =====================================================================
do $$
declare v_clave text := 'cambia-esta-clave';
begin
  if v_clave = 'cambia-esta-clave' or length(v_clave) < 8 then
    raise exception 'Pon tu propia clave de profesor (8 caracteres o más) en la última sección de schema.sql';
  end if;
  insert into public.ajustes (id, clave_profe) values (1, extensions.crypt(v_clave, extensions.gen_salt('bf', 10)))
  on conflict (id) do update set clave_profe = excluded.clave_profe, fallos = 0, bloqueo_hasta = null;
end $$;
