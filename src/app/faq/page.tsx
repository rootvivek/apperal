export default function FAQPage() {
  const faqs = [
    {
      question: "What payment methods do you accept?",
      answer: "We accept Razorpay (UPI, Cards, Wallets) and Cash on Delivery (COD)."
    },
    {
      question: "How long does shipping take?",
      answer: "We aim to deliver within 3-5 business days. Delivery times may vary based on location."
    },
    {
      question: "Do you offer free shipping?",
      answer: "Yes, we offer free shipping on orders above ₹50."
    },
    {
      question: "Can I return or exchange items?",
      answer: "Yes, we offer a 7-day return policy. Items must be unused and in original packaging with tags."
    },
    {
      question: "How do I track my order?",
      answer: "Once your order is shipped, you'll receive a tracking number via email and SMS. You can track your order from the order details page."
    },
    {
      question: "What if I receive a damaged product?",
      answer: "Please contact our customer service immediately. We'll arrange a replacement or full refund."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h2>
              <p className="text-gray-700">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

