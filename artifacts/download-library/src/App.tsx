import React, { useMemo, useState, useRef, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  Download,
  Search,
  Menu,
  X,
  Heart,
  Star,
  Check,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpRight,
  ShieldCheck,
  BadgeCheck,
  LayoutGrid,
  List,
  HelpCircle,
  Upload,
  FileUp,
  Trash2,
} from 'lucide-react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

type Category = 'Design' | 'Templates' | 'Audio' | 'Video' | 'Code' | 'Documents';

type FileRecord = {
  id: string;
  title: string;
  category: Category;
  author: string;
  initials: string;
  size: string;
  downloads: string;
  rating: number;
  reviews: number;
  tags: string[];
  description: string;
  art: string;
  artLabel: string;
  updated: string;
  verified: boolean;
};

const ART_THEMES = [
  { id: 'art-cobalt', name: 'Cobalt', hex: '#1d4ed8' },
  { id: 'art-amber', name: 'Amber', hex: '#b45309' },
  { id: 'art-plum', name: 'Plum', hex: '#7e22ce' },
  { id: 'art-mint', name: 'Mint', hex: '#047857' },
  { id: 'art-lilac', name: 'Lilac', hex: '#6d28d9' },
  { id: 'art-teal', name: 'Teal', hex: '#0f766e' },
  { id: 'art-coral', name: 'Coral', hex: '#b91c1c' },
  { id: 'art-slate', name: 'Slate', hex: '#475569' },
] as const;

const CATEGORIES: Category[] = ['Design', 'Templates', 'Audio', 'Video', 'Code', 'Documents'];

const defaultFiles: FileRecord[] = [
  { id: 'signal-kit', title: 'Signal / Editorial Kit', category: 'Design', author: 'Mara Voss', initials: 'MV', size: '42.8 MB', downloads: '2.4k', rating: 4.9, reviews: 86, tags: ['figma', 'editorial', 'system'], description: 'A sharp, flexible editorial system for teams that publish often.', art: 'art-cobalt', artLabel: 'SIGNAL', updated: '2h ago', verified: true },
  { id: 'night-shift', title: 'Night Shift — LUT Pack', category: 'Video', author: 'Milo August', initials: 'MA', size: '1.2 GB', downloads: '8.1k', rating: 4.8, reviews: 143, tags: ['luts', 'cinema', 'dark'], description: 'Twenty-four restrained grades for sodium streets and blue hours.', art: 'art-amber', artLabel: 'NIGHT\nSHIFT', updated: '5h ago', verified: true },
  { id: 'quiet-hours', title: 'Quiet Hours — Loop Library', category: 'Audio', author: 'Nia Rhee', initials: 'NR', size: '318 MB', downloads: '1.7k', rating: 4.7, reviews: 51, tags: ['ambient', 'loops', 'wav'], description: 'Textural loops for late work, patient interfaces, and long walks.', art: 'art-plum', artLabel: 'QUIET\nHOURS', updated: '1d ago', verified: false },
  { id: 'field-notes', title: 'Field Notes / Research Docs', category: 'Documents', author: 'Owen Park', initials: 'OP', size: '8.6 MB', downloads: '934', rating: 4.6, reviews: 29, tags: ['research', 'notion', 'pdf'], description: 'A considered set of note-taking structures for messy early thinking.', art: 'art-mint', artLabel: 'FIELD\nNOTES', updated: '1d ago', verified: true },
  { id: 'mono-objects', title: 'Mono Objects — 3D Set', category: 'Design', author: 'Keiko Tan', initials: 'KT', size: '84 MB', downloads: '3.2k', rating: 4.9, reviews: 74, tags: ['blender', 'objects', '3d'], description: 'Thirty-six low-poly objects with a quiet, tactile point of view.', art: 'art-lilac', artLabel: 'MONO\nOBJECTS', updated: '2d ago', verified: true },
  { id: 'starter-stack', title: 'Starter Stack / Astro', category: 'Code', author: 'Jules Martin', initials: 'JM', size: '3.4 MB', downloads: '5.8k', rating: 4.8, reviews: 112, tags: ['astro', 'starter', 'tailwind'], description: 'An opinionated starting point for small, fast sites that last.', art: 'art-teal', artLabel: 'STARTER\nSTACK', updated: '3d ago', verified: true },
  { id: 'soft-edges', title: 'Soft Edges — Type Specimen', category: 'Templates', author: 'Ada Kline', initials: 'AK', size: '18.1 MB', downloads: '1.1k', rating: 4.5, reviews: 34, tags: ['type', 'print', 'indesign'], description: 'A print-ready specimen template for making typography the story.', art: 'art-coral', artLabel: 'SOFT\nEDGES', updated: '4d ago', verified: false },
  { id: 'archive-index', title: 'Archive Index / CSV Toolkit', category: 'Documents', author: 'Theo Bell', initials: 'TB', size: '2.8 MB', downloads: '764', rating: 4.4, reviews: 18, tags: ['csv', 'data', 'workflow'], description: 'Small utilities for keeping personal collections legible and useful.', art: 'art-slate', artLabel: 'ARCHIVE\nINDEX', updated: '5d ago', verified: true },
];

