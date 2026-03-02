import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, getDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { setActiveSession, cloneCoPilotSession } from '../lib/UserDocumentHelpers';
import ConfirmModal from './ConfirmModal';
import { 
  Package, 
  ExternalLink, 
  X, 
  Eye, 
  Settings, 
  Lightbulb, 
  Edit2,
  Trash2,
  FileText,
  Rocket,
  ChevronRight,
  Sparkles,
  Copy,
  Clock,
  Plus,
  MoreVertical,
  Truck,
  ChevronDown,
  Palette
} from 'lucide-react';

interface ProductIdea {
  id: string;
  name: string;
  status: 'in_progress' | 'completed';
  productConfig?: {
    name: string;
    description: string;
    price: number;
    priceType: string;
    currency: string;
    valueStack: string[];
    guarantees: string[];
    targetAudience: string;
    mission: string;
    tierType: 'low' | 'mid' | 'high';
  };
  salesPageId?: string | null;
  salesPageStatus?: 'none' | 'draft' | 'published';
  answers?: Record<string, any>;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
}

interface Product {
  id: string;
  salesPage?: any;
  published?: boolean;
  delivery?: any;
  sourceSessionId?: string;
  analytics?: {
    views: number;
    sales: number;
    revenue: number;
  };
  createdAt?: any;
  lastUpdated?: any;
}

// Combined item for unified display
interface UnifiedProduct {
  type: 'in_progress' | 'idea_only' | 'with_sales_page';
  idea?: ProductIdea;
  product?: Product;
  name: string;
  updatedAt: Date;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [productIdeas, setProductIdeas] = useState<ProductIdea[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // e.g. "productId-sales" or "productId-delivery"
  const [ideaModal, setIdeaModal] = useState<{
    isOpen: boolean;
    idea: ProductIdea | null;
  }>({ isOpen: false, idea: null });
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showInfoBanner, setShowInfoBanner] = useState(() => {
    return localStorage.getItem('hideInfoBanner') !== 'true';
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: async () => {},
    isLoading: false,
  });

