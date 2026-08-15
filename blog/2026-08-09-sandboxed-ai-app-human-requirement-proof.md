---
title: "Your AI App Is Sandboxed. Who Proved the Requirement?"
date: "2026-08-09"
excerpt: "Cloudflare’s secure vibe-coding push solves runtime risk, not accountability. Here’s how to prove the human requirement behind an AI-built app."
tags: ["AI governance", "sandboxing", "software provenance", "human intent", "application security"]
author: "Looper Bot"
---

# Your AI App Is Sandboxed. Who Proved the Requirement?

Cloudflare open-sourced a vibe-coding platform this week for people who are not professional programmers. The security pitch is concrete: isolate each generated application so the agent cannot cause significant damage, even when the application contains serious mistakes. Ars Technica reports that the platform uses Cloudflare’s Dynamic Workers model and V8 isolates instead of conventional software containers. [Read the announcement and technical details](https://arstechnica.com/ai/2026/08/cloudflare-open-sources-vibe-coding-platform-for-people-who-arent-coders/).

That is useful engineering. It is also incomplete governance.

A sandbox can constrain what an AI agent is allowed to do. It cannot prove why someone asked for the application, whether the requirement was understood, who reviewed the result, or who accepted the remaining risk. We need both controls, and they answer different questions.

## A sandbox proves containment, not intent

Suppose someone asks an agent to build an internal customer intake tool. The agent produces a polished application inside a tightly restricted runtime. It cannot access production databases, read arbitrary files, or make network requests without explicit permission.

The sandbox may successfully prevent a catastrophic exploit. It does not tell us whether the application should collect a customer’s date of birth. It does not tell us whether a retention period was approved. It does not tell us whether the person requesting the tool had authority to define that workflow.

Those are not runtime questions. They are intent and accountability questions.

This distinction matters because the most expensive failures in business software are not always remote code execution bugs. They are often ordinary applications that faithfully implement the wrong requirement:

- A form collects more personal data than the business needs.
- An approval workflow silently bypasses a required control.
- A dashboard exposes information to the wrong internal role.
- A generated integration sends data to a vendor nobody approved.
- A useful prototype becomes a production dependency without a documented decision.

A secure execution environment can reduce the blast radius. It cannot make an unauthorized requirement legitimate.

## The missing artifact is the human specification

Most teams have plenty of evidence about the generated result. They keep the repository, prompt history, agent logs, test output, deployment record, and pull request. These artifacts help reconstruct how the software was produced.

They are weaker at proving why it was produced.

The prompt is not automatically a specification. It may be vague, incomplete, or written by someone who was experimenting. The agent’s summary is not approval. A passing test suite demonstrates that the implementation satisfies selected tests, not that the tests represent the organization’s actual obligations.

For an AI-built application, we should preserve a human-authored requirement record before generation begins. It does not need to be a 40-page design document. It does need to establish the boundary of the decision.

At minimum, capture:

- The problem the application is meant to solve.
- The intended users and affected parties.
- Data the application may collect, process, or retain.
- Actions the application may take and actions it must never take.
- Security, privacy, accessibility, and regulatory constraints.
- Acceptance criteria written in language a reviewer can evaluate.
- The person accountable for approving the requirement.
- The date, version, and reason for later changes.

The important part is authorship. The requirement should be attributable to a human with enough context and authority to own it. An agent can expand the specification, identify ambiguities, and propose tests. It should not be the only source of the specification that governs its own work.

## Approval is a separate event from generation

We have already seen why a generated pull request is not a complete decision record. In [Your Agent Wrote Code. Who Owned the Risk?](/blog/ai-agent-authored-risk-decision-records), we examined the gap between implementation and ownership. The same gap appears earlier in the workflow, before the first line of code exists.

A useful approval process should record at least three distinct events:

1. A human defines the requirement.
2. The agent or developer produces an implementation against that requirement.
3. A human reviews the evidence and accepts, rejects, or limits the result.

Collapsing these events into one button labeled Approve creates false confidence. The reviewer may approve the generated diff while never seeing the original business intent. Or the requester may approve the application because it looks useful, without checking whether it creates a new legal, privacy, or operational obligation.

Approval should therefore point backward to the requirement and forward to the evidence. That evidence may include a threat model, test results, screenshots, access-control checks, data-flow diagrams, and known limitations. If the application changes later, the approval should no longer appear to cover the new version by default.

This is closer to change control than to ordinary code review.

## What teams should implement now

If you are evaluating a secure vibe-coding platform, ask for two control planes, not one.

The first is the execution control plane. It should govern capabilities such as filesystem access, network access, secrets, database permissions, package installation, and deployment targets. Sandboxing belongs here.

The second is the intent control plane. It should govern requirements, approvals, scope changes, exceptions, and evidence. This is where many otherwise sophisticated agent workflows remain underbuilt.

A practical workflow can be small:

- Create a versioned requirement record before prompting the agent.
- Give the agent only the requirement and approved reference material.
- Require generated tests to map back to acceptance criteria.
- Record every material change to scope, data handling, or permissions.
- Require a named human reviewer to approve the requirement and the release separately.
- Store hashes or immutable snapshots for the requirement, implementation, and approval evidence.
- Mark prototypes clearly so a sandboxed experiment cannot quietly become production software.

Do not treat a hash as magic. A hash proves that an artifact has not changed since it was recorded. It does not prove that the artifact was wise, authorized, or written by a human. Its value comes from binding the requirement, review, and resulting application into a traceable chain.

That chain is what lets you answer an uncomfortable question months later: did we build the software we intended to build, and can the person responsible show their work?

## Secure generation needs accountable intent

Cloudflare’s approach is a meaningful step for reducing the danger of generated software. We should use sandboxes aggressively, especially when agents are allowed to run code, install dependencies, or interact with external systems.

But runtime isolation is not authorship evidence. It protects the environment around the application. Human-authored requirements and approvals explain why the application exists and who accepted its behavior.

Our earlier post, [Cloudflare Built a Browser for Agents. Who Signs?](/blog/cloudflare-agent-browser-authorship-logs), looked at why action logs cannot establish who composed submitted content. The next layer is similar: agent traces can show how an application was assembled, but only preserved human intent can show what the team meant to authorize.

ByMyOwnHand is built for certifying human-composed records, including the requirements and approval statements that sit behind consequential software decisions. Use a locked, verifiable writing process when the provenance of that human judgment matters.

If your AI-built application matters, preserve the requirement before you generate the result.

<img src="https://api.looper.bot/api/track/blog/7fd5c4bc-93d1-4731-b7b2-7a6add611b8d/sandboxed-ai-app-human-requirement-proof" alt="" width="1" height="1" style="position:absolute;left:-9999px;width:1px;height:1px;border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
