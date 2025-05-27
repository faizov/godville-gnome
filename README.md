# Godville Status GNOME Extension

A GNOME Shell extension that displays your Godville game character status in the top panel.

## Features

- Shows current health status in the panel
- Displays detailed information in a dropdown menu:
  - Health points
  - Character level
  - Current quest
  - Gold amount
  - Pet information
- Auto-refreshes every 5 minutes
- Manual refresh option

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/godville-gnome.git
cd godville-gnome
```

2. Copy the extension to your GNOME extensions directory:
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/godville-status@faizov.dev.com
cp -r * ~/.local/share/gnome-shell/extensions/godville-status@faizov.dev.com/
```

3. Restart GNOME Shell:
   - Press Alt+F2
   - Type 'r' and press Enter

4. Enable the extension using GNOME Extensions app or:
```bash
gnome-extensions enable godville-status@faizov.dev.com
```

## Configuration

The extension is currently configured with the following settings:
- Godname: 
- API Key: 

To change these settings, edit the `extension.js` file and modify the values in the `_fetchData()` method.

## Requirements

- GNOME Shell 42
- Internet connection for API access

## License

MIT License 