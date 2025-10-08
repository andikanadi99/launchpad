import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Check, ExternalLink, Edit, Share2, Copy } from 'lucide-react';

export default function PublishSuccess() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [productName, setProductName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      if (!auth.currentUser || !productId) return;
      
      const productRef = doc(db, 'users', auth.currentUser.uid, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const data = productSnap.data();
        setSlug(data.salesPage?.publish?.slug || '');
        setProductName(data.salesPage?.coreInfo?.name || 'Your Product');
      }
    };
    
    loadProduct();
  }, [productId]);

  const publicUrl = `https://launchpad.app/p/${slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold mb-3">🎉 Your Page is Live!</h1>
          <p className="text-neutral-400 text-lg">
            {productName} is now published and ready to share
          </p>
        </div>

        {/* URL Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
            <label className="text-sm font-medium text-neutral-400 mb-3 block">
                Your Public Sales Page
            </label>
            <div className="flex gap-3">
                <div className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 font-mono text-sm text-indigo-400">
                {publicUrl}
                </div>
                <button
                onClick={copyUrl}
                className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                ) : (
                    <Copy className="w-4 h-4" />
                )}
                </button>
                
                <a href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2"
                >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">View Live</span>
                </a>
            </div>
            </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigate(`/products/${productId}/landing/edit`)}
            className="p-4 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-colors text-left group"
          >
            <Edit className="w-5 h-5 text-neutral-400 group-hover:text-white mb-2 transition-colors" />
            <p className="font-medium mb-1">Make Changes</p>
            <p className="text-sm text-neutral-500">Edit your sales page</p>
          </button>

          <button
            onClick={() => {
              // TODO: Implement share functionality
              alert('Share functionality coming soon!');
            }}
            className="p-4 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-colors text-left group"
          >
            <Share2 className="w-5 h-5 text-neutral-400 group-hover:text-white mb-2 transition-colors" />
            <p className="font-medium mb-1">Share</p>
            <p className="text-sm text-neutral-500">Social media & email</p>
          </button>
        </div>

        {/* Next Steps */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6">
          <p className="font-medium mb-3">📊 Next Steps:</p>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">1.</span>
              <span>Test your sales page by visiting the live URL</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">2.</span>
              <span>Set up payment processing (coming soon)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">3.</span>
              <span>Share your page link on social media</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">4.</span>
              <span>Track your page analytics (coming soon)</span>
            </li>
          </ul>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}