export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Returns & Exchanges</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Return Policy</h2>
            <p className="text-gray-700 mb-4">
              We offer a 7-day return policy on most items. Items must be unused, unwashed, and in their original packaging with tags attached.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>• Returns must be initiated within 7 days of delivery</li>
              <li>• Items must be in original condition with tags</li>
              <li>• Refunds will be processed within 5-7 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Return</h2>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Contact our customer service team or visit your order page</li>
              <li>Request a return authorization</li>
              <li>Pack the item securely in its original packaging</li>
              <li>Ship the item back using the provided return label</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Exchanges</h2>
            <p className="text-gray-700">
              We currently offer exchanges for size issues. Please contact our customer service team to initiate an exchange.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

