DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sync_records_type_chk'
      AND conrelid = 'public.sync_records'::regclass
  ) THEN
    ALTER TABLE public.sync_records
      ADD CONSTRAINT sync_records_type_chk
      CHECK (record_type ~ '^[a-z_]+([.][a-z_]+)+$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sync_records_payload_chk'
      AND conrelid = 'public.sync_records'::regclass
  ) THEN
    ALTER TABLE public.sync_records
      ADD CONSTRAINT sync_records_payload_chk
      CHECK (pg_column_size(payload) < 65536);
  END IF;
END
$migration$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS sync_records_touch ON public.sync_records;
CREATE TRIGGER sync_records_touch
BEFORE UPDATE ON public.sync_records
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.upsert_sync_records(rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  affected integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to sync records';
  END IF;
  IF jsonb_typeof(rows) IS DISTINCT FROM 'array' OR jsonb_array_length(rows) > 200 THEN
    RAISE EXCEPTION 'Sync upload must be an array of at most 200 records';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(rows) AS candidate(source_updated_at timestamptz)
    WHERE candidate.source_updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Every sync record must include source_updated_at';
  END IF;

  INSERT INTO public.sync_records (
    user_id, external_id, record_type, payload, source_updated_at, source_app,
    occurred_at, schema_version, deleted_at
  )
  SELECT
    auth.uid(), r.external_id, r.record_type, r.payload, r.source_updated_at,
    r.source_app, r.occurred_at, r.schema_version, r.deleted_at
  FROM jsonb_to_recordset(rows) AS r(
    external_id text,
    record_type text,
    payload jsonb,
    source_updated_at timestamptz,
    source_app text,
    occurred_at timestamptz,
    schema_version integer,
    deleted_at timestamptz
  )
  WHERE r.source_updated_at IS NOT NULL
  ON CONFLICT (user_id, external_id) DO UPDATE
    SET record_type = excluded.record_type,
        payload = excluded.payload,
        source_updated_at = excluded.source_updated_at,
        source_app = excluded.source_app,
        occurred_at = excluded.occurred_at,
        schema_version = excluded.schema_version,
        deleted_at = excluded.deleted_at
    WHERE sync_records.source_updated_at IS NULL
       OR excluded.source_updated_at >= sync_records.source_updated_at;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END
$function$;

REVOKE ALL ON FUNCTION public.upsert_sync_records(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_sync_records(jsonb) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sync_records TO authenticated;

DROP TABLE IF EXISTS public.sync_events;
DROP TABLE IF EXISTS public.sync_cursors;
DROP TABLE IF EXISTS public.profiles;
