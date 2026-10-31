# Attachment Preview for osTicket

[![Validate](https://github.com/studio-prisma/osticket-plugin-attachment-preview/actions/workflows/validate.yml/badge.svg)](https://github.com/studio-prisma/osticket-plugin-attachment-preview/actions/workflows/validate.yml)
[![License: GPL-2.0](https://img.shields.io/badge/License-GPL--2.0-blue.svg)](LICENSE)

Shows ticket attachments inline in the agent view of osTicket: PDFs, images, text and mail files, audio, video, and optionally sanitized HTML and YouTube/Vimeo players.

This is a maintained fork of [clonemeagain/attachment_preview](https://github.com/clonemeagain/attachment_preview). It fixes the open upstream issues, replaces the hand-written HTML filter with DOMPurify and ships as a plain plugin folder instead of a `.phar`. The fixes are offered upstream as separate pull requests.

**[Deutsche Fassung →](README.de.md)**

---

## Requirements

- osTicket **1.18.x** (tested against the 1.18 code base, latest 1.18.4)
- PHP **8.0 – 8.4** (syntax-checked on every version in CI, tests run on 8.3)
- Agents use a current browser. PDFs are shown by the browser's own PDF viewer.
- Attachments on S3 or another external storage need a CORS rule that allows `GET` from your helpdesk origin.

---

## Install

Full guide: **[docs/INSTALL.md](docs/INSTALL.md)** ([deutsch](docs/INSTALL.de.md)).

Short version:

1. **Remove the upstream plugin first** if it is installed (`attachments.phar`). Both declare the class `AttachmentPreviewPlugin`; with both installed osTicket stops with a fatal error.
2. Download `attachment-preview-<version>.zip` from the [latest release](https://github.com/studio-prisma/osticket-plugin-attachment-preview/releases/latest).
3. Unzip into `include/plugins/`, which creates `include/plugins/attachment-preview/`.
4. Admin panel → Manage → Plugins → Add New Plugin → install **Attachment Preview**, add one instance, enable it.

---

## Configuration

| Setting | Default | Purpose |
|---|---|---|
| Permission | on | Master switch for the inline previews |
| Hide Seen | off | Remembers seen attachments in the agent's browser and shows a button instead of the preview next time |
| Number of days to remember attachments for | 14 | Seen entries older than this are deleted from browser storage |
| Max Size | 1024 KB | Larger attachments stay links. 0 = no limit |
| Inline PDF files | on | `<object>` with the browser PDF viewer |
| Inline image files | on | bmp, svg, gif, png, jpg, jpeg as `<img>` |
| Inline textfiles (txt, csv, eml) | on | Shown as plain text in `<pre>`, never as HTML |
| Inline HTML files | **off** | HTML attachments, sanitized with DOMPurify (see below) |
| Inline audio / video | off | HTML5 players for attached media files |
| Inline YouTube links | **off** | Player from `youtube-nocookie.com` |
| Inline Vimeo links | **off** | Player from `player.vimeo.com` with `dnt=1` |
| Number of attachments to show initially | All | Attachments beyond this number get a "Show Attachment" button |
| Open attachment links in new tab | off | Adds `target="_blank"` to attachment links |

Run exactly **one** instance. A second enabled instance is ignored (the first one renders the page).

### HTML attachments

With "Inline HTML files" on, the attachment is fetched as text and passed through [DOMPurify](https://github.com/cure53/DOMPurify) 3.4.17 before it is inserted. What remains:

- Formatting tags (paragraphs, lists, tables, bold/italic, headings, links, images)
- Links only to `http:`, `https:` and `mailto:`, opened in a new tab with `rel="noopener noreferrer nofollow"`
- Images only when embedded as `data:image/png|gif|jpeg|webp;base64`. Remote images are removed, so a tracking pixel does not report when an agent opened the mail.

Removed: scripts, event handlers, `style`, `class`, `id`, forms, frames, `object`/`embed`, SVG and MathML.

If `vendor/purify.min.js` is missing, HTML attachments are not rendered at all; the preview shows a notice instead.

### Third-party players

YouTube and Vimeo players load content from Google or Vimeo whenever an agent opens a ticket that contains such a link. Both options are off by default. Turn them on only if that matches your privacy requirements.

---

## Testing

```bash
npm ci
./tests/run-all.sh
```

| Suite | What it checks |
|---|---|
| `tests/unit.php` | Manifest, defaults, URL detection, YouTube/Vimeo parsing, attachment types, script injection, escaping |
| `tests/failmode.php` | Plugin without `vendor/`: no sanitizer, HTML preview off, everything else works |
| `tests/integration.php` | `php -S`: real headers and output buffering. ZIP export byte-identical, two instances render once, CSP rewrite |
| `tests/js/run.js` | jsdom + jQuery 3.7.0 on a page rendered by the plugin: 35 XSS payloads, ordinary HTML mail, fail-closed, "Hide Seen" cache |

Not verified: a full osTicket installation end to end, Firefox and Safari, S3 storage, PJAX navigation between tickets.

---

## Known limitations

- **Print view:** attachments are not inlined in the print output (upstream #36). That needs a change to osTicket core.
- **PDFs** depend on the browser viewer. Internet Explorer is not supported.
- **CSP:** the plugin adds `blob:` to `object-src` on ticket pages so the PDF can be shown from a Blob URL.
- **Agent pages only.** The client portal is not changed.
- **Migration from upstream:** settings are not taken over. Note them before removing the old plugin.
- The plugin buffers and re-parses the whole ticket page. On very large threads this costs some milliseconds per request.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md), never a public issue.

## License

[GPL-2.0](LICENSE), like the upstream plugin by clonemeagain. DOMPurify (bundled in the release package under `vendor/`) is © Cure53, Apache-2.0 or MPL-2.0.
