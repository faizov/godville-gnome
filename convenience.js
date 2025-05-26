const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Import all our modules
const HealthBarComponent = Me.imports.src.components.HealthBar.HealthBarComponent;
const GodvilleIndicatorComponent = Me.imports.src.components.GodvilleIndicator.GodvilleIndicatorComponent;
const GodvilleAPIService = Me.imports.src.services.GodvilleAPI.GodvilleAPIService;
const NotificationServiceClass = Me.imports.src.services.NotificationService.NotificationServiceClass;
const SettingsManagerClass = Me.imports.src.utils.SettingsManager.SettingsManagerClass;

// Export all modules
var modules = {
    HealthBar: HealthBarComponent,
    GodvilleIndicator: GodvilleIndicatorComponent,
    GodvilleAPI: GodvilleAPIService,
    NotificationService: NotificationServiceClass,
    SettingsManager: SettingsManagerClass
}; 