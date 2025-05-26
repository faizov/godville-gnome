const ExtensionUtils = imports.misc.extensionUtils;

class SettingsManager {
    constructor() {
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
    }

    getString(key) {
        return this._settings.get_string(key);
    }

    getBoolean(key) {
        return this._settings.get_boolean(key);
    }

    getInt(key) {
        return this._settings.get_int(key);
    }

    connectChanged(callback) {
        return this._settings.connect('changed', callback);
    }

    disconnectChanged(connectionId) {
        this._settings.disconnect(connectionId);
    }
}

// Export the class
var SettingsManagerClass = SettingsManager; 