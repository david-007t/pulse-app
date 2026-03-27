'use client'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()
  return (
    <div className="min-h-dvh bg-[#0A0A0F] px-6 py-8 max-w-[640px] mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[#7C3AED] text-sm mb-8">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back
      </button>
      <h1 className="text-2xl font-bold text-[#F1F5F9] mb-2">Privacy Policy</h1>
      <p className="text-[#64748B] text-sm mb-8">Effective March 2026</p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">1. What We Collect</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        We collect the following information to provide the Pulse service: your location (when you use the app), your name and profile photo (from your sign-in provider), your email address, and optionally your phone number if you provide it. We also collect standard usage data such as app interactions and error logs.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">2. How We Use Your Data</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        Your data is used to show you what&apos;s nearby, help friends find and connect with you on the map, personalize your experience, and improve the app. Location data is used only while the app is active and is not stored beyond what is needed to deliver the service.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">3. Service Providers</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        We use Supabase as our backend and database provider, and Google for authentication. These providers process your data on our behalf under their own privacy policies. We do not use advertising networks or sell your data to third parties.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">4. We Do Not Sell Your Data</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        We do not sell, rent, or trade your personal information to any third party for marketing purposes. Your data exists solely to power the Pulse experience.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">5. Your Rights</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        You can request access to, correction of, or deletion of your personal data at any time. Deleting your Pulse account permanently removes your profile, location history, and connections from our systems. You can also revoke location access via your device settings at any time.
      </p>

      <h2 className="text-[#F1F5F9] font-semibold text-base mb-2 mt-6">6. Contact</h2>
      <p className="text-[#94A3B8] text-sm leading-relaxed">
        Privacy questions or data requests? Contact us at{' '}
        <a href="mailto:hello@getpulse.app" className="text-[#7C3AED] underline underline-offset-2">hello@getpulse.app</a>.
      </p>

      <div className="h-12" />
    </div>
  )
}
