<?php
// Stands in for osTicket's scp/tickets.php under `php -S`: boots the plugin the way
// osTicket does (one bootstrap() per enabled instance), then answers like core.
//   ?id=1&instances=2         ticket page, two plugin instances (#47)
//   ?id=1&a=zip               ZIP export (#49)
//   ?id=1&a=export&mode=dl    any other download under a ticket URL
//   ?id=1&mode=json           non-HTML response without Content-Disposition
define('INCLUDE_DIR', dirname(__DIR__, 2).'/stubs/');
require dirname(__DIR__, 2).'/bootstrap.php';
require dirname(__DIR__).'/fixture.php';

// osTicket 1.18 staff pages send this policy (include/staff/header.inc.php).
header("Content-Security-Policy: frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none'");

$instances = max(1, (int)($_GET['instances'] ?? 1));
for ($i = 1; $i <= $instances; $i++) {
    Plugin::$configs[$i] = ap_config();
    (new AttachmentPreviewPlugin($i))->bootstrap();
}

$mode = ($_GET['a'] ?? '') === 'zip' ? 'dl' : ($_GET['mode'] ?? 'page');
switch ($mode) {
    case 'dl':
        // What Http::download() sends.
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="ticket-1.zip"');
        echo ap_fixture_zip();
        exit;
    case 'json':
        header('Content-Type: application/json');
        echo json_encode(['html' => '<a href="/scp/file.php?key=j">j.pdf</a>']);
        exit;
    default:
        echo ap_ticket_page(ap_fixture_links());
}
