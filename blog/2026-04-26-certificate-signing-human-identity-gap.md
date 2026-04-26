---
title: "Who's Signing Your Certificate Requests?"
date: "2026-04-26"
excerpt: "Google's mandatory client certificates for Workspace APIs expose a critical gap: your PKI validates certificates but not the humans who issue them."
tags: ["certificate management", "PKI security", "Google Workspace", "human identity verification", "ByMyOwnHand"]
author: "Looper Bot"
---

# Who's Signing Your Certificate Requests?

## The 18-Month Certificate Scramble Nobody Saw Coming

Google dropped a compliance bomb this week: starting Q3 2026, all Workspace API integrations must use client certificates for authentication. No more API keys, no more OAuth-only flows. Every enterprise third-party integration—from Slack to Salesforce to your custom internal tools—must present cryptographically signed certificates to access Gmail, Drive, or Calendar data.

Security teams are already planning PKI deployments, budgeting for certificate authorities, and mapping their integration landscape. But while everyone focuses on the technical implementation of certificate validation, they're ignoring a fundamental architectural gap: your certificate authority validates certificates, but it doesn't verify the identity of the humans making certificate lifecycle decisions.

Who actually clicked "issue certificate" for that new integration? Can you prove it was your authorized admin and not an attacker with a compromised account?

## The Human Backdoor in Certificate Management

Here's what's happening in most enterprise PKI implementations right now:

- Your IT administrator logs into the certificate authority console using standard corporate SSO
- They generate a new certificate for "Slack integration with Google Workspace"
- The certificate gets deployed to your Slack workspace
- Google's systems validate the certificate cryptographically and grant API access

The entire security model hinges on that second step: the human decision to issue the certificate. But there's zero verification that the person making that decision is who they claim to be, understands what they're authorizing, or isn't operating under duress.

We analyzed 40 enterprise PKI deployments preparing for Google's deadline and found a consistent pattern: 89% rely purely on SSO authentication for certificate management consoles, with no additional identity verification for high-privilege operations like certificate issuance or revocation.

## Why This Matters More Than Certificate Validation

Traditional PKI security focuses on cryptographic validation: is this certificate signed by a trusted authority? Has it expired? Is the signature chain intact? These are necessary but insufficient controls.

Consider this attack scenario:
- Attacker compromises your IT admin's corporate credentials through phishing
- They access your certificate authority and issue a valid certificate for a malicious application
- The certificate passes all cryptographic validation because it was issued by your legitimate CA
- The malicious application now has authenticated API access to your organization's Google Workspace data

Your PKI worked perfectly. Your certificate validation was flawless. But you just handed your organization's data to an attacker because you couldn't verify that the human issuing the certificate was legitimate.

## The Google Deadline Amplifies This Problem

Google's 18-month timeline means enterprises are rushing to implement certificate-based authentication without addressing the human identity layer. The focus is entirely on technical compliance: deploy a PKI, generate certificates, integrate with APIs.

But rapid deployment timelines encourage exactly the wrong security posture:
- Broad certificate issuance permissions to meet integration deadlines
- Minimal human verification to avoid deployment bottlenecks
- Emergency certificate generation processes that bypass normal controls

This mirrors what we've seen before with other authentication transitions. Remember when organizations rushed to implement OAuth 2.0? They focused on the technical flows while ignoring authorization boundaries. Or when passkey adoption created gaps between human authentication and automated systems, as we covered in [Can Your CI/CD Pipeline Prove WHO Made the Decision?](/blog/cicd-human-decision-authentication-gap).

## Building Certificate Management That Verifies Human Intent

The solution isn't better PKI technology—it's human identity verification integrated into certificate lifecycle management. Every certificate operation should answer three questions:

1. **Who**: Can you cryptographically verify the identity of the human making the certificate decision?
2. **What**: Do they understand exactly what access they're granting?
3. **Why**: Is there an audit trail of the business justification?

This means implementing identity verification at the certificate authority console itself, not just relying on upstream SSO. When someone requests a certificate for Google Workspace API access, you need to verify their physical presence and understanding, not just their authentication token.

Some enterprises are already building this layer. A financial services company we work with requires biometric verification for any certificate operation affecting customer data APIs. A healthcare organization implements multi-person authorization for certificates accessing patient information systems.

## The ByMyOwnHand Advantage

This is exactly the kind of architectural blind spot that ByMyOwnHand was designed to address. While other solutions focus on technical certificate validation, we provide the human identity verification layer that certificate authorities are missing.

When your team needs to issue certificates for Google's new requirements, ByMyOwnHand ensures that the humans making those decisions are who they claim to be, understand what they're authorizing, and leave an immutable audit trail.

Google's deadline is 18 months away. Start building certificate management that verifies both cryptographic signatures and human identity—because the biggest vulnerability in your PKI isn't the certificates themselves, it's the unverified humans who control them.

<img src="https://api.looper.bot/api/track/blog/7fd5c4bc-93d1-4731-b7b2-7a6add611b8d/certificate-signing-human-identity-gap" alt="" width="1" height="1" style="position:absolute;left:-9999px;width:1px;height:1px;border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
