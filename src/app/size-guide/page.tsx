export default function SizeGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Size Guide</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Measure</h2>
            <p className="text-gray-700 mb-4">
              Use a measuring tape to measure your body. Make sure the tape is snug but not tight.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Clothing Sizes</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chest (inches)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waist (inches)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr><td className="px-4 py-3 text-sm text-gray-700">S</td><td className="px-4 py-3 text-sm text-gray-700">36-38</td><td className="px-4 py-3 text-sm text-gray-700">30-32</td></tr>
                  <tr><td className="px-4 py-3 text-sm text-gray-700">M</td><td className="px-4 py-3 text-sm text-gray-700">38-40</td><td className="px-4 py-3 text-sm text-gray-700">32-34</td></tr>
                  <tr><td className="px-4 py-3 text-sm text-gray-700">L</td><td className="px-4 py-3 text-sm text-gray-700">40-42</td><td className="px-4 py-3 text-sm text-gray-700">34-36</td></tr>
                  <tr><td className="px-4 py-3 text-sm text-gray-700">XL</td><td className="px-4 py-3 text-sm text-gray-700">42-44</td><td className="px-4 py-3 text-sm text-gray-700">36-38</td></tr>
                  <tr><td className="px-4 py-3 text-sm text-gray-700">XXL</td><td className="px-4 py-3 text-sm text-gray-700">44-46</td><td className="px-4 py-3 text-sm text-gray-700">38-40</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-700">
              If you&apos;re unsure about your size, please contact our customer service team for assistance.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

