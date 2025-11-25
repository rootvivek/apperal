export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 lg:p-10 space-y-8 text-gray-700">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to Nipto. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
            <p>
              By using our website, you consent to the data practices described in this policy. If you do not agree with the practices described in this policy, please do not use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium text-gray-900 mb-3 mt-4">2.1 Information You Provide Directly</h3>
            <p className="mb-3">
              We collect information that you provide directly to us when you:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Create an account or register for our services</li>
              <li>Make a purchase or place an order</li>
              <li>Subscribe to our newsletter or marketing communications</li>
              <li>Contact us for customer support or inquiries</li>
              <li>Participate in surveys, contests, or promotions</li>
              <li>Leave reviews or comments on our products</li>
            </ul>
            <p className="mb-3">This information may include:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Personal Information:</strong> Full name, email address, phone number, date of birth</li>
              <li><strong>Address Information:</strong> Shipping and billing addresses</li>
              <li><strong>Payment Information:</strong> Credit/debit card details, payment method preferences (processed securely through Razorpay)</li>
              <li><strong>Account Information:</strong> Username, password, profile preferences</li>
              <li><strong>Communication Preferences:</strong> Marketing preferences, notification settings</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-900 mb-3 mt-6">2.2 Information Collected Automatically</h3>
            <p className="mb-3">
              When you visit our website, we automatically collect certain information about your device and browsing behavior:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Device Information:</strong> IP address, browser type, device type, operating system</li>
              <li><strong>Usage Information:</strong> Pages visited, time spent on pages, click patterns, search queries</li>
              <li><strong>Location Information:</strong> General geographic location (based on IP address)</li>
              <li><strong>Cookies and Tracking Technologies:</strong> See our <a href="/cookies" className="text-[#4736FE] hover:underline">Cookie Policy</a> for more details</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-900 mb-3 mt-6">2.3 Information from Third Parties</h3>
            <p className="mb-3">
              We may receive information about you from third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Social media platforms (when you sign in with Google or Facebook)</li>
              <li>Payment processors (Razorpay) for transaction verification</li>
              <li>Analytics providers for website usage statistics</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Order Processing:</strong> To process, fulfill, and deliver your orders</li>
              <li><strong>Customer Service:</strong> To respond to your inquiries, provide support, and handle returns or refunds</li>
              <li><strong>Account Management:</strong> To create and manage your account, verify your identity, and maintain your profile</li>
              <li><strong>Communication:</strong> To send order confirmations, shipping updates, and important account notifications</li>
              <li><strong>Marketing:</strong> To send promotional offers, newsletters, and product recommendations (with your consent)</li>
              <li><strong>Improvement:</strong> To analyze website usage, improve our services, and enhance user experience</li>
              <li><strong>Security:</strong> To detect and prevent fraud, unauthorized access, and other security threats</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
              <li><strong>Personalization:</strong> To customize your shopping experience and show relevant products</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
            <p className="mb-3">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            
            <h3 className="text-xl font-medium text-gray-900 mb-3 mt-4">4.1 Service Providers</h3>
            <p className="mb-3">
              We share information with third-party service providers who perform services on our behalf:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Payment Processors:</strong> Razorpay for secure payment processing</li>
              <li><strong>Shipping Companies:</strong> To deliver your orders</li>
              <li><strong>Cloud Storage:</strong> Supabase for data storage and hosting</li>
              <li><strong>Analytics Providers:</strong> To analyze website traffic and user behavior</li>
              <li><strong>Email Services:</strong> To send transactional and marketing emails</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-900 mb-3 mt-6">4.2 Legal Requirements</h3>
            <p className="mb-3">
              We may disclose your information if required by law or in response to:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Court orders, subpoenas, or legal processes</li>
              <li>Government requests or regulatory requirements</li>
              <li>Protection of our rights, property, or safety</li>
              <li>Prevention of fraud or illegal activities</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-900 mb-3 mt-6">4.3 Business Transfers</h3>
            <p className="mb-4">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="mb-3">
              We implement industry-standard security measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Encryption:</strong> All data transmitted between your browser and our servers is encrypted using SSL/TLS</li>
              <li><strong>Secure Payment Processing:</strong> Payment information is processed securely through Razorpay and is never stored on our servers</li>
              <li><strong>Access Controls:</strong> Limited access to personal information on a need-to-know basis</li>
              <li><strong>Regular Security Audits:</strong> We regularly review and update our security practices</li>
              <li><strong>Secure Storage:</strong> Data is stored on secure servers with appropriate access controls</li>
            </ul>
            <p className="mb-3">
              However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
            <p className="mb-3">You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
              <li><strong>Account Deletion:</strong> Delete your account and associated data through your account settings</li>
              <li><strong>Cookie Preferences:</strong> Manage cookie settings through your browser or our cookie preferences</li>
            </ul>
            <p className="mb-3">
              To exercise these rights, please contact us at <a href="mailto:support@nipto.com" className="text-[#4736FE] hover:underline">support@nipto.com</a> or use the account settings in your profile.
            </p>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking Technologies</h2>
            <p className="mb-3">
              We use cookies and similar tracking technologies to enhance your browsing experience, analyze website traffic, and personalize content. For detailed information about our use of cookies, please see our <a href="/cookies" className="text-[#4736FE] hover:underline">Cookie Policy</a>.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Third-Party Services</h2>
            <p className="mb-3">
              Our website may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Razorpay:</strong> <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-[#4736FE] hover:underline">Privacy Policy</a></li>
              <li><strong>Supabase:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4736FE] hover:underline">Privacy Policy</a></li>
              <li><strong>Google:</strong> <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4736FE] hover:underline">Privacy Policy</a></li>
              <li><strong>Facebook:</strong> <a href="https://www.facebook.com/privacy/explanation" target="_blank" rel="noopener noreferrer" className="text-[#4736FE] hover:underline">Privacy Policy</a></li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="mb-4">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately, and we will take steps to delete such information.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Data Retention</h2>
            <p className="mb-3">
              We retain your personal information for as long as necessary to:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Provide our services and fulfill your orders</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes and enforce our agreements</li>
              <li>Maintain business records as required by law</li>
            </ul>
            <p>
              When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal or business purposes.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. International Data Transfers</h2>
            <p className="mb-4">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our services, you consent to the transfer of your information to these countries. We take appropriate measures to ensure your information is protected in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Posting the updated policy on this page</li>
              <li>Updating the "Last updated" date at the top of this policy</li>
              <li>Sending an email notification for significant changes</li>
            </ul>
            <p>
              Your continued use of our services after the changes become effective constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="mb-3">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-gray-900">Nipto</p>
              <p className="text-gray-700">
                Email: <a href="mailto:support@nipto.com" className="text-[#4736FE] hover:underline">support@nipto.com</a>
              </p>
              <p className="text-gray-700">
                Website: <a href="/contact" className="text-[#4736FE] hover:underline">Contact Us Page</a>
              </p>
            </div>
          </section>

          {/* Footer Note */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <p className="text-sm text-gray-500">
              This Privacy Policy is effective as of the date listed above and applies to all users of Nipto's services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

