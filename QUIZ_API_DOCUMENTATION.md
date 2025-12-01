# Quiz System API Documentation

## Overview

The Quiz System allows creating quizzes for modules, where enrolled users can take quizzes, submit answers, and download certificates upon passing.

## Features

- Create quizzes tied to modules
- Add multiple question types (multiple choice, true/false, description)
- Publish/unpublish quizzes
- Users can start quiz attempts and submit answers
- Automatic grading for multiple choice and true/false
- Download PDF certificates for passed quizzes
- View quiz attempt history

---

## API Endpoints

### Quiz Management

#### 1. Create Quiz

**POST** `/quiz/create`

Creates a new quiz for a module.

**Headers:**

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "moduleId": 1,
  "title": "JavaScript Fundamentals Quiz",
  "description": "Test your knowledge of JavaScript basics",
  "passingScore": 70
}
```

**Response:**

```json
{
  "success": true,
  "message": "Quiz created successfully",
  "data": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "moduleId": 1,
    "title": "JavaScript Fundamentals Quiz",
    "description": "Test your knowledge of JavaScript basics",
    "isPublished": false,
    "passingScore": 70
  }
}
```

---

#### 2. Get Quizzes by Module

**GET** `/quiz/module/:moduleId`

Retrieves all quizzes for a specific module.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "title": "JavaScript Fundamentals Quiz",
      "isPublished": true,
      "questions": [...]
    }
  ]
}
```

---

#### 3. Get Quiz by ID

**GET** `/quiz/:uuid`

Retrieves a single quiz with all questions and options.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "title": "JavaScript Fundamentals Quiz",
    "description": "Test your knowledge",
    "isPublished": true,
    "passingScore": 70,
    "module": {
      "id": 1,
      "title": "JavaScript Basics"
    },
    "questions": [
      {
        "uuid": "question-uuid",
        "questionText": "What is a closure?",
        "questionType": "multiple_choice",
        "points": 1,
        "order": 1,
        "options": [
          {
            "uuid": "option-uuid",
            "optionText": "A function with access to parent scope",
            "isCorrect": true,
            "order": 1
          }
        ]
      }
    ]
  }
}
```

---

#### 4. Update Quiz

**PUT** `/quiz/:uuid`

Updates quiz details.

**Headers:**

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "title": "Updated Quiz Title",
  "description": "Updated description",
  "passingScore": 75
}
```

**Response:**

```json
{
  "success": true,
  "message": "Quiz updated successfully",
  "data": { ... }
}
```

---

#### 5. Publish/Unpublish Quiz

**PATCH** `/quiz/:uuid/publish`

Toggles the published status of a quiz. Cannot publish without questions.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Quiz published successfully",
  "data": {
    "uuid": "...",
    "isPublished": true
  }
}
```

---

#### 6. Delete Quiz

**DELETE** `/quiz/:uuid`

Deletes a quiz and all associated questions, options, attempts, and answers.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Quiz deleted successfully"
}
```

---

### Question Management

#### 7. Add Question

**POST** `/quiz/:quizUuid/questions`

Adds a question to a quiz.

**Headers:**

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Body Examples:**

**Multiple Choice:**

```json
{
  "questionText": "What is the output of console.log(typeof null)?",
  "questionType": "multiple_choice",
  "points": 1,
  "options": [
    {
      "optionText": "object",
      "isCorrect": true
    },
    {
      "optionText": "null",
      "isCorrect": false
    },
    {
      "optionText": "undefined",
      "isCorrect": false
    }
  ]
}
```

**True/False:**

```json
{
  "questionText": "JavaScript is a compiled language",
  "questionType": "true_false",
  "points": 1,
  "options": [
    {
      "optionText": "True",
      "isCorrect": false
    },
    {
      "optionText": "False",
      "isCorrect": true
    }
  ]
}
```

**Description:**

```json
{
  "questionText": "Explain the concept of hoisting in JavaScript",
  "questionType": "description",
  "points": 5
}
```

**Response:**

```json
{
  "success": true,
  "message": "Question added successfully",
  "data": {
    "uuid": "question-uuid",
    "questionText": "...",
    "questionType": "multiple_choice",
    "points": 1,
    "order": 1,
    "options": [...]
  }
}
```

---

#### 8. Update Question

**PUT** `/quiz/questions/:questionUuid`

Updates a question and its options.

