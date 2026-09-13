const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const { requireRoles } = require("../../utils/authorization");
const { requirePermission: can } = require("../../utils/capital_access");
const { upload } = require("../../utils/capital_upload");

const requests = require("./capital.requests.controller");
const providers = require("./capital.providers.controller");
const matching = require("./capital.matching.controller");
const introductions = require("./capital.introductions.controller");
const opportunities = require("./capital.opportunities.controller");
const communications = require("./capital.communications.controller");
const documents = require("./capital.documents.controller");
const dueDiligence = require("./capital.duediligence.controller");
const reports = require("./capital.reports.controller");

// Capital facilitation.
//
// Anza staff routes are authorised by permission, not role name, so a System
// Administrator can reconfigure access from the permission matrix. Enterprise
// and capital-provider routes are authorised by role and then by ownership of
// the record inside the controller. Routes that serve several kinds of caller
// (threads, documents, due diligence items) check who the caller is to the
// record in the controller.

const router = Router();
router.use(validateJWT);

const enterprise = requireRoles(["Enterprenuer"]);
const provider = requireRoles(["Investor"]);

// Multer reports a rejected file through next(err), which Express would turn
// into an HTML error page. Answer in the API's own JSON shape instead.
const file = (req, res, next) =>
  upload.single("file")(req, res, (error) =>
    error ? res.status(400).json({ status: false, message: error.message }) : next(),
  );

// ---- Who am I ----------------------------------------------------------------
router.get("/me/permissions", reports.myPermissions);
router.get("/notifications", reports.notifications);

// ---- Dashboard, reports, governance -----------------------------------------
router.get("/options", can("capital.dashboard.view", "capital.requests.view", "capital.opportunities.view"), reports.options);
router.get("/dashboard", can("capital.dashboard.view"), reports.dashboard);
router.get("/reports", can("capital.reports.view"), reports.reports);
router.get("/facilitated", can("capital.reports.view", "capital.outcomes.manage"), reports.capitalFacilitated);
router.get("/enterprises", can("capital.requests.view"), reports.enterprises);
router.get("/managers", can("capital.requests.view", "capital.opportunities.view"), reports.managers);
router.get("/audit", can("capital.audit.view"), reports.auditTrail);
router.get("/settings", can("capital.settings.manage"), reports.getSettings);
router.patch("/settings", can("capital.settings.manage"), reports.updateSettings);
router.get("/permissions", can("capital.permissions.manage"), reports.permissionMatrix);
router.put("/permissions", can("capital.permissions.manage"), reports.setPermission);

// ---- Capital requests ---------------------------------------------------------
router.get("/requests", can("capital.requests.view"), requests.listRequests);
router.get("/requests/:uuid", can("capital.requests.view"), requests.getRequest);
router.patch("/requests/:uuid/review", can("capital.requests.review"), requests.reviewRequest);
// The enterprise to its own request, or a manager to any.
router.post("/requests/:uuid/documents", file, requests.uploadRequestDocument);

// ---- Capital providers ----------------------------------------------------------
router.get("/providers", can("capital.providers.view"), providers.listProviders);
router.post("/providers/sync-investors", can("capital.providers.manage"), providers.syncInvestorProviders);
router.get("/providers/:uuid", can("capital.providers.view"), providers.getProvider);
router.post("/providers", can("capital.providers.manage"), providers.createProvider);
router.patch("/providers/:uuid", can("capital.providers.manage"), providers.updateProvider);

// ---- Matching -----------------------------------------------------------------
router.get("/matching", can("capital.matching.manage"), matching.matchingTable);
router.get("/matching/:uuid", can("capital.matching.manage"), matching.recommendations);
router.post("/matching/:uuid/select", can("capital.matching.manage"), matching.selectProvider);

// ---- Introductions --------------------------------------------------------------
router.get("/introductions", can("capital.introductions.manage"), introductions.listIntroductions);
router.patch("/introductions/:uuid/review", can("capital.introductions.manage"), introductions.reviewIntroduction);

