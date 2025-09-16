// pages/products/TextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function TextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your content...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      // Get content as Markdown
      const markdown = editor.getHTML();
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-neutral-700 rounded-lg bg-neutral-950 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-neutral-700 bg-neutral-900 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm font-bold ${
            editor.isActive('bold') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm italic ${
            editor.isActive('italic') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          I
        </button>
        
        <div className="w-px bg-neutral-700 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 1 }) ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 2 }) ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 3 }) ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          H3
        </button>
        
        <div className="w-px bg-neutral-700 mx-1" />
        
        <button
          onClick={() => {
            // Check if we need to split the paragraph first
            if (!editor.isActive('bulletList') && editor.state.selection.$from.parent.textContent) {
              editor.chain()
                .focus()
                .splitBlock()
                .toggleBulletList()
                .run();
            } else {
              editor.chain().focus().toggleBulletList().run();
            }
          }}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('bulletList') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          • List
        </button>
        <button
          onClick={() => {
            // Check if we need to split the paragraph first
            if (!editor.isActive('orderedList') && editor.state.selection.$from.parent.textContent) {
              editor.chain()
                .focus()
                .splitBlock()
                .toggleOrderedList()
                .run();
            } else {
              editor.chain().focus().toggleOrderedList().run();
            }
          }}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('orderedList') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          1. List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('blockquote') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          " Quote
        </button>
        
        <div className="w-px bg-neutral-700 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-3 py-1 rounded text-sm text-neutral-400 hover:bg-neutral-800"
        >
          — Rule
        </button>
        
        <div className="w-px bg-neutral-700 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1 rounded text-sm text-neutral-400 hover:bg-neutral-800 disabled:opacity-50"
        >
          ↶ Undo
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1 rounded text-sm text-neutral-400 hover:bg-neutral-800 disabled:opacity-50"
        >
          ↷ Redo
        </button>
      </div>
      
      {/* Editor */}
      <EditorContent editor={editor} />
      
      {/* Word count */}
      <div className="border-t border-neutral-800 px-4 py-2 text-xs text-neutral-500">
        {editor.storage.characterCount?.words() || 0} words
      </div>
    </div>
  );
}