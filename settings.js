'use strict';

const { Adw, Gtk, Gio, GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const GeneralPage = GObject.registerClass(
    class GeneralPage extends Adw.PreferencesPage {
        constructor(settings) {
            super({
            title: 'General',
                icon_name: 'preferences-system-symbolic',
                name: 'general'
            });

            const group = new Adw.PreferencesGroup({
                title: 'General Settings'
            });

            // Update interval
            const updateIntervalRow = new Adw.ActionRow({
                title: 'Update Interval',
                subtitle: 'How often to update the status (in seconds)'
            });

            const updateIntervalSpin = new Gtk.SpinButton({
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 3600,
                    step_increment: 1,
                    value: settings.get_int('update-interval')
                }),
                climb_rate: 1,
                digits: 0
            });

            settings.bind(
                'update-interval',
                updateIntervalSpin,
                'value',
                Gio.SettingsBindFlags.DEFAULT
            );

            updateIntervalRow.add_suffix(updateIntervalSpin);
            group.add(updateIntervalRow);

            // Show health
            const showHealthRow = new Adw.ActionRow({
                title: 'Show Health',
                subtitle: 'Display hero health in the status'
            });

            const showHealthSwitch = new Gtk.Switch({
                active: settings.get_boolean('show-health'),
                valign: Gtk.Align.CENTER
            });

            settings.bind(
                'show-health',
                showHealthSwitch,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );

            showHealthRow.add_suffix(showHealthSwitch);
            group.add(showHealthRow);

            // Show inventory
            const showInventoryRow = new Adw.ActionRow({
                title: 'Show Inventory',
                subtitle: 'Display inventory items in the status'
            });

            const showInventorySwitch = new Gtk.Switch({
                active: settings.get_boolean('show-inventory'),
                valign: Gtk.Align.CENTER
            });

            settings.bind(
                'show-inventory',
                showInventorySwitch,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );

            showInventoryRow.add_suffix(showInventorySwitch);
            group.add(showInventoryRow);

            this.add(group);
        }
    }
);

const PreferencesWindow = GObject.registerClass(
    class PreferencesWindow extends Adw.PreferencesWindow {
        constructor(settings) {
            super({
                title: 'Godville Status Settings',
                transient_for: null,
                modal: true
            });

            this.add(new GeneralPage(settings));
        }
    }
); 