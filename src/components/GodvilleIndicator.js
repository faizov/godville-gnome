const { GObject, St, Gio, GLib, Clutter, Pango } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;
const Gettext = imports.gettext;

// Import our components and services
const { HealthBar } = Me.imports.src.components.HealthBar;
const { GodvilleAPI } = Me.imports.src.services.GodvilleAPI;
const { NotificationService } = Me.imports.src.services.NotificationService;
const { SettingsManager } = Me.imports.src.services.SettingsManager;

const GodvilleIndicatorClass = GObject.registerClass(
    class GodvilleIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, 'Godville Status Indicator');

            // Initialize services
            this._notificationService = new NotificationService();
            this._settings = new SettingsManager();
            this._api = new GodvilleAPI();

            // Connect to settings changes
            this._settingsChangedId = this._settings.connectChanged(() => {
                if (this._lastData) {
                    this._updateMenu(this._lastData);
                }
                if (this._settings.getString('extension-position')) {
                    this._updatePosition();
                }
            });

            // Set initial position
            this._updatePosition();

            // Create health label
            this.healthLabel = new St.Label({
                text: 'Loading...',
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'godville-health-label'
            });
            this.healthLabel.style = 'opacity: 0.3;';
            this.add_child(this.healthLabel);

            // Add click handler
            this.connect('button-press-event', (actor, event) => {
                if (event.get_button() === 1) {
                    this.menu.open();
                }
                return false;
            });

            // Load stylesheet
            this._loadStylesheet();

            // Initialize UI components
            this._initHeader();
            this._initHealthBar();
            this._initDiary();
            this._initStats();

            // Start periodic updates
            this._startPeriodicUpdates();

            // Initial data fetch
            this._fetchData();
        }

        _loadStylesheet() {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            const theme = themeContext.get_theme();
            const stylesheetPath = Me.path + '/stylesheet.css';
            const stylesheetFile = Gio.File.new_for_path(stylesheetPath);
            theme.load_stylesheet(stylesheetFile);
        }

        _initHeader() {
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

            // Add website button
            this._addHeaderButton('web-browser-symbolic', 'godville-website-button', () => {
                Util.trySpawnCommandLine('xdg-open https://godville.net/superhero');
            });

            // Add refresh button
            this._addHeaderButton('view-refresh-symbolic', 'godville-refresh-button', () => {
                this._fetchData();
            });

            // Add settings button
            this._addHeaderButton('preferences-system-symbolic', 'godville-settings-button', () => {
                ExtensionUtils.openPrefs();
            });
        }

        _addHeaderButton(iconName, styleClass, callback) {
            const button = new St.Button({
                style_class: styleClass,
                can_focus: true,
                x_expand: false,
                y_expand: false
            });
            button.set_child(new St.Icon({
                icon_name: iconName,
                style_class: styleClass + '-icon',
                icon_size: 16
            }));
            button.connect('clicked', callback);
            this.headerContainer.add_child(button);
        }

        _initHealthBar() {
            this.healthBar = new HealthBar();
            this.healthBarItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                style_class: 'godville-health-bar-item'
            });
            this.healthBarItem.add_child(this.healthBar);
            this.menu.addMenuItem(this.healthBarItem);
        }

        _initDiary() {
            this.diaryContainer = new St.BoxLayout({
                style_class: 'godville-diary-container',
                vertical: true
            });
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
        }

        _initStats() {
            this.statsContainer = new St.BoxLayout({
                style_class: 'godville-stats-container',
                vertical: true
            });
            this.statsItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false
            });
            this.statsItem.add_child(this.statsContainer);
            this.menu.addMenuItem(this.statsItem);

            // Add separator before buttons
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }

        _startPeriodicUpdates() {
            this._timeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                300, // Update every 5 minutes
                () => {
                    this._fetchData();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        async _fetchData() {
            try {
                this.healthLabel.text = 'Refreshing...';
                this.healthLabel.style = 'color: #FFC107; font-weight: bold;';

                const data = await this._api.fetchData();
                this._updateMenu(data);
            } catch (error) {
                log(`[Godville Status] Error fetching data: ${error.message}`);
                this._notificationService.showNotification(
                    'Ошибка получения данных',
                    'Не удалось получить данные. Возможно, нужно зайти в игру для обновления данных.'
                );
                this.healthLabel.text = '...';
                this.healthLabel.style = 'opacity: 0.2;';
            }
        }

        _updateMenu(data) {
            try {
                this._lastData = data;
                
                // Update status label
                this._updateStatusLabel(data);
                
                // Update header
                this.heroNameLabel.text = data.name;
                
                // Update health bar
                if (this._settings.getBoolean('show-health')) {
                    this.healthBar.setValue(data.health, data.max_health);
                    this.healthBarItem.visible = true;
                } else {
                    this.healthBarItem.visible = false;
                }
                
                // Update diary
                this.diaryLabel.text = data.diary_last || _('No diary entries');
                this.diaryItem.visible = this._settings.getBoolean('show-diary');
                
                // Update statistics
                this._updateStatistics(data);
                
            } catch (e) {
                log(`[Godville Status] Error updating menu: ${e.message}`);
                this.healthLabel.text = '...';
                this.healthLabel.style = 'opacity: 0.2;';
            }
        }

        _updateStatusLabel(data) {
            let statusParts = [];
            
            if (this._settings.getBoolean('status-show-health')) {
                const healthColor = this._getHealthColor(data.health, data.max_health);
                statusParts.push(`<span color="${healthColor}">${data.health}/${data.max_health}</span>`);
            }
            
            if (this._settings.getBoolean('status-show-godpower')) {
                statusParts.push(`<span color="#2196F3">${data.godpower}%</span>`);
            }
            
            if (this._settings.getBoolean('status-show-quest') && data.quest) {
                const maxLength = this._settings.getInt('status-max-length');
                const questText = data.quest.length > maxLength ? 
                    data.quest.substring(0, maxLength) + '...' : 
                    data.quest;
                statusParts.push(`<span color="#FFC107">${questText}</span>`);
            }
            
            if (this._settings.getBoolean('status-show-diary') && data.diary_last) {
                const maxLength = this._settings.getInt('status-max-length');
                const diaryText = data.diary_last
                    .replace(/\n/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                const truncatedText = diaryText.length > maxLength ? 
                    diaryText.substring(0, maxLength) + '...' : 
                    diaryText;
                statusParts.push(`<span color="#4CAF50">${truncatedText}</span>`);
            }
            
            const statusText = statusParts.join(' | ');
            this.healthLabel.clutter_text.set_markup(statusText);
        }

        _updateStatistics(data) {
            const stats = [
                { key: 'exp', order: this._settings.getInt('order-exp'), visible: this._settings.getBoolean('show-exp') },
                { key: 'gold', order: this._settings.getInt('order-gold'), visible: this._settings.getBoolean('show-gold') },
                { key: 'arena', order: this._settings.getInt('order-arena'), visible: this._settings.getBoolean('show-arena') },
                { key: 'quest', order: this._settings.getInt('order-quest'), visible: this._settings.getBoolean('show-quest') },
                { key: 'pet', order: this._settings.getInt('order-pet'), visible: this._settings.getBoolean('show-pet') },
                { key: 'clan', order: this._settings.getInt('order-clan'), visible: this._settings.getBoolean('show-clan') },
                { key: 'alignment', order: this._settings.getInt('order-alignment'), visible: this._settings.getBoolean('show-alignment') },
                { key: 'boss', order: this._settings.getInt('order-boss'), visible: this._settings.getBoolean('show-boss') },
                { key: 'inventory', order: this._settings.getInt('order-inventory'), visible: this._settings.getBoolean('show-inventory') },
                { key: 'materials', order: this._settings.getInt('order-materials'), visible: this._settings.getBoolean('show-materials') },
                { key: 'distance', order: this._settings.getInt('order-distance'), visible: this._settings.getBoolean('show-distance') }
            ];

            stats.sort((a, b) => a.order - b.order);
            this.statsContainer.destroy_all_children();

            for (const stat of stats) {
                if (!stat.visible) continue;

                let label = this._getStatLabel(stat.key, data);
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
        }

        _getStatLabel(key, data) {
            switch (key) {
                case 'exp':
                    return _('Experience: %d%% (Level %d)').format(data.exp_progress, data.level);
                case 'gold':
                    return _('Gold: %s').format(data.gold_approx);
                case 'arena':
                    return _('Arena: %dW/%dL').format(data.arena_won, data.arena_lost);
                case 'quest':
                    return _('Quest: %s (%d%%)').format(data.quest, data.quest_progress);
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
            }
            return null;
        }

        _getHealthColor(health, maxHealth) {
            const percentage = (health / maxHealth) * 100;
            if (percentage > 70) return '#4CAF50';
            if (percentage > 30) return '#FFC107';
            return '#F44336';
        }

        _updatePosition() {
            const position = this._settings.getString('extension-position');
        
            Main.panel._leftBox.remove_child(this);
            Main.panel._centerBox.remove_child(this);
            Main.panel._rightBox.remove_child(this);
        
            if (position === 'left') {
                Main.panel._leftBox.insert_child_at_index(this, 0);
            } else if (position === 'center') {
                Main.panel._centerBox.insert_child_at_index(this, 0);
            } else {
                Main.panel._rightBox.insert_child_at_index(this, 0);
            }
        }

        destroy() {
            if (this._timeout) {
                GLib.source_remove(this._timeout);
                this._timeout = null;
            }
            if (this._notificationService) {
                this._notificationService.destroy();
                this._notificationService = null;
            }
            if (this._settingsChangedId) {
                this._settings.disconnectChanged(this._settingsChangedId);
            }
            super.destroy();
        }
    }
);

// Export the class
var GodvilleIndicator = GodvilleIndicatorClass; 