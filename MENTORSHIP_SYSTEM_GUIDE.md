# Mentorship System Implementation Guide

## Overview

This document describes the complete mentorship system with Google Meet integration, appointment scheduling, and structured reporting.

## Architecture

### Database Schema

The mentorship system uses three main tables:

1. **MentorshipApplications** - Entrepreneur requests for mentorship
2. **MentorEntreprenuers** - Active mentorship relationships
3. **MentorReports** - Structured mentorship session reports

## Features Implemented

### 1. Entrepreneur Request Mentor ✅

**Endpoint:** `POST /mentorship-applications`

**Request Body:**

```json
{
  "mentor_uuid": "string",
  "challenges": "text",
  "mentorshipAreas": "text",
  "mentorshipModes": "text",
  "availability": "text"
}
```

**Notifications:**

- ✅ Mentor receives notification
- ✅ Admin receives notification

**Frontend Integration:**

- Entrepreneurs can browse mentors and submit applications
- Form includes challenges, mentorship areas, modes, and availability

---

### 2. Admin Assign Mentor to Entrepreneur ✅

**Endpoint:** `POST /mentor-entreprenuer`

**Request Body:**

```json
{
  "mentor_uuid": "string",
  "entreprenuer_uuid": "string"
}
```

**Business Logic:**

- If created by Mentor: `approved = false` (requires admin approval)
- If created by Admin: `approved = true` (automatically approved)

**Notifications:**

- ✅ Mentor receives assignment notification
- ✅ Entrepreneur receives mentor assignment notification

---

### 3. Mentor Receives Request ✅

**Endpoints:**

- `GET /mentor-entreprenuer/mentor/:uuid` - Get all mentees for a mentor
- `GET /mentor-entreprenuer/unapproved/` - Admin view of unapproved relationships

**Response includes:**

- Mentor information
- Entrepreneur information with business details
- Approval status
- Meeting details (if scheduled)

---

### 4. Setup Google Meet Link ✅

**Endpoint:** `POST /mentor-entreprenuer/:uuid/setup-meeting`

**Request Body:**

```json
{
  "googleMeetLink": "https://meet.google.com/xxx-xxxx-xxx",
  "appointmentDate": "2024-12-31T10:00:00Z"
}
```

**Database Fields Added to MentorEntreprenuers:**

- `googleMeetLink` - Google Meet URL
- `appointmentDate` - Scheduled meeting date/time
- `appointmentStatus` - ENUM('pending', 'accepted', 'rejected', 'completed')
- `menteeAccepted` - BOOLEAN (default: false)

**Notifications:**

- ✅ Entrepreneur receives meeting invitation with date

---

### 5. Mentee Get Notification and Accept ✅

**Accept Endpoint:** `POST /mentor-entreprenuer/:uuid/accept-appointment`

**Reject Endpoint:** `POST /mentor-entreprenuer/:uuid/reject-appointment`

**Request Body (for rejection):**

```json
{
  "reason": "string (optional)"
}
```

**Status Flow:**

- Initial: `appointmentStatus = 'pending'`, `menteeAccepted = false`
- Accepted: `appointmentStatus = 'accepted'`, `menteeAccepted = true`
- Rejected: `appointmentStatus = 'rejected'`, `menteeAccepted = false`

**Notifications:**

- ✅ Mentor receives acceptance/rejection notification

---

### 6. Generate Structured Report Form ✅

**Endpoint:** `POST /mentor-reports`

**Request Body (structured form):**

```json
{
  "mentor_uuid": "string",
  "entreprenuer_uuid": "string",
  "title": "string",
  "description": "text",
  "meetingDate": "2024-01-15T10:00:00Z",
  "meetingDuration": "1 hour",
  "topicsDiscussed": "Marketing strategy, product development",
  "progressMade": "Completed market research, launched MVP",
  "challengesFaced": "Limited budget, resource constraints",
  "actionItems": "1. Review pricing model\n2. Hire marketing consultant",
  "nextMeetingDate": "2024-02-15T10:00:00Z",
  "overallProgress": "good",
  "recommendations": "Focus on customer acquisition",
  "file": "multipart/form-data (optional PDF attachment)"
}
```