  // Fetch Product Ideas from Co-Pilot sessions
  useEffect(() => {
    if (!auth.currentUser) return;

    const sessionsRef = collection(db, 'users', auth.currentUser.uid, 'productCoPilotSessions');
    const q = query(sessionsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ideas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProductIdea[];
      setProductIdeas(ideas);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Products (with sales pages)
  useEffect(() => {
    if (!auth.currentUser) return;

    const productsRef = collection(db, 'users', auth.currentUser.uid, 'products');
    const q = query(productsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user profile data (for creator page link)
  useEffect(() => {
    if (!auth.currentUser) return;
    getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
      if (snap.exists()) setUserData(snap.data());
    });
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    if (!openMenuId && !openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (openMenuId && !target.closest('[data-menu-container]')) {
        setOpenMenuId(null);
      }
      if (openDropdown && !target.closest('[data-dropdown-container]')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId, openDropdown]);

  const dismissInfoBanner = () => {
    setShowInfoBanner(false);
    localStorage.setItem('hideInfoBanner', 'true');
  };

  // Create unified list of all products
  const createUnifiedList = (): UnifiedProduct[] => {
    const unified: UnifiedProduct[] = [];
    
    // Track which ideas have been linked to products
    const linkedIdeaIds = new Set(
      products
        .filter(p => p.sourceSessionId || p.salesPage?.sourceSessionId)
        .map(p => p.sourceSessionId || p.salesPage?.sourceSessionId)
    );
    
    // Add in-progress ideas
    productIdeas
      .filter(idea => idea.status === 'in_progress')
      .forEach(idea => {
        unified.push({
          type: 'in_progress',
          idea,
          name: idea.name || 'Untitled Idea',
          updatedAt: idea.updatedAt?.toDate?.() || new Date(idea.updatedAt) || new Date(),
        });
      });
    
    // Add completed ideas WITHOUT sales pages
    productIdeas
      .filter(idea => idea.status === 'completed' && idea.productConfig && !idea.salesPageId && !linkedIdeaIds.has(idea.id))
      .forEach(idea => {
        unified.push({
          type: 'idea_only',
          idea,
          name: idea.productConfig?.name || idea.name || 'Untitled',
          updatedAt: idea.updatedAt?.toDate?.() || new Date(idea.updatedAt) || new Date(),
        });
      });
    
    // Add products with sales pages (and link their original ideas)
    products.forEach(product => {
      const sourceId = product.sourceSessionId || product.salesPage?.sourceSessionId;
      const linkedIdea = sourceId ? productIdeas.find(i => i.id === sourceId) : undefined;
      
      // Skip empty/abandoned drafts (created but never filled in)
      const productName = product.salesPage?.coreInfo?.name?.trim();
      if (!productName && !product.published) return;
      
      unified.push({
        type: 'with_sales_page',
        product,
        idea: linkedIdea,
        name: product.salesPage?.coreInfo?.name || 'Untitled',
        updatedAt: product.lastUpdated?.toDate?.() || new Date(product.lastUpdated) || new Date(),
      });
    });
    
    // Sort by most recently updated
    return unified.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  };

  const unifiedProducts = createUnifiedList();

  // Calculate totals
  const totals = {
    total: unifiedProducts.length,
    inProgress: unifiedProducts.filter(p => p.type === 'in_progress').length,
    ideasOnly: unifiedProducts.filter(p => p.type === 'idea_only').length,
    withSalesPage: unifiedProducts.filter(p => p.type === 'with_sales_page').length,
    published: products.filter(p => p.published).length,
    views: products.reduce((sum, p) => sum + (p.analytics?.views || 0), 0),
    sales: products.reduce((sum, p) => sum + (p.analytics?.sales || 0), 0),
    revenue: products.reduce((sum, p) => sum + (p.analytics?.revenue || 0), 0)
  };

  // Get tier label and color
  const getTierInfo = (tierType: string) => {
    switch (tierType) {
      case 'low':
        return { label: 'Quick Win', color: 'bg-green-950/30 text-green-400 border-green-800/30' };
      case 'mid':
        return { label: 'Core Offer', color: 'bg-blue-950/30 text-blue-400 border-blue-800/30' };
      case 'high':
        return { label: 'Premium', color: 'bg-purple-950/30 text-purple-400 border-purple-800/30' };
      default:
        return { label: 'Custom', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' };
    }
  };

  // Delete just the idea
  const deleteIdea = async (ideaId: string, ideaName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Idea',
      message: `Are you sure you want to delete "${ideaName}"? This cannot be undone.`,
      confirmText: 'Delete Idea',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'productCoPilotSessions', ideaId));
        } catch (error) {
          console.error('Error deleting idea:', error);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      }
    });
  };

  // Delete just the sales page (keep the idea)
  const deleteSalesPageOnly = async (productId: string, sourceSessionId: string | undefined, productName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Sales Page',
      message: `Delete the sales page for "${productName}"? The original idea will be restored to your backlog.`,
      confirmText: 'Delete Sales Page',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'products', productId));
          if (sourceSessionId) {
            const sessionRef = doc(db, 'users', auth.currentUser!.uid, 'productCoPilotSessions', sourceSessionId);
            await updateDoc(sessionRef, {
              salesPageId: null,
              salesPageStatus: 'none',
              graduatedAt: null,
            });
          }
        } catch (error) {
          console.error('Error deleting sales page:', error);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      }
    });
  };

  // Delete everything (sales page + idea)
  const deleteEverything = async (productId: string, sourceSessionId: string | undefined, productName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Everything',
      message: `Delete "${productName}" completely? This will remove both the sales page AND the original idea. This cannot be undone.`,
      confirmText: 'Delete Everything',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'products', productId));
          if (sourceSessionId) {
            await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'productCoPilotSessions', sourceSessionId));
          }
        } catch (error) {
          console.error('Error deleting:', error);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      }
    });
  };

  // Delete product without linked idea
  const deleteProduct = async (productId: string, productName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Product',
      message: `Are you sure you want to delete "${productName}"? This cannot be undone.`,
      confirmText: 'Delete Product',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'products', productId));
        } catch (error) {
          console.error('Error deleting product:', error);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      }
    });
  };

  // Continue an in-progress idea
  const continueIdea = async (ideaId: string) => {
    if (!auth.currentUser) return;
    try {
      await setActiveSession(auth.currentUser.uid, ideaId);
      navigate('/pathfinder');
    } catch (error) {
      console.error('Error continuing idea:', error);
    }
  };

  // Edit a completed idea
  const editIdea = async (ideaId: string) => {
    if (!auth.currentUser) return;
    try {
      await setActiveSession(auth.currentUser.uid, ideaId);
      navigate('/pathfinder');
    } catch (error) {
      console.error('Error editing idea:', error);
    }
  };

  // Edit idea that has a linked sales page -- clone it first
  const editIdeaWithWarning = (ideaId: string, ideaName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Edit Product Idea',
      message: `This will create a copy of "${ideaName}" so you can make changes safely.\n\nYour existing sales page will NOT be affected.\n\nWhen you're done editing, you can create a new sales page from the updated idea.`,
      confirmText: 'Create Copy & Edit',
      isLoading: false,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await cloneCoPilotSession(auth.currentUser.uid, ideaId);
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
          navigate('/pathfinder');
        } catch (error) {
          console.error('Error cloning idea:', error);
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  // Create sales page from idea
  const createSalesPage = (ideaId: string) => {
    navigate(`/products/sales?ideaId=${ideaId}`);
  };

  // Copy product link to clipboard
  const copyProductLink = async (slug: string, productId: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedProductId(productId);
      setTimeout(() => setCopiedProductId(null), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
      <div className="text-neutral-400">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-neutral-400 mt-1">Manage your products from idea to launch</p>
          </div>
          <button
            onClick={() => setShowNewProductModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Product
          </button>
        </div>

        {/* Info Banner */}
        {showInfoBanner && unifiedProducts.length === 0 && (
          <div className="mb-6 bg-purple-950/30 border border-purple-800/30 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-purple-300 mb-2">Welcome to LaunchPad!</h3>
                <div className="text-sm text-purple-200/80 space-y-2">
                  <p>
                    <strong className="text-purple-300">Step 1:</strong> Use the Product Pathfinder to discover what to sell
                  </p>
                  <p>
                    <strong className="text-purple-300">Step 2:</strong> Refine your product idea with pricing and details
                  </p>
                  <p>
                    <strong className="text-purple-300">Step 3:</strong> Create a professional sales page and start selling
                  </p>
                  <p className="text-xs text-purple-300/60 mt-3">
                    Start with the Product Pathfinder — it's free and takes just 5 minutes!
                  </p>
                </div>
              </div>
              <button
                onClick={dismissInfoBanner}
                className="p-1 hover:bg-purple-900/30 rounded transition-colors"
              >
                <X className="w-4 h-4 text-purple-400" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Total Products</p>
            <p className="text-3xl font-bold">{totals.total}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {totals.ideasOnly} idea{totals.ideasOnly !== 1 ? 's' : ''} · {totals.withSalesPage} sales page{totals.withSalesPage !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Published</p>
            <p className="text-3xl font-bold text-green-400">{totals.published}</p>
            <p className="text-xs text-neutral-500 mt-1">live and selling</p>
          </div>
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Total Sales</p>
            <p className="text-3xl font-bold text-green-400">{totals.sales}</p>
          </div>
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Revenue</p>
            <p className="text-3xl font-bold text-green-400">
              ${totals.revenue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Creator Page Quick Link */}
        {userData?.profile?.username && (
          <div className="mb-8 flex flex-col sm:flex-row gap-3">
            <a
              href={`/creator/${userData.profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-3 bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 hover:border-purple-500/30 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Creator Page</p>
                <p className="text-xs text-neutral-500 truncate">launchpad.com/creator/{userData.profile.username}</p>
              </div>
              <span className="text-xs text-neutral-500 group-hover:text-purple-400 transition-colors">View →</span>
            </a>
            <button
              onClick={() => navigate('/settings/customize?from=dashboard')}
              className="flex items-center gap-3 bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 hover:border-purple-500/30 transition-colors group sm:w-auto"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">Customize</p>
                <p className="text-xs text-neutral-500">Style your page</p>
              </div>
            </button>
          </div>
        )}

        {/* Products Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            Products
          </h2>
        </div>

        {/* Unified Products List */}
        {unifiedProducts.length > 0 ? (
          <div className="space-y-4">
            {unifiedProducts.map((item) => {
              // IN PROGRESS IDEA
              if (item.type === 'in_progress' && item.idea) {
                return (
                  <div key={`idea-${item.idea.id}`} className="border border-neutral-800 rounded-lg p-5 bg-neutral-900/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-950/30 border border-amber-800/30 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-neutral-500">
                            Started {formatDate(item.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 bg-amber-950/30 text-amber-400 rounded-full border border-amber-800/30">
                          In Progress
                        </span>
                        <button
                          onClick={() => continueIdea(item.idea!.id)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          Continue
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteIdea(item.idea!.id, item.name)}
                          className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // IDEA ONLY (no sales page yet)
              if (item.type === 'idea_only' && item.idea) {
                const idea = item.idea;
                const tierInfo = getTierInfo(idea.productConfig?.tierType || '');
                
                return (
                  <div key={`idea-${idea.id}`} className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50 hover:bg-neutral-900/70 transition-colors">
                    <div className="flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-yellow-950/30 border border-yellow-800/30 flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-semibold">{idea.productConfig?.name}</h3>
                              <span className={`text-xs px-2 py-1 rounded-full border ${tierInfo.color}`}>
                                {tierInfo.label}
                              </span>
                              <span className="text-xs px-2 py-1 bg-yellow-950/30 text-yellow-400 rounded-full border border-yellow-800/30">
                                Idea Only
                              </span>
                            </div>
                            <p className="text-neutral-400 text-sm mt-1 line-clamp-2">
                              {idea.productConfig?.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-bold text-green-400">
                            ${idea.productConfig?.price || 0}
                          </p>
                          <p className="text-xs text-neutral-500">{idea.productConfig?.priceType || 'one-time'}</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                        <span>Target: <span className="text-neutral-300">{idea.productConfig?.targetAudience}</span></span>
                        <span>Includes: <span className="text-neutral-300">{idea.productConfig?.valueStack?.length || 0} items</span></span>
                        <span>Guarantees: <span className="text-neutral-300">{idea.productConfig?.guarantees?.length || 0}</span></span>
                      </div>

                      {/* Mission */}
                      {idea.productConfig?.mission && (
                        <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                          <p className="text-sm italic text-neutral-300">"{idea.productConfig.mission}"</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 pt-3 border-t border-neutral-800">
                        <button
                          onClick={() => createSalesPage(idea.id)}
                          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                        >
                          <Rocket className="w-4 h-4" />
                          Create Sales Page
                        </button>
                        <button
                          onClick={() => editIdea(idea.id)}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Idea
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => deleteIdea(idea.id, idea.productConfig?.name || idea.name)}
                          className="px-4 py-2 bg-red-950/30 hover:bg-red-950/50 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // WITH SALES PAGE
              if (item.type === 'with_sales_page' && item.product) {
                const product = item.product;
                const idea = item.idea;
                const sourceId = product.sourceSessionId || product.salesPage?.sourceSessionId;
                const hasLinkedIdea = !!idea;
                const tierInfo = idea?.productConfig?.tierType ? getTierInfo(idea.productConfig.tierType) : null;
                
                const displayData = {
                  title: product.salesPage?.coreInfo?.name || 'Untitled',
                  description: product.salesPage?.valueProp?.description || '',
                  price: product.salesPage?.coreInfo?.price || 0,
                  priceType: product.salesPage?.coreInfo?.priceType || 'one-time',
                  published: product.published || false,
                  views: product.analytics?.views || 0,
                  sales: product.analytics?.sales || 0,
                  revenue: product.analytics?.revenue || 0,
                  slug: product.salesPage?.publish?.slug,
                  deliveryConfigured: product.delivery?.status === 'configured',
                  deliveryMethod: product.delivery?.deliveryMethod || null,
                };

                return (
                  <div key={`product-${product.id}`} className="border border-neutral-800 rounded-lg bg-neutral-900/50 hover:bg-neutral-900/70 transition-colors">
                    <div className="p-6">
                      <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              displayData.published 
                                ? 'bg-green-950/30 border border-green-800/30' 
                                : 'bg-neutral-800 border border-neutral-700'
                            }`}>
                              <FileText className={`w-5 h-5 ${displayData.published ? 'text-green-400' : 'text-neutral-400'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-semibold">{displayData.title}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full border ${
                                  displayData.published 
                                    ? 'bg-green-950/30 text-green-400 border-green-800/30' 
                                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                }`}>
                                  {displayData.published ? 'Live' : 'Draft'}
                                </span>
                                {tierInfo && (
                                  <span className={`text-xs px-2 py-1 rounded-full border ${tierInfo.color}`}>
                                    {tierInfo.label}
                                  </span>
                                )}
                                {hasLinkedIdea && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-purple-950/30 text-purple-400 border border-purple-800/30 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    From Pathfinder
                                  </span>
                                )}
                                {displayData.published && (
                                  <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${
                                    displayData.deliveryConfigured
                                      ? 'bg-blue-950/30 text-blue-400 border-blue-800/30'
                                      : 'bg-amber-950/30 text-amber-400 border-amber-800/30'
                                  }`}>
                                    <Truck className="w-3 h-3" />
                                    {displayData.deliveryConfigured ? 'Delivery Ready' : 'Set Up Delivery'}
                                  </span>
                                )}
                              </div>
                              <p className="text-neutral-400 text-sm mt-1 line-clamp-2">
                                {displayData.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-green-400">${displayData.price}</p>
                            <p className="text-xs text-neutral-500">{displayData.priceType}</p>
                          </div>
                        </div>

                        {/* Analytics */}
                        <div className="flex gap-6 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-neutral-500">Views:</span>
                            <span className="font-medium">{displayData.views}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-neutral-500">Sales:</span>
                            <span className="font-medium text-green-400">{displayData.sales}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-neutral-500">Revenue:</span>
                            <span className="font-medium text-green-400">${displayData.revenue.toFixed(2)}</span>
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
                          {/* Sales Page - split dropdown */}
                          <div className="relative" data-dropdown-container>
                            <div className="flex">
                              <Link
                                to={`/products/${product.id}/edit`}
                                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-l-lg transition-colors flex items-center gap-2 text-sm border border-neutral-700 border-r-0"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Sales Page
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === `${product.id}-sales` ? null : `${product.id}-sales`);
                                  setOpenMenuId(null);
                                }}
                                className="px-1.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-r-lg transition-colors border border-neutral-700"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {openDropdown === `${product.id}-sales` && (
                              <div className="absolute left-0 top-full mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 py-1">
                                <Link
                                  to={`/products/${product.id}/edit`}
                                  onClick={() => setOpenDropdown(null)}
                                  className="w-full px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4 text-neutral-400" />
                                  Edit Sales Page
                                </Link>
                                {displayData.published && displayData.slug ? (
                                  <Link
                                    to={`/products/${product.id}/preview`}
                                    target="_blank"
                                    onClick={() => setOpenDropdown(null)}
                                    className="w-full px-4 py-2.5 text-sm text-green-400 hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    View Live Page
                                  </Link>
                                ) : (
                                  <Link
                                    to={`/products/${product.id}/preview`}
                                    target="_blank"
                                    onClick={() => setOpenDropdown(null)}
                                    className="w-full px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                                  >
                                    <Eye className="w-4 h-4 text-neutral-400" />
                                    Preview Draft
                                  </Link>
                                )}
                                {displayData.published && displayData.slug && (
                                  <button
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      copyProductLink(displayData.slug!, product.id);
                                    }}
                                    className="w-full px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                                  >
                                    <Copy className="w-4 h-4 text-neutral-400" />
                                    {copiedProductId === product.id ? 'Copied!' : 'Copy Link'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Delivery - split dropdown (only for published products) */}
                          {displayData.published && (
                          <div className="relative" data-dropdown-container>
                            <div className="flex">
                              <Link
                                to={`/products/${product.id}/delivery`}
                                className={`px-3.5 py-2 rounded-l-lg transition-colors flex items-center gap-2 text-sm border ${
                                  displayData.deliveryConfigured
                                    ? 'bg-blue-950/30 hover:bg-blue-950/50 text-blue-400 border-blue-800/30'
                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                                } border-r-0`}
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Delivery
                              </Link>
                              {displayData.deliveryConfigured && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(openDropdown === `${product.id}-delivery` ? null : `${product.id}-delivery`);
                                    setOpenMenuId(null);
                                  }}
                                  className="px-1.5 py-2 bg-blue-950/30 hover:bg-blue-950/50 text-blue-400 rounded-r-lg transition-colors border border-blue-800/30"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!displayData.deliveryConfigured && (
                                <span className="px-1.5 py-2 bg-neutral-800 text-neutral-600 rounded-r-lg border border-neutral-700 flex items-center">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            {openDropdown === `${product.id}-delivery` && displayData.deliveryConfigured && (
                              <div className="absolute left-0 top-full mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 py-1">
                                <Link
                                  to={`/products/${product.id}/delivery`}
                                  onClick={() => setOpenDropdown(null)}
                                  className="w-full px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                                >
                                  <Settings className="w-4 h-4 text-neutral-400" />
                                  Edit Delivery
                                </Link>
                                <Link
                                  to={`/products/${product.id}/delivery?preview=true`}
                                  target="_blank"
                                  onClick={() => setOpenDropdown(null)}
                                  className="w-full px-4 py-2.5 text-sm text-purple-400 hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  Preview Delivery
                                </Link>
                              </div>
                            )}
                          </div>
                          )}

                          {/* More Options */}
                          <div className="relative ml-auto" data-menu-container>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === product.id ? null : product.id);
                                setOpenDropdown(null);
                              }}
                              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg transition-colors border border-neutral-700"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === product.id && (
                              <div className="absolute right-0 top-full mt-1 w-56 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 py-1">
                                {/* View Original Idea */}
                                {hasLinkedIdea && idea && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setIdeaModal({ isOpen: true, idea });
                                    }}
                                    className="w-full px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                                  >
                                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                                    View Original Idea
                                  </button>
                                )}

                                {/* Edit Idea (Copy) */}
                                {hasLinkedIdea && idea && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      editIdeaWithWarning(idea.id, idea.productConfig?.name || idea.name || 'this idea');
                                    }}
                                    className="w-full px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4 text-purple-400" />
                                    Edit Idea (Copy)
                                  </button>
                                )}

                                {/* Divider before destructive actions */}
                                <div className="border-t border-neutral-700 my-1" />

                                {/* Delete options */}
                                {hasLinkedIdea && sourceId ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        deleteSalesPageOnly(product.id, sourceId, displayData.title);
                                      }}
                                      className="w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 flex items-center gap-3 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                      Delete Sales Page Only
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        deleteEverything(product.id, sourceId, displayData.title);
                                      }}
                                      className="w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 flex items-center gap-3 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete Everything
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      deleteProduct(product.id, displayData.title);
                                    }}
                                    className="w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 flex items-center gap-3 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Product
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-neutral-900/30 rounded-lg border border-neutral-800">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-950/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-xl text-neutral-300 mb-2">No products yet</p>
            <p className="text-neutral-400 mb-6">Start by discovering a product idea with the Pathfinder</p>
            <Link 
              to="/pathfinder"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium"
            >
              <Sparkles className="w-5 h-5" />
              Start Product Pathfinder
            </Link>
          </div>
        )}
      </div>

      {/* New Product Selection Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create New Product</h2>
              <button
                onClick={() => setShowNewProductModal(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-neutral-400 mb-6">How would you like to start?</p>
            
            <div className="space-y-3">
              {/* Option 1: Product Pathfinder */}
              <button
                onClick={() => {
                  setShowNewProductModal(false);
                  navigate('/pathfinder?new=true');
                }}
                className="w-full p-4 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 border border-purple-500/30 rounded-xl text-left transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Product Pathfinder</h3>
                    <p className="text-sm text-neutral-400">
                      Not sure what to sell? Discover the perfect product based on your skills and audience.
                    </p>
                    <span className="inline-block mt-2 text-xs text-purple-400 font-medium">Recommended for beginners</span>
                  </div>
                </div>
              </button>
              
              {/* Option 2: Create Sales Page Directly */}
              <button
                onClick={() => {
                  setShowNewProductModal(false);
                  navigate('/products/sales');
                }}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-left transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-neutral-700/50 flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-700 transition-colors">
                    <Rocket className="w-6 h-6 text-neutral-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Create Sales Page</h3>
                    <p className="text-sm text-neutral-400">
                      Already know what you're selling? Jump straight into building your sales page.
                    </p>
                    <span className="inline-block mt-2 text-xs text-neutral-500 font-medium">For experienced creators</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Original Idea Modal */}
      {ideaModal.isOpen && ideaModal.idea && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Original Idea
              </h2>
              <button
                onClick={() => setIdeaModal({ isOpen: false, idea: null })}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Product</p>
                <p className="text-neutral-200 font-medium">{ideaModal.idea.productConfig?.name || ideaModal.idea.name}</p>
              </div>

              {/* Target Audience */}
              {ideaModal.idea.productConfig?.targetAudience && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Target Audience</p>
                  <p className="text-neutral-300 text-sm">{ideaModal.idea.productConfig.targetAudience}</p>
                </div>
              )}

              {/* Value Stack */}
              {ideaModal.idea.productConfig?.valueStack && ideaModal.idea.productConfig.valueStack.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Includes ({ideaModal.idea.productConfig.valueStack.length} items)</p>
                  <ul className="text-sm text-neutral-300 space-y-1">
                    {ideaModal.idea.productConfig.valueStack.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Guarantees */}
              {ideaModal.idea.productConfig?.guarantees && ideaModal.idea.productConfig.guarantees.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Guarantees ({ideaModal.idea.productConfig.guarantees.length})</p>
                  <ul className="text-sm text-neutral-300 space-y-1">
                    {ideaModal.idea.productConfig.guarantees.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✔</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mission */}
              {ideaModal.idea.productConfig?.mission && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Mission</p>
                  <p className="text-sm italic text-neutral-300 bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                    "{ideaModal.idea.productConfig.mission}"
                  </p>
                </div>
              )}

              {/* Price & Tier */}
              <div className="flex gap-6 pt-2">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Price</p>
                  <p className="text-neutral-200 font-medium">
                    ${ideaModal.idea.productConfig?.price || 0} 
                    <span className="text-neutral-500 text-xs ml-1">{ideaModal.idea.productConfig?.priceType || 'one-time'}</span>
                  </p>
                </div>
                {ideaModal.idea.productConfig?.tierType && (
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Tier</p>
                    <p className="text-neutral-200 font-medium capitalize">{ideaModal.idea.productConfig.tierType}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Close button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIdeaModal({ isOpen: false, idea: null })}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
}