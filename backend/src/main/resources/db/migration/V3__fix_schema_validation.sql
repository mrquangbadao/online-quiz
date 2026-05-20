-- Align legacy column types with current JPA mappings to avoid Hibernate schema-validation failures.

ALTER TABLE exam_answers
    ALTER COLUMN question_type TYPE VARCHAR(2)
    USING question_type::VARCHAR(2);

ALTER TABLE exam_answers
    ALTER COLUMN selected_answer TYPE TEXT
    USING selected_answer::TEXT;

ALTER TABLE questions
    ALTER COLUMN correct_answer TYPE TEXT
    USING correct_answer::TEXT;

ALTER TABLE scenario_questions
    ALTER COLUMN correct_answer TYPE TEXT
    USING correct_answer::TEXT;