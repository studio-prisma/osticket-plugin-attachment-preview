<?php
// Fail-mode: the plugin without vendor/purify.min.js. The HTML preview must
// stay off (no sanitizer injected), everything else must keep working.
// Run: php tests/failmode.php
$copy = sys_get_temp_dir().'/ap-failmode-'.getmypid();
@mkdir($copy);
foreach (['plugin.php', 'config.php', 'class.AttachmentPreviewPlugin.php', 'script.js', 'stylesheet.css'] as $f) {
    copy(dirname(__DIR__).'/'.$f, "$copy/$f");
}
putenv("PLUGIN_DIR=$copy");
require __DIR__.'/bootstrap.php';
register_shutdown_function(function () use ($copy) {
    array_map('unlink', glob("$copy/*"));
    @rmdir($copy);
});

grp('F1 vendor/purify.min.js missing');
ok(!is_dir("$copy/vendor"), 'copy has no vendor/');
$_SERVER['REQUEST_URI'] = '/scp/tickets.php?id=1';
$p = ap_plugin(ap_config(['attach-html' => true]));
// error_log() goes to stderr; keep the test output readable.
ini_set('error_log', $copy.'/error.log');
eq(AttachmentPreviewPlugin::sanitizerScript(), '', 'sanitizerScript() returns nothing');
ok(str_contains((string)@file_get_contents("$copy/error.log"), 'purify.min.js missing'), 'missing file is logged');
$out = $p->insertScript('<html><head></head><body></body></html>');
eq(substr_count($out, '<script>'), 1, 'only script.js is injected');
ok(!str_contains($out, 'APDOMPurify='), 'no sanitizer in the page');
ok(str_contains($out, 'AP: Plugin loaded'), 'script.js still injected');
$html = ap_call($p, 'inlineAttachments', ap_ticket_page([
  '/scp/file.php?key=k1&id=1' => 'report.pdf',
  '/scp/file.php?key=k2&id=1' => 'mail.html',
]));
ok(str_contains($html, 'data-type="pdf"'), 'PDF preview unaffected');
// The wrapper is still built; script.js renders it as "unavailable" (tests/js).
ok(str_contains($html, 'data-type="html"'), 'HTML wrapper built, script.js decides');

done();
