# Rainbow CSV for Obsidian

Color-code CSV columns for better readability, with a clean table preview mode.

## Features

- **Rainbow syntax highlighting** - Each CSV column gets its own color in edit mode
- **Table preview** - Toggle between edit and table view with one click
- **Sortable columns** - Click any column header to sort chronologically, numerically, or alphabetically
- **Smart date sorting** - Recognizes multiple date formats (ISO, US, month names) for proper chronological ordering
- **Theme-aware colors** - Different color palettes for light and dark themes
- **Mobile compatible** - Works seamlessly on desktop, iPad, and iPhone
- **Smart parsing** - Correctly handles commas inside quoted fields

## Usage

1. Open any `.csv` file in your vault
2. **Edit mode** - See rainbow-colored columns for easy reading
3. Click the **book icon** to switch to **table preview**
4. Click the **pencil icon** to return to edit mode

## Colors

The plugin uses 8 colors that cycle through columns:

**Dark theme:** Cyan, Orange, Purple, Yellow, Light Blue, Blue, Green, Red  
**Light theme:** Darker, more saturated versions for better readability on white backgrounds

## Installation

### Manual Installation

1. Download the latest release
2. Extract files to `<vault>/.obsidian/plugins/rainbow-csv/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

## Development

Built with CodeMirror 6 for proper syntax highlighting and Obsidian's native APIs for seamless integration.

## License

MIT

## Author

Ru ([@rubyruth](https://x.com/rubyruth))  
[ruthmade.com](https://ruthmade.com)
