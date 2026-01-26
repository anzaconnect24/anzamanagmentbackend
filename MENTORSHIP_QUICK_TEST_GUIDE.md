# Mentorship System - Quick Test Guide

## Before You Start

1. **Run Database Migrations:**

```bash
cd "/Users/john/Documents/anza project/anzamanagmentbackend"
npx sequelize-cli db:migrate
```

This adds:

- Google Meet link field
- Appointment date and status
- Structured report fields

---

## Test Scenario 1: Complete Mentorship Flow

### Step 1: Entrepreneur Submits Application

```bash
POST http://localhost:5001/mentorship-applications
Authorization: Bearer <entrepreneur_token>
Content-Type: application/json

{
  "mentor_uuid": "mentor-uuid-here",
  "challenges": "Need help with marketing strategy",
  "mentorshipAreas": "Marketing, Sales",
  "mentorshipModes": "Virtual meetings",
  "availability": "Weekdays 2-4 PM"
}
```

**Expected Result:**

- ✅ Application created
- ✅ Mentor receives notification
- ✅ Admin receives notification

---

### Step 2: Admin Assigns Mentor

```bash
POST http://localhost:5001/mentor-entreprenuer
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "mentor_uuid": "mentor-uuid-here",
  "entreprenuer_uuid": "entrepreneur-uuid-here"
}
```

**Expected Result:**

- ✅ Relationship created with approved=true
- ✅ Mentor receives "You've been assigned" notification
- ✅ Entrepreneur receives "X is your mentor" notification

---

### Step 3: Mentor Schedules Meeting

```bash
POST http://localhost:5001/mentor-entreprenuer/<relationship-uuid>/setup-meeting
Authorization: Bearer <mentor_token>
Content-Type: application/json

{
  "googleMeetLink": "https://meet.google.com/abc-defg-hij",
  "appointmentDate": "2026-02-15T14:00:00Z"
}
```

**Expected Result:**

- ✅ Meeting scheduled
- ✅ appointmentStatus set to "pending"
- ✅ Entrepreneur receives notification with meeting details

---

### Step 4: Entrepreneur Accepts Meeting

```bash
POST http://localhost:5001/mentor-entreprenuer/<relationship-uuid>/accept-appointment
Authorization: Bearer <entrepreneur_token>
```

**Expected Result:**

- ✅ menteeAccepted set to true
- ✅ appointmentStatus changed to "accepted"
- ✅ Mentor receives acceptance notification

**Alternative - Reject:**

```bash
POST http://localhost:5001/mentor-entreprenuer/<relationship-uuid>/reject-appointment
Authorization: Bearer <entrepreneur_token>
Content-Type: application/json

{
  "reason": "Schedule conflict, please reschedule"
}
```

---

### Step 5: After Meeting - Mentor Submits Report

```bash
POST http://localhost:5001/mentor-reports
Authorization: Bearer <mentor_token>
Content-Type: application/json

{
  "mentor_uuid": "mentor-uuid-here",
  "entreprenuer_uuid": "entrepreneur-uuid-here",
  "title": "Marketing Strategy Session",
  "description": "Discussed digital marketing approaches and customer acquisition",
  "meetingDate": "2026-02-15T14:00:00Z",
  "meetingDuration": "1 hour",
  "topicsDiscussed": "Social media marketing, content strategy, paid ads",
  "progressMade": "Launched Instagram account, created content calendar",
  "challengesFaced": "Limited budget for paid advertising",
  "actionItems": "1. Complete content calendar for next month\n2. Research influencer partnerships\n3. Set up Facebook Business Manager",
  "nextMeetingDate": "2026-03-15T14:00:00Z",
  "overallProgress": "good",
  "recommendations": "Focus on organic growth before investing in paid ads"
}
```

**Expected Result:**

- ✅ Report created with all structured fields
- ✅ Entrepreneur receives report notification
- ✅ Admin receives report notification

---

### Step 6: Mark Meeting as Completed

```bash
POST http://localhost:5001/mentor-entreprenuer/<relationship-uuid>/complete-meeting
Authorization: Bearer <mentor_token>
```

**Expected Result:**

- ✅ appointmentStatus changed to "completed"

---

## Test Scenario 2: View Data

### Get Mentor's Mentees

```bash
GET http://localhost:5001/mentor-entreprenuer/mentor/<mentor-uuid>
Authorization: Bearer <mentor_token>
```

**Should Return:**

- List of all entrepreneurs assigned to this mentor
- Meeting details (Google Meet link, date, status)
- Acceptance status

---

### Get Entrepreneur's Mentors

```bash
GET http://localhost:5001/mentor-entreprenuer/entreprenuer/<entrepreneur-uuid>
Authorization: Bearer <entrepreneur_token>
```

**Should Return:**

- List of assigned mentors
- Meeting invitations with Google Meet links
- Appointment dates and statuses

---

### Get All Reports for Entrepreneur

```bash
GET http://localhost:5001/mentor-reports/entreprenuer/<entrepreneur-uuid>
Authorization: Bearer <entrepreneur_token>
```

**Should Return:**

- All reports submitted for this entrepreneur
- Structured fields:
  - Meeting date and duration
  - Topics discussed
  - Progress made
  - Challenges
  - Action items
  - Overall progress rating
  - Recommendations

---

### Get All Reports for Mentor

```bash
GET http://localhost:5001/mentor-reports/mentor/<mentor-uuid>
Authorization: Bearer <mentor_token>
```

