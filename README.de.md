# Attachment Preview für osTicket

[![Validate](https://github.com/studio-prisma/osticket-plugin-attachment-preview/actions/workflows/validate.yml/badge.svg)](https://github.com/studio-prisma/osticket-plugin-attachment-preview/actions/workflows/validate.yml)
[![License: GPL-2.0](https://img.shields.io/badge/License-GPL--2.0-blue.svg)](LICENSE)

Zeigt Ticket-Anhänge direkt in der Agentenansicht von osTicket an: PDFs, Bilder, Text- und Mail-Dateien, Audio, Video und optional bereinigtes HTML sowie YouTube- und Vimeo-Player.

Gepflegter Fork von [clonemeagain/attachment_preview](https://github.com/clonemeagain/attachment_preview). Er behebt die offenen Upstream-Issues, ersetzt den selbstgebauten HTML-Filter durch DOMPurify und wird als normaler Plugin-Ordner statt als `.phar` ausgeliefert. Die Fixes gehen als einzelne Pull Requests an Upstream.

**[English version →](README.md)**

---

## Voraussetzungen

- osTicket **1.18.x** (getestet gegen den Code von 1.18, zuletzt 1.18.4)
- PHP **8.0 – 8.4** (Syntaxprüfung auf jeder Version in der CI, Tests laufen auf 8.3)
- Agenten nutzen einen aktuellen Browser. PDFs zeigt der eingebaute PDF-Viewer des Browsers.
- Anhänge auf S3 oder anderem externen Speicher brauchen eine CORS-Regel, die `GET` von der Helpdesk-Domain erlaubt.

---

## Installation

Vollständige Anleitung: **[docs/INSTALL.de.md](docs/INSTALL.de.md)** ([english](docs/INSTALL.md)).

Kurzfassung:

1. **Zuerst das Upstream-Plugin entfernen**, falls installiert (`attachments.phar`). Beide deklarieren die Klasse `AttachmentPreviewPlugin`; sind beide installiert, bricht osTicket mit einem Fatal Error ab.
2. `attachment-preview-<version>.zip` aus dem [neuesten Release](https://github.com/studio-prisma/osticket-plugin-attachment-preview/releases/latest) laden.
3. Nach `include/plugins/` entpacken. Es entsteht `include/plugins/attachment-preview/`.
4. Admin-Panel → Verwalten → Plugins → Neues Plugin hinzufügen → **Attachment Preview** installieren, eine Instanz anlegen, aktivieren.

---

## Konfiguration

| Einstellung | Standard | Zweck |
|---|---|---|
| Permission | an | Hauptschalter für die Vorschau |
| Hide Seen | aus | Merkt sich gesehene Anhänge im Browser des Agenten und zeigt beim nächsten Mal einen Button statt der Vorschau |
| Number of days to remember attachments for | 14 | Ältere Einträge werden aus dem Browser-Speicher gelöscht |
| Max Size | 1024 KB | Größere Anhänge bleiben Links. 0 = keine Grenze |
| Inline PDF files | an | `<object>` mit dem PDF-Viewer des Browsers |
| Inline image files | an | bmp, svg, gif, png, jpg, jpeg als `<img>` |
| Inline textfiles (txt, csv, eml) | an | Als reiner Text in `<pre>`, nie als HTML |
| Inline HTML files | **aus** | HTML-Anhänge, bereinigt mit DOMPurify (siehe unten) |
| Inline audio / video | aus | HTML5-Player für angehängte Mediendateien |
| Inline YouTube links | **aus** | Player von `youtube-nocookie.com` |
| Inline Vimeo links | **aus** | Player von `player.vimeo.com` mit `dnt=1` |
| Number of attachments to show initially | All | Anhänge über dieser Zahl bekommen einen Button „Show Attachment" |
| Open attachment links in new tab | aus | Setzt `target="_blank"` an Anhang-Links |

Genau **eine** Instanz betreiben. Eine zweite aktive Instanz wird ignoriert, die erste rendert die Seite.

### HTML-Anhänge

Ist „Inline HTML files" an, wird der Anhang als Text geladen und vor dem Einfügen durch [DOMPurify](https://github.com/cure53/DOMPurify) 3.4.17 geschickt. Übrig bleibt:

- Formatierung (Absätze, Listen, Tabellen, fett/kursiv, Überschriften, Links, Bilder)
- Links nur auf `http:`, `https:` und `mailto:`, geöffnet im neuen Tab mit `rel="noopener noreferrer nofollow"`
- Bilder nur, wenn sie als `data:image/png|gif|jpeg|webp;base64` eingebettet sind. Externe Bilder werden entfernt, ein Tracking-Pixel meldet also nicht, wann ein Agent die Mail geöffnet hat.

Entfernt: Skripte, Event-Handler, `style`, `class`, `id`, Formulare, Frames, `object`/`embed`, SVG und MathML.

Fehlt `vendor/purify.min.js`, werden HTML-Anhänge gar nicht dargestellt; die Vorschau zeigt stattdessen einen Hinweis.

### Player von Drittanbietern

YouTube- und Vimeo-Player laden Inhalte von Google bzw. Vimeo, sobald ein Agent ein Ticket mit einem solchen Link öffnet. Beide Optionen sind standardmäßig aus. Nur einschalten, wenn das zu euren Datenschutzvorgaben passt.

---

## Tests

```bash
npm ci
./tests/run-all.sh
```

| Suite | Prüft |
|---|---|
| `tests/unit.php` | Manifest, Defaults, URL-Erkennung, YouTube/Vimeo-Parsing, Anhangtypen, Skript-Injektion, Escaping |
| `tests/failmode.php` | Plugin ohne `vendor/`: kein Sanitizer, HTML-Vorschau aus, alles andere läuft |
| `tests/integration.php` | `php -S`: echte Header und Output-Buffering. ZIP-Export bytegleich, zwei Instanzen rendern einmal, CSP-Anpassung |
| `tests/js/run.js` | jsdom + jQuery 3.7.0 auf einer vom Plugin gerenderten Seite: 35 XSS-Payloads, normale HTML-Mail, Fail-closed, „Hide Seen"-Cache |

Nicht geprüft: eine vollständige osTicket-Installation Ende-zu-Ende, Firefox und Safari, S3-Speicher, PJAX-Navigation zwischen Tickets.

---

## Bekannte Grenzen

- **Druckansicht:** Anhänge erscheinen nicht im Ausdruck (Upstream #36). Dafür müsste osTicket selbst geändert werden.
- **PDFs** hängen vom Viewer des Browsers ab. Internet Explorer wird nicht unterstützt.
- **CSP:** Auf Ticketseiten ergänzt das Plugin `object-src` um `blob:`, damit das PDF aus einer Blob-URL angezeigt werden kann.
- **Nur Agentenseiten.** Das Kundenportal bleibt unverändert.
- **Umstieg von Upstream:** Einstellungen werden nicht übernommen. Vor dem Entfernen des alten Plugins notieren.
- Das Plugin puffert die ganze Ticketseite und parst sie neu. Bei sehr langen Threads kostet das pro Aufruf einige Millisekunden.

---

## Mitarbeit

Siehe [CONTRIBUTING.md](CONTRIBUTING.md). Sicherheitslücken: siehe [SECURITY.md](SECURITY.md), nie als öffentliches Issue.

## Lizenz

[GPL-2.0](LICENSE), wie das Upstream-Plugin von clonemeagain. DOMPurify (im Release-Paket unter `vendor/`) ist © Cure53, Apache-2.0 oder MPL-2.0.
