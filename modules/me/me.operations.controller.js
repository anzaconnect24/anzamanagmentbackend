const { Op } = require("sequelize");
const {
  User, Business, CohortProgram, CohortMembership, CohortProgramLead, MeAssessment, MePeriodicReport,
  MeBusinessMetric, MeEvidence, MeDataQualityFlag, MeAssessmentTemplate, MeAssessmentQuestion, MeIndicator, MeIndicatorValue, MeEmploymentRecord, MeFundingLinkage, MeImpactRecord, MeActivity, MeRiskFlag, MeGoal, TrackerSession, sequelize,
} = require("../../models");
const { successResponse, errorResponse } = require("../../utils/responses");
const path=require("path");

// Monitoring & Evaluation is owned by the M&E Officer ("ME") alone. Neither
// Staff nor Admin configure or verify M&E data.
const ME_MANAGERS = ["ME"];
const isMeManager = (req) => ME_MANAGERS.includes(req.user?.role);
const fail = (res, code, message) => res.status(code).json({ status: false, message });
const programme = (uuid) => CohortProgram.findOne({ where: { uuid, archivedAt: null } });

async function scope(req, res, { businessUuid, requireBusiness = false } = {}) {
  const program = await programme(req.params.uuid);
  if (!program) { fail(res, 404, "Program not found"); return null; }
  if (["Finance", "Mentor"].includes(req.user.role)) {
    const assigned = await CohortProgramLead.findOne({ where: { cohortProgramId: program.id, userId: req.user.id } });
    if (!assigned) { fail(res, 403, "You are not assigned to this program"); return null; }
  }
  let business = null;
  if (req.user.role === "Enterprenuer") business = await Business.findOne({ where: { userId: req.user.id } });
  else if (businessUuid) business = await Business.findOne({ where: { uuid: businessUuid } });
  if (requireBusiness && !business) { fail(res, 404, "Business not found"); return null; }
  if (business) {
    const membership = await CohortMembership.findOne({ where: { cohortProgramId: program.id, businessId: business.id } });
    if (!membership) { fail(res, 403, "Business is not enrolled in this program"); return null; }
    return { program, business, membership };
  }
  return { program };
}

const reportFields = ["reportingPeriod", "periodStart", "periodEnd", "dueDate", "revenue", "employees", "jobsCreated", "customersServed", "fundingReceived", "partnershipsEstablished", "marketsEntered", "keyMilestone", "biggestChallenge", "supportRequired", "comments"];
const pick = (body, fields) => Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
const evidenceLinkExists=async(ctx,type,uuid)=>{const t=String(type||"").toLowerCase();if(["report","periodic_report"].includes(t))return !!await MePeriodicReport.findOne({where:{uuid,cohortProgramId:ctx.program.id,businessId:ctx.business.id}});if(t==="assessment")return !!await MeAssessment.findOne({where:{uuid,cohortProgramId:ctx.program.id,businessId:ctx.business.id}});if(t==="goal")return !!await MeGoal.findOne({where:{uuid,cohortProgramId:ctx.program.id,businessId:ctx.business.id}});if(t==="funding")return !!await MeFundingLinkage.findOne({where:{uuid,cohortProgramId:ctx.program.id,businessId:ctx.business.id}});if(t==="impact")return !!await MeImpactRecord.findOne({where:{uuid,cohortProgramId:ctx.program.id,businessId:ctx.business.id}});if(["business_metric","metric"].includes(t))return !!await MeBusinessMetric.findOne({where:{uuid,cohortProgramId:ctx.program.id,businessId:ctx.business.id}});if(t==="activity")return !!await MeActivity.findOne({where:{uuid,cohortProgramId:ctx.program.id}});if(["mentorship","mentorship_action"].includes(t))return !!await TrackerSession.findOne({where:{uuid,cohortProgramId:ctx.program.id,businessId:ctx.business.id}});return false;};

