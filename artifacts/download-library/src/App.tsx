import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { Download, Search, Menu, X, Heart, Star, Check, ChevronDown, SlidersHorizontal, ArrowUpRight, ShieldCheck, BadgeCheck, LayoutGrid, List, HelpCircle } from 'lucide-react';
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

const files: FileRecord[] = [
  { id: 'signal-kit', title: 'Signal / Editorial Kit', category: 'Design', author: 'Mara Voss', initials: 'MV', size: '42.8 MB', downloads: '2.4k', rating: 4.9, reviews: 86, tags: ['figma', 'editorial', 'system'], description: 'A sharp, flexible editorial system for teams that publish often.', art: 'art-cobalt', artLabel: 'SIGNAL', updated: '2h ago', verified: true },
  { id: 'night-shift', title: 'Night Shift — LUT Pack', category: 'Video', author: 'Milo August', initials: 'MA', size: '1.2 GB', downloads: '8.1k', rating: 4.8, reviews: 143, tags: ['luts', 'cinema', 'dark'], description: 'Twenty-four restrained grades for sodium streets and blue hours.', art: 'art-amber', artLabel: 'NIGHT\\nSHIFT', updated: '5h ago', verified: true },
  { id: 'quiet-hours', title: 'Quiet Hours — Loop Library', category: 'Audio', author: 'Nia Rhee', initials: 'NR', size: '318 MB', downloads: '1.7k', rating: 4.7, reviews: 51, tags: ['ambient', 'loops', 'wav'], description: 'Textural loops for late work, patient interfaces, and long walks.', art: 'art-plum', artLabel: 'QUIET\\nHOURS', updated: '1d ago', verified: false },
  { id: 'field-notes', title: 'Field Notes / Research Docs', category: 'Documents', author: 'Owen Park', initials: 'OP', size: '8.6 MB', downloads: '934', rating: 4.6, reviews: 29, tags: ['research', 'notion', 'pdf'], description: 'A considered set of note-taking structures for messy early thinking.', art: 'art-mint', artLabel: 'FIELD\\nNOTES', updated: '1d ago', verified: true },
  { id: 'mono-objects', title: 'Mono Objects — 3D Set', category: 'Design', author: 'Keiko Tan', initials: 'KT', size: '84 MB', downloads: '3.2k', rating: 4.9, reviews: 74, tags: ['blender', 'objects', '3d'], description: 'Thirty-six low-poly objects with a quiet, tactile point of view.', art: 'art-lilac', artLabel: 'MONO\\nOBJECTS', updated: '2d ago', verified: true },
  { id: 'starter-stack', title: 'Starter Stack / Astro', category: 'Code', author: 'Jules Martin', initials: 'JM', size: '3.4 MB', downloads: '5.8k', rating: 4.8, reviews: 112, tags: ['astro', 'starter', 'tailwind'], description: 'An opinionated starting point for small, fast sites that last.', art: 'art-teal', artLabel: 'STARTER\\nSTACK', updated: '3d ago', verified: true },
  { id: 'soft-edges', title: 'Soft Edges — Type Specimen', category: 'Templates', author: 'Ada Kline', initials: 'AK', size: '18.1 MB', downloads: '1.1k', rating: 4.5, reviews: 34, tags: ['type', 'print', 'indesign'], description: 'A print-ready specimen template for making typography the story.', art: 'art-coral', artLabel: 'SOFT\\nEDGES', updated: '4d ago', verified: false },
  { id: 'archive-index', title: 'Archive Index / CSV Toolkit', category: 'Documents', author: 'Theo Bell', initials: 'TB', size: '2.8 MB', downloads: '764', rating: 4.4, reviews: 18, tags: ['csv', 'data', 'workflow'], description: 'Small utilities for keeping personal collections legible and useful.', art: 'art-slate', artLabel: 'ARCHIVE\\nINDEX', updated: '5d ago', verified: true },
];

const queryClient = new QueryClient();

