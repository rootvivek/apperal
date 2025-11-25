export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceptance of Terms</h2>
            <p>
              By accessing and using Nipto, you accept and agree to be bound by these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Products and Pricing</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>All product prices are listed in Indian Rupees (INR)</li>
              <li>We reserve the right to change prices at any time</li>
              <li>Product images are for illustration purposes only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Orders and Payment</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>All orders are subject to product availability</li>
              <li>We accept payments through Razorpay and Cash on Delivery</li>
              <li>Orders are confirmed only after payment verification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Returns and Refunds</h2>
            <p>
              Please refer to our Returns & Exchanges policy for details on returns and refunds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p>
              For questions about these Terms, please contact us at support@nipto.com
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

