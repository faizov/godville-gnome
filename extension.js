const { GObject, St, Gio, GLib, Soup, Clutter, Pango } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;
const MessageTray = imports.ui.messageTray;
const Gettext = imports.gettext;

// Correct Gettext initialization for locale
const LOCALE_DIR = Me.dir.get_child('locale').get_path();
Gettext.bindtextdomain('godville-status', LOCALE_DIR);
Gettext.textdomain('godville-status');
const _ = Gettext.gettext;

const HealthBar = GObject.registerClass(
    class HealthBar extends St.BoxLayout {
        _init(params) {
            super._init(params);
            
            this.style_class = 'godville-health-bar-container';
            
            // Create background bar
            this.background = new St.BoxLayout({
                style_class: 'godville-health-bar-background',
            });
            this.add_child(this.background);
            
            // Create foreground bar
            this.foreground = new St.BoxLayout({
                style_class: 'godville-health-bar-foreground',
            });
            this.background.add_child(this.foreground);

            // Set initial value
            this.setValue(0, 100);
        }
        
        setValue(current, max) {
            const percentage = (current / max) * 100;
            this.foreground.width = Math.floor(380 * (percentage / 100));
            
            // Update color based on percentage
            let color;
            if (percentage > 70) color = '#4CAF50'; // Green
            else if (percentage > 30) color = '#FFC107'; // Yellow
            else color = '#F44336'; // Red
            
            this.foreground.style = `background-color: ${color};`;
        }
    }
);

