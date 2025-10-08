import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Package, X, Edit, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProductPagePreview() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      if (!auth.currentUser || !productId) {
        navigate('/auth/signin');
        return;
      }

      try {
        const productRef = doc(db, 'users', auth.currentUser.uid, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          setProductData(productSnap.data());
        } else {
          console.error('Product not found');
        }
      } catch (error) {
        console.error('Error loading preview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading preview...</div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-400 mb-4">Product preview not available</div>
          <Link
            to="/dashboard"
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hasDelivery = productData.delivery?.type !== 'none';

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5" />
            <div>
              <div className="font-semibold">Product Delivery Preview</div>
              <div className="text-xs text-blue-100">
                This is what customers see AFTER purchasing
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasDelivery ? (
              <Link
                to={`/products/${productId}/delivery`}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Delivery
              </Link>
            ) : (
              <Link
                to={`/products/${productId}/delivery`}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Add Delivery Content
              </Link>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {hasDelivery ? (
          <div className="bg-neutral-900 rounded-xl p-12 border border-neutral-800 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold mb-2">Product Delivery Page</h2>
            <p className="text-neutral-400 mb-6">
              This preview will show your product delivery content once it's configured.
            </p>
            <div className="bg-neutral-800 rounded-lg p-6 text-left">
              <h3 className="font-semibold mb-2">Delivery Type:</h3>
              <p className="text-neutral-400 capitalize">{productData.delivery.type}</p>
              
              {productData.delivery.type === 'content' && (
                <p className="text-sm text-neutral-500 mt-4">
                  Will display text content to customers
                </p>
              )}
              {productData.delivery.type === 'file' && (
                <p className="text-sm text-neutral-500 mt-4">
                  Will display file download links
                </p>
              )}
              {productData.delivery.type === 'redirect' && (
                <p className="text-sm text-neutral-500 mt-4">
                  Will redirect customers to: {productData.delivery.redirectUrl || 'Not set'}
                </p>
              )}
            </div>
            <Link
              to={`/products/${productId}/delivery`}
              className="inline-block mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              Configure Delivery Content →
            </Link>
          </div>
        ) : (
          <div className="bg-neutral-900 rounded-xl p-12 border border-amber-800/30 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-400" />
            <h2 className="text-2xl font-bold mb-2">No Delivery Content Yet</h2>
            <p className="text-neutral-400 mb-6">
              Add delivery content to show customers what they get after purchasing.
            </p>
            <Link
              to={`/products/${productId}/delivery`}
              className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
            >
              Add Delivery Content →
            </Link>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-neutral-500">
          💡 Product delivery pages will be finalized in the next update
        </div>
      </div>
    </div>
  );
}