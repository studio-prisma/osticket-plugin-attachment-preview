<?php
// Unit tests against osTicket stubs. Run: php tests/unit.php
require __DIR__.'/bootstrap.php';

$_SERVER['REQUEST_URI'] = '/scp/tickets.php?id=1';

// ---------- U1: loading, manifest, config ----------
grp('U1 Loading, manifest, config (PHP '.PHP_VERSION.')');
ok(class_exists('AttachmentPreviewPlugin'), 'AttachmentPreviewPlugin loaded');
ok(class_exists('AttachmentPreviewPluginConfig'), 'AttachmentPreviewPluginConfig loaded');
$manifest = include $PLUGIN.'/plugin.php';
eq($manifest['id'], 'studio-prisma:attachment-preview', 'own plugin id, not the upstream one');
ok((bool)preg_match('/^\d+\.\d+\.\d+$/', $manifest['version']), 'manifest version is SemVer');
eq($manifest['plugin'], 'class.AttachmentPreviewPlugin.php:AttachmentPreviewPlugin', 'manifest points at the plugin class');
$opts = (new AttachmentPreviewPluginConfig())->getOptions();
foreach (['attachment-enabled', 'hide-seen', 'hide-age', 'attachment-size', 'attach-pdf', 'attach-image',
          'attach-text', 'attach-html', 'attach-audio', 'attach-video', 'attach-youtube', 'attach-vimeo',
          'show-ms-upgrade-help', 'show-initially', 'newtab-links'] as $k) {
    ok(isset($opts[$k]), "option exists: $k");
}
// Everything that loads third-party content or renders foreign HTML is off by default.
foreach (['attach-html', 'attach-youtube', 'attach-vimeo'] as $k) {
    eq($opts[$k]->options['default'], false, "$k is off by default");
}

// ---------- U2: which pages get buffered ----------
grp('U2 isTicketsView');
$cases = [
  '/scp/tickets.php?id=12'            => true,
  '/support/scp/tickets.php?id=12'    => true,
  '/scp/tasks.php?id=3'               => true,
  '/scp/index.php?id=12'              => true,
  '/scp/tickets.php?id=12&a=zip'      => false, // #49
  '/scp/tickets.php?id=12&a=print'    => false,
  '/scp/tickets.php?id=12&a=edit'     => false,
  '/scp/tickets.php'                  => false,
  '/tickets.php?id=12'                => false, // client portal
  '/scp/users.php?id=4'               => false,
];
foreach ($cases as $uri => $expected) {
    $_SERVER['REQUEST_URI'] = $uri;
    eq(AttachmentPreviewPlugin::isTicketsView(), $expected, "$uri -> ".($expected ? 'buffer' : 'leave alone'));
}
$_SERVER['REQUEST_URI'] = '/scp/tickets.php?id=12';
$_POST = ['a' => 'reply'];
eq(AttachmentPreviewPlugin::isTicketsView(), false, 'POST to a ticket page is not buffered');
$_POST = [];

