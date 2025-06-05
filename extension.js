const { GObject, St, Gio, GLib, Soup, Clutter, Pango } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;
const MessageTray = imports.ui.messageTray;
const Gettext = imports.gettext;

const _ = Gettext.gettext;

// Constants and configuration
const CONSTANTS = {
    UPDATE_INTERVAL: 300, // 5 minutes
    HEALTH_BAR_WIDTH: 380,
    DEFAULT_ICONS: {
        MALE: 'avatar-default-symbolic',
        FEMALE: 'avatar-default-female-symbolic',
        DEFAULT: 'security-high-symbolic'
    },
    FIGHT_ICONS: {
        arena: 'media-playback-start-symbolic',
        boss: 'dialog-warning-symbolic',
        boss_m: 'dialog-warning-symbolic',
        challenge: 'system-run-symbolic',
        dungeon: 'folder-visiting-symbolic',
        multi_monster: 'view-more-symbolic',
        range: 'view-fullscreen-symbolic',
        sail: 'weather-showers-symbolic'
    }
};

// Utility functions
const Utils = {
    formatPercentage: (current, max) => (current / max) * 100,
    
    truncateText: (text, maxLength) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },
    
    formatDiaryText: (text, maxLength) => {
        if (!text) return '';
        return Utils.truncateText(
            text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
            maxLength
        );
    },
    
    getHealthColor: (percentage, settings) => {
        const highThreshold = settings.get_int('health-threshold-high');
        const mediumThreshold = settings.get_int('health-threshold-medium');
        
        if (percentage > highThreshold) {
            return settings.get_string('health-color-high');
        } else if (percentage > mediumThreshold) {
            return settings.get_string('health-color-medium');
        }
        return settings.get_string('health-color-low');
    }
};

const HealthBar = GObject.registerClass({
    Properties: {
        'settings': GObject.ParamSpec.object(
            'settings',
            'Settings',
            'Settings object',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT,
            GObject.Object
        )
    }
}, class HealthBar extends St.BoxLayout {
    _init(params) {
        super._init(params);
        
        this.style_class = 'godville-health-bar-container';
        
        this.background = new St.BoxLayout({
            style_class: 'godville-health-bar-background',
        });
        this.add_child(this.background);
        
        this.foreground = new St.BoxLayout({
            style_class: 'godville-health-bar-foreground',
        });
        this.background.add_child(this.foreground);

        this.setValue(0, 100);
    }
    
    setValue(current, max) {
        const percentage = Utils.formatPercentage(current, max);
        this.foreground.width = Math.floor(CONSTANTS.HEALTH_BAR_WIDTH * (percentage / 100));
        this.foreground.style = `background-color: ${Utils.getHealthColor(percentage, this.settings)};`;
    }
});

