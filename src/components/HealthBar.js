const { GObject, St } = imports.gi;

const HealthBarClass = GObject.registerClass(
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

// Export the class
var HealthBar = HealthBarClass; 