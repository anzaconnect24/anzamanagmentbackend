const { sequelize } = require("./models");

(async () => {
  try {
    // Check if column exists
    const [results] = await sequelize.query(
      "SHOW COLUMNS FROM QuizAnswers LIKE 'feedback'"
    );

    if (results.length === 0) {
      console.log("Adding feedback column...");
      await sequelize.query(
        "ALTER TABLE QuizAnswers ADD COLUMN feedback TEXT NULL COMMENT 'Admin feedback for description answers'"
      );
      console.log("✅ Feedback column added successfully!");
    } else {
      console.log("✅ Feedback column already exists");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
