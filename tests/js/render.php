<?php
// Renders an agent ticket page through the plugin, as the shutdown handler would.
// Input on stdin: {"config": {...}, "links": {"href": "text", ...}}
// PLUGIN_DIR selects the plugin copy (tests/js/run.js uses one without vendor/).
require dirname(__DIR__).'/bootstrap.php';
$in = json_decode(stream_get_contents(STDIN), true) ?: [];
$_SERVER['REQUEST_URI'] = '/scp/tickets.php?id=5';
$p = ap_plugin(ap_config($in['config'] ?? []));
$html = ap_call($p, 'inlineAttachments', ap_ticket_page($in['links'] ?? []));
echo $p->insertScript($html);
