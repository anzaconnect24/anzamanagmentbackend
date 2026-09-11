const assert=require('assert');
const models=require('../../models');
const router=require('./me.routes');
const paths=router.stack.filter(x=>x.route).flatMap(x=>Object.keys(x.route.methods).map(m=>m.toUpperCase()+' '+x.route.path));
const expected=['GET /:uuid/activities','PUT /:uuid/activities/:activityUuid/attendance','GET /:uuid/goals','GET /:uuid/funding','GET /:uuid/employment','GET /:uuid/impact','GET /:uuid/risks','PATCH /:uuid/risks/:recordUuid','GET /:uuid/export','GET /reminders/mine','GET /:uuid/assessment-templates','POST /:uuid/assessment-templates','PATCH /:uuid/assessments/:recordUuid/review','GET /:uuid/data-quality','PATCH /:uuid/data-quality/:recordUuid/resolve'];
expected.forEach(x=>assert(paths.includes(x),'Missing route '+x));
['MeActivity','MeActivityAttendance','MeGoal','MeGoalMilestone','MeFundingLinkage','MeEmploymentRecord','MeImpactRecord','MeRiskFlag','MeReminder','MeAssessmentTemplate','MeAssessmentQuestion'].forEach(x=>assert(models[x],'Missing model '+x));
console.log('26 delivery checks passed');
models.sequelize.close();