const GodvilleIndicator = GObject.registerClass(
    class GodvilleIndicator extends PanelMenu.Button {
        _init(settings) {
            super._init(0.0, 'Godville Status Indicator');
            this._settings = settings;
            this._initializeComponents();
            this._setupEventHandlers();
            this._startPeriodicUpdates();
            this._fetchData();
        }

        _initializeComponents() {
            this._initializeNotificationSource();
            this._initializeUIComponents();
            this._loadStylesheet();
            this._createMenuItems();
        }

        _initializeNotificationSource() {
            this._notificationSource = new MessageTray.Source('Godville Status', 'godville-status-symbolic');
            Main.messageTray.add(this._notificationSource);
        }

        _initializeUIComponents() {
            this._createHealthLabel();
            this._createHeroIcon();
            this._createIndicatorContainer();
        }

        _createHealthLabel() {
            this.healthLabel = new St.Label({
                text: 'Loading...',
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'godville-health-label'
            });
            this.healthLabel.style = 'opacity: 0.3; min-width: 200px; text-align: center;';
        }

        _createHeroIcon() {
            this.heroIcon = new St.Icon({
                icon_name: CONSTANTS.DEFAULT_ICONS.MALE,
                style_class: 'godville-hero-icon',
                y_align: Clutter.ActorAlign.CENTER
            });
        }

        _createIndicatorContainer() {
            this.indicatorContainer = new St.BoxLayout({
                style_class: 'godville-indicator-container',
                vertical: false,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.indicatorContainer.add_child(this.heroIcon);
            this.indicatorContainer.add_child(this.healthLabel);
            this.add_child(this.indicatorContainer);
        }

        _loadStylesheet() {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            const theme = themeContext.get_theme();
            const stylesheetPath = Me.path + '/stylesheet.css';
            const stylesheetFile = Gio.File.new_for_path(stylesheetPath);
            theme.load_stylesheet(stylesheetFile);
        }

        _setupEventHandlers() {
            this.connect('button-press-event', (actor, event) => {
                if (event.get_button() === 1) {
                    this.menu.open();
                }
                return false;
            });
        }

        _startPeriodicUpdates() {
            this._timeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                CONSTANTS.UPDATE_INTERVAL,
                () => {
                    this._fetchData();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        _fetchData() {
            const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
            const godname = settings.get_string('character-name');
            const apiKey = settings.get_string('api-key');

            if (!this._validateSettings(godname, apiKey)) {
                return;
            }

            this._updateLoadingState();
            this._makeApiRequest(godname, apiKey);
        }

        _validateSettings(godname, apiKey) {
            if (!godname || !apiKey) {
                log('[Godville Status] Missing character name or API key');
                this._showError('Missing settings');
                return false;
            }
            return true;
        }

        _updateLoadingState() {
            this.healthLabel.style = 'opacity: 0.3; min-width: 200px; text-align: center;';
        }

        _makeApiRequest(godname, apiKey) {
            const url = `https://godville.net/gods/api/${encodeURIComponent(godname)}/${apiKey}`;
            log('[Godville Status] Fetching data from: ' + url);

            this._session = new Soup.Session();
            const message = new Soup.Message({
                method: 'GET',
                uri: new Soup.URI(url)
            });

            this._session.queue_message(message, (session, message) => this._handleApiResponse(message));
        }

        _handleApiResponse(message) {
            if (message.status_code === 200) {
                this._processSuccessfulResponse(message);
            } else {
                this._handleErrorResponse(message);
            }
        }

        _processSuccessfulResponse(message) {
            try {
                const responseBody = message.response_body.data;
                const jsonData = JSON.parse(responseBody.toString());
                
                if (jsonData && typeof jsonData === 'object') {
                    this._updateMenu(jsonData);
                } else {
                    throw new Error('Invalid data format received');
                }
            } catch (e) {
                this._handleProcessingError(e, message.response_body.data);
            }
        }

        _handleErrorResponse(message) {
            log(`[Godville Status] Error: HTTP ${message.status_code}`);
            this._showNotification(
                'Ошибка получения данных',
                `HTTP ${message.status_code}: Не удалось получить данные. Возможно, нужно зайти в игру для обновления данных.`
            );
            this._showError(`Error ${message.status_code}`);
        }

        _handleProcessingError(error, responseBody) {
            log(`[Godville Status] Error processing response: ${error.message}`);
            log(`[Godville Status] Response body: ${responseBody}`);
            this._showNotification(
                'Ошибка получения данных',
                'Не удалось обработать ответ от сервера. Возможно, нужно зайти в игру для обновления данных.'
            );
            this._showError('Error');
        }

        _showError(text) {
            this.healthLabel.text = text;
            this.healthLabel.style = 'color: #F44336; font-weight: bold;';
        }

        _updateMenu(data) {
            try {
                log('[Godville Status] Updating menu with hero data');
                this._lastData = data;
                
                this._updateStatusLabel(data);
                this._updateHeroIcon(data);
                this._updateHeader(data);
                this._updateHealthBar(data);
                this._updateDiaryAndEye(data);
                this._updateStats(data);
                
                log('[Godville Status] Menu updated successfully');
            } catch (e) {
                log(`[Godville Status] Error updating menu: ${e.message}`);
                log(`[Godville Status] Data that caused error: ${JSON.stringify(data)}`);
                this._showError('...');
            }
        }

        _updateStatusLabel(data) {
            let statusParts = [];
            
            if (this._settings.get_boolean('status-show-health')) {
                const percentage = Utils.formatPercentage(data.health, data.max_health);
                const color = Utils.getHealthColor(percentage, this._settings);
                this.healthLabel.style = `color: ${color}; font-weight: bold;`;
                statusParts.push(`<span>${data.health}/${data.max_health}</span>`);
            }
            
            if (this._settings.get_boolean('status-show-godpower')) {
                const godpowerColor = this._settings.get_string('godpower-color');
                statusParts.push(`<span color="${godpowerColor}">${data.godpower}%</span>`);
            }
            
            if (this._settings.get_boolean('status-show-quest') && data.quest) {
                const maxLength = this._settings.get_int('status-max-length');
                const questText = Utils.truncateText(data.quest, maxLength);
                const questColor = this._settings.get_string('quest-color');
                statusParts.push(`<span color="${questColor}">${questText}</span>`);
            }
            
            if (this._settings.get_boolean('status-show-diary') && data.diary_last) {
                const maxLength = this._settings.get_int('status-max-length');
                const diaryText = Utils.formatDiaryText(data.diary_last, maxLength);
                const diaryColor = this._settings.get_string('diary-color');
                statusParts.push(`<span color="${diaryColor}">${diaryText}</span>`);
            }
            
            this.healthLabel.clutter_text.set_markup(statusParts.join(' | '));
        }

        _updateHeroIcon(data) {
            if (data.arena_fight) {
                this.heroIcon.icon_name = data.fight_type ? 
                    CONSTANTS.FIGHT_ICONS[data.fight_type] || CONSTANTS.DEFAULT_ICONS.DEFAULT :
                    CONSTANTS.DEFAULT_ICONS.DEFAULT;
            } else {
                this.heroIcon.icon_name = data.gender === 'male' ? 
                    CONSTANTS.DEFAULT_ICONS.MALE : 
                    CONSTANTS.DEFAULT_ICONS.FEMALE;
            }
        }

        _updateHeader(data) {
            this.heroNameLabel.text = data.name;
        }

        _updateHealthBar(data) {
            if (this._settings.get_boolean('show-health')) {
                this.healthBar.setValue(data.health, data.max_health);
                this.healthBarItem.visible = true;
            } else {
                this.healthBarItem.visible = false;
            }
        }

        _updateDiaryAndEye(data) {
            if (this._settings.get_boolean('show-diary') && data.diary_last) {
                this.diaryLabel.text = data.diary_last;
                this.diaryItem.visible = true;
            } else {
                this.diaryItem.visible = false;
            }

            if (this._settings.get_boolean('show-eye') && data.eye_last && data.eye_last !== data.diary_last) {
                this.eyeLabel.text = data.eye_last;
                this.eyeItem.visible = true;
            } else {
                this.eyeItem.visible = false;
            }
        }

        _updateStats(data) {
            const stats = this._getOrderedStats();
            this.statsContainer.destroy_all_children();

            for (const stat of stats) {
                if (!stat.visible) continue;

                const label = this._formatStatLabel(stat.key, data);
                if (label) {
                    const statLabel = new St.Label({
                        text: label,
                        style_class: 'godville-stat'
                    });
                    this._setupTextWrapping(statLabel);
                    this.statsContainer.add_child(statLabel);
                }
            }
        }

        _getOrderedStats() {
            const stats = [
                { key: 'health', order: this._settings.get_int('order-health'), visible: this._settings.get_boolean('show-health') },
                { key: 'exp', order: this._settings.get_int('order-exp'), visible: this._settings.get_boolean('show-exp') },
                { key: 'gold', order: this._settings.get_int('order-gold'), visible: this._settings.get_boolean('show-gold') },
                { key: 'arena', order: this._settings.get_int('order-arena'), visible: this._settings.get_boolean('show-arena') },
                { key: 'quest', order: this._settings.get_int('order-quest'), visible: this._settings.get_boolean('show-quest') },
                { key: 'side_job', order: this._settings.get_int('order-side-job'), visible: this._settings.get_boolean('show-side-job') },
                { key: 'aura', order: this._settings.get_int('order-aura'), visible: this._settings.get_boolean('show-aura') },
                { key: 'pet', order: this._settings.get_int('order-pet'), visible: this._settings.get_boolean('show-pet') },
                { key: 'clan', order: this._settings.get_int('order-clan'), visible: this._settings.get_boolean('show-clan') },
                { key: 'alignment', order: this._settings.get_int('order-alignment'), visible: this._settings.get_boolean('show-alignment') },
                { key: 'boss', order: this._settings.get_int('order-boss'), visible: this._settings.get_boolean('show-boss') },
                { key: 'inventory', order: this._settings.get_int('order-inventory'), visible: this._settings.get_boolean('show-inventory') },
                { key: 'materials', order: this._settings.get_int('order-materials'), visible: this._settings.get_boolean('show-materials') },
                { key: 'distance', order: this._settings.get_int('order-distance'), visible: this._settings.get_boolean('show-distance') },
                { key: 'activatables', order: this._settings.get_int('order-activatables'), visible: this._settings.get_boolean('show-activatables') },
                { key: 'relics', order: this._settings.get_int('order-relics'), visible: this._settings.get_boolean('show-relics') },
                { key: 'words', order: this._settings.get_int('order-words'), visible: this._settings.get_boolean('show-words') },
                { key: 'savings', order: this._settings.get_int('order-savings'), visible: this._settings.get_boolean('show-savings') },
                { key: 'ark', order: this._settings.get_int('order-ark'), visible: this._settings.get_boolean('show-ark') },
                { key: 'temple', order: this._settings.get_int('order-temple'), visible: this._settings.get_boolean('show-temple') },
                { key: 'book', order: this._settings.get_int('order-book'), visible: this._settings.get_boolean('show-book') },
                { key: 'souls', order: this._settings.get_int('order-souls'), visible: this._settings.get_boolean('show-souls') }
            ];

            return stats.sort((a, b) => a.order - b.order);
        }

        _formatStatLabel(key, data) {
            switch (key) {
                case 'exp':
                    return _('Experience: %d%% (Level %d)').format(data.exp_progress, data.level);
                case 'gold':
                    return _('Gold: %s').format(data.gold_approx);
                case 'arena':
                    return _('Arena: %dW/%dL').format(data.arena_won, data.arena_lost);
                case 'quest':
                    return _('Quest: %s (%d%%)').format(data.quest, data.quest_progress);
                case 'side_job':
                    return _('Side Job: %s (%d%%)').format(data.side_job, data.side_job_progress);
                case 'aura':
                    return data.aura ? _('Aura: %s').format(data.aura) : null;
                case 'pet':
                    return _('Pet: %s (%s)').format(data.pet.pet_name, data.pet.pet_class);
                case 'clan':
                    return _('Clan: %s (%s)').format(data.clan, data.clan_position);
                case 'alignment':
                    return _('Alignment: %s').format(data.alignment);
                case 'boss':
                    return _('Boss: %s (Power: %d)').format(data.boss_name, data.boss_power);
                case 'inventory':
                    return _('Inventory: %d/%d').format(data.inventory_num, data.inventory_max_num);
                case 'materials':
                    return _('Materials: %d bricks, %d wood').format(data.bricks_cnt, data.wood_cnt);
                case 'distance':
                    let distanceText = _('Distance: %d').format(data.distance);
                    if (data.town_name && data.town_name !== '') {
                        distanceText += _(' (%s)').format(data.town_name);
                    }
                    return distanceText;
                case 'activatables':
                    return data.activatables && data.activatables.length > 0 ?
                        _('Activatables: %s').format(data.activatables.join(', ')) : null;
                case 'relics':
                    return data.relics_percent ? _('Relics: %s').format(data.relics_percent) : null;
                case 'words':
                    return data.words ? _('Words: %d').format(data.words) : null;
                case 'savings':
                    return data.savings ? _('Savings: %s').format(data.savings) : null;
                case 'ark':
                    if (data.ark_name) {
                        let arkText = _('Ark: %s').format(data.ark_name);
                        if (data.ark_f !== undefined && data.ark_m !== undefined) {
                            arkText += _(' (%d♀/%d♂)').format(data.ark_f, data.ark_m);
                        }
                        return arkText;
                    }
                    return null;
                case 'temple':
                    return data.temple_completed_at ?
                        _('Temple completed: %s').format(data.temple_completed_at) : null;
                case 'book':
                    return data.book_at ?
                        _('Book completed: %s').format(data.book_at) : null;
                case 'souls':
                    if (data.souls_at) {
                        return _('Souls completed: %s').format(data.souls_at);
                    } else if (data.souls_percent) {
                        return _('Souls: %s').format(data.souls_percent);
                    }
                    return null;
                default:
                    return null;
            }
        }

        _setupTextWrapping(label) {
            label.clutter_text.line_wrap = true;
            label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;
        }

        _showNotification(title, message) {
            const notification = new MessageTray.Notification(this._notificationSource, title, message);
            notification.setTransient(false);
            this._notificationSource.showNotification(notification);
        }
        
        destroy() {
            if (this._timeout) {
                GLib.source_remove(this._timeout);
                this._timeout = null;
            }
            if (this._session) {
                this._session.abort();
                this._session = null;
            }
            if (this._notificationSource) {
                this._notificationSource.destroy();
                this._notificationSource = null;
            }
            super.destroy();
        }

        _createMenuItems() {
            this._createHeader();
            this._createHealthBar();
            this._createDiarySection();
            this._createEyeSection();
            this._createStatsSection();
            this._addSeparator();
        }

        _createHeader() {
            this.headerContainer = new St.BoxLayout({
                style_class: 'godville-header-container',
                vertical: false,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER
            });

            this.headerItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false
            });
            this.headerItem.add_child(this.headerContainer);
            this.menu.addMenuItem(this.headerItem);

            this._createHeroNameLabel();
            this._createHeaderButtons();
        }

        _createHeroNameLabel() {
            this.heroNameLabel = new St.Label({
                text: 'Hero Status',
                style_class: 'godville-header'
            });
            this.headerContainer.add_child(this.heroNameLabel);
        }

        _createHeaderButtons() {
            this._createWebsiteButton();
            this._createRefreshButton();
            this._createSettingsButton();
        }

        _createWebsiteButton() {
            this.websiteButton = new St.Button({
                style_class: 'godville-website-button',
                can_focus: true,
                x_expand: false,
                y_expand: false
            });
            this.websiteButton.set_child(new St.Icon({
                icon_name: 'web-browser-symbolic',
                style_class: 'godville-website-icon'
            }));
            this.websiteButton.connect('clicked', () => {
                Gio.AppInfo.launch_default_for_uri('https://godville.net/superhero', null);
            });
            this.headerContainer.add_child(this.websiteButton);
        }

        _createRefreshButton() {
            this.refreshButton = new St.Button({
                style_class: 'godville-refresh-button',
                can_focus: true,
                x_expand: false,
                y_expand: false
            });
            this.refreshButton.set_child(new St.Icon({
                icon_name: 'view-refresh-symbolic',
                style_class: 'godville-refresh-icon'
            }));
            this.refreshButton.connect('clicked', () => this._fetchData());
            this.headerContainer.add_child(this.refreshButton);
        }

        _createSettingsButton() {
            this.settingsButton = new St.Button({
                style_class: 'godville-settings-button',
                can_focus: true,
                x_expand: false,
                y_expand: false
            });
            this.settingsButton.set_child(new St.Icon({
                icon_name: 'preferences-system-symbolic',
                style_class: 'godville-settings-icon'
            }));
            this.settingsButton.connect('clicked', () => {
                ExtensionUtils.openPrefs();
            });
            this.headerContainer.add_child(this.settingsButton);
        }

        _createHealthBar() {
            this.healthBar = new HealthBar({
                settings: this._settings
            });
            this.healthBarItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                style_class: 'godville-health-bar-item'
            });
            this.healthBarItem.add_child(this.healthBar);
            this.menu.addMenuItem(this.healthBarItem);
        }

        _createDiarySection() {
            this.diaryContainer = new St.BoxLayout({
                style_class: 'godville-diary-container',
                vertical: true
            });
            this.diaryHeader = new St.Label({
                text: _('Последняя запись дневника'),
                style_class: 'godville-diary-header'
            });
            this.diaryContainer.add_child(this.diaryHeader);
            this.diaryLabel = new St.Label({
                text: 'Loading...',
                style_class: 'godville-diary'
            });
            this._setupTextWrapping(this.diaryLabel);
            this.diaryContainer.add_child(this.diaryLabel);
            
            this.diaryItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false
            });
            this.diaryItem.add_child(this.diaryContainer);
            this.menu.addMenuItem(this.diaryItem);
        }

        _createEyeSection() {
            this.eyeContainer = new St.BoxLayout({
                style_class: 'godville-eye-container',
                vertical: true
            });
            this.eyeHeader = new St.Label({
                text: _('Последняя запись третьего глаза'),
                style_class: 'godville-eye-header'
            });
            this.eyeContainer.add_child(this.eyeHeader);
            this.eyeLabel = new St.Label({
                text: 'Loading...',
                style_class: 'godville-eye'
            });
            this._setupTextWrapping(this.eyeLabel);
            this.eyeContainer.add_child(this.eyeLabel);
            
            this.eyeItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false
            });
            this.eyeItem.add_child(this.eyeContainer);
            this.menu.addMenuItem(this.eyeItem);
        }

        _createStatsSection() {
            this.statsContainer = new St.BoxLayout({
                style_class: 'godville-stats-container',
                vertical: true
            });
            this.statsItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false
            });
            this.statsItem.add_child(this.statsContainer);
            this.menu.addMenuItem(this.statsItem);

            this._createStatLabels();
        }

        _createStatLabels() {
            const statLabels = [
                { key: 'quest', text: 'Quest: Loading...' },
                { key: 'gold', text: 'Gold: Loading...' },
                { key: 'level', text: 'Level: Loading...' },
                { key: 'pet', text: 'Pet: Loading...' },
                { key: 'clan', text: 'Clan: Loading...' },
                { key: 'alignment', text: 'Alignment: Loading...' },
                { key: 'arena', text: 'Arena: Loading...' }
            ];

            statLabels.forEach(({ key, text }) => {
                this[`${key}Label`] = new St.Label({
                    text: text,
                    style_class: 'godville-stat'
                });
                this.statsContainer.add_child(this[`${key}Label`]);
            });
        }

        _addSeparator() {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }
    }
);

