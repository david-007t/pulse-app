'use client'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()
  return (
    <div className="min-h-dvh bg-[#0A0A0F] px-6 py-8 max-w-[640px] mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[#7C3AED] text-sm mb-8">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back
      </button>
      <h1 className="text-2xl font-bold text-[#F1F5F9] mb-2">Terms of Service</h1>
      <p className="text-[#64748B] text-sm mb-8">Effective March 2026</p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">1. Acceptance of Terms</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        By accessing or using Pulse, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app. We may update these terms from time to time — continued use of Pulse after changes constitutes acceptance of the revised terms.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">2. The Service</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        Pulse is a location-based social discovery app that helps you find and share what&apos;s happening around you. Features include viewing nearby places and events, connecting with friends, and sharing your location. Pulse is currently in beta — features may change, and availability is not guaranteed.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">3. User Accounts</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        You must create an account to use Pulse. You are responsible for maintaining the security of your account and for all activity under it. You must be at least 13 years old to use Pulse. Provide accurate information during registration and keep it up to date.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">4. User Conduct</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        You agree not to use Pulse to harass, threaten, or harm others; share illegal, obscene, or misleading content; attempt to gain unauthorized access to other accounts or systems; or use automated tools to scrape or abuse the service. We reserve the right to suspend accounts that violate these rules.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">5. Location Data &amp; Privacy</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        Pulse collects and uses your location to provide core features. By using Pulse, you consent to this collection as described in our Privacy Policy. You control when your location is shared and can revoke access through your device settings at any time.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">6. Disclaimer of Warranties</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        Pulse is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or free of harmful components. Use of the service is at your own risk.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">7. Changes to Terms</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        We may modify these Terms at any time. We will notify you of significant changes via the app or email. Your continued use of Pulse after changes are posted constitutes your acceptance of the updated Terms.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">8. Contact</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        Questions about these Terms? Reach us at{' '}
        <a href="mailto:hello@getpulse.app" className="text-[#7C3AED] underline underline-offset-2">hello@getpulse.app</a>.
      </p>

      <div className="h-12" />
    </div>
  )
}
