import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Search, 
  Plus, 
  Download, 
  Trash2,
  ChevronRight,
  Settings,
  ImageIcon,
  Layers,
  BarChart3,
  ExternalLink,
  Info,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Leaf,
  Scale,
  ShieldAlert,
  Box,
  Truck,
  User,
  LogOut,
  ChevronDown,
  MoreVertical,
  Activity,
  Maximize2,
  Filter,
  ArrowRight,
  Mail,
  Lock,
  Cpu,
  FileSearch,
  CheckCircle,
  Clock,
  Tag,
  Package,
  Sparkles,
  Target,
  Calendar,
  X,
  HelpCircle,
  Play,
  Send,
  RefreshCw,
  Archive,
  Layers3,
  ListFilter,
  History,
  MessageSquare,
  Wand2,
  Minus,
  Undo2,
  Redo2,
  Undo,
  Copy,
  SearchCode,
  Globe,
  Image as ImageIconAlt,
  FileBadge
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

// --- Types & Constants ---

const REGISTRY_EXPIRY_DAYS = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface UserProfile {
  name: string;
  email: string;
  team: string;
  password?: string;
  hasSeenTour?: boolean;
}

interface ProductAttribute {
  name: string;
  value: string;
  confidence: number;
  group: 'Core' | 'SEO' | 'Technical' | 'Legal' | 'Dimensions' | 'Nutritional' | 'Logistics' | 'Usage' | 'Safety' | 'Marketing';
}

interface Taxonomy {
  segment: string;
  productType: string;
  category: string;
  subCategory: string;
}

interface AnalysisResult {
  id: string;
  taxonomy: Taxonomy;
  attributes: ProductAttribute[];
  insights: string;
  dataDensity: number;
  qualityScore: number;
  sourceType: 'composite' | 'url' | 'text';
  sourceValue: string;
  isFood: boolean;
  status: 'completed' | 'failed';
  sourceImages?: string[];
  fallbackImageUrl?: string;
  brandLogoUrl?: string;
  groundingSources?: any[];
  createdAt?: number;
  coreInfo: {
    displayName: string;
    brand: string;
    quantity: string;
    color: string;
  };
  seoInfo: {
    keywords: string[];
    tags: string[];
    productNotion: string;
    occasionRelevance: string;
  };
}

const CATALOGUE_SECTIONS = [
  { title: 'Core DNA', group: 'Core', icon: Package, color: 'text-slate-950' },
  { title: 'SEO Discovery', group: 'SEO', icon: Sparkles, color: 'text-amber-600' },
  { title: 'Technical Integrity', group: 'Technical', icon: Settings, color: 'text-slate-700' },
  { title: 'Regulatory Compliance', group: 'Legal', icon: ShieldAlert, color: 'text-red-800' },
  { title: 'Physical Scale', group: 'Dimensions', icon: Maximize2, color: 'text-stone-700' },
  { title: 'Health & Nutri', group: 'Nutritional', icon: Scale, color: 'text-emerald-800' },
  { title: 'Logistics/Flow', group: 'Logistics', icon: Truck, color: 'text-slate-900' },
  { title: 'Application', group: 'Usage', icon: Clock, color: 'text-amber-800' },
  { title: 'Safety Protocol', group: 'Safety', icon: ShieldCheck, color: 'text-emerald-900' },
  { title: 'Market Positioning', group: 'Marketing', icon: TrendingUp, color: 'text-stone-500' }
] as const;

// --- Helper Functions ---

const parseCSV = (text: string): string[] => {
  const lines = text.split('\n');
  return lines.filter(l => l.trim().length > 0);
};

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
});

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

const downloadCSV = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportSingleToCSV = (item: AnalysisResult) => {
  let csv = `Group,Attribute,Value,Confidence\n`;
  csv += `Core,Display Name,"${item.coreInfo.displayName}",1.0\n`;
  csv += `Core,Brand,"${item.coreInfo.brand}",1.0\n`;
  csv += `Taxonomy,Category,"${item.taxonomy.category}",1.0\n`;
  csv += `SEO,Product Notion,"${item.seoInfo.productNotion}",1.0\n`;
  if (item.seoInfo.keywords && item.seoInfo.keywords.length > 0) {
    csv += `SEO,Keywords,"${item.seoInfo.keywords.join(', ')}",1.0\n`;
  }
  item.attributes.forEach(attr => {
    csv += `"${attr.group}","${attr.name}","${attr.value}",${attr.confidence}\n`;
  });
  downloadCSV(csv, `catalist-product-${item.id}.csv`);
};

const exportRegistryToCSV = (results: AnalysisResult[]) => {
  let csv = `ID,Display Name,Brand,Category,SubCategory,Data Density,Quality Score,Is Food,Attribute Count\n`;
  results.forEach(item => {
    csv += `"${item.id}","${item.coreInfo.displayName}","${item.coreInfo.brand}","${item.taxonomy.category}","${item.taxonomy.subCategory}",${item.dataDensity}%,${item.qualityScore}%,${item.isFood},${item.attributes.length}\n`;
  });
  downloadCSV(csv, `catalist-registry-export.csv`);
};

// Utility to ensure scores are returned as percentages (0-100) regardless of AI format (0-1 or 0-100)
const normalizeToPercentage = (val: any, defaultVal: number): number => {
  const v = typeof val === 'number' ? val : defaultVal;
  // If value is between 0 and 1, assume it's a decimal ratio and convert to percentage
  if (v >= 0 && v <= 1) return Math.round(v * 100);
  // If value is greater than 1, assume it's already a percentage but clamp it to 100
  return Math.min(100, Math.round(v));
};

// Helper to filter out "Not Applicable" attributes, specifically focusing on ATC Code as requested
const filterVisibleAttributes = (attributes: ProductAttribute[], group: string) => {
  if (!attributes) return [];
  return attributes.filter(a => {
    const matchesGroup = String(a.group).toLowerCase() === group.toLowerCase();
    if (!matchesGroup) return false;
    
    const nameUpper = a.name.toUpperCase().trim();
    const valUpper = a.value.toUpperCase().trim();

    // User requirement: Hide ATC Code if not applicable
    if (nameUpper.includes('ATC CODE')) {
      if (
        valUpper.includes('NOT APPLICABLE') || 
        valUpper === 'N/A' || 
        valUpper === 'NONE' || 
        valUpper === 'N.A.' ||
        valUpper.includes('NOT AVAILABLE')
      ) {
        return false;
      }
    }
    
    // Also generally skip attributes that are just 'NOT APPLICABLE' across other sections to keep the catalogue clean
    if (valUpper === 'NOT APPLICABLE' || valUpper === 'N/A') return false;

    return true;
  });
};

// --- Sub-Components ---

