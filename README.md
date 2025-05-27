# Godville Status GNOME Extension

A GNOME Shell extension that displays your Godville game character status in the top panel.

## Features

- Shows current health status in the panel with color-coded health bar
- Displays detailed information in a dropdown menu:
  - Health points with visual health bar
  - Character level and experience
  - Current quest and progress
  - Gold amount
  - Pet information
  - Last diary entry
  - Last third eye entry
  - Detailed statistics
- Auto-refreshes every 5 minutes
- Manual refresh option
- Quick access to Godville website
- Settings panel for easy configuration
- Localization support (currently includes Russian)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/godville-gnome.git
cd godville-gnome
```

2. Copy the extension to your GNOME extensions directory:
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/godville-status@faizov
cp -r * ~/.local/share/gnome-shell/extensions/godville-status@faizov/
```

3. Restart GNOME Shell:
   - Press Alt+F2
   - Type 'r' and press Enter

4. Enable the extension using GNOME Extensions app or:
```bash
gnome-extensions enable godville-status@faizov
```

## Configuration

The extension can be configured through the GNOME Extensions settings panel:

1. Open GNOME Extensions
2. Find "Godville Status" in the list
3. Click the settings icon (gear)
4. Enter your Godville credentials:
   - Godname
   - API Key

You can get your API key from your Godville account settings.

## Requirements

- GNOME Shell 42 or later
- Internet connection for API access
- Godville account with API access enabled

## Development

The extension is built using:
- GNOME Shell JavaScript API
- GObject introspection
- GJS (GNOME JavaScript)
- GTK+ 4

## License

MIT License 