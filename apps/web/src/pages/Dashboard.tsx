import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Package, ExternalLink } from 'lucide-react';

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'sales' | 'views' | 'revenue'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const productsRef = collection(db, 'users', auth.currentUser.uid, 'products');
    const q = query(productsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    // Handle both old products (title) and new sales pages (salesPage.coreInfo.name)
    const productName = product.title || product.salesPage?.coreInfo?.name || '';
    const productDesc = product.description || product.salesPage?.valueProp?.description || '';
    
    const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          productDesc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'published' && product.published) ||
      (filterStatus === 'draft' && !product.published);
    return matchesSearch && matchesStatus;
  });

  // Sort filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch(sortBy) {
      case 'sales': 
        return (b.analytics?.sales || b.sales || 0) - (a.analytics?.sales || a.sales || 0);
      case 'views': 
        return (b.analytics?.views || b.views || 0) - (a.analytics?.views || a.views || 0);
      case 'revenue':
        const aRevenue = (a.analytics?.revenue || ((a.sales || 0) * (a.price || 0) / 100));
        const bRevenue = (b.analytics?.revenue || ((b.sales || 0) * (b.price || 0) / 100));
        return bRevenue - aRevenue;
      case 'newest': 
      default: 
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    }
  });

  // Calculate totals
  const totals = {
    products: products.length,
    views: products.reduce((sum, p) => sum + (p.analytics?.views || p.views || 0), 0),
    sales: products.reduce((sum, p) => sum + (p.analytics?.sales || p.sales || 0), 0),
    revenue: products.reduce((sum, p) => {
      const revenue = p.analytics?.revenue || ((p.sales || 0) * (p.price || 0) / 100);
      return sum + revenue;
    }, 0)
  };

  function copyProductLink(product: any) {
    const isSalesPage = !!product.salesPage;
    const slug = product.salesPage?.publish?.slug;
    
    let url: string;
    if (isSalesPage && slug) {
      url = `https://launchpad.app/p/${slug}`;
    } else {
      url = `${window.location.origin}/p/${auth.currentUser?.uid}/${product.id}`;
    }
    
    navigator.clipboard.writeText(url);
    setCopiedId(product.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function togglePublish(productId: string, currentStatus: boolean) {
    try {
      const productRef = doc(db, 'users', auth.currentUser!.uid, 'products', productId);
      await updateDoc(productRef, {
        published: !currentStatus
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  }

  async function deleteProduct(productId: string, productTitle: string) {
    if (confirm(`Are you sure you want to delete "${productTitle}"? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'products', productId));
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
      }
    }
  }

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
            <p className="text-neutral-400 mt-1">Manage your digital products</p>
          </div>
          <Link
            to="/products/sales"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all font-medium"
          >
            + Create Sales Page
          </Link>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Total Products</p>
            <p className="text-3xl font-bold">{totals.products}</p>
          </div>
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Total Views</p>
            <p className="text-3xl font-bold">{totals.views.toLocaleString()}</p>
          </div>
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Total Sales</p>
            <p className="text-3xl font-bold text-green-400">{totals.sales}</p>
          </div>
          <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
            <p className="text-neutral-400 text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-green-400">
              ${totals.revenue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-600"
          >
            <option value="all">All Products</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-600"
          >
            <option value="newest">Newest First</option>
            <option value="sales">Most Sales</option>
            <option value="views">Most Views</option>
            <option value="revenue">Highest Revenue</option>
          </select>
        </div>
        
        {/* Products List */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900/30 rounded-lg border border-neutral-800">
            {products.length === 0 ? (
              <>
                <div className="text-5xl mb-4">📦</div>
                <p className="text-xl text-neutral-300 mb-2">No products yet</p>
                <p className="text-neutral-400 mb-6">Create your first sales page to start selling</p>
                <Link 
                  to="/products/sales"
                  className="inline-block px-6 py-3 bg-green-600 rounded-lg hover:bg-green-500 transition-colors"
                >
                  Create Your First Sales Page →
                </Link>
              </>
            ) : (
              <>
                <p className="text-xl text-neutral-300 mb-2">No products match your filters</p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                  className="text-green-400 hover:text-green-300"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedProducts.map(product => {
              // Normalize data structure
              const isSalesPage = !!product.salesPage;
              const displayData = isSalesPage ? {
                title: product.salesPage.coreInfo.name,
                description: product.salesPage.valueProp.description,
                price: product.salesPage.coreInfo.price * 100, // Store in cents
                published: product.published,
                views: product.analytics?.views || 0,
                sales: product.analytics?.sales || 0,
                revenue: product.analytics?.revenue || 0,
                videoUrl: product.salesPage.visuals?.videoUrl,
                slug: product.salesPage.publish?.slug,
                hasDelivery: product.delivery?.type !== 'none'
              } : {
                title: product.title,
                description: product.description,
                price: product.price,
                published: product.published,
                views: product.views || 0,
                sales: product.sales || 0,
                revenue: ((product.sales || 0) * (product.price || 0) / 100),
                videoUrl: product.videoUrl,
                slug: null,
                hasDelivery: false
              };

              return (
                <div key={product.id} className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50 hover:bg-neutral-900/70 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div>
                          <h3 className="text-xl font-semibold">{displayData.title}</h3>
                          <p className="text-neutral-400 text-sm mt-1 line-clamp-2">
                            {displayData.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          displayData.published 
                            ? 'bg-green-950/30 text-green-400 border border-green-800/30' 
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}>
                          {displayData.published ? '🟢 Live' : '⚫ Draft'}
                        </span>
                        
                        <span className="text-xs px-2 py-1 bg-neutral-800 text-neutral-300 rounded-full">
                          ${(displayData.price / 100).toFixed(2)}
                        </span>
                        
                        {isSalesPage && (
                          <span className="text-xs px-2 py-1 bg-indigo-950/30 text-indigo-400 rounded-full border border-indigo-800/30">
                            📄 Sales Page
                          </span>
                        )}
                        
                        {isSalesPage && displayData.hasDelivery ? (
                          <span className="text-xs px-2 py-1 bg-green-950/30 text-green-400 rounded-full border border-green-800/30">
                            ✓ Delivery Set
                          </span>
                        ) : isSalesPage && (
                          <span className="text-xs px-2 py-1 bg-amber-950/30 text-amber-400 rounded-full border border-amber-800/30">
                            ⚠️ No Delivery
                          </span>
                        )}
                        
                        {displayData.videoUrl && (
                          <span className="text-xs px-2 py-1 bg-purple-950/30 text-purple-400 rounded-full border border-purple-800/30">
                            📹 Video
                          </span>
                        )}
                        
                        {!isSalesPage && product.content && !product.content.startsWith('[REDIRECT:') && (
                          <span className="text-xs px-2 py-1 bg-blue-950/30 text-blue-400 rounded-full border border-blue-800/30">
                            📝 Text
                          </span>
                        )}
                        {!isSalesPage && product.content?.startsWith('[REDIRECT:') && (
                          <span className="text-xs px-2 py-1 bg-yellow-950/30 text-yellow-400 rounded-full border border-yellow-800/30">
                            🔗 External
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
                        {displayData.sales > 0 && displayData.views > 0 && (
                          <span className="flex items-center gap-2">
                            <span className="text-neutral-500">Conv:</span>
                            <span className="font-medium">
                              {((displayData.sales / displayData.views) * 100).toFixed(1)}%
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {/* Share Link */}
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => copyProductLink(product)}
                          className={`px-3 py-1.5 rounded text-sm transition-all ${
                            copiedId === product.id
                              ? 'bg-green-600 text-white'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                          }`}
                        >
                          {copiedId === product.id ? '✓ Copied!' : 'Copy Link'}
                        </button>
                        
                        {isSalesPage && displayData.slug ? (
                          <a
                            href={`https://launchpad.app/p/${displayData.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-neutral-800 rounded hover:bg-neutral-700 text-sm text-neutral-300 flex items-center gap-1"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          
                          <a  href={`/p/${auth.currentUser?.uid}/${product.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-neutral-800 rounded hover:bg-neutral-700 text-sm text-neutral-300"
                          >
                            View →
                          </a>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {/* Preview Buttons - Only for Sales Pages */}
                        {isSalesPage && (
                          <>
                            <Link
                              to={`/preview/sales/${product.id}`}
                              target="_blank"
                              className="px-3 py-1.5 rounded text-xs bg-purple-950/30 text-purple-400 hover:bg-purple-950/50 transition-colors flex items-center gap-1"
                            >
                              👁️ Sales
                            </Link>
                            
                            {displayData.hasDelivery && (
                              <Link
                                to={`/preview/product/${product.id}`}
                                target="_blank"
                                className="px-3 py-1.5 rounded text-xs bg-blue-950/30 text-blue-400 hover:bg-blue-950/50 transition-colors flex items-center gap-1"
                              >
                                👁️ Product
                              </Link>
                            )}
                          </>
                        )}
                        
                        {/* Edit Button */}
                        <Link
                          to={isSalesPage ? `/products/${product.id}/landing/edit` : `/products/edit/${product.id}`}
                          className="px-3 py-1.5 rounded text-xs bg-blue-950/30 text-blue-400 hover:bg-blue-950/50 transition-colors"
                        >
                          Edit
                        </Link>
                        
                        {isSalesPage && !displayData.hasDelivery && (
                          <Link
                            to={`/products/${product.id}/delivery`}
                            className="px-3 py-1.5 rounded text-xs bg-amber-950/30 text-amber-400 hover:bg-amber-950/50 transition-colors"
                          >
                            Add Delivery
                          </Link>
                        )}
                        
                        <button
                          onClick={() => togglePublish(product.id, displayData.published)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            displayData.published 
                              ? 'bg-yellow-950/30 text-yellow-400 hover:bg-yellow-950/50' 
                              : 'bg-green-950/30 text-green-400 hover:bg-green-950/50'
                          }`}
                        >
                          {displayData.published ? 'Unpublish' : 'Publish'}
                        </button>
                        
                        <button
                          onClick={() => deleteProduct(product.id, displayData.title)}
                          className="px-3 py-1.5 rounded text-xs bg-red-950/30 text-red-400 hover:bg-red-950/50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}