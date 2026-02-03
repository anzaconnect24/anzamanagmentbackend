const { MentorshipApplication, MentorEntreprenuer, User } = require("./models");

(async () => {
  const acceptedApps = await MentorshipApplication.findAll({ 
    where: { status: "ACCEPTED" },
    include: [
      { model: User, as: "mentor", attributes: ["name", "email"] },
      { model: User, as: "entrepreneur", attributes: ["name", "email"] }
    ]
  });
  
  console.log("Accepted Applications:", acceptedApps.length);
  
  for (const app of acceptedApps) {
    const existing = await MentorEntreprenuer.findOne({
      where: {
        mentorId: app.mentorId,
        entreprenuerId: app.entreprenuerId
      }
    });
    
    console.log("\nApplication:", app.uuid);
    console.log("Mentor:", app.mentor?.name);
    console.log("Entrepreneur:", app.entrepreneur?.name);
    console.log("Has MentorEntreprenuer record:", existing ? "YES" : "NO");
    
    if (!existing) {
      console.log("Creating MentorEntreprenuer record...");
      await MentorEntreprenuer.create({
        mentorId: app.mentorId,
        entreprenuerId: app.entreprenuerId,
        approved: true,
      });
      console.log("Created!");
    }
  }
  
  console.log("\nSync complete!");
  process.exit(0);
})();
