# Email Notification System - Implementation Guide

## Overview

This system provides comprehensive email notifications for all major events in the Anza platform. All email templates have been implemented in `/utils/send_email.js` with the following events covered:

## Implemented Email Notifications

### 1. User Registration Confirmation ✅

**Status:** `email_confirmation`
**When:** User registers on the platform
**Already integrated in:** `modules/user/user.controller.js` (registerUser function)
**Usage:**

```javascript
sendEmail(req, res, user, "email_confirmation");
```

### 2. Mentor Outreach to Founder ✅

**Status:** `mentor_outreach_to_startup`
**When:** Mentor accepts/initiates mentorship with a startup
**Integrated in:** `modules/mentorshipApplications/mentorshipApplications.controllers.js` (updateMentorshipApplication function)
**Usage:**

```javascript
await sendEmail(req, res, entrepreneur, "mentor_outreach_to_startup", {
  mentorName: mentor.name,
  mentorBio: mentorProfile?.bio || "Experienced mentor",
  expertise: mentorProfile?.expertise || "Business development",
});
```

### 3. Founder Outreach to Mentor ✅

**Status:** `startup_outreach_to_mentor`
**When:** Startup requests mentorship from a mentor
**Integrated in:** `modules/mentorshipApplications/mentorshipApplications.controllers.js` (createMentorshipApplication function)
**Usage:**

```javascript
await sendEmail(req, res, mentor, "startup_outreach_to_mentor", {
  startupName: req.user.name,
  startupBio: startupBusiness?.description || "Emerging startup",
  challenges: challenges || "N/A",
  mentorshipAreas: mentorshipAreas.join(", ") || "N/A",
});
```

### 4. Session Scheduling and Confirmation ✅

**Status:** `session_scheduled` and `session_confirmed`
**When:** Mentor schedules a session / Startup confirms session
**Integrated in:** `modules/mentorshipApplications/mentorshipApplications.controllers.js` (setupMeeting and acceptAppointment functions)
**Usage:**

```javascript
// When scheduling
await sendEmail(req, res, entrepreneur, "session_scheduled", {
  sessionDate: new Date(appointmentDate).toLocaleString(),
  mode: "Virtual",
  withPerson: mentor.name,
  meetingLink: googleMeetLink,
});

// When confirming
await sendEmail(req, res, mentor, "session_confirmed", {
  confirmedBy: entrepreneur.name,
  sessionDate: new Date(appointmentDate).toLocaleString(),
});
```

### 5. Post Session Follow Up ✅

**Status:** `session_followup`
**When:** After a mentorship session/report is submitted
**Integrated in:** `modules/mentor_reports/mentorReports.controllers.js` (createMentorReport function)
**Usage:**

```javascript
await sendEmail(req, res, entrepreneur, "session_followup", {
  sessionDate: new Date(meetingDate).toLocaleDateString(),
});
```

### 6. Investor Interest or Connection Request ✅

**Status:** `investor_interest`
**When:** Investor shows interest in a startup
**Integrated in:** `modules/investmentApplications/investmentApplications.controllers.js` (investorShowInterest function)
**Usage:**

```javascript
await sendEmail(req, res, entrepreneur, "investor_interest", {
  investorName: investor.name,
  investmentFocus: "Strategic investment opportunities",
});
```

### 7. Startup Interest to Investor ✅

**Status:** `startup_interest_to_investor`
**When:** Startup submits investment request to investor
**Integrated in:** `modules/investmentApplications/investmentApplications.controllers.js` (createInvestmentApplication function)
**Usage:**

```javascript
await sendEmail(req, res, investor, "startup_interest_to_investor", {
  startupName: req.user.name,
  businessName: business?.name || req.user.name,
  sector: business?.sector || "N/A",
  amount: amount ? `$${amount}` : "To be discussed",
});
```

### 8. Admin Invitation to Join the Platform ✅

**Status:** `admin_platform_invitation`
**When:** Admin invites someone to join Anza
**Integrated in:** `modules/user/user.controller.js` (inviteUser function)
**Usage:**

```javascript
await sendEmail(req, res, user, "admin_platform_invitation", {
  recipientName: name || "there",
  invitedBy: req.user?.name || "Anza Admin",
  inviteCode: inviteCode,
});
```

### 9. Role or Permission Change Notification ✅

**Status:** `role_changed` and `permission_changed`
**When:** Admin changes user's role or permissions
**Integrated in:** `modules/user/user.controller.js` (updateUser function)
**Usage:**

