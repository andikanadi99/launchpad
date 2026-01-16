import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import SalesPageContent from './SalesPageContent';
import { Eye, X, Edit, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SalesPagePreview() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [salesPageData, setSalesPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPublished, setIsPublished] = useState(false);

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
          const data = productSnap.data();
          if (data.salesPage) {
            setSalesPageData(data.salesPage);
            setIsPublished(data.published || false);
          } else {
            console.error('No sales page data found');
          }
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

  if (!salesPageData) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-400 mb-4">Sales page preview not available</div>
          <Link
            to="/dashboard"
            className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-2 justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5" />
            <div>
              <div className="font-semibold flex items-center gap-2">
                Preview Mode
                {isPublished && (
                  <span className="text-xs px-2 py-0.5 bg-green-500 rounded-full">Live</span>
                )}
              </div>
              <div className="text-xs text-purple-200">
                This is how your sales page appears to customers
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              to={`/products/${productId}/edit`}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sales Page Content */}
      <SalesPageContent 
        data={salesPageData}
        onCtaClick={() => {
          alert('Preview Mode\n\nButtons are disabled in preview. Publish your page to enable purchases.');
        }}
      />
    </div>
  );
}