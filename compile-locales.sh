#!/bin/bash

# Create locale directory if it doesn't exist
mkdir -p locale/ru/LC_MESSAGES

# Compile Russian translation
msgfmt po/ru.po -o locale/ru/LC_MESSAGES/godville-status.mo

echo "Locales compiled successfully!" 