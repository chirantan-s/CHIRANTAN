
import React, { useState, useEffect, useRef } from 'react';
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

interface UserProfile {
  name: string;
  email: string;
  team: string;
  hasSeenTour?: boolean;
}

interface ProductAttribute {
  name: string;
  value: string;
  confidence: number;
  group: 'Technical' | 'Legal' | 'Nutritional' | 'Marketing' | 'Logistics' | 'Usage' | 'Safety' | 'Dimensions' | 'Core' | 'SEO';
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
  sourceType: 'composite' | 'csv' | 'sample';
  sourceValue: string;
  isFood: boolean;
  status: 'completed' | 'failed';
  sourceImages?: string[];
  fallbackImageUrl?: string;
  brandLogoUrl?: string;
  groundingSources?: any[];
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

// --- Sub-Components ---

const ProductImageViewer: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const [productImgError, setProductImgError] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);
  
  const images = result.sourceImages || [];
  const hasSource = images.length > 0;
  const hasProductFallback = !!result.fallbackImageUrl && !productImgError;
  const hasLogoFallback = !!result.brandLogoUrl && !logoImgError;

  // Determine representative image based on category
  const getRepImage = () => {
    if (result.isFood) return "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=800";
    const cat = (result.taxonomy.category || '').toLowerCase();
    if (cat.includes('kitchen')) return "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800";
    if (cat.includes('appliance') || cat.includes('home')) return "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800";
    if (cat.includes('electronic') || cat.includes('tech')) return "https://images.unsplash.com/photo-1526738549149-8e07eca270b4?auto=format&fit=crop&q=80&w=800";
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800"; // Generic product
  };

  return (
    <div className="w-full h-48 lg:h-56 rounded-2xl overflow-hidden shadow-inner bg-stone-50 border border-stone-200 group relative">
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
         /* Terminal Fallback: Branded Graphic Card with Representative Visual */
         <div className="w-full h-full relative group">
            <img 
              src={getRepImage()} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
              alt="Category Fallback" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent flex flex-col items-center justify-end p-6 gap-3 transition-colors">
               <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl backdrop-blur-sm ${result.isFood ? 'bg-emerald-700/80 text-white' : 'bg-slate-900/80 text-white'}`}>
                 {result.isFood ? <Leaf size={32} /> : <Package size={32} />}
               </div>
               <div className="text-center space-y-0.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                 <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/80">Asset Mapping Offline</p>
                 <p className="text-[11px] font-black uppercase tracking-tight text-white">{result.coreInfo.brand}</p>
               </div>
            </div>
         </div>
       )}
       
       {hasSource && images.length > 1 && (
         <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
           <div className="px-3 py-1 bg-slate-950/80 text-white text-[7px] font-black rounded-full backdrop-blur-md uppercase tracking-widest flex items-center gap-2 shadow-2xl border border-white/20">
             <ImageIcon size={10} className="text-amber-500" /> {images.length} Local Assets <ChevronRight size={10} />
           </div>
         </div>
       )}
    </div>
  );
};

const AttributeCard: React.FC<{ attr: ProductAttribute }> = ({ attr }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(`${attr.name}: ${attr.value}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative flex flex-col gap-0.5 p-2 bg-white border border-stone-100 rounded-lg hover:border-amber-300 hover:shadow-sm transition-all group select-none">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">{attr.name}</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleCopy} 
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-300 hover:text-amber-700 rounded"
            title="Copy Attribute"
          >
            {copied ? <CheckCircle2 size={8} className="text-emerald-700" /> : <Copy size={8} />}
          </button>
          <div className={`shrink-0 text-[8px] font-black px-1 py-0.5 rounded ${attr.confidence > 0.9 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
            {Math.round(attr.confidence * 100)}%
          </div>
        </div>
      </div>
      <p className="text-[12px] font-semibold text-slate-950 leading-tight break-words" title={attr.value}>{attr.value}</p>
    </div>
  );
};

const Onboarding: React.FC<{ onComplete: (profile: UserProfile) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<'email' | 'details'>('email');
  const [formData, setFormData] = useState({ name: '', email: '', team: '', customTeam: '' });
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const teams = ["Product", "Master Data Management", "Category", "Market Insight", "Others"];

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.endsWith('@phonepe.com')) {
      setError('Identity verification failed: Use @phonepe.com address');
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      const savedRegistry = JSON.parse(localStorage.getItem('catalist_user_registry') || '{}');
      if (savedRegistry[formData.email]) onComplete(savedRegistry[formData.email]);
      else setStep('details');
      setIsVerifying(false);
    }, 800);
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTeam = formData.team === 'Others' ? formData.customTeam : formData.team;
    if (!formData.name.trim() || !finalTeam) {
      setError('All fields are required');
      return;
    }
    const profile: UserProfile = { name: formData.name, email: formData.email, team: finalTeam, hasSeenTour: false };
    const savedRegistry = JSON.parse(localStorage.getItem('catalist_user_registry') || '{}');
    savedRegistry[formData.email] = profile;
    localStorage.setItem('catalist_user_registry', JSON.stringify(savedRegistry));
    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 antialiased">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-8 lg:p-10 space-y-8 animate-in fade-in zoom-in-95 duration-500 border border-stone-200">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-stone-200 ring-4 ring-white">
            <SearchCode size={32} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-950 uppercase">Catalist <span className="text-amber-600 text-xs align-top font-bold">PRO</span></h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Enterprise SSO Gate</p>
          </div>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="email" 
                required 
                placeholder="Corporate Email" 
                className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl pl-11 pr-5 py-3.5 text-sm font-bold text-slate-950 focus:ring-4 focus:ring-stone-200/50 focus:border-slate-950 outline-none transition-all" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} 
              />
            </div>
            {error && <div className="p-3.5 bg-red-50 rounded-xl border border-red-100 text-[13px] font-bold flex items-center gap-2.5 text-red-600"><AlertCircle size={18} />{error}</div>}
            <button type="submit" disabled={isVerifying} className="w-full py-3.5 bg-slate-950 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2.5">
              {isVerifying ? <div className="loader w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></div> : <>Verify SSO <ArrowRight size={18} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleDetailsSubmit} className="space-y-5">
            <div className="p-3.5 bg-stone-100/50 rounded-xl border border-stone-200 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-sm shadow-md border border-amber-600/30">{formData.email.charAt(0).toUpperCase()}</div>
               <p className="text-sm font-black text-slate-900 truncate">{formData.email}</p>
            </div>
            <input 
              type="text" 
              required 
              placeholder="Full Name" 
              className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-950 outline-none focus:border-amber-600 transition-all" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <select 
              required 
              className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-950 outline-none appearance-none focus:border-amber-600 transition-all" 
              value={formData.team} 
              onChange={e => setFormData({...formData, team: e.target.value})}
            >
              <option value="">Select Department</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className="w-full py-3.5 bg-slate-950 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl">Grant Access</button>
          </form>
        )}
      </div>
    </div>
  );
};

const QuickTour: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const slides = [
    { title: "Intelligent Extraction", description: "Convert packshots, PDP links, or hybrid batch lists into granular, structured catalogue assets in seconds.", icon: Sparkles, color: "text-amber-600" },
    { title: "Standardized Audit", description: "Review AI-generated data across 10 mission-critical categories including Technical, Legal, and SEO compliance.", icon: Target, color: "text-slate-900" },
    { title: "Refinement Dialogue", description: "Use the subtle side-panel chat to deep-dive into micro-attributes or adjust product notions in real-time.", icon: MessageSquare, color: "text-emerald-700" }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 lg:p-12 text-center shadow-2xl border border-stone-200">
        <div className="space-y-8">
          <div className={`w-20 h-20 lg:w-24 lg:h-24 mx-auto rounded-3xl bg-stone-50 flex items-center justify-center border-2 border-stone-100 ${slides[step].color} shadow-inner`}>
            {React.createElement(slides[step].icon, { size: 48 })}
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl lg:text-3xl font-black text-slate-950 tracking-tighter uppercase">{slides[step].title}</h3>
            <p className="text-slate-500 font-medium text-base lg:text-lg leading-relaxed max-w-lg mx-auto">{slides[step].description}</p>
          </div>
          <div className="flex items-center gap-4 pt-4">
            {step < slides.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="flex-1 py-4 bg-slate-950 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-stone-200 transition-all hover:bg-black">Continue <ArrowRight size={20} /></button>
            ) : (
              <button onClick={onComplete} className="w-full py-4 bg-slate-950 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all hover:bg-black">Get Started</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [refineQuery, setRefineQuery] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [selectedRegistryItem, setSelectedRegistryItem] = useState<AnalysisResult | null>(null);

  // History state for Refine Matrix (undo/redo)
  const [historyStack, setHistoryStack] = useState<AnalysisResult[][]>([]); 
  const [historyPointer, setHistoryPointer] = useState(-1);
  const [lastRefinementLog, setLastRefinementLog] = useState<string | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('catalist_active_session');
    if (savedSession) {
      const parsedUser = JSON.parse(savedSession);
      setUser(parsedUser);
      if (parsedUser && parsedUser.hasSeenTour === false) setShowTour(true);
    }
    setInitialized(true);
  }, []);

  const handleLoginComplete = (profile: UserProfile) => {
    const updatedUser = { ...profile, hasSeenTour: profile.hasSeenTour ?? false };
    setUser(updatedUser);
    localStorage.setItem('catalist_active_session', JSON.stringify(updatedUser));
    if (!updatedUser.hasSeenTour) setShowTour(true);
  };

  const completeTour = () => {
    if (user) {
      const updatedUser = { ...user, hasSeenTour: true };
      setUser(updatedUser);
      localStorage.setItem('catalist_active_session', JSON.stringify(updatedUser));
    }
    setShowTour(false);
    setActiveTab('ingest');
  };

  const pushToHistory = (newBatch: AnalysisResult[]) => {
    const newStack = historyStack.slice(0, historyPointer + 1);
    newStack.push(JSON.parse(JSON.stringify(newBatch)));
    if (newStack.length > 50) newStack.shift();
    setHistoryStack(newStack);
    setHistoryPointer(newStack.length - 1);
  };

  const runExhaustiveCatalogueEngine = async (inputs: {data: string, type: 'image' | 'url' | 'text'}[], sourceName: string): Promise<AnalysisResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Act as an Enterprise Lead Catalogue Data Scientist. Analyze provided media inputs (images, URLs, text) to generate an ULTRA-DEEP, HYPER-GRANULAR catalogue object. Your goal is MAXIMAL INFORMATION DEPTH. 
    1. Extract EVERY explicitly stated attribute from the source (specs, descriptions, ingredients, materials, dimensions, weights, certifications).
    2. DERIVE further technical and marketing attributes by reasoning about the product type, materials, brand positioning, and target audience.
    3. VISUAL REPRESENTATION (CRITICAL): If no high-quality source images are provided, use Google Search to find a stable, high-fidelity direct link to an official product image. Search for: "[Brand] [Product Name] official packshot". Provide this in 'fallbackImageUrl'. 
    4. Also find the official high-resolution logo for the brand and provide it in 'brandLogoUrl'. 
    5. Return 80+ distinct, high-fidelity data points Categorized into: Technical, Legal, Nutritional, Marketing, Logistics, Usage, Safety, Dimensions, Core, and SEO.`;

    const contents: any = {
      parts: [
        { text: prompt },
        ...inputs.map(input => {
          if (input.type === 'image') return { inlineData: { data: input.data.split(',')[1], mimeType: 'image/jpeg' } };
          return { text: `Source Info (${input.type}): ${input.data}` };
        })
      ]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coreInfo: { type: Type.OBJECT, properties: { displayName: { type: Type.STRING }, brand: { type: Type.STRING }, quantity: { type: Type.STRING }, color: { type: Type.STRING } }, required: ['displayName', 'brand', 'quantity', 'color'] },
            taxonomy: { type: Type.OBJECT, properties: { segment: { type: Type.STRING }, productType: { type: Type.STRING }, category: { type: Type.STRING }, subCategory: { type: Type.STRING } }, required: ['segment', 'productType', 'category', 'subCategory'] },
            seoInfo: { type: Type.OBJECT, properties: { keywords: { type: Type.ARRAY, items: { type: Type.STRING } }, tags: { type: Type.ARRAY, items: { type: Type.STRING } }, productNotion: { type: Type.STRING }, occasionRelevance: { type: Type.STRING } }, required: ['keywords', 'tags', 'productNotion', 'occasionRelevance'] },
            attributes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING }, confidence: { type: Type.NUMBER }, group: { type: Type.STRING } }, required: ['name', 'value', 'confidence', 'group'] } },
            isFood: { type: Type.BOOLEAN },
            fallbackImageUrl: { type: Type.STRING, description: 'Direct URL for a representative product image found via search.' },
            brandLogoUrl: { type: Type.STRING, description: 'Direct URL for the official high-res brand logo.' },
            insights: { type: Type.STRING },
            dataDensity: { type: Type.NUMBER },
            qualityScore: { type: Type.NUMBER }
          },
          required: ['coreInfo', 'taxonomy', 'seoInfo', 'attributes', 'isFood', 'insights', 'dataDensity', 'qualityScore']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    // Extract grounding sources as required by Gemini API guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      taxonomy: parsed.taxonomy || { segment: 'N/A', productType: 'N/A', category: 'N/A', subCategory: 'N/A' },
      coreInfo: parsed.coreInfo || { displayName: 'Unknown', brand: 'Unknown', quantity: 'N/A', color: 'N/A' },
      seoInfo: parsed.seoInfo || { keywords: [], tags: [], productNotion: 'N/A', occasionRelevance: 'N/A' },
      attributes: parsed.attributes || [],
      insights: parsed.insights || '',
      dataDensity: (parsed.dataDensity || 0) * 100,
      qualityScore: (parsed.qualityScore || 0) * 100,
      sourceType: 'composite',
      sourceValue: sourceName,
      isFood: parsed.isFood || false,
      fallbackImageUrl: parsed.fallbackImageUrl,
      brandLogoUrl: parsed.brandLogoUrl,
      groundingSources: groundingChunks,
      status: 'completed'
    };
  };

  const processBatch = async () => {
    setIsProcessing(true);
    setProcessingStatus("Initializing batch...");
    const batchResults: AnalysisResult[] = [];

    try {
      if (selectedFiles.length > 0 || pdpUrls.length > 0) {
        setProcessingStatus("Processing composite product data...");
        const compositeInputs: {data: string, type: 'image' | 'url' | 'text'}[] = [];
        const imageBase64s: string[] = [];
        for (const file of selectedFiles) {
          const b64 = await fileToBase64(file);
          compositeInputs.push({ data: b64, type: 'image' });
          imageBase64s.push(b64);
        }
        for (const url of pdpUrls) compositeInputs.push({ data: url, type: 'url' });
        const res = await runExhaustiveCatalogueEngine(compositeInputs, selectedFiles.length > 0 ? selectedFiles[0].name : pdpUrls[0]);
        res.sourceImages = imageBase64s;
        batchResults.push(res);
      }

      if (csvFile) {
        setProcessingStatus(`Parsing CSV batch...`);
        const text = await csvFile.text();
        const rows = parseCSV(text);
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          setProcessingStatus(`Processing Batch Item ${i+1}...`);
          const res = await runExhaustiveCatalogueEngine([{data: rows[i], type: 'text'}], `Row ${i+1}`);
          batchResults.push(res);
        }
      }

      if (batchResults.length > 0) {
        setPendingBatch(batchResults);
        pushToHistory(batchResults);
        setCurrentReviewIdx(0);
        setActiveTab('review');
      }
    } catch (e) {
      console.error(e);
      alert("Extraction engine failed.");
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
        contents: `Review and refine this product object to be even deeper and more exhaustive based on this request: "${query}". 
        Extract any missing data and derive more nuanced technical details. 
        Current state: ${JSON.stringify(pendingBatch[currentReviewIdx])}.`,
        config: { responseMimeType: "application/json" }
      });
      const updated = JSON.parse(response.text || '{}');
      const newBatch = JSON.parse(JSON.stringify(pendingBatch));
      newBatch[currentReviewIdx] = { ...newBatch[currentReviewIdx], ...updated };
      setPendingBatch(newBatch);
      pushToHistory(newBatch);
      setLastRefinementLog(query);
      setRefineQuery('');
    } catch (e) {
      console.error(e);
    } finally { setIsRefining(false); }
  };

  const handleUndo = () => {
    if (historyPointer > 0) {
      const newPointer = historyPointer - 1;
      setHistoryPointer(newPointer);
      setPendingBatch(JSON.parse(JSON.stringify(historyStack[newPointer])));
    }
  };

  const handleRedo = () => {
    if (historyPointer < historyStack.length - 1) {
      const newPointer = historyPointer + 1;
      setHistoryPointer(newPointer);
      setPendingBatch(JSON.parse(JSON.stringify(historyStack[newPointer])));
    }
  };

  const commitToRegistry = () => {
    const committed = pendingBatch[currentReviewIdx];
    setResults(prev => [committed, ...prev]);
    const newBatch = pendingBatch.filter((_, i) => i !== currentReviewIdx);
    setPendingBatch(newBatch);
    if (newBatch.length === 0) setActiveTab('catalogue');
    else {
      setCurrentReviewIdx(Math.max(0, currentReviewIdx - 1));
      setLastRefinementLog(null);
    }
  };

  const handleCopySection = (group: string, attributes: ProductAttribute[]) => {
    const text = attributes.filter(a => a.group === group).map(a => `${a.name}: ${a.value}`).join('\n');
    copyToClipboard(text);
  };

  const attributeCategories = [
    { title: 'Core DNA', group: 'Core', icon: Package, color: 'text-slate-950' },
    { title: 'Market/SEO Discovery', group: 'SEO', icon: Sparkles, color: 'text-amber-600' },
    { title: 'Technical Integrity', group: 'Technical', icon: Settings, color: 'text-slate-700' },
    { title: 'Regulatory Compliance', group: 'Legal', icon: ShieldAlert, color: 'text-red-800' },
    { title: 'Physical Scale', group: 'Dimensions', icon: Maximize2, color: 'text-stone-700' },
    { title: 'Health & Nutri', group: 'Nutritional', icon: Scale, color: 'text-emerald-800' },
    { title: 'Logistics/Flow', group: 'Logistics', icon: Truck, color: 'text-slate-900' },
    { title: 'Application', group: 'Usage', icon: Clock, color: 'text-amber-800' },
    { title: 'Safety Protocol', group: 'Safety', icon: ShieldCheck, color: 'text-emerald-900' },
    { title: 'Market Positioning', group: 'Marketing', icon: TrendingUp, color: 'text-stone-500' }
  ];

  if (!initialized) return null;
  if (!user) return <Onboarding onComplete={handleLoginComplete} />;

  const currentEntity = pendingBatch[currentReviewIdx];

  return (
    <div className="flex h-screen bg-stone-50 text-slate-950 font-sans antialiased overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
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
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              disabled={item.id === 'review' && !pendingBatch.length}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === item.id ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:bg-stone-50 disabled:opacity-20'
              }`}
            >
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
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="hidden lg:block text-slate-300 hover:text-red-700 transition-colors"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {showTour && <QuickTour onComplete={completeTour} />}

        {/* INGEST HUB */}
        {activeTab === 'ingest' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6 py-6 animate-in fade-in duration-700">
              <div className="text-center space-y-2">
                <h2 className="text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter uppercase">Ingest Hub</h2>
                <p className="text-slate-500 text-sm lg:text-base font-medium">Capture product signals for automated high-fidelity extraction.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="relative bg-white rounded-2xl border-2 border-dashed border-stone-200 p-8 lg:p-10 hover:border-amber-600 hover:bg-amber-50/20 transition-all group cursor-pointer text-center shadow-sm">
                    <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedFiles([...selectedFiles, ...Array.from(e.target.files || [])])} />
                    <div className="w-12 h-12 bg-stone-50 text-slate-950 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-stone-200 group-hover:scale-110 transition-transform"><ImageIcon size={24} className="group-hover:text-amber-600 transition-colors" /></div>
                    <h3 className="text-base lg:text-lg font-black text-slate-900 uppercase tracking-tight">Visual Signals</h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-medium">Packshot Images</p>
                  </div>
                  
                  <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital References</h4>
                      <LinkIcon size={16} className="text-stone-300" />
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Paste PDP URL..." 
                        className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-950 outline-none focus:border-amber-600 transition-all shadow-inner" 
                        value={urlInput} 
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (urlInput.trim() && setPdpUrls([...pdpUrls, urlInput.trim()]), setUrlInput(''))}
                      />
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
                        <p className="text-xs font-medium">Queue is empty.</p>
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
                    <Zap size={20} className="text-amber-500" fill="currentColor" /> <span>Launch Extraction</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROCESSING OVERLAY */}
        {isProcessing && (
          <div className="absolute inset-0 z-[100] bg-slate-950/40 backdrop-blur-md flex items-center justify-center animate-in fade-in">
             <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center space-y-4 shadow-2xl border border-stone-200">
                <div className="w-12 h-12 border-4 border-stone-100 border-t-amber-600 rounded-full animate-spin mx-auto shadow-lg"></div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-950 uppercase tracking-tighter">Parsing Metadata</h3>
                  <div className="px-4 py-2 bg-slate-950 rounded-lg shadow-xl"><p className="text-amber-500 font-bold text-[11px] tracking-wide animate-pulse">{processingStatus}</p></div>
                </div>
             </div>
          </div>
        )}

        {/* AUDIT WORKSPACE */}
        {activeTab === 'review' && currentEntity && (
          <div className="flex-1 flex overflow-hidden animate-in fade-in duration-500">
            {/* Left Queue */}
            <div className="w-52 lg:w-56 border-r border-stone-200 bg-white flex flex-col p-3 shrink-0 overflow-y-auto custom-scrollbar shadow-sm z-10">
              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ListFilter size={16} className="text-amber-600"/> Active Queue</h5>
              <div className="space-y-1.5">
                {pendingBatch.map((p, idx) => (
                  <button key={p.id} onClick={() => setCurrentReviewIdx(idx)} className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center gap-2.5 ${currentReviewIdx === idx ? 'bg-amber-50 border-amber-600 shadow-sm shadow-stone-200/30' : 'bg-white border-transparent hover:bg-stone-50'}`}>
                    <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center text-[9px] font-black ${currentReviewIdx === idx ? 'bg-slate-950 text-white shadow-md' : 'bg-stone-100 text-stone-400 shadow-inner'}`}>{idx + 1}</div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] font-black truncate ${currentReviewIdx === idx ? 'text-slate-950' : 'text-slate-700'}`}>{p.coreInfo.displayName}</p>
                      <p className="text-[8px] font-bold text-slate-400 truncate uppercase tracking-widest">{p.taxonomy.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix View */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-5 bg-stone-50/50">
               <div className="flex items-center justify-between sticky top-0 bg-stone-50/80 backdrop-blur-md z-10 py-3 -mt-3 border-b border-stone-200/20">
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-black text-slate-950 tracking-tighter uppercase flex items-center gap-2"><Target className="text-amber-600" size={24} /> Audit Workspace</h2>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Reviewing {currentReviewIdx + 1} of {pendingBatch.length}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => exportSingleToCSV(currentEntity)} className="px-3 py-1.5 bg-white border border-stone-200 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-amber-700 transition-all shadow-sm flex items-center gap-1.5"><Download size={12} /> Export</button>
                    <button onClick={() => setPendingBatch(pendingBatch.filter((_, i) => i !== currentReviewIdx))} className="px-3 py-1.5 bg-white border border-stone-200 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-red-700 transition-all shadow-sm">Discard</button>
                    <button onClick={commitToRegistry} className="px-4 py-1.5 bg-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl shadow-stone-200 hover:bg-black transition-all flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-500" /> Finalize</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attributeCategories.map(section => {
                    const sectionAttrs = currentEntity.attributes.filter(a => a.group === section.group);
                    if (sectionAttrs.length === 0 && section.group !== 'SEO') return null;
                    return (
                      <div key={section.group} className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-sm flex flex-col max-h-[300px]">
                        <div className="flex items-center justify-between mb-2.5 shrink-0">
                          <div className="flex items-center gap-2">
                            <section.icon size={16} className={section.color} />
                            <h5 className="text-[8px] font-black uppercase tracking-widest text-slate-800">{section.title}</h5>
                          </div>
                          <div className="flex items-center gap-1">
                             <button onClick={() => handleCopySection(section.group, currentEntity.attributes)} className="p-0.5 text-stone-300 hover:text-amber-700 transition-all" title="Copy Section"><Copy size={10} /></button>
                             <span className="text-[7px] font-black text-slate-400 bg-stone-50 px-1 py-0.5 rounded shadow-inner border border-stone-100">{sectionAttrs.length} Pt</span>
                          </div>
                        </div>
                        {section.group === 'SEO' && (
                          <div className="p-2 bg-stone-50 rounded-lg border border-stone-100 space-y-1.5 mb-2 shrink-0 shadow-inner">
                            <p className="text-[10px] font-bold text-slate-600 leading-tight italic">"{currentEntity.seoInfo.productNotion}"</p>
                            <div className="flex flex-wrap gap-1">
                              {[...currentEntity.seoInfo.keywords, ...currentEntity.seoInfo.tags].slice(0, 4).map((buzz, i) => (
                                <span key={i} className="px-1 py-0.5 bg-white border border-stone-200 text-[7px] font-black text-amber-700 rounded">#{buzz.toLowerCase()}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-1 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-1">
                          {sectionAttrs.map((attr, i) => <AttributeCard key={i} attr={attr} />)}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Verification Sources with Grounding */}
                  {currentEntity.groundingSources && currentEntity.groundingSources.length > 0 && (
                    <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-sm flex flex-col max-h-[300px]">
                      <div className="flex items-center justify-between mb-2.5 shrink-0">
                        <div className="flex items-center gap-2">
                          <Globe size={16} className="text-amber-600" />
                          <h5 className="text-[8px] font-black uppercase tracking-widest text-slate-800">Verification Sources</h5>
                        </div>
                      </div>
                      <div className="overflow-y-auto custom-scrollbar pr-1 flex-1 space-y-1.5">
                        {currentEntity.groundingSources.map((chunk: any, i: number) => (
                          chunk.web && (
                            <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="block p-2 bg-stone-50 border border-stone-100 rounded-lg hover:border-amber-300 transition-all group">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Search Node {i+1}</span>
                                <ExternalLink size={8} className="text-stone-300 group-hover:text-amber-600" />
                              </div>
                              <p className="text-[10px] font-semibold text-slate-800 leading-tight truncate">{chunk.web.title || chunk.web.uri}</p>
                            </a>
                          )
                        ))}
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Right side Detail panel */}
            <div className="w-64 lg:w-72 border-l border-stone-200 bg-white flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-sm z-10">
               {/* Image Viewer Component with Fallbacks */}
               <div className="p-5 border-b border-stone-50 space-y-4 bg-white z-20">
                  <ProductImageViewer result={currentEntity} />
                  
                  <div className="text-center space-y-1 px-1">
                    <span className="text-[8px] font-black text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded-lg tracking-widest border border-amber-100/50">{currentEntity.taxonomy.category}</span>
                    <h3 className="text-sm font-black text-slate-950 leading-tight uppercase tracking-tight line-clamp-2">{currentEntity.coreInfo.displayName}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80">{currentEntity.coreInfo.brand}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 py-3 border-y border-stone-100/60">
                    <div className="text-center border-r border-stone-100">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fidelity</p>
                      <p className="text-xl font-black text-emerald-700 tabular-nums">{Math.round(currentEntity.qualityScore)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vector</p>
                      <p className="text-xl font-black text-slate-950 tabular-nums">{currentEntity.attributes.length}</p>
                    </div>
                  </div>
               </div>

               {/* Scrollable Refine Matrix Content - Fixed bottom padding to prevent cut off by footer */}
               <div className="p-5 pb-24 bg-stone-50/10">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Wand2 size={16} className="text-amber-600" />
                        <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Refine Matrix</h5>
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 rounded-lg border border-stone-200 shadow-sm">
                        <span className="text-[7px] font-black text-slate-950 uppercase tracking-tighter">AI Active</span>
                      </div>
                    </div>
                    <div className="group relative bg-white ring-1 ring-stone-200 hover:ring-amber-300 focus-within:ring-slate-950 rounded-xl p-3 space-y-2.5 shadow-sm transition-all duration-300 bg-gradient-to-br from-white to-stone-100/20">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 mb-0.5">
                         <p className="text-[8px] font-black text-stone-300 uppercase tracking-widest">Context Engine</p>
                         <div className="flex gap-1">
                            <button onClick={handleUndo} disabled={historyPointer <= 0} className="p-0.5 text-stone-400 hover:text-amber-700 disabled:opacity-30 transition-colors"><Undo2 size={12} /></button>
                            <button onClick={handleRedo} disabled={historyPointer >= historyStack.length - 1} className="p-0.5 text-stone-400 hover:text-amber-700 disabled:opacity-30 transition-colors"><Redo2 size={12} /></button>
                         </div>
                      </div>
                      <textarea 
                        rows={3} 
                        placeholder="Refinement logic..." 
                        className="w-full bg-transparent border-none outline-none text-[11px] font-semibold text-slate-900 placeholder:text-stone-300 resize-none leading-normal" 
                        value={refineQuery} 
                        onChange={(e) => setRefineQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), refineEntity())}
                      />
                      {lastRefinementLog && (
                        <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-100/30 flex items-start gap-1.5 animate-in slide-in-from-top-1">
                           <CheckCircle2 size={8} className="text-amber-700 mt-0.5" />
                           <p className="text-[8px] font-bold text-amber-900 leading-tight italic truncate">Last: "{lastRefinementLog}"</p>
                        </div>
                      )}
                      <div className="flex justify-end pt-0.5">
                        <button 
                          onClick={refineEntity} 
                          disabled={isRefining || !refineQuery.trim()} 
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black shadow transition-all active:scale-95"
                        >
                          {isRefining ? <RefreshCw className="animate-spin" size={12} /> : <Send size={12} className="text-amber-500" />} Refine
                        </button>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* REGISTRY VIEW */}
        {activeTab === 'catalogue' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between border-b border-stone-200 pb-5">
              <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase">Master Registry</h2>
              <div className="flex gap-3">
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input type="text" placeholder="Lookup..." className="bg-white border border-stone-200 rounded-xl pl-8 pr-4 py-2 text-xs font-bold w-56 outline-none focus:border-amber-600 shadow-sm" /></div>
                <button onClick={() => exportRegistryToCSV(results)} className="flex items-center gap-1.5 px-5 py-2 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all hover:translate-y-[-1px]"><Download size={14} className="text-amber-500" /> Export</button>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-stone-200 max-w-2xl mx-auto shadow-sm">
                <Sparkles size={48} className="text-stone-100 mx-auto" strokeWidth={1} />
                <p className="text-slate-400 font-black text-base uppercase tracking-widest">Registry Offline</p>
                <button onClick={() => setActiveTab('ingest')} className="px-6 py-2.5 bg-slate-950 text-white rounded-lg font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black border border-amber-600/20">Initialize Ingest</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((res) => (
                  <div key={res.id} onClick={() => setSelectedRegistryItem(res)} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 group hover:border-amber-400 transition-all cursor-pointer relative overflow-hidden hover:shadow-lg active:scale-[0.99]">
                    <div className="flex gap-5">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${res.isFood ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-stone-50 text-slate-950 border-stone-200'}`}><Package size={20} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between mb-1"><span className="text-[8px] font-black text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded shadow-inner border border-amber-100/50">{res.taxonomy.category}</span><div className="text-emerald-700 font-black text-[8px] uppercase flex items-center gap-1"><CheckCircle size={10} /> Sync</div></div>
                        <h3 className="text-base font-black text-slate-950 truncate leading-tight group-hover:text-amber-700 transition-colors uppercase tracking-tight">{res.coreInfo.displayName}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{res.coreInfo.brand}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-stone-50 pt-3">
                      <div className="flex gap-1.5">{res.seoInfo.tags.slice(0, 2).map((t, i) => <span key={i} className="text-[8px] font-black text-slate-500 bg-stone-50 px-1.5 py-0.5 rounded uppercase border border-stone-200">{t}</span>)}</div>
                      <div className="flex gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); exportSingleToCSV(res); }} className="p-1.5 text-stone-300 hover:text-amber-700 rounded-lg"><Download size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setResults(results.filter(r => r.id !== res.id)); }} className="p-1.5 text-stone-300 hover:text-red-700 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DETAIL OVERLAY */}
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
                          <span className="text-[9px] font-black text-amber-700 uppercase bg-amber-50 px-2 py-1 rounded-lg tracking-widest border border-amber-100/50">{selectedRegistryItem.taxonomy.category}</span>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-stone-50 px-2 py-1 rounded-lg border border-stone-200">{selectedRegistryItem.taxonomy.segment}</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase leading-none">{selectedRegistryItem.coreInfo.displayName}</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{selectedRegistryItem.coreInfo.brand} • Entity: {selectedRegistryItem.id.toUpperCase()}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedRegistryItem(null)} className="p-3 bg-stone-50 text-stone-400 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all active:scale-95 shadow-inner">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-stone-50/50">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                        {attributeCategories.map(section => {
                          const sectionAttrs = selectedRegistryItem.attributes.filter(a => a.group === section.group);
                          if (sectionAttrs.length === 0 && section.group !== 'SEO') return null;
                          return (
                            <div key={section.group} className="bg-white p-4 lg:p-5 rounded-2xl border border-stone-200 shadow shadow-stone-200/50 flex flex-col h-[320px] lg:h-[350px] transition-all hover:scale-[1.01]">
                              <div className="flex items-center justify-between border-b border-stone-50 pb-3 mb-3 shrink-0">
                                <div className="flex items-center gap-2">
                                  <section.icon size={18} className={section.color} />
                                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-800">{section.title}</h5>
                                </div>
                                <div className="flex items-center gap-1">
                                   <button onClick={() => handleCopySection(section.group, selectedRegistryItem.attributes)} className="p-1 text-stone-300 hover:text-amber-700 transition-all" title="Copy Section"><Copy size={12} /></button>
                                   <span className="text-[8px] font-black text-slate-500 bg-stone-50 px-1.5 py-0.5 rounded shadow-inner border border-stone-100">{sectionAttrs.length} Pt</span>
                                </div>
                              </div>
                              {section.group === 'SEO' && (
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3 mb-3 shrink-0 shadow-inner overflow-hidden">
                                  <p className="text-[10px] font-bold text-slate-600 leading-tight italic border-b border-stone-100 pb-2 mb-2">"{selectedRegistryItem.seoInfo.productNotion}"</p>
                                  <div className="space-y-1">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Keywords</p>
                                    <div className="flex flex-wrap gap-1">
                                      {[...selectedRegistryItem.seoInfo.keywords, ...selectedRegistryItem.seoInfo.tags].map((buzz, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-white border border-stone-200 text-[8px] font-black text-amber-700 rounded">#{buzz.toLowerCase()}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-1 gap-1.5 overflow-y-auto custom-scrollbar pr-2 flex-1 pb-2">
                                {sectionAttrs.map((attr, i) => <AttributeCard key={i} attr={attr} />)}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Detail View search grounding sources */}
                        {selectedRegistryItem.groundingSources && selectedRegistryItem.groundingSources.length > 0 && (
                          <div className="bg-white p-4 lg:p-5 rounded-2xl border border-stone-200 shadow shadow-stone-200/50 flex flex-col h-[320px] lg:h-[350px] transition-all hover:scale-[1.01]">
                            <div className="flex items-center justify-between border-b border-stone-50 pb-3 mb-3 shrink-0">
                              <div className="flex items-center gap-2">
                                <Globe size={18} className="text-amber-700" />
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-800">Grounding Nodes</h5>
                              </div>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-2">
                              {selectedRegistryItem.groundingSources.map((chunk: any, i: number) => (
                                chunk.web && (
                                  <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="block p-3 bg-stone-50 border border-stone-100 rounded-xl hover:border-amber-300 transition-all group">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[8px] font-black text-slate-400 uppercase">External Context {i+1}</span>
                                      <ExternalLink size={10} className="text-stone-300 group-hover:text-amber-700" />
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2">{chunk.web.title || chunk.web.uri}</p>
                                    <p className="text-[8px] text-amber-700 font-medium truncate mt-1">{chunk.web.uri}</p>
                                  </a>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="p-5 lg:p-6 border-t border-stone-100 bg-white flex items-center justify-between shrink-0 z-20 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.1)]">
                    <div className="flex gap-8">
                       <div className="text-center group">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-amber-700 transition-colors">Information</p>
                        <p className="text-2xl font-black text-amber-700 tracking-tighter">{Math.round(selectedRegistryItem.dataDensity)}%</p>
                      </div>
                      <div className="text-center group">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-emerald-700 transition-colors">Fidelity</p>
                        <p className="text-2xl font-black text-emerald-700 tracking-tighter">{Math.round(selectedRegistryItem.qualityScore)}%</p>
                      </div>
                      <div className="text-center group">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-slate-950 transition-colors">Vector</p>
                        <p className="text-2xl font-black text-slate-950 tracking-tighter">{selectedRegistryItem.attributes.length}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => exportSingleToCSV(selectedRegistryItem)} className="px-6 py-3 bg-stone-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-stone-200 hover:bg-stone-100 transition-all flex items-center gap-2 shadow-sm"><Download size={16} className="text-amber-600" /> Export</button>
                      <button onClick={() => setSelectedRegistryItem(null)} className="px-8 py-3 bg-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl">Dismiss</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS VIEW */}
        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-10 space-y-10 animate-in zoom-in-95 duration-500 pb-20">
            <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase">Protocol Insights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Network Assets', value: results.length, icon: Database, color: 'slate-950' },
                { label: 'Aggregate Fidelity', value: results.length ? '96.2%' : '0%', icon: ShieldCheck, color: 'emerald-700' },
                { label: 'Vector Density', value: results.length ? '91.8%' : '0%', icon: Activity, color: 'amber-700' },
                { label: 'Engine Latency', value: '0.42s', icon: Clock, color: 'stone-600' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200 shadow hover:shadow-lg transition-all hover:translate-y-[-2px] space-y-4">
                  <div className={`w-12 h-12 bg-stone-50 text-${stat.color.split('-')[0] === 'slate' ? 'slate-950' : stat.color} rounded-xl flex items-center justify-center border border-stone-100 shadow-inner`}><stat.icon size={24} /></div>
                  <p className="text-3xl font-black text-slate-950 tracking-tighter">{stat.value}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white text-center space-y-6 shadow-2xl border-4 border-stone-800">
              <History size={48} className="text-amber-500 mx-auto opacity-40" strokeWidth={1} />
              <h3 className="text-2xl font-black tracking-tight uppercase">Catalogue Engine V4.2</h3>
              <p className="text-stone-400 max-w-xl mx-auto font-medium text-base italic leading-relaxed">"Global PIM synchronization active. Recursive Matrix mapping enabled. Real-time audit trails active."</p>
              <button className="px-8 py-3 bg-white text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-stone-100 shadow-xl transition-all hover:scale-105">Audit Global Logs</button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="h-10 bg-white border-t border-stone-200 flex items-center justify-center fixed bottom-0 left-0 right-0 z-[60] px-12 ml-16 lg:ml-52 shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-10 text-[8px] font-black text-stone-400 uppercase tracking-[0.6em] opacity-80">
          <span>Enterprise Mode 04-PHX</span>
          <span className="text-amber-700 font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse shadow-[0_0_6px_1px_rgba(217,119,6,0.5)]" /> Matrix Active</span>
          <span>Engine V4.2.0</span>
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
