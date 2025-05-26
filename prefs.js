'use strict';

const { Adw, Gtk, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
    const builder = new Gtk.Builder();
    builder.add_from_file(Me.path + '/prefs.ui');

    // Get the preferences page from the builder
    const page = builder.get_object('preferencesPage');
    window.add(page);

    // Bind settings
    const godnameEntry = builder.get_object('godnameEntry');
    const apiKeyEntry = builder.get_object('apiKeyEntry');

    settings.bind('godname', godnameEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('api-key', apiKeyEntry, 'text', Gio.SettingsBindFlags.DEFAULT);

    // Add change handlers for text entries
    godnameEntry.connect('changed', () => {
        settings.set_string('godname', godnameEntry.get_text());
    });

    apiKeyEntry.connect('changed', () => {
        settings.set_string('api-key', apiKeyEntry.get_text());
    });

    // Bind display settings
    const displaySettings = [
        'show-health', 'show-exp', 'show-gold', 'show-arena', 'show-quest',
        'show-pet', 'show-clan', 'show-alignment', 'show-boss', 'show-inventory',
        'show-materials', 'show-distance', 'show-diary'
    ];

    displaySettings.forEach(setting => {
        const switchWidget = builder.get_object(`${setting}-switch`);
        if (switchWidget) {
            settings.bind(setting, switchWidget, 'active', Gio.SettingsBindFlags.DEFAULT);
            // Add change handler
            switchWidget.connect('notify::active', () => {
                settings.set_boolean(setting, switchWidget.get_active());
            });
        }
    });

    // Bind status display settings
    const statusSettings = [
        'status-show-health', 'status-show-godpower', 'status-show-diary', 'status-show-quest'
    ];

    statusSettings.forEach(setting => {
        const switchWidget = builder.get_object(`${setting}-switch`);
        if (switchWidget) {
            settings.bind(setting, switchWidget, 'active', Gio.SettingsBindFlags.DEFAULT);
            // Add change handler
            switchWidget.connect('notify::active', () => {
                settings.set_boolean(setting, switchWidget.get_active());
            });
        }
    });

    // Bind status max length
    const maxLengthSpin = builder.get_object('status-max-length-spin');
    if (maxLengthSpin) {
        settings.bind('status-max-length', maxLengthSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        // Add change handler
        maxLengthSpin.connect('value-changed', () => {
            settings.set_int('status-max-length', maxLengthSpin.get_value());
        });
    }

    // Handle extension position
    const positionCombo = builder.get_object('extension-position-combo');
    if (positionCombo) {
        // Set initial value
        const currentPosition = settings.get_string('extension-position');
        const positions = ['left', 'center', 'right'];
        const index = positions.indexOf(currentPosition);
        if (index !== -1) {
            positionCombo.set_selected(index);
        } else {
            positionCombo.set_selected(1); // Default to center if no valid position
        }

        // Add change handler
        positionCombo.connect('notify::selected', () => {
            const selectedIndex = positionCombo.get_selected();
            if (selectedIndex !== -1) {
                settings.set_string('extension-position', positions[selectedIndex]);
            }
        });

        // Make sure the dropdown is interactive
        positionCombo.set_sensitive(true);
        positionCombo.set_can_focus(true);
    }

    // Add window close handler to ensure settings are saved
    window.connect('close-request', () => {
        settings.sync();
        return false;
    });
} 