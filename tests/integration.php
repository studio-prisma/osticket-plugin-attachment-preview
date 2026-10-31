<?php
// Integration tests against `php -S`, so headers_list(), output buffering and
// shutdown handlers behave as under a real SAPI. Run: php tests/integration.php
require __DIR__.'/bootstrap.php';
require __DIR__.'/www/fixture.php';

$php = getenv('PHP_BIN') ?: PHP_BINARY;
$port = random_int(18000, 18999);
$cmd = [$php, '-S', "127.0.0.1:$port", '-t', __DIR__.'/www'];
$env = array_merge(getenv(), ['PLUGIN_DIR' => $PLUGIN]);
$log = sys_get_temp_dir()."/ap-integration-$port.log";
$server = proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']], $pipes, null, $env);
register_shutdown_function(function () use ($server, $log) {
    proc_terminate($server);
    @unlink($log);
});
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) {
    usleep(100000);
}

function fetch(string $path): array
{
    global $port;
    $ctx = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 10]]);
    $body = @file_get_contents("http://127.0.0.1:$port$path", false, $ctx);
    $headers = [];
    foreach ($http_response_header ?? [] as $h) {
        if (str_contains($h, ':')) {
            [$k, $v] = explode(':', $h, 2);
            $headers[strtolower(trim($k))] = trim($v);
        } else {
            $headers['status'] = $h;
        }
    }
    return [$body === false ? '' : $body, $headers];
}

grp('I1 Ticket page, one instance');
[$body, $h] = fetch('/scp/tickets.php?id=1');
ok(str_contains($h['status'] ?? '', '200'), 'HTTP 200', $h['status'] ?? 'no response, see server log');
eq(substr_count($body, 'class="ap_embedded"'), 2, 'two attachments inlined');
eq(substr_count($body, 'AP: Plugin loaded'), 1, 'script injected once');
ok((bool)preg_match("/object-src[^;]*blob:/", $h['content-security-policy'] ?? ''), 'CSP object-src extended by blob:', $h['content-security-policy'] ?? '');
ok(str_contains($h['content-security-policy'] ?? '', "script-src 'self' 'unsafe-inline' 'unsafe-eval'"), 'rest of the CSP unchanged');

grp('I2 Ticket page, two instances (#47)');
[$body] = fetch('/scp/tickets.php?id=1&instances=2');
eq(substr_count($body, 'class="ap_embedded"'), 2, 'still two attachments, not four');
eq(substr_count($body, 'AP: Plugin loaded'), 1, 'script injected once');

grp('I3 ZIP export (#49)');
[$body, $h] = fetch('/scp/tickets.php?id=1&a=zip');
eq($h['content-type'] ?? '', 'application/zip', 'Content-Type kept');
eq(hash('sha256', $body), hash('sha256', ap_fixture_zip()), 'ZIP bytes unchanged');

grp('I4 Other download under a ticket URL');
[$body] = fetch('/scp/tickets.php?id=1&a=export&mode=dl');
eq(hash('sha256', $body), hash('sha256', ap_fixture_zip()), 'download bytes unchanged (Content-Disposition guard)');

grp('I5 Non-HTML response');
[$body, $h] = fetch('/scp/tickets.php?id=1&mode=json');
eq($body, json_encode(['html' => '<a href="/scp/file.php?key=j">j.pdf</a>']), 'JSON unchanged');
ok(!str_contains($body, 'AP: Plugin loaded'), 'no script in JSON');

if ($FAIL) {
    echo "\n--- server log ---\n".@file_get_contents($log);
}
done();