const GodvilleIndicator = GObject.registerClass(
    class GodvilleIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, 'Godville Status Indicator');

            // Initialize notification source
            this._notificationSource = new MessageTray.Source('Godville Status', 'godville-status-symbolic');
            Main.messageTray.add(this._notificationSource);

            // Get settings
            this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');

            // Connect to all settings changes
            this._settings.connect('changed', () => {
                if (this._lastData) {
                    this._updateMenu(this._lastData);
                }
            });

            // Set initial position
            // this._updatePosition();

            // Create health label with custom styling
            this.healthLabel = new St.Label({
                text: 'Loading...',
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'godville-health-label'
            });
            this.healthLabel.style = 'opacity: 0.3;';

            // Add hero icon
            this.heroIcon = new St.Icon({
                icon_name: 'avatar-default-symbolic',
                style_class: 'godville-hero-icon',
                y_align: Clutter.ActorAlign.CENTER
            });

            // Create container for health label and icon
            this.indicatorContainer = new St.BoxLayout({
                style_class: 'godville-indicator-container',
                vertical: false,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.indicatorContainer.add_child(this.heroIcon);
            this.indicatorContainer.add_child(this.healthLabel);
            this.add_child(this.indicatorContainer);

            // Add click handler
            this.connect('button-press-event', (actor, event) => {
                if (event.get_button() === 1) { // Left click
                    this.menu.open();
                }
                return false;
            });
            
            // Add custom CSS
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            const theme = themeContext.get_theme();
            const stylesheetPath = Me.path + '/stylesheet.css';
            const stylesheetFile = Gio.File.new_for_path(stylesheetPath);
            theme.load_stylesheet(stylesheetFile);
            
            // Add header
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

            // Add hero name label
            this.heroNameLabel = new St.Label({
                text: 'Hero Status',
                style_class: 'godville-header'
            });
            this.headerContainer.add_child(this.heroNameLabel);

            // Add website button as icon
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
                Util.trySpawnCommandLine('xdg-open https://godville.net/superhero');
            });
            this.headerContainer.add_child(this.websiteButton);

            // Add refresh button as icon
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

            // Add settings button as icon
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

            // Add health bar
            this.healthBar = new HealthBar();
            this.healthBarItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                style_class: 'godville-health-bar-item'
            });
            this.healthBarItem.add_child(this.healthBar);
            this.menu.addMenuItem(this.healthBarItem);

            // Add diary entry
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
            this.diaryLabel.clutter_text.line_wrap = true;
            this.diaryLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;
            this.diaryContainer.add_child(this.diaryLabel);
            
            this.diaryItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false
            });
            this.diaryItem.add_child(this.diaryContainer);
            this.menu.addMenuItem(this.diaryItem);

            // Add eye entry
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
            this.eyeLabel.clutter_text.line_wrap = true;
            this.eyeLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;
            this.eyeContainer.add_child(this.eyeLabel);
            
            this.eyeItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false
            });
            this.eyeItem.add_child(this.eyeContainer);
            this.menu.addMenuItem(this.eyeItem);

            // Add statistics container
            this.statsContainer = new St.BoxLayout({
                style_class: 'godville-stats-container',
                vertical: true
            });
            this.statsItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false
            });
            this.statsItem.add_child(this.statsContainer);
            this.menu.addMenuItem(this.statsItem);

            // Create stat items
            this.questLabel = new St.Label({
                text: 'Quest: Loading...',
                style_class: 'godville-stat'
            });
            this.statsContainer.add_child(this.questLabel);

            this.goldLabel = new St.Label({
                text: 'Gold: Loading...',
                style_class: 'godville-stat'
            });
            this.statsContainer.add_child(this.goldLabel);

            this.levelLabel = new St.Label({
                text: 'Level: Loading...',
                style_class: 'godville-stat'
            });
            this.statsContainer.add_child(this.levelLabel);

            this.petLabel = new St.Label({
                text: 'Pet: Loading...',
                style_class: 'godville-stat'
            });
            this.statsContainer.add_child(this.petLabel);

            this.clanLabel = new St.Label({
                text: 'Clan: Loading...',
                style_class: 'godville-stat'
            });
            this.statsContainer.add_child(this.clanLabel);

            this.alignmentLabel = new St.Label({
                text: 'Alignment: Loading...',
                style_class: 'godville-stat'
            });
            this.statsContainer.add_child(this.alignmentLabel);

            this.arenaLabel = new St.Label({
                text: 'Arena: Loading...',
                style_class: 'godville-stat'
            });
            this.statsContainer.add_child(this.arenaLabel);

            // Add separator before buttons
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Start periodic updates
            this._timeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                300, // Update every 5 minutes
                () => {
                    this._fetchData();
                    return GLib.SOURCE_CONTINUE;
                }
            );

            // Initial data fetch
            this._fetchData();
        }

        _getHealthColor(health, maxHealth) {
            const percentage = (health / maxHealth) * 100;
            if (percentage > 70) return '#4CAF50'; // Green
            if (percentage > 30) return '#FFC107'; // Yellow
            return '#F44336'; // Red
        }

        _fetchData() {
            const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
            const godname = settings.get_string('character-name');
            const apiKey = settings.get_string('api-key');

            if (!godname || !apiKey) {
                log('[Godville Status] Missing character name or API key');
                this.healthLabel.text = 'Missing settings';
                this.healthLabel.style = 'color: #F44336; font-weight: bold;';
                return;
            }

            const url = `https://godville.net/gods/api/${encodeURIComponent(godname)}/${apiKey}`;
            log('[Godville Status] Fetching data from: ' + url);

            // Update status to show we're refreshing
            this.healthLabel.text = 'Refreshing...';
            this.healthLabel.style = 'color: #FFC107; font-weight: bold;';

            const session = new Soup.Session();
            const message = new Soup.Message({
                method: 'GET',
                uri: new Soup.URI(url)
            });

            session.queue_message(message, (session, message) => {
                if (message.status_code === 200) {
                    log('[Godville Status] Response received');
                    const responseBody = message.response_body.data;
                    log('[Godville Status] Response body length: ' + responseBody.length);
                    
                    try {
                        const jsonStr = responseBody.toString();
                        log('[Godville Status] Decoded string: ' + jsonStr.substring(0, 100) + '...');
                        
                        log('[Godville Status] Parsing JSON response...');
                        const jsonData = JSON.parse(jsonStr);
                        log('[Godville Status] JSON parsed successfully');
                        log('[Godville Status] Data received: ' + JSON.stringify(jsonData));
                        
                        if (jsonData && typeof jsonData === 'object') {
                        this._updateMenu(jsonData);
                        } else {
                            throw new Error('Invalid data format received');
                        }
                    } catch (e) {
                        log(`[Godville Status] Error processing response: ${e.message}`);
                        log(`[Godville Status] Response body: ${responseBody}`);
                        this._showNotification('Ошибка получения данных', 'Не удалось обработать ответ от сервера. Возможно, нужно зайти в игру для обновления данных.');
                        this.healthLabel.text = 'Error';
                        this.healthLabel.style = 'color: #F44336; font-weight: bold;';
                    }
                } else {
                    log(`[Godville Status] Error: HTTP ${message.status_code}`);
                    this._showNotification('Ошибка получения данных', `HTTP ${message.status_code}: Не удалось получить данные. Возможно, нужно зайти в игру для обновления данных.`);
                    this.healthLabel.text = `Error ${message.status_code}`;
                    this.healthLabel.style = 'color: #F44336; font-weight: bold;';
                }
            });
        }

        _updateMenu(data) {
            try {
                log('[Godville Status] Updating menu with hero data');
                log('[Godville Status] Data received: ' + JSON.stringify(data));

                // Store the last data for settings changes
                this._lastData = data;
                
                // Update the status label with configurable information
                let statusParts = [];
                
                if (this._settings.get_boolean('status-show-health')) {
                    const healthColor = this._getHealthColor(data.health, data.max_health);
                    statusParts.push(`<span color="${healthColor}">${data.health}/${data.max_health}</span>`);
                }
                
                if (this._settings.get_boolean('status-show-godpower')) {
                    statusParts.push(`<span color="#2196F3">${data.godpower}%</span>`);
                }
                
                if (this._settings.get_boolean('status-show-quest') && data.quest) {
                    const maxLength = this._settings.get_int('status-max-length');
                    const questText = data.quest.length > maxLength ? 
                        data.quest.substring(0, maxLength) + '...' : 
                        data.quest;
                    statusParts.push(`<span color="#FFC107">${questText}</span>`);
                }
                
                if (this._settings.get_boolean('status-show-diary') && data.diary_last) {
                    const maxLength = this._settings.get_int('status-max-length');
                    // Remove line breaks and extra spaces
                    const diaryText = data.diary_last
                        .replace(/\n/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    const truncatedText = diaryText.length > maxLength ? 
                        diaryText.substring(0, maxLength) + '...' : 
                        diaryText;
                    statusParts.push(`<span color="#4CAF50">${truncatedText}</span>`);
                }
                
                // Join all parts with a separator
                const statusText = statusParts.join(' | ');
                this.healthLabel.clutter_text.set_markup(statusText);
                
                // Update hero icon based on fight type
                if (data.arena_fight) {
                    if (!data.fight_type) {
                        this.heroIcon.icon_name = 'security-high-symbolic';
                    } else {
                        switch(data.fight_type) {
                            case 'arena':
                                this.heroIcon.icon_name = 'media-playback-start-symbolic';
                                break;
                            case 'boss':
                            case 'boss_m':
                                this.heroIcon.icon_name = 'dialog-warning-symbolic';
                                break;
                            case 'challenge':
                                this.heroIcon.icon_name = 'system-run-symbolic';
                                break;
                            case 'dungeon':
                                this.heroIcon.icon_name = 'folder-visiting-symbolic';
                                break;
                            case 'multi_monster':
                                this.heroIcon.icon_name = 'view-more-symbolic';
                                break;
                            case 'range':
                                this.heroIcon.icon_name = 'view-fullscreen-symbolic';
                                break;
                            case 'sail':
                                this.heroIcon.icon_name = 'weather-showers-symbolic';
                                break;
                            default:
                                this.heroIcon.icon_name = 'security-high-symbolic';
                        }
                    }
                } else {
                    this.heroIcon.icon_name = data.gender === 'male' ? 
                        'avatar-default-symbolic' : 
                        'avatar-default-female-symbolic';
                }
                
                // Update header with hero name
                this.heroNameLabel.text = data.name;
                
                // Update health bar if health stats are enabled
                if (this._settings.get_boolean('show-health')) {
                    this.healthBar.setValue(data.health, data.max_health);
                    this.healthBarItem.visible = true;
                } else {
                    this.healthBarItem.visible = false;
                }
                
                // Update diary entry
                if (this._settings.get_boolean('show-diary') && data.diary_last) {
                    this.diaryLabel.text = data.diary_last;
                    this.diaryItem.visible = true;
                } else {
                    this.diaryItem.visible = false;
                }

                // Update eye entry - only show if different from diary
                if (this._settings.get_boolean('show-eye') && data.eye_last && data.eye_last !== data.diary_last) {
                    this.eyeLabel.text = data.eye_last;
                    this.eyeItem.visible = true;
                } else {
                    this.eyeItem.visible = false;
                }
                
                // Create a list of statistics with their order
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

                // Sort statistics by their order
                stats.sort((a, b) => a.order - b.order);

                // Clear existing statistics
                this.statsContainer.destroy_all_children();

                // Add statistics to container in sorted order
                for (const stat of stats) {
                    if (!stat.visible) continue;

                    let label;
                    switch (stat.key) {
                        case 'exp':
                            label = _('Experience: %d%% (Level %d)').format(data.exp_progress, data.level);
                            break;
                        case 'gold':
                            label = _('Gold: %s').format(data.gold_approx);
                            break;
                        case 'arena':
                            label = _('Arena: %dW/%dL').format(data.arena_won, data.arena_lost);
                            break;
                        case 'quest':
                            label = _('Quest: %s (%d%%)').format(data.quest, data.quest_progress);
                            break;
                        case 'side_job':
                            label = _('Side Job: %s (%d%%)').format(data.side_job, data.side_job_progress);
                            break;
                        case 'aura':
                            if (data.aura) {
                                label = _('Aura: %s').format(data.aura);
                            }
                            break;
                        case 'pet':
                            label = _('Pet: %s (%s)').format(data.pet.pet_name, data.pet.pet_class);
                            break;
                        case 'clan':
                            label = _('Clan: %s (%s)').format(data.clan, data.clan_position);
                            break;
                        case 'alignment':
                            label = _('Alignment: %s').format(data.alignment);
                            break;
                        case 'boss':
                            label = _('Boss: %s (Power: %d)').format(data.boss_name, data.boss_power);
                            break;
                        case 'inventory':
                            label = _('Inventory: %d/%d').format(data.inventory_num, data.inventory_max_num);
                            break;
                        case 'materials':
                            label = _('Materials: %d bricks, %d wood').format(data.bricks_cnt, data.wood_cnt);
                            break;
                        case 'distance':
                            let distanceText = _('Distance: %d').format(data.distance);
                            if (data.town_name && data.town_name !== '') {
                                distanceText += _(' (%s)').format(data.town_name);
                            }
                            label = distanceText;
                            break;
                        case 'activatables':
                            if (data.activatables && data.activatables.length > 0) {
                                label = _('Activatables: %s').format(data.activatables.join(', '));
                            }
                            break;
                        case 'relics':
                            if (data.relics_percent) {
                                label = _('Relics: %s').format(data.relics_percent);
                            }
                            break;
                        case 'words':
                            if (data.words) {
                                label = _('Words: %d').format(data.words);
                            }
                            break;
                        case 'savings':
                            if (data.savings) {
                                label = _('Savings: %s').format(data.savings);
                            }
                            break;
                        case 'ark':
                            if (data.ark_name) {
                                let arkText = _('Ark: %s').format(data.ark_name);
                                if (data.ark_f !== undefined && data.ark_m !== undefined) {
                                    arkText += _(' (%d♀/%d♂)').format(data.ark_f, data.ark_m);
                                }
                                label = arkText;
                            }
                            break;
                        case 'temple':
                            if (data.temple_completed_at) {
                                label = _('Temple completed: %s').format(data.temple_completed_at);
                            }
                            break;
                        case 'book':
                            if (data.book_at) {
                                label = _('Book completed: %s').format(data.book_at);
                            }
                            break;
                        case 'souls':
                            if (data.souls_at) {
                                label = _('Souls completed: %s').format(data.souls_at);
                            } else if (data.souls_percent) {
                                label = _('Souls: %s').format(data.souls_percent);
                            }
                            break;
                    }

                    if (label) {
                        const statLabel = new St.Label({
                            text: label,
                            style_class: 'godville-stat'
                        });
                        statLabel.clutter_text.line_wrap = true;
                        statLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;
                        statLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
                        statLabel.clutter_text.single_line_mode = false;
                        this.statsContainer.add_child(statLabel);
                    }
                }
                
                log('[Godville Status] Menu updated successfully');
            } catch (e) {
                log(`[Godville Status] Error updating menu: ${e.message}`);
                log(`[Godville Status] Data that caused error: ${JSON.stringify(data)}`);
                this.healthLabel.text = '...';
                this.healthLabel.style = 'opacity: 0.2;'; // Very dim for error state
            }
        }

        _showNotification(title, message) {
            const notification = new MessageTray.Notification(this._notificationSource, title, message);
            notification.setTransient(false);
            this._notificationSource.showNotification(notification);
        }
        
        // _updatePosition() {
        //     const position = this._settings.get_string('extension-position');
            
        //     // Удаляем из текущей позиции
        //     if (this.get_parent()) {
        //         this.get_parent().remove_child(this);
        //     }
        
        //     // Добавляем в новую позицию через официальное API
        //     switch(position) {
        //         case 'left':
        //             Main.panel.addToStatusArea('godville-status', this, 0, 'left');
        //             break;
        //         case 'center':
        //             Main.panel.addToStatusArea('godville-status', this, 0, 'center');
        //             break;
        //         default:
        //             Main.panel.addToStatusArea('godville-status', this, 0, 'right');
        //     }
        // }
        
        

        destroy() {
            if (this._timeout) {
                GLib.source_remove(this._timeout);
                this._timeout = null;
            }
            if (this._notificationSource) {
                this._notificationSource.destroy();
                this._notificationSource = null;
            }
            super.destroy();
        }
    }
);

class Extension {
    constructor() {
        this._indicator = null;
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.godville-status');
        this._positionId = null;
        this._changeSignal = null; // Для хранения сигнала настроек
    }

    enable() {
        this._createIndicator();
        // Подключаем сигнал только для изменения позиции
        this._changeSignal = this._settings.connect(
            'changed::extension-position',
            () => this._recreateIndicator()
        );
    }

    disable() {
        // Отключаем все сигналы
        if (this._changeSignal) {
            this._settings.disconnect(this._changeSignal);
            this._changeSignal = null;
        }
        this._destroyIndicator();
    }

    _createIndicator() {
        if (this._indicator) return;

        // Генерируем уникальный ID с случайным числом
        this._positionId = `godville-status-${Math.floor(Math.random() * 1000)}`;
        this._indicator = new GodvilleIndicator();
        
        // Добавляем с учетом текущей позиции
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
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
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
    }
}

function init() {
    return new Extension();
} 