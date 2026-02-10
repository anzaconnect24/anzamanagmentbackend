const { sendEmail } = require("./send_email");
const { User } = require("../models");

/**
 * Send task assignment notification
 * @param {Object} params - { staffUserId, taskTitle, taskType, priority, dueDate, description, taskId, assignedBy }
 */
const notifyTaskAssignment = async (req, res, params) => {
  try {
    const staff = await User.findOne({ where: { id: params.staffUserId } });
    if (!staff) {
      console.error("Staff user not found for task assignment notification");
      return;
    }

    await sendEmail(req, res, staff, "task_assigned", {
      taskTitle: params.taskTitle,
      taskType: params.taskType || "General",
      priority: params.priority || "Normal",
      dueDate: params.dueDate || "Not specified",
      description: params.description || "No description provided",
      taskId: params.taskId || "",
    });

    console.log(`Task assignment email sent to ${staff.email}`);
  } catch (error) {
    console.error("Error sending task assignment notification:", error);
  }
};

/**
 * Send task completion notification to admin
 * @param {Object} params - { adminUserId, taskTitle, completedBy, completionDate, completionNotes, taskId }
 */
const notifyTaskCompletion = async (req, res, params) => {
  try {
    // If adminUserId is provided, use it. Otherwise, find all admins
    let admins = [];
    if (params.adminUserId) {
      const admin = await User.findOne({ where: { id: params.adminUserId } });
      if (admin) admins.push(admin);
    } else {
      admins = await User.findAll({ where: { role: "Admin" } });
    }

    for (const admin of admins) {
      await sendEmail(req, res, admin, "task_completed", {
        taskTitle: params.taskTitle,
        completedBy: params.completedBy,
        completionDate:
          params.completionDate || new Date().toLocaleDateString(),
        completionNotes: params.completionNotes || "",
        taskId: params.taskId || "",
      });
    }

    console.log(`Task completion emails sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error("Error sending task completion notification:", error);
  }
};

/**
 * Send policy/compliance update notification
 * @param {Object} params - { policyType, updateSummary, effectiveDate }
 */
const notifyPolicyUpdate = async (req, res, userRole = null) => {
  try {
    let users = [];

    if (userRole) {
      users = await User.findAll({ where: { role: userRole } });
    } else {
      users = await User.findAll();
    }

    for (const user of users) {
      await sendEmail(req, res, user, "policy_update", {
        policyType:
          req.body.policyType || "platform policies and terms of service",
        updateSummary:
          req.body.updateSummary || "Please review the updated terms",
        effectiveDate: req.body.effectiveDate || "Immediately",
      });
    }

    console.log(`Policy update emails sent to ${users.length} user(s)`);
  } catch (error) {
    console.error("Error sending policy update notifications:", error);
  }
};

/**
 * Send compliance reminder
 * @param {Object} params - { userId, action, deadline, details }
 */
const notifyComplianceReminder = async (req, res, params) => {
  try {
    const user = await User.findOne({ where: { id: params.userId } });
    if (!user) {
      console.error("User not found for compliance reminder");
      return;
    }

    await sendEmail(req, res, user, "compliance_reminder", {
      action: params.action || "Update your profile information",
      deadline: params.deadline || "As soon as possible",
      details: params.details || "",
    });

    console.log(`Compliance reminder sent to ${user.email}`);
  } catch (error) {
    console.error("Error sending compliance reminder:", error);
  }
};

module.exports = {
  notifyTaskAssignment,
  notifyTaskCompletion,
  notifyPolicyUpdate,
  notifyComplianceReminder,
};
