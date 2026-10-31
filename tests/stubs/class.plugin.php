<?php
// Stubs with the signatures of osTicket 1.18.x include/class.plugin.php,
// reduced to what the plugin actually calls.
abstract class PluginConfig {
    public array $data = [];
    function __construct(array $data = []) { $this->data = $data; }
    function get($key, $default = null) {
        return array_key_exists($key, $this->data) ? $this->data[$key] : $default;
    }
    function getOptions() { return []; }
}
class PluginInstance {}
class Plugin {
    /** @var array<int, PluginConfig> one config per plugin instance, set by the test */
    public static array $configs = [];
    public $id;
    function __construct($id) { $this->id = $id; }
    function getConfig(?PluginInstance $instance = null, $defaults = []) { return self::$configs[$this->id]; }
    function uninstall(&$errors) {}
    static function translate($domain) {
        return [fn($x) => $x, fn($x, $y, $n) => $n != 1 ? $y : $x];
    }
}
class Signal {
    public static array $connected = [];
    static function connect($name, $callable) { self::$connected[] = $name; }
}
class FormField {
    public array $options;
    function __construct($options = []) { $this->options = $options; }
}
class BooleanField extends FormField {}
class TextboxField extends FormField {}
class ChoiceField extends FormField {}

// Translation: tests can override single strings via $GLOBALS['__overrides'].
if (!function_exists('__')) {
    function __($s) { return $GLOBALS['__overrides'][$s] ?? $s; }
}
