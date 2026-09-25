-- Diagnóstico de solo lectura para endurecer las entregas de bodega.
-- No crea, modifica ni elimina datos u objetos de Supabase.

select jsonb_pretty(
  jsonb_build_object(
    'columnas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tabla', c.table_name,
        'posicion', c.ordinal_position,
        'columna', c.column_name,
        'tipo', c.data_type,
        'tipo_interno', c.udt_name,
        'acepta_null', c.is_nullable,
        'valor_default', c.column_default
      ) order by c.table_name, c.ordinal_position)
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name in (
          'vales_bodega',
          'vales_bodega_items',
          'bodega_inventarios',
          'bodega_inventario_items',
          'perfiles'
        )
    ), '[]'::jsonb),
    'restricciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tabla', rel.relname,
        'nombre', con.conname,
        'tipo', con.contype,
        'definicion', pg_get_constraintdef(con.oid, true)
      ) order by rel.relname, con.conname)
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'public'
        and rel.relname in (
          'vales_bodega',
          'vales_bodega_items',
          'bodega_inventarios',
          'bodega_inventario_items',
          'perfiles'
        )
    ), '[]'::jsonb),
    'indices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tabla', i.tablename,
        'nombre', i.indexname,
        'definicion', i.indexdef
      ) order by i.tablename, i.indexname)
      from pg_indexes i
      where i.schemaname = 'public'
        and i.tablename in (
          'vales_bodega',
          'vales_bodega_items',
          'bodega_inventarios',
          'bodega_inventario_items',
          'perfiles'
        )
    ), '[]'::jsonb),
    'rls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tabla', cls.relname,
        'habilitado', cls.relrowsecurity,
        'forzado', cls.relforcerowsecurity
      ) order by cls.relname)
      from pg_class cls
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public'
        and cls.relkind = 'r'
        and cls.relname in (
          'vales_bodega',
          'vales_bodega_items',
          'bodega_inventarios',
          'bodega_inventario_items',
          'perfiles'
        )
    ), '[]'::jsonb),
    'politicas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tabla', p.tablename,
        'nombre', p.policyname,
        'permisiva', p.permissive,
        'roles', p.roles,
        'comando', p.cmd,
        'condicion', p.qual,
        'validacion', p.with_check
      ) order by p.tablename, p.policyname)
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in (
          'vales_bodega',
          'vales_bodega_items',
          'bodega_inventarios',
          'bodega_inventario_items',
          'perfiles'
        )
    ), '[]'::jsonb),
    'permisos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tabla', g.table_name,
        'rol', g.grantee,
        'permiso', g.privilege_type
      ) order by g.table_name, g.grantee, g.privilege_type)
      from information_schema.role_table_grants g
      where g.table_schema = 'public'
        and g.grantee in ('anon', 'authenticated')
        and g.table_name in (
          'vales_bodega',
          'vales_bodega_items',
          'bodega_inventarios',
          'bodega_inventario_items',
          'perfiles'
        )
    ), '[]'::jsonb)
  )
) as diagnostico_integridad_bodega;
