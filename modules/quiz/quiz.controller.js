const db = require("../../models");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const Quiz = db.Quiz;
const QuizQuestion = db.QuizQuestion;
const QuizOption = db.QuizOption;
const QuizAttempt = db.QuizAttempt;
const QuizAnswer = db.QuizAnswer;
const Module = db.Module;
const User = db.User;
const Business = db.Business;
const Program = db.Program;

// Create a new quiz
exports.createQuiz = async (req, res) => {
  try {
    const { moduleId, title, description, passingScore } = req.body;

    if (!moduleId || !title) {
      return res.status(400).json({
        success: false,
        message: "Module ID and title are required",
      });
    }

    // Check if module exists by UUID
    const module = await Module.findOne({ where: { uuid: moduleId } });
    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    const quiz = await Quiz.create({
      moduleId: module.id,
      title,
      description,
      passingScore: passingScore || 70,
      isPublished: false,
    });

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: quiz,
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error creating quiz",
      error: error.message,
    });
  }
};

// Get all quizzes for a module
exports.getQuizzesByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Find module by UUID
    const module = await Module.findOne({ where: { uuid: moduleId } });
    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    const quizzes = await Quiz.findAll({
      where: { moduleId: module.id },
      include: [
        {
          model: QuizQuestion,
          as: "questions",
          include: [
            {
              model: QuizOption,
              as: "options",
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quizzes",
      error: error.message,
    });
  }
};

// Get single quiz with questions
exports.getQuizById = async (req, res) => {
  try {
    const { uuid } = req.params;

    const quiz = await Quiz.findOne({
      where: { uuid },
      include: [
        {
          model: Module,
          as: "module",
        },
        {
          model: QuizQuestion,
          as: "questions",
          include: [
            {
              model: QuizOption,
              as: "options",
              order: [["order", "ASC"]],
            },
          ],
          order: [["order", "ASC"]],
        },
      ],
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quiz",
      error: error.message,
    });
  }
};

// Update quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { title, description, passingScore } = req.body;

    const quiz = await Quiz.findOne({ where: { uuid } });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    await quiz.update({
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(passingScore && { passingScore }),
    });

    res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      data: quiz,
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error updating quiz",
      error: error.message,
    });
  }
};

// Publish/Unpublish quiz
exports.togglePublish = async (req, res) => {
  try {
    const { uuid } = req.params;

    const quiz = await Quiz.findOne({
      where: { uuid },
      include: [
        {
          model: QuizQuestion,
          as: "questions",
        },
      ],
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    if (!quiz.isPublished && quiz.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish quiz without questions",
      });
    }

    await quiz.update({
      isPublished: !quiz.isPublished,
    });

    res.status(200).json({
      success: true,
      message: `Quiz ${
        quiz.isPublished ? "published" : "unpublished"
      } successfully`,
      data: quiz,
    });
  } catch (error) {
    console.error("Error toggling quiz publish status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling quiz publish status",
      error: error.message,
    });
  }
};

// Delete quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { uuid } = req.params;

    const quiz = await Quiz.findOne({ where: { uuid } });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    await quiz.destroy();

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting quiz",
      error: error.message,
    });
  }
};

