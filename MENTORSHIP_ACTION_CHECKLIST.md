# ✅ Mentorship System - Action Checklist

## Immediate Actions (Do Now)

### 1. Run Database Migrations ⚠️ REQUIRED

```bash
cd "/Users/john/Documents/anza project/anzamanagmentbackend"
npx sequelize-cli db:migrate
```

**What this does:**

- Adds Google Meet link field to MentorEntreprenuers
- Adds appointment date and status fields
- Adds 9 structured fields to MentorReports

**Expected Output:**

```
== 20260126000000-add-meeting-fields-to-mentor-entreprenuer: migrating =======
== 20260126000000-add-meeting-fields-to-mentor-entreprenuer: migrated (0.XXXs)
== 20260126000001-add-structured-fields-to-mentor-reports: migrating =======
== 20260126000001-add-structured-fields-to-mentor-reports: migrated (0.XXXs)
```

---

### 2. Test Backend Endpoints

#### Test 1: Setup Meeting

```bash
# Use Postman or Thunder Client
POST http://localhost:5001/mentor-entreprenuer/<uuid>/setup-meeting
Authorization: Bearer <mentor_token>
Content-Type: application/json

{
  "googleMeetLink": "https://meet.google.com/abc-defg-hij",
  "appointmentDate": "2026-02-15T14:00:00Z"
}
```

- [ ] Returns 200 OK
- [ ] Creates notification for entrepreneur
- [ ] Updates database with meeting details

#### Test 2: Accept Appointment

```bash
POST http://localhost:5001/mentor-entreprenuer/<uuid>/accept-appointment
Authorization: Bearer <entrepreneur_token>
```

- [ ] Returns 200 OK
- [ ] Creates notification for mentor
- [ ] Updates appointmentStatus to "accepted"

#### Test 3: Submit Structured Report

```bash
POST http://localhost:5001/mentor-reports
Authorization: Bearer <mentor_token>
Content-Type: application/json

{
  "mentor_uuid": "<uuid>",
  "entreprenuer_uuid": "<uuid>",
  "title": "Session 1",
  "meetingDate": "2026-02-15T14:00:00Z",
  "meetingDuration": "1 hour",
  "topicsDiscussed": "Marketing",
  "progressMade": "Launched campaign",
  "challengesFaced": "Budget",
  "actionItems": "Review analytics",
  "overallProgress": "good",
  "recommendations": "Focus on ROI"
}
```

- [ ] Returns 200 OK
- [ ] All structured fields saved
- [ ] Creates notifications

---

## Frontend Development (Next Steps)

### Priority 1: Mentor Pages

#### Create: ScheduleMeeting.jsx

**Location:** `anzamanagementsystem/src/pages/mentor/ScheduleMeeting.jsx`

**Required Components:**

- [ ] Google Meet link input field
- [ ] Date/time picker (use react-datepicker)
- [ ] Mentee selector dropdown
- [ ] Submit button
- [ ] Success/error toast notifications

**API Integration:**

```javascript
import axios from "axios";

const setupMeeting = async (relationshipUuid, meetingData) => {
  const response = await axios.post(
    `/mentor-entreprenuer/${relationshipUuid}/setup-meeting`,
    meetingData,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
};
```

---

#### Create: SubmitMentorshipReport.jsx

**Location:** `anzamanagementsystem/src/pages/mentor/SubmitMentorshipReport.jsx`

**Required Form Fields:**

- [ ] Title (text input)
- [ ] Meeting Date (date picker)
- [ ] Meeting Duration (dropdown: 30min, 1hr, 1.5hr, 2hr)
- [ ] Topics Discussed (textarea)
- [ ] Progress Made (textarea)
- [ ] Challenges Faced (textarea)
- [ ] Action Items (textarea)
- [ ] Next Meeting Date (date picker)
- [ ] Overall Progress (radio buttons: excellent, good, satisfactory, needs-improvement)
- [ ] Recommendations (textarea)
- [ ] File Attachment (optional file upload)
- [ ] Submit button

**Form Validation:**

```javascript
const validateReportForm = (formData) => {
  const errors = {};

  if (!formData.title) errors.title = "Title is required";
  if (!formData.meetingDate) errors.meetingDate = "Meeting date is required";
  if (!formData.overallProgress)
    errors.overallProgress = "Progress rating is required";

  return Object.keys(errors).length === 0 ? null : errors;
};
```

---

### Priority 2: Entrepreneur Pages

#### Create: MeetingInvitations.jsx

**Location:** `anzamanagementsystem/src/pages/entrepreneur/MeetingInvitations.jsx`

