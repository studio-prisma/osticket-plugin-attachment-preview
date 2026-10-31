# Installation

Die Reihenfolge ist bindend. Jeder Schritt endet mit einer Prüfung; schlägt sie fehl, dort abbrechen.

**[English version →](INSTALL.md)**

---

## 0. Vorab

Du brauchst:

- Shell- oder SFTP-Zugriff auf das osTicket-Verzeichnis (der Ordner mit `include/` und `scp/`)
- Ein Admin-Konto in osTicket
- Etwa 15 Minuten außerhalb der Hauptzeit. Zwischen Schritt 2 und 5 sehen Agenten keine Vorschau.

**Aussperr-Risiko, zuerst lesen.** Das Upstream-Plugin (`attachments.phar`) und dieses Plugin deklarieren beide die PHP-Klasse `AttachmentPreviewPlugin`. Sind beide gleichzeitig installiert, bricht osTicket mit `Cannot declare class AttachmentPreviewPlugin` ab, auch das Admin-Panel. Schritt 2 entfernt das alte Plugin vollständig, bevor Schritt 3 das neue hinzufügt.

**Notausschalter.** Geht nach Schritt 3 etwas schief: `include/plugins/attachment-preview/` umbenennen oder löschen. osTicket überspringt das Plugin dann und läuft wie vorher. Eine Datenbankänderung ist nicht nötig.

---

## 1. Aktuelle Einstellungen notieren (nur beim Umstieg von Upstream)

Admin-Panel → Verwalten → Plugins → **Attachment Inline Plugin** (oder „Attachment Preview") → Instanzen → die Instanz → Konfiguration.

Alle Optionen aufschreiben. Sie werden nicht übernommen: Das neue Plugin hat eine eigene ID (`studio-prisma:attachment-preview`) und startet mit den Standardwerten.

**Prüfung:** Du hast eine Liste deiner aktuellen Werte.

---

## 2. Upstream-Plugin entfernen (nur beim Umstieg)

1. Admin-Panel → Verwalten → Plugins. **Attachment Inline Plugin** anhaken, **Deaktivieren** wählen, dann erneut anhaken und **Löschen** wählen.
2. Auf dem Server die Plugin-Datei bzw. den Ordner löschen:

   ```bash
   cd /pfad/zu/osticket
   ls include/plugins/
   rm include/plugins/attachments.phar          # wenn das Phar installiert war
   # oder: rm -r include/plugins/attachment_preview  (wenn aus dem Quellcode installiert)
   ```

**Prüfung:** Admin-Panel → Verwalten → Plugins zeigt kein Anhang-Plugin mehr, und `ls include/plugins/` zeigt weder `attachments.phar` noch einen Ordner `attachment_preview`. **Abbruch, wenn eines davon noch da ist.**

---

## 3. Neues Plugin hochladen

1. `attachment-preview-<version>.zip` aus dem [neuesten Release](https://github.com/studio-prisma/osticket-plugin-attachment-preview/releases/latest) laden.
2. Optional, prüft, dass das Paket vom Release-Workflow dieses Repos gebaut wurde:

   ```bash
   gh attestation verify attachment-preview-<version>.zip --repo studio-prisma/osticket-plugin-attachment-preview
   ```

3. Nach `include/plugins/` entpacken:

   ```bash
   cd /pfad/zu/osticket/include/plugins
   unzip /pfad/zu/attachment-preview-<version>.zip
   ```

   Ohne Shell: lokal entpacken und den Ordner `attachment-preview` per SFTP nach `include/plugins/` hochladen.

4. Der Webserver-Benutzer braucht Leserechte (`chmod -R a+rX attachment-preview`, falls Uploads mit restriktiven Rechten ankommen).

**Prüfung:** Diese Dateien existieren:

```
include/plugins/attachment-preview/plugin.php
include/plugins/attachment-preview/class.AttachmentPreviewPlugin.php
include/plugins/attachment-preview/vendor/purify.min.js
```

---

## 4. Installieren und aktivieren

1. Admin-Panel → Verwalten → Plugins → **Neues Plugin hinzufügen** → **Installieren** neben *Attachment Preview*.
2. Plugin öffnen → **Instanzen** → **Neue Instanz hinzufügen**. Namen vergeben, Status **Aktiviert**, speichern.
3. Instanz öffnen → **Konfiguration**. Werte aus Schritt 1 eintragen oder die Standardwerte lassen.

Genau eine Instanz anlegen.

**Prüfung:** Die Plugin-Liste zeigt *Attachment Preview* als aktiviert und genau eine aktive Instanz.

---

## 5. Smoke-Test

Als Agent ein Ticket mit einem PDF- und einem Bild-Anhang öffnen.

| Test | Erwartet |
|---|---|
| PDF-Anhang | Das PDF erscheint unter dem Anhang-Link |
| Bild-Anhang | Das Bild erscheint unter dem Link, ein Klick öffnet es in voller Größe |
| Browser-Konsole (F12) | `AP: Plugin loaded` genau einmal, keine roten Fehler |
| ZIP-Export des Tickets (Druckmenü oder `scp/tickets.php?id=<id>&a=zip`) | Das ZIP lädt herunter und lässt sich fehlerfrei öffnen |
| Ein Ticket ohne Anhänge | Sieht unverändert aus |

Schlägt ein Test fehl: Notausschalter (Ordner umbenennen), dann ein Issue mit der Konsolenausgabe sowie osTicket- und PHP-Version anlegen.

---

## 6. Security-Gate

Einmal nach der Installation durchgehen und erneut nach jeder Änderung der Optionen.

| Fall | Test | Erwartet |
|---|---|---|
| HTML-Vorschau aus (Standard) | Ticket mit einem `.html`-Anhang | Nur der Download-Link, keine Vorschau |
| HTML-Vorschau an: Skript | `.html`-Datei mit `<p>test</p><img src=x onerror="alert(1)"><script>alert(2)</script>` anhängen, Ticket öffnen | „test" wird angezeigt, kein Alert erscheint |
| HTML-Vorschau an: externes Bild | `.html`-Datei mit `<img src="https://example.org/pixel.gif">` | Im Netzwerk-Tab des Browsers keine Anfrage an `example.org` |
| HTML-Vorschau an: Link | `<a href="javascript:alert(1)">x</a>` im Anhang | Der Text „x" ohne funktionierenden Link |
| YouTube an | Nachricht mit einem YouTube-Link | Der Player lädt von `www.youtube-nocookie.com` |
| Vimeo an | Nachricht mit `https://vimeo.com/<id>` | Die Player-URL enthält `dnt=1` |
| ZIP-Export | Wie in Schritt 5 | Gültiges ZIP |

---

## Deinstallation

1. Admin-Panel → Verwalten → Plugins → *Attachment Preview* anhaken → **Deaktivieren**, dann **Löschen**.
2. `include/plugins/attachment-preview/` löschen.

Die Browser der Agenten behalten die „Hide Seen"-Liste unter dem Schlüssel `attachment_preview_ids` im Local Storage, bis sie abläuft oder gelöscht wird.

---

## Aktualisieren

1. Neues Release laden.
2. Den Inhalt von `include/plugins/attachment-preview/` durch den neuen Ordner ersetzen (alten Ordner vorher löschen, damit keine entfernte Datei liegen bleibt).
3. Smoke-Test durchführen.

Innerhalb derselben Major-Version bleiben die Einstellungen erhalten.
