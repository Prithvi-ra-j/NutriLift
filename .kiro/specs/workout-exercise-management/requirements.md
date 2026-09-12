# Requirements Document

## Introduction

This document specifies requirements for enhancing workout plan and exercise management capabilities in the NutriLift fitness tracking application. The enhancements enable users to delete exercises from workout plans, edit previously logged exercises and sets, and configure exercise-specific logging inputs based on exercise type (weight-based, duration-based, distance-based, or rep-based).

## Glossary

- **Workout_Plan**: A user's structured plan containing one or more exercises to be performed during a workout session
- **Exercise_Log**: A record of a specific exercise performed during a workout session
- **Set_Log**: A record of a single set within an exercise log, containing metrics such as weight, reps, duration, or distance
- **Exercise_Type**: A classification defining the logging configuration for an exercise (weight_reps, duration, distance_duration, reps_only, or bodyweight)
- **Logging_Configuration**: The set of input fields required to log a set for a specific exercise type
- **Workout_Session**: A complete workout recorded on a specific date with one or more exercise logs
- **Exercise_Manager**: The component responsible for managing exercises within workout plans
- **Set_Editor**: The component responsible for editing individual set logs
- **Exercise_Log_Editor**: The component responsible for editing exercise logs

## Requirements

### Requirement 1: Delete Exercise from Workout Plan

**User Story:** As a user, I want to delete an exercise from my workout plan, so that I can remove exercises I no longer want to perform.

#### Acceptance Criteria

1. WHEN a user selects a delete option for an exercise in a workout plan, THE Exercise_Manager SHALL display a confirmation prompt
2. WHEN a user confirms deletion, THE Exercise_Manager SHALL remove the exercise and all associated set logs from the workout plan
3. WHEN an exercise is deleted, THE Exercise_Manager SHALL update the order_in_session values for remaining exercises to maintain sequential ordering
4. AFTER deletion completes, THE Exercise_Manager SHALL display a success message to the user
5. IF the deleted exercise was the only exercise in the workout session, THEN THE Exercise_Manager SHALL remove the entire workout session

### Requirement 2: Edit Logged Exercises

**User Story:** As a user, I want to edit exercises I have already logged, so that I can correct mistakes or update exercise details.

#### Acceptance Criteria

1. WHEN a user selects an edit option for a logged exercise, THE Exercise_Log_Editor SHALL display the exercise's current details
2. THE Exercise_Log_Editor SHALL allow modification of exercise_name, muscle_group, and equipment fields
3. WHEN a user saves changes to a logged exercise, THE Exercise_Log_Editor SHALL validate that exercise_name is not empty
4. WHEN valid changes are saved, THE Exercise_Log_Editor SHALL update the exercise log in the database with the modified values
5. AFTER changes are saved, THE Exercise_Log_Editor SHALL display a success message to the user
6. IF validation fails, THEN THE Exercise_Log_Editor SHALL display an error message describing the validation failure

### Requirement 3: Edit Logged Sets

**User Story:** As a user, I want to edit individual logged sets, so that I can correct mistakes in reps, weight, duration, or other set metrics.

#### Acceptance Criteria

1. WHEN a user selects an edit option for a logged set, THE Set_Editor SHALL display the set's current values
2. THE Set_Editor SHALL display input fields appropriate for the exercise's logging configuration
3. WHEN a user modifies set values, THE Set_Editor SHALL validate that numeric values are non-negative
4. WHEN valid changes are saved, THE Set_Editor SHALL update the set log in the database with the modified values
5. WHEN set values change, THE Set_Editor SHALL recalculate the workout session's total_volume_kg
6. AFTER changes are saved, THE Set_Editor SHALL display a success message to the user
7. IF validation fails, THEN THE Set_Editor SHALL display an error message describing the validation failure

### Requirement 4: Exercise Type Classification

**User Story:** As a user, I want exercises to be classified by type, so that the appropriate logging fields are displayed for each exercise.

#### Acceptance Criteria

1. THE Exercise_Manager SHALL support five exercise types: weight_reps, duration, distance_duration, reps_only, and bodyweight
2. THE Exercise_Manager SHALL store the exercise_type field in the exercise_logs table
3. WHEN an exercise is created, THE Exercise_Manager SHALL assign an exercise_type based on the exercise_name or allow manual selection
4. THE Exercise_Manager SHALL provide a default exercise_type of weight_reps for exercises without a predefined classification
5. THE Exercise_Manager SHALL allow users to modify the exercise_type for any exercise

### Requirement 5: Exercise-Specific Logging Configuration

**User Story:** As a user, I want to see only the relevant input fields for each exercise type, so that I can log my workouts efficiently without entering irrelevant data.

#### Acceptance Criteria

1. WHEN logging a set for a weight_reps exercise, THE Logging_Configuration SHALL display weight_kg and reps input fields
2. WHEN logging a set for a duration exercise, THE Logging_Configuration SHALL display duration_seconds input field
3. WHEN logging a set for a distance_duration exercise, THE Logging_Configuration SHALL display distance_km and duration_seconds input fields
4. WHEN logging a set for a reps_only exercise, THE Logging_Configuration SHALL display reps input field
5. WHEN logging a set for a bodyweight exercise, THE Logging_Configuration SHALL display weight_kg and reps input fields
6. THE Logging_Configuration SHALL hide input fields that are not applicable to the current exercise type
7. THE Logging_Configuration SHALL display optional fields for rpe and notes for all exercise types

