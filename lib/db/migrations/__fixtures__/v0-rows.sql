DROP TABLE custom_exercises;

INSERT INTO food_logs
  (id, date, meal, name, calories, protein_g, carbs_g, fat_g, source, created_at)
  VALUES ('food-1', '2025-01-02', 'breakfast', 'Eggs', 100, 8, 1, 7, 'manual', 1735778400);

INSERT INTO daily_nutrition
  (date, total_calories, total_protein_g, total_carbs_g, total_fat_g)
  VALUES ('2025-01-02', 100, 8, 1, 7);

INSERT INTO workout_sessions (id, date, day_type)
  VALUES ('session-1', '2025-01-02', 'Push A');

INSERT INTO exercise_logs (id, session_id, date, exercise_name)
  VALUES ('exercise-1', 'session-1', '2025-01-02', 'Bench Press');

INSERT INTO set_logs (id, exercise_log_id, set_number, weight_kg, reps, logged_at)
  VALUES ('set-1', 'exercise-1', 1, 50, 8, 1735778400);

INSERT INTO recovery_logs (date, sleep_quality) VALUES ('2025-01-02', 4);

INSERT INTO personal_records
  (exercise_name, best_weight_kg, best_1rm_estimated, achieved_date)
  VALUES ('Bench Press', 50, 66.6, '2025-01-02');
