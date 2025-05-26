# Godville Status GNOME Extension

A GNOME Shell extension that displays your Godville game character status in the top panel.

![Screenshot](screenshots/main.png)

## Features

- Shows current hero status in the panel:
  - Health points
  - Godpower
  - Current quest
  - Last diary entry
- Displays detailed information in a dropdown menu:
  - Health bar with color indicators
  - Experience and level
  - Gold amount
  - Arena statistics
  - Current quest and progress
  - Pet information
  - Clan status
  - Alignment
  - Boss information
  - Inventory status
  - Materials count
  - Distance and town
- Auto-refreshes every 5 minutes
- Manual refresh option
- Customizable display options
- Support for multiple languages

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/faizov/godville-gnome.git
cd godville-gnome
```

2. Run the installation script:
```bash
chmod +x install.sh
./install.sh
```

3. Restart GNOME Shell:
   - Press Alt+F2
   - Type 'r' and press Enter

4. Enable the extension using GNOME Extensions app or:
```bash
gnome-extensions enable godville-status@faizov
```

### From GNOME Extensions Website

1. Visit [GNOME Extensions](https://extensions.gnome.org)
2. Search for "Godville Status"
3. Click "Install"
4. Restart GNOME Shell (Alt+F2, type 'r', press Enter)

## Configuration

The extension can be configured through the GNOME Extensions app:

### Basic Settings
- **Godname**: Your Godville god name
- **API Key**: Your Godville API key (get it from your profile page)
- **Update Interval**: Time between automatic updates (in seconds)
- **Extension Position**: Position in the panel (left, center, right)

### Display Settings
- **Show in Status Bar**:
  - Health points
  - Godpower
  - Current quest
  - Last diary entry
- **Show in Menu**:
  - Health bar
  - Experience
  - Gold
  - Arena
  - Quest
  - Pet
  - Clan
  - Alignment
  - Boss
  - Inventory
  - Materials
  - Distance

### Order Settings
Customize the order of displayed information in the menu.

## Requirements

- GNOME Shell 42 or later
- Internet connection for API access
- Godville account and API key

## Troubleshooting

If the extension doesn't work:
1. Make sure you've entered the correct godname and API key
2. Check your internet connection
3. Try restarting GNOME Shell
4. Check the logs: `journalctl -f -n 50 | grep -i "godville"`
