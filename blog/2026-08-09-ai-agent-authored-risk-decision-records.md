---
title: "Your Agent Wrote Code. Who Owned the Risk?"
date: "2026-08-09"
excerpt: "AI agents can scale implementation. The missing control is a credible record of who made, approved, and accepted the engineering decision."
tags: ["AI coding agents", "engineering governance", "decision records", "software provenance", "human accountability"]
author: "Looper Bot"
---

# Your Agent Wrote Code. Who Owned the Risk?

Meta launched Muse Code this week, a terminal-based AI coding agent aimed at complete software tasks across large codebases. The pitch is familiar by now: plan the work, change multiple files, run validation, and hand back something close to a finished implementation. [TechCrunch reported the launch](https://techcrunch.com/2026/08/05/meta-launches-muse-code-an-ai-agent-for-large-code-bases/) as Meta’s entry into the same workflow Anthropic and OpenAI are pushing.

The important shift is not that an agent can write more code. It is that implementation is becoming cheaper than explanation.

When an agent opens a pull request containing a migration, refactor, or security fix, the diff tells us what changed. Tests tell us what passed. Logs tell us which tools ran. None of those artifacts necessarily tell us who chose the tradeoff, who approved it, or who accepted the remaining risk.

That missing record is becoming the real governance problem.

## A pull request is not a decision record

Most engineering teams treat the pull request as the unit of accountability. That works reasonably well when the person proposing the change also understands the system, writes the rationale, responds to review, and owns the outcome.

Agentic workflows separate those activities.

An agent may inspect the repository, propose three approaches, implement one, revise it after test failures, and open a pull request using a developer’s credentials. The final PR may include a useful summary, but a generated summary is not the same thing as a human-owned decision.

A strong engineering record needs to answer questions such as:

- What problem were we solving?
- Which alternatives did we reject, and why?
- What assumptions were necessary?
- What new failure modes did we introduce?
- Who approved the tradeoff?
- Who owns the risk if the assumption is wrong?
- What evidence would cause us to roll back?

The code can be excellent and the record can still be weak. That distinction matters during an incident, when the question is rarely only “what does this function do?” The harder question is “why did we decide this was safe enough to ship?”

## The control surface is moving upstream

As agents handle more implementation, the human contribution moves upstream into task definition, constraints, architecture, and risk acceptance. That makes the written decision record more important, not less.

We should stop measuring human oversight by whether a person clicked Approve on a generated diff. Approval is a state transition. It does not prove that the approver authored the reasoning behind the transition or understood the relevant evidence.

A defensible workflow separates four artifacts:

1. The agent’s implementation plan and tool history.
2. The resulting code changes and automated test output.
3. The human-written decision record explaining the chosen approach.
4. The explicit approval and risk ownership attached to that record.

The first two establish technical activity. The third and fourth establish accountable judgment.

This is not an argument for banning agents or forcing engineers to type every line manually. It is an argument for putting a clear boundary around decisions that carry operational consequences. Let the agent produce the patch. Require a human to explain the decision in a record that can be traced, reviewed, and preserved.

## What a useful record contains

A decision record should be small enough to complete during a normal change and specific enough to survive an incident review. A template like this is more useful than a generic “AI-assisted” label:

```text
Decision: Move session validation into the edge middleware

Context:
The current validation path adds 180-240 ms to requests in region X.

Options considered:
1. Keep validation in the application server.
2. Cache validation results for five minutes.
3. Move validation to edge middleware.

Chosen option:
Option 3, because it reduces latency without extending token validity.

Known risks:
The middleware runtime has fewer debugging tools and a separate deployment path.

Evidence:
Load test run 2026-08-05, security review PR-1842, rollback tested in staging.

Approval:
Human author: [name]
Risk owner: [name]
Approver: [name]
Rollback trigger: Error rate above 1% for five minutes.
```

The exact format can vary. The important properties are authorship, timing, evidence, alternatives, and ownership. If the agent drafted the template, record that fact. If a human rewrote the rationale, record that too. Provenance improves when the workflow preserves the difference between generated material and human judgment.

## Chain of custody beats a green checkmark

Teams adopting coding agents should connect the decision record to the rest of the change chain:

- The issue or task that defined the problem.
- The agent run identifier and repository state it inspected.
- The commit and pull request produced by the run.
- Test, static analysis, and deployment evidence.
- The human-authored rationale.
- Approval records and named risk ownership.
- Post-deployment observations and rollback decisions.

This gives us a chain of custody from intent to implementation to outcome. It also makes gaps visible. If a PR has an agent run and a green CI status but no rationale, the missing evidence is obvious before merge.

That is a better control than pretending that a commit author field answers the question. We covered the limits of commit metadata in [Who Actually Wrote the Code Your Agent Just Merged?](/blog/git-blame-authorship-provenance-collapse). The next layer is not another attempt to infer authorship from repository metadata. It is a deliberate record of the human decision that authorized the change.

The same distinction applies to browser and tool logs. As we argued in [Cloudflare Built a Browser for Agents. Who Signs?](/blog/cloudflare-agent-browser-authorship-logs), action logs can show what an agent accessed and submitted. They do not, by themselves, establish who composed or accepted the reasoning behind the action.

## What to change this week

Pick one class of agent-assisted change, such as dependency upgrades, database migrations, authentication changes, or production configuration. Add a decision-record requirement to that workflow before the agent opens a merge request.

Then enforce a few practical rules:

- Do not accept “the agent recommended this” as rationale.
- Require named human ownership for unresolved risks.
- Link the record to the PR and commit, preferably by immutable identifier.
- Preserve the original record instead of editing history after deployment.
- Sample completed records during incident drills and architecture reviews.
- Treat missing reasoning as a review blocker when the change affects security, data, or availability.

Do not turn this into paperwork for every formatting fix. Governance should follow blast radius. A one-line typo and a permissions migration should not have the same evidence burden.

ByMyOwnHand can certify the human writing session behind an architecture decision, incident record, or risk acceptance note and produce a hash-backed proof link. That proves the record was composed by a person in a controlled session, not that the decision was correct.

Start with your next high-impact agent change: require the record before you require the merge.

<img src="https://api.looper.bot/api/track/blog/7fd5c4bc-93d1-4731-b7b2-7a6add611b8d/ai-agent-authored-risk-decision-records" alt="" width="1" height="1" style="position:absolute;left:-9999px;width:1px;height:1px;border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
