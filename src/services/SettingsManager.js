const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const SettingsManagerClass = class {
    constructor() {
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
    }

    getString(key) {
        return this._settings.get_string(key);
    }

    setString(key, value) {
        return this._settings.set_string(key, value);
    }

    getBoolean(key) {
        return this._settings.get_boolean(key);
    }

    setBoolean(key, value) {
        return this._settings.set_boolean(key, value);
    }

    getInt(key) {
        return this._settings.get_int(key);
    }

    setInt(key, value) {
        return this._settings.set_int(key, value);
    }

    connectChanged(callback) {
        return this._settings.connect('changed', callback);
    }

    disconnect(id) {
        this._settings.disconnect(id);
    }
};

// Export the class
var SettingsManager = SettingsManagerClass; 