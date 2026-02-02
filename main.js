const { Plugin, TextFileView, setIcon } = require('obsidian');
const { EditorView, Decoration, ViewPlugin } = require('@codemirror/view');
const { EditorState } = require('@codemirror/state');
const { RangeSetBuilder } = require('@codemirror/state');

// Parse CSV line, respecting quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  
  return fields;
}

// Rainbow highlighting view plugin
const rainbowCSVField = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = this.buildDecorations(view);
  }
  
  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }
  
  buildDecorations(view) {
    const builder = new RangeSetBuilder();
    
    for (let { from, to } of view.visibleRanges) {
      for (let pos = from; pos <= to;) {
        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;
        
        const fields = parseCSVLine(lineText);
        let offset = line.from;
        
        fields.forEach((field, index) => {
          const colorClass = `csv-col-${index % 8}`;
          const deco = Decoration.mark({ class: colorClass });
          builder.add(offset, offset + field.length, deco);
          offset += field.length + 1;
        });
        
        pos = line.to + 1;
      }
    }
    
    return builder.finish();
  }
}, {
  decorations: v => v.decorations
});

// Custom CSV file view with CodeMirror editor
class CSVFileView extends TextFileView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.previewMode = false;
    this.editorView = null;
    this.sortState = { column: null, direction: null };
  }
  
  getViewType() {
    return 'csv-view';
  }
  
  getDisplayText() {
    return this.file?.basename || 'CSV';
  }
  
  async onOpen() {
    const header = this.containerEl.querySelector('.view-header');
    if (header) {
      const actions = header.querySelector('.view-actions');
      if (actions) {
        // Create button and insert at the beginning (left side)
        this.toggleButton = document.createElement('a');
        this.toggleButton.addClass('view-action');
        this.toggleButton.setAttribute('aria-label', 'Toggle preview');
        
        // Insert as first child (left side)
        actions.insertBefore(this.toggleButton, actions.firstChild);
        
        this.updateToggleButton();
        
        this.toggleButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.previewMode = !this.previewMode;
          // Reset sort state when switching to edit mode
          if (!this.previewMode) {
            this.sortState = { column: null, direction: null };
          }
          this.updateToggleButton();
          this.render();
        });
      }
    }
  }
  
  updateToggleButton() {
    if (!this.toggleButton) return;
    
    this.toggleButton.empty();
    
    if (this.previewMode) {
      setIcon(this.toggleButton, 'pencil');
      this.toggleButton.setAttribute('aria-label', 'Edit');
    } else {
      setIcon(this.toggleButton, 'book-open');
      this.toggleButton.setAttribute('aria-label', 'Preview');
    }
  }
  
  async onLoadFile(file) {
    await super.onLoadFile(file);
    this.render();
  }
  
  getViewData() {
    if (this.editorView) {
      return this.editorView.state.doc.toString();
    }
    return this.data || '';
  }
  
  setViewData(data, clear) {
    this.data = data;
    if (!clear) {
      this.render();
    }
  }
  
  clear() {
    this.data = '';
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
    if (this.contentEl) {
      this.contentEl.empty();
    }
  }
  
  sortTable(columnIndex) {
    // Toggle sort direction
    if (this.sortState.column === columnIndex) {
      if (this.sortState.direction === 'asc') {
        this.sortState.direction = 'desc';
      } else if (this.sortState.direction === 'desc') {
        // Third click: remove sort
        this.sortState = { column: null, direction: null };
      } else {
        this.sortState.direction = 'asc';
      }
    } else {
      this.sortState = { column: columnIndex, direction: 'asc' };
    }
    
    this.render();
  }
  
  render() {
    if (!this.contentEl) return;
    
    this.contentEl.empty();
    
    const content = this.data || '';
    
    if (this.previewMode) {
      // Preview mode - render table
      if (!content.trim()) {
        this.contentEl.createEl('div', { text: 'Empty CSV', cls: 'csv-empty' });
        return;
      }
      
      const lines = content.trim().split('\n').filter(l => l.length > 0);
      if (lines.length === 0) return;
      
      const container = this.contentEl.createEl('div', { cls: 'csv-table-container' });
      const table = container.createEl('table', { cls: 'csv-table' });
      
      // Parse all data
      const headers = parseCSVLine(lines[0]);
      const dataRows = [];
      for (let i = 1; i < lines.length; i++) {
        dataRows.push(parseCSVLine(lines[i]));
      }
      
      // Sort data if needed
      if (this.sortState.column !== null && this.sortState.direction) {
        const colIndex = this.sortState.column;
        dataRows.sort((a, b) => {
          const aVal = (a[colIndex] || '').replace(/^"|"$/g, '').trim();
          const bVal = (b[colIndex] || '').replace(/^"|"$/g, '').trim();
          
          // Try numeric comparison first
          const aNum = parseFloat(aVal);
          const bNum = parseFloat(bVal);
          
          let comparison;
          if (!isNaN(aNum) && !isNaN(bNum)) {
            comparison = aNum - bNum;
          } else {
            comparison = aVal.localeCompare(bVal);
          }
          
          return this.sortState.direction === 'asc' ? comparison : -comparison;
        });
      }
      
      // Header row
      const thead = table.createEl('thead');
      const headerRow = thead.createEl('tr');
      headers.forEach((h, index) => {
        const th = headerRow.createEl('th', { 
          text: h.replace(/^"|"$/g, '').trim(),
          cls: 'csv-sortable-header'
        });
        
        // Add sort indicator if this column is sorted
        if (this.sortState.column === index && this.sortState.direction) {
          const indicator = th.createSpan({ cls: 'csv-sort-indicator' });
          indicator.textContent = this.sortState.direction === 'asc' ? ' ▲' : ' ▼';
        }
        
        // Add click handler
        th.addEventListener('click', () => this.sortTable(index));
        th.style.cursor = 'pointer';
      });
      
      // Data rows
      const tbody = table.createEl('tbody');
      dataRows.forEach(fields => {
        const row = tbody.createEl('tr');
        fields.forEach(f => {
          row.createEl('td', { text: f.replace(/^"|"$/g, '').trim() });
        });
      });
      
      // Destroy editor if it exists
      if (this.editorView) {
        this.editorView.destroy();
        this.editorView = null;
      }
    } else {
      // Edit mode - create CodeMirror editor with rainbow highlighting
      const editorDiv = this.contentEl.createEl('div', { cls: 'csv-editor-container' });
      
      const startState = EditorState.create({
        doc: content,
        extensions: [
          rainbowCSVField,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.data = update.state.doc.toString();
              this.requestSave();
            }
          }),
          EditorView.lineWrapping,
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '14px'
            },
            '.cm-scroller': {
              fontFamily: 'monospace',
              overflow: 'auto'
            },
            '.cm-content': {
              padding: '1em'
            }
          })
        ]
      });
      
      this.editorView = new EditorView({
        state: startState,
        parent: editorDiv
      });
      
      editorDiv.style.height = '100%';
    }
  }
}

module.exports = class RainbowCSVPlugin extends Plugin {
  async onload() {
    console.log('Rainbow CSV v0.1.14 loaded');
    
    // Register custom view for CSV files
    this.registerView('csv-view', (leaf) => new CSVFileView(leaf, this));
    
    // Register CSV extension
    this.registerExtensions(['csv'], 'csv-view');
  }
  
  onunload() {
    console.log('Rainbow CSV unloaded');
  }
};