class Extension {
    constructor() {
        this._indicator = null;
        this._settings = null;
        this._positionId = null;
        this._changeSignal = null;
    }

    enable() {
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
        this._createIndicator();
        
        this._changeSignal = this._settings.connect(
            'changed::extension-position',
            () => this._recreateIndicator()
        );
    }

    disable() {
        // Disconnect all signals
        if (this._changeSignal) {
            this._settings.disconnect(this._changeSignal);
            this._changeSignal = null;
        }
        this._destroyIndicator();
        this._settings = null;
    }

    _createIndicator() {
        if (this._indicator) return;

        this._positionId = `godville-status-${Math.floor(Math.random() * 1000)}`;
        this._indicator = new GodvilleIndicator(this._settings);
        
        Main.panel.addToStatusArea(
            this._positionId,
            this._indicator,
            0,
            this._settings.get_string('extension-position')
        );
    }

    _recreateIndicator() {
        log('[Godville] Recreating indicator...');
        this._destroyIndicator();
        this._recreateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._createIndicator();
            return GLib.SOURCE_REMOVE;
        });
    }

    _destroyIndicator() {
        if (!this._indicator) return;
        
        log('[Godville] Destroying indicator...');
        this._indicator.destroy();
        this._indicator = null;
        this._positionId = null;

        // Remove recreate timeout if it exists
        if (this._recreateTimeout) {
            GLib.source_remove(this._recreateTimeout);
            this._recreateTimeout = null;
        }
    }
}

function init() {
    ExtensionUtils.initTranslations();
    return new Extension();
} 