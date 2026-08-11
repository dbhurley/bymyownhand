---
title: "What Does Your Agent Know, and What Can You Prove?"
date: "2026-08-11"
excerpt: "Next.js 16.3 gives agents version-matched context. It does not prove who wrote the requirement, made the tradeoff, or approved the result."
tags: ["Next.js", "AI agents", "provenance", "engineering governance", "auditability"]
author: "Looper Bot"
---

# What Does Your Agent Know, and What Can You Prove?

Next.js 16.3 launched on August 3 with a feature aimed directly at the way we build software with AI agents: version-matched documentation.

The idea is practical. An agent working in a Next.js 16.3 project should not infer behavior from stale documentation, make an external lookup, or blend guidance from several framework versions. The installed version carries the relevant docs, and an `AGENTS.md` block helps the agent find them. The result should be less context drift and fewer confident answers based on the wrong release.

That is a real improvement. It also leaves the most important governance question unanswered:

**What does your agent know, and what can your organization prove?**

## Correct context is not evidence of intent

The [Next.js AI coding agents guide](https://nextjs.org/docs/app/guides/ai-agents) describes a useful property: agents can access documentation that matches the installed version without relying on a network request or external lookup. That reduces one class of failure. The agent has a better chance of understanding the technical environment it is changing.

But documentation tells an agent how a framework works. It does not tell us why a team chose a particular requirement, whether the requirement was complete, or who accepted the tradeoff behind it.

Consider a normal workflow:

- A product manager writes a requirement for an authenticated customer portal.
- An engineer adds constraints around session duration, data retention, and accessibility.
- A security reviewer rejects one implementation and approves another.
- An agent turns the approved requirement into routes, components, tests, and configuration.
- The pull request records the resulting diff and the agent records its tool calls.

With modern agent tooling, the final execution record may be excellent. We might know the model version, repository state, files read, commands run, tests passed, and commit created. We may even have a clean trail of approvals.

What we may not have is reliable evidence that the requirement itself was composed by a human, that the critical constraints were added before the agent began, or that the person approving the change understood the decision being approved.

That gap matters because requirements are where organizational judgment enters the system. The code is an implementation of a decision. If the decision cannot be traced to a human-authored artifact, an execution log alone cannot establish accountability.

## Three records that teams keep confusing

Agent-enabled development produces several useful records, but they answer different questions.

**Context records** establish what the agent was told about the technical environment. This includes the installed framework version, `AGENTS.md`, repository instructions, dependency metadata, and relevant documentation.

**Execution records** establish what the agent did. This includes prompts, tool calls, file changes, test output, branch history, and deployment events.

**Intent records** establish what a human wanted, understood, and accepted. This includes the original requirement, risk constraints, rejected alternatives, success criteria, and approval rationale.

Next.js 16.3 improves the first category. Agent observability platforms improve the second. The third remains mostly an informal document in a ticket, a planning comment, or a conversation that disappears into a chat history.

That is why better agent context can create a false sense of governance. When an agent follows the correct versioned instructions and produces a valid application, the workflow looks controlled. Yet technical correctness does not prove that the requested behavior was authorized or that the requirement captured the right business rule.

We made a similar distinction in [Your AI App Is Sandboxed. Who Proved the Requirement?](/blog/sandboxed-ai-app-human-requirement-proof). A sandbox can prove containment. It cannot prove intent. Versioned documentation has the same boundary: it can improve technical grounding, but it cannot prove human authorship of the requirement being grounded.

## The missing artifact comes before the agent run

Most teams instrument the agent after work begins. They capture the session, retain the diff, and attach test results to the pull request. That is useful for reconstructing execution, but it starts too late.

The evidence layer needs to begin before the agent receives the task.

For each consequential change, we should be able to answer:

- Who wrote the requirement?
- When was it written, and was its history preserved?
- Which constraints were explicit before implementation started?
- Which alternatives did a human consider or reject?
- Who had authority to approve the requirement?
- What exact requirement did the agent receive?
- Which final artifact corresponds to that approved intent?

The distinction between a draft and a final requirement is important. A copied paragraph in a ticket proves that text existed in the ticket. It does not necessarily prove who composed it or whether it was edited after the agent had already implemented against it.

A stronger record binds the human-authored requirement to a timestamp, an immutable content hash, a named author, and a later approval. The agent session can then reference that specific artifact rather than an evolving ticket or an unversioned prompt.

This is not bureaucracy for its own sake. It is the same principle we use elsewhere in software supply chains: provenance must identify the source artifact and preserve the chain between source, transformation, and output.

## A workable control for agent-assisted development

We do not need to prevent agents from working. We need to separate authority from automation.

A practical workflow looks like this:

1. **Compose the requirement in a controlled editor.** Capture the human writing process and preserve the original text, revisions, and timing.
2. **Record decision constraints.** State data sensitivity, security requirements, performance targets, regulatory conditions, and explicit non-goals.
3. **Approve the requirement before execution.** The approver should sign the exact content hash, not a moving ticket or a generated summary.
4. **Start the agent session from that approved artifact.** Store the framework version, repository revision, model identity, tools, and supplied instructions.
5. **Link implementation evidence back to intent.** Attach the diff, test results, review comments, and deployment record to the approved requirement.
6. **Require a human decision on exceptions.** If the agent changes scope, weakens a constraint, or introduces a new risk, pause for a new approval.

The agent remains responsible for execution within its permissions. The humans remain responsible for defining the acceptable outcome and deciding whether deviations are justified.

This also makes audits more precise. Instead of asking whether an agent touched a repository, an auditor can ask whether the deployed behavior traces back to a human-authored, approved requirement and whether the implementation stayed within its scope.

## The next provenance problem is upstream

Our earlier post, [Can X Prove Who Earned the Reward?](/blog/can-x-prove-who-earned-the-reward), argued that platform labels are weaker than creation evidence. Engineering teams are approaching the same problem from the other direction. Agent logs can label activity without proving the human judgment that made the activity legitimate.

Next.js 16.3 is moving agent-aware development into the framework itself. That makes the timing of this question useful. As we adopt versioned instructions, partial prefetching, faster builds, and richer agent tooling, we should also version the human intent that gives those tools authority.

ByMyOwnHand provides one way to create that evidence layer by certifying human-authored writing before an agent acts on it. The useful question is not whether the agent had good instructions. It is whether we can prove where those instructions came from.

Start with one high-impact requirement this week, preserve its authorship and approval history, and connect it to the agent session and shipped change.

<img src="https://api.looper.bot/api/track/blog/7fd5c4bc-93d1-4731-b7b2-7a6add611b8d/what-does-your-agent-know-and-what-can-you-prove" alt="" width="1" height="1" style="position:absolute;left:-9999px;width:1px;height:1px;border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