**Required Components:**

- [ ] List of pending meeting invitations
- [ ] Display: Mentor name, Meeting date/time, Google Meet link
- [ ] Accept button (green)
- [ ] Reject button (red) with reason modal
- [ ] Meeting status badges (pending/accepted/rejected)

**API Integration:**

```javascript
const acceptMeeting = async (relationshipUuid) => {
  await axios.post(
    `/mentor-entreprenuer/${relationshipUuid}/accept-appointment`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
};

const rejectMeeting = async (relationshipUuid, reason) => {
  await axios.post(
    `/mentor-entreprenuer/${relationshipUuid}/reject-appointment`,
    { reason },
    { headers: { Authorization: `Bearer ${token}` } },
  );
};
```

---

#### Create: ViewMentorshipReports.jsx

**Location:** `anzamanagementsystem/src/pages/entrepreneur/ViewMentorshipReports.jsx`

**Required Components:**

- [ ] List of all reports
- [ ] Filter by mentor
- [ ] Sort by date
- [ ] Report card displaying:
  - Title
  - Meeting date
  - Overall progress badge
  - Topics discussed summary
  - Action items list
  - Download PDF button
- [ ] Expand/collapse report details

---

### Priority 3: Admin Pages

#### Fix: Dashboard.jsx

**Location:** `anzamanagementsystem/src/pages/admin/Dashboard.jsx`

**Debugging Steps:**

```javascript
// Add console logs to check data
const fetchDashboardData = async () => {
  try {
    const response = await axios.get("/admin/dashboard");
    console.log("Dashboard data:", response.data);
    setDashboardData(response.data);
  } catch (error) {
    console.error("Dashboard error:", error);
  }
};
```

**Common Fixes Needed:**

- [ ] Check property name mapping (e.g., `pendingBusiness` vs `pendingBusinesses`)
- [ ] Add null checks: `{dashboardData?.totalUsers || 0}`
- [ ] Verify card components receive correct props
- [ ] Check loading states

---

#### Create: MentorshipAnalytics.jsx

**Location:** `anzamanagementsystem/src/pages/admin/MentorshipAnalytics.jsx`

**Required Metrics:**

- [ ] Total mentorship relationships
- [ ] Active meetings this month
- [ ] Reports submitted this month
- [ ] Average session duration
- [ ] Top performing mentors (by report count)
- [ ] Progress distribution chart (excellent/good/satisfactory/needs-improvement)

---

## Routing Updates

### Add Routes to App.jsx

**Location:** `anzamanagementsystem/src/App.jsx`

```javascript
// Mentor routes
<Route path="/mentor/schedule-meeting" element={<ScheduleMeeting />} />
<Route path="/mentor/submit-report" element={<SubmitMentorshipReport />} />
<Route path="/mentor/dashboard" element={<MentorDashboard />} />

// Entrepreneur routes
<Route path="/entrepreneur/meeting-invitations" element={<MeetingInvitations />} />
<Route path="/entrepreneur/mentorship-reports" element={<ViewMentorshipReports />} />

// Admin routes
<Route path="/admin/mentorship-analytics" element={<MentorshipAnalytics />} />
```

---

### Add Sidebar Links

**For Mentors:**

```javascript
{
  title: "Schedule Meeting",
  icon: <CalendarIcon />,
  path: "/mentor/schedule-meeting"
},
{
  title: "Submit Report",
  icon: <DocumentIcon />,
  path: "/mentor/submit-report"
}
```

**For Entrepreneurs:**

```javascript
{
  title: "Meeting Invitations",
  icon: <MailIcon />,
  path: "/entrepreneur/meeting-invitations",
  badge: pendingInvitationsCount
},
{
  title: "Mentorship Reports",
  icon: <FileTextIcon />,
  path: "/entrepreneur/mentorship-reports"
}
```

---

## UI/UX Recommendations

### Design Patterns to Use:

#### 1. Meeting Invitation Card

```jsx
<Card className="meeting-invitation">
  <div className="meeting-header">
    <Avatar src={mentor.image} />
    <div>
      <h3>{mentor.name}</h3>
      <Badge color="yellow">Pending</Badge>
    </div>
  </div>
  <div className="meeting-details">
    <ClockIcon /> {formatDate(appointmentDate)}
    <LinkIcon />
    <a href={googleMeetLink} target="_blank">
      Join Google Meet
    </a>
  </div>
  <div className="meeting-actions">
    <Button onClick={handleAccept} color="green">
      Accept
    </Button>
    <Button onClick={handleReject} color="red">
      Reject
    </Button>
  </div>
</Card>
```