**New Fields Added to MentorReports:**

- `meetingDate` - When the mentorship session occurred
- `meetingDuration` - How long the session lasted
- `topicsDiscussed` - What was covered in the session
- `progressMade` - Entrepreneur's achievements since last meeting
- `challengesFaced` - Issues encountered
- `actionItems` - Next steps for entrepreneur
- `nextMeetingDate` - When to meet again
- `overallProgress` - ENUM('excellent', 'good', 'satisfactory', 'needs-improvement')
- `recommendations` - Mentor's suggestions

**Notifications:**

- ✅ Entrepreneur receives report notification
- ✅ Admin receives report submission notification

**Report Download:**

- Original file attachment (if uploaded) can be downloaded via `url` field
- All structured data can be exported to PDF on frontend

---

### 7. Complete Meeting ✅

**Endpoint:** `POST /mentor-entreprenuer/:uuid/complete-meeting`

**Purpose:**

- Mark a meeting as completed after it occurs
- Updates `appointmentStatus` to 'completed'

---

## Database Migrations

Run these migrations in order:

```bash
cd anzamanagmentbackend

# 1. Add meeting fields to MentorEntreprenuers
npx sequelize-cli db:migrate --name 20260126000000-add-meeting-fields-to-mentor-entreprenuer.js

# 2. Add structured fields to MentorReports
npx sequelize-cli db:migrate --name 20260126000001-add-structured-fields-to-mentor-reports.js
```

---

## API Routes Summary

### Mentorship Applications

```
POST   /mentorship-applications           - Create application
GET    /mentorship-applications           - Get all applications (paginated)
GET    /mentorship-applications/entreprenuer/:uuid - Get entreprenuer's applications
```

### Mentor-Entreprenuer Relationships

```
POST   /mentor-entreprenuer               - Create relationship (admin assigns)
GET    /mentor-entreprenuer/mentor/:uuid  - Get mentor's mentees
GET    /mentor-entreprenuer/entreprenuer/:uuid - Get entreprenuer's mentors
GET    /mentor-entreprenuer/unapproved    - Get unapproved relationships
PATCH  /mentor-entreprenuer/:uuid         - Update relationship
DELETE /mentor-entreprenuer/:uuid         - Delete relationship
POST   /mentor-entreprenuer/:uuid/setup-meeting - Setup Google Meet
POST   /mentor-entreprenuer/:uuid/accept-appointment - Accept meeting
POST   /mentor-entreprenuer/:uuid/reject-appointment - Reject meeting
POST   /mentor-entreprenuer/:uuid/complete-meeting - Mark as completed
```

### Mentor Reports

```
POST   /mentor-reports                    - Create report (with structured form)
GET    /mentor-reports/mentor/:uuid       - Get mentor's reports
GET    /mentor-reports/entreprenuer/:uuid - Get entreprenuer's reports
GET    /mentor-reports/:uuid              - Get single report
GET    /mentor-reports                    - Get all reports (admin)
DELETE /mentor-reports/:uuid              - Delete report
```

---

## Frontend Integration Guide

### 1. Mentor Dashboard Features

- View assigned mentees
- Setup Google Meet links for each mentee
- Submit structured mentorship reports
- View mentorship history

### 2. Entrepreneur Dashboard Features

- Browse available mentors
- Submit mentorship applications
- View pending applications
- Accept/reject meeting invitations
- View received reports

### 3. Admin Dashboard Features

- View all mentorship applications
- Assign mentors to entrepreneurs
- View all mentorship relationships
- Monitor report submissions
- Analytics on mentorship program

---

## Notification Flow

### Application Submitted

1. Entrepreneur submits application → Mentor notified
2. Entrepreneur submits application → Admin notified

### Mentor Assigned