exports.portfolioDashboard = async (req, res) => {
  try {
    const pWhere = { archivedAt: null, ...(req.query.status ? { status: req.query.status } : {}) };
    const programs = await CohortProgram.findAll({ where: pWhere, attributes: ["id", "uuid", "title", "targetParticipants", "status"], raw: true });
    const ids = programs.map((x) => x.id);
    const empty = {
      programmes: 0, entrepreneursSupported: 0, activeBusinesses: 0, jobsCreated: 0,
      capitalMobilised: 0, activitiesCompleted: 0, openRisks: 0, programmesData: [],
      gender: { male: 0, female: 0 }, workforce: { permanent: 0, temporary: 0, youth: 0, withDisabilities: 0 },
      geography: { locations: 0, rows: [] }, dataCollection: { collected: 0, pending: 0, rate: 0 },
      submissionTrend: [], fieldOfficers: { active: 0, rows: [] }, feedback: [],
    };
    if (!ids.length) return successResponse(res, empty);

    const inPrograms = { cohortProgramId: { [Op.in]: ids } };
    const verifiedOnly = { ...inPrograms, verificationStatus: "verified" };

    const memberships = await CohortMembership.findAll({ where: inPrograms, attributes: ["businessId", "cohortProgramId", "status", "completionStatus"], raw: true });
    const businessIds = [...new Set(memberships.map((x) => x.businessId))];

    // A reporting period counts as collected once the startup has submitted it;
    // a draft or an overdue period is still outstanding.
    const COLLECTED = ["submitted", "under_review", "verified"];
    const PENDING = ["draft", "overdue"];

    // Six calendar months back, including the current one.
    const now = new Date();
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const [jobs, capital, activities, risks, employment, businesses, collected, pending, submissions, leads, reportTexts] = await Promise.all([
      MeEmploymentRecord.sum("jobsCreated", { where: verifiedOnly }),
      MeFundingLinkage.sum("amountReceived", { where: { ...inPrograms, status: "funded" } }),
      MeActivity.count({ where: { ...inPrograms, status: "completed" } }),
      MeRiskFlag.count({ where: { ...inPrograms, status: "open" } }),
      // Workforce composition is self-reported per period, so it is counted
      // from verified rows only - the same bar the headline jobs figure uses.
      MeEmploymentRecord.findAll({ where: verifiedOnly, attributes: ["permanentMale", "permanentFemale", "temporaryMale", "temporaryFemale", "youthEmployees", "employeesWithDisabilities"], raw: true }),
      businessIds.length ? Business.findAll({ where: { id: { [Op.in]: businessIds } }, attributes: ["id", "name", "location"], raw: true }) : [],
      MePeriodicReport.count({ where: { ...inPrograms, status: { [Op.in]: COLLECTED } } }),
      MePeriodicReport.count({ where: { ...inPrograms, status: { [Op.in]: PENDING } } }),
      MePeriodicReport.findAll({ where: { ...inPrograms, createdAt: { [Op.gte]: trendStart } }, attributes: ["createdAt"], raw: true }),
      CohortProgramLead.findAll({ where: inPrograms, attributes: ["userId"], include: [{ model: User, attributes: ["uuid", "name", "image"] }] }),
      MePeriodicReport.findAll({ where: { ...inPrograms, status: "verified" }, attributes: ["uuid", "keyMilestone", "biggestChallenge", "reportingPeriod", "businessId"], order: [["updatedAt", "DESC"]], limit: 12, raw: true }),
    ]);

    const total = (key) => employment.reduce((acc, row) => acc + Number(row[key] || 0), 0);
    const gender = {
      male: total("permanentMale") + total("temporaryMale"),
      female: total("permanentFemale") + total("temporaryFemale"),
    };
    const workforce = {
      permanent: total("permanentMale") + total("permanentFemale"),
      temporary: total("temporaryMale") + total("temporaryFemale"),
      youth: total("youthEmployees"),
      withDisabilities: total("employeesWithDisabilities"),
    };

    // Business.location is a single free-text field, so this is a tally of the
    // locations startups actually recorded, not a province/district hierarchy.
    const byLocation = new Map();
    for (const b of businesses) {
      const key = String(b.location || "").trim() || "Not recorded";
      byLocation.set(key, (byLocation.get(key) || 0) + 1);
    }
    const geography = {
      locations: [...byLocation.keys()].filter((k) => k !== "Not recorded").length,
      rows: [...byLocation.entries()]
        .map(([location, count]) => ({ location, businesses: count }))
        .sort((a, b) => b.businesses - a.businesses),
    };

    const trend = new Map();
    for (let i = 0; i < 6; i += 1) {
      trend.set(monthOf(new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)), 0);
    }
    for (const row of submissions) {
      const key = monthOf(new Date(row.createdAt));
      if (trend.has(key)) trend.set(key, trend.get(key) + 1);
    }
    const submissionTrend = [...trend.entries()].map(([month, count]) => ({ month, count }));

    // One row per person leading a programme, with the coaching sessions they
    // logged this month and the date of their most recent one.
    const officerIds = [...new Set(leads.map((x) => x.userId).filter(Boolean))];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sessions = officerIds.length
      ? await TrackerSession.findAll({ where: { createdById: { [Op.in]: officerIds } }, attributes: ["createdById", "sessionDate"], raw: true })
      : [];
    const officerRows = officerIds
      .map((userId) => {
        const person = leads.find((x) => x.userId === userId)?.User;
        const mine = sessions.filter((s) => s.createdById === userId);
        const dates = mine.map((s) => s.sessionDate).filter(Boolean).sort();
        return {
          uuid: person?.uuid || String(userId),
          name: person?.name || "Unknown",
          image: person?.image || null,
          reportsThisMonth: mine.filter((s) => s.sessionDate && new Date(s.sessionDate) >= monthStart).length,
          lastSubmission: dates.length ? dates[dates.length - 1] : null,
        };
      })
      .sort((a, b) => b.reportsThisMonth - a.reportsThisMonth);

    // Verbatim lines the startups wrote on their own verified reports. Nothing
    // is generated here - an empty list means nobody has written one yet.
    const businessById = new Map(businesses.map((b) => [b.id, b]));
    const feedback = reportTexts
      .flatMap((row) => [
        { uuid: `${row.uuid}-milestone`, kind: "milestone", text: row.keyMilestone, period: row.reportingPeriod, business: businessById.get(row.businessId)?.name || null },
        { uuid: `${row.uuid}-challenge`, kind: "challenge", text: row.biggestChallenge, period: row.reportingPeriod, business: businessById.get(row.businessId)?.name || null },
      ])
      .filter((x) => String(x.text || "").trim())
      .slice(0, 6);

    const programmesData = programs.map((p) => {
      const rows = memberships.filter((x) => x.cohortProgramId === p.id);
      const done = rows.filter((x) => x.completionStatus === "completed").length;
      return {
        uuid: p.uuid,
        title: p.title,
        status: p.status,
        target: p.targetParticipants,
        enrolled: rows.length,
        active: rows.filter((x) => x.status === "active").length,
        completionRate: rows.length ? Math.round((done / rows.length) * 100) : 0,
      };
    });

    successResponse(res, {
      programmes: programs.length,
      entrepreneursSupported: businessIds.length,
      activeBusinesses: new Set(memberships.filter((x) => x.status === "active").map((x) => x.businessId)).size,
      jobsCreated: Number(jobs || 0),
      capitalMobilised: Number(capital || 0),
      activitiesCompleted: activities,
      openRisks: risks,
      gender,
      workforce,
      geography,
      dataCollection: {
        collected,
        pending,
        rate: collected + pending ? Math.round((collected / (collected + pending)) * 100) : 0,
      },
      submissionTrend,
      fieldOfficers: { active: officerRows.length, rows: officerRows.slice(0, 8) },
      feedback,
      programmesData,
    });
  } catch (e) {
    errorResponse(res, e);
  }
};