function downloadFile(file: FileRecord) {
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

function Sidebar({ active }: { active: string }) {
  const [, setLocation] = useLocation();
  return (
    <aside className="sidebar hidden w-[248px] shrink-0 border-r border-white/[.07] px-4 py-5 lg:flex lg:flex-col">
      <div className="mb-10 flex items-center gap-3 px-3">
        <img src="/vertex-logo.png" alt="Vertex logo" className="h-9 w-9 rounded-xl object-cover shadow-[0_0_0_5px_rgba(255,255,255,.08)]" />
        <div>
          <div className="font-display text-[19px] font-bold tracking-[-.05em] text-[#f1f2e9]">Vertex</div>
          <div className="font-mono-ui text-[8px] uppercase tracking-[.18em] text-[#6e756f]">community archive</div>
        </div>
      </div>
      <div className="mb-3 px-3 eyebrow">Workspace</div>
      <nav className="space-y-1" aria-label="Primary navigation">
        <button type="button" data-testid="nav-browse-library" data-active={active === 'Browse library'} onClick={() => setLocation('/')} className="nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold text-[#8a928c]">
          <LayoutGrid size={16} strokeWidth={1.8} /><span>Browse library</span>
        </button>
      </nav>
      <div className="mt-5 flex items-center gap-3 border-t border-white/[.07] px-3 pt-4">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-[#3e3444] text-[10px] font-bold text-[#edc9ec]">YO</div>
        <div className="min-w-0"><div className="truncate text-[11px] font-semibold text-[#d3d7cd]">Your workspace</div><div className="font-mono-ui text-[9px] text-[#686f6a]">guest mode</div></div>
      </div>
    </aside>
  );
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-40 lg:hidden">
    <button type="button" data-testid="button-close-drawer-backdrop" onClick={onClose} className="absolute inset-0 bg-black/60" aria-label="Close navigation"></button>
    <aside className="drawer-in sidebar relative flex h-full w-[280px] flex-col border-r border-white/[.08] px-4 py-5">
       <div className="mb-10 flex items-center justify-between px-3"><div className="flex items-center gap-3"><img src="/vertex-logo.png" alt="Vertex logo" className="h-9 w-9 rounded-xl object-cover" /><div className="font-display text-[19px] font-bold tracking-[-.05em]">Vertex</div></div><button type="button" data-testid="button-close-drawer" onClick={onClose} className="icon-button rounded-md p-2 text-[#818982]" aria-label="Close menu"><X size={18} /></button></div>
      <div className="mb-3 px-3 eyebrow">Workspace</div>
      <button type="button" data-testid="mobile-nav-browse" onClick={onClose} className="nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold text-[#cfd6cb]"><LayoutGrid size={16} /> Browse library</button>
    </aside>
  </div>;
}

function Preview({ file }: { file: FileRecord }) {
  return <div className={`preview-art ${file.art} relative h-[150px] shrink-0 rounded-t-[11px]`}>
    <div className="absolute inset-0 flex flex-col justify-between p-4">
      <div className="flex items-center justify-between"><span className="rounded bg-black/25 px-2 py-1 font-mono-ui text-[8px] tracking-[.14em] text-white/80">{file.category.toUpperCase()}</span><ArrowUpRight size={14} className="text-white/60" /></div>
      <div className="whitespace-pre-line font-display text-[27px] font-bold leading-[.85] tracking-[-.08em] text-white/90">{file.artLabel}</div>
    </div>
  </div>;
}

function FileCard({ file, favorite, onFavorite, onDownload, index }: { file: FileRecord; favorite: boolean; onFavorite: () => void; onDownload: () => void; index: number }) {
  return <article data-testid={`card-file-${file.id}`} className="file-card surface overflow-hidden rounded-xl" style={{ animationDelay: `${index * 65}ms` }}>
    <Preview file={file} />
    <div className="p-4">
      <div className="mb-2 flex items-start justify-between gap-2"><div className="min-w-0"><h3 data-testid={`text-file-title-${file.id}`} className="truncate text-[13px] font-extrabold tracking-[-.02em] text-[#e8ebe2]">{file.title}</h3><p data-testid={`text-file-description-${file.id}`} className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#78817a]">{file.description}</p></div><button type="button" data-testid={`button-favorite-${file.id}`} onClick={onFavorite} aria-label={favorite ? `Remove ${file.title} from saved files` : `Save ${file.title}`} className={`icon-button shrink-0 rounded-md p-1.5 ${favorite ? 'text-[#e58eae]' : 'text-[#657069]'}`}>{favorite ? <Heart size={15} fill="currentColor" /> : <Heart size={15} />}</button></div>
      <div className="mb-3 flex flex-wrap gap-1.5">{file.tags.map((tag) => <span key={tag} className="rounded bg-[#222a31] px-1.5 py-1 font-mono-ui text-[8px] text-[#84908a]">#{tag}</span>)}</div>
      <div className="mb-3 flex items-center justify-between border-t border-white/[.06] pt-3"><div className="flex items-center gap-2"><div className="grid h-5 w-5 place-items-center rounded-full bg-[#39413b] text-[7px] font-bold text-[#b7c1ad]">{file.initials}</div><span data-testid={`text-file-author-${file.id}`} className="text-[10px] font-semibold text-[#9aa29a]">{file.author}</span>{file.verified && <BadgeCheck size={12} className="text-[hsl(var(--primary))]" />}</div><span className="font-mono-ui text-[9px] text-[#657069]">{file.updated}</span></div>
      <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[9px] text-[#7e887f]"><span className="flex items-center gap-1 text-[#e2e4df]"><Star size={11} fill="currentColor" className="text-white" /> <b data-testid={`text-file-rating-${file.id}`}>{file.rating}</b></span><span>({file.reviews})</span><span className="text-[#4f5952]">·</span><span>{file.size}</span><span className="text-[#4f5952]">·</span><span>{file.downloads} DL</span></div><button type="button" data-testid={`button-download-${file.id}`} onClick={onDownload} className="download-button flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-[#171a1f]"><Download size={12} /> Get file</button></div>
    </div>
  </article>;
}

function Feedback({ message, onClose }: { message: string; onClose: () => void }) {
  return <div role="status" data-testid="status-feedback" className="toast-in fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[#506332] bg-[#26331c] px-4 py-3 text-[11px] font-semibold text-[#d9efaa] shadow-2xl"><Check size={15} className="text-[#c9ef72]" />{message}<button type="button" data-testid="button-close-feedback" onClick={onClose} className="ml-2 text-[#829667]" aria-label="Dismiss message"><X size={14} /></button></div>;
}

function BrowsePage() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'Newest' | 'Most downloaded' | 'Top rated'>('Newest');
  const [favorites, setFavorites] = useState<string[]>(['mono-objects']);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [cookieVisible, setCookieVisible] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortOpen, setSortOpen] = useState(false);

  const visibleFiles = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = files.filter((file) => !search || `${file.title} ${file.author}`.toLowerCase().includes(search));
    return [...filtered].sort((a, b) => sort === 'Most downloaded' ? Number(b.downloads.replace('k', '000')) - Number(a.downloads.replace('k', '000')) : sort === 'Top rated' ? b.rating - a.rating : files.indexOf(a) - files.indexOf(b));
  }, [query, sort]);

  const showFeedback = (message: string) => { setFeedback(message); window.setTimeout(() => setFeedback(''), 3000); };
  const handleDownload = (file: FileRecord) => { downloadFile(file); showFeedback(`${file.title} is ready in your downloads`); };

  return <div className="app-shell flex text-[#e7e9e0]">
    <Sidebar active="Browse library" />
    {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
    <main className="min-w-0 flex-1">
      <header className="topbar sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/[.07] px-4 sm:px-7 lg:px-10">
        <button type="button" data-testid="button-open-drawer" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" className="icon-button rounded-lg p-2 text-[#9ba49b] lg:hidden"><Menu size={21} /></button>
        <div className="hidden items-center gap-2 lg:flex"><span className="eyebrow">Library /</span><span className="text-[11px] font-semibold text-[#d0d6cc]">Browse</span></div>
         <div className="ml-auto flex items-center gap-2 sm:gap-3"><button type="button" data-testid="button-header-help" onClick={() => showFeedback('Vertex is moderated by people, not feeds')} className="icon-button hidden items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#7c867d] sm:flex"><HelpCircle size={15} /> How it works</button></div>
      </header>
      <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
        <section className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
           <div><div className="mb-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,.1)]"></span><span className="eyebrow text-[#c4c8c4]">A better file drawer</span></div><h1 className="max-w-[650px] font-display text-[clamp(34px,5vw,61px)] font-bold leading-[.96] tracking-[-.075em] text-[#f0f1e9]">Useful things,<br /><span className="text-[#c7cbc7]">kept within reach.</span></h1><p className="mt-4 max-w-[490px] text-[12px] leading-[1.7] text-[#7f8981]">Vertex is a focused archive of files worth keeping. Find the signal, skip the noise, and leave the next person a better starting point.</p></div>
           <div className="flex shrink-0 gap-2"><div className="surface-subtle rounded-xl px-4 py-3"><div data-testid="text-stat-files" aria-label="Indexed files" className="font-display text-[22px] font-bold tracking-[-.05em] text-[#d7e7b2]">11,978</div></div><div className="surface-subtle rounded-xl px-4 py-3"><div data-testid="text-stat-week" aria-label="This week" className="font-display text-[22px] font-bold tracking-[-.05em] text-[#c5d8ed]">+184</div></div></div>
        </section>
         <section className="surface mb-7 rounded-2xl p-3 sm:p-4"><div className="search-input flex items-center gap-3 rounded-xl border border-white/[.08] bg-[#11151c] px-4 py-3"><Search size={18} className="shrink-0 text-[#c7cbc7]" /><input type="search" data-testid="input-search-files" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or author..." className="min-w-0 flex-1 bg-transparent text-[12px] text-[#eef0e9] outline-none placeholder:text-[#5e6861]" /><kbd className="hidden rounded border border-white/[.1] bg-white/[.04] px-2 py-1 font-mono-ui text-[9px] text-[#667269] sm:block">⌘ K</kbd></div></section>
         <section className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-[18px] font-bold tracking-[-.045em] text-[#e6e9df]">All files</h2><p data-testid="text-results-count" className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#69746c]">{visibleFiles.length} results · reviewed archive</p></div><div className="flex items-center gap-2"><div className="relative"><button type="button" data-testid="button-sort-files" onClick={() => setSortOpen(!sortOpen)} className="flex items-center gap-2 rounded-lg border border-white/[.08] bg-[#161b22] px-3 py-2 text-[10px] font-bold text-[#9aa49a]"><SlidersHorizontal size={13} /> Sort: <span className="text-[#d9e5c1]">{sort}</span><ChevronDown size={13} /></button>{sortOpen && <div className="surface absolute right-0 top-11 z-20 w-44 rounded-lg p-1.5">{(['Newest', 'Most downloaded', 'Top rated'] as const).map((option) => <button type="button" data-testid={`sort-option-${option.toLowerCase().replaceAll(' ', '-')}`} key={option} onClick={() => { setSort(option); setSortOpen(false); }} className="flex w-full rounded-md px-3 py-2 text-left text-[10px] font-semibold text-[#a8b1a8] hover:bg-white/[.06]">{option}{sort === option && <Check size={13} className="ml-auto text-[hsl(var(--primary))]" />}</button>)}</div>}</div><div className="hidden overflow-hidden rounded-lg border border-white/[.08] sm:flex"><button type="button" data-testid="button-grid-view" onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-white/[.09] text-[#d9efaa]' : 'text-[#6b756d]'}`} aria-label="Grid view"><LayoutGrid size={14} /></button><button type="button" data-testid="button-list-view" onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-white/[.09] text-[#d9efaa]' : 'text-[#6b756d]'}`} aria-label="List view"><List size={14} /></button></div></div></section>
         {visibleFiles.length > 0 ? <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-3'}>{visibleFiles.map((file, index) => <FileCard key={file.id} file={file} index={index} favorite={favorites.includes(file.id)} onFavorite={() => setFavorites((current) => current.includes(file.id) ? current.filter((id) => id !== file.id) : [...current, file.id])} onDownload={() => handleDownload(file)} />)}</div> : <div data-testid="empty-search-state" className="surface flex min-h-[260px] flex-col items-center justify-center rounded-2xl px-6 text-center"><Search size={24} className="mb-4 text-[#c7cbc7]" /><h3 className="font-display text-lg font-bold">Nothing in this corner yet</h3><p className="mt-2 max-w-[320px] text-[11px] leading-relaxed text-[#737e75]">Try a different phrase. The archive is large, but pleasantly picky.</p><button type="button" data-testid="button-clear-search" onClick={() => setQuery('')} className="mt-5 rounded-lg bg-white px-4 py-2 text-[10px] font-extrabold text-[#171a1f]">Clear search</button></div>}
      </div>
    </main>
    {cookieVisible && <div className="cookie-in fixed inset-x-3 bottom-3 z-40 flex flex-col gap-4 rounded-2xl border border-white/[.12] bg-[#171c22]/95 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[min(760px,calc(100%-40px))] sm:-translate-x-1/2 sm:flex-row sm:items-center sm:justify-between sm:gap-6"><div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 hidden rounded-lg bg-white/[.09] p-2 text-white sm:block"><ShieldCheck size={16} /></div><p data-testid="text-cookie-notice" className="text-[10px] leading-relaxed text-[#9ba39b]">Vertex uses a small cookie to remember your view and keep the archive tidy. No ad profiles. <button type="button" data-testid="button-cookie-policy" onClick={() => showFeedback('No ad profiles. That is the whole policy.')} className="font-bold text-[#f0f1ed] underline decoration-white/[.3] underline-offset-2">Read our policy</button></p></div><div className="flex shrink-0 gap-2"><button type="button" data-testid="button-cookie-reject" onClick={() => setCookieVisible(false)} className="rounded-lg border border-white/[.1] px-3 py-2 text-[10px] font-bold text-[#89938a]">Reject</button><button type="button" data-testid="button-cookie-accept" onClick={() => setCookieVisible(false)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] font-extrabold text-[#171a1f]"><Check size={12} /> Accept</button></div></div>}
    {feedback && <Feedback message={feedback} onClose={() => setFeedback('')} />}
  </div>;
}

function Router() {
  return <ErrorBoundary resetKey={window.location.pathname}><Switch><Route path="/" component={BrowsePage} /><Route component={BrowsePage} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;