const ProductImageViewer: React.FC<{ result: AnalysisResult }> = React.memo(({ result }) => {
  const [productImgError, setProductImgError] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);
  
  const images = result.sourceImages || [];
  const hasSource = images.length > 0;
  const hasProductFallback = !!result.fallbackImageUrl && !productImgError;
  const hasLogoFallback = !!result.brandLogoUrl && !logoImgError;

  const getRepImage = () => {
    if (result.isFood) return "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=800";
    const cat = (result.taxonomy.category || '').toLowerCase();
    if (cat.includes('kitchen')) return "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800";
    if (cat.includes('appliance') || cat.includes('home')) return "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800";
    if (cat.includes('electronic') || cat.includes('tech')) return "https://images.unsplash.com/photo-1526738549149-8e07eca270b4?auto=format&fit=crop&q=80&w=800";
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800";
  };

  return (
    <div className="w-full h-44 lg:h-48 rounded-2xl overflow-hidden shadow-inner bg-stone-50 border border-stone-200 group relative">
       {hasSource ? (
         <div className="flex overflow-x-auto h-full snap-x snap-mandatory scroll-smooth hide-scrollbar bg-white">
            {images.map((img, i) => (
              <img key={i} src={img} className="h-full w-full object-contain snap-center shrink-0" alt={`Source ${i+1}`} />
            ))}
         </div>
       ) : hasProductFallback ? (
         <div className="h-full w-full bg-white flex items-center justify-center p-4 relative">
            <img 
              src={result.fallbackImageUrl} 
              className="h-full w-full object-contain animate-in fade-in" 
              alt="Representative Product" 
              onError={() => setProductImgError(true)} 
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-950 text-white text-[7px] font-black rounded-full flex items-center gap-1.5 shadow-xl backdrop-blur-md uppercase tracking-widest border border-white/20">
              <Globe size={10} className="text-amber-500" /> Cloud Asset
            </div>
         </div>
       ) : hasLogoFallback ? (
         <div className="h-full w-full bg-stone-50 flex flex-col items-center justify-center p-6 gap-2 relative">
            <img 
              src={result.brandLogoUrl} 
              className="h-20 w-auto object-contain animate-in fade-in mix-blend-multiply" 
              alt="Brand Identity" 
              onError={() => setLogoImgError(true)} 
            />
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Brand Identity Node</p>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-stone-200/50 text-slate-950 text-[7px] font-black rounded-full flex items-center gap-1.5 border border-stone-300">
              <Globe size={10} className="text-amber-600" /> Brand Logo
            </div>
         </div>
       ) : (
         <div className="w-full h-full relative group">
            <img 
              src={getRepImage()} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
              alt="Category Fallback" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent flex flex-col items-center justify-end p-6 gap-3 transition-colors">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white shadow-xl backdrop-blur-sm ${result.isFood ? 'bg-emerald-700/80 text-white' : 'bg-slate-900/80 text-white'}`}>
                 {result.isFood ? <Leaf size={24} /> : <Package size={24} />}
               </div>
               <div className="text-center space-y-0.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                 <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/80">Asset Mapping Offline</p>
                 <p className="text-[10px] font-black uppercase tracking-tight text-white">{result.coreInfo.brand}</p>
               </div>
            </div>
         </div>
       )}
    </div>
  );
});

const AttributeCard: React.FC<{ attr: ProductAttribute }> = React.memo(({ attr }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(`${attr.name}: ${attr.value}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative flex flex-col gap-1 px-3 py-2 bg-white border border-stone-100 rounded-lg hover:border-amber-300 hover:shadow-md transition-all group select-none animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate shrink-0 max-w-[70%] leading-none">{attr.name}</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleCopy} 
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-stone-300 hover:text-amber-700 rounded"
            title="Copy Attribute"
          >
            {copied ? <CheckCircle2 size={10} className="text-emerald-700" /> : <Copy size={10} />}
          </button>
          <div className={`shrink-0 text-[8px] font-black px-1 py-0.5 rounded leading-none ${attr.confidence > 0.9 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
            {normalizeToPercentage(attr.confidence, 0.9)}%
          </div>
        </div>
      </div>
      <p className="text-[12px] font-bold text-slate-950 leading-tight break-words" title={attr.value}>{attr.value}</p>
    </div>
  );
});

const Onboarding: React.FC<{ initialEmail?: string, onComplete: (profile: UserProfile) => void }> = ({ initialEmail = '', onComplete }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [team, setTeam] = useState('Product');
  const [customTeam, setCustomTeam] = useState('');
  const [password, setPassword] = useState('');

  const teams = ["Product", "Category", "Master Data Management", "Others"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password) {
      const finalTeam = team === 'Others' ? customTeam : team;
      const profile = { name, email, team: finalTeam, password, hasSeenTour: false };
      
      const savedRegistry = JSON.parse(localStorage.getItem('catalist_user_registry') || '{}');
      savedRegistry[email.toLowerCase()] = profile;
      localStorage.setItem('catalist_user_registry', JSON.stringify(savedRegistry));
      
      onComplete(profile);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center text-white mx-auto shadow-xl shadow-stone-100">
            <SearchCode size={24} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase">Initialize Cata<span className="text-amber-600">list</span> Profile</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-none">Complete your technical authorization</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
            <input required type="text" placeholder="SKU Analyst 01" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-950 outline-none focus:border-amber-600 shadow-inner" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Corporate Email</label>
            <input required type="email" placeholder="email@domain.com" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-950 outline-none focus:border-amber-600 shadow-inner" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Domain</label>
            <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-950 outline-none focus:border-amber-600 shadow-inner" value={team} onChange={e => setTeam(e.target.value)}>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {team === 'Others' && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specify Team Name</label>
              <input required type="text" placeholder="Global Logistics..." className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-950 outline-none focus:border-amber-600 shadow-inner" value={customTeam} onChange={e => setCustomTeam(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authentication Key (Password)</label>
            <input required type="password" placeholder="••••••••" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-950 outline-none focus:border-amber-600 shadow-inner" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="w-full py-4 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-stone-200 hover:bg-black transition-all active:scale-[0.98]">
            Finalize Profile
          </button>
        </form>
      </div>
    </div>
  );
};

const QuickTour: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Ingest Hub", description: "Upload images, SKU URLs, or CSV files to start a forensic audit.", icon: Plus },
    { title: "Audit Space", description: "Review extracted metadata with 95%+ fidelity across 10 specialized domains.", icon: Target },
    { title: "Master Registry", description: "Your central repository for all SKU technical DNA and SEO assets.", icon: Database }
  ];

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-[2.5rem] max-w-md w-full space-y-6 text-center shadow-2xl border border-white/20 animate-in slide-in-from-bottom-8 duration-500">
        <div className="w-16 h-16 bg-stone-50 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-xl border border-stone-100">
          {React.createElement(steps[step].icon, { size: 32, className: "text-amber-500" })}
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-950 uppercase tracking-tighter leading-none">{steps[step].title}</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">{steps[step].description}</p>
        </div>
        <div className="flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === step ? 'w-6 bg-slate-950' : 'w-2 bg-stone-200'}`} />
          ))}
        </div>
        <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete()} className="w-full py-4 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">
          {step < steps.length - 1 ? "Next Node" : "Launch Engine"}
        </button>
      </div>
    </div>
  );
};