exports.dashboardV2=async(req,res)=>{try{const ctx=await scope(req,res);if(!ctx)return;const pid=ctx.program.id,now=new Date();const [participants,active,completed,reportsSubmitted,reportsVerified,reportsOverdue,assessments,baselines,endlines,evidencePending,qualityFlags,activitiesCompleted,openRisks,jobsCreated,capitalMobilised]=await Promise.all([CohortMembership.count({where:{cohortProgramId:pid}}),CohortMembership.count({where:{cohortProgramId:pid,status:"active"}}),CohortMembership.count({where:{cohortProgramId:pid,completionStatus:"completed"}}),MePeriodicReport.count({where:{cohortProgramId:pid,status:{[Op.in]:["submitted","under_review","verified"]}}}),MePeriodicReport.count({where:{cohortProgramId:pid,status:"verified"}}),MePeriodicReport.count({where:{cohortProgramId:pid,dueDate:{[Op.lt]:now},status:{[Op.in]:["draft","submitted","overdue"]}}}),MeAssessment.count({where:{cohortProgramId:pid}}),MeAssessment.count({where:{cohortProgramId:pid,assessmentType:"baseline",status:"verified"}}),MeAssessment.count({where:{cohortProgramId:pid,assessmentType:"endline",status:"verified"}}),MeEvidence.count({where:{cohortProgramId:pid,verificationStatus:"pending"}}),MeDataQualityFlag.count({where:{cohortProgramId:pid,status:"open"}}),MeActivity.count({where:{cohortProgramId:pid,status:"completed"}}),MeRiskFlag.count({where:{cohortProgramId:pid,status:"open"}}),MeEmploymentRecord.sum("jobsCreated",{where:{cohortProgramId:pid,verificationStatus:"verified"}}),MeFundingLinkage.sum("amountReceived",{where:{cohortProgramId:pid,status:"funded"}})]);successResponse(res,{participants,activeParticipants:active,completionRate:participants?Math.round(completed/participants*100):0,reportsSubmitted,reportsVerified,reportsOverdue,assessments,baselineCompletion:participants?Math.round(baselines/participants*100):null,endlineCompletion:participants?Math.round(endlines/participants*100):null,evidencePending,openDataQualityFlags:qualityFlags,activitiesCompleted,openRisks,jobsCreated:Number(jobsCreated||0),capitalMobilised:Number(capitalMobilised||0)});}catch(e){errorResponse(res,e);}};

