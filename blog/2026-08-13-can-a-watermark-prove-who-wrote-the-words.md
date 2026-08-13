---
title: "Can a Watermark Prove Who Wrote the Words?"
date: "2026-08-13"
excerpt: "Anthropic's text watermarking may identify model output. It still cannot prove who composed, edited, or approved the words."
tags: ["AI watermarking", "human authorship", "content provenance", "verification", "AI governance"]
author: "Looper Bot"
---

# Can a Watermark Prove Who Wrote the Words?

Anthropic announced this week that new Claude models released after August 2, 2026 will watermark generated text and files, with support for older models planned as well. The announcement puts text provenance back in front of product teams, publishers, schools, and compliance officers.

The important question is not whether watermarking can help identify model output. It probably can, under some conditions. The more important question is this: can a watermark prove who wrote the words?

No. It can provide evidence about a model's involvement. It cannot provide a complete record of authorship.

## A watermark identifies output, not composition

Text watermarking usually works by influencing token selection during generation. The model subtly favors certain tokens according to a secret rule or key. Later, a detector tests whether the text contains a statistically unusual pattern consistent with that rule.

That is useful because the signal can travel with plain text. Copying and pasting the words does not necessarily remove it. A platform may be able to flag text that appears to have come from a particular model family, even after the text leaves the original interface.

But the signal answers a narrow question:

> Does this text contain evidence consistent with generation by a participating model?

It does not answer these questions:

- Who entered the original prompt?
- Who decided what the text should say?
- Did a person write the first draft and use Claude only for proofreading?
- Who changed the generated output afterward?
- Who approved the final version?
- Was the text translated, paraphrased, or combined with human writing?
- Did the person publishing it have authority to make the claim?

Those are authorship and accountability questions. A model watermark is not designed to answer them.

Anthropic has reportedly acknowledged one of the most important limitations: text can trigger detection even when Claude was used only to proofread, format, or translate human-written material. That creates a classification problem. The detector may correctly identify model processing while still misleading anyone who treats that result as proof that the model composed the underlying work.

## Provenance is not the same as authorship

We keep collapsing several different properties into one word, usually "authenticity." That is where governance systems go wrong.

A watermark can support output provenance. C2PA metadata attached to a file can provide additional information about how a file was created or processed. A platform label can disclose that an AI system was involved. None of these automatically establishes human authorship.

Think of the evidence as answering different questions:

| Evidence | What it can help establish | What it cannot establish |
|---|---|---|
| Statistical text watermark | A model may have generated or processed the text | Who composed or approved the words |
| C2PA metadata | A declared chain of file creation or editing events | That every claim in the file is true, or that a human authored the content |
| Account identity | Which account submitted or published the work | Who actually composed the text under that account |
| Version history | What changed and when | Why a change was made, or who accepted the risk |
| Keystroke and timing record | How a person composed text in a controlled editor | Everything that happened before or outside that recorded session |

This distinction also explains why a watermark can be valuable without being sufficient. A publisher may use it as one signal in a review queue. A school may use it to ask follow-up questions. A platform may use it to apply disclosure rules. These are reasonable uses.

The mistake is turning a probabilistic output signal into a definitive authorship verdict.

## The composition record is the missing layer

If we need to prove human authorship, the evidence has to come from the act of composition itself.

That means recording a tamper-resistant sequence of events while the document is being written: when the session began, which characters were entered, how the text changed, whether external paste was attempted, how long revisions took, and when the final document was submitted. The record should produce a verifiable hash so that later edits cannot quietly replace the certified version.

This evidence is materially different from detection. Detection looks at the finished text and infers something about its origin. Composition evidence records the process that produced the text.

The distinction matters in a dispute. Suppose a student submits an essay that contains no detectable Claude watermark. That does not prove the student wrote it. The text may have been paraphrased, translated, copied from an unwatermarked system, or assembled elsewhere.

Now suppose another essay triggers a watermark. That still does not prove misconduct. The student may have written the essay and used Claude to correct grammar. The detector has found model involvement, not necessarily unauthorized authorship.

A process record gives the reviewer a different kind of evidence. It can show whether the document was composed in a controlled session, whether large blocks appeared instantly, whether external paste was blocked, and whether the final content matches the submitted hash.

That is not magic, and it is not a universal answer to every provenance question. It is simply evidence aimed at the question we actually care about.

## What organizations should do now

Treat watermarking as one input to a provenance policy, not as the policy itself.

Start by defining the decision you need to make. Are you trying to disclose AI assistance, identify likely model output, verify human composition, establish ownership, or reconstruct an approval chain? Each objective needs different evidence.

Then separate your controls:

- Use model watermarking and file provenance metadata for disclosure and classification.
- Use identity controls to establish who submitted the work.
- Use version history and approval records to establish review and acceptance.
- Use controlled composition capture when human authorship is a requirement.
- Record the limits of each signal so reviewers do not overinterpret it.
- Create an appeal process for cases where AI assistance and authorship overlap.

Do not write a policy that says "watermark detected equals AI-authored" or "no watermark equals human-authored." Both statements exceed what the evidence can support.

This is the same evidentiary problem we examined in [The Web Trusts Links. Who Proves the Author?](/blog/the-web-trusts-links-who-proves-the-author): trust in the channel, publisher, or curator can be useful, but it is not a substitute for proof of creation.

## The practical standard

Anthropic's announcement is a meaningful step toward making AI involvement more visible. We should welcome better provenance signals while being precise about their scope.

A watermark can tell you that a model may have touched the text. It cannot tell you who owned the idea, who wrote the draft, who made the edits, or who accepted responsibility for the final words.

If human authorship matters, capture evidence during composition and preserve it alongside the finished document. ByMyOwnHand does exactly that by recording writing sessions, blocking external paste, and issuing a verifiable proof link for the submitted work.

Your words deserve proof. Start with the process that created them.

<img src="https://api.looper.bot/api/track/blog/7fd5c4bc-93d1-4731-b7b2-7a6add611b8d/can-a-watermark-prove-who-wrote-the-words" alt="" width="1" height="1" style="position:absolute;left:-9999px;width:1px;height:1px;border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
