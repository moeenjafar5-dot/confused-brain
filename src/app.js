 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/app.js b/src/app.js
new file mode 100644
index 0000000000000000000000000000000000000000..901ed8793967f256334c29c1321a7c32a3f4ca5c
--- /dev/null
+++ b/src/app.js
@@ -0,0 +1,232 @@
+const STORAGE_KEY = 'confused-brain-lite-notes';
+const categories = ['All', 'Favorites', 'Coding', 'Excel', 'BI', 'SQL', 'Power BI', 'Python', 'Career'];
+const editableCategories = categories.filter((category) => !['All', 'Favorites'].includes(category));
+
+let notes = loadNotes();
+let activeId = notes[0]?.id || null;
+let currentFilter = 'All';
+
+const elements = {
+  categoryList: document.querySelector('#category-list'),
+  category: document.querySelector('#category'),
+  content: document.querySelector('#content'),
+  deleteNote: document.querySelector('#delete-note'),
+  example: document.querySelector('#example'),
+  exportNotes: document.querySelector('#export-notes'),
+  favorite: document.querySelector('#favorite'),
+  form: document.querySelector('#note-form'),
+  importNotes: document.querySelector('#import-notes'),
+  message: document.querySelector('#message'),
+  newNote: document.querySelector('#new-note'),
+  noteCount: document.querySelector('#note-count'),
+  notesList: document.querySelector('#notes-list'),
+  search: document.querySelector('#search'),
+  tags: document.querySelector('#tags'),
+  title: document.querySelector('#title'),
+};
+
+function loadNotes() {
+  const saved = localStorage.getItem(STORAGE_KEY);
+  if (!saved) return getStarterNotes();
+
+  try {
+    return JSON.parse(saved);
+  } catch {
+    return getStarterNotes();
+  }
+}
+
+function saveNotes() {
+  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
+}
+
+function getStarterNotes() {
+  return [
+    {
+      id: crypto.randomUUID(),
+      title: 'Example: XLOOKUP in Excel',
+      category: 'Excel',
+      tags: ['formula', 'lookup'],
+      content: 'XLOOKUP finds a value in one column and returns a matching value from another column.',
+      example: 'Use it when you have a product ID and need to fetch the product price from a separate table.',
+      favorite: true,
+      updatedAt: new Date().toISOString(),
+    },
+  ];
+}
+
+function renderCategoryControls() {
+  elements.categoryList.innerHTML = categories
+    .map((category) => `<button class="chip ${currentFilter === category ? 'active' : ''}" data-filter="${category}">${category}</button>`)
+    .join('');
+
+  elements.category.innerHTML = editableCategories
+    .map((category) => `<option value="${category}">${category}</option>`)
+    .join('');
+}
+
+function getFilteredNotes() {
+  const searchText = elements.search.value.trim().toLowerCase();
+
+  return notes.filter((note) => {
+    const matchesFilter = currentFilter === 'All' || (currentFilter === 'Favorites' ? note.favorite : note.category === currentFilter);
+    const searchableText = `${note.title} ${note.category} ${note.tags.join(' ')} ${note.content} ${note.example}`.toLowerCase();
+    return matchesFilter && searchableText.includes(searchText);
+  });
+}
+
+function renderNotesList() {
+  const filteredNotes = getFilteredNotes();
+  elements.noteCount.textContent = `${filteredNotes.length} ${filteredNotes.length === 1 ? 'note' : 'notes'}`;
+
+  if (!filteredNotes.length) {
+    elements.notesList.innerHTML = '<p class="empty-state">No notes found. Create a new one or change your search.</p>';
+    return;
+  }
+
+  elements.notesList.innerHTML = filteredNotes
+    .map((note) => `
+      <button class="note-card ${note.id === activeId ? 'selected' : ''}" data-note-id="${note.id}">
+        <strong>${note.favorite ? '⭐ ' : ''}${escapeHtml(note.title)}</strong>
+        <span>${escapeHtml(note.category)} · ${escapeHtml(note.tags.join(', ') || 'No tags')}</span>
+      </button>
+    `)
+    .join('');
+}
+
+function renderEditor() {
+  const activeNote = notes.find((note) => note.id === activeId);
+  elements.deleteNote.disabled = !activeNote;
+
+  if (!activeNote) {
+    elements.form.reset();
+    elements.category.value = 'Coding';
+    return;
+  }
+
+  elements.title.value = activeNote.title;
+  elements.category.value = activeNote.category;
+  elements.tags.value = activeNote.tags.join(', ');
+  elements.content.value = activeNote.content;
+  elements.example.value = activeNote.example;
+  elements.favorite.checked = activeNote.favorite;
+}
+
+function render() {
+  renderCategoryControls();
+  renderNotesList();
+  renderEditor();
+}
+
+function showMessage(text) {
+  elements.message.textContent = text;
+  elements.message.hidden = false;
+  window.setTimeout(() => {
+    elements.message.hidden = true;
+  }, 2500);
+}
+
+function createOrUpdateNote(event) {
+  event.preventDefault();
+
+  const note = {
+    id: activeId || crypto.randomUUID(),
+    title: elements.title.value.trim(),
+    category: elements.category.value,
+    tags: elements.tags.value.split(',').map((tag) => tag.trim()).filter(Boolean),
+    content: elements.content.value.trim(),
+    example: elements.example.value.trim(),
+    favorite: elements.favorite.checked,
+    updatedAt: new Date().toISOString(),
+  };
+
+  if (!note.title || !note.content) {
+    showMessage('Please add a title and key concept before saving.');
+    return;
+  }
+
+  const existingIndex = notes.findIndex((item) => item.id === note.id);
+  if (existingIndex >= 0) notes[existingIndex] = note;
+  else notes.unshift(note);
+
+  activeId = note.id;
+  saveNotes();
+  render();
+  showMessage('Saved in this browser. Export a backup to move it to another device.');
+}
+
+function startNewNote() {
+  activeId = null;
+  elements.form.reset();
+  elements.category.value = 'Coding';
+  elements.title.focus();
+  renderNotesList();
+}
+
+function deleteActiveNote() {
+  if (!activeId) return;
+  notes = notes.filter((note) => note.id !== activeId);
+  activeId = notes[0]?.id || null;
+  saveNotes();
+  render();
+  showMessage('Note deleted.');
+}
+
+function exportNotes() {
+  const backup = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
+  const link = document.createElement('a');
+  link.href = URL.createObjectURL(backup);
+  link.download = `confused-brain-backup-${new Date().toISOString().slice(0, 10)}.json`;
+  link.click();
+  URL.revokeObjectURL(link.href);
+}
+
+function importNotes(event) {
+  const file = event.target.files[0];
+  if (!file) return;
+
+  const reader = new FileReader();
+  reader.onload = () => {
+    try {
+      const importedNotes = JSON.parse(reader.result);
+      if (!Array.isArray(importedNotes)) throw new Error('Invalid backup');
+      notes = importedNotes;
+      activeId = notes[0]?.id || null;
+      saveNotes();
+      render();
+      showMessage('Backup imported successfully.');
+    } catch {
+      showMessage('Could not import this file. Please choose a Confused Brain backup.');
+    }
+  };
+  reader.readAsText(file);
+}
+
+function escapeHtml(value) {
+  return String(value)
+    .replaceAll('&', '&amp;')
+    .replaceAll('<', '&lt;')
+    .replaceAll('>', '&gt;')
+    .replaceAll('"', '&quot;')
+    .replaceAll("'", '&#039;');
+}
+
+elements.categoryList.addEventListener('click', (event) => {
+  if (!event.target.matches('[data-filter]')) return;
+  currentFilter = event.target.dataset.filter;
+  render();
+});
+elements.notesList.addEventListener('click', (event) => {
+  const noteButton = event.target.closest('[data-note-id]');
+  if (!noteButton) return;
+  activeId = noteButton.dataset.noteId;
+  render();
+});
+elements.search.addEventListener('input', renderNotesList);
+elements.form.addEventListener('submit', createOrUpdateNote);
+elements.newNote.addEventListener('click', startNewNote);
+elements.deleteNote.addEventListener('click', deleteActiveNote);
+elements.exportNotes.addEventListener('click', exportNotes);
+elements.importNotes.addEventListener('change', importNotes);
+
+render();
 
EOF
)
