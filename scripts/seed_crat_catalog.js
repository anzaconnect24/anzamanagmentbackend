/* eslint-disable no-console */
require("dotenv").config();
const { sequelize, CratQuestionCatalog } = require("../models");

// NOTE: Question-level weights are intentionally omitted by design.
const REQUIRED_ATTACHMENTS = {
  "CM-001":
    "Pitch deck or product overview document (including roadmap & pricing)",
  "CM-002":
    "Market sizing and mapping report (industry research or internal analysis)",
  "CM-003":
    "Revenue reports (monthly/quarterly) with customer segment breakdown",
  "CM-004": "Pitch deck or competitive analysis or SWOT document",
  "CM-005":
    "Marketing strategy document (including brand guidelines if available)",
  "FI-001": "Profit and Loss statement (12-36 months)",
  "FI-002": "Balance Sheet (12-36 months)",
  "FI-003": "Cash Flow statement (12-36 months)",
  "FI-004": "Financial model or budget with clearly stated assumptions",
  "FI-005": "Internal controls policy or strategy",
  "OP-001": "Organization profile or pitch deck",
  "OP-002": "Description or screenshot of MIS or CRM system in use",
  "OP-003": "Quality control standard operating procedure or QA reports",
  "OP-004": "Business strategy or plan document (with KPIs)",
  "LE-001": "Certificate of Incorporation (BRELA)",
  "LE-002": "Memorandum and Articles of Association (MEMARTS)",
  "LE-003": "TIN Certificate (TRA)",
  "LE-004": "Tax Clearance Certificate (current year)",
  "LE-005": "Business License (current year)",
  "LE-006": "Sector-specific license or regulatory approval (if applicable)",
  "LE-007": "Signed MoU or Partnership Agreement (if applicable)",
  "LE-008": "Sample contracts: customer, supplier, and partnership agreements",
  "LE-009": "IP registration certificates, NDA templates, or IP policy",
  "LE-010":
    "Board member list with CVs, recent board minutes, and governance charter",
  "LE-FIN-001": "Certificate of Incorporation (BRELA)",
  "LE-FIN-002": "Memorandum and Articles of Association (MEMARTS)",
  "LE-FIN-003": "TIN Certificate (TRA)",
  "LE-FIN-004": "Tax Clearance Certificate (current year) - TRA",
  "LE-FIN-005": "Business License (current year)",
  "LE-FIN-006":
    "BOT Payment Systems Licence or EMI Licence (current, showing category and validity)",
  "LE-FIN-007":
    "AML/CFT and KYC policy, compliance officer appointment letter, and evidence of STR reporting system",
  "LE-FIN-008":
    "Data protection policy, PDPC registration certificate (if applicable), and data breach response plan",
  "LE-FIN-009":
    "Cybersecurity policy, BCP/DRP document, and latest IT security audit or penetration test report",
  "LE-FIN-010":
    "Agent agreements, BOT agent registration records, training materials, and agent monitoring framework (if applicable)",
  "LE-FIN-011":
    "Sample contracts: customer terms, vendor/API agreements, and partnership or founder agreements",
  "LE-FIN-012":
    "Trademark/copyright certificates, IP assignment agreements, NDA templates, and source code ownership documentation",
  "LE-FIN-013":
    "Board member list with CVs, recent board minutes, governance charter, and conflict-of-interest policy",
};
const buildRows = () => {
  const rows = [];

  const add = (domain, variant, code, sortOrder, question, guidance) => {
    rows.push({
      domain,
      variant,
      question_code: code,
      question_text_en: question,
      question_text_sw: null,
      guidance_en: guidance,
      guidance_sw: null,
      sort_order: sortOrder,
    });
  };

  // Commercial & Marketing (default)
  add(
    "commercial_marketing",
    "default",
    "CM-001",
    1,
    "Describe your product/service, the problem it solves, its unique value proposition, your development roadmap, and pricing structure.",
    "Scope: company overview, problem statement, solution, market opportunity, product or service, business model, traction and performance, competitive position, management and governance, and financials with the funding requirement.",
  );
  add(
    "commercial_marketing",
    "default",
    "CM-002",
    2,
    "Define your total addressable market (TAM), the portion you can currently serve (SAM), and the realistic share you expect to capture in 1-3 years (SOM). Provide supporting data.",
    "Scope: covers TAM, SAM, and SOM with evidence of market sizing methodology.",
  );
  add(
    "commercial_marketing",
    "default",
    "CM-003",
    3,
    "Are sales growing consistently? Describe your customer segments, how they pay, and your documented strategy for converting leads into revenue.",
    "Scope: covers revenue trends, customer segmentation, payment terms, and the sales funnel/strategy.",
  );
  add(
    "commercial_marketing",
    "default",
    "CM-004",
    4,
    "Who are your direct and indirect competitors, what are their strengths and weaknesses, what is your competitive advantage, and what barriers protect your market position?",
    "Scope: covers competitor mapping, SWOT analysis, differentiation, and barriers to entry.",
  );
  add(
    "commercial_marketing",
    "default",
    "CM-005",
    5,
    "Do you have a documented marketing plan? Describe your brand identity, promotional channels, and distribution strategy for reaching target customers.",
    "Scope: covers marketing plan, brand guidelines, promotional tactics, and distribution channels.",
  );

  // Financial (default)
  add(
    "financial",
    "default",
    "FI-001",
    1,
    "Provide the company's Profit and Loss statement for the past 12-36 months. Are revenues growing and is the business profitable or on a clear path to profitability?",
    "Scope: revenue trends, cost structure, gross and net margins, and profitability trajectory.",
  );
  add(
    "financial",
    "default",
    "FI-002",
    2,
    "Provide the company's Balance Sheet for the past 12-36 months. Is working capital positive? Are assets adequately covering liabilities?",
    "Scope: total assets, total liabilities, equity position, working capital, and debt-to-equity ratio.",
  );
  add(
    "financial",
    "default",
    "FI-003",
    3,
    "Provide the Cash Flow statement for the past 12-36 months. Are operating cash flows sufficient to fund operations without external financing?",
    "Scope: operating, investing, and financing cash flows, free cash flow, and cash runway.",
  );
  add(
    "financial",
    "default",
    "FI-004",
    4,
    "Provide projected revenue and cash flow for the next 12-36 months. Are the underlying assumptions grounded in historical performance and market data?",
    "Scope: unit economics, revenue forecasts, cash flow projections, breakeven timeline, and quality/realism of assumptions.",
  );
  add(
    "financial",
    "default",
    "FI-005",
    5,
    "Describe your accounting system, internal control processes, financial reporting practices, tax compliance status, and whether the company has been independently audited.",
    "Scope: accounting software, internal controls, reporting cadence, tax filings, and audit history.",
  );

  // Operations (default)
  add(
    "operations",
    "default",
    "OP-001",
    1,
    "Describe your leadership team's vision, the organizational structure with reporting lines, the team's track record and commitment level, and any critical skill gaps.",
    "Scope: covers leadership vision, organogram, management experience, full-time commitment, and team capability gaps.",
  );
  add(
    "operations",
    "default",
    "OP-002",
    2,
    "How does the business collect and manage data? Is there a Management Information System (MIS) in use, and is it effective and scalable for current operations?",
    "Scope: covers data governance practices, MIS system selection, and system effectiveness for decision-making. It can also be CRM.",
  );
  add(
    "operations",
    "default",
    "OP-003",
    3,
    "Are there standardized processes for ensuring product/service quality, and is there a dedicated person or team responsible for quality control?",
    "Scope: covers quality control SOPs, QA processes, and quality management function/staffing.",
  );
  add(
    "operations",
    "default",
    "OP-004",
    4,
    "Does the company have a documented business strategy covering growth targets, market expansion plans, customer retention approach, and KPI-based performance tracking?",
    "Scope: covers strategic plan, growth/expansion roadmap, CRM practices, and performance measurement systems.",
  );

  // Legal & Compliance (default / non-fintech)
  add(
    "legal_compliance",
    "default",
    "LE-001",
    1,
    "Is the company formally registered with BRELA? Provide the Certificate of Incorporation confirming legal entity status.",
    "Scope: BRELA registration, company name, registration number, date of incorporation.",
  );
  add(
    "legal_compliance",
    "default",
    "LE-002",
    2,
    "Does the company have a duly filed MEMARTS document outlining its objects, share structure, and governance rules?",
    "Scope: company objects, share capital, director powers, shareholder rights, and amendment history.",
  );
  add(
    "legal_compliance",
    "default",
    "LE-003",
    3,
    "Does the company hold a valid Taxpayer Identification Number issued by the Tanzania Revenue Authority?",
    "Scope: TIN registration status, validity, and alignment with registered business name.",
  );
  add(
    "legal_compliance",
    "default",
    "LE-004",
    4,
    "Is the company current on all tax obligations? Provide the most recent Tax Clearance Certificate.",
    "Scope: outstanding tax liabilities, filing history, and current compliance status with TRA.",
  );
  add(
    "legal_compliance",
    "default",
    "LE-005",
    5,
    "Does the company hold a valid general business license issued by the relevant municipal or district authority?",
    "Scope: license validity period, renewal status, and alignment with registered business activities.",
  );
  add(
    "legal_compliance",
    "default",
    "LE-006",
    6,
    "If the business operates in a regulated sector, does it hold all required approvals from the relevant authority (e.g., BOT, TCRA, EWURA, TFDA)?",
    "Scope: sector-specific permits, regulatory approvals, and compliance certifications.",
  );
  add(
    "legal_compliance",
    "default",
    "LE-007",
    7,
    "If the business has co-founders or strategic partners, is there a signed MoU or partnership agreement governing roles, contributions, and dispute resolution?",
    "Scope: partner roles, equity split, decision-making authority, exit provisions, and dispute resolution.",
  );
  add(
    "legal_compliance",
    "default",
    "LE-008",
    8,
    "Are standardized, legally reviewed contracts in place for customers, suppliers, and partners/founders? Are terms clear and in the company's favour?",
    "Scope: customer agreements, supplier agreements, and partnership/founder contracts.",
  );
  add(
    "legal_compliance",
    "default",
    "LE-009",
    9,
    "Does the company own or have registered rights to its trademarks, copyrights, source code, or patents? Are NDAs and IP protection policies in place?",
    "Scope: IP ownership, trademark/copyright registration, and protection mechanisms (NDAs, IP policy).",
  );
  add(
    "legal_compliance",
    "default",
    "LE-010",
    10,
    "Does the company have an active Board of Directors or Advisory Board? Are there documented governance policies covering conflicts of interest, oversight, and accountability?",
    "Scope: board composition, meeting cadence, governance charter, and conflict-of-interest policies.",
  );

  // Legal & Compliance (fintech variant)
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-001",
    1,
    "Is the company formally registered with BRELA as a legal entity authorised to conduct financial technology operations in Tanzania? Provide the Certificate of Incorporation confirming entity status.",
    "Scope: BRELA registration, company name, registration number, date of incorporation, and alignment of registered business objects with fintech activities.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-002",
    2,
    "Does the company have a duly filed MEMARTS document whose stated business objects expressly cover the provision of financial technology, payment, or digital financial services?",
    "Scope: company objects, share capital structure, director powers, shareholder rights, and confirmation that fintech activities are within scope of registered objects.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-003",
    3,
    "Does the company hold a valid Taxpayer Identification Number issued by the Tanzania Revenue Authority (TRA), and is it aligned with the registered entity name?",
    "Scope: TIN registration status, validity, and alignment with registered business name and BOT-licensed entity.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-004",
    4,
    "Is the company fully current on all tax obligations including VAT, corporate income tax, withholding tax on digital transactions, and any applicable digital services tax? Provide the most recent Tax Clearance Certificate.",
    "Scope: outstanding tax liabilities, TRA filing history, digital services tax compliance, and current clearance status.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-005",
    5,
    "Does the company hold a valid general business license issued by the relevant municipal or district authority, and does the licensed activity description align with its fintech operations?",
    "Scope: license validity period, renewal status, and alignment of licensed activities with actual fintech business operations.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-006",
    6,
    "Does the company hold a valid licence issued by the Bank of Tanzania (BOT) under the National Payment Systems Act, 2015? Specify the licence category - Payment Service Provider (PSP), Electronic Money Issuer (EMI), or Payment System Operator - and confirm its current validity.",
    "Scope: licence category, issue date, validity period, scope of authorised payment activities, and any licence conditions or restrictions imposed by BOT.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-007",
    7,
    "Does the company have a fully documented and actively implemented Anti-Money Laundering (AML), Counter-Financing of Terrorism (CFT), and Know Your Customer (KYC) programme in compliance with the Anti-Money Laundering Act, 2006 (as amended) and FIAU directives? Is a designated compliance officer in place?",
    "Scope: AML/CFT policy, tiered KYC onboarding procedures, transaction monitoring system, suspicious transaction reporting (STR) process, staff training records, and compliance officer appointment.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-008",
    8,
    "Is the company compliant with the Tanzania Personal Data Protection Act (PDPA), 2022? Are there documented policies governing the lawful collection, storage, processing, sharing, and deletion of customer financial and personal data? Has the company registered with the Personal Data Protection Commission where required?",
    "Scope: data protection policy, data subject rights procedures (access, correction, erasure), data breach notification plan, cross-border data transfer controls, and PDPC registration status.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-009",
    9,
    "Does the company have a documented cybersecurity framework aligned with BOT ICT Risk Management Guidelines? Are system access controls, data encryption, disaster recovery, and incident response procedures formally documented and tested? Has an independent IT security assessment or penetration test been conducted?",
    "Scope: cybersecurity policy, access control and privilege management, encryption standards, business continuity and disaster recovery plan (BCP/DRP), incident response procedures, and latest IT security audit or penetration test report.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-010",
    10,
    "If the company operates through agents or merchant partners, are all agents formally contracted, registered with BOT where required, trained on AML/CFT obligations, and monitored under a documented agent management framework in accordance with BOT Agent Banking Guidelines?",
    "Scope: agent and merchant agreements, BOT agent registration records, agent AML/CFT training evidence, agent performance and conduct monitoring procedures, and agent suspension or termination protocols.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-011",
    11,
    "Are standardised, legally reviewed contracts in place for customers, technology vendors, payment partners, and co-founders? Do agreements clearly address liability, data ownership, service levels, and dispute resolution in the context of digital financial services?",
    "Scope: customer terms and conditions, technology vendor and API integration agreements, payment network or MNO partnership agreements, and founder/shareholder agreements.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-012",
    12,
    "Does the company own or hold registered rights to its trademarks, software source code, algorithms, and proprietary technology? Are NDAs, IP assignment agreements, and software licensing policies in place to protect the company's core technology assets?",
    "Scope: trademark and copyright registrations, software IP ownership and assignment agreements, NDA templates for staff and third parties, open-source licence compliance, and source code version control and access policies.",
  );
  add(
    "legal_compliance",
    "fintech",
    "LE-FIN-013",
    13,
    "Does the company have an active Board of Directors or Advisory Board with documented oversight responsibilities? Are there governance policies covering conflicts of interest, related-party transactions, whistleblower protection, and director accountability - consistent with BOT corporate governance expectations for regulated financial entities?",
    "Scope: board composition and independence, meeting cadence and minutes, governance charter, conflict-of-interest policy, related-party transaction disclosure procedures, and whistleblower policy.",
  );

  return rows;
};

const seedRows = buildRows();

const run = async () => {
  try {
    await sequelize.authenticate();

    for (const row of seedRows) {
      await CratQuestionCatalog.upsert({
        ...row,
        required_attachment: REQUIRED_ATTACHMENTS[row.question_code] || null,
        is_active: true,
      });
    }

    console.log(`Seeded ${seedRows.length} CRAT catalog rows.`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed CRAT catalog:", error);
    process.exit(1);
  }
};

run();
