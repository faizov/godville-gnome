const { GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const GodvilleSettings = GObject.registerClass(
    class GodvilleSettings extends GObject.Object {
        _init() {
            super._init();
            this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
        }

        get godname() {
            return this._settings.get_string('godname');
        }

        set godname(value) {
            this._settings.set_string('godname', value);
        }

        get apiKey() {
            return this._settings.get_string('api-key');
        }

        set apiKey(value) {
            this._settings.set_string('api-key', value);
        }

        get showHealth() {
            return this._settings.get_boolean('show-health');
        }

        set showHealth(value) {
            this._settings.set_boolean('show-health', value);
        }

        get showExp() {
            return this._settings.get_boolean('show-exp');
        }

        set showExp(value) {
            this._settings.set_boolean('show-exp', value);
        }

        get showGold() {
            return this._settings.get_boolean('show-gold');
        }

        set showGold(value) {
            this._settings.set_boolean('show-gold', value);
        }

        get showPrayers() {
            return this._settings.get_boolean('show-arena');
        }

        set showPrayers(value) {
            this._settings.set_boolean('show-arena', value);
        }

        get showQuest() {
            return this._settings.get_boolean('show-quest');
        }

        set showQuest(value) {
            this._settings.set_boolean('show-quest', value);
        }

        get showPet() {
            return this._settings.get_boolean('show-pet');
        }

        set showPet(value) {
            this._settings.set_boolean('show-pet', value);
        }

        get showClan() {
            return this._settings.get_boolean('show-clan');
        }

        set showClan(value) {
            this._settings.set_boolean('show-clan', value);
        }

        get showAlignment() {
            return this._settings.get_boolean('show-alignment');
        }

        set showAlignment(value) {
            this._settings.set_boolean('show-alignment', value);
        }

        get orderHealth() {
            return this._settings.get_int('order-health');
        }

        set orderHealth(value) {
            this._settings.set_int('order-health', value);
        }

        get orderExp() {
            return this._settings.get_int('order-exp');
        }

        set orderExp(value) {
            this._settings.set_int('order-exp', value);
        }

        get orderGold() {
            return this._settings.get_int('order-gold');
        }

        set orderGold(value) {
            this._settings.set_int('order-gold', value);
        }

        get orderPrayers() {
            return this._settings.get_int('order-arena');
        }

        set orderPrayers(value) {
            this._settings.set_int('order-arena', value);
        }

        get orderQuest() {
            return this._settings.get_int('order-quest');
        }

        set orderQuest(value) {
            this._settings.set_int('order-quest', value);
        }

        get orderPet() {
            return this._settings.get_int('order-pet');
        }

        set orderPet(value) {
            this._settings.set_int('order-pet', value);
        }

        get orderClan() {
            return this._settings.get_int('order-clan');
        }

        set orderClan(value) {
            this._settings.set_int('order-clan', value);
        }

        get orderAlignment() {
            return this._settings.get_int('order-alignment');
        }

        set orderAlignment(value) {
            this._settings.set_int('order-alignment', value);
        }
    }
);

function getSettings() {
    return new GodvilleSettings();
} 