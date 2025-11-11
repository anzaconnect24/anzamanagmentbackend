# Activity Logging Implementation Guide

This guide shows how to use the activity logger to track user activities using the existing Log table.

## Overview

The activity logger tracks:

1. **User logins**
2. **CRAT updates** (CratFinancials, CratMarkets, CratOperations, CratLegals)
3. **Module reading starts** (only logged once per module per user)
4. **General resource access** (programs, investment opportunities, documents, etc.)

## Import the Logger

```javascript
const {
  logLogin,
  logCratUpdate,
  logModuleStart,
  logResourceAccess,
  getUserActivityLogs,
} = require("../../utils/activity_logger");
```

## 1. Login Logging

Add to your `loginUser` function in `modules/user/user.controller.js`:

```javascript
const loginUser = async (req, res) => {
  console.log("logging in");
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      res.status(404).json({
        status: false,
        message: "User does not exist",
      });
    } else {
      if (await bcrypt.compare(password, user.password)) {
        const response = await User.findOne({
          where: { email: email },
          include: [Business],
        });

        // ✅ LOG THE LOGIN
        await logLogin(response.id, response.name);

        const tokens = generateJwtTokens(response);
        res.status(200).json({
          status: true,
          tokens,
        });
      } else {
        res.status(403).json({
          status: false,
          message: "Wrong password",
        });
      }
    }
  } catch (error) {
    errorResponse(res, error);
  }
};
```

## 2. CRAT Update Logging

### For CratFinancials (modules/crat_financials/crat_financials.controller.js)

```javascript
const { logCratUpdate } = require("../../utils/activity_logger");

const updateCratFinancial = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = req.user;

    const record = await CratFinancials.findOne({ where: { uuid } });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    await record.update(req.body);

    // ✅ LOG THE UPDATE
    await logCratUpdate(user.id, "CratFinancials", record.subDomain, user.name);

    successResponse(res, record);
  } catch (error) {
    errorResponse(res, error);
  }
};
```

### For CratMarkets (modules/crat_markets/crat_markets.controller.js)

```javascript
const { logCratUpdate } = require("../../utils/activity_logger");

const updateCratMarket = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = req.user;

    const record = await CratMarkets.findOne({ where: { uuid } });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    await record.update(req.body);

    // ✅ LOG THE UPDATE
    await logCratUpdate(user.id, "CratMarkets", record.subDomain, user.name);

    successResponse(res, record);
  } catch (error) {
    errorResponse(res, error);
  }
};
```

### For CratOperations (modules/crat_operations/crat_operations.controller.js)

```javascript
const { logCratUpdate } = require("../../utils/activity_logger");

const updateCratOperation = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = req.user;

    const record = await CratOperations.findOne({ where: { uuid } });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    await record.update(req.body);

    // ✅ LOG THE UPDATE
    await logCratUpdate(user.id, "CratOperations", record.subDomain, user.name);

    successResponse(res, record);
  } catch (error) {
    errorResponse(res, error);
  }
};
```

### For CratLegals (modules/crat_legals/crat_legals.controller.js)

```javascript
const { logCratUpdate } = require("../../utils/activity_logger");

const updateCratLegal = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = req.user;

    const record = await CratLegals.findOne({ where: { uuid } });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    await record.update(req.body);

    // ✅ LOG THE UPDATE
    await logCratUpdate(user.id, "CratLegals", record.subDomain, user.name);

    successResponse(res, record);
  } catch (error) {
    errorResponse(res, error);
  }
};
```

## 3. Module Reading Start Logging

Add to your slide reader controller when a user reads a slide:

```javascript
const { logModuleStart } = require("../../utils/activity_logger");

const markSlideAsRead = async (req, res) => {
  try {
    const { slideId } = req.body;
    const user = req.user;

    // Get the slide with its module
    const slide = await Slide.findOne({
      where: { id: slideId },
      include: [Module],
    });

    if (!slide) {
      return res.status(404).json({ message: "Slide not found" });
    }

    // Check if SlideReader entry exists
    let slideReader = await SlideReader.findOne({
      where: {
        userId: user.id,
        slideId: slideId,
      },
    });

    if (!slideReader) {
      // Create SlideReader entry
      slideReader = await SlideReader.create({
        userId: user.id,
        slideId: slideId,
      });

      // ✅ LOG MODULE START (only logs once per module)
      await logModuleStart(
        user.id,
        slide.Module.id,
        slide.Module.title,
        user.name
      );
    }

    successResponse(res, slideReader);
  } catch (error) {
    errorResponse(res, error);
  }
};
```

## 4. General Resource Access Logging

### Example: Viewing a Program

```javascript
const { logResourceAccess } = require("../../utils/activity_logger");

const getProgram = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = req.user;

    const program = await Program.findOne({ where: { uuid } });

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    // ✅ LOG RESOURCE ACCESS
    await logResourceAccess(
      user.id,
      "Program",
      program.title,
      "viewed",
      user.name
    );

    successResponse(res, program);
  } catch (error) {
    errorResponse(res, error);
  }
};
```

### Example: Downloading a Document

```javascript
const downloadDocument = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = req.user;

    const document = await BusinessDocument.findOne({ where: { uuid } });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // ✅ LOG RESOURCE ACCESS
    await logResourceAccess(
      user.id,
      "Business Document",
      document.name,
      "downloaded",
      user.name
    );

    // Return the document...
    successResponse(res, document);
  } catch (error) {
    errorResponse(res, error);
  }
};
```

## 5. Retrieving Activity Logs

### Get Logs for a Specific User

```javascript
const { getUserActivityLogs } = require("../../utils/activity_logger");

const getMyActivityLogs = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    const offset = (page - 1) * limit;

    const { count, logs } = await getUserActivityLogs(user.id, {
      limit: parseInt(limit),
      offset,
      startDate,
      endDate,
    });

    const totalPages = Math.ceil(count / limit);

    successResponse(res, {
      count,
      data: logs,
      page: parseInt(page),
      totalPages,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};
```

## Log Message Format

The logger creates messages in the `action` field with the following format:

- **Login:** `User {name} logged in`
- **CRAT Update:** `User {name} updated {CratType} - {subDomain}`
- **Module Start:** `User {name} started reading module: {moduleTitle}`
- **Resource Access:** `User {name} {action} {resourceType}: {resourceName}`

## Examples of Log Messages

```
User John Doe logged in
User John Doe updated CratFinancials - Revenue Analysis
User John Doe started reading module: Introduction to Business Planning
User John Doe viewed Program: Startup Accelerator 2025
User John Doe downloaded Business Document: Financial Statement Q1
```

## Important Notes

1. **Module logging is smart** - It only logs the first time a user starts reading a module by checking the SlideReader table
2. **No database modifications** - Uses only the existing Log table structure
3. **Error handling** - All logging errors are caught and logged to console without breaking the main flow
4. **Optional user names** - You can pass empty string for userName and it will use userId instead
5. **Timestamps** - Sequelize automatically adds `createdAt` and `updatedAt` fields to each log entry

## Testing the Logger

You can test the logger by:

```javascript
// Test login logging
await logLogin(1, "Test User");

// Test CRAT update logging
await logCratUpdate(1, "CratFinancials", "Revenue", "Test User");

// Test module start logging
await logModuleStart(1, 5, "Test Module", "Test User");

// Test resource access logging
await logResourceAccess(1, "Program", "Test Program", "viewed", "Test User");
```