```javascript
// Role change
await sendEmail(req, res, user, "role_changed", {
  oldRole: oldRole,
  newRole: newRole,
  reason: req.body.roleChangeReason || "Administrative action",
});

// Permission change
await sendEmail(req, res, user, "permission_changed", {
  changes: "Permissions updated by administrator",
});
```

### 10. Policy Compliance or Terms Update Notification ✅

**Status:** `policy_update` and `compliance_reminder`
**When:** Platform policies are updated or compliance action needed
**Helper functions available in:** `utils/notification_helpers.js`
**Usage:**

```javascript
const {
  notifyPolicyUpdate,
  notifyComplianceReminder,
} = require("../../utils/notification_helpers");

// Policy update to all users
await notifyPolicyUpdate(req, res);

// Policy update to specific role
await notifyPolicyUpdate(req, res, "Enterprenuer");

// Compliance reminder to specific user
await notifyComplianceReminder(req, res, {
  userId: user.id,
  action: "Complete KYC verification",
  deadline: "2026-03-01",
  details: "Please upload required documents",
});
```

### 11. Task Assignment to Staff ✅

**Status:** `task_assigned`
**When:** Admin assigns a task to staff member
**Helper function available in:** `utils/notification_helpers.js`
**Usage:**

```javascript
const { notifyTaskAssignment } = require("../../utils/notification_helpers");

await notifyTaskAssignment(req, res, {
  staffUserId: staffMember.id,
  taskTitle: "Review Investment Application",
  taskType: "Investment Review",
  priority: "High",
  dueDate: "2026-02-20",
  description: "Review and approve investment request #123",
  taskId: task.uuid,
});
```

### 12. Task Completion Notification to Admin ✅

**Status:** `task_completed`
**When:** Staff completes an assigned task
**Helper function available in:** `utils/notification_helpers.js`
**Usage:**

```javascript
const { notifyTaskCompletion } = require("../../utils/notification_helpers");

// Notify specific admin
await notifyTaskCompletion(req, res, {
  adminUserId: admin.id,
  taskTitle: "Investment Review",
  completedBy: staffMember.name,
  completionDate: new Date().toLocaleDateString(),
  completionNotes: "Application approved",
  taskId: task.uuid,
});

// Notify all admins
await notifyTaskCompletion(req, res, {
  taskTitle: "Investment Review",
  completedBy: staffMember.name,
  taskId: task.uuid,
});
```

## Integration Examples

### Example 1: Task Assignment in Review Module

```javascript
// In modules/application_review/application_review.controller.js
const { notifyTaskAssignment } = require("../../utils/notification_helpers");

const assignReviewer = async (req, res) => {
  // ... existing code ...

  // After assignment
  await notifyTaskAssignment(req, res, {
    staffUserId: reviewer.id,
    taskTitle: `Review ${applicationType} Application`,
    taskType: "Application Review",
    priority: "Normal",
    dueDate: dueDate,
    description: `Please review ${applicant.name}'s application`,
    taskId: application.uuid,
  });
};
```

### Example 2: Policy Update Announcement

```javascript
// Create a new endpoint in modules/admin/admin.controller.js
const announcePolicyUpdate = async (req, res) => {
  const { notifyPolicyUpdate } = require("../../utils/notification_helpers");

  try {
    // Send to all users or specific role
    await notifyPolicyUpdate(req, res, req.body.targetRole);

    successResponse(res, { message: "Policy update sent to all users" });
  } catch (error) {
    errorResponse(res, error);
  }
};
```

### Example 3: Task Completion

```javascript
// In any module where tasks are completed
const completeTask = async (req, res) => {
  const { notifyTaskCompletion } = require("../../utils/notification_helpers");

  // ... complete the task ...

  await notifyTaskCompletion(req, res, {
    taskTitle: task.title,
    completedBy: req.user.name,
    completionNotes: req.body.notes,
    taskId: task.uuid,
  });
};
```

## Email Configuration

Ensure your `.env` file has the following variables:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-specific-password
```

## Testing

To test emails in development:

1. Use a test email service like Mailtrap
2. Update the transporter configuration in `utils/mail_controller.js`
3. Send test emails to verify templates

## Notes

- All emails use the EJS template in `utils/email_template.ejs`
- Email sending is non-blocking (async)
- Failed emails are logged but don't break the main flow
- All user-facing text can be customized in the templates
- Links point to production URL - update for different environments

## Future Enhancements

Consider adding:

- Email preference management for users
- Unsubscribe functionality
- Email tracking/analytics
- Scheduled/batch email sending
- SMS notifications for critical events
