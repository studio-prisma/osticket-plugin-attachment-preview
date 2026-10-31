<?php
// Shared between tests/www/scp/tickets.php and tests/integration.php.

/** Binary download body that DOMDocument would visibly corrupt. */
function ap_fixture_zip(): string
{
    return "PK\x03\x04\x14\x00\x00\x00".str_repeat("\x00\xff<html>&amp;\x80\x81<a href=\"/scp/file.php?key=z\">z.pdf</a>", 64)."PK\x05\x06";
}

/** The attachments on the fixture ticket page. */
function ap_fixture_links(): array
{
    return [
      '/scp/file.php?key=k-pdf&expires=1900000000&signature=s&id=1' => 'report.pdf',
      '/scp/file.php?key=k-png&expires=1900000000&signature=s&id=1' => 'photo.png',
    ];
}
