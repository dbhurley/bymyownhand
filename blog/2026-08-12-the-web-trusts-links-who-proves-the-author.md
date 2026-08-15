---
title: "The Web Trusts Links. Who Proves the Author?"
date: "2026-08-12"
excerpt: "Human curation can help us find trustworthy work. It cannot prove who wrote it. The missing layer is authorship evidence captured during composition."
tags: ["authorship", "provenance", "web infrastructure", "content trust", "curation"]
author: "Looper Bot"
---

# The Web Trusts Links. Who Proves the Author?

## The web is rebuilding its trust graph

An [Ars Technica retrospective on the pre-Google web](https://arstechnica.com/gadgets/2026/08/remembering-the-pre-google-web-when-search-was-an-experiment/) landed this week with a useful reminder: before search engines became the default map of the internet, people found sites through human-curated networks such as webrings, directories, newsletters, and personal recommendations.

That history matters because discovery is moving in a similar direction again. People are tired of ranking systems that return pages optimized for visibility rather than usefulness. They are finding better work through specialist communities, trusted individuals, private groups, independent newsletters, and carefully maintained link collections.

This is a healthy correction. Human judgment is often a better filter than engagement optimization.

But it leaves a technical gap that curation alone cannot solve:

A trusted person can recommend a document without proving who created it.

The web is rediscovering trusted discovery. It still lacks a dependable authorship layer.

## A recommendation is not provenance

A link carries useful information. It tells us that someone chose to point at a piece of work. If we trust the curator, that recommendation increases the likelihood that the material is relevant, thoughtful, or worth our time.

It does not establish authorship.

The linked page might have been written by the person named on it. It might have been copied from somewhere else. It might have been generated, translated, heavily edited, or assembled from several sources. The curator may not know. The publishing platform may not know. The reader usually has no way to distinguish among those cases.

We regularly collapse several different trust questions into one vague feeling of credibility:

- Is this source worth reading?
- Did this account publish it first?
- Is the material original rather than copied?
- Did a human compose the work?
- Can the author explain how it was produced?

Curation helps answer the first question. Platform records may help answer the second. Similarity checks can sometimes address the third. None of them, by themselves, answer the fourth or fifth.

That distinction is becoming more important as automated systems produce polished text at distribution scale. A document can acquire reputation after publication even when nobody can later reconstruct its origin. A trusted community can elevate it. A respected newsletter can recommend it. A search system can cite it. Distribution can create an appearance of legitimacy faster than evidence can catch up.

We should stop treating reputation as a substitute for provenance.

## The missing layer sits before publication

Most publishing systems record the artifact after it exists. They store the final text, the account that uploaded it, the publication timestamp, and perhaps a revision history. Those records are valuable, but they describe the document at the edge of distribution.

They do not describe composition.

A stronger authorship record begins while the work is being created. It captures evidence about the writing session, then binds that evidence to the final document. The implementation does not need to expose every private thought or preserve every keystroke forever. It does need to produce a tamper-evident account of how the artifact came into existence.

A practical design might include:

- An append-only session log recording writing events and precise timing.
- Clear handling for insertions, deletions, pauses, revisions, and pasted content.
- Integrity controls that make silent alteration of the session detectable.
- A cryptographic hash binding the final document to the recorded session.
- A signed verification record that an independent reader can inspect.
- Privacy boundaries that reveal evidence of composition without exposing unrelated user activity.

This is not a magical human detector. It is a provenance system.

That difference matters. A detector makes a probabilistic claim about text. A provenance system records evidence about a particular production process. One asks whether a passage resembles machine output. The other asks whether there is a credible, verifiable trail showing how this document was composed.

The second question is harder, but it is also closer to what publishers, schools, employers, and communities actually need.

## We need trust at three different edges

The web's trust infrastructure is often discussed as though one signal should solve everything. It will not. We need to separate at least three layers.

First, discovery trust answers: why did this work reach me? The answer may be a curator, a community moderator, a newsletter editor, or a recommendation system.

Second, identity trust answers: who is associated with the account or publication? Domains, credentials, signatures, and account history can help here, although none is perfect.

Third, authorship trust answers: what evidence connects the named author to the act of composing this specific work?

These layers reinforce one another, but they are not interchangeable. A respected editor can select a document written by someone else. A verified account can publish material produced by a third party. A signed file can prove that a key approved the artifact without proving who drafted its words.

Our earlier post, [Can X Prove Who Earned the Reward?](/blog/can-x-prove-who-earned-the-reward), made a similar distinction between originality as a platform policy and authorship as an evidence problem. The return of human-curated discovery extends that problem beyond creator payments. It affects how the whole web decides what deserves attention.

## What publishers and platforms should build now

If you operate a publishing, education, collaboration, or knowledge platform, do not begin with a badge. Begin with the evidence model.

Define the claim you want to make. Is it that a person controlled the account, that the work was not copied, that a human participated, or that a specific person composed the document? Each claim requires different evidence and different limits.

Then record provenance at the point where it is cheapest and most reliable: during composition. Post-publication metadata is useful, but it is often incomplete, editable, or separated from the process that produced the work.

Design the verification experience for skeptical readers. A proof page should show what was verified, when the session occurred, what integrity checks passed, and what the system cannot establish. Avoid a single score that encourages people to treat a complex judgment as a certificate of moral purity.

Finally, make the record portable. If evidence only works inside one platform, it becomes another proprietary reputation layer. A document should be able to carry a verification hash or signed receipt across a newsletter, a school portal, a forum, and a personal site.

The best trust infrastructure will not ask readers to trust the vendor. It will give them enough evidence to check the claim themselves.

## Curation brings us back to the real question

The pre-Google web was not trustworthy because every site was authentic. It was useful because people created visible paths through an overwhelming information space. The modern version of that idea can give us better discovery without pretending that recommendation proves origin.

Human curation tells us where to look. Authorship evidence tells us what happened before the work arrived there.

Those are separate systems, and the next web needs both.

ByMyOwnHand is built around that missing composition layer: a locked writing environment, a recorded creation session, and a verification link tied to the submitted document. If your work needs more than a reputation signal, create a proof that can travel with it.

<img src="https://api.looper.bot/api/track/blog/7fd5c4bc-93d1-4731-b7b2-7a6add611b8d/the-web-trusts-links-who-proves-the-author" alt="" width="1" height="1" style="position:absolute;left:-9999px;width:1px;height:1px;border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
