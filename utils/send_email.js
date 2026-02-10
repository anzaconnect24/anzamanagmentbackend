const { errorResponse, successResponse } = require("../utils/responses");
const { sendMail } = require("../utils/mail_controller");

const sendEmail = async (req, res, user, status, extraData = {}) => {
  // res.status(200).send(user.email+","+status);
  try {
    var subject = "",
      message = "";
    var response;
    switch (status) {
      // 1. User registration confirmation
      case "email_confirmation":
        subject = "Welcome to Anza - Confirm Your Email";
        message = `Hello ${user.name}!,<br><br>Thank you for registering with Anza Management System. We're excited to have you join our community of startups, investors, and mentors.<br><br>Please confirm your email by clicking this link: <a href="https://anzamanagementsystem.vercel.app/emailConfirmation/${user.uuid}">Confirm Email</a><br><br>Once confirmed, you'll have full access to our platform.<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 2. Mentor outreach to founder
      case "mentor_outreach_to_startup":
        subject = "New Mentorship Application from a Mentor";
        message = `Hello ${user.name}!,<br><br>Great news! ${extraData.mentorName} has reached out to offer you mentorship.<br><br><strong>About the Mentor:</strong><br>${extraData.mentorBio || "Experienced professional in your field"}<br><br><strong>Areas of Expertise:</strong> ${extraData.expertise || "N/A"}<br><br>Please <a href="https://anzamanagementsystem.vercel.app/dashboard/mentorship-applications">review this opportunity</a> and respond at your earliest convenience.<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 3. Founder outreach to mentor
      case "startup_outreach_to_mentor":
        subject = "New Mentorship Request from a Startup";
        message = `Hello ${user.name}!,<br><br>${extraData.startupName} has requested your mentorship.<br><br><strong>About the Startup:</strong><br>${extraData.startupBio || "Emerging business seeking guidance"}<br><br><strong>Key Challenges:</strong> ${extraData.challenges || "N/A"}<br><br><strong>Mentorship Areas Requested:</strong> ${extraData.mentorshipAreas || "N/A"}<br><br>Please <a href="https://anzamanagementsystem.vercel.app/dashboard/mentorship-applications">review and respond</a> to this request.<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 4. Session scheduling and confirmation
      case "session_scheduled":
        subject = "Mentorship Session Scheduled";
        message = `Hello ${user.name}!,<br><br>Your mentorship session has been scheduled.<br><br><strong>Date & Time:</strong> ${extraData.sessionDate}<br><strong>Mode:</strong> ${extraData.mode || "Virtual"}<br><strong>With:</strong> ${extraData.withPerson}<br><br>${extraData.meetingLink ? `<strong>Meeting Link:</strong> <a href="${extraData.meetingLink}">${extraData.meetingLink}</a><br><br>` : ""}Please add this to your calendar and be prepared for a productive session.<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      case "session_confirmed":
        subject = "Mentorship Session Confirmed";
        message = `Hello ${user.name}!,<br><br>${extraData.confirmedBy} has confirmed the mentorship session scheduled for ${extraData.sessionDate}.<br><br>Looking forward to a productive session!<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 5. Post session follow up
      case "session_followup":
        subject = "Mentorship Session Follow-Up";
        message = `Hello ${user.name}!,<br><br>Thank you for participating in the mentorship session on ${extraData.sessionDate}.<br><br>We'd love to hear about your experience. Please take a moment to:<br>- Share feedback about the session<br>- Note any action items or next steps<br>- Schedule your next session if needed<br><br><a href="https://anzamanagementsystem.vercel.app/dashboard/sessions">Access Session Details</a><br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 6. Investor interest or connection request
      case "investor_interest":
        subject = "New Investor Interest in Your Business";
        message = `Hello ${user.name}!,<br><br>Exciting news! ${extraData.investorName} has shown interest in your business.<br><br><strong>Investor:</strong> ${extraData.investorName}<br><strong>Investment Focus:</strong> ${extraData.investmentFocus || "N/A"}<br><br>This is a great opportunity to connect and discuss potential investment.<br><br><a href="https://anzamanagementsystem.vercel.app/dashboard/investor-interests">View Details and Respond</a><br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 7. Startup interest to investor
      case "startup_interest_to_investor":
        subject = "New Investment Request from a Startup";
        message = `Hello ${user.name}!,<br><br>${extraData.startupName} has submitted an investment request.<br><br><strong>Business:</strong> ${extraData.businessName}<br><strong>Sector:</strong> ${extraData.sector || "N/A"}<br><strong>Investment Requested:</strong> ${extraData.amount || "N/A"}<br><br><a href="https://anzamanagementsystem.vercel.app/dashboard/interested-startups">Review Business Profile</a><br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 8. Admin invitation to join the platform
      case "admin_platform_invitation":
        subject = "You're Invited to Join Anza Platform";
        message = `Hello ${extraData.recipientName || "there"}!,<br><br>You've been invited by ${extraData.invitedBy || "Anza Admin"} to join the Anza Management System - a platform connecting startups, investors, and mentors across Tanzania.<br><br><strong>Platform Benefits:</strong><br>- Connect with potential investors<br>- Access mentorship from experienced professionals<br>- Network with fellow entrepreneurs<br>- Apply for funding programs<br><br><a href="https://anzamanagementsystem.vercel.app/register?invite=${extraData.inviteCode || ""}">Join Anza Platform Now</a><br><br>We look forward to having you in our community!<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 9. Role or permission change notification
      case "role_changed":
        subject = "Your Anza Account Role Has Been Updated";
        message = `Hello ${user.name}!,<br><br>Your account role has been updated.<br><br><strong>Previous Role:</strong> ${extraData.oldRole || "N/A"}<br><strong>New Role:</strong> ${extraData.newRole || "N/A"}<br><br>${extraData.reason ? `<strong>Reason:</strong> ${extraData.reason}<br><br>` : ""}This change will take effect immediately. Please log in to access your updated permissions.<br><br><a href="https://anzamanagementsystem.vercel.app/dashboard">Access Your Dashboard</a><br><br>If you have any questions, please contact our support team.<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      case "permission_changed":
        subject = "Your Anza Account Permissions Have Been Updated";
        message = `Hello ${user.name}!,<br><br>Your account permissions have been modified.<br><br><strong>Changes Made:</strong><br>${extraData.changes || "Permissions updated by administrator"}<br><br>Please log in to review your current access level.<br><br><a href="https://anzamanagementsystem.vercel.app/dashboard">Access Your Dashboard</a><br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 10. Policy compliance or terms update notification
      case "policy_update":
        subject = "Important: Anza Platform Policy Update";
        message = `Hello ${user.name}!,<br><br>We've updated our ${extraData.policyType || "platform policies and terms of service"}.<br><br><strong>What's Changed:</strong><br>${extraData.updateSummary || "Please review the updated terms"}<br><br><strong>Effective Date:</strong> ${extraData.effectiveDate || "Immediately"}<br><br>Please review these changes at your earliest convenience:<br><a href="https://anzamanagementsystem.vercel.app/terms">View Updated Terms</a><br><br>Continued use of the platform constitutes acceptance of these updates.<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      case "compliance_reminder":
        subject = "Action Required: Compliance Update Needed";
        message = `Hello ${user.name}!,<br><br>This is a reminder to complete the following compliance requirement:<br><br><strong>Required Action:</strong> ${extraData.action || "Update your profile information"}<br><strong>Deadline:</strong> ${extraData.deadline || "As soon as possible"}<br><br>${extraData.details || ""}<br><br><a href="https://anzamanagementsystem.vercel.app/dashboard/compliance">Complete Compliance Requirements</a><br><br>Failure to complete this may affect your account access.<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 11. Task assignment to staff
      case "task_assigned":
        subject = "New Task Assigned to You";
        message = `Hello ${user.name}!,<br><br>You have been assigned a new task.<br><br><strong>Task:</strong> ${extraData.taskTitle || "New task"}<br><strong>Type:</strong> ${extraData.taskType || "General"}<br><strong>Priority:</strong> ${extraData.priority || "Normal"}<br><strong>Due Date:</strong> ${extraData.dueDate || "Not specified"}<br><br><strong>Description:</strong><br>${extraData.description || "No description provided"}<br><br><a href="https://anzamanagementsystem.vercel.app/dashboard/tasks/${extraData.taskId || ""}">View Task Details</a><br><br>Please acknowledge receipt and begin work on this task.<br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // 12. Task completion notification to admin
      case "task_completed":
        subject = "Task Completed - Awaiting Your Review";
        message = `Hello ${user.name}!,<br><br>${extraData.completedBy} has marked a task as completed.<br><br><strong>Task:</strong> ${extraData.taskTitle || "Task"}<br><strong>Completed On:</strong> ${extraData.completionDate || new Date().toLocaleDateString()}<br><strong>Assigned To:</strong> ${extraData.completedBy || "Staff member"}<br><br>${extraData.completionNotes ? `<strong>Completion Notes:</strong><br>${extraData.completionNotes}<br><br>` : ""}<a href="https://anzamanagementsystem.vercel.app/dashboard/tasks/${extraData.taskId || ""}">Review and Approve Task</a><br><br>Best regards,<br>The Anza Team`;
        response = await sendMail(user, subject, message, status);
        break;

      // Existing cases
      case "accepted":
        subject = "Your application to Anza Management System is accepted";
        message =
          "Hello " +
          user.name +
          ",<br>This is to inform you that we have accepted your request to join Anza platform,<br>You can contact us for more information through phone: +255 000 000 0000,email: anzaentrepreneurs@gmail.com.";
        response = await sendMail(user, subject, message, status);
        break;
      case "rejected":
        subject = "Your application to Anza Management System is rejected";
        message =
          "Hello " +
          user.name +
          ",<br>This is to inform you that we have rejected your request to join Anza platform,<br>You can contact us for more information through phone: +255 000 000 0000,email: anzaentrepreneurs@gmail.com.";
        response = await sendMail(user, subject, message, status);
        break;
      case "order":
        subject = "Your order has been placed at Anza Management System";
        message =
          "Hello " +
          user.name +
          ",<br>This is to inform you that your order has been placed and payment was successful.<br>You can now wait for the delivery of your items.";
        response = await sendMail(user, subject, message, status);
        break;
      case "customer_promotion":
        subject = "Special Promotion Just for You";
        message =
          "Hello " +
          user.name +
          "!,<br>We're offering a special promotion of 10% off your next purchase!.";
        response = await sendMail(user, subject, message, status);
        break;
      case "seller_promotion":
        subject = "Special Promotion Just for You";
        message =
          "Hello " +
          user.name +
          "!,<br>We're offering a special promotion of 10% fee discount on your next sells in 2 days!.";
        response = await sendMail(user, subject, message, status);
        break;
      case "assigned_business_investment":
        subject = "Assigned to review business investment";
        message =
          "Hello " +
          user.name +
          '!,<br>This is to inform you that you have been assigned task to <a href="https://anzamanagementsystem.vercel.app/">review business investment</a>';
        response = await sendMail(user, subject, message, status);
        break;
      case "assigned_program_application":
        subject = "Assigned to review program application";
        message =
          "Hello " +
          user.name +
          '!,<br>This is to inform you that you have been assigned task to <a href="https://anzamanagementsystem.vercel.app/">review program application</a>';
        response = await sendMail(user, subject, message, status);
        break;
      case "registration":
        subject = "New user registration";
        message =
          "Hello " +
          user.name +
          '!,<br>New user have registered, You need to <a href="https://anzamanagementsystem.vercel.app/">activate his/her account</a>';
        response = await sendMail(user, subject, message, status);
        break;
      case "user_invitation":
        subject = "Invitation to join Anza platform";
        message =
          "Hello" +
          `!,<br>Join Anza platform to connect with investors and fellow enterprenuers, <a href="https://anzamanagementsystem.vercel.app/">Join now</a>`;
        response = await sendMail(user, subject, message, status);
        break;
      case "program_application":
        subject = "New user program application";
        message =
          "Hello " +
          user.name +
          '!,<br>New user have applied for a program, <a href="https://anzamanagementsystem.vercel.app/">Assign a reviewer for this application</a>';
        response = await sendMail(user, subject, message, status);
        break;
      case "business_investment_request":
        subject = "New business investment request";
        message =
          "Hello " +
          user.name +
          '!,<br>An investor has just applied to invest on a business, <a href="https://anzamanagementsystem.vercel.app/">You can take action(accept/reject) here</a>';
        response = await sendMail(user, subject, message, status);
        break;
      default:
        break;
    }
    // successResponse(res, response);
  } catch (error) {
    return error;
    errorResponse(res, error);
  }
};

module.exports = { sendEmail };
