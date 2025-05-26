const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Gettext = imports.gettext;
const Me = ExtensionUtils.getCurrentExtension();

// Import our components
const { GodvilleIndicator } = Me.imports.src.components.GodvilleIndicator;

// Initialize Gettext
const LOCALE_DIR = Me.dir.get_child('locale').get_path();
Gettext.bindtextdomain('godville-status', LOCALE_DIR);
Gettext.textdomain('godville-status');
const _ = Gettext.gettext;

class Extension {
    constructor() {
        this._indicator = null;
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
    }

    enable() {
        log('[Godville Status] Enabling extension');
        this._indicator = new GodvilleIndicator();
        Main.panel.addToStatusArea('godville-status', this._indicator, 0, 'center');
        log('[Godville Status] Extension enabled');
    }

    disable() {
        log('[Godville Status] Disabling extension');
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        log('[Godville Status] Extension disabled');
    }
}

function init() {
    return new Extension();
}

Main.notify('Заголовок', 'Текст уведомления'); 