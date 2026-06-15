"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, User, ShoppingBag, ArrowRight, BarChart3, Bot, TrendingUp, CheckCircle2, X, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const triggerDemoFlow = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsZoomed(true);
    
    setTimeout(() => {
      setIsFading(true);
    }, 1200);

    setTimeout(() => {
      router.push('/dashboard');
    }, 2200);
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authForm.email || !authForm.password) {
      setAuthError('Please fill in all fields.');
      return;
    }

    if (authMode === 'signup' && !authForm.name) {
      setAuthError('Please enter your name.');
      return;
    }

    setAuthLoading(true);

    // Simulate authentication with a short delay
    setTimeout(() => {
      setAuthLoading(false);
      setIsZoomed(true);
      setShowAuth(false);

      setTimeout(() => {
        setIsFading(true);
      }, 800);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1800);
    }, 1200);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAuth(false);
    };
    if (showAuth) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAuth]);

  return (
    
    <div className={`min-h-screen flex flex-col transition-opacity duration-1000 ${isFading ? 'opacity-0' : ''}`}>
        {/*  TopNavBar  */}
        <nav className="fixed top-0 w-full z-50 glass-panel border-b border-landing-outline-variant/30 shadow-sm landing-nav-transition">
            <div
                className="flex justify-between items-center h-20 px-landing-margin-mobile md:px-margin-desktop max-w-landing-container-max-width mx-auto">
                {/*  Mobile Menu Button  */}
                <button onClick={() => router.push('/dashboard')} className="md:hidden text-landing-secondary hover:opacity-80 transition-opacity duration-300">
                    <Menu size={24} />
                </button>
                {/*  Left spacer for desktop (replaces removed nav links)  */}
                <div className="hidden md:flex items-center">
                </div>
                {/*  Brand Logo  */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                    <a className="font-landing-display-lg text-landing-title-md tracking-tighter text-landing-secondary" href="/">RADIANCE AI</a>
                </div>
                {/*  Trailing Action / Icons  */}
                <div className="flex items-center space-x-6">
                    <div className="hidden md:flex items-center space-x-6 text-landing-secondary">
                        <User onClick={() => setShowAuth(true)} size={22} className="cursor-pointer hover:text-primary transition-colors" />
                    </div>
                    <button
                        className=" font-landing-label-caps text-landing-label-caps text-landing-on-primary bg-landing-inverse-surface px-6 py-3 rounded-lg hover:opacity-90 transition-opacity hidden md:block" onClick={triggerDemoFlow}>
                        Request Demo
                    </button>
                    <button onClick={() => setShowAuth(true)} className="md:hidden text-landing-secondary hover:opacity-80 transition-opacity duration-300">
                        <User size={22} />
                    </button>
                </div>
            </div>
        </nav>

        {/*  Auth Modal  */}
        {showAuth && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAuth(false)}
            />
            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-landing-surface-container-lowest rounded-2xl shadow-2xl border border-landing-outline-variant/20 overflow-hidden animate-[fadeInUp_0.3s_ease-out]">
              {/* Close button */}
              <button
                onClick={() => setShowAuth(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-landing-on-surface-variant hover:bg-landing-outline-variant/10 transition-colors z-10"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="pt-10 pb-6 px-8 text-center bg-landing-primary-container/30">
                <div className="w-14 h-14 rounded-full bg-landing-inverse-surface flex items-center justify-center mx-auto mb-4">
                  {authMode === 'login' ? (
                    <LogIn size={24} className="text-landing-on-primary" />
                  ) : (
                    <UserPlus size={24} className="text-landing-on-primary" />
                  )}
                </div>
                <h2 className="font-landing-headline-lg text-landing-title-md text-landing-on-surface mb-1">
                  {authMode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="font-landing-body-sm text-landing-body-sm text-landing-on-surface-variant">
                  {authMode === 'login'
                    ? 'Sign in to access your RADIANCE dashboard'
                    : 'Get started with RADIANCE AI for free'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="px-8 pb-8 pt-6 space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block font-landing-label-caps text-[11px] text-landing-on-surface-variant tracking-wider uppercase mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-landing-outline" />
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={authForm.name}
                        onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3.5 rounded-lg border border-landing-outline-variant/30 bg-landing-surface-container-lowest text-landing-on-surface font-landing-body-sm text-landing-body-sm placeholder:text-landing-outline focus:outline-none focus:border-landing-primary focus:ring-2 focus:ring-landing-primary/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-landing-label-caps text-[11px] text-landing-on-surface-variant tracking-wider uppercase mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-landing-outline" />
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3.5 rounded-lg border border-landing-outline-variant/30 bg-landing-surface-container-lowest text-landing-on-surface font-landing-body-sm text-landing-body-sm placeholder:text-landing-outline focus:outline-none focus:border-landing-primary focus:ring-2 focus:ring-landing-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-landing-label-caps text-[11px] text-landing-on-surface-variant tracking-wider uppercase mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-landing-outline" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-3.5 rounded-lg border border-landing-outline-variant/30 bg-landing-surface-container-lowest text-landing-on-surface font-landing-body-sm text-landing-body-sm placeholder:text-landing-outline focus:outline-none focus:border-landing-primary focus:ring-2 focus:ring-landing-primary/20 transition-all"
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-red-500 text-sm font-medium text-center">{authError}</p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-landing-inverse-surface text-landing-on-primary font-landing-body-sm text-landing-body-sm font-medium py-4 rounded-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {authLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-landing-on-primary/30 border-t-landing-on-primary rounded-full animate-spin" />
                      {authMode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {authMode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Toggle mode */}
                <p className="text-center font-landing-body-sm text-landing-body-sm text-landing-on-surface-variant pt-2">
                  {authMode === 'login' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                        className="text-landing-primary font-medium hover:underline"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                        className="text-landing-primary font-medium hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            </div>
          </div>
        )}

        {/*  Main Content  */}
        <main className="flex-grow pt-20 overflow-hidden">
            {/*  Hero Section  */}
            <section className={`relative w-full h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden ${isZoomed ? 'zoomed' : ''}`}>
                {/*  Background Image Container  */}
                <div className="absolute inset-0 w-full h-full landing-hero-image-container">
                    <img alt="A premium, minimalist eyeshadow palette with various neutral shades (champagne, rose gold, soft pinks, and slate). The palette is open and positioned as a background element. Studio lighting, soft shadows, high-end beauty product photography style, clean white and soft blush background."
                        className="object-cover w-full h-full object-center"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqu-4GIBIjvc-tgcRkPBMvbGECI2QTiy3gIbpKxxO-ekfG9L2OLKI1vT_dNXNYjNblo1WzGaFCK_uvr8Ta3N8yCrHeBkrYKC5XePKEoSjFy5vjHeOTxCb6vswPe7vykE4YLHRZWiOflE0BetWGGbtz0_AelNkZuIiocNS3N1xEaXkdftB8yBFd_UyOmM1OgRiVERtWeRumN98SaamjmUAc4KKi_XJiRBJrDHBUpGMuBJesyrvVyhUuPHqnhBxfMqitI-AwS9FDTR4" />
                    <div className="absolute inset-0 bg-white/20"></div>
                </div>
                {/*  Content Overlay Container  */}
                <div
                    className="relative z-10 w-full max-w-landing-container-max-width mx-auto px-landing-margin-mobile md:px-margin-desktop landing-hero-content-wrapper">
                    <div className="flex flex-col items-center text-center">
                        <span
                            className="font-landing-label-caps text-landing-label-caps text-landing-secondary tracking-[0.2em] mb-6 uppercase">Intelligent
                            Growth</span>
                        <h1
                            className="font-landing-display-lg text-landing-display-lg md:text-[64px] text-landing-on-surface mb-6 leading-tight max-w-3xl">
                            Glow with Intelligence.<br />
                            Grow with RADIANCE.
                        </h1>
                        <p className="font-landing-body-lg text-landing-body-lg text-landing-on-surface-variant mb-10 max-w-xl leading-relaxed">
                            The AI-powered CRM that turns raw customer data into actionable revenue for beauty brands.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button
                                className=" bg-landing-inverse-surface text-landing-on-primary font-landing-body-sm text-landing-body-sm font-medium px-12 py-5 rounded-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2 ambient-shadow" onClick={triggerDemoFlow}>
                                Request Demo
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
                {/*  Scroll Indicator  */}
                <div
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center text-landing-secondary opacity-70 animate-bounce landing-nav-transition">
                    <span className="font-landing-label-caps text-[10px] tracking-widest mb-2 uppercase">Scroll</span>
                    <div className="w-[1px] h-8 bg-landing-secondary"></div>
                </div>
            </section>
            {/*  The 'How' Section (Bento Grid)  */}
            <section className="py-32 px-landing-margin-mobile md:px-margin-desktop max-w-landing-container-max-width mx-auto">
                <div className="text-center mb-20">
                    <h2 className="font-landing-headline-lg text-landing-headline-lg-mobile md:text-headline-lg text-landing-on-surface mb-4">The
                        Engine of Growth</h2>
                    <p className="font-landing-body-lg text-landing-body-lg text-landing-on-surface-variant max-w-2xl mx-auto">Precision tools
                        designed specifically for the unique lifecycle of beauty consumers.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-landing-gutter">
                    {/*  Card 1  */}
                    <div
                        className="bg-landing-primary-container rounded-xl p-8 ambient-shadow border border-landing-outline-variant/20 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
                        <div
                            className="w-12 h-12 rounded-full bg-landing-surface-container-lowest flex items-center justify-center mb-6">
                            <BarChart3 size={24} className="text-landing-primary" />
                        </div>
                        <h3 className="font-landing-title-md text-landing-title-md text-landing-on-surface mb-3">Automated RFM Engine</h3>
                        <p className="font-landing-body-sm text-landing-body-sm text-landing-on-surface-variant flex-grow">
                            Instantly segment your audience based on Recency, Frequency, and Monetary value. Identify
                            your most valuable loyalists and at-risk churners automatically.
                        </p>
                    </div>
                    {/*  Card 2  */}
                    <div
                        className="bg-landing-secondary-container rounded-xl p-8 ambient-shadow border border-landing-outline-variant/20 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
                        <div
                            className="w-12 h-12 rounded-full bg-landing-surface-container-lowest flex items-center justify-center mb-6">
                            <Bot size={24} className="text-landing-secondary" />
                        </div>
                        <h3 className="font-landing-title-md text-landing-title-md text-landing-on-surface mb-3">AI Co-Pilot Interface</h3>
                        <p className="font-landing-body-sm text-landing-body-sm text-landing-on-surface-variant flex-grow">
                            Chat with your data. Ask plain-language questions about campaign performance or customer
                            trends and receive instant, actionable insights.
                        </p>
                    </div>
                    {/*  Card 3  */}
                    <div
                        className="bg-landing-tertiary-container rounded-xl p-8 ambient-shadow border border-landing-outline-variant/20 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
                        <div
                            className="w-12 h-12 rounded-full bg-landing-surface-container-lowest flex items-center justify-center mb-6">
                            <TrendingUp size={24} className="text-landing-tertiary" />
                        </div>
                        <h3 className="font-landing-title-md text-landing-title-md text-landing-on-surface mb-3">Real-Time Analytics</h3>
                        <p className="font-landing-body-sm text-landing-body-sm text-landing-on-surface-variant flex-grow">
                            Watch your campaigns convert in real-time. Beautiful, clean dashboards that cut through the
                            noise and show you exactly what's driving revenue.
                        </p>
                    </div>
                </div>
            </section>
            {/*  Feature Deep-Dive  */}
            <section className="py-24 bg-landing-surface-container-low">
                <div className="max-w-landing-container-max-width mx-auto px-landing-margin-mobile md:px-margin-desktop">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/*  Image Side  */}
                        <div className="w-full lg:w-1/2 relative rounded-xl overflow-hidden ambient-shadow h-[500px]">
                            <img alt="A pristine, minimalist arrangement of luxury skincare products including serums and creams. They are presented on a pale marble slab against a soft white background. Sunlight filters through leaves, casting delicate, organic shadows across the frosted glass bottles and minimalist labels. The overall mood is calm, premium, and refined."
                                className="object-cover w-full h-full"
                                src="https://lh3.googleusercontent.com/aida/AP1WRLtV_4kdijZfp5qwhgJplAlFvtARy0-e4-XHm0jwEJF_oz7IlNgnvcJDHlDiuN1JtbPOe3RvS_Zv9AYx8o8cD_oeYxWTw4UFFyjuJcAGItH-zY-orq-ZvYX-K7v9WLl-xn0pX0s_sU-o_xyTPVQRT8yTnQdIONWWNI8Mt8d7Up1r_cLTVP0RdHv2TD3_-fof5cFKVlmCbOmeisEDkmgKbH6JkIpybbLqIp6totbGM_KCTCkRUh5f-PCObaA" />
                            <div
                                className="absolute bottom-8 left-8 right-8 glass-panel rounded-lg p-6 border border-landing-surface-container-lowest/50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div
                                        className="w-8 h-8 rounded-full bg-landing-inverse-surface flex items-center justify-center text-landing-on-primary">
                                        <Bot size={16} />
                                    </div>
                                    <p className="font-landing-body-sm text-landing-body-sm text-landing-on-surface-variant italic">"Show me the
                                        conversion rate for our new Éclat Naturel serum campaign."</p>
                                </div>
                                <div className="pl-12">
                                    <div className="bg-landing-surface-container-lowest rounded p-4 shadow-sm">
                                        <p className="font-landing-body-sm text-landing-body-sm text-landing-on-surface font-medium">Conversion is
                                            up 14% this week. Segment 'High-Value Loyalists' is driving the majority of
                                            sales.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/*  Text Side  */}
                        <div className="w-full lg:w-1/2 flex flex-col items-start">
                            <span className="font-landing-label-caps text-landing-label-caps text-landing-secondary mb-4 uppercase">Meet Your
                                Co-Pilot</span>
                            <h2
                                className="font-landing-headline-lg text-landing-headline-lg-mobile md:text-headline-lg text-landing-on-surface mb-6 leading-tight">
                                Intelligence that speaks your language.
                            </h2>
                            <p className="font-landing-body-lg text-landing-body-lg text-landing-on-surface-variant mb-8">
                                Stop wrestling with complex dashboards. The RADIANCE AI Co-Pilot allows you to interact
                                with your customer data naturally. Ask questions, generate segments, and launch targeted
                                campaigns—all through a simple conversational interface.
                            </p>
                            <ul className="space-y-4 mb-10 w-full">
                                <li className="flex items-center gap-3 border-b border-landing-outline-variant/20 pb-4">
                                    <CheckCircle2 size={20} className="text-landing-primary" />
                                    <span className="font-landing-body-sm text-landing-body-sm text-landing-on-surface">Predictive Replenishment
                                        Alerts</span>
                                </li>
                                <li className="flex items-center gap-3 border-b border-landing-outline-variant/20 pb-4">
                                    <CheckCircle2 size={20} className="text-landing-primary" />
                                    <span className="font-landing-body-sm text-landing-body-sm text-landing-on-surface">Automated VIP Tiering</span>
                                </li>
                                <li className="flex items-center gap-3 pb-2">
                                    <CheckCircle2 size={20} className="text-landing-primary" />
                                    <span className="font-landing-body-sm text-landing-body-sm text-landing-on-surface">Cross-sell Opportunity
                                        Identification</span>
                                </li>
                            </ul>
                            <a className="font-landing-label-caps text-landing-label-caps text-landing-inverse-surface border-b border-landing-inverse-surface pb-1 hover:opacity-70 transition-opacity flex items-center gap-2"
                                href="/dashboard">
                                Explore All Features <ArrowRight size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </section>
            {/*  Social Proof / Stats  */}
            <section
                className="py-32 px-landing-margin-mobile md:px-margin-desktop max-w-landing-container-max-width mx-auto border-b border-landing-outline-variant/20">
                <div
                    className="grid grid-cols-1 md:grid-cols-2 gap-16 text-center divide-y md:divide-y-0 md:divide-x divide-outline-variant/20">
                    <div className="pt-8 md:pt-0 md:px-8 flex flex-col items-center justify-center">
                        <h3 className="font-landing-display-lg text-[64px] leading-none text-landing-inverse-surface mb-4">124%</h3>
                        <p className="font-landing-title-md text-landing-title-md text-landing-on-surface-variant font-normal">Increase in Customer
                            Win-Backs</p>
                        <p className="font-landing-body-sm text-landing-body-sm text-landing-outline mt-2">Average across beauty partners in Q1</p>
                    </div>
                    <div className="pt-8 md:pt-0 md:px-8 flex flex-col items-center justify-center">
                        <h3 className="font-landing-display-lg text-[64px] leading-none text-landing-inverse-surface mb-4">3<span
                                className="text-[32px]">min</span></h3>
                        <p className="font-landing-title-md text-landing-title-md text-landing-on-surface-variant font-normal">To Launch a Targeted
                            Campaign</p>
                        <p className="font-landing-body-sm text-landing-body-sm text-landing-outline mt-2">Down from 4 hours previously</p>
                    </div>
                </div>
            </section>
            {/*  Final CTA  */}
            <section className="py-32 text-center px-landing-margin-mobile md:px-margin-desktop max-w-3xl mx-auto">
                <h2 className="font-landing-display-lg text-landing-display-lg text-landing-on-surface mb-6">Elevate Your Brand</h2>
                <p className="font-landing-body-lg text-landing-body-lg text-landing-on-surface-variant mb-12">
                    Join the industry's most forward-thinking beauty brands. Turn your data into a beautifully refined
                    experience.
                </p>
                <button
                    className=" bg-landing-inverse-surface text-landing-on-primary font-landing-body-sm text-landing-body-sm font-medium px-10 py-5 rounded-lg hover:opacity-90 transition-all duration-300 ambient-shadow" onClick={triggerDemoFlow}>
                    Start Free Trial
                </button>
            </section>
        </main>
        {/*  Footer  */}
        <footer className="bg-landing-surface-container-low border-t border-landing-outline-variant/20 w-full transition-all duration-200">
            <div
                className="flex flex-col md:flex-row justify-between items-center py-12 px-landing-margin-mobile md:px-margin-desktop max-w-landing-container-max-width mx-auto">
                <div className="mb-6 md:mb-0">
                    <span className="font-landing-display-lg text-landing-headline-lg text-landing-secondary">RADIANCE AI</span>
                </div>
                <div className="text-center md:text-right font-landing-body-sm text-landing-body-sm text-landing-on-secondary-container">
                    © 2024 RADIANCE AI. All rights reserved.
                </div>
            </div>
        </footer>
    </div>
    

  );
}
