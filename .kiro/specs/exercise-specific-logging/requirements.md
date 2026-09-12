# Requirements Document

## Introduction

The Nutrition OS app currently uses a universal logging configuration for all exercises, requiring users to interact with input fields that may not be relevant to their specific exercise type. This feature introduces exercise-specific logging configurations that dynamically display only the appropriate input fields based on the exercise type (e.g., duration for planks, reps for jumping jacks, distance + duration for running, weight + reps for weight exercises).

## Glossary

- **Logging_System**: The subsystem responsible for capturing and storing exercise data
- **Configuration_Manager**: The component that manages and retrieves exercise-specific logging configurations
- **Input_Field**: A user interface element for entering exercise data (duration, reps, weight, distance)
- **Exercise_Type**: A categorization of exercises based on the type of measurements required (time-based, rep-based, distance-based, weight-based, or combination)
- **User_Interface**: The screen or component displaying exercise logging inputs
- **Exercise_Definition**: The stored metadata for an exercise including its type and required fields

## Requirements

### Requirement 1: Define Exercise Types

**User Story:** As a user, I want the system to recognize different exercise types, so that I see only relevant input fields for each exercise.

#### Acceptance Criteria

1. THE Configuration_Manager SHALL recognize time-based as a valid exercise type
2. THE Configuration_Manager SHALL recognize rep-based as a valid exercise type
3. THE Configuration_Manager SHALL recognize distance-based as a valid exercise type
4. THE Configuration_Manager SHALL recognize weight-based as a valid exercise type
5. THE Configuration_Manager SHALL recognize combination exercise types that require 2 to 4 simultaneous measurements from the following valid combinations: time-based with reps, distance-based with weight and reps, time-based with distance, or weight-based with distance
6. THE Configuration_Manager SHALL associate time-based exercises with duration input fields
7. THE Configuration_Manager SHALL associate rep-based exercises with rep count input fields
8. THE Configuration_Manager SHALL associate distance-based exercises with distance and duration input fields
9. THE Configuration_Manager SHALL associate weight-based exercises with weight and rep count input fields

### Requirement 2: Store Exercise-Specific Configurations

**User Story:** As a developer, I want to store logging configurations for each exercise, so that the system knows which input fields to display.

#### Acceptance Criteria

1. WHEN an Exercise_Definition is created, THE Configuration_Manager SHALL store its exercise type as one of the following values: time-based, rep-based, distance-based, weight-based, or a valid combination type
2. WHEN an Exercise_Definition is created, THE Configuration_Manager SHALL store the list of required input field types matching the exercise type
3. THE Configuration_Manager SHALL associate each exercise with exactly one exercise type
4. WHEN storing an Exercise_Definition, IF the required fields list does not match the exercise type, THEN THE Configuration_Manager SHALL reject the storage operation
5. WHEN an Exercise_Definition storage operation is rejected, THE Configuration_Manager SHALL return an error message specifying which required fields are missing or invalid
6. WHEN storage validation fails, THE Configuration_Manager SHALL not persist any part of the Exercise_Definition
7. WHEN an Exercise_Definition is successfully stored, THE Configuration_Manager SHALL confirm storage and return the stored exercise identifier

### Requirement 3: Display Appropriate Input Fields

**User Story:** As a user, I want to see only the input fields relevant to my exercise, so that I can log my workout quickly without confusion.

#### Acceptance Criteria

1. WHEN a user selects a time-based exercise, THE User_Interface SHALL display a duration input field accepting values from 1 to 86400 seconds
2. WHEN a user selects a rep-based exercise, THE User_Interface SHALL display a rep count input field accepting integer values from 1 to 9999
3. WHEN a user selects a distance-based exercise, THE User_Interface SHALL display a distance input field accepting values from 0.01 to 999.99 kilometers and a duration input field accepting values from 1 to 86400 seconds
4. WHEN a user selects a weight-based exercise, THE User_Interface SHALL display a weight input field accepting values from 0.1 to 9999.9 kilograms and a rep count input field accepting integer values from 1 to 9999
5. WHEN a user selects a combination exercise, THE User_Interface SHALL display all required input fields for that exercise type with the same numeric bounds as specified in criteria 1-4
6. WHEN a user selects an exercise, THE User_Interface SHALL hide all input fields that are not required for the selected exercise type within 100 milliseconds
7. WHEN a user enters a value outside the valid range for any input field, THE User_Interface SHALL display an error message indicating the valid range for that field

### Requirement 4: Map Existing Exercises to Types

**User Story:** As a developer, I want to classify existing exercises by type, so that users immediately benefit from exercise-specific configurations.

#### Acceptance Criteria

1. THE Configuration_Manager SHALL provide a default exercise type mapping for at least 11 common exercises covering all exercise types
2. THE Configuration_Manager SHALL classify the following exercises as time-based: plank, side plank, wall sit
3. THE Configuration_Manager SHALL classify the following exercises as rep-based: jumping jacks, push-ups, sit-ups
4. THE Configuration_Manager SHALL classify the following exercises as distance-based: running, cycling, swimming
5. THE Configuration_Manager SHALL classify the following exercises as weight-based: bench press, squat
6. WHEN retrieving an exercise type by name, THE Configuration_Manager SHALL match exercise names case-insensitively
7. WHEN retrieving an exercise type by name, THE Configuration_Manager SHALL require an exact match of the exercise name
8. IF an exercise name is not found in the default mapping, THEN THE Configuration_Manager SHALL return an error indicating the exercise is not mapped

### Requirement 5: Retrieve Exercise Configuration

**User Story:** As a developer, I want to query exercise configurations, so that the UI can dynamically render the correct input fields.

#### Acceptance Criteria

