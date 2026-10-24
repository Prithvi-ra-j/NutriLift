BEGIN;
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
SELECT plan(2);

DO $$
DECLARE
  v_user_id uuid := 'ff389204-7b4d-497a-9f10-06d44ba26e1a';
  v_connection text;
  v_connection_string text;
  v_admin_connection_string text;
  v_index integer;
BEGIN
  v_admin_connection_string := format(
    'dbname=%L user=postgres',
    current_database()
  );
  PERFORM extensions.dblink_exec(
    v_admin_connection_string,
    format(
      'insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at) values (%L, %L, %L, %L, %L, now()) on conflict (id) do nothing',
      v_user_id,
      'authenticated',
      'authenticated',
      'ai-quota-test@nutrilift.invalid',
      ''
    )
  );

  PERFORM extensions.dblink_exec(
    v_admin_connection_string,
    format('delete from public.ai_usage where user_id = %L', v_user_id)
  );
  CREATE TEMP TABLE ai_quota_results (allowed boolean NOT NULL);

  v_connection_string := format(
    'dbname=%L user=postgres options=%L',
    current_database(),
    '-c role=authenticated -c request.jwt.claim.sub=' || v_user_id::text
  );

  FOR v_index IN 1..50 LOOP
    v_connection := 'ai_quota_' || v_index::text;
    PERFORM extensions.dblink_connect(v_connection, v_connection_string);
    IF extensions.dblink_send_query(
      v_connection,
      'select allowed from public.consume_ai_quota(10)'
    ) <> 1 THEN
      RAISE EXCEPTION 'Could not dispatch concurrent quota request %', v_index;
    END IF;
  END LOOP;

  FOR v_index IN 1..50 LOOP
    v_connection := 'ai_quota_' || v_index::text;
    INSERT INTO ai_quota_results (allowed)
    SELECT result.allowed
    FROM extensions.dblink_get_result(v_connection) AS result(allowed boolean);
    PERFORM extensions.dblink_disconnect(v_connection);
  END LOOP;

  PERFORM extensions.dblink_exec(
    v_admin_connection_string,
    format('delete from public.ai_usage where user_id = %L', v_user_id)
  );
  PERFORM extensions.dblink_exec(
    v_admin_connection_string,
    format('delete from auth.users where id = %L', v_user_id)
  );
END;
$$;

SELECT is(
  (SELECT count(*)::integer FROM ai_quota_results WHERE allowed),
  10,
  'only ten of fifty simultaneous quota requests are allowed'
);
SELECT is(
  (SELECT count(*)::integer FROM ai_quota_results),
  50,
  'all fifty concurrent quota requests return a result'
);

SELECT * FROM finish();
ROLLBACK;