exports.listAssessmentTemplates=async(req,res)=>{try{const ctx=await scope(req,res);if(!ctx)return;successResponse(res,await MeAssessmentTemplate.findAll({where:{cohortProgramId:ctx.program.id,active:true},include:[{model:MeAssessmentQuestion,as:"questions"}],order:[["createdAt","DESC"],[{model:MeAssessmentQuestion,as:"questions"},"position","ASC"]]}));}catch(e){errorResponse(res,e);}};
exports.mentorshipSummary=async(req,res)=>{try{const ctx=await scope(req,res,{businessUuid:req.query.businessUuid});if(!ctx)return;const where={cohortProgramId:ctx.program.id,...(ctx.business?{businessId:ctx.business.id}:{})},rows=await TrackerSession.findAll({where,order:[["sessionDate","DESC"]]}),minutes=rows.reduce((s,x)=>s+Number(x.durationMinutes||0),0),actions=rows.filter(x=>x.actionsAgreed),completed=actions.filter(x=>x.actionStatus==="completed").length,overdue=actions.filter(x=>x.actionDeadline&&new Date(x.actionDeadline)<new Date()&&x.actionStatus!=="completed").length;successResponse(res,{data:rows,totalSessions:rows.length,mentorshipHours:Math.round(minutes/6)/10,entrepreneursMentored:new Set(rows.map(x=>x.businessId)).size,actionCompletionRate:actions.length?Math.round(completed/actions.length*100):null,overdueActions:overdue});}catch(e){errorResponse(res,e);}};
exports.entrepreneurDashboard=async(req,res)=>{try{const ctx=await scope(req,res,{requireBusiness:true});if(!ctx)return;const pid=ctx.program.id,bid=ctx.business.id,now=new Date();const [goals,reportsDue,reportsVerified,assessments,sessions,evidencePending,risks,latestMetrics]=await Promise.all([MeGoal.findAll({where:{cohortProgramId:pid,businessId:bid},attributes:["uuid","title","progressPercentage","status","targetDate"],order:[["targetDate","ASC"]]}),MePeriodicReport.count({where:{cohortProgramId:pid,businessId:bid,dueDate:{[Op.gte]:now},status:"draft"}}),MePeriodicReport.count({where:{cohortProgramId:pid,businessId:bid,status:"verified"}}),MeAssessment.findAll({where:{cohortProgramId:pid,businessId:bid},attributes:["assessmentType","assessmentDate","status","capabilityScores"],order:[["assessmentDate","DESC"]]}),TrackerSession.findAll({where:{cohortProgramId:pid,businessId:bid},attributes:["uuid","sessionDate","topic","actionsAgreed","actionDeadline","actionStatus"],order:[["sessionDate","DESC"]],limit:5}),MeEvidence.count({where:{cohortProgramId:pid,businessId:bid,verificationStatus:"pending"}}),MeRiskFlag.findAll({where:{cohortProgramId:pid,businessId:bid,status:{[Op.ne]:"closed"}},attributes:["riskLevel","reasons","status"]}),MeBusinessMetric.findAll({where:{cohortProgramId:pid,businessId:bid,verificationStatus:"verified"},order:[["reportingDate","DESC"]],limit:20})]);successResponse(res,{goals,reportsDue,reportsVerified,assessments,sessions,evidencePending,risks,latestMetrics});}catch(e){errorResponse(res,e);}};
exports.listDataQuality=async(req,res)=>{try{const ctx=await scope(req,res);if(!ctx)return;const where={cohortProgramId:ctx.program.id,...(req.query.status?{status:req.query.status}:{})};successResponse(res,await MeDataQualityFlag.findAll({where,order:[["detectedAt","DESC"]]}));}catch(e){errorResponse(res,e);}};
exports.resolveDataQuality=async(req,res)=>{try{if(!isMeManager(req))return fail(res,403,"Not allowed");const ctx=await scope(req,res);if(!ctx)return;const flag=await MeDataQualityFlag.findOne({where:{uuid:req.params.recordUuid,cohortProgramId:ctx.program.id}});if(!flag)return fail(res,404,"Data-quality flag not found");await flag.update({status:"resolved",resolvedById:req.user.id,resolvedAt:new Date(),resolutionNotes:req.body.notes||null});successResponse(res,flag);}catch(e){errorResponse(res,e);}};
exports.saveAssessmentTemplate=async(req,res)=>{const transaction=await sequelize.transaction();try{if(!isMeManager(req)){await transaction.rollback();return fail(res,403,"Not allowed");}const ctx=await scope(req,res);if(!ctx){await transaction.rollback();return;}if(!String(req.body.name||"").trim()){await transaction.rollback();return fail(res,400,"Template name is required");}const template=await MeAssessmentTemplate.create({cohortProgramId:ctx.program.id,name:req.body.name,assessmentType:req.body.assessmentType||"custom",description:req.body.description||null,scoringScale:Math.max(2,Math.min(10,Number(req.body.scoringScale)||5)),createdById:req.user.id},{transaction});const questions=Array.isArray(req.body.questions)?req.body.questions:[];for(let i=0;i<questions.length;i++){const q=questions[i];if(String(q.question||"").trim())await MeAssessmentQuestion.create({templateId:template.id,area:q.area||"General",question:q.question,responseType:q.responseType||"scale",required:q.required!==false,weight:Number(q.weight)||1,options:q.options||null,position:i},{transaction});}await transaction.commit();successResponse(res,await MeAssessmentTemplate.findByPk(template.id,{include:[{model:MeAssessmentQuestion,as:"questions"}]}));}catch(e){await transaction.rollback();errorResponse(res,e);}};

