# Axis Compliance Roadmap

> What's needed to sell to universities. SOC 2 Type II + FERPA + procurement artifacts.

---

## TL;DR

| Requirement | What It Is | Timeline | Cost (Year 1) |
|-------------|-----------|----------|---------------|
| **SOC 2 Type II** | CPA-audited security certification | ~12 months | $25,000-$50,000 |
| **FERPA** | Contractual compliance (no certification) | Ongoing | $2,000-$5,000 (legal) |
| **HECVAT** | University security questionnaire (~250 questions) | Self-serve | $0 (your time) |
| **VPAT/ACR** | Accessibility conformance report (WCAG 2.1 AA) | 2-4 weeks | $3,000-$7,000 |

**Total Year 1: ~$30,000-$50,000 and ~12 months to be procurement-ready.**

---

## 1. SOC 2 Type II

### What It Is

SOC 2 is an auditing framework from the AICPA. A Type II report proves your security controls have been **operating effectively over 3-6 months** — not just that they exist on paper. 78% of higher ed procurement officers require it before considering a vendor.

### Trust Service Criteria (Pick Which to Include)

| Criterion | Required? | Covers | Recommended for Axis? |
|-----------|----------|--------|--------------------------|
| **Security** | Mandatory | Unauthorized access protection | Yes (always) |
| **Availability** | Optional | Uptime, DR, SLAs | Yes — universities expect uptime guarantees |
| **Confidentiality** | Optional | Protection of confidential data | Yes — student records are confidential |
| **Processing Integrity** | Optional | Accuracy of system processing | Maybe later (grading/transcript processing) |
| **Privacy** | Optional | PII collection, use, retention | Maybe later (overlaps with FERPA) |

**Start with Security + Availability + Confidentiality.** Add others in Year 2.

### Policy Documents Required (8-12)

1. Information Security Policy
2. Access Control Policy (auth, passwords, SSO, MFA)
3. Encryption and Key Management Policy
4. Incident Response Plan
5. Change Management Policy
6. Business Continuity Plan (BCP)
7. Disaster Recovery Plan (DRP)
8. Vendor/Third-Party Risk Management Policy
9. Data Classification and Handling Policy
10. Acceptable Use Policy
11. Risk Management Policy
12. Employee Security Awareness Training Policy

> Compliance platforms (Vanta/Drata) provide templates for all of these.

### Technical Controls Required

| Control | Status in Axis | Gap |
|---------|-------------------|-----|
| MFA on production systems | Not implemented | Need MFA on cloud console, GitHub, admin accounts |
| Role-based access control | Implemented (UserRole enum + guards) | Good |
| Encryption at rest (AES-256) | Depends on DB/R2 config | Verify PostgreSQL + R2 encryption settings |
| Encryption in transit (TLS 1.2+) | HTTPS in place | Good |
| Centralized logging (6-12 month retention) | Partial (AI usage tracking) | Need general access/audit logging + retention policy |
| Vulnerability scanning (quarterly) | Not in place | Set up automated scanning |
| Annual penetration test | Not done | Commission third-party pen test |
| Separate dev/staging/prod environments | Unknown | Verify environment separation |
| Code review before prod deploys | PR workflow exists | Good |
| Quarterly access reviews (documented) | Not in place | Need formal review process with sign-off |
| Tested backup restores | Unknown | Set up and test DB backup restoration |
| Endpoint protection | Not in place | MDM/antivirus on company devices |

### Process and Timeline

| Phase | Weeks | What Happens |
|-------|-------|-------------|
| **1. Gap analysis** | 1-4 | Sign up for Vanta/Drata, map controls, identify gaps |
| **2. Remediation** | 4-12 | Write policies, implement missing technical controls |
| **3. Observation period** | 12-36 | Controls operate for 3-6 months; platform collects evidence continuously |
| **4. CPA audit** | 36-44 | Auditor reviews evidence, interviews personnel, issues report |
| **5. Report in hand** | ~Month 12 | SOC 2 Type II report ready for university procurement |

> Skip Type I — go straight to Type II to save $5,000-$20,000 and 2-3 months.

### Cost Breakdown

| Item | Low | High | Notes |
|------|-----|------|-------|
| Compliance platform (Vanta/Drata) | $7,500/yr | $15,000/yr | Ask for startup/accelerator discounts |
| CPA audit firm (Type II) | $10,000 | $25,000 | Use platform-recommended auditors for bundled rates |
| Penetration test | $5,000 | $15,000 | Required annually |
| Cyber liability insurance | $1,500/yr | $5,000/yr | $1-2M coverage typical |
| Policy writing (if outsourced) | $0 | $5,000 | Platforms provide templates |
| Tooling (MDM, log aggregation) | $0 | $5,000 | Some free/cheap for small teams |
| **Year 1 Total** | **$25,000** | **$50,000** | |
| **Annual Renewal** | **$24,000/yr** | **$35,000/yr** | Platform + audit + pen test + insurance |

