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
  Lock,
  LogOut,
  User,
  Crown,
  AlertCircle,
  Box,
  Mail,
  Send,
  RefreshCw,
  Globe,
  Copy,
  Link,
  Github,
  Key,
} from 'lucide-react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const OWNER_EMAIL = 'pukiler23@gmail.com';
const GITHUB_REPO = 'emr-4313/Vertex-Hub';
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/artifacts/download-library/public/places.json`;
const LOCAL_STORAGE_KEY = 'vertex_hub_places_local_registry_v1';
const GITHUB_TOKEN_KEY = 'vertex_hub_gh_token';

type Category = 'Places' | 'Games' | 'Maps' | 'Systems' | 'Templates' | 'Assets';

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
  fileName?: string;
  downloadUrl?: string;
  dataUrl?: string;
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

const CATEGORIES: Category[] = ['Places', 'Games', 'Maps', 'Systems', 'Templates', 'Assets'];

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

function isRobloxFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.rbxl') || lower.endsWith('.rbxlx');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s@._]+/);
  if (parts.length === 0 || !parts[0]) return 'PU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadFile(file: FileRecord) {
  // If direct URL is provided
  if (file.downloadUrl) {
    const anchor = document.createElement('a');
    anchor.href = file.downloadUrl;
    anchor.download = file.fileName || `${file.title.replace(/\s+/g, '_')}.rbxl`;
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  // If Base64 dataUrl exists
  if (file.dataUrl) {
    const anchor = document.createElement('a');
    anchor.href = file.dataUrl;
    anchor.download = file.fileName || `${file.title.replace(/\s+/g, '_')}.rbxl`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  // If in-memory custom blob exists
  const custom = uploadedBlobs.get(file.id);
  if (custom) {
    const url = URL.createObjectURL(custom.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = custom.fileName || `${file.title}.rbxl`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  // Fallback direct place generator
  const content = `ROBLOX PLACE FILE NOTE\n\nTitle: ${file.title}\nFormat: RBXL / RBXLX\nCreator: ${file.author}\n\nDescription: ${file.description}\nTags: ${file.tags.join(', ')}\n`;
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${file.title.replace(/\s+/g, '_')}.rbxl`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Fetch all public places from GitHub raw CDN + local places
async function loadPublicPlaces(): Promise<FileRecord[]> {
  const listMap = new Map<string, FileRecord>();

  // 1. Try fetching from GitHub raw CDN
  try {
    const res = await fetch(`${GITHUB_RAW_URL}?nocache=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const gitPlaces: FileRecord[] = await res.json();
      if (Array.isArray(gitPlaces)) {
        gitPlaces.forEach((p) => listMap.set(p.id, p));
      }
    }
  } catch (err) {
    console.log('GitHub Raw sync:', err);
  }

  // 2. Try fetching from relative bundled public/places.json
  try {
    const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const res = await fetch(`${basePath}/places.json?nocache=${Date.now()}`);
    if (res.ok) {
      const bundledPlaces: FileRecord[] = await res.json();
      if (Array.isArray(bundledPlaces)) {
        bundledPlaces.forEach((p) => listMap.set(p.id, p));
      }
    }
  } catch (err) {
    console.log('Bundled places sync:', err);
  }

  // 3. Merge with local creator storage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      const localPlaces: FileRecord[] = JSON.parse(local);
      if (Array.isArray(localPlaces)) {
        localPlaces.forEach((p) => {
          if (!listMap.has(p.id)) listMap.set(p.id, p);
        });
      }
    }
  } catch (err) {
    console.log('Local storage sync:', err);
  }

  return Array.from(listMap.values());
}

// Save places to GitHub repository via GitHub REST API if token is configured
async function syncPlacesToGitHub(places: FileRecord[], token: string): Promise<{ success: boolean; message: string }> {
  try {
    const filePath = 'artifacts/download-library/public/places.json';
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

    // Get current SHA
    let sha = '';
    try {
      const getRes = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }
    } catch {}

    // Clean payload (don't push massive dataUrls to places.json, keep metadata & downloadUrls)
    const sanitizedPlaces = places.map((p) => ({
      ...p,
      dataUrl: p.dataUrl && p.dataUrl.length > 50000 ? undefined : p.dataUrl,
    }));

    const contentUtf8 = JSON.stringify(sanitizedPlaces, null, 2);
    // Base64 encode in browser
    const contentBase64 = btoa(unescape(encodeURIComponent(contentUtf8)));

    const body: any = {
      message: `Update places archive (${places.length} places) [skip ci]`,
      content: contentBase64,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify(body),
    });

    if (putRes.ok) {
      return { success: true, message: 'Published directly to GitHub! All users will see this update.' };
    } else {
      const errData = await putRes.json();
      return { success: false, message: errData.message || 'GitHub API rejected request.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to connect to GitHub.' };
  }
}

function AuthModal({
  isOpen,
  onClose,
  onLogin,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string) => void;
}) {
  const [step, setStep] = useState<'EMAIL' | 'CODE'>('EMAIL');
  const [emailInput, setEmailInput] = useState(OWNER_EMAIL);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [codeInputs, setCodeInputs] = useState<string[]>(['', '', '', '', '', '']);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const [codeNotification, setCodeNotification] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep('EMAIL');
      setEmailInput(OWNER_EMAIL);
      setGeneratedCode('');
      setCodeInputs(['', '', '', '', '', '']);
      setError('');
      setCodeNotification(null);
      setIsSending(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (step === 'CODE' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const handleSendCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();
    if (trimmed !== OWNER_EMAIL.toLowerCase()) {
      setError(`Only ${OWNER_EMAIL} is authorized to receive verification codes.`);
      return;
    }

    setError('');
    setIsSending(true);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    setTimeout(() => {
      setIsSending(false);
      setStep('CODE');
      setCountdown(60);
      setCodeNotification(code);
      setCodeInputs(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }, 500);
  };

  const handleCodeChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...codeInputs];
    next[index] = val.slice(-1);
    setCodeInputs(next);
    setError('');

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      setCodeInputs(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleQuickFill = () => {
    if (generatedCode) {
      setCodeInputs(generatedCode.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = codeInputs.join('');
    if (entered.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }
    if (entered !== generatedCode) {
      setError('Incorrect code. Please enter the code sent to your Gmail.');
      return;
    }

    setError('');
    onLogin(OWNER_EMAIL);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        data-testid="button-auth-modal-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close modal"
      />
      <div
        className="toast-in surface relative w-full max-w-[460px] rounded-2xl border border-white/[.12] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/[.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
              <Crown size={19} />
            </div>
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#f1f2e9]">
                {step === 'EMAIL' ? 'Creator Sign In' : 'Gmail Code Verification'}
              </h2>
              <p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#788279]">
                {OWNER_EMAIL} Access
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="button-close-auth-modal"
            onClick={onClose}
            className="icon-button rounded-lg p-2 text-[#828b84] hover:text-white"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {step === 'EMAIL' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
                Authorized Gmail Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  data-testid="input-auth-email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setError('');
                  }}
                  placeholder="pukiler23@gmail.com"
                  className="w-full rounded-lg border border-white/[.1] bg-[#12161f] px-3.5 py-2.5 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
                />
                <Mail size={16} className="absolute right-3 top-3 text-[#677169]" />
              </div>
              {error && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
                  <AlertCircle size={13} /> {error}
                </p>
              )}
              <div className="mt-3 rounded-xl border border-white/[.06] bg-[#141922] p-3 text-[11px] leading-relaxed text-[#818c82]">
                <p className="flex items-center gap-1.5 font-semibold text-[#d0d6cc]">
                  <ShieldCheck size={14} className="text-emerald-400" /> Security Verification
                </p>
                <p className="mt-1 text-[10px] text-[#717b73]">
                  A 6-digit authorization code will be generated to authenticate creator permissions for {OWNER_EMAIL}.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                data-testid="button-cancel-auth"
                onClick={onClose}
                className="rounded-lg border border-white/[.1] px-4 py-2 text-[11px] font-semibold text-[#8e978f] hover:bg-white/[.05]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                data-testid="button-send-code"
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[11px] font-extrabold text-[#171a1f] shadow-md transition-all hover:bg-[#e4e7dd] disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Generating Code...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} strokeWidth={2.4} />
                    <span>Send code to Gmail</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5">
            {codeNotification && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-200">
                      Code for {OWNER_EMAIL}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-[9px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                    title="Paste sent code"
                  >
                    <Copy size={11} /> Auto-fill
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg font-mono">
                  <span className="text-[10px] text-[#8e9a8f]">Verification Code:</span>
                  <span className="text-[14px] font-extrabold tracking-widest text-white">
                    {codeNotification}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-center font-mono-ui text-[10px] uppercase tracking-[.16em] text-[#8e9890]">
                Enter 6-Digit Code
              </label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {codeInputs.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="h-12 w-11 text-center font-display text-[18px] font-extrabold text-[#f1f2e9] rounded-xl border border-white/[.15] bg-[#12161f] outline-none transition-all focus:border-white focus:bg-white/[.08]"
                  />
                ))}
              </div>

              {error && (
                <p className="mt-2.5 text-center text-[11px] font-medium text-rose-400 flex items-center justify-center gap-1.5">
                  <AlertCircle size={13} /> {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/[.08] pt-4">
              <button
                type="button"
                disabled={countdown > 0}
                onClick={() => handleSendCode()}
                className="font-mono-ui text-[10px] text-[#818c82] hover:text-white disabled:opacity-50"
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className="rounded-lg border border-white/[.1] px-3.5 py-2 text-[11px] font-semibold text-[#8e978f] hover:bg-white/[.05]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  data-testid="button-verify-otp"
                  className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[11px] font-extrabold text-[#171a1f] shadow-md hover:bg-[#e4e7dd]"
                >
                  <Check size={13} strokeWidth={2.5} />
                  <span>Verify & Sign in</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Sidebar({
  active,
  isOwner,
  currentUser,
  onOpenUpload,
  onOpenAuth,
  onLogout,
}: {
  active: string;
  isOwner: boolean;
  currentUser: string | null;
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <aside className="sidebar hidden w-[252px] shrink-0 border-r border-white/[.07] px-4 py-5 lg:flex lg:flex-col justify-between">
      <div>
        <div className="mb-6 flex items-center gap-3 px-3">
          <img src="/vertex-logo.png" alt="Vertex logo" className="h-9 w-9 rounded-xl object-cover shadow-[0_0_0_5px_rgba(255,255,255,.08)]" />
          <div>
            <div className="font-display text-[19px] font-bold tracking-[-.05em] text-[#f1f2e9]">Vertex</div>
            <div className="font-mono-ui text-[8px] uppercase tracking-[.18em] text-[#6e756f]">Roblox Archive</div>
          </div>
        </div>

        {isOwner ? (
          <button
            type="button"
            data-testid="button-sidebar-upload"
            onClick={onOpenUpload}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[12px] font-extrabold text-[#11151c] shadow-[0_0_20px_rgba(255,255,255,.08)] transition-all hover:bg-[#e6e8de] hover:shadow-[0_0_25px_rgba(255,255,255,.16)] active:scale-[0.98]"
          >
            <Upload size={15} strokeWidth={2.4} />
            <span>Upload .RBXL Place</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="button-sidebar-auth"
            onClick={onOpenAuth}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[.12] bg-[#171c26] px-3.5 py-2.5 text-[11px] font-bold text-[#c7cfc5] transition-all hover:bg-white/[.08] hover:text-white"
          >
            <Lock size={13} strokeWidth={2.2} />
            <span>Creator Sign In</span>
          </button>
        )}

        <div className="mb-3 px-3 eyebrow">Library</div>
        <nav className="space-y-1" aria-label="Primary navigation">
          <button
            type="button"
            data-testid="nav-browse-library"
            data-active={active === 'Browse library'}
            onClick={() => setLocation('/')}
            className="nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold text-[#8a928c]"
          >
            <LayoutGrid size={16} strokeWidth={1.8} />
            <span>Browse Places</span>
          </button>
        </nav>
      </div>

      {isOwner ? (
        <div className="border-t border-white/[.07] pt-4 px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-amber-500/20 text-[9px] font-bold text-amber-300">
                <Crown size={11} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-[#e1e4dd]">{currentUser}</p>
                <p className="font-mono-ui text-[8px] text-amber-400/90 uppercase tracking-wider">Verified Creator</p>
              </div>
            </div>
            <button
              type="button"
              data-testid="button-sidebar-logout"
              onClick={onLogout}
              title="Sign out"
              className="icon-button rounded-md p-1.5 text-[#737e75] hover:text-rose-400"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/[.07] pt-3 px-2">
          <div className="flex items-center gap-2 text-[9px] text-[#69746b]">
            <Globe size={12} className="text-emerald-400" />
            <span>Public Global Archive</span>
          </div>
        </div>
      )}
    </aside>
  );
}

function MobileDrawer({
  onClose,
  isOwner,
  onOpenUpload,
  onOpenAuth,
  onLogout,
}: {
  onClose: () => void;
  isOwner: boolean;
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button type="button" data-testid="button-close-drawer-backdrop" onClick={onClose} className="absolute inset-0 bg-black/60" aria-label="Close navigation" />
      <aside className="drawer-in sidebar relative flex h-full w-[280px] flex-col justify-between border-r border-white/[.08] px-4 py-5">
        <div>
          <div className="mb-6 flex items-center justify-between px-3">
            <div className="flex items-center gap-3">
              <img src="/vertex-logo.png" alt="Vertex logo" className="h-9 w-9 rounded-xl object-cover" />
              <div className="font-display text-[19px] font-bold tracking-[-.05em]">Vertex</div>
            </div>
            <button type="button" data-testid="button-close-drawer" onClick={onClose} className="icon-button rounded-md p-2 text-[#818982]" aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          {isOwner ? (
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
              <span>Upload .RBXL</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="button-mobile-drawer-auth"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[.12] bg-[#171c26] px-3.5 py-2.5 text-[11px] font-bold text-[#c7cfc5]"
            >
              <Lock size={13} strokeWidth={2.2} />
              <span>Creator Sign In</span>
            </button>
          )}

          <div className="mb-3 px-3 eyebrow">Library</div>
          <button type="button" data-testid="mobile-nav-browse" onClick={onClose} className="nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold text-[#cfd6cb]">
            <LayoutGrid size={16} /> Browse Places
          </button>
        </div>

        {isOwner && (
          <div className="border-t border-white/[.08] pt-4 px-2 flex items-center justify-between">
            <span className="text-[10px] text-[#8e9890] truncate font-mono">{OWNER_EMAIL}</span>
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="text-[10px] text-rose-400 font-bold hover:underline"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Preview({ file }: { file: FileRecord }) {
  return (
    <div className={`preview-art ${file.art} relative h-[150px] shrink-0 rounded-t-[11px]`}>
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <span className="rounded bg-black/40 px-2 py-1 font-mono-ui text-[8px] tracking-[.14em] text-white/90 backdrop-blur-sm">
            {file.category.toUpperCase()} · RBXL
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
  isOwner,
  onFavorite,
  onDownload,
  onDelete,
  index,
}: {
  file: FileRecord;
  favorite: boolean;
  isOwner: boolean;
  onFavorite: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  index: number;
}) {
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
            {isOwner && onDelete && (
              <button
                type="button"
                data-testid={`button-delete-${file.id}`}
                onClick={onDelete}
                aria-label={`Delete ${file.title}`}
                className="icon-button shrink-0 rounded-md p-1.5 text-[#657069] hover:text-[#f87171]"
                title="Remove place"
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
            <Download size={12} /> Download .rbxl
          </button>
        </div>
      </div>
    </article>
  );
}

function UploadModal({
  isOpen,
  isOwner,
  onClose,
  onOpenAuth,
  onUpload,
}: {
  isOpen: boolean;
  isOwner: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onUpload: (newFile: FileRecord, fileBlob?: File, ghToken?: string) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Places');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [art, setArt] = useState<string>('art-cobalt');
  const [artLabel, setArtLabel] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem(GITHUB_TOKEN_KEY) || '');
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setTitle('');
      setCategory('Places');
      setDescription('');
      setTagsInput('');
      setArt('art-cobalt');
      setArtLabel('');
      setExternalUrl('');
      setFileError('');
      setIsDragging(false);
      setIsPublishing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (!isOwner) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          aria-label="Close modal"
        />
        <div className="toast-in surface relative w-full max-w-[420px] rounded-2xl border border-white/[.12] p-6 text-center shadow-2xl">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Lock size={24} />
          </div>
          <h2 className="font-display text-[17px] font-bold text-[#f1f2e9]">Creator Access Required</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-[#8f9890]">
            Only <strong className="text-white">{OWNER_EMAIL}</strong> can upload Roblox places (.rbxl / .rbxlx) to this public archive.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[.1] px-4 py-2 text-[11px] font-semibold text-[#8e978f] hover:bg-white/[.05]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[11px] font-extrabold text-[#171a1f]"
            >
              <User size={13} />
              <span>Sign in as pukiler23</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFile = (file: File) => {
    if (!isRobloxFile(file.name)) {
      setFileError('Invalid file format. Only Roblox Place files (.rbxl and .rbxlx) are accepted.');
      setSelectedFile(null);
      return;
    }

    setFileError('');
    setSelectedFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (!title) {
      setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
    if (!artLabel) {
      const words = baseName.toUpperCase().split(/\s+/).slice(0, 2);
      setArtLabel(words.join('\n') || 'ROBLOX\nPLACE');
    }
    if (!description) {
      setDescription(`Roblox place (${file.name}, ${formatBytes(file.size)}) published by ${OWNER_EMAIL}.`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !externalUrl.trim()) {
      setFileError('Please select a .rbxl/.rbxlx file or provide a direct download URL.');
      return;
    }
    if (!title.trim()) return;

    setIsPublishing(true);

    if (githubToken.trim()) {
      localStorage.setItem(GITHUB_TOKEN_KEY, githubToken.trim());
    }

    let dataUrl = '';
    if (selectedFile) {
      try {
        dataUrl = await fileToBase64(selectedFile);
      } catch (err) {
        console.warn('File conversion:', err);
      }
    }

    const tags = tagsInput
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    const ext = selectedFile?.name.split('.').pop()?.toLowerCase() || 'rbxl';
    const finalTags = Array.from(new Set(['roblox', ext, ...tags]));

    const newRecord: FileRecord = {
      id: `rbxl-${Date.now()}`,
      title: title.trim(),
      category,
      author: 'pukiler23',
      initials: 'PU',
      size: selectedFile ? formatBytes(selectedFile.size) : 'Roblox Place',
      downloads: '0',
      rating: 5.0,
      reviews: 1,
      tags: finalTags,
      description: description.trim() || `Roblox place file ready to open in Roblox Studio.`,
      art,
      artLabel: artLabel.trim() || title.trim().toUpperCase().slice(0, 10),
      updated: 'Just now',
      verified: true,
      fileName: selectedFile ? selectedFile.name : `${title.trim().replace(/\s+/g, '_')}.rbxl`,
      downloadUrl: externalUrl.trim() || undefined,
      dataUrl: dataUrl || undefined,
    };

    await onUpload(newRecord, selectedFile || undefined, githubToken.trim());
    setIsPublishing(false);
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
        className="toast-in surface relative max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-white/[.12] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/[.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.08] text-white">
              <FileUp size={19} />
            </div>
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#f1f2e9]">Publish Roblox Place</h2>
              <p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-emerald-400">
                Global Public Archive · {OWNER_EMAIL}
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
              Roblox Place File (.RBXL / .RBXLX) *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".rbxl,.rbxlx"
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
                  : fileError
                  ? 'border-rose-500/50 bg-rose-950/10'
                  : 'border-white/[.15] bg-[#12161f] hover:border-white/40 hover:bg-white/[.03]'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center gap-3">
                  <Check size={18} className="text-emerald-400" />
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-[#f0f2eb]">{selectedFile.name}</p>
                    <p className="font-mono-ui text-[9px] text-[#808b82]">
                      {formatBytes(selectedFile.size)} · Valid Roblox Place · Click to replace
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Box size={24} className="mb-2 text-[#8e9890]" />
                  <p className="text-[11px] font-semibold text-[#e1e4dc]">
                    Drop <span className="text-amber-300">.rbxl</span> or <span className="text-amber-300">.rbxlx</span> file here, or <span className="underline underline-offset-2">browse</span>
                  </p>
                  <p className="mt-1 font-mono-ui text-[9px] text-[#6b766e]">
                    Roblox Studio Place Binary & XML files only
                  </p>
                </>
              )}
            </div>
            {fileError && (
              <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                <AlertCircle size={12} /> {fileError}
              </p>
            )}
          </div>

          {/* Direct Link Alternative */}
          <div>
            <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
              Direct Download URL (Optional external / Catbox / Drive link)
            </label>
            <div className="relative">
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://... (direct .rbxl download link)"
                className="w-full rounded-lg border border-white/[.1] bg-[#12161f] px-3.5 py-2 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
              />
              <Link size={14} className="absolute right-3 top-2.5 text-[#636e65]" />
            </div>
          </div>

          {/* Title & Category */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
                Place Title *
              </label>
              <input
                type="text"
                required
                data-testid="input-upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Battlegrounds Arena Map"
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

          {/* Cover Label & Tags */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
                Cover Art Text (1-2 words)
              </label>
              <input
                type="text"
                data-testid="input-upload-label"
                value={artLabel}
                onChange={(e) => setArtLabel(e.target.value)}
                placeholder="e.g. ARENA\nMAP"
                className="w-full rounded-lg border border-white/[.1] bg-[#12161f] px-3 py-2 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8e9890]">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                data-testid="input-upload-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. pvp, sci-fi, lighting, lobby"
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
              placeholder="Describe this Roblox place, mechanics, or features..."
              className="w-full resize-none rounded-lg border border-white/[.1] bg-[#12161f] px-3 py-2 text-[12px] text-[#eef0e9] outline-none placeholder:text-[#525b55] focus:border-white/50"
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

          {/* GitHub Auto-Publish Token (Optional) */}
          <div className="rounded-xl border border-white/[.08] bg-[#131720] p-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 font-mono-ui text-[10px] uppercase tracking-[.12em] text-[#9aa49a]">
                <Github size={13} /> 1-Click Global Sync (GitHub Token)
              </label>
              <span className="text-[9px] text-[#717b73]">Optional · Saved locally</span>
            </div>
            <div className="relative">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="github_pat_... (with repo write permissions)"
                className="w-full rounded-lg border border-white/[.1] bg-[#0e1118] px-3 py-2 text-[11px] text-[#eef0e9] outline-none placeholder:text-[#4a534d] focus:border-white/40 font-mono"
              />
              <Key size={13} className="absolute right-3 top-2.5 text-[#636e65]" />
            </div>
            <p className="mt-1 text-[9px] text-[#6b766f]">
              Providing a GitHub token enables direct 1-click publishing to the repository so all global visitors see the update immediately.
            </p>
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
              disabled={(!selectedFile && !externalUrl.trim()) || !title.trim() || isPublishing}
              data-testid="button-submit-upload"
              className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[11px] font-extrabold text-[#171a1f] shadow-md transition-all hover:bg-[#e4e7dd] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Publishing Globally...</span>
                </>
              ) : (
                <>
                  <Globe size={13} strokeWidth={2.4} />
                  <span>Publish to Global Archive</span>
                </>
              )}
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
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('vertex_auth_user') || null;
  });

  const isOwner = currentUser?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  const [fileList, setFileList] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'Newest' | 'Most downloaded' | 'Top rated'>('Newest');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortOpen, setSortOpen] = useState(false);

  const refreshPlaces = async () => {
    setIsLoading(true);
    const places = await loadPublicPlaces();
    setFileList(places);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshPlaces();
  }, []);

  const handleLogin = (email: string) => {
    setCurrentUser(email);
    localStorage.setItem('vertex_auth_user', email);
    showFeedback(`Signed in as ${email}. You have full creator privileges.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('vertex_auth_user');
    showFeedback('Signed out of creator mode.');
  };

  const handleUploadNewFile = async (newRecord: FileRecord, fileBlob?: File, ghToken?: string) => {
    if (fileBlob) {
      uploadedBlobs.set(newRecord.id, { blob: fileBlob, fileName: fileBlob.name });
    }
    const updated = [newRecord, ...fileList];
    setFileList(updated);

    // Save locally
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // If GitHub token is present, sync to repo
    if (ghToken) {
      const syncRes = await syncPlacesToGitHub(updated, ghToken);
      showFeedback(syncRes.message);
    } else {
      showFeedback(`"${newRecord.title}" (.rbxl) published to archive!`);
    }
  };

  const handleDeleteFile = async (id: string) => {
    const target = fileList.find((f) => f.id === id);
    const updated = fileList.filter((f) => f.id !== id);
    setFileList(updated);
    uploadedBlobs.delete(id);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    const token = localStorage.getItem(GITHUB_TOKEN_KEY);
    if (token) {
      await syncPlacesToGitHub(updated, token);
    }

    showFeedback(`"${target?.title || 'Place'}" removed.`);
  };

  const exportPlacesJson = () => {
    const blob = new Blob([JSON.stringify(fileList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'places.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showFeedback('Exported places.json for GitHub commit');
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
    window.setTimeout(() => setFeedback(''), 4500);
  };

  const handleDownload = (file: FileRecord) => {
    downloadFile(file);
    showFeedback(`${file.title} downloading`);
  };

  return (
    <div className="app-shell flex text-[#e7e9e0]">
      <Sidebar
        active="Browse library"
        isOwner={isOwner}
        currentUser={currentUser}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />
      {drawerOpen && (
        <MobileDrawer
          onClose={() => setDrawerOpen(false)}
          isOwner={isOwner}
          onOpenUpload={() => setUploadModalOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
        />
      )}

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
            <span className="eyebrow">Roblox /</span>
            <span className="text-[11px] font-semibold text-[#d0d6cc]">Public Place Archive</span>
            <button
              type="button"
              onClick={refreshPlaces}
              title="Refresh public archive"
              className="ml-2 flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            >
              <RefreshCw size={9} className={isLoading ? 'animate-spin' : ''} />
              <span>Synced</span>
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {isOwner && fileList.length > 0 && (
              <button
                type="button"
                onClick={exportPlacesJson}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[.12] bg-[#161b24] px-2.5 py-1.5 text-[10px] font-bold text-[#c7cfc5] hover:bg-white/[.08] hover:text-white"
                title="Download places.json for GitHub commit"
              >
                <Github size={12} />
                <span>Export places.json</span>
              </button>
            )}
            {isOwner ? (
              <button
                type="button"
                data-testid="button-header-upload"
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#171a1f] shadow-sm transition-all hover:bg-[#e4e7dd] active:scale-95"
              >
                <Upload size={13} strokeWidth={2.4} />
                <span>Upload .rbxl</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="button-header-auth"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-white/[.12] bg-[#161b24] px-3 py-1.5 text-[11px] font-bold text-[#c7cfc5] transition-all hover:bg-white/[.08] hover:text-white"
              >
                <Lock size={12} />
                <span>Creator Sign In</span>
              </button>
            )}
            <button
              type="button"
              data-testid="button-header-help"
              onClick={() => showFeedback('Vertex Roblox Hub — Exclusively curated .rbxl and .rbxlx place files')}
              className="icon-button hidden items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#7c867d] sm:flex"
            >
              <HelpCircle size={15} /> Info
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          <section className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.2)]"></span>
                <span className="eyebrow text-[#c4c8c4]">Public Roblox Place Archive</span>
              </div>
              <h1 className="max-w-[650px] font-display text-[clamp(34px,5vw,61px)] font-bold leading-[.96] tracking-[-.075em] text-[#f0f1e9]">
                Roblox places,<br />
                <span className="text-[#c7cbc7]">open for everyone.</span>
              </h1>
              <p className="mt-4 max-w-[490px] text-[12px] leading-[1.7] text-[#7f8981]">
                Curated archive for Roblox place files (.rbxl & .rbxlx). Places published by {OWNER_EMAIL} are accessible to all visitors worldwide.
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
                placeholder="Search places by name, category, or tags..."
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[#eef0e9] outline-none placeholder:text-[#5e6861]"
              />
              <kbd className="hidden rounded border border-white/[.1] bg-white/[.04] px-2 py-1 font-mono-ui text-[9px] text-[#667269] sm:block">
                ⌘ K
              </kbd>
            </div>
          </section>

          <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[18px] font-bold tracking-[-.045em] text-[#e6e9df]">All Public Places</h2>
              <p data-testid="text-results-count" className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#69746c]">
                {visibleFiles.length} places · verified .rbxl/.rbxlx
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

          {isLoading ? (
            <div className="surface flex min-h-[260px] flex-col items-center justify-center rounded-2xl px-6 py-10 text-center">
              <RefreshCw size={26} className="animate-spin text-emerald-400 mb-3" />
              <p className="font-display text-[15px] font-bold text-[#e1e4dd]">Loading Public Places...</p>
              <p className="mt-1 font-mono-ui text-[10px] text-[#717b73]">Syncing from GitHub CDN</p>
            </div>
          ) : visibleFiles.length > 0 ? (
            <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-3'}>
              {visibleFiles.map((file, index) => (
                <FileCard
                  key={file.id}
                  file={file}
                  index={index}
                  isOwner={isOwner}
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
            <div data-testid="empty-search-state" className="surface flex min-h-[300px] flex-col items-center justify-center rounded-2xl px-6 py-10 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/[.05] text-[#8e9890]">
                <Box size={30} strokeWidth={1.6} />
              </div>
              <h3 className="font-display text-lg font-bold text-[#f1f2e9]">No Roblox places in the archive yet</h3>
              <p className="mt-2 max-w-[380px] text-[11px] leading-relaxed text-[#737e75]">
                {isOwner
                  ? `You are signed in as ${OWNER_EMAIL}. Upload your first .rbxl or .rbxlx place file to publish it globally for everyone.`
                  : `This public archive is waiting for place uploads from ${OWNER_EMAIL}. Sign in to publish .rbxl files.`}
              </p>
              {isOwner ? (
                <button
                  type="button"
                  data-testid="button-empty-upload"
                  onClick={() => setUploadModalOpen(true)}
                  className="mt-5 flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[11px] font-extrabold text-[#171a1f] shadow-md hover:bg-[#e4e7dd]"
                >
                  <Upload size={14} strokeWidth={2.4} />
                  <span>Upload .RBXL Place</span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="button-empty-auth"
                  onClick={() => setAuthModalOpen(true)}
                  className="mt-5 flex items-center gap-2 rounded-lg border border-white/[.15] bg-[#161b24] px-4 py-2.5 text-[11px] font-bold text-[#e1e4dd] hover:bg-white/[.08]"
                >
                  <Lock size={13} />
                  <span>Sign in as {OWNER_EMAIL}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <UploadModal
        isOpen={uploadModalOpen}
        isOwner={isOwner}
        onClose={() => setUploadModalOpen(false)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onUpload={handleUploadNewFile}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
      />

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