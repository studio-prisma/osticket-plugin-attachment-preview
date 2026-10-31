<?php
// Shared setup for unit.php, failmode.php, js/render.php and the php -S pages.
// PLUGIN_DIR points at the plugin to test (default: the repository root).
if (!defined('INCLUDE_DIR')) {
    define('INCLUDE_DIR', __DIR__.'/stubs/');
}
$PLUGIN = getenv('PLUGIN_DIR') ?: dirname(__DIR__);
require_once $PLUGIN.'/class.AttachmentPreviewPlugin.php';

/**
 * Plugin config with the defaults from config.php, overridden by $values.
 */
function ap_config(array $values = []): AttachmentPreviewPluginConfig
{
    $defaults = [];
    foreach ((new AttachmentPreviewPluginConfig())->getOptions() as $key => $field) {
        $defaults[$key] = $field->options['default'] ?? null;
    }
    return new AttachmentPreviewPluginConfig(array_merge($defaults, $values));
}

/**
 * A plugin whose static state (instance config, buffering flag) is set up as
 * bootstrap() would leave it for $config.
 */
function ap_plugin(AttachmentPreviewPluginConfig $config, int $id = 1): AttachmentPreviewPlugin
{
    Plugin::$configs[$id] = $config;
    $plugin = new AttachmentPreviewPlugin($id);
    $r = new ReflectionProperty(AttachmentPreviewPlugin::class, 'instance');
    $r->setValue(null, $config);
    return $plugin;
}

/**
 * Calls a private method.
 */
function ap_call(object $obj, string $method, ...$args)
{
    $m = new ReflectionMethod($obj, $method);
    return $m->invoke($obj, ...$args);
}

/**
 * A minimal agent ticket page in the shape osTicket 1.18 renders thread attachments.
 */
function ap_ticket_page(array $links): string
{
    $items = '';
    foreach ($links as $href => $text) {
        $h = htmlspecialchars($href, ENT_QUOTES);
        $t = htmlspecialchars($text, ENT_QUOTES);
        if (str_contains($href, '/file.php')) {
            $items .= "<span class=\"attachment-info\"><a class=\"file\" href=\"$h\">$t</a><small class=\"filesize faded\">12 kb</small></span>\n";
        } else {
            $items .= "<p>See <a href=\"$h\">$t</a></p>\n";
        }
    }
    return "<!DOCTYPE html>\n<html><head><meta http-equiv=\"content-type\" content=\"text/html; charset=UTF-8\"><title>Ticket</title></head>"
      ."<body><div id=\"thread\"><div class=\"thread-body\"><div class=\"attachments\">\n$items</div></div></div></body></html>";
}

$PASS = 0;
$FAIL = 0;
function grp($n) { echo "\n== $n ==\n"; }
function ok($cond, $name, $extra = '')
{
    global $PASS, $FAIL;
    if ($cond) {
        $PASS++;
        echo "  PASS  $name\n";
    } else {
        $FAIL++;
        echo "  FAIL  $name".($extra !== '' ? "  -> $extra" : '')."\n";
    }
}
function eq($a, $b, $name)
{
    ok($a === $b, $name, 'expected='.var_export($b, true).' got='.var_export($a, true));
}
function done(): void
{
    global $PASS, $FAIL;
    echo "\n$PASS passed, $FAIL failed\n";
    exit($FAIL ? 1 : 0);
}