### Compliance Automation Platforms

| Platform | Starting Price | Best For |
|----------|---------------|----------|
| **Vanta** | ~$10,000/yr | Largest integration library, strong startup programs |
| **Drata** | ~$7,500/yr | More transparent pricing |
| **Secureframe** | ~$7,500/yr | More hands-on advisory |

All three provide: policy templates, automated evidence collection, continuous monitoring, auditor matching, and integrations with AWS/GitHub/cloud providers.

---

## 2. FERPA Compliance

### What It Is

FERPA (Family Educational Rights and Privacy Act) governs the privacy of student education records. It applies directly to **educational institutions**, not vendors. But as a vendor, universities bind you to it through contracts.

**There is no "FERPA Certified" stamp.** You prove compliance through your Data Processing Agreement, technical controls, and SOC 2 report.

### The "School Official" Exception

This is how universities legally share student data with you without individual student consent. Under 34 CFR 99.31(a)(1)(i)(B), a vendor qualifies if:

1. You perform an institutional service (LMS = yes)
2. You have a legitimate educational interest in the data
3. The school maintains direct control via contract
4. You don't re-disclose data to third parties
5. You're subject to the same restrictions as school employees

### Data Processing Agreement (DPA) — What You Must Agree To

Every university will require a DPA with these provisions:

| Provision | What It Means |
|-----------|--------------|
| **Purpose limitation** | Student data used only to provide the LMS service — no data mining, no ad targeting |
| **No re-disclosure** | Don't share student data with any third party without FERPA authorization |
| **Institutional ownership** | The university owns the data, not Axis |
| **Audit rights** | The university can audit your data handling |
| **Breach notification** | Notify within 24-72 hours of a breach (varies by state) |
| **Data deletion** | Destroy all student data when the contract ends |
| **Sub-processor obligations** | Impose equivalent protections on every third party touching student data |
| **Return of data** | Provide data export to the university on request |

### Technical Controls Required

| Control | Axis Status | Action Needed |
|---------|---------------|---------------|
| Encryption at rest (AES-256) | Verify DB + R2 config | Confirm and document |
| Encryption in transit (TLS 1.2+) | Likely in place | Confirm |
| RBAC for student records | Implemented (UserRole + guards) | Document for compliance |
| MFA on admin accounts | Not implemented | Build MFA support |
| Audit logging (who accessed what, when) | Partial | Implement general access audit logging |
| Log retention (1-3 years) | Not configured | Set up retention policy |
| Vulnerability scanning (quarterly) | Not in place | Set up |
| Penetration testing (annual) | Not done | Commission |
| Incident response plan | Not written | Write it |
| Data minimization | Not audited | Audit what data is collected vs. needed |
| Tenant isolation | Multi-tenant architecture with tenantId scoping | Document for compliance |

### AI-Specific FERPA Concerns

**This is the question every university will ask: "Does student PII enter your AI model's training data?"**

What you need to document:
- Anthropic's API does **not** train on API inputs by default — get this in writing (Anthropic's data usage policy)
- What student data enters the AI context window (ContextService snapshots)
- Sub-processor agreement with Anthropic covering student data
- GovernanceService controls on what tools can access and return
- Data flow diagram showing: student action → what data leaves your server → what Anthropic receives → what comes back

### State-Level Laws (Beyond Federal FERPA)

If selling to universities in these states, additional requirements apply:

| State | Law | Key Addition |
|-------|-----|-------------|
| California | SOPIPA | No targeted advertising using student data; deletion on request |
| Illinois | SOPPA | Opt-in consent; 72-hour breach notification |
| New York | Ed Law 2-d | Data Privacy and Security Plan; parents' bill of rights |
| Colorado | Student Data Transparency Act | Annual data inventory |

121+ state student privacy laws exist as of 2025. Check each state you sell into.

---

## 3. University Procurement Artifacts Checklist

When a university evaluates Axis, they will request these:

| Artifact | Description | Axis Status |
|----------|------------|----------------|
| **SOC 2 Type II Report** | CPA-audited security report | Not started |
| **HECVAT (completed)** | ~250-question security questionnaire (EDUCAUSE standard) | Not started |
| **VPAT / ACR** | Accessibility conformance report (WCAG 2.1 AA) | Partial — WCAG work done, formal report needed |
| **DPA template** | FERPA-compliant data processing agreement | Not started |
| **Privacy Policy** | Must address student data, FERPA, retention, deletion | Not started |
| **Penetration test report** | Current (within 12 months) third-party test | Not started |
| **Cyber liability insurance** | $1-2M coverage certificate | Not started |
| **Sub-processor list** | Every third party touching student data | Not documented |
| **Incident response plan** | Breach detection, containment, notification procedures | Not started |
| **Data flow diagram** | Where student data is stored, processed, transmitted | Architecture docs exist, need compliance format |
| **AI governance docs** | How AI handles student data, bias mitigation, human oversight | GovernanceService exists, need formal docs |