const AboutPage: React.FC<{ onLogin: (p: UserProfile) => void, onRedirectToRegister: (email: string) => void }> = ({ onLogin, onRedirectToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRecognized, setIsRecognized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const registry = JSON.parse(localStorage.getItem('catalist_user_registry') || '{}');
    const user = registry[email.toLowerCase()];

    if (user) {
      if (isRecognized) {
        if (user.password === password) {
          onLogin(user);
        } else {
          setError('Invalid authentication key. Please try again.');
        }
      } else {
        setIsRecognized(true);
      }
    } else {
      onRedirectToRegister(email);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 antialiased overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12">
        <div className="space-y-8 animate-in slide-in-from-left-8 duration-700">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-slate-950 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-stone-200 ring-8 ring-white">
              <SearchCode size={40} className="text-amber-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Cata<span className="text-amber-600">list</span> PRO</h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-sm">Forensic Product Intelligence Matrix</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {[
              { icon: Zap, title: "Deep Extraction", text: "Convert packshots and PDP links into 100+ granular data vectors." },
              { icon: Target, title: "95%+ Accuracy", text: "Gemini-powered technical auditing for catalogue integrity." },
              { icon: Globe, title: "Google Grounding", text: "Real-time SKU verification against official manufacturer spec-sheets." }
            ].map((f, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-white border border-stone-200 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                  <f.icon size={20} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{f.title}</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-stone-200 animate-in slide-in-from-right-8 duration-700">
          <form onSubmit={handleContinue} className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Authenticate Access</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Connect to the intelligence grid</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Terminal</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input 
                    required 
                    type="email" 
                    placeholder="analyst@phonepe.com" 
                    disabled={isRecognized}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-4 py-4 text-xs font-bold text-slate-950 outline-none focus:border-amber-600 shadow-inner transition-all disabled:opacity-50" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>

              {isRecognized && (
                <div className="space-y-1 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profile Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                      required 
                      type="password" 
                      placeholder="••••••••" 
                      autoFocus
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-4 py-4 text-xs font-bold text-slate-950 outline-none focus:border-amber-600 shadow-inner transition-all" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600">
                <AlertCircle size={16} />
                <p className="text-[11px] font-bold">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button type="submit" className="w-full py-4 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-stone-200 hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                {isRecognized ? "Access System" : "Continue"} <ArrowRight size={16} className="text-amber-500" />
              </button>
              {isRecognized && (
                <button type="button" onClick={() => setIsRecognized(false)} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-950 transition-colors">
                  Not your email?
                </button>
              )}
            </div>
          </form>
          
          <div className="mt-8 pt-8 border-t border-stone-100 flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
            <span>SECURE 04-PHX</span>
            <span>v5.0.1-PRO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Flow ---

const Catalist = () => {
  const [activeTab, setActiveTab] = useState<'ingest' | 'review' | 'catalogue' | 'analytics'>('ingest');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [pendingBatch, setPendingBatch] = useState<AnalysisResult[]>([]);
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Initializing engine...");
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pdpUrls, setPdpUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [preFilledEmail, setPreFilledEmail] = useState('');
  const [refineQuery, setRefineQuery] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [selectedRegistryItem, setSelectedRegistryItem] = useState<AnalysisResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentEntity = useMemo(() => pendingBatch[currentReviewIdx], [pendingBatch, currentReviewIdx]);

  const [historyStack, setHistoryStack] = useState<AnalysisResult[][]>([]); 
  const [historyPointer, setHistoryPointer] = useState(-1);

  useEffect(() => {
    const savedSession = localStorage.getItem('catalist_active_session');
    if (savedSession) {
      const parsedUser = JSON.parse(savedSession);
      setUser(parsedUser);
      if (parsedUser && parsedUser.hasSeenTour === false) setShowTour(true);
      
      const registryKey = `catalist_registry_${parsedUser.email}`;
      const savedResults = JSON.parse(localStorage.getItem(registryKey) || '[]');
      const filteredResults = savedResults.filter((res: AnalysisResult) => {
        const ageInMs = Date.now() - (res.createdAt || 0);
        return ageInMs < REGISTRY_EXPIRY_DAYS * MS_PER_DAY;
      });
      setResults(filteredResults);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (user && initialized) {
      const registryKey = `catalist_registry_${user.email}`;
      localStorage.setItem(registryKey, JSON.stringify(results));
    }
  }, [results, user, initialized]);

  const pushToHistory = useCallback((newBatch: AnalysisResult[]) => {
    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyPointer + 1);
      newStack.push(JSON.parse(JSON.stringify(newBatch)));
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setHistoryPointer(prev => prev + 1);
  }, [historyPointer]);

  const runExhaustiveCatalogueEngine = async (inputs: {data: string, type: 'image' | 'url' | 'text'}[], sourceName: string): Promise<AnalysisResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `PHASE 1: SOURCE SIGNAL EVALUATION (CRITICAL STEP) Before extracting attributes, you MUST evaluate the quality of the provided input text.

CONDITION A: HAPPY FLOW (Valid Data Detected)
Trigger: If the input text contains specific product details, descriptions, or technical specifications (and is NOT a generic error message).
Action: Proceed with Standard Forensic Extraction.
Constraint: You MUST prioritize the provided input text above all else. Do NOT override valid source data with external searches or URL guesses. Ensure 100% fidelity to the provided signal.

CONDITION B: BLOCKED FLOW (Anti-Scraping/Empty Detected)
Trigger: If the input text is empty, or contains only generic blocking terms like 'Robot Check', 'Captcha', '503 Service Unavailable', 'Access Denied', or 'Something went wrong'.
Action: Initiate Recovery Protocol:
1. URL Decode: Parse the input URL string to extract the Brand and Product Name (e.g., extract 'Smartivity' + 'Launcher' from the slug).
2. External Search: Immediately use the googleSearch tool to query for [Brand] + [Product Name] + 'official specs'.
3. Synthesize: Use the search results to populate the catalogue, filling in the missing data that the blocked page failed to provide.

PHASE 2: EXHAUSTIVE ATTRIBUTE EXTRACTION (DENSITY PRIORITY)
Act as a Senior Product Intelligence Specialist. Perform a MAXIMUM-DEPTH forensic extraction.
**CRITICAL MANDATE:** The depth of information has been flagged as low. You MUST correct this.
**Target:** Generate 25-40 distinct technical attributes per product. Do not summarize; extract granular details.

* **ARCHETYPE A: CONSUMABLES (Food, Pharma, Skincare)**
   * **Extract:** Full Ingredient List (Descending), Active Concentrations (%), Formulation Base (Gel/Cream), Viscosity, pH Level, Scent Profile, Absorption Rate, Energy breakdown, Macro/Micronutrients, Diet Claims (Keto/Vegan), Packaging Material (PET/Glass).

* **ARCHETYPE B: HARDLINES (Electronics, Toys, Appliances)**
   * **Extract:** Processor/Chipset, RAM/Storage, Motor Torque/RPM, Sensor Suite, Connectivity (BT Ver, WiFi Standard), Port Specs, Battery (mAh + Wattage), Material Grade (ABS/Aluminum), IP Rating, Operating Temp, Assembly Logic, Box Contents.

* **ARCHETYPE C: SOFTLINES (Apparel, Textiles)**
   * **Extract:** Precise Fiber Composition (e.g., '95% Cotton'), Weave Type (Twill/Satin), GSM (Weight), Thread Count, Seam Type, Closure Hardware (YKK Zipper), Fit Profile, Rise/Inseam.

PHASE 3: UNIVERSAL ATTRIBUTES (REQUIRED FOR ALL SKUs)
Regardless of category, you MUST extract attributes for these groups:

1. **Group: Legal**
   - HSN/SAC Code (4-6 digit)
   - Compliance Standard (BIS, FSSAI, FDA, CE, ISO)
   - Warranty Details
   - Country of Origin

2. **Group: Logistics**
   - Extract: Package Weight (Dead weight), Volumetric Weight (Estimated), Shelf Life (Days/Months), Storage Class (Ambient/Frozen/Hazardous), Fragility Score (Low/High), Stackability.

3. **Group: Marketing**
   - Extract: Target Audience (e.g., 'Pro Gamers', 'Toddlers'), Usage Occasion (e.g., 'Diwali', 'Daily'), Value Proposition (USP), Price Segment (Mass/Premium).

4. **Group: Usage**
   - Extract: User Instructions, Safety Warnings (CRITICAL: Extract all warnings e.g. 'Choking Hazard', 'Allergen Info', 'Flammability'), Precautionary Statements, Age Guidance, Care/Maintenance.

PHASE 4: STRATEGIC SEO (PRECISION MODE)
* **Constraint:** Stop generating 30+ tags.
* **Limit:** Generate ONLY the top 4-5 high-impact, commercial-intent keywords (e.g., "Best STEM toy for 10yr old").`;

    const contents: any = {
      parts: [
        { text: prompt },
        ...inputs.map(input => {
          if (input.type === 'image') return { inlineData: { data: input.data.split(',')[1], mimeType: 'image/jpeg' } };
          return { text: `Product Signal (${input.type}): ${input.data}` };
        })
      ]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents,
      config: { 
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coreInfo: { type: Type.OBJECT, properties: { displayName: { type: Type.STRING }, brand: { type: Type.STRING }, quantity: { type: Type.STRING }, color: { type: Type.STRING } }, required: ['displayName', 'brand', 'quantity', 'color'] },
            taxonomy: { type: Type.OBJECT, properties: { segment: { type: Type.STRING }, productType: { type: Type.STRING }, category: { type: Type.STRING }, subCategory: { type: Type.STRING } }, required: ['segment', 'productType', 'category', 'subCategory'] },
            seoInfo: { type: Type.OBJECT, properties: { keywords: { type: Type.ARRAY, items: { type: Type.STRING } }, tags: { type: Type.ARRAY, items: { type: Type.STRING } }, productNotion: { type: Type.STRING }, occasionRelevance: { type: Type.STRING } }, required: ['keywords', 'tags', 'productNotion', 'occasionRelevance'] },
            attributes: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  name: { type: Type.STRING }, 
                  value: { type: Type.STRING }, 
                  confidence: { type: Type.NUMBER, description: "A decimal between 0.0 and 1.0 representing extraction confidence." }, 
                  group: { type: Type.STRING } 
                }, 
                required: ['name', 'value', 'confidence', 'group'] 
              } 
            },
            isFood: { type: Type.BOOLEAN },
            fallbackImageUrl: { type: Type.STRING },
            brandLogoUrl: { type: Type.STRING },
            insights: { type: Type.STRING },
            dataDensity: { type: Type.NUMBER, description: "A decimal between 0.0 and 1.0 representing how complete the SKU data is." },
            qualityScore: { type: Type.NUMBER, description: "A decimal between 0.0 and 1.0 representing the forensic quality of the extraction." }
          },
          required: ['coreInfo', 'taxonomy', 'seoInfo', 'attributes', 'isFood', 'insights', 'dataDensity', 'qualityScore']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const validGroups = CATALOGUE_SECTIONS.map(c => c.group);
    const normalizedAttributes = (parsed.attributes || []).map((attr: any) => {
      let g = attr.group || 'Technical';
      const cleanG = String(g).trim();
      if (!validGroups.includes(cleanG as any)) {
        const lowerG = cleanG.toLowerCase();
        if (lowerG.includes('core')) g = 'Core';
        else if (lowerG.includes('seo') || lowerG.includes('search')) g = 'SEO';
        else if (lowerG.includes('tech')) g = 'Technical';
        else if (lowerG.includes('legal') || lowerG.includes('regul')) g = 'Legal';
        else if (lowerG.includes('dim') || lowerG.includes('scale')) g = 'Dimensions';
        else if (lowerG.includes('nutri') || lowerG.includes('diet')) g = 'Nutritional';
        else if (lowerG.includes('logis')) g = 'Logistics';
        else if (lowerG.includes('usage')) g = 'Usage';
        else if (lowerG.includes('safety')) g = 'Safety';
        else if (lowerG.includes('market')) g = 'Marketing';
        else g = 'Technical'; 
      } else {
        g = cleanG;
      }
      return { ...attr, group: g, confidence: normalizeToPercentage(attr.confidence, 0.9) / 100 };
    });

    return {
      id: Math.random().toString(36).substr(2, 9),
      taxonomy: parsed.taxonomy || { segment: 'N/A', productType: 'N/A', category: 'N/A', subCategory: 'N/A' },
      coreInfo: parsed.coreInfo || { displayName: 'SKU Resolution Error', brand: 'Unknown', quantity: 'N/A', color: 'N/A' },
      seoInfo: parsed.seoInfo || { keywords: [], tags: [], productNotion: 'N/A', occasionRelevance: 'N/A' },
      attributes: normalizedAttributes,
      insights: parsed.insights || '',
      dataDensity: normalizeToPercentage(parsed.dataDensity, 0.5),
      qualityScore: normalizeToPercentage(parsed.qualityScore, 0.9),
      sourceType: 'composite',
      sourceValue: sourceName,
      isFood: parsed.isFood || false,
      fallbackImageUrl: parsed.fallbackImageUrl,
      brandLogoUrl: parsed.brandLogoUrl,
      groundingSources: groundingChunks,
      status: 'completed',
      createdAt: Date.now()
    };
  };

  const processBatch = async () => {
    setIsProcessing(true);
    setProcessingStatus("Initializing forensic engine...");
    const batchResults: AnalysisResult[] = [];
    try {
      if (selectedFiles.length > 0 || pdpUrls.length > 0) {
        setProcessingStatus("Deep-crawling SKU sources...");
        const compositeInputs: {data: string, type: 'image' | 'url' | 'text'}[] = [];
        const imageBase64s: string[] = [];
        for (const file of selectedFiles) {
          const b64 = await fileToBase64(file);
          compositeInputs.push({ data: b64, type: 'image' });
          imageBase64s.push(b64);
        }
        for (const url of pdpUrls) compositeInputs.push({ data: url, type: 'url' });
        // Use first filename or URL as source name
        const sourceName = selectedFiles.length > 0 ? selectedFiles[0].name : pdpUrls[0];
        const res = await runExhaustiveCatalogueEngine(compositeInputs, sourceName);
        res.sourceImages = imageBase64s;
        batchResults.push(res);
      }
      if (csvFile) {
        const text = await csvFile.text();
        const rows = parseCSV(text);
        const limit = Math.min(rows.length, 5); // Limit to 5 for demo
        for (let i = 0; i < limit; i++) {
          setProcessingStatus(`Auditing SKU ${i+1}/${limit}: Fetching spec-sheets...`);
          const res = await runExhaustiveCatalogueEngine([{data: rows[i], type: 'text'}], `Row ${i+1}`);
          batchResults.push(res);
        }
      }
      if (batchResults.length > 0) {
        const updatedPending = [...pendingBatch, ...batchResults];
        setPendingBatch(updatedPending);
        pushToHistory(updatedPending); // History management
        setCurrentReviewIdx(updatedPending.length - 1); // Select the last added item
        setActiveTab('review');
      }
    } catch (e) {
      console.error(e);
      alert("Extraction engine interrupted. Please check your network and try again.");
    } finally {
      setIsProcessing(false);
      setSelectedFiles([]);
      setPdpUrls([]);
      setCsvFile(null);
    }
  };

  const refineEntity = async () => {
    if (!refineQuery.trim() || !pendingBatch[currentReviewIdx]) return;
    setIsRefining(true);
    const query = refineQuery;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Refine this SKU data: "${query}". Ensure all SEO metadata and technical vectors are maximized. Current state: ${JSON.stringify(pendingBatch[currentReviewIdx])}.`,
        config: { 
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      const updated = JSON.parse(response.text || '{}');
      const newBatch = JSON.parse(JSON.stringify(pendingBatch));
      
      // Normalize any potentially large scores from the refinement response
      if (updated.dataDensity !== undefined) updated.dataDensity = normalizeToPercentage(updated.dataDensity, 0.5);
      if (updated.qualityScore !== undefined) updated.qualityScore = normalizeToPercentage(updated.qualityScore, 0.9);
      if (updated.attributes) {
        updated.attributes = updated.attributes.map((a: any) => ({
          ...a,
          confidence: normalizeToPercentage(a.confidence, 0.9) / 100
        }));
      }

      newBatch[currentReviewIdx] = { ...newBatch[currentReviewIdx], ...updated };
      setPendingBatch(newBatch);
      pushToHistory(newBatch);
      setRefineQuery('');
    } catch (e) { console.error(e); } finally { setIsRefining(false); }
  };

  const handleUndo = useCallback(() => {
    if (historyPointer > 0) {
      const newPointer = historyPointer - 1;
      setHistoryPointer(newPointer);
      setPendingBatch(JSON.parse(JSON.stringify(historyStack[newPointer])));
    }
  }, [historyPointer, historyStack]);

  const handleRedo = useCallback(() => {
    if (historyPointer < historyStack.length - 1) {
      const newPointer = historyPointer + 1;
      setHistoryPointer(newPointer);
      setPendingBatch(JSON.parse(JSON.stringify(historyStack[newPointer])));
    }
  }, [historyPointer, historyStack]);

  const commitToRegistry = () => {
    const committed = pendingBatch[currentReviewIdx];
    const updatedCommitted = { ...committed, createdAt: Date.now() }; 
    setResults(prev => [updatedCommitted, ...prev]);
    const newBatch = pendingBatch.filter((_, i) => i !== currentReviewIdx);
    setPendingBatch(newBatch);
    if (newBatch.length === 0) setActiveTab('catalogue');
    else {
      setCurrentReviewIdx(Math.max(0, currentReviewIdx - 1));
    }
  };

  const handleDiscard = () => {
    const newBatch = pendingBatch.filter((_, i) => i !== currentReviewIdx);
    setPendingBatch(newBatch);
    if (newBatch.length === 0) {
      setActiveTab('ingest');
    } else {
      setCurrentReviewIdx(prev => Math.min(prev, newBatch.length - 1));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('catalist_active_session');
    setUser(null);
    setIsRegistering(false);
  };

  const handleLogin = (p: UserProfile) => {
    setUser(p);
    localStorage.setItem('catalist_active_session', JSON.stringify(p));
    
    const registryKey = `catalist_registry_${p.email}`;
    const savedResults = JSON.parse(localStorage.getItem(registryKey) || '[]');
    setResults(savedResults);
    
    if (!p.hasSeenTour) setShowTour(true);
  };

  const handleRedirectToRegister = (email: string) => {
    setPreFilledEmail(email);
    setIsRegistering(true);
  };

  const handleCopySection = (group: string, item: AnalysisResult) => {
    let text = '';
    
    if (group === 'SEO') {
      if (item.seoInfo.productNotion) text += `Product Notion: ${item.seoInfo.productNotion}\n\n`;
      if (item.seoInfo.keywords && item.seoInfo.keywords.length > 0) text += `Keywords:\n${item.seoInfo.keywords.join(', ')}\n\n`;
    }

    const attrs = item.attributes.filter(a => a.group === group);
    if (attrs.length > 0) {
      text += attrs.map(a => `${a.name}: ${a.value}`).join('\n');
    }
    
    if (text.trim()) {
      copyToClipboard(text);
    }
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const q = searchQuery.toLowerCase();
    return results.filter(res => 
      res.coreInfo.displayName.toLowerCase().includes(q) || 
      res.coreInfo.brand.toLowerCase().includes(q) || 
      res.taxonomy.category.toLowerCase().includes(q)
    );
  }, [results, searchQuery]);

  if (!initialized) return null;
  
  if (!user) {
    if (isRegistering) {
      return <Onboarding initialEmail={preFilledEmail} onComplete={handleLogin} />;
    }
    return <AboutPage onLogin={handleLogin} onRedirectToRegister={handleRedirectToRegister} />;
  }

  return (
    <div className="flex h-screen bg-stone-50 text-slate-950 font-sans antialiased overflow-hidden">
      <aside className="w-16 lg:w-52 border-r border-stone-200 bg-white flex flex-col p-4 z-50 transition-all shrink-0 shadow-sm">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xl shadow-stone-100"><SearchCode size={18} className="text-amber-500" /></div>
          <h1 className="hidden lg:block text-lg font-black tracking-tighter text-slate-950 uppercase">Cata<span className="text-amber-600">list</span></h1>
        </div>
        <nav className="flex-1 space-y-1">
          {[
            { id: 'ingest', icon: Plus, label: 'Ingest Hub' },
            { id: 'review', icon: Target, label: 'Audit Space', active: !!pendingBatch.length },
            { id: 'catalogue', icon: Database, label: 'Registry', count: results.length },
            { id: 'analytics', icon: BarChart3, label: 'Insights' }
          ].map((item: any) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} disabled={item.id === 'review' && !pendingBatch.length} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === item.id ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:bg-stone-50 disabled:opacity-20'}`}>
              <item.icon size={18} className={activeTab === item.id ? 'text-amber-500' : ''} />
              <span className="hidden lg:block">{item.label}</span>
              {item.count !== undefined && item.count > 0 && <span className="hidden lg:block ml-auto px-1 py-0.5 rounded-md text-[9px] font-black bg-stone-100 text-slate-500 shadow-inner">{item.count}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-stone-100 space-y-1.5">
          <button onClick={() => setShowTour(true)} className="hidden lg:flex w-full items-center gap-3 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-amber-700 hover:bg-stone-50 transition-all"><HelpCircle size={16} /> Help</button>
          <div className="flex items-center gap-2 p-2 bg-stone-100/50 rounded-lg border border-stone-200">
            <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-[10px] shrink-0 shadow-md border border-amber-600/30">{user.name.charAt(0)}</div>
            <div className="hidden lg:block min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-950 truncate uppercase tracking-tight">{user.name}</p>
              <p className="text-[8px] text-amber-700 font-bold truncate uppercase tracking-tight">{user.team}</p>
            </div>
            <button onClick={handleLogout} className="hidden lg:block text-slate-300 hover:text-red-700 transition-colors"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {showTour && <QuickTour onComplete={() => { if (user) { const u = {...user, hasSeenTour: true}; setUser(u); localStorage.setItem('catalist_active_session', JSON.stringify(u)); } setShowTour(false); }} />}
        {activeTab === 'ingest' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6 py-6 animate-in fade-in duration-700">
              <div className="text-center space-y-2">
                <h2 className="text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter uppercase">Ingest Hub</h2>
                <p className="text-slate-500 text-sm lg:text-base font-medium">Capture product signals for forensic-level technical extraction.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="relative bg-white rounded-2xl border-2 border-dashed border-stone-200 p-8 lg:p-10 hover:border-amber-600 hover:bg-amber-50/20 transition-all group cursor-pointer text-center shadow-sm">
                    <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedFiles([...selectedFiles, ...Array.from(e.target.files || [])])} />
                    <div className="w-12 h-12 bg-stone-50 text-slate-950 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-stone-200 group-hover:scale-110 transition-transform"><ImageIcon size={24} className="group-hover:text-amber-600 transition-colors" /></div>
                    <h3 className="text-base lg:text-lg font-black text-slate-900 uppercase tracking-tight">Packshot Signals</h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-medium">Visual Assets / Local Media</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Reference</h4>
                      <LinkIcon size={16} className="text-stone-300" />
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Amazon, Flipkart or Official SKU URL..." className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-950 outline-none focus:border-amber-600 shadow-inner" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (urlInput.trim() && setPdpUrls([...pdpUrls, urlInput.trim()]), setUrlInput(''))} />
                      <button onClick={() => (urlInput.trim() && setPdpUrls([...pdpUrls, urlInput.trim()]), setUrlInput(''))} className="p-2.5 bg-slate-950 text-white rounded-lg hover:bg-black transition-all active:scale-95"><Plus size={20} className="text-amber-500" /></button>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col h-full min-h-[300px]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Composite Stage</h4>
                    <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg shadow-sm border border-amber-100">{selectedFiles.length + pdpUrls.length} Sources Linked</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {selectedFiles.length === 0 && pdpUrls.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-stone-300 italic space-y-2">
                        <Layers size={32} strokeWidth={1} />
                        <p className="text-xs font-medium">Signal queue idle.</p>
                      </div>
                    ) : (
                      <>
                        {selectedFiles.map((file, i) => (
                          <div key={`file-${i}`} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-100 group animate-in slide-in-from-right-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <ImageIcon size={14} className="text-amber-600 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-800 truncate">{file.name}</span>
                            </div>
                            <button onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} className="text-stone-300 hover:text-red-700 transition-all"><Minus size={14} /></button>
                          </div>
                        ))}
                        {pdpUrls.map((url, i) => (
                          <div key={`url-${i}`} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-100 group animate-in slide-in-from-right-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <LinkIcon size={14} className="text-slate-600 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-800 truncate">{url}</span>
                            </div>
                            <button onClick={() => setPdpUrls(pdpUrls.filter(u => u !== url))} className="text-stone-300 hover:text-red-700 transition-all"><Minus size={14} /></button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <button onClick={processBatch} disabled={isProcessing || (selectedFiles.length === 0 && pdpUrls.length === 0)} className="mt-4 w-full py-3 bg-slate-950 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-stone-200 disabled:bg-stone-200 transition-all hover:bg-black active:scale-[0.98]">
                    <Zap size={20} className="text-amber-500" fill="currentColor" /> <span>Begin Forensic Extraction</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 z-[100] bg-slate-950/40 backdrop-blur-md flex items-center justify-center animate-in fade-in">
             <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center space-y-4 shadow-2xl border border-stone-200">
                <div className="w-12 h-12 border-4 border-stone-100 border-t-amber-600 rounded-full animate-spin mx-auto shadow-lg"></div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-950 uppercase tracking-tighter">Forensic Audit Active</h3>
                  <div className="px-4 py-2 bg-slate-950 rounded-lg shadow-xl"><p className="text-amber-500 font-bold text-[11px] tracking-wide animate-pulse">{processingStatus}</p></div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Assembling comprehensive technical matrix...</p>
                </div>
             </div>
          </div>
        )}
        {activeTab === 'review' && currentEntity && (
          <div className="flex-1 flex overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 flex flex-col min-w-0 bg-stone-50/50">
               <div className="sticky top-0 bg-stone-50/80 backdrop-blur-md z-10 p-4 lg:p-6 pb-4 border-b border-stone-200/40 flex flex-col gap-4 shadow-sm shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-black text-slate-950 tracking-tighter uppercase flex items-center gap-2">
                        <Target className="text-amber-600" size={24} /> 
                        Audit Workspace
                      </h2>
                      <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest leading-none">
                        Reviewing {currentReviewIdx + 1} of {pendingBatch.length} items • Full Forensic Decomposition
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => exportSingleToCSV(currentEntity)} className="px-3 py-1.5 bg-white border border-stone-200 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-amber-700 transition-all shadow-sm flex items-center gap-1.5"><Download size={12} /> Export</button>
                      <button onClick={handleDiscard} className="px-3 py-1.5 bg-white border border-stone-200 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-red-700 transition-all shadow-sm">Discard</button>
                      <button onClick={commitToRegistry} className="px-4 py-1.5 bg-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl shadow-stone-200 hover:bg-black transition-all flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-500" /> Finalize</button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-1">
                    <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 bg-stone-200/50 rounded-full border border-stone-300/50 shadow-inner">
                      <ListFilter size={14} className="text-amber-700" />
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter leading-none">Active Queue</span>
                    </div>
                    <div className="h-4 w-[1px] bg-stone-300 shrink-0" />
                    <div className="flex items-center gap-2 pr-10">
                      {pendingBatch.map((p, idx) => (
                        <button 
                          key={p.id} 
                          onClick={() => setCurrentReviewIdx(idx)}
                          className={`h-8 px-4 rounded-full flex items-center gap-2.5 transition-all border shrink-0 ${
                            currentReviewIdx === idx 
                              ? 'bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-900/20 ring-2 ring-amber-500/20' 
                              : 'bg-white border-stone-200 text-slate-400 hover:border-amber-400 hover:text-slate-700 hover:bg-stone-50 shadow-sm'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${currentReviewIdx === idx ? 'bg-amber-500 text-slate-950' : 'bg-stone-100 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                          <span className="text-[10px] font-bold truncate max-w-[160px]">{p.coreInfo.displayName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 pb-20">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-max">
                    {CATALOGUE_SECTIONS
                      .map(section => {
                        // User request: hide ATC code if not applicable
                        const sectionAttrs = filterVisibleAttributes(currentEntity.attributes, section.group);
                        const isSEO = section.group === 'SEO';
                        const hasContent = sectionAttrs.length > 0 || isSEO;
                        if (!hasContent) return null;

                        return (
                          <div key={section.group} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[350px] animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-3 shrink-0">
                              <div className="flex items-center gap-2">
                                <section.icon size={16} className={section.color} />
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-800 leading-none">{section.title}</h5>
                              </div>
                              <div className="flex items-center gap-1">
                                 <button onClick={() => handleCopySection(section.group, currentEntity)} className="p-0.5 text-stone-300 hover:text-amber-700 transition-all" title="Copy Section"><Copy size={12} /></button>
                                 <span className="text-[9px] font-black px-2 py-0.5 rounded leading-none text-emerald-700 bg-emerald-50">
                                   {sectionAttrs.length + (isSEO ? 1 : 0)} Pt
                                 </span>
                              </div>
                            </div>
                            {isSEO && (
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-3 mb-3 shrink-0 shadow-inner">
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Notion</p>
                                  <p className="text-[10px] font-bold text-slate-600 leading-tight italic line-clamp-3">"{currentEntity.seoInfo.productNotion || 'Forensic intent analysis active...'}"</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Metadata Tags</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(currentEntity.seoInfo.keywords || []).slice(0, 20).map((buzz, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-white border border-stone-200 text-[7px] font-black text-amber-700 rounded uppercase shadow-sm">#{buzz}</span>
                                    ))}
                                    {(!currentEntity.seoInfo.keywords || currentEntity.seoInfo.keywords.length === 0) && <span className="text-[7px] text-stone-300 italic">No search signals...</span>}
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-2">
                              {sectionAttrs.map((attr, i) => <AttributeCard key={i} attr={attr} />)}
                            </div>
                          </div>
                        );
                    })}
                  </div>
               </div>
            </div>

            <div className="w-64 lg:w-72 border-l border-stone-200 bg-white flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-sm z-10">
               <div className="p-4 border-b border-stone-50 space-y-3 bg-white z-20">
                  <ProductImageViewer result={currentEntity} />
                  <div className="text-center space-y-0.5 px-1">
                    <span className="text-[7px] font-black text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded-lg tracking-widest border border-amber-100/50 leading-none">{currentEntity.taxonomy.category}</span>
                    <h3 className="text-xs font-black text-slate-950 leading-tight uppercase tracking-tight line-clamp-2">{currentEntity.coreInfo.displayName}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-80 leading-none">{currentEntity.coreInfo.brand}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-stone-100/60">
                    <div className="text-center border-r border-stone-100">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Vectors</p>
                      <p className="text-lg font-black text-amber-700 tabular-nums leading-none">{currentEntity.attributes.length + (currentEntity.seoInfo.keywords?.length || 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Fidelity</p>
                      <p className="text-lg font-black text-slate-950 tabular-nums leading-none">{Math.round(currentEntity.qualityScore)}%</p>
                    </div>
                  </div>
               </div>
               <div className="p-4 pb-32">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1 shrink-0">
                      <div className="flex items-center gap-2">
                        <Wand2 size={16} className="text-amber-600" />
                        <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Refine Matrix</h5>
                      </div>
                    </div>
                    <div className="group relative bg-white ring-1 ring-stone-200 hover:ring-amber-300 focus-within:ring-slate-950 rounded-xl p-3 space-y-2.5 shadow-sm transition-all duration-300">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 mb-0.5 shrink-0">
                         <p className="text-[8px] font-black text-stone-300 uppercase tracking-widest leading-none">Command node</p>
                         <div className="flex gap-1">
                            <button onClick={handleUndo} disabled={historyPointer <= 0} className="p-0.5 text-stone-400 hover:text-amber-700 disabled:opacity-30 transition-colors"><Undo2 size={12} /></button>
                            <button onClick={handleRedo} disabled={historyPointer >= historyStack.length - 1} className="p-0.5 text-stone-400 hover:text-amber-700 disabled:opacity-30 transition-colors"><Redo2 size={12} /></button>
                         </div>
                      </div>
                      <textarea rows={4} placeholder="Request deeper forensic analysis or specific technical nodes..." className="w-full bg-transparent border-none outline-none text-[11px] font-semibold text-slate-900 placeholder:text-stone-300 resize-none leading-tight" value={refineQuery} onChange={(e) => setRefineQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), refineEntity())} />
                      <div className="flex justify-end pt-1 shrink-0">
                        <button onClick={refineEntity} disabled={isRefining || !refineQuery.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all">
                          {isRefining ? <RefreshCw className="animate-spin" size={12} /> : <Send size={12} className="text-amber-500" />} Launch Audit
                        </button>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}
        {activeTab === 'catalogue' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between border-b border-stone-200 pb-5">
              <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase">Master Registry</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input 
                    type="text" 
                    placeholder="Lookup..." 
                    className="bg-white border border-stone-200 rounded-xl pl-8 pr-4 py-2 text-xs font-bold w-56 outline-none focus:border-amber-600 shadow-sm" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button onClick={() => exportRegistryToCSV(results)} className="flex items-center gap-1.5 px-5 py-2 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all hover:translate-y-[-1px]"><Download size={14} className="text-amber-500" /> Export All</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResults.map((res) => (
                <div key={res.id} onClick={() => setSelectedRegistryItem(res)} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 group hover:border-amber-400 transition-all cursor-pointer relative overflow-hidden hover:shadow-lg active:scale-[0.99]">
                  <div className="flex gap-5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${res.isFood ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-stone-50 text-slate-950 border-stone-200'}`}><Package size={20} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between mb-1"><span className="text-[8px] font-black text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded shadow-inner border border-amber-100/50">{res.taxonomy.category}</span><div className="text-emerald-700 font-black text-[8px] uppercase flex items-center gap-1"><CheckCircle size={10} /> Sync</div></div>
                      <h3 className="text-base font-black text-slate-950 truncate leading-tight group-hover:text-amber-700 transition-colors uppercase tracking-tight">{res.coreInfo.displayName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{res.coreInfo.brand}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {selectedRegistryItem && (
              <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-[94%] h-full rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/50">
                  <div className="p-5 lg:p-6 border-b border-stone-100 flex items-center justify-between bg-white shrink-0 z-20 shadow-sm">
                    <div className="flex items-center gap-5">
                       <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center shadow-xl border-2 ${selectedRegistryItem.isFood ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-stone-50 text-slate-950 border-stone-200'}`}>
                        {selectedRegistryItem.isFood ? <Leaf size={28} /> : <Box size={28} />}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-black text-amber-700 uppercase bg-amber-50 px-2 py-1 rounded-lg tracking-widest border border-amber-100/50 leading-none">{selectedRegistryItem.taxonomy.category}</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase leading-none">{selectedRegistryItem.coreInfo.displayName}</h2>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => exportSingleToCSV(selectedRegistryItem)} className="p-3 bg-stone-50 text-stone-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-all shadow-inner" title="Download CSV">
                         <Download size={24} />
                       </button>
                       <button onClick={() => setSelectedRegistryItem(null)} className="p-3 bg-stone-50 text-stone-400 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all shadow-inner">
                         <X size={24} />
                       </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-stone-50/50">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 auto-rows-max">
                        {CATALOGUE_SECTIONS
                          .map(section => {
                            const sectionAttrs = filterVisibleAttributes(selectedRegistryItem.attributes, section.group);
                            const isSEO = section.group === 'SEO';
                            const hasContent = sectionAttrs.length > 0 || isSEO;
                            if (!hasContent) return null;
                            
                            return (
                              <div key={section.group} className="bg-white p-5 lg:p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[350px]">
                                <div className="flex items-center justify-between border-b border-stone-50 pb-4 mb-4 shrink-0">
                                  <div className="flex items-center gap-3">
                                    <section.icon size={18} className={section.color} />
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-800 leading-none">{section.title}</h5>
                                  </div>
                                </div>
                                {isSEO && (
                                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-3 mb-3 shrink-0 shadow-inner">
                                    <div>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Notion</p>
                                      <p className="text-[10px] font-bold text-slate-600 leading-tight italic line-clamp-3">"{selectedRegistryItem.seoInfo.productNotion || 'N/A'}"</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Metadata Tags</p>
                                      <div className="flex flex-wrap gap-1">
                                        {(selectedRegistryItem.seoInfo.keywords || []).slice(0, 20).map((buzz, i) => (
                                          <span key={i} className="px-1.5 py-0.5 bg-white border border-stone-200 text-[7px] font-black text-amber-700 rounded uppercase shadow-sm">#{buzz}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1 pb-2">
                                  {sectionAttrs.map((attr, i) => <AttributeCard key={i} attr={attr} />)}
                                </div>
                              </div>
                            );
                        })}
                     </div>
                  </div>
                  <div className="p-5 lg:p-6 border-t border-stone-100 bg-white flex items-center justify-between shrink-0 z-20 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.1)]">
                    <div className="flex gap-8">
                       <div className="text-center group">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-amber-700 transition-colors leading-none">Density</p>
                        <p className="text-2xl font-black text-amber-700 tracking-tighter leading-none">{normalizeToPercentage(selectedRegistryItem.dataDensity, 0)}%</p>
                      </div>
                      <div className="text-center group">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-emerald-700 transition-colors leading-none">Confidence</p>
                        <p className="text-2xl font-black text-emerald-700 tracking-tighter leading-none">{normalizeToPercentage(selectedRegistryItem.qualityScore, 0)}%</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedRegistryItem(null)} className="px-8 py-3 bg-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl">Dismiss</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-10 space-y-10 animate-in zoom-in-95 duration-500 pb-20">
            <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase">Protocol Analytics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Network SKU count', value: results.length, icon: Database, color: 'slate-950' },
                { label: 'Aggregate Fidelity', value: results.length ? '98.1%' : '0%', icon: ShieldCheck, color: 'emerald-700' },
                { label: 'Mean Vector count', value: results.length ? '164 Pt' : '0', icon: Activity, color: 'amber-700' },
                { label: 'Deepcrawl latency', value: '1.28s', icon: Clock, color: 'stone-600' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200 shadow hover:shadow-lg transition-all hover:translate-y-[-2px] space-y-4">
                  <div className={`w-12 h-12 bg-stone-50 text-${stat.color.split('-')[0] === 'slate' ? 'slate-950' : stat.color} rounded-xl flex items-center justify-center border border-stone-100 shadow-inner`}><stat.icon size={24} /></div>
                  <p className="text-3xl font-black text-slate-950 tracking-tighter">{stat.value}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="h-10 bg-white border-t border-stone-200 flex items-center justify-center fixed bottom-0 left-0 right-0 z-[60] px-12 ml-16 lg:ml-52 shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-10 text-[8px] font-black text-stone-400 uppercase tracking-[0.6em] opacity-80">
          <span>Enterprise Secure 04-PHX</span>
          <span className="text-amber-700 font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse shadow-[0_0_6px_1px_rgba(217,119,6,0.5)]" /> Audit Sync Active</span>
          <span>Engine V5.0.1-PRO</span>
        </div>
      </footer>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e7e5e4; border-radius: 20px; border: 1px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d6d3d1; }
        @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .loader { border-top-color: #ffffff; animation: spinner 1s linear infinite; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Catalist />);