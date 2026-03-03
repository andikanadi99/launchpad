import { Link } from 'react-router-dom';
import { Rocket, ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-neutral-500 text-sm">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-8 leading-relaxed">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using LaunchPad ("the Platform"), you agree to be bound by these
              Terms of Service ("Terms"). If you do not agree to these Terms, you may not use
              the Platform. LaunchPad is operated by LaunchPad ("we," "us," or "our").
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              LaunchPad is a no-code platform that enables creators to build sales pages,
              sell digital products (courses, ebooks, coaching materials, templates, and similar
              digital goods), and receive payments through Stripe. We provide the tools
              and hosting; you provide the content and products.
            </p>
          </Section>

          <Section title="3. Eligibility">
            <p>
              You must be at least 18 years old and capable of forming a binding contract to
              use LaunchPad. By creating an account, you represent that the information you
              provide is accurate and that you have the legal authority to agree to these Terms.
            </p>
          </Section>

          <Section title="4. Account Responsibilities">
            <p>
              You are responsible for maintaining the security of your account credentials and
              for all activity that occurs under your account. You must notify us immediately
              of any unauthorized access. We are not liable for losses resulting from unauthorized
              use of your account.
            </p>
          </Section>

          <Section title="5. Creator Obligations">
            <p>
              As a creator on LaunchPad, you agree to: sell only digital products you have the
              right to distribute; provide accurate descriptions of your products; deliver
              purchased products to customers in a timely manner; comply with all applicable
              laws and regulations, including consumer protection and tax obligations; and
              not use the Platform for any illegal, fraudulent, or harmful purpose.
            </p>
            <p className="mt-3">
              You are solely responsible for the content, quality, and delivery of your
              digital products. LaunchPad does not review, endorse, or guarantee the quality
              of products sold through the Platform.
            </p>
          </Section>

          <Section title="6. Payments and Fees">
            <p>
              Payments are processed through Stripe Connect. By using LaunchPad, you agree
              to Stripe's terms of service in addition to these Terms. Revenue from sales is
              transferred directly to your connected Stripe account, minus Stripe's standard
              processing fees (approximately 2.9% + $0.30 per transaction).
            </p>
            <p className="mt-3">
              LaunchPad's pricing model includes a free tier for your first 5 sales with no
              platform fees. After 5 sales, a flat monthly hosting fee applies. We do not
              charge percentage-based transaction fees. Pricing details are available on
              our website and may be updated with 30 days' notice.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              You retain full ownership of the content and digital products you create and
              sell through LaunchPad. By uploading content, you grant us a limited,
              non-exclusive license to host, display, and distribute your content solely
              for the purpose of operating the Platform and fulfilling purchases.
            </p>
            <p className="mt-3">
              LaunchPad's name, logo, and platform design are our intellectual property and
              may not be used without permission.
            </p>
          </Section>

          <Section title="8. Prohibited Uses">
            <p>
              You may not use LaunchPad to: sell products that infringe on others' intellectual
              property rights; distribute malicious software, spam, or deceptive content;
              engage in any activity that violates applicable laws; resell or redistribute
              access to the Platform itself; or attempt to interfere with the Platform's
              operation or security.
            </p>
          </Section>

          <Section title="9. Refunds and Disputes">
            <p>
              Creators are responsible for setting and honoring their own refund policies.
              We encourage creators to clearly communicate refund terms on their sales pages.
              In the event of a payment dispute or chargeback, the creator is responsible for
              any associated fees and for resolving the dispute with the customer.
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              You may close your account at any time. We reserve the right to suspend or
              terminate accounts that violate these Terms, engage in fraudulent activity,
              or are inactive for an extended period. Upon termination, your published sales
              pages will be taken offline, but you retain ownership of your content.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>
              LaunchPad is provided "as is" without warranties of any kind. To the maximum
              extent permitted by law, we are not liable for any indirect, incidental, special,
              or consequential damages arising from your use of the Platform, including lost
              revenue, data loss, or business interruption. Our total liability shall not exceed
              the amount you paid to LaunchPad in the 12 months preceding the claim.
            </p>
          </Section>

          <Section title="12. Indemnification">
            <p>
              You agree to indemnify and hold harmless LaunchPad, its officers, and employees
              from any claims, damages, or expenses arising from your use of the Platform,
              your products, or your violation of these Terms.
            </p>
          </Section>

          <Section title="13. Changes to These Terms">
            <p>
              We may update these Terms from time to time. Material changes will be communicated
              via email or an in-app notification at least 30 days before taking effect.
              Continued use of the Platform after changes constitutes acceptance of the
              updated Terms.
            </p>
          </Section>

          <Section title="14. Governing Law">
            <p>
              These Terms are governed by the laws of the United States. Any disputes shall
              be resolved through binding arbitration in accordance with the rules of the
              American Arbitration Association, unless you opt out within 30 days of
              creating your account.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              If you have questions about these Terms, please contact us through the
              in-app support page or email us at support@launchpad.com.
            </p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-sm text-neutral-500">LaunchPad</span>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <span className="text-neutral-300">Terms</span>
            <Link to="/privacy" className="hover:text-neutral-300 transition-colors">Privacy</Link>
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