exports.reviewAssessment=async(req,res)=>{try{if(!isMeManager(req))return fail(res,403,"Not allowed");const ctx=await scope(req,res);if(!ctx)return;const status=String(req.body.status||"");if(!["verified","rejected"].includes(status))return fail(res,400,"Status must be verified or rejected");const record=await MeAssessment.findOne({where:{uuid:req.params.recordUuid,cohortProgramId:ctx.program.id}});if(!record)return fail(res,404,"Assessment not found");await record.update({status,verifiedById:req.user.id,verifiedAt:new Date(),reviewComments:req.body.comments||null});if(record.assessmentType==="baseline"&&status==="verified")await CohortMembership.update({baselineCompleted:true},{where:{cohortProgramId:ctx.program.id,businessId:record.businessId}});if(record.assessmentType==="endline"&&status==="verified")await CohortMembership.update({endlineCompleted:true},{where:{cohortProgramId:ctx.program.id,businessId:record.businessId}});successResponse(res,record);}catch(e){errorResponse(res,e);}};

exports.listReports = async (req, res) => { try {
  const ctx = await scope(req, res, { businessUuid: req.query.businessUuid }); if (!ctx) return;
  const where = { cohortProgramId: ctx.program.id, ...(ctx.business ? { businessId: ctx.business.id } : {}) };
  if (req.query.status) where.status = req.query.status;
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await MePeriodicReport.findAndCountAll({ where, order: [["periodEnd", "DESC"], ["createdAt", "DESC"]], limit, offset: (page - 1) * limit });
  successResponse(res, { data: result.rows, total: result.count, page, totalPages: Math.ceil(result.count / limit) });
} catch (e) { errorResponse(res, e); } };

exports.saveReport = async (req, res) => { try {
  const ctx = await scope(req, res, { businessUuid: req.body.businessUuid, requireBusiness: true }); if (!ctx) return;
  if (!isMeManager(req) && req.user.role !== "Enterprenuer") return fail(res, 403, "Not allowed");
  const values = pick(req.body, reportFields);
  if (!String(values.reportingPeriod || "").trim()) return fail(res, 400, "Reporting period is required");
  if(values.periodStart&&values.periodEnd&&new Date(values.periodEnd)<new Date(values.periodStart))return fail(res,400,"Period end cannot be before period start");
  for(const field of ["revenue","employees","jobsCreated","customersServed","fundingReceived","partnershipsEstablished","marketsEntered"])if(values[field]!==undefined&&values[field]!==null&&(!Number.isFinite(Number(values[field]))||Number(values[field])<0))return fail(res,400,`${field} must be a non-negative number`);
  const [record] = await MePeriodicReport.findOrCreate({ where: { cohortProgramId: ctx.program.id, businessId: ctx.business.id, reportingPeriod: values.reportingPeriod }, defaults: { ...values, cohortMembershipId: ctx.membership.id, submittedById: req.user.id } });
  if (record.status !== "draft" && !isMeManager(req)) return fail(res, 409, "Only draft reports can be edited");
  await record.update(values); successResponse(res, record);
} catch (e) { errorResponse(res, e); } };