// ---- Opportunities and pipeline ------------------------------------------------
router.get("/opportunities", can("capital.opportunities.view"), opportunities.listOpportunities);
router.get("/pipeline", can("capital.opportunities.view"), opportunities.pipelineBoard);
router.get("/opportunities/:uuid", can("capital.opportunities.view"), opportunities.getOpportunity);
router.patch("/opportunities/:uuid", can("capital.opportunities.manage"), opportunities.updateOpportunity);
router.patch("/opportunities/:uuid/stage", can("capital.opportunities.manage"), opportunities.moveStage);
router.patch("/opportunities/:uuid/provider-response", can("capital.opportunities.manage"), matching.recordProviderResponse);
router.patch("/opportunities/:uuid/communication-mode", can("capital.communications.moderate"), opportunities.setCommunicationMode);
router.post("/opportunities/:uuid/interventions", can("capital.interventions.manage"), opportunities.intervene);
router.patch("/opportunities/:uuid/reopen", can("capital.opportunities.manage"), opportunities.reopenOpportunity);
router.put("/opportunities/:uuid/outcome", can("capital.outcomes.manage"), opportunities.recordOutcome);
router.get("/notes/:type/:uuid", can("capital.notes.manage"), opportunities.listNotes);
router.post("/notes/:type/:uuid", can("capital.notes.manage"), opportunities.addNote);

// ---- Communications -------------------------------------------------------------
router.get("/communications", can("capital.communications.moderate"), communications.communicationCentre);
router.get("/communications/queue", can("capital.communications.moderate"), communications.moderationQueue);
router.patch("/messages/:uuid/moderate", can("capital.communications.moderate"), communications.moderateMessage);
router.get("/opportunities/:uuid/threads", communications.opportunityThreads);
router.get("/threads/:uuid", communications.getThread);
router.post("/threads/:uuid/messages", communications.postMessage);

// ---- Deal rooms and documents -----------------------------------------------------
router.get("/deal-rooms", can("capital.dealrooms.manage"), documents.listDealRooms);
router.post("/opportunities/:uuid/deal-room", can("capital.dealrooms.manage"), documents.createDealRoom);
router.get("/opportunities/:uuid/documents", documents.opportunityDocuments);
router.post("/opportunities/:uuid/documents", file, documents.uploadOpportunityDocument);
router.get("/documents/:uuid", documents.openDocument);
router.patch("/documents/:uuid/visibility", can("capital.dealrooms.manage"), documents.changeVisibility);
router.post("/documents/:uuid/replace", file, documents.replaceDocument);
router.delete("/documents/:uuid", can("capital.dealrooms.manage"), documents.deleteDocument);

// ---- Due diligence ------------------------------------------------------------------
router.get("/due-diligence", can("capital.duediligence.manage"), dueDiligence.listDueDiligence);
router.get("/opportunities/:uuid/due-diligence", dueDiligence.opportunityChecklist);
router.post("/opportunities/:uuid/due-diligence/template", can("capital.duediligence.manage"), dueDiligence.applyTemplate);
router.post("/opportunities/:uuid/due-diligence", can("capital.duediligence.manage"), dueDiligence.createItem);
router.patch("/due-diligence/:uuid/submit", dueDiligence.submitItem);
router.patch("/due-diligence/:uuid", can("capital.duediligence.manage"), dueDiligence.updateItem);
router.delete("/due-diligence/:uuid", can("capital.duediligence.manage"), dueDiligence.deleteItem);

// ---- Enterprise side -------------------------------------------------------------------
router.get("/my/opportunities", enterprise, opportunities.myOpportunities);
router.get("/my/requests", enterprise, requests.myRequests);
router.post("/my/requests", enterprise, requests.createRequest);
router.patch("/my/requests/:uuid", enterprise, requests.updateMyRequest);
router.get("/my/providers", enterprise, introductions.providerDirectory);
router.get("/my/introductions", enterprise, introductions.myIntroductions);
router.post("/my/introductions", enterprise, introductions.requestIntroduction);
router.patch("/my/introductions/:uuid/permission", enterprise, introductions.respondToPermission);

// ---- Capital provider side ----------------------------------------------------------------
router.get("/provider/opportunities", provider, opportunities.myOpportunities);
router.get("/provider/enterprises", provider, introductions.enterpriseDirectory);
router.get("/provider/introductions", provider, introductions.myProviderIntroductions);
router.post("/provider/interests", provider, introductions.expressInterest);

module.exports = router;
