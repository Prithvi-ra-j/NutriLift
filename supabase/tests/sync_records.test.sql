BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES (
  '9b90aeb4-d4ac-4ebd-a23d-3fbc4df81b5b',
  'authenticated',
  'authenticated',
  'sync-test@nutrilift.invalid',
  '',
  now()
)
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.sub', '9b90aeb4-d4ac-4ebd-a23d-3fbc4df81b5b', true);
SET LOCAL ROLE authenticated;

SELECT is(
  public.upsert_sync_records(
    '[{"external_id":"nutrilift:food_log:test","record_type":"body.nutrition.food_log","payload":{"id":"test","row":{"id":"test"}},"source_updated_at":"2026-10-24T00:00:00Z","source_app":"nutrilift","occurred_at":"2026-10-24T00:00:00Z","schema_version":1,"deleted_at":null}]'
  ),
  1,
  'authenticated upload inserts a record with server-derived ownership'
);

SELECT is(
  public.upsert_sync_records(
    '[{"external_id":"nutrilift:food_log:test","record_type":"body.nutrition.food_log","payload":{"id":"test","row":{"id":"stale"}},"source_updated_at":"2026-10-23T00:00:00Z","source_app":"nutrilift","occurred_at":"2026-10-23T00:00:00Z","schema_version":1,"deleted_at":null}]'
  ),
  0,
  'older upload does not overwrite the current row'
);

SELECT is(
  (SELECT payload #>> '{row,id}' FROM public.sync_records
   WHERE user_id = auth.uid() AND external_id = 'nutrilift:food_log:test'),
  'test',
  'stored payload remains the newer value'
);

SELECT is(
  public.upsert_sync_records(
    '[{"external_id":"nutrilift:food_log:test","record_type":"body.nutrition.food_log","payload":{"id":"test","row":{"id":"fresh"}},"source_updated_at":"2026-10-25T00:00:00Z","source_app":"nutrilift","occurred_at":"2026-10-25T00:00:00Z","schema_version":1,"deleted_at":null}]'
  ),
  1,
  'newer upload replaces the existing row'
);

SELECT is(
  (SELECT payload #>> '{row,id}' FROM public.sync_records
   WHERE user_id = auth.uid() AND external_id = 'nutrilift:food_log:test'),
  'fresh',
  'newer payload is retained'
);

SELECT is(
  public.upsert_sync_records(
    '[{"external_id":"nutrilift:food_log:test","record_type":"body.nutrition.food_log","payload":{"id":"test","row":{"id":"fresh"}},"source_updated_at":"2026-10-25T00:00:00Z","source_app":"nutrilift","occurred_at":"2026-10-25T00:00:00Z","schema_version":1,"deleted_at":null}]'
  ),
  1,
  'duplicate delivery updates the same external record'
);

SELECT is(
  (SELECT count(*)::integer FROM public.sync_records
   WHERE user_id = auth.uid() AND external_id = 'nutrilift:food_log:test'),
  1,
  'duplicate delivery does not create a second record'
);

SELECT is(
  public.upsert_sync_records(
    '[{"external_id":"nutrilift:food_log:test","record_type":"body.nutrition.food_log","payload":{"id":"test","row":{"id":"fresh","deleted_at":"2026-10-26T00:00:00Z"}},"source_updated_at":"2026-10-26T00:00:00Z","source_app":"nutrilift","occurred_at":"2026-10-24T00:00:00Z","schema_version":1,"deleted_at":"2026-10-26T00:00:00Z"}]'
  ),
  1,
  'newer tombstone is accepted'
);

SELECT is(
  (SELECT deleted_at::text FROM public.sync_records
   WHERE user_id = auth.uid() AND external_id = 'nutrilift:food_log:test'),
  '2026-10-26 00:00:00+00',
  'deletion timestamp is retained on the server'
);

SELECT * FROM finish();
ROLLBACK;
