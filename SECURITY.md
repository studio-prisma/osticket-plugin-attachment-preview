# Security Policy

## Supported Versions

Only the latest minor release line is maintained.

| Version | Status |
|---------|--------|
| 2.0.x   | ✅ Supported |
| < 2.0 (upstream `attachments.phar`) | ❌ Not maintained here |

## Reporting a Vulnerability

This plugin rewrites every agent ticket page and can render attachment content sent in by anyone who mails the helpdesk. Report findings **privately**, never as a public issue.

1. Open the [Security tab](https://github.com/studio-prisma/osticket-plugin-attachment-preview/security)
2. Click **Report a vulnerability**
3. Include a description, the affected version, the plugin options that were enabled, and reproduction steps

You will get a first response within **14 days**. Resolution is best-effort; this project is maintained by a single person.

Do **not** include ticket contents, customer data or real attachments in a report. A minimal crafted file is enough.

## In Scope

- **Script execution from an attachment**: any HTML, text, mail, image or media attachment that runs script in the agent's session, with any combination of plugin options
- **Sanitizer bypass**: markup that survives `AttachmentPreview.sanitize()` outside the documented allowlist (tags, attributes, URL schemes in [README.md](README.md#html-attachments))
- **Fail-open**: HTML being rendered while `vendor/purify.min.js` is missing or fails to load
- **Remote resource loading from an HTML attachment**: images, styles or anything else that makes the agent's browser contact a third party
- **Server-side injection** through the DOM rewrite: attachment names or message content that end up as markup or script in the rewritten page
- **Response corruption or disclosure**: downloads, exports or non-HTML responses being altered, or content of one response leaking into another
- **CSP handling**: the header rewrite weakening the policy beyond adding `blob:` to `object-src`
- **Player embeds**: a crafted link that makes the YouTube or Vimeo embed load anything other than the official player of that video

## Out of Scope

- **YouTube and Vimeo contacting Google or Vimeo** when those options are enabled. Documented, off by default.
- **`blob:` in `object-src`** on ticket pages. Required for the PDF preview and documented.
- **Content of PDFs, images and media.** Those are rendered by the browser's own viewers in their own sandboxes. Vulnerabilities there belong to the browser vendor.
- **Agents opening a downloaded attachment** outside the preview.
- **Browser storage**: the "Hide Seen" list holds ticket ids and osTicket file keys in the agent's local storage. Anyone with access to that browser profile can read it.
- Vulnerabilities in osTicket core — report those to the [osTicket project](https://github.com/osTicket/osTicket/security).
- Vulnerabilities in DOMPurify itself — report those to [Cure53](https://github.com/cure53/DOMPurify/security). If a DOMPurify fix needs a release here, that is in scope.
- Issues that only affect the upstream plugin or a version outside the supported line.

## Dependencies

The release package contains one third-party file: `vendor/purify.min.js`, DOMPurify, pinned to an exact version in `package.json` and installed with `npm ci` from the lockfile. `tools/vendor.sh` refuses to copy a build whose version differs from the pin. Dependabot watches npm and GitHub Actions weekly.

## Disclosure

Once a fix is released, the affected versions are named in the [CHANGELOG](CHANGELOG.md) and the release notes. Reporters who want to be credited are named there.
