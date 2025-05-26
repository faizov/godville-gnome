const Main = imports.ui.main;

const NotificationServiceClass = class NotificationService {
    showNotification(title, message) {
        Main.notify(title, message);
    }

    destroy() {
        // Ничего не нужно делать
    }
};

// Export the class
var NotificationService = NotificationServiceClass; 