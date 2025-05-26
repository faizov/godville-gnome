#!/bin/bash

# Get the extension directory
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/godville-status@faizov"

# Remove old installation if it exists
if [ -d "$EXT_DIR" ]; then
    echo "Removing old installation..."
    rm -rf "$EXT_DIR"
fi

# Create extension directory
echo "Creating extension directory..."
mkdir -p "$EXT_DIR"
mkdir -p "$EXT_DIR/schemas"
mkdir -p "$EXT_DIR/src/components"
mkdir -p "$EXT_DIR/src/services"
mkdir -p "$EXT_DIR/src/utils"

# Copy files
echo "Copying files..."
cp metadata.json "$EXT_DIR/"
cp extension.js "$EXT_DIR/"
cp convenience.js "$EXT_DIR/"
cp stylesheet.css "$EXT_DIR/"
cp prefs.js "$EXT_DIR/"
cp prefs.ui "$EXT_DIR/"
cp settings.js "$EXT_DIR/"
cp -r src/* "$EXT_DIR/src/"
cp schemas/org.gnome.shell.extensions.godville-status.gschema.xml "$EXT_DIR/schemas/"

# Compile and install schema
echo "Compiling schema..."
glib-compile-schemas "$EXT_DIR/schemas/"

# Compile translations
echo "Compiling translations..."
./compile-translations.sh

# Copy compiled translations
echo "Copying translations..."
mkdir -p "$EXT_DIR/locale"
cp -r locale/* "$EXT_DIR/locale/"

echo "Installation complete!"
echo "Please restart GNOME Shell (Alt+F2, type 'r', press Enter)" 