### Requirement 6: Data Migration for Exercise Types

**User Story:** As a system administrator, I want existing exercise logs to be assigned appropriate exercise types, so that the application continues to function correctly with historical data.

#### Acceptance Criteria

1. WHEN the application starts with an updated database schema, THE Exercise_Manager SHALL execute a migration script
2. THE Exercise_Manager SHALL assign exercise_type values to all existing exercise logs based on exercise_name patterns
3. THE Exercise_Manager SHALL assign weight_reps as the default exercise_type for exercises that cannot be automatically classified
4. THE Exercise_Manager SHALL log the number of exercise logs migrated and any classification errors
5. IF the migration encounters an error, THEN THE Exercise_Manager SHALL roll back the migration and log the error details

### Requirement 7: Set Log Schema Extension

**User Story:** As a developer, I want the set log schema to support multiple metric types, so that duration-based and distance-based exercises can be stored correctly.

#### Acceptance Criteria

1. THE Set_Log SHALL include a duration_seconds field for duration-based exercises
2. THE Set_Log SHALL include a distance_km field for distance-based exercises
3. THE Set_Log SHALL maintain existing weight_kg and reps fields for backward compatibility
4. WHEN calculating total_volume_kg for non-weight exercises, THE Exercise_Manager SHALL use a conversion formula or set volume to zero
5. THE Set_Log SHALL allow null values for metric fields that are not applicable to the exercise type

### Requirement 8: Exercise Type Library

**User Story:** As a user, I want common exercises to be pre-classified by type, so that I don't have to manually configure every exercise I use.

#### Acceptance Criteria

1. THE Exercise_Manager SHALL maintain a library mapping common exercise names to exercise types
2. THE Exercise_Manager SHALL classify "Plank" and similar exercises as duration type
3. THE Exercise_Manager SHALL classify "Jumping Jacks" and similar exercises as reps_only type
4. THE Exercise_Manager SHALL classify "Running" and "Cycling" as distance_duration type
5. THE Exercise_Manager SHALL classify traditional strength exercises as weight_reps or bodyweight type
6. THE Exercise_Manager SHALL use case-insensitive matching when looking up exercises in the library
7. THE Exercise_Manager SHALL allow users to add custom exercise classifications to the library

### Requirement 9: Volume Calculation for Mixed Exercise Types

**User Story:** As a user, I want my workout session volume to be calculated correctly, so that I can track my training progress across different exercise types.

#### Acceptance Criteria

1. WHEN calculating total_volume_kg for weight_reps exercises, THE Exercise_Manager SHALL use the formula: weight_kg × reps
2. WHEN calculating total_volume_kg for duration exercises, THE Exercise_Manager SHALL set volume to zero
3. WHEN calculating total_volume_kg for distance_duration exercises, THE Exercise_Manager SHALL set volume to zero
4. WHEN calculating total_volume_kg for reps_only exercises, THE Exercise_Manager SHALL set volume to zero
5. WHEN calculating total_volume_kg for bodyweight exercises, THE Exercise_Manager SHALL use the formula: weight_kg × reps
6. WHEN a workout session contains multiple exercise types, THE Exercise_Manager SHALL sum only the weight_reps and bodyweight exercise volumes

### Requirement 10: User Interface for Exercise Deletion

**User Story:** As a user, I want an intuitive way to delete exercises from my workout plan, so that I can manage my workouts efficiently.

#### Acceptance Criteria

1. THE Exercise_Manager SHALL display a delete button or swipe action for each exercise in the workout plan
2. WHEN a user initiates deletion, THE Exercise_Manager SHALL display a confirmation dialog showing the exercise name
3. THE Exercise_Manager SHALL provide cancel and confirm buttons in the confirmation dialog
4. WHEN a user confirms deletion, THE Exercise_Manager SHALL remove the exercise within 500 milliseconds
5. THE Exercise_Manager SHALL display the updated workout plan immediately after deletion

### Requirement 11: User Interface for Exercise and Set Editing

**User Story:** As a user, I want an intuitive way to edit logged exercises and sets, so that I can maintain accurate workout records.

#### Acceptance Criteria

1. THE Exercise_Log_Editor SHALL display an edit button or tap action for each logged exercise
2. THE Set_Editor SHALL display an edit button or tap action for each logged set
3. WHEN editing is initiated, THE Exercise_Log_Editor SHALL display a modal or inline form with current values pre-filled
4. THE Set_Editor SHALL display appropriate input fields based on the exercise's logging configuration
5. THE Exercise_Log_Editor SHALL provide save and cancel buttons
6. THE Set_Editor SHALL provide save and cancel buttons
7. WHEN a user cancels editing, THE Exercise_Log_Editor SHALL discard changes and return to the previous view
8. WHEN a user cancels editing, THE Set_Editor SHALL discard changes and return to the previous view
