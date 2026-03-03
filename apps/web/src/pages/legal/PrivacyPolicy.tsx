import { Link } from 'react-router-dom';
import { Rocket, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const lastUpdated = 'March 2, 2026';

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-300">
      {/* Nav */}
      <nav className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">LaunchPad</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-20">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-neutral-500 text-sm">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-8 leading-relaxed">
          <Section title="1. Introduction">
            <p>
              LaunchPad ("we," "us," or "our") respects your privacy. This Privacy Policy
              explains how we collect, use, store, and protect your information when you use
              our platform. By using LaunchPad, you consent to the practices described here.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="font-medium text-neutral-300 mt-2">Account Information</p>
            <p>
              When you create an account, we collect your name, email address, and
              authentication credentials. If you connect a Stripe account, we store your
              Stripe account ID and connection status (we do not store your banking details).
            </p>

            <p className="font-medium text-neutral-300 mt-4">Product and Content Data</p>
            <p>
              We store the digital products you create, including sales page content, product
              descriptions, pricing, uploaded files, images, and delivery configurations.
              This data is necessary to operate the Platform and fulfill customer purchases.
            </p>

            <p className="font-medium text-neutral-300 mt-4">Usage and Analytics Data</p>
            <p>
              We collect anonymous page view counts for published product pages to provide
              creators with analytics. We do not track visitors across websites or collect
              personally identifiable information from page visitors. We also collect basic
              usage data such as feature interactions to improve the Platform.
            </p>

            <p className="font-medium text-neutral-300 mt-4">AI Feature Data</p>
            <p>
              If you use our AI-powered features (Product Pathfinder, AI Sales Copywriter),
              your inputs are sent to our AI provider (Anthropic) for processing. We log
              usage metadata (token counts, timestamps) for cost tracking but do not store
              the full content of AI conversations beyond your saved session data.
            </p>

            <p className="font-medium text-neutral-300 mt-4">Payment Data</p>
            <p>
              All payment processing is handled by Stripe. We do not collect, store, or have
              access to credit card numbers or bank account details. Stripe's privacy policy
              governs how they handle payment information.
            </p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>
              We use your information to: operate and maintain your account and products;
              process transactions and deliver purchased products to customers; provide
              analytics about your product performance; improve the Platform's features and
              user experience; communicate important updates about the service; and prevent
              fraud and ensure platform security.
            </p>
          </Section>

          <Section title="4. Information Sharing">
            <p>
              We do not sell your personal information. We share data only in these limited
              circumstances: with Stripe, to process payments on your behalf; with Anthropic,
              to power AI features (inputs are processed but not retained for training);
              with customers, who see your public sales page content and creator profile;
              and as required by law, to comply with legal obligations, enforce our Terms, or
              protect the rights and safety of our users.
            </p>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>
              Your data is stored on Google Firebase infrastructure, which provides
              industry-standard encryption at rest and in transit. We implement access controls
              so that your private product data is only accessible to you. However, no method
              of electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="6. Your Rights">
            <p>
              You have the right to: access the personal information we hold about you;
              correct inaccurate information in your account; delete your account and associated
              data (by contacting us or through account settings); export your product data;
              and opt out of non-essential communications.
            </p>
            <p className="mt-3">
              To exercise these rights, contact us through the in-app support page or email
              us at support@launchpad.com. We will respond to requests within 30 days.
            </p>
          </Section>

          <Section title="7. Cookies and Tracking">
            <p>
              LaunchPad uses essential cookies for authentication and session management.
              We do not use advertising cookies or third-party tracking pixels. We do not
              participate in cross-site tracking or sell browsing data to advertisers.
            </p>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We retain your account and product data for as long as your account is active.
              If you delete your account, we will remove your personal data within 30 days,
              except where retention is required by law (such as transaction records for tax
              purposes). Anonymized analytics data may be retained indefinitely.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              LaunchPad is not intended for use by anyone under 18 years of age. We do not
              knowingly collect personal information from children. If we learn that we have
              collected data from a child, we will delete it promptly.
            </p>
          </Section>

          <Section title="10. International Users">
            <p>
              LaunchPad is operated from the United States. If you are accessing the Platform
              from outside the US, your information will be transferred to and processed in
              the United States. By using the Platform, you consent to this transfer.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated via email or an in-app notification at least 30 days before taking
              effect. The "Last updated" date at the top reflects the most recent revision.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              If you have questions about this Privacy Policy or how we handle your data,
              please contact us through the in-app support page or email us at
              support@launchpad.com.
            </p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-sm text-neutral-500">LaunchPad</span>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <Link to="/terms" className="hover:text-neutral-300 transition-colors">Terms</Link>
            <span className="text-neutral-300">Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="text-neutral-400 space-y-2">{children}</div>
    </section>
  );
}