---

### Admin: Get Unapproved Relationships

```bash
GET http://localhost:5001/mentor-entreprenuer/unapproved
Authorization: Bearer <admin_token>
```

**Should Return:**

- All mentor-initiated relationships awaiting admin approval

---

## Notification Checks

### Check Entrepreneur Notifications

```bash
GET http://localhost:5001/notifications
Authorization: Bearer <entrepreneur_token>
```

**Should Include:**

- Mentor assignment
- Meeting invitations
- Report submissions

---

### Check Mentor Notifications

```bash
GET http://localhost:5001/notifications
Authorization: Bearer <mentor_token>
```

**Should Include:**

- New mentorship applications
- Mentor assignments
- Meeting responses (accepted/rejected)

---

### Check Admin Notifications

```bash
GET http://localhost:5001/notifications
Authorization: Bearer <admin_token>
```

**Should Include:**

- New mentorship applications
- Report submissions

---

## Dashboard Test

```bash
GET http://localhost:5001/admin/dashboard
Authorization: Bearer <any_authenticated_user_token>
```

**Should Return:**

```json
{
  "totalUsers": number,
  "enterprenuers": number,
  "investors": number,
  "mentors": number,
  "pendingBusiness": number,
  "businessLookingForInvestment": number,
  "videos": number,
  "documents": number,
  "reviewers": number,
  "admins": number,
  "totalProgram": number,
  ...other fields
}
```

**If Cards Don't Show:**

1. Check frontend Dashboard.jsx file
2. Verify data property names match
3. Check for null checks before rendering

---

## Common Test Issues

### Issue: "Cannot read property 'id' of null"

**Cause:** UUID doesn't exist in database
**Solution:** Use actual UUIDs from your database

### Issue: "Unauthorized"

**Cause:** Invalid or missing JWT token
**Solution:** Login first and use the returned token

### Issue: "Migration pending"

**Cause:** Migrations not run
**Solution:** Run `npx sequelize-cli db:migrate`

### Issue: Notifications not appearing

**Cause:** Notification model not imported
**Solution:** Check that controllers import `{ Notification }`

---

## Quick UUID Lookup

### Get Mentor UUID:

```bash
GET http://localhost:5001/users
Authorization: Bearer <admin_token>
```

Filter for role="Mentor"

### Get Entrepreneur UUID:

```bash
GET http://localhost:5001/users
Authorization: Bearer <admin_token>
```

Filter for role="Enterprenuer"

### Get Relationship UUID:

```bash
GET http://localhost:5001/mentor-entreprenuer/mentor/<mentor-uuid>
Authorization: Bearer <mentor_token>
```

Use the `uuid` field from response

---

## Test Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Mentorship System Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Submit Mentorship Application",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/mentorship-applications",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{entrepreneur_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"mentor_uuid\": \"{{mentor_uuid}}\",\n  \"challenges\": \"Need marketing help\",\n  \"mentorshipAreas\": \"Marketing\",\n  \"mentorshipModes\": \"Virtual\",\n  \"availability\": \"Weekdays 2-4 PM\"\n}"
        }
      }
    },
    {
      "name": "2. Admin Assign Mentor",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/mentor-entreprenuer",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"mentor_uuid\": \"{{mentor_uuid}}\",\n  \"entreprenuer_uuid\": \"{{entrepreneur_uuid}}\"\n}"
        }
      }
    },
    {
      "name": "3. Setup Meeting",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/mentor-entreprenuer/{{relationship_uuid}}/setup-meeting",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{mentor_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"googleMeetLink\": \"https://meet.google.com/abc-defg-hij\",\n  \"appointmentDate\": \"2026-02-15T14:00:00Z\"\n}"
        }
      }
    },
    {
      "name": "4. Accept Appointment",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/mentor-entreprenuer/{{relationship_uuid}}/accept-appointment",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{entrepreneur_token}}"
          }
        ]
      }
    },
    {
      "name": "5. Submit Report",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/mentor-reports",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{mentor_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"mentor_uuid\": \"{{mentor_uuid}}\",\n  \"entreprenuer_uuid\": \"{{entrepreneur_uuid}}\",\n  \"title\": \"Session 1\",\n  \"meetingDate\": \"2026-02-15T14:00:00Z\",\n  \"meetingDuration\": \"1 hour\",\n  \"topicsDiscussed\": \"Marketing strategy\",\n  \"progressMade\": \"Launched campaign\",\n  \"challengesFaced\": \"Budget constraints\",\n  \"actionItems\": \"Review analytics\",\n  \"overallProgress\": \"good\",\n  \"recommendations\": \"Focus on ROI\"\n}"
        }
      }
    }
  ]
}
```

**Environment Variables:**

- `baseUrl`: http://localhost:5001
- `admin_token`: <from login>
- `mentor_token`: <from login>
- `entrepreneur_token`: <from login>
- `mentor_uuid`: <from users list>
- `entrepreneur_uuid`: <from users list>
- `relationship_uuid`: <from create relationship response>

---

## Success Criteria

✅ All endpoints return 200 OK
✅ Notifications created in database
✅ Database fields populated correctly
✅ Frontend can display all data
✅ Google Meet links are clickable
✅ Appointment flow works end-to-end
✅ Reports contain all structured data

---

## Next Steps After Testing

1. Build frontend forms
2. Add email notifications
3. Create report PDF export
4. Build mentorship analytics
5. Add calendar integration

---

**Happy Testing! 🚀**
