# Security policy

## Supported versions

Only the latest `main` is supported.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Preferred: GitHub's private vulnerability reporting (the **Security** tab
  → **Report a vulnerability**).
- Or email **kashyappatel2673@gmail.com** with "SECURITY" in the subject.

Include what you found, how to reproduce it, and the impact you expect. You
will get an acknowledgement within 72 hours and a status update within 7
days. Please give us reasonable time to fix the issue before disclosing it.

## Scope

This repository contains front-end code and a mock extractor only; it has no
server, stores nothing, and makes no network requests. Reports about the
hosted application at https://document-intelligence-framework.vercel.app are
also welcome through the same channels.

## Practices in this repository

- Document text is rendered with DOM APIs only; `innerHTML` is banned in
  `src/` by lint, and an XSS regression test covers the highlighter.
- CI runs a secret scan (gitleaks) on every push and pull request.
- `.env.example` contains placeholders only; nothing in the build needs a
  secret.
