const { Soup } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { SettingsManager } = Me.imports.src.services.SettingsManager;

const GodvilleAPIClass = class {
    constructor() {
        this._settings = new SettingsManager();
    }

    async fetchData() {
        const godname = this._settings.getString('godname');
        const apiKey = this._settings.getString('api-key');
        const url = `https://godville.net/gods/api/${encodeURIComponent(godname)}/${apiKey}`;

        log('[Godville Status] Fetching data from: ' + url);

        const session = new Soup.Session();
        const message = new Soup.Message({
            method: 'GET',
            uri: new Soup.URI(url)
        });

        return new Promise((resolve, reject) => {
            session.queue_message(message, (session, message) => {
                if (message.status_code === 200) {
                    try {
                        const responseBody = message.response_body.data;
                        const jsonStr = responseBody.toString();
                        const jsonData = JSON.parse(jsonStr);
                        resolve(jsonData);
                    } catch (e) {
                        log(`[Godville Status] Error processing response: ${e.message}`);
                        reject(e);
                    }
                } else {
                    reject(new Error(`HTTP ${message.status_code}`));
                }
            });
        });
    }
};

// Export the class
var GodvilleAPI = GodvilleAPIClass; 