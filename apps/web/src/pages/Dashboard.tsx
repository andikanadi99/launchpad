import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { setActiveSession } from '../lib/UserDocumentHelpers';
import { 
  Package, 
  ExternalLink, 
  Info, 
  X, 
  Eye, 
  Settings, 
  Lightbulb, 
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  FileText,
  Rocket,
  Lock,
  ChevronRight,
  Sparkles
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
  analytics?: {
    views: number;
    sales: number;
    revenue: number;
  };
  createdAt?: any;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [productIdeas, setProductIdeas] = useState<ProductIdea[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ideas' | 'products'>('ideas');
  const [showInfoBanner, setShowInfoBanner] = useState(() => {
    return localStorage.getItem('hideInfoBanner') !== 'true';
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

  const dismissInfoBanner = () => {
    setShowInfoBanner(false);
    localStorage.setItem('hideInfoBanner', 'true');
  };

  // Filter ideas by status
  const completedIdeas = productIdeas.filter(idea => idea.status === 'completed' && idea.productConfig);
  const inProgressIdeas = productIdeas.filter(idea => idea.status === 'in_progress');

  // Calculate totals
  const totals = {
    ideas: completedIdeas.length,
    products: products.length,
    published: products.filter(p => p.published).length,
    views: products.reduce((sum, p) => sum + (p.analytics?.views || 0), 0),
    sales: products.reduce((sum, p) => sum + (p.analytics?.sales || 0), 0),
    revenue: products.reduce((sum, p) => sum + (p.analytics?.revenue || 0), 0)
  };

  // Get tier label and color
  const getTierInfo = (tierType: string) => {
    switch (tierType) {
      case 'low':
        return { label: 'Quick Win', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' };
      case 'mid':
        return { label: 'Core Offer', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' };
      case 'high':
        return { label: 'Premium', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      default:
        return { label: 'Custom', color: 'bg-[hsl(var(--border))] text-[hsl(var(--muted))] border-[hsl(var(--border))]' };
    }
  };

  // Delete a product idea
  async function deleteIdea(ideaId: string, ideaName: string) {
    if (confirm(`Are you sure you want to delete "${ideaName}"? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'productCoPilotSessions', ideaId));
      } catch (error) {
        console.error('Error deleting idea:', error);
        alert('Failed to delete idea');
      }
    }
  }

  // Continue an in-progress idea
  const continueIdea = async (ideaId: string) => {
    if (!auth.currentUser) return;
    
    try {
      // Set this session as active
      await setActiveSession(auth.currentUser.uid, ideaId);
      // Navigate to co-pilot
      navigate('/product-idea-copilot');
    } catch (error) {
      console.error('Error continuing idea:', error);
    }
  };

  // Edit a completed idea
  const editIdea = async (ideaId: string) => {
    if (!auth.currentUser) return;
    
    try {
      // Set this session as active
      await setActiveSession(auth.currentUser.uid, ideaId);
      // Navigate to co-pilot
      navigate('/product-idea-copilot');
    } catch (error) {
      console.error('Error editing idea:', error);
    }
  };

  // Create sales page from idea (PAID FEATURE)
  const createSalesPage = (idea: ProductIdea) => {
    // TODO: Check if user has paid subscription
    const isPaidUser = false; // Replace with actual check
    
    if (!isPaidUser) {
      // Show upgrade modal
      alert('Creating a Sales Page is a premium feature. Upgrade to unlock!');
      return;
    }
    
    // Navigate to sales page builder with idea data
    navigate(`/products/sales?ideaId=${idea.id}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[hsl(var(--bg))] flex items-center justify-center">
      <div className="text-[hsl(var(--fg))]/60">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] text-[hsl(var(--fg))] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-[hsl(var(--muted))] mt-1">Manage your product ideas and sales pages</p>
          </div>
          <Link
            to="/product-idea-copilot"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium flex items-center gap-2 text-white"
          >
            <Sparkles className="w-5 h-5" />
            New Product Idea
          </Link>
        </div>

        {/* Info Banner */}
        {showInfoBanner && completedIdeas.length === 0 && (
          <div className="mb-6 bg-purple-500/10 border border-purple-500/30 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Welcome to LaunchPad!</h3>
                <div className="text-sm text-purple-700/80 dark:text-purple-200/80 space-y-2">
                  <p>
                    <strong className="text-purple-700 dark:text-purple-300">Step 1:</strong> Use the Product Idea Co-Pilot to discover what to sell
                  </p>
                  <p>
                    <strong className="text-purple-700 dark:text-purple-300">Step 2:</strong> Refine your product idea with pricing and details
                  </p>
                  <p>
                    <strong className="text-purple-700 dark:text-purple-300">Step 3:</strong> Create a professional sales page (Premium)
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-600/60 dark:text-purple-300/60 mt-3">
                    ðŸ’¡ Start with the Product Idea Co-Pilot - it's free and takes just 5 minutes!
                  </p>
                </div>
              </div>
              <button
                onClick={dismissInfoBanner}
                className="p-1 hover:bg-purple-500/20 rounded transition-colors"
              >
                <X className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[hsl(var(--card))] rounded-lg p-5 border border-[hsl(var(--border))]">
            <p className="text-[hsl(var(--muted))] text-sm mb-1">Product Ideas</p>
            <p className="text-3xl font-bold">{totals.ideas}</p>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg p-5 border border-[hsl(var(--border))]">
            <p className="text-[hsl(var(--muted))] text-sm mb-1">Sales Pages</p>
            <p className="text-3xl font-bold">{totals.products}</p>
            <p className="text-xs text-[hsl(var(--muted-fg))]">{totals.published} published</p>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg p-5 border border-[hsl(var(--border))]">
            <p className="text-[hsl(var(--muted))] text-sm mb-1">Total Sales</p>
            <p className="text-3xl font-bold text-green-500">{totals.sales}</p>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg p-5 border border-[hsl(var(--border))]">
            <p className="text-[hsl(var(--muted))] text-sm mb-1">Revenue</p>
            <p className="text-3xl font-bold text-green-500">
              ${totals.revenue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'ideas' 
                ? 'text-purple-500' 
                : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Product Ideas
              {completedIdeas.length > 0 && (
                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {completedIdeas.length}
                </span>
              )}
            </div>
            {activeTab === 'ideas' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'products' 
                ? 'text-purple-500' 
                : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Sales Pages
              {products.length > 0 && (
                <span className="bg-[hsl(var(--border))] text-[hsl(var(--fg))] text-xs px-2 py-0.5 rounded-full">
                  {products.length}
                </span>
              )}
            </div>
            {activeTab === 'products' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        </div>

        {/* Product Ideas Tab */}
        {activeTab === 'ideas' && (
          <div>
            {/* In Progress Ideas */}
            {inProgressIdeas.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[hsl(var(--fg))]/80 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  In Progress
                </h3>
                <div className="grid gap-4">
                  {inProgressIdeas.map(idea => (
                    <div 
                      key={idea.id} 
                      className="border border-yellow-600/30 bg-yellow-500/10 rounded-lg p-5 hover:bg-yellow-500/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{idea.name}</h4>
                          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">
                            Started {idea.createdAt?.toDate?.()?.toLocaleDateString() || 'recently'}
                          </p>
                        </div>
                        <button
                          onClick={() => continueIdea(idea.id)}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          Continue
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Ideas */}
            {completedIdeas.length > 0 ? (
              <div className="grid gap-4">
                {completedIdeas.map(idea => {
                  const tierInfo = getTierInfo(idea.productConfig?.tierType || 'low');
                  const hasSalesPage = !!idea.salesPageId;
                  
                  return (
                    <div 
                      key={idea.id} 
                      className="border border-[hsl(var(--border))] rounded-lg p-6 bg-[hsl(var(--card))] hover:bg-[hsl(var(--card-hover))] transition-colors"
                    >
                      <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold">
                                {idea.productConfig?.name || idea.name}
                              </h3>
                              <span className={`text-xs px-2 py-1 rounded-full border ${tierInfo.color}`}>
                                {tierInfo.label}
                              </span>
                              {hasSalesPage && (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/30">
                                  Has Sales Page
                                </span>
                              )}
                            </div>
                            <p className="text-[hsl(var(--muted))] text-sm line-clamp-2">
                              {idea.productConfig?.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-500">
                              ${idea.productConfig?.price || 0}
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-fg))]">
                              {idea.productConfig?.priceType || 'one-time'}
                            </p>
                          </div>
                        </div>

                        {/* Mission Statement */}
                        {idea.productConfig?.mission && (
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                            <p className="text-sm text-purple-600 dark:text-purple-600 dark:text-purple-400 italic">
                              "{idea.productConfig.mission}"
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-3 border-t border-[hsl(var(--border))]">
                          {!hasSalesPage ? (
                            <button
                              onClick={() => createSalesPage(idea)}
                              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                            >
                              <Rocket className="w-4 h-4" />
                              Create Sales Page
                              <Lock className="w-3 h-3 opacity-60" />
                            </button>
                          ) : (
                            <Link
                              to={`/products/${idea.salesPageId}/landing/edit`}
                              className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Sales Page
                            </Link>
                          )}
                          
                          <button
                            onClick={() => editIdea(idea.id)}
                            className="px-4 py-2 bg-[hsl(var(--border))] hover:bg-[hsl(var(--muted-fg))]/20 text-[hsl(var(--fg))]/80 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Idea
                          </button>
                          
                          <button
                            onClick={() => deleteIdea(idea.id, idea.productConfig?.name || idea.name)}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-[hsl(var(--card))]/50 rounded-lg border border-[hsl(var(--border))]">
                <div className="text-5xl mb-4">💡</div>
                <p className="text-xl text-[hsl(var(--fg))]/80 mb-2">No product ideas yet</p>
                <p className="text-[hsl(var(--muted))] mb-6">Use the Product Idea Co-Pilot to discover what to sell</p>
                <Link 
                  to="/product-idea-copilot"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium text-white"
                >
                  <Sparkles className="w-5 h-5" />
                  Start Product Idea Co-Pilot
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Sales Pages Tab */}
        {activeTab === 'products' && (
          <div>
            {products.length > 0 ? (
              <div className="grid gap-4">
                {products.map(product => {
                  const displayData = {
                    title: product.salesPage?.coreInfo?.name || 'Untitled',
                    description: product.salesPage?.valueProp?.description || '',
                    price: product.salesPage?.coreInfo?.price || 0,
                    published: product.published || false,
                    views: product.analytics?.views || 0,
                    sales: product.analytics?.sales || 0,
                    revenue: product.analytics?.revenue || 0,
                    slug: product.salesPage?.publish?.slug,
                    deliveryType: product.delivery?.type || 'none',
                    deliveryConfigured: product.delivery?.status === 'configured'
                  };

                  return (
                    <div key={product.id} className="border border-[hsl(var(--border))] rounded-lg p-6 bg-[hsl(var(--card))] hover:bg-[hsl(var(--card-hover))] transition-colors">
                      <div className="flex flex-col gap-4">
                        {/* Product Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold">{displayData.title}</h3>
                              <p className="text-[hsl(var(--muted))] text-sm mt-1 line-clamp-2">
                                {displayData.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-500">${displayData.price}</p>
                            </div>
                          </div>
                          
                          {/* Status Badges */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                              displayData.published 
                                ? 'bg-green-950/30 text-green-500 border border-green-500/30' 
                                : 'bg-[hsl(var(--border))] text-[hsl(var(--muted))] border border-[hsl(var(--border))]'
                            }`}>
                              {displayData.published ? 'ðŸŸ¢ Live' : 'âš« Draft'}
                            </span>
                            
                            {displayData.deliveryConfigured && (
                              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded-full border border-blue-500/30">
                                âœ“ Delivery Setup
                              </span>
                            )}
                          </div>
                          
                          {/* Analytics */}
                          <div className="flex gap-6 text-sm">
                            <span className="flex items-center gap-2">
                              <span className="text-[hsl(var(--muted-fg))]">Views:</span>
                              <span className="font-medium">{displayData.views}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="text-[hsl(var(--muted-fg))]">Sales:</span>
                              <span className="font-medium text-green-500">{displayData.sales}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="text-[hsl(var(--muted-fg))]">Revenue:</span>
                              <span className="font-medium text-green-500">
                                ${displayData.revenue.toFixed(2)}
                              </span>
                            </span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-3 border-t border-[hsl(var(--border))]">
                          <Link
                            to={`/products/${product.id}/landing/edit`}
                            className="px-4 py-2 bg-[hsl(var(--border))] hover:bg-[hsl(var(--muted-fg))]/20 text-[hsl(var(--fg))]/80 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Link>
                          
                          {displayData.slug && (
                            <a
                              href={`/p/${displayData.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-[hsl(var(--border))] hover:bg-[hsl(var(--muted-fg))]/20 text-[hsl(var(--fg))]/80 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Live
                            </a>
                          )}
                          
                          <Link
                            to={`/products/${product.id}/delivery`}
                            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Settings className="w-4 h-4" />
                            Delivery
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-[hsl(var(--card))]/50 rounded-lg border border-[hsl(var(--border))]">
                <div className="text-5xl mb-4">ðŸ“„</div>
                <p className="text-xl text-[hsl(var(--fg))]/80 mb-2">No sales pages yet</p>
                <p className="text-[hsl(var(--muted))] mb-6">
                  {completedIdeas.length > 0 
                    ? 'Create a sales page from one of your product ideas'
                    : 'Start by creating a product idea first'
                  }
                </p>
                {completedIdeas.length > 0 ? (
                  <button
                    onClick={() => setActiveTab('ideas')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors font-medium text-white"
                  >
                    <Lightbulb className="w-5 h-5" />
                    View Product Ideas
                  </button>
                ) : (
                  <Link 
                    to="/product-idea-copilot"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium text-white"
                  >
                    <Sparkles className="w-5 h-5" />
                    Start Product Idea Co-Pilot
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}