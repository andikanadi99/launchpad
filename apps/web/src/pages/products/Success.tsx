import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Could verify the session with Stripe here
    console.log('Payment successful, session:', sessionId);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-neutral-300 mb-8">
          Thank you for your purchase. You'll receive an email with access details shortly.
        </p>
        <Link 
          to="/"
          className="inline-block px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}