# Admin Quiz Management API Documentation

## Admin Endpoints for Quiz Marking and Review

These endpoints allow administrators to view all quiz submissions and manually grade description-type questions.

---

## Admin Endpoints

### 1. Get All Quiz Attempts

**GET** `/quiz/admin/attempts`

Retrieves all quiz attempts from all users with optional filters.

**Headers:**

```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Query Parameters:**

- `quizUuid` (optional) - Filter by specific quiz
- `moduleId` (optional) - Filter by module
- `userId` (optional) - Filter by specific user
- `submittedOnly` (optional) - Set to "true" to show only submitted attempts

**Example Requests:**

```
GET /quiz/admin/attempts
GET /quiz/admin/attempts?submittedOnly=true
GET /quiz/admin/attempts?moduleId=5
GET /quiz/admin/attempts?quizUuid=123e4567-e89b-12d3-a456-426614174000
GET /quiz/admin/attempts?userId=10&submittedOnly=true
```

**Response:**

```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "uuid": "attempt-uuid",
      "quizId": 1,
      "userId": 5,
      "score": 75.5,
      "totalPoints": 10,
      "earnedPoints": 7,
      "isPassed": true,
      "startedAt": "2024-01-15T10:30:00.000Z",
      "submittedAt": "2024-01-15T10:45:00.000Z",
      "quiz": {
        "uuid": "quiz-uuid",
        "title": "JavaScript Fundamentals Quiz",
        "passingScore": 70,
        "module": {
          "id": 5,
          "title": "JavaScript Basics"
        }
      },
      "user": {
        "uuid": "user-uuid",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "answers": [
        {
          "uuid": "answer-uuid",
          "questionId": 1,
          "optionId": 3,
          "answerText": null,
          "isCorrect": true,
          "pointsEarned": 1,
          "feedback": null,
          "question": {
            "uuid": "question-uuid",
            "questionText": "What is a closure?",
            "questionType": "multiple_choice",
            "points": 1
          },
          "option": {
            "uuid": "option-uuid",
            "optionText": "A function with access to parent scope",
            "isCorrect": true
          }
        },
        {
          "uuid": "answer-uuid-2",
          "questionId": 2,
          "optionId": null,
          "answerText": "Hoisting is JavaScript's default behavior...",
          "isCorrect": null,
          "pointsEarned": 0,
          "feedback": null,
          "question": {
            "uuid": "question-uuid-2",
            "questionText": "Explain hoisting",
            "questionType": "description",
            "points": 5
          },
          "option": null
        }
      ]
    }
  ]
}
```

---

### 2. Get Attempt Details

**GET** `/quiz/admin/attempts/:attemptUuid`

Retrieves detailed information about a specific quiz attempt including all questions, answers, and correct options.

**Headers:**

```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uuid": "attempt-uuid",
    "score": 75.5,
    "totalPoints": 10,
    "earnedPoints": 7,
    "isPassed": true,
    "startedAt": "2024-01-15T10:30:00.000Z",
    "submittedAt": "2024-01-15T10:45:00.000Z",
    "quiz": {
      "uuid": "quiz-uuid",
      "title": "JavaScript Fundamentals Quiz",
      "passingScore": 70,
      "module": {
        "title": "JavaScript Basics"
      },
      "questions": [
        {
          "uuid": "question-uuid",
          "questionText": "What is a closure?",
          "questionType": "multiple_choice",
          "points": 1,
          "options": [
            {
              "uuid": "option-uuid-1",
              "optionText": "A function with access to parent scope",
              "isCorrect": true
            },
            {
              "uuid": "option-uuid-2",
              "optionText": "A data type",
              "isCorrect": false
            }
          ]
        }
      ]
    },
    "user": {
      "uuid": "user-uuid",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john@example.com"
    },
    "answers": [
      {
        "uuid": "answer-uuid",
        "answerText": "Hoisting is when variable declarations...",
        "isCorrect": null,
        "pointsEarned": 0,
        "feedback": null,
        "question": {
          "uuid": "question-uuid",
          "questionText": "Explain hoisting",
          "questionType": "description",
          "points": 5,
          "options": []
        },
        "option": null
      }
    ]
  }
}
```

---

### 3. Mark Description Answer

**PATCH** `/quiz/admin/answers/:answerUuid/mark`

Manually grades a description-type answer. Automatically recalculates the attempt score and pass/fail status.

**Headers:**

```json
{
  "Authorization": "Bearer <admin-token>",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "isCorrect": true,
  "pointsEarned": 5,
  "feedback": "Excellent explanation of hoisting. You covered all key points."
}
```

**Body Parameters:**

- `isCorrect` (required) - Boolean indicating if answer is correct
- `pointsEarned` (optional) - Number of points to award (defaults to full question points if correct, 0 if incorrect)
- `feedback` (optional) - Text feedback for the student

**Response:**

```json
{
  "success": true,
  "message": "Answer marked successfully",
  "data": {
    "answer": {
      "uuid": "answer-uuid",
      "questionId": 2,
      "answerText": "Hoisting is...",
      "isCorrect": true,
      "pointsEarned": 5,
      "feedback": "Excellent explanation of hoisting. You covered all key points."
    },
    "updatedScore": {
      "score": 85.5,
      "totalPoints": 10,
      "earnedPoints": 8,
      "isPassed": true
    }
  }
}
```

**Notes:**

- Only description-type questions can be manually marked
- Multiple choice and true/false are auto-graded
- Cannot mark answers for unsubmitted attempts
- Score is recalculated automatically after marking

---

### 4. Bulk Mark Answers

**POST** `/quiz/admin/answers/bulk-mark`

Marks multiple description answers in a single request. Useful for grading an entire attempt or multiple attempts efficiently.

**Headers:**

```json
{
  "Authorization": "Bearer <admin-token>",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "answers": [
    {
      "answerUuid": "answer-uuid-1",
      "isCorrect": true,
      "pointsEarned": 5,
      "feedback": "Great answer!"
    },
    {
      "answerUuid": "answer-uuid-2",
      "isCorrect": false,
      "pointsEarned": 0,
      "feedback": "Missing key concepts. Review closure scope."
    },
    {
      "answerUuid": "answer-uuid-3",
      "isCorrect": true,
      "pointsEarned": 4,
      "feedback": "Good answer, minor details missing."
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Answers marked successfully",
  "data": [
    {
      "answerUuid": "answer-uuid-1",
      "success": true,
      "message": "Answer marked successfully"
    },
    {
      "answerUuid": "answer-uuid-2",
      "success": true,
      "message": "Answer marked successfully"
    },
    {
      "answerUuid": "answer-uuid-3",
      "success": true,
      "message": "Answer marked successfully"
    }
  ]
}
```

**Notes:**

- Scores are recalculated for all affected attempts after marking
- Invalid answers are skipped with error messages in the response
- All valid answers are processed even if some fail

---

## Workflow for Admin Quiz Review

### Step 1: View All Submitted Quizzes

```bash
GET /quiz/admin/attempts?submittedOnly=true
```

This shows all completed quizzes from all users.

### Step 2: Filter by Module or Quiz

```bash
GET /quiz/admin/attempts?moduleId=5&submittedOnly=true
```

Focus on specific modules or courses.

### Step 3: Review Specific Attempt

```bash
GET /quiz/admin/attempts/:attemptUuid
```

Get detailed view with all questions and answers.

### Step 4: Identify Unmarked Description Answers

Look for answers where:

- `questionType` = "description"
- `isCorrect` = null
- `submittedAt` is not null

### Step 5: Mark Description Answers

Single answer:

```bash
PATCH /quiz/admin/answers/:answerUuid/mark
Body: { "isCorrect": true, "pointsEarned": 5, "feedback": "..." }
```

Or bulk mark:

```bash
POST /quiz/admin/answers/bulk-mark
Body: { "answers": [...] }
```

### Step 6: Verify Updated Score

Check the `updatedScore` in the response or re-fetch the attempt to see the new pass/fail status.

---

## Important Notes

1. **Auto-Grading**: Multiple choice and true/false questions are graded automatically when submitted
2. **Manual Grading**: Description questions require admin review and marking
3. **Score Recalculation**: Scores are automatically recalculated after marking description answers
4. **Partial Credit**: Admins can award partial points by specifying `pointsEarned`
5. **Feedback**: Optional feedback helps students understand their mistakes
6. **Pass/Fail Status**: Automatically updated based on recalculated score vs. passing score
7. **Certificates**: Users can only download certificates after passing (score >= passingScore)

---

## Error Responses

### 404 - Not Found

```json
{
  "success": false,
  "message": "Answer not found"
}
```

### 400 - Bad Request

```json
{
  "success": false,
  "message": "Only description answers can be manually marked"
}
```

```json
{
  "success": false,
  "message": "Cannot mark answers for unsubmitted attempts"
}
```

### 500 - Server Error

```json
{
  "success": false,
  "message": "Error marking answer",
  "error": "Detailed error message"
}
```

---

## Database Updates

A new migration was added to support admin feedback:

**Migration:** `20251129000006-add-feedback-to-quiz-answers.js`

- Adds `feedback` column to `QuizAnswers` table
- Type: TEXT, nullable
- Used to store admin comments on description answers

Run migration:

```bash
npx sequelize-cli db:migrate
```

---

## Example Use Cases

### Use Case 1: Grade All Submissions for a Module

```javascript
// 1. Get all submitted attempts for module
GET /quiz/admin/attempts?moduleId=5&submittedOnly=true

// 2. For each attempt with unmarked description questions, mark them
PATCH /quiz/admin/answers/:answerUuid/mark
{
  "isCorrect": true,
  "pointsEarned": 5,
  "feedback": "Great work!"
}
```

### Use Case 2: Review Specific User's Progress

```javascript
// Get all attempts by user
GET /quiz/admin/attempts?userId=10

// Review and mark their description answers
POST /quiz/admin/answers/bulk-mark
{
  "answers": [...]
}
```

### Use Case 3: Monitor Ungraded Submissions

```javascript
// Get all submitted but ungraded attempts
GET /quiz/admin/attempts?submittedOnly=true

// Filter client-side for answers where isCorrect === null
// Mark those description answers
```

---

## API Summary Table

| Method | Endpoint                               | Purpose                             | Auth Required |
| ------ | -------------------------------------- | ----------------------------------- | ------------- |
| GET    | `/quiz/admin/attempts`                 | View all quiz attempts with filters | Admin         |
| GET    | `/quiz/admin/attempts/:attemptUuid`    | Get detailed attempt info           | Admin         |
| PATCH  | `/quiz/admin/answers/:answerUuid/mark` | Mark single description answer      | Admin         |
| POST   | `/quiz/admin/answers/bulk-mark`        | Mark multiple answers at once       | Admin         |

---

## Future Enhancements

Potential features to consider:

1. Admin dashboard showing unmarked submission count
2. Email notifications when description answers need grading
3. Rubric support for standardized grading
4. Peer review capabilities
5. Answer quality analytics
6. Automated plagiarism detection for description answers
