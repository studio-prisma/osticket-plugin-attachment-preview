# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions before 2.0.0 are the upstream plugin [clonemeagain/attachment_preview](https://github.com/clonemeagain/attachment_preview).

## [Unreleased]

## [2.0.0] - 2026-10-31

First release of the studio-prisma fork, based on upstream v1.18 (`50bbb30`).

### Changed

- **Breaking:** own plugin id `studio-prisma:attachment-preview`. Remove the upstream plugin before installing (both declare `AttachmentPreviewPlugin`); settings are not carried over. See [docs/INSTALL.md](docs/INSTALL.md).
- **Breaking:** shipped as a ZIP with an `attachment-preview/` folder instead of `attachments.phar`. The package contains only the production files (the upstream phar contained a complete `.git` directory).
- HTML attachments are sanitized with DOMPurify 3.4.17 instead of a regex filter. Remote images, `style`, `class`, `id`, forms and frames are removed; links get `target="_blank"` and `rel="noopener noreferrer nofollow"`. Without `vendor/purify.min.js` the HTML preview stays off.
- YouTube players load from `youtube-nocookie.com`, with a validated video id, a referrer policy and lazy loading.
- Text and HTML attachments are fetched with `dataType: 'text'`, so jQuery never interprets a response by its Content-Type.
- Settings passed to the script are JSON-escaped for use inside `<script>`.

### Added

- Optional Vimeo player for links to Vimeo videos, including unlisted ones, with `dnt=1`. Off by default (upstream #43).
- `.eml` attachments are shown as text (upstream #48).
- Test suites: unit, fail-mode, `php -S` integration and jsdom browser tests; CI on PHP 8.0–8.4; reproducible release build with provenance attestation; Dependabot for npm and GitHub Actions.

### Fixed

- ZIP export of tickets produced a broken file, because the plugin ran every response under a ticket URL through the HTML parser. Non-HTML responses and downloads are now passed through unchanged (upstream #49).
- Attachments appeared twice when more than one plugin instance was enabled; only one instance renders the page now (upstream #47).
- The "Hide Seen" cache never expired and was keyed by page position; it now expires after the configured number of days and uses osTicket's file key (upstream #34).
- Seen YouTube players had no "Show Attachment" button and could not be shown again (upstream #35).
- With ticket locking off the ticket id could not be determined for "Hide Seen"; it now falls back to `?id=`.
- HTML mails with two or more attributes on an element were not shown at all, because the old filter threw while removing attributes.
- Deprecation notice under PHP 8.4 (implicitly nullable parameter), which could print before the headers.

[Unreleased]: https://github.com/studio-prisma/osticket-plugin-attachment-preview/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/studio-prisma/osticket-plugin-attachment-preview/releases/tag/v2.0.0
