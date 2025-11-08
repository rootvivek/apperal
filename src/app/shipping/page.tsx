export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping Information</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Rates</h2>
            <ul className="space-y-2 text-gray-700">
              <li>• <strong>Free Shipping:</strong> Orders above ₹50</li>
              <li>• <strong>Standard Shipping:</strong> ₹9.99 for orders below ₹50</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Time</h2>
            <p className="text-gray-700">
              We aim to deliver your orders within 3-5 business days. Delivery times may vary based on your location and product availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Locations</h2>
            <p className="text-gray-700">
              We currently ship to all major cities and towns across India. For remote locations, delivery may take additional time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Tracking</h2>
            <p className="text-gray-700">
              Once your order is shipped, you will receive a tracking number via email and SMS. You can track your order using the tracking link provided.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