// ---------- U3: YouTube ----------
grp('U3 YouTube');
$p = ap_plugin(ap_config(['attach-youtube' => true]));
eq($p->getYoutubeIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'watch?v=');
eq($p->getYoutubeIdFromUrl('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'youtu.be');
eq($p->getYoutubeIdFromUrl('https://www.youtube.com/embed/dQw4w9WgXcQ?start=3'), 'dQw4w9WgXcQ', 'embed/');
$html = ap_call($p, 'inlineAttachments', ap_ticket_page([
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'          => 'video',
  'https://www.youtube.com/watch?v=x%22onload%3Dalert(1)' => 'bad id',
]));
eq(substr_count($html, '<iframe'), 1, 'only the valid video id becomes a player');
ok(str_contains($html, 'src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"'), 'player uses youtube-nocookie.com');
ok(!str_contains($html, 'www.youtube.com/embed'), 'no www.youtube.com embed');
ok(str_contains($html, 'referrerpolicy="strict-origin-when-cross-origin"'), 'player sets a referrer policy');

// ---------- U4: Vimeo (#43) ----------
grp('U4 Vimeo');
$v = fn($url) => $p->getVimeoIdFromUrl($url);
eq($v('https://vimeo.com/417068781'), ['id' => '417068781', 'hash' => ''], 'vimeo.com/ID');
eq($v('https://www.vimeo.com/417068781/'), ['id' => '417068781', 'hash' => ''], 'www.vimeo.com/ID/');
eq($v('https://vimeo.com/417068781/abcdef1234'), ['id' => '417068781', 'hash' => 'abcdef1234'], 'unlisted video with hash');
eq($v('https://player.vimeo.com/video/417068781?h=abcdef1234&badge=0'), ['id' => '417068781', 'hash' => 'abcdef1234'], 'player URL with ?h=');
eq($v('https://vimeo.com.evil.example/417068781'), false, 'look-alike host rejected');
eq($v('https://evilvimeo.com/417068781'), false, 'host suffix rejected');
eq($v('https://vimeo.com/channels/staffpicks'), false, 'non-video path rejected');
eq($v('https://vimeo.com/417068781/"onload="x'), false, 'junk after the id rejected');
eq($v('javascript:alert(1)//vimeo.com/1'), false, 'javascript: rejected');

$off = ap_call(ap_plugin(ap_config()), 'inlineAttachments', ap_ticket_page(['https://vimeo.com/417068781' => 'clip']));
eq(substr_count($off, '<iframe'), 0, 'Vimeo off by default: link stays a link');
$on = ap_call(ap_plugin(ap_config(['attach-vimeo' => true])), 'inlineAttachments', ap_ticket_page([
  'https://vimeo.com/417068781/abcdef1234' => 'clip',
]));
ok(str_contains($on, 'src="https://player.vimeo.com/video/417068781?dnt=1&amp;h=abcdef1234"'), 'player with dnt=1 and hash', $on);

// ---------- U5: attachment types ----------
grp('U5 Attachment types');
$links = [];
foreach (['k-pdf' => 'report.pdf', 'k-png' => 'photo.PNG', 'k-eml' => 'forwarded.eml', 'k-txt' => 'log.txt',
          'k-htm' => 'mail.html', 'k-zip' => 'archive.zip'] as $k => $name) {
    $links["/scp/file.php?key=$k&expires=1900000000&signature=abc&id=1"] = $name;
}
$html = ap_call(ap_plugin(ap_config()), 'inlineAttachments', ap_ticket_page($links));
ok(str_contains($html, 'data-type="pdf"'), 'PDF inlined');
ok(str_contains($html, 'data-type="image"'), 'image inlined (upper-case extension)');
eq(substr_count($html, 'data-type="text"'), 2, 'txt and eml inlined as text (#48)');
ok(!str_contains($html, 'data-type="html"'), 'HTML not inlined while the option is off');
ok(!str_contains($html, 'k-zip&amp;expires=1900000000&amp;signature=abc&amp;id=1" data-type'), 'zip is not inlined');
$html = ap_call(ap_plugin(ap_config(['attach-html' => true])), 'inlineAttachments', ap_ticket_page($links));
ok(str_contains($html, 'data-type="html"'), 'HTML inlined when the option is on');

// ---------- U6: script injection ----------
grp('U6 insertScript');
$page = "<html><head></head><body><p>x</p></body></html>";
$out = ap_plugin(ap_config())->insertScript($page);
eq(substr_count($out, '<script>'), 1, 'HTML off: one script, no sanitizer');
ok(!str_contains($out, 'APDOMPurify='), 'HTML off: DOMPurify not injected');
ok(str_contains($out, '<style>'), 'stylesheet injected');
ok(str_contains($out, '"hide_age":"14"') || str_contains($out, '"hide_age":14'), 'settings passed to the script');

$vendor = is_readable($PLUGIN.'/vendor/purify.min.js');
ok($vendor, 'vendor/purify.min.js present (run tools/vendor.sh)');
if ($vendor) {
    $out = ap_plugin(ap_config(['attach-html' => true]))->insertScript($page);
    eq(substr_count($out, '<script>'), 2, 'HTML on: sanitizer gets its own script element');
    ok(strpos($out, 'window.APDOMPurify=') < strpos($out, 'AP: Plugin loaded'), 'sanitizer runs before script.js');
    ok(str_contains($out, '@license DOMPurify 3.'), 'DOMPurify 3.x banner present');
    // Every script element must end exactly where we close it.
    preg_match_all('#<script>(.*?)</script>#s', $out, $m);
    eq(count($m[1]), 2, 'no "</script" inside the injected code');
    ok(!str_contains($m[1][0], '<!--'), 'no "<!--" inside the sanitizer');
    ok(str_contains($out, '"use strict";'), 'script.js keeps "use strict"');
    ok(strpos($m[1][1], '"use strict";') === 0, '"use strict" is the first statement of script.js');
}

$GLOBALS['__overrides'] = ['Show Attachment' => '</script><script>alert(1)</script>'];
$out = ap_plugin(ap_config())->insertScript($page);
ok(!str_contains($out, '</script><script>alert(1)'), 'translated strings cannot close the script element');
ok(str_contains($out, '\u003C\/script\u003E'), 'translation is JSON-escaped');
$GLOBALS['__overrides'] = [];

// ---------- U7: bootstrap buffers once (#47) ----------
grp('U7 bootstrap');
$r = new ReflectionProperty(AttachmentPreviewPlugin::class, 'buffering');
ok($r->getValue() === false, 'not buffering before bootstrap');
// In the CLI bootstrap() returns before buffering anything (cron runs). The
// buffering branch itself, with two instances, is covered by tests/integration.php.
$_SERVER["REQUEST_URI"] = "/scp/tickets.php?id=1";
Plugin::$configs[7] = ap_config();
(new AttachmentPreviewPlugin(7))->bootstrap();
eq($r->getValue(), false, "CLI: bootstrap starts no buffer");
eq(ob_get_level() <= 1, true, "CLI: no output buffer opened");

done();
