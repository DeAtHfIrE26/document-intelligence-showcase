# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/).

## 1.0.0 - 2026-09-26

### Added

- Framework-free TypeScript components: upload dropzone, processing stages,
  entity-highlighting document viewer, sortable and filterable entity table,
  entity-type filter, and WAI-ARIA tabs.
- `ExtractionResult` / `Extractor` contract, and a mock extractor that
  returns recorded pipeline output for five public-domain, original or
  synthetic samples, plus a rule-based extractor for uploaded text files.
- Vite playground with light and dark themes and reduced-motion support.
- 49 Vitest tests (94.6% line coverage), ESLint with an `innerHTML` ban,
  strict TypeScript, and CI for lint, typecheck, tests, build and secret
  scanning.
- Contributing guide, code of conduct, security policy, issue and pull
  request templates, and a roadmap with good first issues.
