'use strict';
// Browser-side tests in jsdom. The page is rendered by the real plugin
// (tests/js/render.php), jQuery 3.7.0 is the version osTicket 1.18 ships.
// Run: npm test   (needs php on PATH and vendor/ built by tools/vendor.sh)
const { JSDOM } = require('jsdom');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PHP = process.env.PHP_BIN || 'php';
const JQUERY = fs.readFileSync(require.resolve('jquery/dist/jquery.min.js'), 'utf8');
const ORIGIN = 'https://desk.example.test';

let pass = 0, fail = 0;
const grp = (n) => console.log(`\n== ${n} ==`);
function ok(cond, name, extra) {
    if (cond) { pass++; console.log(`  PASS  ${name}`); }
    else { fail++; console.log(`  FAIL  ${name}${extra !== undefined ? '  -> ' + extra : ''}`); }
}
const eq = (a, b, name) => ok(a === b, name, `expected=${JSON.stringify(b)} got=${JSON.stringify(a)}`);

function render(input, pluginDir) {
    const env = Object.assign({}, process.env, pluginDir ? { PLUGIN_DIR: pluginDir } : {});
    return execFileSync(PHP, [path.join(ROOT, 'tests', 'js', 'render.php')], {
        input: JSON.stringify(input), env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    });
}

/**
 * Loads a rendered page with jQuery and a $.get stub in <head>, then runs the
 * page's own inline scripts (the ones the plugin injected) like a browser would.
 * opts.fixtures: url -> response body; opts.storage: localStorage seed;
 * opts.before: script run before jQuery (e.g. a page-owned DOMPurify).
 */
function load(input, opts = {}) {
    let page = render(input, opts.pluginDir);
    const stub = `
        window.__gets = [];
        window.__fixtures = ${JSON.stringify(opts.fixtures || {}).replace(/</g, "\\u003c")};
        jQuery.get = function (url, cb, type) {
            window.__gets.push({ url: url, type: type });
            if (url in window.__fixtures) cb(window.__fixtures[url]);
        };`;
    const head = (opts.before ? `<script>${opts.before}</script>` : '')
        + `<script>${JQUERY.replace(/<\/script/gi, '<\\/script')}</script><script>${stub}</script>`;
    page = page.replace('</title>', '</title>' + head);
    const errors = [];
    const dom = new JSDOM(page, {
        url: `${ORIGIN}/scp/tickets.php?id=5`,
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        beforeParse(window) {
            window.console.log = () => {};
            window.addEventListener('error', (e) => errors.push(e.message));
            if (opts.storage) {
                for (const [k, v] of Object.entries(opts.storage)) window.localStorage.setItem(k, v);
            }
        }
    });
    dom.window.__errors = errors;
    return dom.window;
}

const file = (key, name) => [`/scp/file.php?key=${key}&expires=1900000000&signature=s&id=1`, name];
const links = (...pairs) => Object.fromEntries(pairs);