exports.submitReport = async (req, res) => { const transaction = await sequelize.transaction(); try {
  const ctx = await scope(req, res, { requireBusiness: req.user.role === "Enterprenuer" }); if (!ctx) { await transaction.rollback(); return; }
  const record = await MePeriodicReport.findOne({ where: { uuid: req.params.recordUuid, cohortProgramId: ctx.program.id, ...(ctx.business ? { businessId: ctx.business.id } : {}) }, transaction });
  if (!record) { await transaction.rollback(); return fail(res, 404, "Report not found"); }
  if (record.status !== "draft" && record.status !== "rejected") { await transaction.rollback(); return fail(res, 409, "Report is already submitted"); }
  await record.update({ status: "submitted", submittedAt: new Date(), submittedById: req.user.id }, { transaction });
  const metrics = [["revenue", record.revenue, "currency"], ["employees", record.employees, "people"], ["jobs_created", record.jobsCreated, "jobs"], ["customers", record.customersServed, "customers"], ["funding", record.fundingReceived, "currency"]];
  for (const [metricCode, numericValue, unit] of metrics) if (numericValue !== null) await MeBusinessMetric.create({ cohortProgramId: ctx.program.id, businessId: record.businessId, reportId: record.id, metricCode, reportingDate: record.periodEnd || new Date(), numericValue, unit, verificationStatus: "pending", recordedById: req.user.id }, { transaction });
  const previous=await MeBusinessMetric.findOne({where:{cohortProgramId:ctx.program.id,businessId:record.businessId,metricCode:"revenue",verificationStatus:"verified"},order:[["reportingDate","DESC"]],transaction});
  if(previous&&Number(previous.numericValue)>0&&Number(record.revenue)>Number(previous.numericValue)*3)await MeDataQualityFlag.create({cohortProgramId:ctx.program.id,businessId:record.businessId,entityType:"periodic_report",entityUuid:record.uuid,ruleCode:"revenue_spike",severity:"warning",message:"Revenue is more than three times the last verified value; review supporting evidence."},{transaction});
  await transaction.commit(); successResponse(res, record);
} catch (e) { await transaction.rollback(); errorResponse(res, e); } };

exports.reviewReport = async (req, res) => { try {
  if (!isMeManager(req)) return fail(res, 403, "Not allowed"); const ctx = await scope(req, res); if (!ctx) return;
  const status = String(req.body.status || ""); if (!["under_review", "verified", "rejected"].includes(status)) return fail(res, 400, "Status must be under_review, verified or rejected");
  const record = await MePeriodicReport.findOne({ where: { uuid: req.params.recordUuid, cohortProgramId: ctx.program.id } }); if (!record) return fail(res, 404, "Report not found");
  await record.update({ status, reviewedById: req.user.id, reviewedAt: new Date(), reviewComments: req.body.comments || null });
  await MeBusinessMetric.update({ verificationStatus: status === "verified" ? "verified" : status === "rejected" ? "rejected" : "pending" }, { where: { reportId: record.id } });
  if(status==="verified"){const metrics=await MeBusinessMetric.findAll({where:{reportId:record.id}}),indicators=await MeIndicator.findAll({where:{cohortProgramId:ctx.program.id,status:"active"}}),byCode=new Map(indicators.map(x=>[String(x.code||"").toLowerCase(),x]));for(const metric of metrics){const indicator=byCode.get(String(metric.metricCode).toLowerCase());if(indicator&&metric.numericValue!==null)await MeIndicatorValue.findOrCreate({where:{indicatorId:indicator.id,businessId:record.businessId,origin:"enterprise_report",submittedAt:record.submittedAt},defaults:{value:metric.numericValue,verifiedValue:metric.numericValue,verificationStatus:"verified",verifiedById:req.user.id,verifiedAt:new Date(),submittedById:record.submittedById}});}}
  successResponse(res, record);
} catch (e) { errorResponse(res, e); } };

