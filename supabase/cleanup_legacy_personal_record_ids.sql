BEGIN;

SELECT record_type, external_id
FROM public.sync_records
WHERE record_type = 'body.performance'
  AND external_id ~ '^nutrilift:personal_record:.+:[0-9]{4}-[0-9]{2}-[0-9]{2}$'
ORDER BY external_id;

DELETE FROM public.sync_records
WHERE record_type = 'body.performance'
  AND external_id ~ '^nutrilift:personal_record:.+:[0-9]{4}-[0-9]{2}-[0-9]{2}$';

COMMIT;