1. Admin assigns mentor → Mentor notified ("You've been assigned to mentor X")
2. Admin assigns mentor → Entrepreneur notified ("X has been assigned as your mentor")

### Meeting Scheduled

1. Mentor sets up meeting → Entrepreneur notified with date and Google Meet link

### Appointment Response

1. Entrepreneur accepts → Mentor notified
2. Entrepreneur rejects → Mentor notified with reason (if provided)

### Report Submitted

1. Mentor submits report → Entrepreneur notified
2. Mentor submits report → Admin notified

---

## Example Workflows

### Workflow 1: Complete Mentorship Cycle

1. **Entrepreneur** submits mentorship application via form
2. **Admin** reviews application and assigns mentor
3. **Mentor** receives notification, reviews entrepreneur profile
4. **Mentor** schedules meeting with Google Meet link
5. **Entrepreneur** receives notification, accepts appointment
6. **Meeting occurs** via Google Meet
7. **Mentor** fills structured report form with session details
8. **Entrepreneur** views report in dashboard
9. Repeat steps 4-8 for ongoing mentorship

### Workflow 2: Rejection Handling

1. Mentor schedules meeting
2. Entrepreneur cannot attend, rejects with reason
3. Mentor receives rejection notification
4. Mentor reschedules with new date/time
5. Entrepreneur accepts new appointment

---

## Best Practices

### For Mentors

- Schedule meetings at least 48 hours in advance
- Fill all report fields comprehensively
- Set actionable next steps
- Be honest about entrepreneur's progress

### For Entrepreneurs

- Respond to meeting invitations within 24 hours
- Prepare agenda before meetings
- Review mentor reports carefully
- Complete action items before next meeting

### For Admins

- Match mentors and entrepreneurs based on industry/expertise
- Monitor report submission rates
- Follow up on rejected appointments
- Recognize active mentors

---

## Troubleshooting

### Database Connection Issues

If migrations fail with `ETIMEDOUT`, check database config:

```javascript
// config/config.js
{
  development: {
    host: "localhost",
    port: 3306,
    // Increase timeout
    dialectOptions: {
      connectTimeout: 60000
    }
  }
}
```

### Missing Notifications

Ensure Notification model is imported in controllers:

```javascript
const { Notification } = require("../../models");
```

### Google Meet Link Validation

Frontend should validate Google Meet URL format:

```javascript
const isValidGoogleMeetLink = (url) => {
  return /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url);
};
```

---

## Dashboard Cards Issue

The dashboard data endpoint (`GET /admin/dashboard`) returns comprehensive counts. If cards aren't displaying:

1. **Check frontend data mapping:**
   - Ensure card components use correct property names
   - Verify data is not null/undefined before rendering

2. **Common issues:**
   - `pendingBusiness` - Count of businesses with status='waiting'
   - `businessLookingForInvestment` - Count where lookingForInvestment=true
   - `totalProgram` - Total program count
   - Check that frontend is awaiting response properly

3. **Debug dashboard:**

```javascript
// Frontend controller
const response = await axios.get("/admin/dashboard");
console.log("Dashboard data:", response.data);
```

---

## Next Steps

### Frontend Implementation Needed:

1. Create mentor dashboard pages with meeting scheduler
2. Create entrepreneur pages with appointment acceptance
3. Build structured report form with all new fields
4. Add report PDF download/export functionality
5. Create admin mentorship analytics dashboard

### Recommended Enhancements:

1. Email notifications for meeting reminders
2. Calendar integration (Google Calendar, Outlook)
3. Automated report generation templates
4. Mentorship matching algorithm
5. Video call integration directly in platform
6. Progress tracking graphs

---

## Support

For issues or questions:

1. Check migration logs: `anzamanagmentbackend/migrations`
2. Review server logs for error messages
3. Verify all endpoints with Postman/Thunder Client
4. Check notification creation in database

## Version

- Document Version: 1.0
- Last Updated: January 26, 2026
- Backend Version: Updated with Google Meet and structured reports