exports.listAssessments = async (req, res) => { try { const ctx = await scope(req, res, { businessUuid: req.query.businessUuid }); if (!ctx) return; const rows = await MeAssessment.findAll({ where: { cohortProgramId: ctx.program.id, ...(ctx.business ? { businessId: ctx.business.id } : {}) }, order: [["assessmentDate", "ASC"]] }); successResponse(res, rows); } catch (e) { errorResponse(res, e); } };
exports.saveAssessment = async (req, res) => { try {
  const ctx = await scope(req, res, { businessUuid: req.body.businessUuid, requireBusiness: true }); if (!ctx) return;
  const type = String(req.body.assessmentType || "").toLowerCase(); if (!["baseline", "midline", "endline", "custom"].includes(type)) return fail(res, 400, "Invalid assessment type");
  const template=req.body.templateUuid?await MeAssessmentTemplate.findOne({where:{uuid:req.body.templateUuid,cohortProgramId:ctx.program.id,active:true}}):null;if(req.body.templateUuid&&!template)return fail(res,404,"Assessment template not found");const scale=Number(template?.scoringScale||5),scores=req.body.capabilityScores||{};for(const [area,value] of Object.entries(scores))if(!Number.isFinite(Number(value))||Number(value)<1||Number(value)>scale)return fail(res,400,`${area} score must be between 1 and ${scale}`);
  const record = await MeAssessment.create({ cohortProgramId: ctx.program.id, cohortMembershipId: ctx.membership.id, businessId: ctx.business.id, templateId:template?.id||null, assessorId: req.user.id, assessmentType: type, assessmentDate: req.body.assessmentDate || new Date(), status: req.body.status === "submitted" ? "submitted" : "draft", performanceMetrics: req.body.performanceMetrics || {}, capabilityScores: scores, answers: req.body.answers || {}, notes: req.body.notes || null, submittedAt: req.body.status === "submitted" ? new Date() : null }); successResponse(res, record);
} catch (e) { errorResponse(res, e); } };

exports.compareAssessments = async (req, res) => { try { const ctx = await scope(req, res, { businessUuid: req.query.businessUuid, requireBusiness: true }); if (!ctx) return; const rows = await MeAssessment.findAll({ where: { cohortProgramId: ctx.program.id, businessId: ctx.business.id, status: "verified" }, order: [["assessmentDate", "ASC"]] }); const first = rows[0], latest = rows[rows.length - 1]; const compare=(a={},b={})=>[...new Set([...Object.keys(a),...Object.keys(b)])].map(metric=>{const baseline=Number(a[metric]),current=Number(b[metric]);return{metric,baseline,current,absoluteChange:current-baseline,percentageChange:baseline===0?null:Math.round(((current-baseline)/baseline)*1000)/10}});const changes=compare(first?.performanceMetrics,latest?.performanceMetrics),capabilityChanges=compare(first?.capabilityScores,latest?.capabilityScores); successResponse(res, { baseline: first || null, current: latest || null, changes, capabilityChanges }); } catch (e) { errorResponse(res, e); } };