const uploadedBlobs = new Map<string, { blob: Blob; fileName: string }>();

const queryClient = new QueryClient();

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function inferCategory(fileName: string): Category {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['fig', 'psd', 'ai', 'sketch', 'svg', 'blend', 'fbx', 'obj', 'png', 'jpg', 'jpeg'].includes(ext)) return 'Design';
  if (['mp4', 'mov', 'avi', 'mkv', 'cube', 'look', 'webm'].includes(ext)) return 'Video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'mid', 'aiff'].includes(ext)) return 'Audio';
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'rs', 'go', 'html', 'css', 'zip', 'tar', 'gz', 'sh', 'sql'].includes(ext)) return 'Code';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx', 'rtf', 'epub'].includes(ext)) return 'Documents';
  return 'Templates';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'ME';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function downloadFile(file: FileRecord) {
  const custom = uploadedBlobs.get(file.id);
  if (custom) {
    const url = URL.createObjectURL(custom.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = custom.fileName || `${file.title}.bin`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const content = `VERTEX ARCHIVE NOTE\n\n${file.title}\nBy ${file.author}\n\n${file.description}\n\nTags: ${file.tags.join(', ')}\n`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${file.id}-vertex.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Sidebar({ active, onOpenUpload }: { active: string; onOpenUpload: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <aside className="sidebar hidden w-[248px] shrink-0 border-r border-white/[.07] px-4 py-5 lg:flex lg:flex-col justify-between">
      <div>
        <div className="mb-6 flex items-center gap-3 px-3">
          <img src="/vertex-logo.png" alt="Vertex logo" className="h-9 w-9 rounded-xl object-cover shadow-[0_0_0_5px_rgba(255,255,255,.08)]" />
          <div>
            <div className="font-display text-[19px] font-bold tracking-[-.05em] text-[#f1f2e9]">Vertex</div>
            <div className="font-mono-ui text-[8px] uppercase tracking-[.18em] text-[#6e756f]">community archive</div>
          </div>
        </div>

        <button
          type="button"
          data-testid="button-sidebar-upload"
          onClick={onOpenUpload}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[12px] font-extrabold text-[#11151c] shadow-[0_0_20px_rgba(255,255,255,.08)] transition-all hover:bg-[#e6e8de] hover:shadow-[0_0_25px_rgba(255,255,255,.16)] active:scale-[0.98]"
        >
          <Upload size={15} strokeWidth={2.4} />
          <span>Upload file</span>
        </button>

        <div className="mb-3 px-3 eyebrow">Workspace</div>
        <nav className="space-y-1" aria-label="Primary navigation">
          <button
            type="button"
            data-testid="nav-browse-library"
            data-active={active === 'Browse library'}
            onClick={() => setLocation('/')}
            className="nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold text-[#8a928c]"
          >
            <LayoutGrid size={16} strokeWidth={1.8} />
            <span>Browse library</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}

function MobileDrawer({ onClose, onOpenUpload }: { onClose: () => void; onOpenUpload: () => void }) {
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button type="button" data-testid="button-close-drawer-backdrop" onClick={onClose} className="absolute inset-0 bg-black/60" aria-label="Close navigation"></button>
      <aside className="drawer-in sidebar relative flex h-full w-[280px] flex-col border-r border-white/[.08] px-4 py-5">
        <div className="mb-6 flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <img src="/vertex-logo.png" alt="Vertex logo" className="h-9 w-9 rounded-xl object-cover" />
            <div className="font-display text-[19px] font-bold tracking-[-.05em]">Vertex</div>
          </div>
          <button type="button" data-testid="button-close-drawer" onClick={onClose} className="icon-button rounded-md p-2 text-[#818982]" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          data-testid="button-mobile-drawer-upload"
          onClick={() => {
            onClose();
            onOpenUpload();
          }}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[12px] font-extrabold text-[#11151c]"
        >
          <Upload size={15} strokeWidth={2.4} />
          <span>Upload file</span>
        </button>

        <div className="mb-3 px-3 eyebrow">Workspace</div>
        <button type="button" data-testid="mobile-nav-browse" onClick={onClose} className="nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold text-[#cfd6cb]">
          <LayoutGrid size={16} /> Browse library
        </button>
      </aside>
    </div>
  );
}

function Preview({ file }: { file: FileRecord }) {
  return (
    <div className={`preview-art ${file.art} relative h-[150px] shrink-0 rounded-t-[11px]`}>
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <span className="rounded bg-black/35 px-2 py-1 font-mono-ui text-[8px] tracking-[.14em] text-white/90 backdrop-blur-sm">
            {file.category.toUpperCase()}
          </span>
          <ArrowUpRight size={14} className="text-white/60" />
        </div>
        <div className="whitespace-pre-line font-display text-[27px] font-bold leading-[.85] tracking-[-.08em] text-white/90">
          {file.artLabel}
        </div>
      </div>
    </div>
  );
}

function FileCard({
  file,
  favorite,
  onFavorite,
  onDownload,
  onDelete,
  index,
}: {
  file: FileRecord;
  favorite: boolean;
  onFavorite: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  index: number;
}) {
  const isCustom = file.id.startsWith('custom-');

  return (
    <article data-testid={`card-file-${file.id}`} className="file-card surface overflow-hidden rounded-xl" style={{ animationDelay: `${index * 65}ms` }}>
      <Preview file={file} />
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 data-testid={`text-file-title-${file.id}`} className="truncate text-[13px] font-extrabold tracking-[-.02em] text-[#e8ebe2]">
              {file.title}
            </h3>
            <p data-testid={`text-file-description-${file.id}`} className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#78817a]">
              {file.description}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isCustom && onDelete && (
              <button
                type="button"
                data-testid={`button-delete-${file.id}`}
                onClick={onDelete}
                aria-label={`Delete ${file.title}`}
                className="icon-button shrink-0 rounded-md p-1.5 text-[#657069] hover:text-[#f87171]"
                title="Remove file"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              data-testid={`button-favorite-${file.id}`}
              onClick={onFavorite}
              aria-label={favorite ? `Remove ${file.title} from saved files` : `Save ${file.title}`}
              className={`icon-button shrink-0 rounded-md p-1.5 ${favorite ? 'text-[#e58eae]' : 'text-[#657069]'}`}
            >
              {favorite ? <Heart size={15} fill="currentColor" /> : <Heart size={15} />}
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {file.tags.map((tag) => (
            <span key={tag} className="rounded bg-[#222a31] px-1.5 py-1 font-mono-ui text-[8px] text-[#84908a]">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between border-t border-white/[.06] pt-3">
          <div className="flex items-center gap-2">
            <div className="grid h-5 w-5 place-items-center rounded-full bg-[#39413b] text-[7px] font-bold text-[#b7c1ad]">
              {file.initials}
            </div>
            <span data-testid={`text-file-author-${file.id}`} className="text-[10px] font-semibold text-[#9aa29a]">
              {file.author}
            </span>
            {file.verified && <BadgeCheck size={12} className="text-[hsl(var(--primary))]" />}
          </div>
          <span className="font-mono-ui text-[9px] text-[#657069]">{file.updated}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9px] text-[#7e887f]">
            <span className="flex items-center gap-1 text-[#e2e4df]">
              <Star size={11} fill="currentColor" className="text-white" /> <b data-testid={`text-file-rating-${file.id}`}>{file.rating}</b>
            </span>
            <span>({file.reviews})</span>
            <span className="text-[#4f5952]">·</span>
            <span>{file.size}</span>
            <span className="text-[#4f5952]">·</span>
            <span>{file.downloads} DL</span>
          </div>
          <button
            type="button"
            data-testid={`button-download-${file.id}`}
            onClick={onDownload}
            className="download-button flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-[#171a1f]"
          >
            <Download size={12} /> Get file
          </button>
        </div>
      </div>
    </article>
  );
}

function UploadModal({
  isOpen,
  onClose,
  onUpload,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newFile: FileRecord, fileBlob?: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Design');
  const [author, setAuthor] = useState('You');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [art, setArt] = useState<string>('art-cobalt');
  const [artLabel, setArtLabel] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setTitle('');
      setCategory('Design');
      setAuthor('You');
      setDescription('');
      setTagsInput('');
      setArt('art-cobalt');
      setArtLabel('');
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setSelectedFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (!title) {
      setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
    const cat = inferCategory(file.name);
    setCategory(cat);
    if (!artLabel) {
      const words = baseName.toUpperCase().split(/\s+/).slice(0, 2);
      setArtLabel(words.join('\n') || 'CUSTOM\nFILE');
    }
    if (!description) {
      setDescription(`Uploaded ${file.name} (${formatBytes(file.size)}) to personal archive.`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    const newRecord: FileRecord = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      category,
      author: author.trim() || 'You',
      initials: getInitials(author || 'You'),
      size: selectedFile ? formatBytes(selectedFile.size) : '1.2 MB',
      downloads: '0',
      rating: 5.0,
      reviews: 1,
      tags: tags.length > 0 ? tags : ['custom', category.toLowerCase()],
      description: description.trim() || 'Added to personal library collection.',
      art,
      artLabel: artLabel.trim() || title.trim().toUpperCase().slice(0, 10),
      updated: 'Just now',
      verified: true,
    };

    onUpload(newRecord, selectedFile || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        data-testid="button-upload-modal-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close modal"
      />
      <div
        className="toast-in surface relative max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-white/[.12] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/[.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.08] text-white">
              <FileUp size={19} />
            </div>
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#f1f2e9]">Upload to Vertex</h2>
              <p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-[#788279]">
                Personal Archive Upload
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="button-close-upload-modal"
            onClick={onClose}
            className="icon-button rounded-lg p-2 text-[#828b84] hover:text-white"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div>
            <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
              File (Drag & drop or select)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-all ${
                isDragging
                  ? 'border-white bg-white/[.08]'
                  : selectedFile
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : 'border-white/[.15] bg-[#12161f] hover:border-white/40 hover:bg-white/[.03]'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-emerald-400" />
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-[#f0f2eb]">{selectedFile.name}</p>
                    <p className="font-mono-ui text-[9px] text-[#808b82]">{formatBytes(selectedFile.size)} · Click to replace</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={22} className="mb-2 text-[#8e9890]" />
                  <p className="text-[11px] font-semibold text-[#e1e4dc]">
                    Drop file here, or <span className="underline underline-offset-2">browse</span>
                  </p>
                  <p className="mt-1 font-mono-ui text-[9px] text-[#6b766e]">
                    Any format (ZIP, FIG, PDF, MP4, MP3, CODE, etc.)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Title & Category */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
                Title *
              </label>
              <input
                type="text"
                required
                data-testid="input-upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Tokens v2"
                className="w-full rounded-lg border border-white/[.1] bg-[#12161f] px-3 py-2 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
                Category
              </label>
              <select
                data-testid="select-upload-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-lg border border-white/[.1] bg-[#12161f] px-3 py-2 text-[12px] text-[#eef0e9] outline-none focus:border-white/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#171c24] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Author & Banner Label */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
                Author Name
              </label>
              <input
                type="text"
                data-testid="input-upload-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. You"
                className="w-full rounded-lg border border-white/[.1] bg-[#12161f] px-3 py-2 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
                Cover Label (1-2 words)
              </label>
              <input
                type="text"
                data-testid="input-upload-label"
                value={artLabel}
                onChange={(e) => setArtLabel(e.target.value)}
                placeholder="e.g. UI\nKIT"
                className="w-full rounded-lg border border-white/[.1] bg-[#12161f] px-3 py-2 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
              Description
            </label>
            <textarea
              rows={2}
              data-testid="textarea-upload-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of what this file contains..."
              className="w-full resize-none rounded-lg border border-white/[.1] bg-[#12161f] px-3 py-2 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              data-testid="input-upload-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. figma, ui, tokens, dark"
              className="w-full rounded-lg border border-white/[.1] bg-[#12161f] px-3 py-2 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
            />
          </div>

          {/* Art Color Theme Selector */}
          <div>
            <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
              Cover Art Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {ART_THEMES.map((theme) => (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => setArt(theme.id)}
                  data-testid={`theme-${theme.id}`}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-all ${
                    art === theme.id
                      ? 'border-white bg-white/[.15] text-white shadow-sm'
                      : 'border-white/[.08] bg-[#12161f] text-[#8e978f] hover:border-white/30'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.hex }} />
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          {/* Live Mini Preview */}
          <div>
            <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
              Card Preview
            </label>
            <div className="overflow-hidden rounded-xl border border-white/[.08] bg-[#141822]">
              <div className={`preview-art ${art} relative h-[80px] p-3`}>
                <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono-ui text-[7px] tracking-[.14em] text-white/90">
                  {category.toUpperCase()}
                </span>
                <div className="mt-1 font-display text-[16px] font-bold text-white/90">
                  {artLabel || title.toUpperCase() || 'FILE PREVIEW'}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[11px] font-bold text-[#e8ebe2]">
                  {title || 'Untitled File'}
                </div>
                <div className="mt-0.5 text-[9px] text-[#808b82]">
                  By {author || 'You'} · {selectedFile ? formatBytes(selectedFile.size) : '1.2 MB'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-white/[.08] pt-4">
            <button
              type="button"
              data-testid="button-cancel-upload"
              onClick={onClose}
              className="rounded-lg border border-white/[.1] px-4 py-2 text-[11px] font-semibold text-[#8e978f] hover:bg-white/[.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              data-testid="button-submit-upload"
              className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[11px] font-extrabold text-[#171a1f] shadow-md transition-all hover:bg-[#e4e7dd] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload size={13} strokeWidth={2.4} />
              <span>Publish file</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Feedback({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      role="status"
      data-testid="status-feedback"
      className="toast-in fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[#506332] bg-[#26331c] px-4 py-3 text-[11px] font-semibold text-[#d9efaa] shadow-2xl"
    >
      <Check size={15} className="text-[#c9ef72]" />
      {message}
      <button type="button" data-testid="button-close-feedback" onClick={onClose} className="ml-2 text-[#829667]" aria-label="Dismiss message">
        <X size={14} />
      </button>
    </div>
  );
}

function BrowsePage() {
  const [fileList, setFileList] = useState<FileRecord[]>(() => {
    try {
      const saved = localStorage.getItem('vertex_archive_files');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return defaultFiles;
  });

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'Newest' | 'Most downloaded' | 'Top rated'>('Newest');
  const [favorites, setFavorites] = useState<string[]>(['mono-objects']);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [cookieVisible, setCookieVisible] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortOpen, setSortOpen] = useState(false);

  const saveFiles = (updated: FileRecord[]) => {
    setFileList(updated);
    try {
      localStorage.setItem('vertex_archive_files', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleUploadNewFile = (newRecord: FileRecord, fileBlob?: File) => {
    if (fileBlob) {
      uploadedBlobs.set(newRecord.id, { blob: fileBlob, fileName: fileBlob.name });
    }
    const updated = [newRecord, ...fileList];
    saveFiles(updated);
    showFeedback(`"${newRecord.title}" published to your library.`);
  };

  const handleDeleteFile = (id: string) => {
    const target = fileList.find((f) => f.id === id);
    const updated = fileList.filter((f) => f.id !== id);
    saveFiles(updated);
    uploadedBlobs.delete(id);
    showFeedback(`"${target?.title || 'File'}" removed from library.`);
  };

  const visibleFiles = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = fileList.filter((file) => !search || `${file.title} ${file.author} ${file.tags.join(' ')}`.toLowerCase().includes(search));
    return [...filtered].sort((a, b) =>
      sort === 'Most downloaded'
        ? Number(b.downloads.replace('k', '000')) - Number(a.downloads.replace('k', '000'))
        : sort === 'Top rated'
        ? b.rating - a.rating
        : fileList.indexOf(a) - fileList.indexOf(b)
    );
  }, [fileList, query, sort]);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3500);
  };

  const handleDownload = (file: FileRecord) => {
    downloadFile(file);
    showFeedback(`${file.title} is ready in your downloads`);
  };

  return (
    <div className="app-shell flex text-[#e7e9e0]">
      <Sidebar active="Browse library" onOpenUpload={() => setUploadModalOpen(true)} />
      {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} onOpenUpload={() => setUploadModalOpen(true)} />}

      <main className="min-w-0 flex-1">
        <header className="topbar sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/[.07] px-4 sm:px-7 lg:px-10">
          <button
            type="button"
            data-testid="button-open-drawer"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="icon-button rounded-lg p-2 text-[#9ba49b] lg:hidden"
          >
            <Menu size={21} />
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="eyebrow">Library /</span>
            <span className="text-[11px] font-semibold text-[#d0d6cc]">Browse</span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              data-testid="button-header-upload"
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#171a1f] shadow-sm transition-all hover:bg-[#e4e7dd] active:scale-95"
            >
              <Upload size={13} strokeWidth={2.4} />
              <span>Upload file</span>
            </button>
            <button
              type="button"
              data-testid="button-header-help"
              onClick={() => showFeedback('Vertex is moderated by people, not feeds')}
              className="icon-button hidden items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#7c867d] sm:flex"
            >
              <HelpCircle size={15} /> How it works
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          <section className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,.1)]"></span>
                <span className="eyebrow text-[#c4c8c4]">A better file drawer</span>
              </div>
              <h1 className="max-w-[650px] font-display text-[clamp(34px,5vw,61px)] font-bold leading-[.96] tracking-[-.075em] text-[#f0f1e9]">
                Useful things,<br />
                <span className="text-[#c7cbc7]">kept within reach.</span>
              </h1>
              <p className="mt-4 max-w-[490px] text-[12px] leading-[1.7] text-[#7f8981]">
                Vertex is a focused archive of files worth keeping. Find the signal, skip the noise, and leave the next person a better starting point.
              </p>
            </div>
          </section>

          <section className="surface mb-7 rounded-2xl p-3 sm:p-4">
            <div className="search-input flex items-center gap-3 rounded-xl border border-white/[.08] bg-[#11151c] px-4 py-3">
              <Search size={18} className="shrink-0 text-[#c7cbc7]" />
              <input
                type="search"
                data-testid="input-search-files"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, author, or tags..."
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[#eef0e9] outline-none placeholder:text-[#5e6861]"
              />
              <kbd className="hidden rounded border border-white/[.1] bg-white/[.04] px-2 py-1 font-mono-ui text-[9px] text-[#667269] sm:block">
                ⌘ K
              </kbd>
            </div>
          </section>

          <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[18px] font-bold tracking-[-.045em] text-[#e6e9df]">All files</h2>
              <p data-testid="text-results-count" className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#69746c]">
                {visibleFiles.length} results · reviewed archive
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  data-testid="button-sort-files"
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 rounded-lg border border-white/[.08] bg-[#161b22] px-3 py-2 text-[10px] font-bold text-[#9aa49a]"
                >
                  <SlidersHorizontal size={13} /> Sort: <span className="text-[#d9e5c1]">{sort}</span>
                  <ChevronDown size={13} />
                </button>
                {sortOpen && (
                  <div className="surface absolute right-0 top-11 z-20 w-44 rounded-lg p-1.5">
                    {(['Newest', 'Most downloaded', 'Top rated'] as const).map((option) => (
                      <button
                        type="button"
                        data-testid={`sort-option-${option.toLowerCase().replaceAll(' ', '-')}`}
                        key={option}
                        onClick={() => {
                          setSort(option);
                          setSortOpen(false);
                        }}
                        className="flex w-full rounded-md px-3 py-2 text-left text-[10px] font-semibold text-[#a8b1a8] hover:bg-white/[.06]"
                      >
                        {option}
                        {sort === option && <Check size={13} className="ml-auto text-[hsl(var(--primary))]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden overflow-hidden rounded-lg border border-white/[.08] sm:flex">
                <button
                  type="button"
                  data-testid="button-grid-view"
                  onClick={() => setView('grid')}
                  className={`p-2 ${view === 'grid' ? 'bg-white/[.09] text-[#d9efaa]' : 'text-[#6b756d]'}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  data-testid="button-list-view"
                  onClick={() => setView('list')}
                  className={`p-2 ${view === 'list' ? 'bg-white/[.09] text-[#d9efaa]' : 'text-[#6b756d]'}`}
                  aria-label="List view"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </section>

          {visibleFiles.length > 0 ? (
            <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-3'}>
              {visibleFiles.map((file, index) => (
                <FileCard
                  key={file.id}
                  file={file}
                  index={index}
                  favorite={favorites.includes(file.id)}
                  onFavorite={() =>
                    setFavorites((current) =>
                      current.includes(file.id) ? current.filter((id) => id !== file.id) : [...current, file.id]
                    )
                  }
                  onDownload={() => handleDownload(file)}
                  onDelete={() => handleDeleteFile(file.id)}
                />
              ))}
            </div>
          ) : (
            <div data-testid="empty-search-state" className="surface flex min-h-[260px] flex-col items-center justify-center rounded-2xl px-6 text-center">
              <Search size={24} className="mb-4 text-[#c7cbc7]" />
              <h3 className="font-display text-lg font-bold">Nothing in this corner yet</h3>
              <p className="mt-2 max-w-[320px] text-[11px] leading-relaxed text-[#737e75]">
                Try a different phrase. The archive is large, but pleasantly picky.
              </p>
              <button
                type="button"
                data-testid="button-clear-search"
                onClick={() => setQuery('')}
                className="mt-5 rounded-lg bg-white px-4 py-2 text-[10px] font-extrabold text-[#171a1f]"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </main>

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUploadNewFile}
      />

      {cookieVisible && (
        <div className="cookie-in fixed inset-x-3 bottom-3 z-40 flex flex-col gap-4 rounded-2xl border border-white/[.12] bg-[#171c22]/95 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[min(760px,calc(100%-40px))] sm:-translate-x-1/2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 hidden rounded-lg bg-white/[.09] p-2 text-white sm:block">
              <ShieldCheck size={16} />
            </div>
            <p data-testid="text-cookie-notice" className="text-[10px] leading-relaxed text-[#9ba39b]">
              Vertex uses a small cookie to remember your view and keep the archive tidy. No ad profiles.{' '}
              <button
                type="button"
                data-testid="button-cookie-policy"
                onClick={() => showFeedback('No ad profiles. That is the whole policy.')}
                className="font-bold text-[#f0f1ed] underline decoration-white/[.3] underline-offset-2"
              >
                Read our policy
              </button>
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              data-testid="button-cookie-reject"
              onClick={() => setCookieVisible(false)}
              className="rounded-lg border border-white/[.1] px-3 py-2 text-[10px] font-bold text-[#89938a]"
            >
              Reject
            </button>
            <button
              type="button"
              data-testid="button-cookie-accept"
              onClick={() => setCookieVisible(false)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] font-extrabold text-[#171a1f]"
            >
              <Check size={12} /> Accept
            </button>
          </div>
        </div>
      )}

      {feedback && <Feedback message={feedback} onClose={() => setFeedback('')} />}
    </div>
  );
}

function Router() {
  return (
    <ErrorBoundary resetKey={window.location.pathname}>
      <Switch>
        <Route path="/" component={BrowsePage} />
        <Route component={BrowsePage} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;