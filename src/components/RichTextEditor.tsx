'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Code,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-[280px] p-4 text-base focus:outline-none leading-relaxed prose prose-slate dark:prose-invert max-w-none font-sans',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep editor content in sync when loaded from external source (e.g. edit mode)
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="h-64 rounded-xl border border-[var(--border-light)] bg-[var(--card-bg)] animate-pulse p-4 text-xs text-[var(--text-muted)]">
        Loading rich-text editor...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-bg)] overflow-hidden shadow-sm transition-colors focus-within:border-[#dc2626]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[var(--bg-secondary)] border-b border-[var(--border-light)] text-[var(--text-secondary)]">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
            editor.isActive('bold') ? 'bg-red-100 text-[#dc2626] dark:bg-red-950/60' : ''
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
            editor.isActive('italic') ? 'bg-red-100 text-[#dc2626] dark:bg-red-950/60' : ''
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[var(--border-light)] mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-red-100 text-[#dc2626] dark:bg-red-950/60'
              : ''
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-red-100 text-[#dc2626] dark:bg-red-950/60'
              : ''
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[var(--border-light)] mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
            editor.isActive('bulletList') ? 'bg-red-100 text-[#dc2626] dark:bg-red-950/60' : ''
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
            editor.isActive('orderedList') ? 'bg-red-100 text-[#dc2626] dark:bg-red-950/60' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
            editor.isActive('blockquote') ? 'bg-red-100 text-[#dc2626] dark:bg-red-950/60' : ''
          }`}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
            editor.isActive('code') ? 'bg-red-100 text-[#dc2626] dark:bg-red-950/60' : ''
          }`}
          title="Code snippet"
        >
          <Code className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[var(--border-light)] mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
}
