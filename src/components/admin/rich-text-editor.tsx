"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import { useEffect, useState } from "react"
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Link2, Undo, Redo, Quote, Check, Trash2,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarButton({
  active, onClick, title, children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
        active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ value, onChange, placeholder = "Skriv innholdet her..." }: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline" } }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Keep editor in sync if value is replaced externally (e.g., loading for edit)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) {
    return <div className="min-h-[260px] rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] animate-pulse" />
  }

  const openLinkEditor = () => {
    const previous = editor.getAttributes("link").href as string | undefined
    setLinkUrl(previous ?? "https://")
    setLinkOpen((v) => !v)
  }

  const applyLink = () => {
    const url = linkUrl.trim()
    if (!url || url === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
    } else {
      // Uten protokoll blir lenken relativ — legg på https:// automatisk.
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
    }
    setLinkOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    setLinkOpen(false)
  }

  return (
    <div className="relative rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-visible focus-within:ring-2 focus-within:ring-zinc-900 focus-within:border-transparent">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-zinc-100 bg-zinc-50/50 flex-wrap">
        <ToolbarButton title="Overskrift" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Underoverskrift" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolbarButton>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <ToolbarButton title="Fet" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Kursiv" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarButton>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <ToolbarButton title="Punktliste" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Nummerert liste" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Sitat" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Lenke" active={editor.isActive("link") || linkOpen} onClick={openLinkEditor}><Link2 className="w-4 h-4" /></ToolbarButton>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <ToolbarButton title="Angre" onClick={() => editor.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Gjør om" onClick={() => editor.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolbarButton>
      </div>

      {linkOpen && (
        <div className="absolute left-2 top-11 z-20 flex w-72 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink() }
              if (e.key === "Escape") setLinkOpen(false)
            }}
            placeholder="https://…"
            aria-label="Lenke-URL"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs transition-colors focus:border-[var(--brand-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15"
          />
          <button type="button" onClick={applyLink} title="Sett lenke" className="rounded-lg bg-zinc-900 p-1.5 text-white hover:bg-zinc-700">
            <Check className="h-3.5 w-3.5" />
          </button>
          {editor.isActive("link") && (
            <button type="button" onClick={removeLink} title="Fjern lenke" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <EditorContent editor={editor} data-placeholder={placeholder} />
    </div>
  )
}