### HECVAT Details

The Higher Education Community Vendor Assessment Toolkit (HECVAT 4) is a self-serve questionnaire. 22 sections:

- Company overview, documentation, accessibility
- Application security, authentication, authorization
- Business continuity, change management, data handling
- Disaster recovery, networking, policies
- Incident handling, vulnerability scanning
- Privacy, AI governance (new in v4)
- Third-party assessment

Having a pre-filled HECVAT dramatically accelerates procurement. It's free — just time-intensive.

---

## 4. What Axis Already Has (Head Start)

These existing features directly map to compliance requirements:

| Axis Feature | Compliance Requirement It Addresses |
|----------------|-------------------------------------|
| Multi-tenant architecture with tenantId on every entity | Data isolation between institutions |
| JwtAuthGuard + RolesGuard on every resolver | Access control / RBAC |
| httpOnly cookies (SEC-003 completed) | Secure session management |
| Database indexes on all entities (SEC-004 completed) | Performance + data integrity |
| Tenant scoping on all queries (SEC-001 completed) | Prevents cross-tenant data leaks |
| GovernanceService (auto/suggest/blocked) | AI governance framework |
| UsageTrackingService (per-tenant AI costs) | AI usage auditing |
| ContextService (academic state snapshots) | Documented AI data flow |
| WCAG 2.1 AA work (FEAT-010) | Accessibility foundation for VPAT |
| Event system with typed events | Audit trail foundation |

---

## 5. Recommended Compliance Roadmap

### Months 1-2: Foundation
- [ ] Sign up for Drata or Vanta (choose one)
- [ ] Write all 8-12 policy documents using platform templates
- [ ] Implement MFA on cloud console, GitHub, and Axis admin accounts
- [ ] Set up centralized logging with 12-month retention
- [ ] Draft DPA template (engage EdTech attorney, $2-5K)
- [ ] Draft privacy policy
- [ ] Begin HECVAT self-assessment
- [ ] Document sub-processor list (AWS, Anthropic, Resend, Cloudflare R2, etc.)

### Months 2-4: Technical Hardening
- [ ] Verify and document database encryption at rest
- [ ] Implement general access audit logging (who accessed which student records, when)
- [ ] Set up automated vulnerability scanning (quarterly)
- [ ] Commission first penetration test ($5-10K)
- [ ] Implement and test backup/restore procedures
- [ ] Document AI governance controls (what student data enters Anthropic API)
- [ ] Obtain sub-processor agreement from Anthropic for student data
- [ ] Get cyber liability insurance ($1-2M coverage)
- [ ] Separate dev/staging/production environments (if not already done)

### Months 4-10: Observation Period
- [ ] Begin formal SOC 2 observation window (6 months)
- [ ] Compliance platform continuously collects evidence
- [ ] Conduct quarterly access reviews with documented sign-off
- [ ] Run incident response tabletop drill
- [ ] Maintain all controls operationally (no gaps)
- [ ] Commission VPAT/accessibility audit ($3-7K)

### Months 10-12: Audit
- [ ] CPA firm conducts SOC 2 Type II audit (2-4 weeks engagement)
- [ ] Remediate any audit findings
- [ ] Receive SOC 2 Type II report
- [ ] Finalize HECVAT with SOC 2 results
- [ ] All procurement artifacts ready

### Month 12+: Go to Market
- [ ] SOC 2 Type II report in hand
- [ ] HECVAT completed and available
- [ ] DPA template ready for university legal teams
- [ ] VPAT/ACR current
- [ ] Pen test report current (within 12 months)
- [ ] Begin university procurement conversations

---

## 6. Annual Renewal Costs

| Item | Annual Cost |
|------|------------|
| Compliance platform | $7,500-$15,000 |
| SOC 2 Type II audit renewal | $10,000-$20,000 |
| Penetration test | $5,000-$15,000 |
| Cyber liability insurance | $1,500-$5,000 |
| Vulnerability scanning tools | $0-$2,000 |
| **Total** | **$24,000-$57,000/yr** |

---

## 7. Cost Optimization Strategies

1. **Start with Security TSC only** — add Availability + Confidentiality in Year 2
2. **Use platform-bundled auditors** — Vanta/Drata negotiate group rates ($5-10K vs $15-25K)
3. **Apply for startup programs** — both platforms offer accelerator discounts
4. **Use platform policy templates** — eliminates compliance consultant fees
5. **Self-serve the HECVAT** — free, just your time
6. **Leverage cloud provider compliance** — AWS is SOC 2 certified, so datacenter/physical security questions are answered by their report

---

*Last updated: 2026-03-10*
*Companion docs: [SECURITY.md](./SECURITY.md) | [ARCHITECTURE.md](./ARCHITECTURE.md)*