**Headers:**

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "questionText": "Updated question text",
  "points": 2,
  "options": [
    {
      "optionText": "Option 1",
      "isCorrect": true
    },
    {
      "optionText": "Option 2",
      "isCorrect": false
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Question updated successfully",
  "data": { ... }
}
```

---

#### 9. Delete Question

**DELETE** `/quiz/questions/:questionUuid`

Deletes a question and all its options.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

---

### Quiz Taking

#### 10. Start Quiz Attempt

**POST** `/quiz/:quizUuid/start`

Starts a new quiz attempt for the authenticated user.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Quiz attempt started",
  "data": {
    "uuid": "attempt-uuid",
    "quizId": 1,
    "userId": 5,
    "startedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### 11. Submit Quiz

**POST** `/quiz/attempts/:attemptUuid/submit`

Submits answers for a quiz attempt. Automatically grades multiple choice and true/false questions.

**Headers:**

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "answers": [
    {
      "questionUuid": "question-uuid-1",
      "optionUuid": "option-uuid-1"
    },
    {
      "questionUuid": "question-uuid-2",
      "optionUuid": "option-uuid-2"
    },
    {
      "questionUuid": "question-uuid-3",
      "answerText": "Hoisting is JavaScript's default behavior of moving declarations to the top..."
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "score": 85.5,
    "totalPoints": 10,
    "earnedPoints": 8,
    "isPassed": true,
    "passingScore": 70
  }
}
```

---

#### 12. Get User Attempts

**GET** `/quiz/attempts/user/:quizUuid?`

Retrieves all quiz attempts for the authenticated user. Optional `quizUuid` parameter filters by specific quiz.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "uuid": "attempt-uuid",
      "score": 85.5,
      "totalPoints": 10,
      "earnedPoints": 8,
      "isPassed": true,
      "startedAt": "2024-01-15T10:30:00.000Z",
      "submittedAt": "2024-01-15T10:45:00.000Z",
      "quiz": {
        "uuid": "quiz-uuid",
        "title": "JavaScript Fundamentals Quiz",
        "module": {
          "title": "JavaScript Basics"
        }
      },
      "answers": [...]
    }
  ]
}
```

---

#### 13. Download Certificate

**GET** `/quiz/attempts/:attemptUuid/certificate`

Downloads a PDF certificate for a passed quiz attempt.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**
PDF file download with certificate

**Requirements:**

- Quiz attempt must be submitted
- User must have passed (score >= passingScore)

**Certificate includes:**

- User's name
- Quiz title
- Module name
- Score percentage
- Completion date

---

## Question Types

### 1. Multiple Choice

- Multiple options, one or more correct
- Requires `options` array with `isCorrect` flag
- Automatically graded

### 2. True/False

- Two options (True/False)
- Requires `options` array with `isCorrect` flag
- Automatically graded

### 3. Description

- Free text answer
- Requires manual grading (isCorrect will be null)
- Store answer in `answerText` field

---

## Database Schema

### Tables Created:

1. **Quizzes** - Quiz metadata (title, description, passing score, published status)
2. **QuizQuestions** - Questions with type, text, points, order
3. **QuizOptions** - Options for multiple choice/true-false questions
4. **QuizAttempts** - User quiz attempts with scores and submission status
5. **QuizAnswers** - Individual answers for each question in an attempt

### Relationships:

- Quiz belongs to Module
- Quiz has many Questions
- Question has many Options
- Quiz has many Attempts
- Attempt belongs to Quiz and User
- Attempt has many Answers
- Answer belongs to Question and Option (for MC/TF)

---

## Migration Instructions

Run the migrations in order:

```bash
cd anzamanagmentbackend
npx sequelize-cli db:migrate
```

Migrations will create tables in this order:

1. Quizzes
2. QuizQuestions
3. QuizOptions
4. QuizAttempts
5. QuizAnswers

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP Status Codes:

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation error)
- **404** - Resource not found
- **500** - Server error

---

## Notes

1. **Authentication Required**: All endpoints require JWT token in Authorization header
2. **User Scoping**: Quiz attempts are scoped to the authenticated user
3. **Automatic Grading**: Only multiple choice and true/false questions are auto-graded
4. **Description Questions**: Require manual grading (future feature)
5. **Certificate Access**: Only available for passed quizzes
6. **Cascading Deletes**: Deleting a quiz removes all associated data
7. **Question Ordering**: Questions maintain order for consistent display
8. **Publishing**: Quizzes must be published before users can attempt them

---

## Example Workflow

1. **Create Quiz**: POST `/quiz/create` with module ID
2. **Add Questions**: POST `/quiz/:quizUuid/questions` for each question
3. **Publish Quiz**: PATCH `/quiz/:uuid/publish`
4. **User Takes Quiz**: POST `/quiz/:quizUuid/start`
5. **User Submits**: POST `/quiz/attempts/:attemptUuid/submit` with answers
6. **Download Certificate**: GET `/quiz/attempts/:attemptUuid/certificate` (if passed)
7. **View History**: GET `/quiz/attempts/user`