exports.metrics = async (req, res) => { try { const ctx = await scope(req, res, { businessUuid: req.query.businessUuid }); if (!ctx) return; const where = { ...(ctx.business ? { businessId: ctx.business.id } : { cohortProgramId: ctx.program.id }), ...(req.query.metricCode ? { metricCode: req.query.metricCode } : {}) }; successResponse(res, await MeBusinessMetric.findAll({ where, order: [["reportingDate", "ASC"]] })); } catch (e) { errorResponse(res, e); } };
exports.listEvidence = async (req, res) => { try { const ctx = await scope(req, res, { businessUuid: req.query.businessUuid }); if (!ctx) return; successResponse(res, await MeEvidence.findAll({ where: { cohortProgramId: ctx.program.id, ...(ctx.business ? { businessId: ctx.business.id } : {}) }, order: [["createdAt", "DESC"]] })); } catch (e) { errorResponse(res, e); } };
exports.addEvidence = async (req, res) => { try { const ctx = await scope(req, res, { businessUuid: req.body.businessUuid, requireBusiness: true }); if (!ctx) return; if (!req.body.fileUrl || !req.body.entityUuid) return fail(res, 400, "File and linked record are required");if(!await evidenceLinkExists(ctx,req.body.entityType,req.body.entityUuid))return fail(res,400,"Linked record is invalid or outside this business"); successResponse(res, await MeEvidence.create({ cohortProgramId: ctx.program.id, businessId: ctx.business.id, entityType: req.body.entityType, entityUuid: req.body.entityUuid, evidenceType: req.body.evidenceType || "other", fileUrl: req.body.fileUrl, description: req.body.description, uploadedById: req.user.id })); } catch (e) { errorResponse(res, e); } };
exports.reviewEvidence = async (req,res) => { try { if (!isMeManager(req)) return fail(res,403,"Not allowed"); const ctx=await scope(req,res); if(!ctx)return; const status=String(req.body.status||""); if(!["verified","rejected"].includes(status))return fail(res,400,"Status must be verified or rejected"); const record=await MeEvidence.findOne({where:{uuid:req.params.recordUuid,cohortProgramId:ctx.program.id}}); if(!record)return fail(res,404,"Evidence not found"); await record.update({verificationStatus:status,verifiedById:req.user.id,verifiedAt:new Date(),rejectionReason:status==="rejected"?(req.body.comments||"Evidence rejected"):null}); successResponse(res,record); } catch(e){errorResponse(res,e);} };
exports.uploadEvidence=async(req,res)=>{try{const ctx=await scope(req,res,{businessUuid:req.body.businessUuid,requireBusiness:true});if(!ctx)return;if(!req.file)return fail(res,400,"Evidence file is required");if(!req.body.entityUuid||!req.body.entityType)return fail(res,400,"Linked record type and UUID are required");if(!await evidenceLinkExists(ctx,req.body.entityType,req.body.entityUuid))return fail(res,400,"Linked record is invalid or outside this business");const record=await MeEvidence.create({cohortProgramId:ctx.program.id,businessId:ctx.business.id,entityType:req.body.entityType,entityUuid:req.body.entityUuid,evidenceType:req.body.evidenceType||"other",fileUrl:"pending",storageKey:req.file.filename,description:req.body.description||null,uploadedById:req.user.id});await record.update({fileUrl:`/me/${ctx.program.uuid}/evidence/${record.uuid}/file`});successResponse(res,record);}catch(e){errorResponse(res,e);}};
exports.downloadEvidence=async(req,res)=>{try{const ctx=await scope(req,res);if(!ctx)return;const record=await MeEvidence.findOne({where:{uuid:req.params.recordUuid,cohortProgramId:ctx.program.id,...(ctx.business?{businessId:ctx.business.id}:{})}});if(!record||!record.storageKey)return fail(res,404,"Evidence file not found");res.sendFile(path.resolve(__dirname,"../../files",record.storageKey));}catch(e){errorResponse(res,e);}};
const csvCell=(v)=>`"${String(v??"").replace(/"/g,'""')}"`;
exports.exportData = async (req,res) => { try { const ctx=await scope(req,res);if(!ctx)return;const type=String(req.query.type||"reports");let rows,columns;if(type==="assessments"){rows=await MeAssessment.findAll({where:{cohortProgramId:ctx.program.id},raw:true});columns=["uuid","businessId","assessmentType","assessmentDate","status","notes"];}else if(type==="metrics"){rows=await MeBusinessMetric.findAll({where:{cohortProgramId:ctx.program.id},raw:true});columns=["uuid","businessId","metricCode","reportingDate","numericValue","textValue","unit","verificationStatus"];}else{rows=await MePeriodicReport.findAll({where:{cohortProgramId:ctx.program.id},raw:true});columns=["uuid","businessId","reportingPeriod","periodStart","periodEnd","revenue","employees","jobsCreated","customersServed","fundingReceived","status"];}const csv=[columns.map(csvCell).join(","),...rows.map(r=>columns.map(c=>csvCell(r[c])).join(","))].join("\n");res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition",`attachment; filename=me-${type}-${new Date().toISOString().slice(0,10)}.csv`);res.send(csv);}catch(e){errorResponse(res,e);} };
exports.dashboard = async (req, res) => { try { const ctx = await scope(req, res); if (!ctx) return; const pid = ctx.program.id; const [participants, reports, overdue, assessments, baselines, evidence, flags] = await Promise.all([CohortMembership.count({ where: { cohortProgramId: pid } }), MePeriodicReport.count({ where: { cohortProgramId: pid, status: "verified" } }), MePeriodicReport.count({ where: { cohortProgramId: pid, [Op.or]: [{ status: "overdue" }, { dueDate: { [Op.lt]: new Date() }, status: { [Op.in]: ["draft", "submitted"] } }] } }), MeAssessment.count({ where: { cohortProgramId: pid } }), MeAssessment.count({ where: { cohortProgramId: pid, assessmentType: "baseline", status: "verified" } }), MeEvidence.count({ where: { cohortProgramId: pid, verificationStatus: "pending" } }), MeDataQualityFlag.count({ where: { cohortProgramId: pid, status: "open" } })]); successResponse(res, { participants, reportsVerified: reports, reportsOverdue: overdue, assessments, baselineCompletion: participants ? Math.round((baselines / participants) * 100) : null, evidencePending: evidence, openDataQualityFlags: flags }); } catch (e) { errorResponse(res, e); } };
