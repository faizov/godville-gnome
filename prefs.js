'use strict';

const { Adw, Gtk, Gio, Gdk } = imports.gi;
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

    settings.bind('character-name', godnameEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('api-key', apiKeyEntry, 'text', Gio.SettingsBindFlags.DEFAULT);

    // Add change handlers for text entries
    godnameEntry.connect('changed', () => {
        settings.set_string('character-name', godnameEntry.get_text());
    });

    apiKeyEntry.connect('changed', () => {
        settings.set_string('api-key', apiKeyEntry.get_text());
    });

    // Bind display settings
    const displaySettings = [
        'show-health', 'show-exp', 'show-gold', 'show-arena', 'show-quest',
        'show-side-job', 'show-pet', 'show-clan', 'show-alignment', 'show-boss',
        'show-inventory', 'show-materials', 'show-distance', 'show-diary', 'show-eye',
        'show-aura', 'show-words', 'show-savings', 'show-temple'
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

    // Connect color buttons
    const colorHighButton = builder.get_object('health-color-high-button');
    const colorMediumButton = builder.get_object('health-color-medium-button');
    const colorLowButton = builder.get_object('health-color-low-button');

    // Set initial colors
    const parseColor = (colorStr) => {
        // Remove # if present
        colorStr = colorStr.replace('#', '');
        // Parse hex values
        const r = parseInt(colorStr.substring(0, 2), 16) / 255;
        const g = parseInt(colorStr.substring(2, 4), 16) / 255;
        const b = parseInt(colorStr.substring(4, 6), 16) / 255;
        return new Gdk.RGBA({ red: r, green: g, blue: b, alpha: 1.0 });
    };

    colorHighButton.set_rgba(parseColor(settings.get_string('health-color-high')));
    colorMediumButton.set_rgba(parseColor(settings.get_string('health-color-medium')));
    colorLowButton.set_rgba(parseColor(settings.get_string('health-color-low')));

    // Connect color change signals
    colorHighButton.connect('color-set', (button) => {
        const color = button.get_rgba();
        const colorStr = color.to_string();
        log(`[Godville Status] Setting high health color to: ${colorStr}`);
        settings.set_string('health-color-high', colorStr);
    });

    colorMediumButton.connect('color-set', (button) => {
        const color = button.get_rgba();
        const colorStr = color.to_string();
        log(`[Godville Status] Setting medium health color to: ${colorStr}`);
        settings.set_string('health-color-medium', colorStr);
    });

    colorLowButton.connect('color-set', (button) => {
        const color = button.get_rgba();
        const colorStr = color.to_string();
        log(`[Godville Status] Setting low health color to: ${colorStr}`);
        settings.set_string('health-color-low', colorStr);
    });

    // Connect threshold spin buttons
    const thresholdHighSpin = builder.get_object('health-threshold-high-spin');
    const thresholdMediumSpin = builder.get_object('health-threshold-medium-spin');

    // Set initial values
    thresholdHighSpin.set_value(settings.get_int('health-threshold-high'));
    thresholdMediumSpin.set_value(settings.get_int('health-threshold-medium'));

    // Connect threshold change signals
    thresholdHighSpin.connect('value-changed', (spin) => {
        const value = spin.get_value_as_int();
        log(`[Godville Status] Setting high health threshold to: ${value}`);
        settings.set_int('health-threshold-high', value);
    });

    thresholdMediumSpin.connect('value-changed', (spin) => {
        const value = spin.get_value_as_int();
        log(`[Godville Status] Setting medium health threshold to: ${value}`);
        settings.set_int('health-threshold-medium', value);
    });

    // Bind diary color
    const diaryColorButton = builder.get_object('diary-color-button');
    if (diaryColorButton) {
        // Convert hex color to RGBA
        const hexColor = settings.get_string('diary-color');
        const rgba = new Gdk.RGBA();
        rgba.parse(hexColor);
        diaryColorButton.set_rgba(rgba);

        diaryColorButton.connect('color-set', (button) => {
            const color = button.get_rgba();
            const hex = '#' + 
                Math.round(color.red * 255).toString(16).padStart(2, '0') +
                Math.round(color.green * 255).toString(16).padStart(2, '0') +
                Math.round(color.blue * 255).toString(16).padStart(2, '0');
            settings.set_string('diary-color', hex);
        });
    }

    // Bind quest color
    const questColorButton = builder.get_object('quest-color-button');
    if (questColorButton) {
        // Convert hex color to RGBA
        const hexColor = settings.get_string('quest-color');
        const rgba = new Gdk.RGBA();
        rgba.parse(hexColor);
        questColorButton.set_rgba(rgba);

        questColorButton.connect('color-set', (button) => {
            const color = button.get_rgba();
            const hex = '#' + 
                Math.round(color.red * 255).toString(16).padStart(2, '0') +
                Math.round(color.green * 255).toString(16).padStart(2, '0') +
                Math.round(color.blue * 255).toString(16).padStart(2, '0');
            settings.set_string('quest-color', hex);
        });
    }

    // Bind godpower color
    const godpowerColorButton = builder.get_object('godpower-color-button');
    if (godpowerColorButton) {
        // Convert hex color to RGBA
        const hexColor = settings.get_string('godpower-color');
        const rgba = new Gdk.RGBA();
        rgba.parse(hexColor);
        godpowerColorButton.set_rgba(rgba);

        godpowerColorButton.connect('color-set', (button) => {
            const color = button.get_rgba();
            const hex = '#' + 
                Math.round(color.red * 255).toString(16).padStart(2, '0') +
                Math.round(color.green * 255).toString(16).padStart(2, '0') +
                Math.round(color.blue * 255).toString(16).padStart(2, '0');
            settings.set_string('godpower-color', hex);
        });
    }

    // Add window close handler to ensure settings are saved
    window.connect('close-request', () => {
        settings.sync();
        return false;
    });
} 