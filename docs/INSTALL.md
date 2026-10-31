# Installation

Order matters. Every step ends with a check; if the check fails, stop there.

**[Deutsche Fassung →](INSTALL.de.md)**

---

## 0. Before you start

You need:

- Shell or SFTP access to the osTicket directory (the folder that contains `include/` and `scp/`)
- An admin account in osTicket
- About 15 minutes, outside peak hours. Agents see no previews between steps 2 and 5.

**Lockout risk, read this first.** The upstream plugin (`attachments.phar`) and this plugin both declare the PHP class `AttachmentPreviewPlugin`. If both are installed at the same time, osTicket stops with `Cannot declare class AttachmentPreviewPlugin`, the admin panel included. Step 2 removes the old plugin completely before step 3 adds the new one.

**Kill switch.** If anything goes wrong after step 3, rename or delete `include/plugins/attachment-preview/`. osTicket then skips the plugin and the helpdesk works as before. No database change is needed.

---

## 1. Note your current settings (only when upgrading from upstream)

Admin panel → Manage → Plugins → **Attachment Inline Plugin** (or "Attachment Preview") → Instances → the instance → Config.

Write down every option. They are not carried over: the new plugin has its own id (`studio-prisma:attachment-preview`) and starts with defaults.

**Check:** you have a list of your current values.

---

## 2. Remove the upstream plugin (only when upgrading)

1. Admin panel → Manage → Plugins. Tick **Attachment Inline Plugin**, choose **Disable**, then tick it again and choose **Delete**.
2. On the server, delete the plugin file or folder:

   ```bash
   cd /path/to/osticket
   ls include/plugins/
   rm include/plugins/attachments.phar          # if you installed the phar
   # or: rm -r include/plugins/attachment_preview  (if you installed from source)
   ```

**Check:** Admin panel → Manage → Plugins lists no attachment plugin, and `ls include/plugins/` shows neither `attachments.phar` nor an `attachment_preview` folder. **Stop here if either is still present.**

---

## 3. Upload the new plugin

1. Download `attachment-preview-<version>.zip` from the [latest release](https://github.com/studio-prisma/osticket-plugin-attachment-preview/releases/latest).
2. Optional, verifies the package was built by this repository's release workflow:

   ```bash
   gh attestation verify attachment-preview-<version>.zip --repo studio-prisma/osticket-plugin-attachment-preview
   ```

3. Unzip into `include/plugins/`:

   ```bash
   cd /path/to/osticket/include/plugins
   unzip /path/to/attachment-preview-<version>.zip
   ```

   Without shell access: unzip locally and upload the `attachment-preview` folder with SFTP into `include/plugins/`.

4. The web server user needs read access (`chmod -R a+rX attachment-preview` if your uploads arrive with restrictive permissions).

**Check:** these files exist:

```
include/plugins/attachment-preview/plugin.php
include/plugins/attachment-preview/class.AttachmentPreviewPlugin.php
include/plugins/attachment-preview/vendor/purify.min.js
```

---

## 4. Install and enable

1. Admin panel → Manage → Plugins → **Add New Plugin** → **Install** next to *Attachment Preview*.
2. Open the plugin → **Instances** → **Add New Instance**. Give it a name, set Status to **Enabled**, save.
3. Open the instance → **Config**. Enter the values from step 1, or keep the defaults.

Create exactly one instance.

**Check:** the plugin list shows *Attachment Preview* as enabled, and one enabled instance.

---

## 5. Smoke test

Open a ticket that has a PDF and an image attachment, as an agent.

| Test | Expected |
|---|---|
| PDF attachment | The PDF is shown below the attachment link |
| Image attachment | The image is shown below the link, a click opens it full size |
| Browser console (F12) | `AP: Plugin loaded` exactly once, no red errors |
| ZIP export of the ticket (the print menu, or `scp/tickets.php?id=<id>&a=zip`) | The ZIP downloads and opens without errors |
| A ticket without attachments | Looks unchanged |

If a check fails: use the kill switch (rename the folder), then open an issue with the console output and your osTicket and PHP versions.

---

## 6. Security gate

Run this once after install, and again after changing options.

| Case | How to test | Expected |
|---|---|---|
| HTML preview off (default) | Ticket with an `.html` attachment | Only the download link, no preview |
| HTML preview on: script | Attach an `.html` file containing `<p>test</p><img src=x onerror="alert(1)"><script>alert(2)</script>`, open the ticket | "test" is shown, no alert appears |
| HTML preview on: remote image | Attach an `.html` file with `<img src="https://example.org/pixel.gif">` | Browser network tab shows no request to `example.org` |
| HTML preview on: link | `<a href="javascript:alert(1)">x</a>` in the attachment | The text "x" without a working link |
| YouTube on | A message containing a YouTube link | The player loads from `www.youtube-nocookie.com` |
| Vimeo on | A message containing `https://vimeo.com/<id>` | The player URL contains `dnt=1` |
| ZIP export | As in step 5 | Valid ZIP |

---

## Uninstall

1. Admin panel → Manage → Plugins → tick *Attachment Preview* → **Disable**, then **Delete**.
2. Delete `include/plugins/attachment-preview/`.

Agents' browsers keep the "Hide Seen" list under the key `attachment_preview_ids` in local storage until it expires or is cleared.

---

## Updating

1. Download the new release.
2. Replace the contents of `include/plugins/attachment-preview/` with the new folder (delete the old folder first, so no removed file stays behind).
3. Run the smoke test.

Settings are kept across updates within the same major version.
