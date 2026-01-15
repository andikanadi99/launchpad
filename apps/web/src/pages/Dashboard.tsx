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
        return { label: 'Quick Win', color: 'bg-green-950/30 text-green-400 border-green-800/30' };
      case 'mid':
        return { label: 'Core Offer', color: 'bg-blue-950/30 text-blue-400 border-blue-800/30' };
      case 'high':
        return { label: 'Premium', color: 'bg-purple-950/30 text-purple-400 border-purple-800/30' };
      default:
        return { label: 'Custom', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' };
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

  // Create sales page from idea
  const createSalesPage = (idea: ProductIdea) => {
    // Navigate to sales page builder with idea data
    navigate(`/products/sales?ideaId=${idea.id}`);
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
            <p className="text-neutral-400 mt-1">Manage your product ideas and sales pages</p>
          </div>
          <Link
            to="/product-idea-copilot"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            New Product Idea
          </Link>
        </div>

        {/* Info Banner */}
        {showInfoBanner && completedIdeas.length === 0 && (
          <div className="mb-6 bg-purple-950/30 border border-purple-800/30 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-purple-300 mb-2">Welcome to LaunchPad!</h3>
                <div className="text-sm text-purple-200/80 space-y-2">
                  <p>
                    <strong className="text-purple-300">Step 1:</strong> Use the Product Idea Co-Pilot to discover what to sell
                  </p>
                  <p>
                    <strong className="text-purple-300">Step 2:</strong> Refine your product idea with pricing and details
                  </p>
                  <p>
                    <strong className="text-purple-300">Step 3:</strong> Create a professional sales page and start selling
                  </p>
                  <p className="text-xs text-purple-300/60 mt-3">
                    Start with the Product Idea Co-Pilot - it's free and takes just 5 minutes!
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
            <p className="text-neutral-400 text-sm mb-1">Product Ideas</p>
            <p className="text-3xl font-bold">{totals.ideas}</p>
          </div>
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Sales Pages</p>
            <p className="text-3xl font-bold">{totals.products}</p>
            <p className="text-xs text-neutral-500">{totals.published} published</p>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-neutral-800">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'ideas' 
                ? 'text-purple-400' 
                : 'text-neutral-400 hover:text-neutral-300'
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
                ? 'text-purple-400' 
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Sales Pages
              {products.length > 0 && (
                <span className="bg-neutral-700 text-neutral-300 text-xs px-2 py-0.5 rounded-full">
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
                <h3 className="text-lg font-semibold text-neutral-300 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  In Progress
                </h3>
                <div className="grid gap-4">
                  {inProgressIdeas.map(idea => (
                    <div 
                      key={idea.id} 
                      className="border border-yellow-800/30 bg-yellow-950/10 rounded-lg p-5 hover:bg-yellow-950/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-neutral-200">{idea.name}</h4>
                          <p className="text-sm text-neutral-500 mt-1">
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
                      className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50 hover:bg-neutral-900/70 transition-colors"
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
                                <span className="text-xs px-2 py-1 rounded-full bg-green-950/30 text-green-400 border border-green-800/30">
                                  Has Sales Page
                                </span>
                              )}
                            </div>
                            <p className="text-neutral-400 text-sm line-clamp-2">
                              {idea.productConfig?.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-400">
                              ${idea.productConfig?.price || 0}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {idea.productConfig?.priceType || 'one-time'}
                            </p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-neutral-500">Target: </span>
                            <span className="text-neutral-300">{idea.productConfig?.targetAudience || 'Not set'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Includes: </span>
                            <span className="text-neutral-300">{idea.productConfig?.valueStack?.length || 0} items</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Guarantees: </span>
                            <span className="text-neutral-300">{idea.productConfig?.guarantees?.length || 0}</span>
                          </div>
                        </div>

                        {/* Mission Statement */}
                        {idea.productConfig?.mission && (
                          <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
                            <p className="text-sm text-purple-300 italic">
                              "{idea.productConfig.mission}"
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-3 border-t border-neutral-800">
                          {!hasSalesPage ? (
                            <button
                              onClick={() => createSalesPage(idea)}
                              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                            >
                              <Rocket className="w-4 h-4" />
                              Create Sales Page
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
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Idea
                          </button>
                          
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
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-neutral-900/30 rounded-lg border border-neutral-800">
                <div className="text-5xl mb-4"></div>
                <p className="text-xl text-neutral-300 mb-2">No product ideas yet</p>
                <p className="text-neutral-400 mb-6">Use the Product Idea Co-Pilot to discover what to sell</p>
                <Link 
                  to="/product-idea-copilot"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium"
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
                    <div key={product.id} className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50 hover:bg-neutral-900/70 transition-colors">
                      <div className="flex flex-col gap-4">
                        {/* Product Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold">{displayData.title}</h3>
                              <p className="text-neutral-400 text-sm mt-1 line-clamp-2">
                                {displayData.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-400">${displayData.price}</p>
                            </div>
                          </div>
                          
                          {/* Status Badges */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                              displayData.published 
                                ? 'bg-green-950/30 text-green-400 border border-green-800/30' 
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            }`}>
                              {displayData.published ? 'Live' : 'Draft'}
                            </span>
                            
                            {displayData.deliveryConfigured && (
                              <span className="text-xs px-2 py-1 bg-blue-950/30 text-blue-400 rounded-full border border-blue-800/30">
                                Delivery Setup
                              </span>
                            )}
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
                              <span className="font-medium text-green-400">
                                ${displayData.revenue.toFixed(2)}
                              </span>
                            </span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-3 border-t border-neutral-800">
                          <Link
                            to={`/products/${product.id}/landing/edit`}
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Link>
                          
                          {displayData.slug && (
                            <a
                              href={`/p/${displayData.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Live
                            </a>
                          )}
                          
                          <Link
                            to={`/products/${product.id}/delivery`}
                            className="px-4 py-2 bg-blue-950/30 hover:bg-blue-950/50 text-blue-400 rounded-lg transition-colors flex items-center gap-2"
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
              <div className="text-center py-16 bg-neutral-900/30 rounded-lg border border-neutral-800">
                <div className="text-5xl mb-4"></div>
                <p className="text-xl text-neutral-300 mb-2">No sales pages yet</p>
                <p className="text-neutral-400 mb-6">
                  {completedIdeas.length > 0 
                    ? 'Create a sales page from one of your product ideas'
                    : 'Start by creating a product idea first'
                  }
                </p>
                {completedIdeas.length > 0 ? (
                  <button
                    onClick={() => setActiveTab('ideas')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors font-medium"
                  >
                    <Lightbulb className="w-5 h-5" />
                    View Product Ideas
                  </button>
                ) : (
                  <Link 
                    to="/product-idea-copilot"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all font-medium"
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