// Add question to quiz
exports.addQuestion = async (req, res) => {
  try {
    const { quizUuid } = req.params;
    const { questionText, questionType, points, options } = req.body;

    if (!questionText || !questionType) {
      return res.status(400).json({
        success: false,
        message: "Question text and type are required",
      });
    }

    const quiz = await Quiz.findOne({ where: { uuid: quizUuid } });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Get the highest order number
    const maxOrder = await QuizQuestion.max("order", {
      where: { quizId: quiz.id },
    });

    const question = await QuizQuestion.create({
      quizId: quiz.id,
      questionText,
      questionType,
      points: points || 1,
      order: (maxOrder || 0) + 1,
    });

    // Create options if provided
    if (options && Array.isArray(options) && options.length > 0) {
      const optionsData = options.map((opt, index) => ({
        questionId: question.id,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect || false,
        order: index + 1,
      }));

      await QuizOption.bulkCreate(optionsData);
    }

    // Fetch the complete question with options
    const completeQuestion = await QuizQuestion.findOne({
      where: { uuid: question.uuid },
      include: [
        {
          model: QuizOption,
          as: "options",
          order: [["order", "ASC"]],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      data: completeQuestion,
    });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({
      success: false,
      message: "Error adding question",
      error: error.message,
    });
  }
};

// Update question
exports.updateQuestion = async (req, res) => {
  try {
    const { questionUuid } = req.params;
    const { questionText, points, options } = req.body;

    const question = await QuizQuestion.findOne({
      where: { uuid: questionUuid },
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    await question.update({
      ...(questionText && { questionText }),
      ...(points && { points }),
    });

    // Update options if provided
    if (options && Array.isArray(options)) {
      // Delete existing options
      await QuizOption.destroy({ where: { questionId: question.id } });

      // Create new options
      const optionsData = options.map((opt, index) => ({
        questionId: question.id,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect || false,
        order: index + 1,
      }));

      await QuizOption.bulkCreate(optionsData);
    }

    // Fetch updated question with options
    const updatedQuestion = await QuizQuestion.findOne({
      where: { uuid: questionUuid },
      include: [
        {
          model: QuizOption,
          as: "options",
          order: [["order", "ASC"]],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({
      success: false,
      message: "Error updating question",
      error: error.message,
    });
  }
};

// Delete question
exports.deleteQuestion = async (req, res) => {
  try {
    const { questionUuid } = req.params;

    const question = await QuizQuestion.findOne({
      where: { uuid: questionUuid },
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    await question.destroy();

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting question",
      error: error.message,
    });
  }
};

// Start quiz attempt
exports.startAttempt = async (req, res) => {
  try {
    const { quizUuid } = req.params;
    const userId = req.user.id;

    const quiz = await Quiz.findOne({ where: { uuid: quizUuid } });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    if (!quiz.isPublished) {
      return res.status(400).json({
        success: false,
        message: "Quiz is not published",
      });
    }

    const attempt = await QuizAttempt.create({
      quizId: quiz.id,
      userId,
      startedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Quiz attempt started",
      data: attempt,
    });
  } catch (error) {
    console.error("Error starting quiz attempt:", error);
    res.status(500).json({
      success: false,
      message: "Error starting quiz attempt",
      error: error.message,
    });
  }
};

// Submit quiz answers
exports.submitQuiz = async (req, res) => {
  try {
    const { attemptUuid } = req.params;
    const { answers } = req.body; // Array of {questionUuid, optionUuid or answerText}
    const userId = req.user.id;

    const attempt = await QuizAttempt.findOne({
      where: { uuid: attemptUuid, userId },
      include: [
        {
          model: Quiz,
          as: "quiz",
          include: [
            {
              model: QuizQuestion,
              as: "questions",
              include: [
                {
                  model: QuizOption,
                  as: "options",
                },
              ],
            },
          ],
        },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        message: "Quiz already submitted",
      });
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    let hasDescriptionQuestions = false;

    // Process answers
    for (const answer of answers) {
      const question = attempt.quiz.questions.find(
        (q) => q.uuid === answer.questionUuid
      );

      if (!question) continue;

      totalPoints += question.points;

      let isCorrect = false;
      let pointsEarned = 0;
      let optionId = null;
      let answerText = null;

      if (question.questionType === "multiple_choice") {
        const selectedOption = question.options.find(
          (opt) => opt.uuid === answer.optionUuid
        );
        if (selectedOption) {
          optionId = selectedOption.id;
          isCorrect = selectedOption.isCorrect;
          if (isCorrect) {
            pointsEarned = question.points;
            earnedPoints += pointsEarned;
          }
        }
      } else if (question.questionType === "true_false") {
        const selectedOption = question.options.find(
          (opt) => opt.uuid === answer.optionUuid
        );
        if (selectedOption) {
          optionId = selectedOption.id;
          isCorrect = selectedOption.isCorrect;
          if (isCorrect) {
            pointsEarned = question.points;
            earnedPoints += pointsEarned;
          }
        }
      } else if (question.questionType === "description") {
        answerText = answer.answerText;
        hasDescriptionQuestions = true;
        // Description questions need manual grading, so isCorrect is null
        isCorrect = null;
      }

      await QuizAnswer.create({
        attemptId: attempt.id,
        questionId: question.id,
        optionId,
        answerText,
        isCorrect,
        pointsEarned,
      });
    }

    // Determine grading status
    const gradingStatus = hasDescriptionQuestions
      ? "pending_grading"
      : "auto_graded";

    // Calculate score percentage (only for auto-graded questions)
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const isPassed = !hasDescriptionQuestions
      ? score >= attempt.quiz.passingScore
      : false;

    await attempt.update({
      score: hasDescriptionQuestions ? null : score,
      totalPoints,
      earnedPoints: hasDescriptionQuestions ? null : earnedPoints,
      isPassed,
      submittedAt: new Date(),
      gradingStatus,
    });

    res.status(200).json({
      success: true,
      message: hasDescriptionQuestions
        ? "Quiz submitted successfully. Your answers will be reviewed by an instructor."
        : "Quiz submitted successfully",
      data: {
        score: hasDescriptionQuestions ? null : score,
        totalPoints,
        earnedPoints: hasDescriptionQuestions ? null : earnedPoints,
        isPassed,
        passingScore: attempt.quiz.passingScore,
        gradingStatus,
      },
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting quiz",
      error: error.message,
    });
  }
};

// Get user quiz attempts
exports.getUserAttempts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quizUuid } = req.params;

    const whereClause = { userId };

    if (quizUuid) {
      const quiz = await Quiz.findOne({ where: { uuid: quizUuid } });
      if (quiz) {
        whereClause.quizId = quiz.id;
      }
    }

    const attempts = await QuizAttempt.findAll({
      where: whereClause,
      include: [
        {
          model: Quiz,
          as: "quiz",
          include: [
            {
              model: Module,
              as: "module",
            },
          ],
        },
        {
          model: QuizAnswer,
          as: "answers",
          include: [
            {
              model: QuizQuestion,
              as: "question",
            },
            {
              model: QuizOption,
              as: "option",
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    console.error("Error fetching user attempts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user attempts",
      error: error.message,
    });
  }
};

// Download certificate for completing all quizzes in a program
exports.downloadProgramCertificate = async (req, res) => {
  try {
    const { programUuid } = req.params;
    const userId = req.user.id;

    // Get the program
    const program = await Program.findOne({
      where: { uuid: programUuid },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Get all modules for this program
    const modules = await Module.findAll({
      where: { programId: program.id },
    });

    if (modules.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No modules found in this program",
      });
    }

    // Get all quizzes for these modules
    const quizzes = await Quiz.findAll({
      where: {
        moduleId: modules.map((m) => m.id),
        isPublished: true,
      },
    });

    if (quizzes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No quizzes found in this program",
      });
    }

    // Check if user has completed and passed all quizzes
    const userAttempts = await QuizAttempt.findAll({
      where: {
        userId,
        quizId: quizzes.map((q) => q.id),
        submittedAt: { [db.Sequelize.Op.ne]: null },
      },
    });

    // Check if all quizzes are attempted and passed
    const passedQuizIds = userAttempts
      .filter((attempt) => attempt.isPassed)
      .map((attempt) => attempt.quizId);

    const allQuizIds = quizzes.map((q) => q.id);
    const missingQuizzes = allQuizIds.filter(
      (id) => !passedQuizIds.includes(id)
    );

    if (missingQuizzes.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "You must complete and pass all quizzes in this program to get the certificate",
        missingQuizzes: missingQuizzes.length,
        totalQuizzes: allQuizIds.length,
      });
    }

    // Get user details
    const user = await User.findOne({
      where: { id: userId },
    });

    // Calculate average score
    const totalScore = userAttempts.reduce(
      (sum, attempt) => sum + (attempt.score || 0),
      0
    );
    const averageScore = totalScore / userAttempts.length;

    // Create PDF certificate
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const fileName = `program_certificate_${programUuid}_${userId}.pdf`;
    const filePath = path.join(__dirname, "../../files", fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Certificate design
    const centerX = doc.page.width / 2;
    const pageHeight = doc.page.height;

    // Add border
    doc
      .rect(30, 30, doc.page.width - 60, pageHeight - 60)
      .lineWidth(3)
      .strokeColor("#1e40af")
      .stroke();

    doc
      .rect(35, 35, doc.page.width - 70, pageHeight - 70)
      .lineWidth(1)
      .strokeColor("#1e40af")
      .stroke();

    // Platform name at top
    doc.y = 60;
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("ANZA CONNECT PLATFORM", { align: "center" });

    doc.moveDown(0.5);

    // Certificate title
    doc
      .fontSize(42)
      .font("Helvetica-Bold")
      .fillColor("#1e40af")
      .text("Certificate of Completion", {
        align: "center",
      });

    doc.moveDown(1);

    // "This certifies that"
    doc
      .fontSize(16)
      .font("Helvetica")
      .fillColor("#374151")
      .text("This certifies that", { align: "center" });

    doc.moveDown(0.8);

    // User name
    doc
      .fontSize(32)
      .font("Helvetica-Bold")
      .fillColor("#111827")
      .text(user.name || "User", {
        align: "center",
      });

    doc.moveDown(0.8);

    // "has successfully completed"
    doc
      .fontSize(16)
      .font("Helvetica")
      .fillColor("#374151")
      .text(
        "has successfully completed all modules and quizzes in the program",
        {
          align: "center",
        }
      );

    doc.moveDown(0.8);

    // Program title
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#1e40af")
      .text(`${program.title}`, {
        align: "center",
      });

    doc.moveDown(1.5);

    // Program stats
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#374151")
      .text(`Modules Completed: ${modules.length}`, {
        align: "center",
      });

    doc.moveDown(0.3);

    doc.text(`Quizzes Passed: ${quizzes.length}`, {
      align: "center",
    });

    doc.moveDown(0.3);

    doc.text(`Average Score: ${averageScore.toFixed(1)}%`, {
      align: "center",
    });

    doc.moveDown(0.3);

    doc.text(
      `Date: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      { align: "center" }
    );

    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error("Error downloading certificate:", err);
          res.status(500).json({
            success: false,
            message: "Error downloading certificate",
          });
        }
        // Optional: Delete file after download
        // fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.error("Error generating program certificate:", error);
    res.status(500).json({
      success: false,
      message: "Error generating program certificate",
      error: error.message,
    });
  }
};

// Check program completion status
exports.checkProgramCompletion = async (req, res) => {
  try {
    const { programUuid } = req.params;
    const userId = req.user.id;

    // Get the program
    const program = await Program.findOne({
      where: { uuid: programUuid },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Get all modules for this program
    const modules = await Module.findAll({
      where: { programId: program.id },
    });

    // Get all quizzes for these modules
    const quizzes = await Quiz.findAll({
      where: {
        moduleId: modules.map((m) => m.id),
        isPublished: true,
      },
      include: [
        {
          model: Module,
          as: "module",
          attributes: ["id", "uuid", "title"],
        },
      ],
    });

    if (quizzes.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          isCompleted: false,
          totalQuizzes: 0,
          passedQuizzes: 0,
          averageScore: 0,
          quizzes: [],
        },
      });
    }

    // Check if user has completed and passed all quizzes
    const userAttempts = await QuizAttempt.findAll({
      where: {
        userId,
        quizId: quizzes.map((q) => q.id),
        submittedAt: { [db.Sequelize.Op.ne]: null },
      },
      include: [
        {
          model: Quiz,
          as: "quiz",
          attributes: ["id", "uuid", "title"],
        },
      ],
    });

    // Check which quizzes are passed
    const passedQuizIds = userAttempts
      .filter((attempt) => attempt.isPassed)
      .map((attempt) => attempt.quizId);

    const quizStatuses = quizzes.map((quiz) => {
      const attempt = userAttempts.find((a) => a.quizId === quiz.id);
      return {
        quizId: quiz.uuid,
        quizTitle: quiz.title,
        moduleTitle: quiz.module.title,
        attempted: !!attempt,
        passed: passedQuizIds.includes(quiz.id),
        score: attempt ? attempt.score : null,
      };
    });

    const totalScore = userAttempts.reduce(
      (sum, attempt) => sum + (attempt.score || 0),
      0
    );
    const averageScore =
      userAttempts.length > 0 ? totalScore / userAttempts.length : 0;

    const isCompleted = passedQuizIds.length === quizzes.length;

    res.status(200).json({
      success: true,
      data: {
        isCompleted,
        totalQuizzes: quizzes.length,
        passedQuizzes: passedQuizIds.length,
        averageScore: averageScore.toFixed(1),
        quizzes: quizStatuses,
      },
    });
  } catch (error) {
    console.error("Error checking program completion:", error);
    res.status(500).json({
      success: false,
      message: "Error checking program completion",
      error: error.message,
    });
  }
};

// Download certificate
exports.downloadCertificate = async (req, res) => {
  try {
    const { attemptUuid } = req.params;
    const userId = req.user.id;

    const attempt = await QuizAttempt.findOne({
      where: { uuid: attemptUuid, userId },
      include: [
        {
          model: Quiz,
          as: "quiz",
          include: [
            {
              model: Module,
              as: "module",
            },
          ],
        },
        {
          model: User,
          as: "user",
        },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    if (!attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        message: "Quiz not submitted yet",
      });
    }

    if (!attempt.isPassed) {
      return res.status(400).json({
        success: false,
        message: "Certificate only available for passed quizzes",
      });
    }

    // Create PDF certificate
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const fileName = `certificate_${attempt.uuid}.pdf`;
    const filePath = path.join(__dirname, "../../files", fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Certificate design
    const centerX = doc.page.width / 2;
    const pageHeight = doc.page.height;

    // Add border
    doc
      .rect(30, 30, doc.page.width - 60, pageHeight - 60)
      .lineWidth(3)
      .strokeColor("#1e40af")
      .stroke();

    doc
      .rect(35, 35, doc.page.width - 70, pageHeight - 70)
      .lineWidth(1)
      .strokeColor("#1e40af")
      .stroke();

    // Platform name at top
    doc.y = 60;
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("ANZA CONNECT PLATFORM", { align: "center" });

    doc.moveDown(0.5);

    // Certificate title
    doc
      .fontSize(42)
      .font("Helvetica-Bold")
      .fillColor("#1e40af")
      .text("Certificate of Achievement", {
        align: "center",
      });

    doc.moveDown(1);

    // "This certifies that"
    doc
      .fontSize(16)
      .font("Helvetica")
      .fillColor("#374151")
      .text("This certifies that", { align: "center" });

    doc.moveDown(0.8);

    // User name
    doc
      .fontSize(32)
      .font("Helvetica-Bold")
      .fillColor("#111827")
      .text(attempt.user.name || "User", {
        align: "center",
      });

    doc.moveDown(0.8);

    // "has successfully completed"
    doc
      .fontSize(16)
      .font("Helvetica")
      .fillColor("#374151")
      .text("has successfully completed the quiz", { align: "center" });

    doc.moveDown(0.8);

    // Quiz title
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#1e40af")
      .text(`${attempt.quiz.title}`, {
        align: "center",
      });

    doc.moveDown(0.5);

    // Module name
    doc
      .fontSize(14)
      .font("Helvetica-Oblique")
      .fillColor("#6b7280")
      .text(`Module: ${attempt.quiz.module.title}`, { align: "center" });

    doc.moveDown(1.5);

    // Score and Date
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#374151")
      .text(`Score: ${Number(attempt.score || 0).toFixed(1)}%`, {
        align: "center",
      });

    doc.moveDown(0.3);

    doc.text(
      `Date: ${new Date(attempt.submittedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      { align: "center" }
    );

    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error("Error downloading certificate:", err);
          res.status(500).json({
            success: false,
            message: "Error downloading certificate",
          });
        }
        // Optional: Delete file after download
        // fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.error("Error generating certificate:", error);
    res.status(500).json({
      success: false,
      message: "Error generating certificate",
      error: error.message,
    });
  }
};

// Admin: Get all quiz attempts (with filters)
exports.getAllAttempts = async (req, res) => {
  try {
    const { quizUuid, moduleId, submittedOnly, userId } = req.query;

    const whereClause = {};
    const quizWhereClause = {};

    // Filter by submitted attempts only
    if (submittedOnly === "true") {
      whereClause.submittedAt = { [db.Sequelize.Op.ne]: null };
    }

    // Filter by specific user
    if (userId) {
      whereClause.userId = userId;
    }

    // Filter by quiz
    if (quizUuid) {
      const quiz = await Quiz.findOne({ where: { uuid: quizUuid } });
      if (quiz) {
        whereClause.quizId = quiz.id;
      }
    }

    // Filter by module
    if (moduleId) {
      quizWhereClause.moduleId = moduleId;
    }

    const attempts = await QuizAttempt.findAll({
      where: whereClause,
      include: [
        {
          model: Quiz,
          as: "quiz",
          where:
            Object.keys(quizWhereClause).length > 0
              ? quizWhereClause
              : undefined,
          include: [
            {
              model: Module,
              as: "module",
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "uuid", "name", "email", "phone"],
          include: [
            {
              model: Business,
              required: false, // Make it optional
            },
          ],
        },
        {
          model: QuizAnswer,
          as: "answers",
          include: [
            {
              model: QuizQuestion,
              as: "question",
            },
            {
              model: QuizOption,
              as: "option",
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: attempts,
      count: attempts.length,
    });
  } catch (error) {
    console.error("Error fetching all attempts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching all attempts",
      error: error.message,
    });
  }
};

// Admin: Get single attempt details
exports.getAttemptDetails = async (req, res) => {
  try {
    const { attemptUuid } = req.params;

    const attempt = await QuizAttempt.findOne({
      where: { uuid: attemptUuid },
      include: [
        {
          model: Quiz,
          as: "quiz",
          include: [
            {
              model: Module,
              as: "module",
            },
            {
              model: QuizQuestion,
              as: "questions",
              include: [
                {
                  model: QuizOption,
                  as: "options",
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "uuid", "name", "email", "phone"],
        },
        {
          model: QuizAnswer,
          as: "answers",
          include: [
            {
              model: QuizQuestion,
              as: "question",
              include: [
                {
                  model: QuizOption,
                  as: "options",
                },
              ],
            },
            {
              model: QuizOption,
              as: "option",
            },
          ],
        },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    console.error("Error fetching attempt details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attempt details",
      error: error.message,
    });
  }
};

// Admin: Mark description answer
exports.markDescriptionAnswer = async (req, res) => {
  try {
    const { answerUuid } = req.params;
    const { isCorrect, pointsEarned, feedback } = req.body;

    if (isCorrect === undefined) {
      return res.status(400).json({
        success: false,
        message: "isCorrect field is required",
      });
    }

    const answer = await QuizAnswer.findOne({
      where: { uuid: answerUuid },
      include: [
        {
          model: QuizQuestion,
          as: "question",
        },
        {
          model: QuizAttempt,
          as: "attempt",
        },
      ],
    });

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found",
      });
    }

    if (answer.question.questionType !== "description") {
      return res.status(400).json({
        success: false,
        message: "Only description answers can be manually marked",
      });
    }

    if (answer.attempt.submittedAt === null) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark answers for unsubmitted attempts",
      });
    }

    // Calculate points earned
    const calculatedPoints = isCorrect
      ? pointsEarned !== undefined
        ? pointsEarned
        : answer.question.points
      : 0;

    await answer.update({
      isCorrect,
      pointsEarned: calculatedPoints,
      feedback: feedback || null,
    });

    // Recalculate attempt score
    const allAnswers = await QuizAnswer.findAll({
      where: { attemptId: answer.attemptId },
      include: [
        {
          model: QuizQuestion,
          as: "question",
        },
      ],
    });

    let totalPoints = 0;
    let earnedPoints = 0;

    allAnswers.forEach((ans) => {
      totalPoints += ans.question.points;
      if (ans.isCorrect !== null) {
        earnedPoints += ans.pointsEarned || 0;
      }
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Get quiz to check passing score
    const attempt = await QuizAttempt.findOne({
      where: { id: answer.attemptId },
      include: [
        {
          model: Quiz,
          as: "quiz",
        },
      ],
    });

    const isPassed = score >= attempt.quiz.passingScore;

    await attempt.update({
      score,
      totalPoints,
      earnedPoints,
      isPassed,
    });

    res.status(200).json({
      success: true,
      message: "Answer marked successfully",
      data: {
        answer,
        updatedScore: {
          score,
          totalPoints,
          earnedPoints,
          isPassed,
        },
      },
    });
  } catch (error) {
    console.error("Error marking answer:", error);
    res.status(500).json({
      success: false,
      message: "Error marking answer",
      error: error.message,
    });
  }
};

// Admin: Bulk mark multiple answers
exports.bulkMarkAnswers = async (req, res) => {
  try {
    const { answers } = req.body; // Array of {answerUuid, isCorrect, pointsEarned, feedback}

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Answers array is required",
      });
    }

    const results = [];
    const attemptIds = new Set();

    for (const answerData of answers) {
      const { answerUuid, isCorrect, pointsEarned, feedback } = answerData;

      const answer = await QuizAnswer.findOne({
        where: { uuid: answerUuid },
        include: [
          {
            model: QuizQuestion,
            as: "question",
          },
          {
            model: QuizAttempt,
            as: "attempt",
          },
        ],
      });

      if (!answer) {
        results.push({
          answerUuid,
          success: false,
          message: "Answer not found",
        });
        continue;
      }

      if (answer.question.questionType !== "description") {
        results.push({
          answerUuid,
          success: false,
          message: "Only description answers can be manually marked",
        });
        continue;
      }

      const calculatedPoints = isCorrect
        ? pointsEarned !== undefined
          ? pointsEarned
          : answer.question.points
        : 0;

      await answer.update({
        isCorrect,
        pointsEarned: calculatedPoints,
        feedback: feedback || null,
      });

      attemptIds.add(answer.attemptId);

      results.push({
        answerUuid,
        success: true,
        message: "Answer marked successfully",
      });
    }

    // Recalculate scores for all affected attempts
    for (const attemptId of attemptIds) {
      const allAnswers = await QuizAnswer.findAll({
        where: { attemptId },
        include: [
          {
            model: QuizQuestion,
            as: "question",
          },
        ],
      });

      let totalPoints = 0;
      let earnedPoints = 0;

      allAnswers.forEach((ans) => {
        totalPoints += ans.question.points;
        if (ans.isCorrect !== null) {
          earnedPoints += ans.pointsEarned || 0;
        }
      });

      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      const attempt = await QuizAttempt.findOne({
        where: { id: attemptId },
        include: [
          {
            model: Quiz,
            as: "quiz",
          },
        ],
      });

      const isPassed = score >= attempt.quiz.passingScore;

      await attempt.update({
        score,
        totalPoints,
        earnedPoints,
        isPassed,
      });
    }

    res.status(200).json({
      success: true,
      message: "Answers marked successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error bulk marking answers:", error);
    res.status(500).json({
      success: false,
      message: "Error bulk marking answers",
      error: error.message,
    });
  }
};

// Get all pending quizzes for grading (Admin/Instructor only)
exports.getPendingQuizzes = async (req, res) => {
  try {
    const { page = 1, limit = 20, moduleId, quizId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      gradingStatus: "pending_grading",
      submittedAt: { [db.Sequelize.Op.ne]: null },
    };

    if (moduleId) {
      const module = await Module.findOne({ where: { uuid: moduleId } });
      if (module) {
        const quizzes = await Quiz.findAll({ where: { moduleId: module.id } });
        whereClause.quizId = quizzes.map((q) => q.id);
      }
    }

    if (quizId) {
      const quiz = await Quiz.findOne({ where: { uuid: quizId } });
      if (quiz) {
        whereClause.quizId = quiz.id;
      }
    }

    const { count, rows: attempts } = await QuizAttempt.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Quiz,
          as: "quiz",
          include: [
            {
              model: Module,
              as: "module",
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "uuid", "name", "email", "phone"],
        },
      ],
      order: [["submittedAt", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      success: true,
      data: attempts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching pending quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending quizzes",
      error: error.message,
    });
  }
};

// Grade a quiz attempt (Admin/Instructor only)
exports.gradeQuizAttempt = async (req, res) => {
  try {
    const { attemptUuid } = req.params;
    const { answers } = req.body; // Array of {answerUuid, isCorrect, pointsEarned, feedback}
    const graderId = req.user.id;

    const attempt = await QuizAttempt.findOne({
      where: { uuid: attemptUuid },
      include: [
        {
          model: Quiz,
          as: "quiz",
        },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    if (attempt.gradingStatus !== "pending_grading") {
      return res.status(400).json({
        success: false,
        message:
          "This quiz has already been graded or does not require grading",
      });
    }

    // Update each answer with grading info
    for (const answerGrade of answers) {
      const answer = await QuizAnswer.findOne({
        where: { uuid: answerGrade.answerUuid },
        include: [
          {
            model: QuizQuestion,
            as: "question",
          },
        ],
      });

      if (answer && answer.attemptId === attempt.id) {
        await answer.update({
          isCorrect: answerGrade.isCorrect,
          pointsEarned: answerGrade.pointsEarned,
          feedback: answerGrade.feedback || null,
        });
      }
    }

    // Recalculate total score
    const allAnswers = await QuizAnswer.findAll({
      where: { attemptId: attempt.id },
      include: [
        {
          model: QuizQuestion,
          as: "question",
        },
      ],
    });

    let totalPoints = 0;
    let earnedPoints = 0;

    allAnswers.forEach((ans) => {
      totalPoints += ans.question.points;
      if (ans.isCorrect !== null && ans.isCorrect) {
        earnedPoints += ans.pointsEarned || 0;
      }
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const isPassed = score >= attempt.quiz.passingScore;

    await attempt.update({
      score,
      totalPoints,
      earnedPoints,
      isPassed,
      gradingStatus: "graded",
      gradedBy: graderId,
      gradedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Quiz graded successfully",
      data: {
        score,
        totalPoints,
        earnedPoints,
        isPassed,
      },
    });
  } catch (error) {
    console.error("Error grading quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error grading quiz",
      error: error.message,
    });
  }
};