#### 2. Report Progress Badge

```jsx
const ProgressBadge = ({ progress }) => {
  const colors = {
    excellent: "green",
    good: "blue",
    satisfactory: "yellow",
    "needs-improvement": "red",
  };

  return <Badge color={colors[progress]}>{progress.replace("-", " ")}</Badge>;
};
```

#### 3. Report Form Sections

```jsx
<Form>
  <Section title="Meeting Details">
    <DatePicker label="Meeting Date" />
    <Select label="Duration" />
  </Section>

  <Section title="Session Content">
    <Textarea label="Topics Discussed" />
    <Textarea label="Progress Made" />
  </Section>

  <Section title="Next Steps">
    <Textarea label="Action Items" />
    <DatePicker label="Next Meeting" />
  </Section>

  <Section title="Assessment">
    <RadioGroup label="Overall Progress" options={progressOptions} />
    <Textarea label="Recommendations" />
  </Section>
</Form>
```

---

## Testing Checklist

### Backend Testing

- [ ] Migrations run successfully
- [ ] All new endpoints return 200 OK
- [ ] Notifications created in database
- [ ] Database fields populated correctly
- [ ] No server errors in console

### Frontend Testing

- [ ] All forms submit successfully
- [ ] Data displays correctly
- [ ] Notifications appear in UI
- [ ] Google Meet links are clickable
- [ ] Date/time pickers work
- [ ] File uploads work
- [ ] Mobile responsive

### Integration Testing

- [ ] Complete flow: Application → Assignment → Meeting → Report
- [ ] Notifications appear in real-time
- [ ] Dashboard cards update
- [ ] Reports can be downloaded
- [ ] Meeting status updates correctly

---

## Performance Checklist

- [ ] Add loading states to all API calls
- [ ] Implement error boundaries
- [ ] Add form validation before submission
- [ ] Cache mentor/entrepreneur lists
- [ ] Debounce search inputs
- [ ] Lazy load report list
- [ ] Optimize image loading

---

## Security Checklist

- [ ] Validate Google Meet link format
- [ ] Sanitize user inputs
- [ ] Check user roles before rendering pages
- [ ] Verify JWT tokens on protected routes
- [ ] Prevent XSS in report text fields
- [ ] Rate limit API calls

---

## Documentation Updates Needed

- [ ] Add API examples to Swagger
- [ ] Update README with new features
- [ ] Create user guide for mentors
- [ ] Create user guide for entrepreneurs
- [ ] Add troubleshooting section

---

## Optional Enhancements

### Short-term:

- [ ] Email notifications for meetings
- [ ] SMS reminders (Twilio integration)
- [ ] Export reports to PDF
- [ ] Calendar sync (Google Calendar API)

### Medium-term:

- [ ] Meeting history timeline
- [ ] Progress tracking graphs
- [ ] Mentor rating system
- [ ] Automated follow-up reminders

### Long-term:

- [ ] In-platform video calls
- [ ] AI-powered mentor matching
- [ ] Automated report templates
- [ ] Mobile app with push notifications

---

## Success Criteria

### Backend:

- ✅ Migrations run without errors
- ✅ All endpoints tested and working
- ✅ Notifications created correctly
- ✅ Data persisted to database

### Frontend:

- ⏳ All forms functional
- ⏳ Data displays correctly
- ⏳ User workflows completed
- ⏳ Dashboard cards fixed

### System:

- ⏳ End-to-end mentorship cycle works
- ⏳ No critical bugs
- ⏳ Performance acceptable
- ⏳ User-friendly interface

---

## Timeline Estimate

### This Week:

- Day 1: Run migrations, test backend ✅
- Day 2-3: Build mentor pages
- Day 4-5: Build entrepreneur pages
- Day 6: Fix dashboard, test

### Next Week:

- Day 1-2: Integration testing
- Day 3-4: Bug fixes and polish
- Day 5: Deployment and monitoring

---

## Getting Help

### Documentation:

1. `MENTORSHIP_SYSTEM_GUIDE.md` - Complete system guide
2. `MENTORSHIP_QUICK_TEST_GUIDE.md` - Testing guide
3. `MENTORSHIP_COMPLETE.md` - Summary and overview

### Code Reference:

- Backend controllers: `anzamanagmentbackend/modules/`
- Models: `anzamanagmentbackend/models/`
- Migrations: `anzamanagmentbackend/migrations/`

---

**Start Here:** ✅ Run database migrations
**Next:** Test backend endpoints
**Then:** Build frontend pages

---

_Good luck with the implementation! 🚀_