// ---------- J1: sanitizer against XSS payloads ----------
grp('J1 DOMPurify sanitizer: payloads');
const ALLOWED_TAGS = new Set(['A', 'ABBR', 'B', 'BLOCKQUOTE', 'BR', 'CAPTION', 'CODE', 'DD', 'DEL', 'DIV', 'DL', 'DT',
    'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I', 'IMG', 'INS', 'LI', 'OL', 'P', 'PRE', 'S', 'SMALL', 'SPAN',
    'STRIKE', 'STRONG', 'SUB', 'SUP', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL']);
const ALLOWED_ATTR = new Set(['href', 'title', 'alt', 'src', 'colspan', 'rowspan', 'target', 'rel']);
const payloads = [
    '<img src=x onerror="window.__xss=1">',
    '<script>window.__xss=1</script>',
    '<svg><script>window.__xss=1</script></svg>',
    '<svg onload="window.__xss=1"></svg>',
    '<a href="javascript:window.__xss=1">x</a>',
    '<a href="JaVaScRiPt&#58;window.__xss=1">x</a>',
    '<a href="  javascript:window.__xss=1">x</a>',
    '<a href="java&#x09;script:window.__xss=1">x</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD53aW5kb3cuX194c3M9MTwvc2NyaXB0Pg==">x</a>',
    '<a href="vbscript:msgbox(1)">x</a>',
    '<iframe src="javascript:window.__xss=1"></iframe>',
    '<math><mtext><table><mglyph><style><img src=x onerror="window.__xss=1">',
    '<noscript><p title="</noscript><img src=x onerror=window.__xss=1>">',
    '<form action="https://evil.example/"><input name=p><button formaction="javascript:window.__xss=1">x</button></form>',
    '<style>@import "https://evil.example/x.css";</style><p>hi</p>',
    '<p style="background:url(https://evil.example/t.png)">t</p>',
    '<img src="https://tracker.example/pixel.gif">',
    '<img src="cid:image001.png@01D">',
    '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
    '<object data="data:text/html,<script>window.__xss=1</script>"></object>',
    '<embed src="https://evil.example/x.swf">',
    '<base href="https://evil.example/">',
    '<meta http-equiv="refresh" content="0;url=https://evil.example/">',
    '<link rel="stylesheet" href="https://evil.example/x.css">',
    '<div id="AttachmentPreview" class="c" data-x="1" aria-label="y">clobber</div>',
    '<details open ontoggle="window.__xss=1"><summary>x</summary></details>',
    '<!--<img src=x onerror=window.__xss=1>-->',
    '<template><img src=x onerror="window.__xss=1"></template>',
    '<input autofocus onfocus="window.__xss=1">',
    '<video><source onerror="window.__xss=1"></video>',
    '<a href="https://ok.example/" target="_self" onclick="window.__xss=1">ok</a>',
    '<table background="https://evil.example/t.png"><tr><td>x</td></tr></table>',
    '<p>unclosed <b>bold <i>italic',
    '<xmp><img src=x onerror=window.__xss=1></xmp>',
    '<img src=x:alert(alt) onerror=eval(src) alt=0>',
];
{
    const w = load({ config: { 'attach-html': true } });
    ok(typeof w.APDOMPurify === 'function', 'APDOMPurify available');
    ok(!('DOMPurify' in w), 'no global DOMPurify left behind');
    const AP = w.eval('AttachmentPreview');
    let violations = [];
    payloads.forEach((p, i) => {
        const host = w.document.createElement('div');
        host.appendChild(AP.sanitize(p));
        w.document.body.appendChild(host);
        host.querySelectorAll('*').forEach((el) => {
            if (!ALLOWED_TAGS.has(el.tagName)) violations.push(`#${i} tag ${el.tagName}`);
            for (const a of el.attributes) {
                if (!ALLOWED_ATTR.has(a.name)) violations.push(`#${i} attr ${a.name}`);
            }
            if (el.hasAttribute('href') && !/^(https?:|mailto:)/i.test(el.getAttribute('href'))) {
                violations.push(`#${i} href ${el.getAttribute('href')}`);
            }
            if (el.tagName === 'IMG' && el.hasAttribute('src')
                && !/^data:image\/(png|gif|jpe?g|webp);base64,/i.test(el.getAttribute('src'))) {
                violations.push(`#${i} img src ${el.getAttribute('src')}`);
            }
            if (el.tagName === 'A' && el.hasAttribute('href')) {
                if (el.getAttribute('target') !== '_blank' || !/noopener/.test(el.getAttribute('rel') || '')) {
                    violations.push(`#${i} link without target/rel`);
                }
            }
        });
        // Fire what a user or the browser would fire on the remaining nodes.
        host.querySelectorAll('*').forEach((el) => {
            ['click', 'error', 'load', 'focus', 'toggle', 'mouseover'].forEach((t) => el.dispatchEvent(new w.Event(t)));
        });
    });
    eq(violations.length, 0, `${payloads.length} payloads: only allowed tags, attributes and URLs remain`);
    if (violations.length) console.log('    ' + violations.join('\n    '));
    eq(w.__xss, undefined, 'no payload executed');
    eq(w.__errors.length, 0, 'no script errors', w.__errors.join('; '));
}

// ---------- J2: ordinary HTML mail renders ----------
grp('J2 DOMPurify sanitizer: ordinary mail');
{
    const mail = '<html><head><style>p{color:red}</style></head><body>'
        + '<div class="WordSection1" style="font-family:Calibri" lang="de">'
        + '<p class="MsoNormal" style="margin:0"><b>Hallo</b> Team,</p>'
        + '<p>Siehe <a href="https://example.org/doc" style="color:blue">Dokument</a> '
        + 'und <a href="mailto:office@example.org">Mail</a>.</p>'
        + '<table border="1" cellpadding="2"><tr><td colspan="2">Zelle</td></tr></table>'
        + '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="logo">'
        + '<img src="https://tracker.example/open.gif" alt="pixel">'
        + '</div></body></html>';
    const [href, name] = file('k-html', 'newsletter.html');
    const w = load({ config: { 'attach-html': true }, links: links([href, name]) }, { fixtures: { [href]: mail } });
    const box = w.document.querySelector('[data-type="html"]');
    ok(box !== null, 'HTML wrapper rendered by the plugin');
    const out = box ? box.querySelector('.ap_html') : null;
    ok(out !== null, 'attachment rendered into .ap_html');
    if (out) {
        ok(out.textContent.includes('Hallo Team'), 'text content survives');
        ok(out.querySelector('b') !== null, '<b> survives');
        ok(out.querySelector('[style],[class],[lang]') === null, 'style, class and lang removed');
        ok(out.querySelector('style') === null, '<style> removed');
        const a = out.querySelectorAll('a');
        eq(a.length, 2, 'both links kept');
        eq(a[0].getAttribute('href'), 'https://example.org/doc', 'https link kept');
        eq(a[0].getAttribute('target'), '_blank', 'link opens in a new tab');
        eq(a[0].getAttribute('rel'), 'noopener noreferrer nofollow', 'link without opener/referrer');
        eq(out.querySelector('td').getAttribute('colspan'), '2', 'colspan kept');
        const imgs = out.querySelectorAll('img');
        ok(/^data:image\/png;base64,/.test(imgs[0].getAttribute('src') || ''), 'embedded data: image kept');
        ok(!imgs[1].hasAttribute('src'), 'remote image (tracking pixel) has no src');
    }
    const g = w.__gets.find((x) => x.url === href);
    eq(g && g.type, 'text', 'HTML attachment fetched with dataType "text"');
    eq(w.__errors.length, 0, 'no script errors', w.__errors.join('; '));
}

// ---------- J3: fail closed without DOMPurify ----------
grp('J3 fail closed without vendor/purify.min.js');
{
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-js-'));
    for (const f of ['plugin.php', 'config.php', 'class.AttachmentPreviewPlugin.php', 'script.js', 'stylesheet.css']) {
        fs.copyFileSync(path.join(ROOT, f), path.join(copy, f));
    }
    const [href, name] = file('k-html', 'mail.html');
    const w = load({ config: { 'attach-html': true }, links: links([href, name]) },
        { pluginDir: copy, fixtures: { [href]: '<p>hello</p><img src=x onerror="window.__xss=1">' } });
    fs.rmSync(copy, { recursive: true, force: true });
    ok(typeof w.APDOMPurify === 'undefined', 'no sanitizer on the page');
    const box = w.document.querySelector('[data-type],[id$="-c"]');
    ok(box && /HTML preview unavailable/.test(box.textContent), 'wrapper says the preview is unavailable');
    ok(box && box.querySelector('*') === null, 'no attachment markup inserted');
    eq(w.__gets.length, 0, 'attachment not even fetched');
    eq(w.__xss, undefined, 'nothing executed');
}

// ---------- J4: a DOMPurify the page already has stays untouched ----------
grp('J4 page-owned DOMPurify');
{
    const w = load({ config: { 'attach-html': true } }, { before: 'window.DOMPurify = { owner: "page" };' });
    eq(w.DOMPurify && w.DOMPurify.owner, 'page', 'page DOMPurify restored');
    ok(typeof w.APDOMPurify === 'function' && w.APDOMPurify !== w.DOMPurify, 'plugin uses its own copy');
}

// ---------- J5: text attachments ----------
grp('J5 text and mail attachments');
{
    const [h1, n1] = file('k-txt', 'log.txt');
    const [h2, n2] = file('k-eml', 'forward.eml');
    const eml = 'From: a@example.org\nSubject: test\n\n<script>window.__xss=1</script>';
    const w = load({ links: links([h1, n1], [h2, n2]) }, { fixtures: { [h1]: 'plain <b>text</b>', [h2]: eml } });
    const pres = w.document.querySelectorAll('pre[data-type]');
    eq(pres.length, 2, 'txt and eml rendered as <pre> (#48)');
    eq(pres[0].textContent, 'plain <b>text</b>', 'text inserted as text, not HTML');
    ok(pres[1].textContent.includes('Subject: test') && pres[1].querySelector('*') === null, 'eml shown as source');
    ok(w.__gets.every((g) => g.type === 'text'), 'all fetched with dataType "text"');
    eq(w.__xss, undefined, 'nothing executed');
    ok(typeof w.APDOMPurify === 'undefined', 'HTML option off: DOMPurify not loaded');
}

// ---------- J6: "Hide Seen" cache (#34, #35) ----------
grp('J6 Hide Seen');
{
    const day = 864e5;
    const now = Date.now();
    const seed = {
        attachment_preview_ids: JSON.stringify({
            '5': { last_seen: now - day, items: ['k-pdf'] },          // this ticket, pdf already seen
            '99': { last_seen: now - 30 * day, items: ['old'] },     // older than hide_age (14 days)
            '42': { last_seen: now - 2 * day, items: ['recent'] },   // recent, other ticket
        })
    };
    const [hp, np] = file('k-pdf', 'report.pdf');
    const [hi, ni] = file('k-png', 'photo.png');
    const yt = ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video'];
    const w = load({ config: { 'hide-seen': true, 'attach-youtube': true }, links: links([hp, np], [hi, ni], yt) },
        { storage: seed });
    const AP = w.eval('AttachmentPreview');
    eq(AP.ticket_id(), '5', 'ticket id from ?id= when ticket locking is off');
    const stored = JSON.parse(w.localStorage.getItem('attachment_preview_ids'));
    ok(!('99' in stored), 'entries older than hide_age are purged (#34)');
    ok('42' in stored, 'recent entries of other tickets are kept');
    ok(stored['5'].items.includes('k-png'), 'attachment keyed by osTicket file key, not page position');
    const pdfWrap = w.document.querySelector('[data-type="pdf"]').parentNode;
    ok(pdfWrap.classList.contains('hidden'), 'seen PDF is hidden');
    ok(pdfWrap.previousElementSibling && pdfWrap.previousElementSibling.classList.contains('button'),
        'seen PDF gets a "Show" button right before it');
    ok(!w.document.querySelector('[data-type="image"]').parentNode.classList.contains('hidden'), 'new image shown');

    // Second visit: the YouTube player has been seen now and must get a button too (#35).
    const w2 = load({ config: { 'hide-seen': true, 'attach-youtube': true }, links: links([hp, np], [hi, ni], yt) },
        { storage: { attachment_preview_ids: w.localStorage.getItem('attachment_preview_ids') } });
    const ytWrap = w2.document.querySelector('iframe').parentNode;
    ok(ytWrap.classList.contains('hidden'), 'seen YouTube player hidden on the next visit');
    ok(ytWrap.previousElementSibling && ytWrap.previousElementSibling.classList.contains('button'),
        'YouTube player gets a "Show" button (#35)');
    eq(w2.document.querySelectorAll('a.button').length, 3, 'one button per seen attachment');
    eq(w2.__errors.length, 0, 'no script errors', w2.__errors.join('; '));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