1. WHEN the Logging_System provides a valid exercise identifier, THE Configuration_Manager SHALL return the exercise type and the list of required input fields within 100 milliseconds
2. IF an exercise has no stored configuration, THEN THE Configuration_Manager SHALL return a default configuration with exercise type set to weight-based and required fields set to weight and reps
3. IF the Logging_System provides an invalid exercise identifier, THEN THE Configuration_Manager SHALL return an error indicating the identifier is not found
4. IF the Logging_System provides a null or empty exercise identifier, THEN THE Configuration_Manager SHALL return an error indicating the identifier is required
5. THE Configuration_Manager SHALL measure the 100 milliseconds response time from the moment it receives the exercise identifier to the moment it returns the configuration data or error
6. WHEN returning a configuration, THE Configuration_Manager SHALL include both the exercise type as a string and the required fields as a list of field names

### Requirement 6: Validate Exercise Log Entries

**User Story:** As a user, I want the system to prevent me from submitting incomplete exercise logs, so that my workout data is accurate and complete.

#### Acceptance Criteria

1. WHEN a user attempts to log a time-based exercise, THE Logging_System SHALL validate that the duration field is provided and contains a numeric value between 1 and 86400 seconds
2. WHEN a user attempts to log a rep-based exercise, THE Logging_System SHALL validate that the reps field is provided and contains an integer value between 1 and 9999
3. WHEN a user attempts to log a distance-based exercise, THE Logging_System SHALL validate that the distance field is provided and contains a numeric value between 0.01 and 999.99 kilometers
4. WHEN a user attempts to log a distance-based exercise, THE Logging_System SHALL validate that the duration field is provided and contains a numeric value between 1 and 86400 seconds
5. WHEN a user attempts to log a weight-based exercise, THE Logging_System SHALL validate that the weight field is provided and contains a numeric value between 0.1 and 9999.9 kilograms
6. WHEN a user attempts to log a weight-based exercise, THE Logging_System SHALL validate that the reps field is provided and contains an integer value between 1 and 9999
7. WHEN a user attempts to log a combination exercise, THE Logging_System SHALL validate all required fields for that combination type according to the bounds specified in criteria 1-6
8. IF a required field is missing, THEN THE Logging_System SHALL display a validation error message stating "[Field name] is required for [exercise type] exercises"
9. IF a required field contains a non-numeric value, THEN THE Logging_System SHALL display a validation error message stating "[Field name] must be a number"
10. IF a required field contains a value outside the valid range, THEN THE Logging_System SHALL display a validation error message stating "[Field name] must be between [min] and [max] [unit]"
11. IF a required field contains zero or a negative value, THEN THE Logging_System SHALL display a validation error message stating "[Field name] must be greater than zero"
12. WHEN validation fails, THE Logging_System SHALL prevent submission of the exercise log
13. WHEN validation fails, THE Logging_System SHALL retain all user-entered data in the input fields
14. WHEN validation fails, THE Logging_System SHALL keep the logging form editable so the user can correct the errors
15. WHEN all required fields pass validation, THE Logging_System SHALL allow the exercise log to be submitted

### Requirement 7: Support Custom Exercise Creation

**User Story:** As a user, I want to create custom exercises with specific logging requirements, so that I can track specialized movements not in the default list.

#### Acceptance Criteria

1. WHEN a user initiates custom exercise creation, THE Configuration_Manager SHALL display a selection interface listing all available exercise types: time-based, rep-based, distance-based, weight-based, and combination types
2. WHEN a user selects an exercise type during custom exercise creation, THE Configuration_Manager SHALL store the selected exercise type with the exercise definition
3. WHEN a user cancels custom exercise creation after selecting a type, THE Configuration_Manager SHALL discard the selection and not create any exercise definition
4. IF a user attempts to create a custom exercise without selecting an exercise type, THEN THE Configuration_Manager SHALL display a validation error stating "Exercise type is required"
5. IF a user attempts to create a custom exercise with a name that already exists, THEN THE Configuration_Manager SHALL display a validation error stating "Exercise name already exists"
6. IF the Configuration_Manager fails to store a custom exercise definition, THEN THE Configuration_Manager SHALL display an error message stating "Failed to save custom exercise" and retain the user's input for retry
7. THE Configuration_Manager SHALL apply the same input field display rules to custom exercises as it applies to default exercises based on their exercise type
8. WHEN a custom exercise is logged, THE User_Interface SHALL display the appropriate input fields based on its configured exercise type

### Requirement 8: Maintain Backward Compatibility

**User Story:** As a user with existing workout logs, I want my historical data to remain accessible, so that I don't lose my progress tracking.

#### Acceptance Criteria

1. WHEN the system is upgraded, THE Logging_System SHALL retain all field values from existing exercise logs without modification
2. WHEN the system is upgraded, THE Logging_System SHALL verify data preservation by confirming that the count of exercise log records before and after upgrade is identical
3. WHEN an existing exercise log is viewed, THE Logging_System SHALL display all logged fields with their original values regardless of the current exercise type configuration
4. IF an existing exercise log contains a field name that is no longer recognized, THEN THE Logging_System SHALL display the field using its original name
5. IF an existing exercise has no type classification, THEN THE Configuration_Manager SHALL assign a type based on the count of logged fields: 1 field implies time-based or rep-based, 2 fields implies distance-based or weight-based, 3+ fields implies combination type
6. WHEN a legacy exercise log is selected for editing, THE Logging_System SHALL allow the user to view, edit, and delete the log entry
7. WHEN a legacy exercise log is edited and saved, THE Logging_System SHALL validate the edited data using the current exercise type rules
8. IF a legacy exercise log contains corrupted or unparseable data, THEN THE Logging_System SHALL display an error message stating "Unable to load exercise log data" and log the error for debugging

