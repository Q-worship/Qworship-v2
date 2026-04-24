import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest, buildUrl } from "@/lib/queryClient";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

export const DownloadPage = (): JSX.Element => {
  const { data: desktopDownloads } = useQuery<{
    windows: null | { id: string; version?: string; minOs?: string; fileSize: number };
    mac: null | { id: string; version?: string; minOs?: string; fileSize: number };
  }>({
    queryKey: ["/api/help/desktop-downloads"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/help/desktop-downloads");
      return await response.json();
    },
  });

  const windowsBuild = desktopDownloads?.windows ?? null;
  const macBuild = desktopDownloads?.mac ?? null;
  const formatMb = (bytes?: number) =>
    bytes && bytes > 0 ? `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB` : "N/A";

  // Navigation menu items data
  const navItems = [
    { name: "Home", isActive: false },
    { name: "About", isActive: false },
    { name: "Features", isActive: false },
    { name: "Pricing", isActive: false },
  ];

  useEffect(() => {
    // Add Google Fonts
    const link1 = document.createElement('link');
    link1.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;600;700;800&family=Inter:wght@300;400;500;600&display=swap';
    link1.rel = 'stylesheet';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
    link2.rel = 'stylesheet';
    document.head.appendChild(link2);

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#ebe1fe] [font-family:'Inter',sans-serif] selection:bg-[#ee85ff]/30 selection:text-[#ee85ff]">
      <style dangerouslySetInnerHTML={{
        __html: `
        .glass-card {
            background: rgba(28, 22, 46, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(238, 133, 255, 0.1);
        }
        .neon-glow {
            box-shadow: 0 0 20px rgba(157, 78, 221, 0.2);
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}} />

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#100B1F]/60 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-purple-900/20 flex items-center min-h-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <div className="relative h-[45px] w-[46px]">
                  <img
                    className="w-[43px] h-[43px]"
                    alt="Q-worship logo"
                    src="/figmaAssets/ellipse-3.svg"
                  />
                  <div className="absolute w-[8px] h-[8px] top-[37px] left-[37px] bg-[#fd348f] rounded-[4px]" />
                </div>
                <h1 className="ml-4 [font-family:'Lufga-Medium',Helvetica] font-bold text-white text-xl md:text-2xl lg:text-3xl">
                  Q-worship
                </h1>
              </div>
            </Link>

            {/* Navigation */}
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList className="flex space-x-6">
                {navItems.map((item) => (
                  <NavigationMenuItem key={item.name}>
                    <NavigationMenuLink
                      className={`[font-family:'Lufga-Medium',Helvetica] font-medium text-base hover:text-[#fd348f] transition-colors ${item.isActive ? "text-[#fd348f]" : "text-white"
                        }`}
                      asChild
                    >
                      <Link
                        href={
                          item.name === "Home"
                            ? "/"
                            : `/${item.name.toLowerCase()}`
                        }
                      >
                        {item.name}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-white p-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* CTA Buttons */}
            <div className="hidden md:flex space-x-3">

              <Link href="/download">
                <Button className="h-12 px-6 rounded-lg bg-[#7a5af8] text-white [font-family:'Lufga-Medium',Helvetica] font-medium text-sm hover:bg-[#6949e8] transition-colors">
                  Download Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[614px] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ee85ff]/10 rounded-full blur-[120px]"></div>
          </div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-[54px] [font-family:'Manrope',sans-serif] font-bold text-white mb-6 tracking-normal flex flex-col gap-4 md:gap-6">
              <span>Start changing your worship</span>
              <span className="whitespace-nowrap">experience with&nbsp;&nbsp;<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ee85ff] to-[#ea7aff]">Q-worship Desktop</span></span>
            </h1>
            <p className="text-base md:text-lg lg:text-[19px] text-[#afa7c2] font-normal max-w-2xl mx-auto leading-relaxed">
              Professional worship presentation software with Hands-free <br />
              Bible for Windows and macOS.
            </p>
          </div>
        </section>

        {/* Download Section */}
        <section className="px-8 pb-24 relative z-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Windows Card */}
            <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center group hover:border-[#ee85ff]/40 transition-all duration-500 cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-[#28213e] flex items-center justify-center mb-6 text-[#ee85ff] shadow-lg">
                <span className="material-symbols-outlined text-4xl" data-icon="desktop_windows">desktop_windows</span>
              </div>
              <h3 className="text-2xl [font-family:'Manrope',sans-serif] font-bold text-white mb-2">WINDOWS</h3>
              <div className="flex flex-col gap-1 mb-8">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#afa7c2] [font-family:'Inter',sans-serif]">CURRENT VERSION: {windowsBuild?.version || "Not published"}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#afa7c2] [font-family:'Inter',sans-serif]">FILE SIZE: {formatMb(windowsBuild?.fileSize)}</span>
              </div>
              <a
                href={windowsBuild ? buildUrl("/api/help/desktop-downloads/windows/download?source=user-panel-download-page") : "#"}
                className={`w-full py-4 rounded-xl text-center [font-family:'Manrope',sans-serif] font-bold uppercase tracking-widest transition-all ${windowsBuild
                    ? "bg-gradient-to-r from-[#6a0baa] to-[#ee85ff] text-white hover:shadow-[0_0_30px_rgba(238,133,255,0.3)] active:scale-95"
                    : "bg-[#302a46] text-slate-400 pointer-events-none"
                  }`}
              >
                {windowsBuild ? "DOWNLOAD FOR WINDOWS" : "WINDOWS BUILD COMING SOON"}
              </a>
              <p className="mt-4 text-xs text-slate-500">{windowsBuild?.minOs || "Requires Windows 10 or 11 (64-bit)"}</p>
            </div>

            {/* macOS Card */}
            <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center group hover:border-[#ee85ff]/40 transition-all duration-500 cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-[#28213e] flex items-center justify-center mb-6 text-[#ee85ff] shadow-lg">
                <span className="material-symbols-outlined text-4xl" data-icon="laptop_mac">laptop_mac</span>
              </div>
              <h3 className="text-2xl [font-family:'Manrope',sans-serif] font-bold text-white mb-2">MAC</h3>
              <div className="flex flex-col gap-1 mb-8">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#afa7c2] [font-family:'Inter',sans-serif]">CURRENT VERSION: {macBuild?.version || "Not published"}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#afa7c2] [font-family:'Inter',sans-serif]">FILE SIZE: {formatMb(macBuild?.fileSize)}</span>
              </div>
              <a
                href={macBuild ? buildUrl("/api/help/desktop-downloads/mac/download?source=user-panel-download-page") : "#"}
                className={`w-full py-4 rounded-xl border text-center [font-family:'Manrope',sans-serif] font-bold uppercase tracking-widest transition-all ${macBuild
                    ? "border-[#4b455c] bg-[#221b36] text-white hover:bg-[#28213e] active:scale-95"
                    : "border-[#3c374a] bg-[#1a1628] text-slate-400 pointer-events-none"
                  }`}
              >
                {macBuild ? "DOWNLOAD FOR MACOS" : "MAC BUILD COMING SOON"}
              </a>
              <p className="mt-4 text-xs text-slate-500">{macBuild?.minOs || "Apple Silicon & Intel (macOS 12.0+)"}</p>
            </div>
          </div>
        </section>

        {/* System Requirements */}
        <section className="bg-[#151026] py-24 px-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-12">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#ee85ff] [font-family:'Inter',sans-serif] mb-2 block">Technical Specs</span>
              <h2 className="text-3xl [font-family:'Manrope',sans-serif] font-bold text-white">System Requirements</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-6">
                <h4 className="text-xl [font-family:'Manrope',sans-serif] font-semibold text-[#c57eff] flex items-center gap-2">
                  <span className="material-symbols-outlined" data-icon="speed">speed</span> Performance Target
                </h4>
                <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#afa7c2] mb-1">Processor</p>
                    <p className="text-white font-medium">Intel i5 10th Gen / Apple M1</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#afa7c2] mb-1">Memory</p>
                    <p className="text-white font-medium">8GB RAM (16GB Recommended)</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#afa7c2] mb-1">Graphics</p>
                    <p className="text-white font-medium">GTX 1050 / Integrated M1</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#afa7c2] mb-1">Storage</p>
                    <p className="text-white font-medium">2GB SSD Free Space</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl border-[#ee85ff]/20">
                <h4 className="text-lg [font-family:'Manrope',sans-serif] font-semibold text-white mb-4">Multi-Output Support</h4>
                <p className="text-[#afa7c2] text-sm mb-6 leading-relaxed">Qworship is optimized for triple-head output configurations: Stage Monitor, Main Sanctuary Display, and Live Stream Broadcast simultaneously.</p>
                <div className="flex gap-4">
                  <div className="bg-[#28213e] px-3 py-2 rounded text-[10px] font-bold text-[#ee85ff] uppercase">DirectX 12</div>
                  <div className="bg-[#28213e] px-3 py-2 rounded text-[10px] font-bold text-[#ee85ff] uppercase">Metal 2.0</div>
                  <div className="bg-[#28213e] px-3 py-2 rounded text-[10px] font-bold text-[#ee85ff] uppercase">NDI® 5.5</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Qworship */}
        <section className="py-24 px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col gap-4 group">
                <div className="w-12 h-12 rounded-lg bg-[#ee85ff]/10 flex items-center justify-center text-[#ee85ff] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" data-icon="broadcast_on_home">broadcast_on_home</span>
                </div>
                <h3 className="text-xl [font-family:'Manrope',sans-serif] font-bold text-white">NDI Support</h3>
                <p className="text-[#afa7c2] text-sm leading-relaxed">Broadcast-grade video over IP. Send your lower thirds and lyrics directly to OBS or vMix with alpha transparency.</p>
              </div>
              <div className="flex flex-col gap-4 group">
                <div className="w-12 h-12 rounded-lg bg-[#ee85ff]/10 flex items-center justify-center text-[#ee85ff] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" data-icon="auto_stories">auto_stories</span>
                </div>
                <h3 className="text-xl [font-family:'Manrope',sans-serif] font-bold text-white">Hands-Free Bible</h3>
                <p className="text-[#afa7c2] text-sm leading-relaxed">Instant scripture lookup with smart-search. Project full chapters or single verses with customizable typography presets.</p>
              </div>
              <div className="flex flex-col gap-4 group">
                <div className="w-12 h-12 rounded-lg bg-[#ee85ff]/10 flex items-center justify-center text-[#ee85ff] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" data-icon="dashboard_customize">dashboard_customize</span>
                </div>
                <h3 className="text-xl [font-family:'Manrope',sans-serif] font-bold text-white">Modular Editor</h3>
                <p className="text-[#afa7c2] text-sm leading-relaxed">A powerful canvas-based editor. Layer motion backgrounds, images, and live video with ease using our Bento-style logic.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-8 border-t border-white/5">
          <div className="max-w-4xl mx-auto glass-card rounded-3xl p-12 text-center overflow-hidden relative">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#ee85ff]/20 blur-[80px] rounded-full"></div>
            <h2 className="text-4xl [font-family:'Manrope',sans-serif] font-extrabold text-white mb-6 relative z-10">Ready to transform your experience ?</h2>
            <p className="text-[#afa7c2] mb-10 relative z-10">Join 1000+ churches using Q-worship to deliver high-fidelity visual experiences every Sunday.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link href="/signup">
                <button className="bg-[#9D4EDD] text-white px-10 py-4 rounded-full [font-family:'Manrope',sans-serif] font-bold uppercase tracking-widest hover:shadow-[0_0_40px_rgba(157,78,221,0.4)] transition-all">
                  GET STARTED FREE
                </button>
              </Link>
              <Link href="/contact">
                <button className="bg-[#28213e] text-white px-10 py-4 rounded-full [font-family:'Manrope',sans-serif] font-bold uppercase tracking-widest hover:bg-[#32294e] border border-white/10 transition-all">
                  BOOK DEMO
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#000000] w-full py-12 px-8 border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto">
          <div className="text-lg font-bold text-white [font-family:'Manrope',sans-serif]">
            Qworship
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <Link href="/docs" className="[font-family:'Manrope',sans-serif] text-[10px] uppercase tracking-[0.2em] text-slate-500 hover:text-[#9D4EDD] transition-colors">Documentation</Link>
            <Link href="/privacy-policy" className="[font-family:'Manrope',sans-serif] text-[10px] uppercase tracking-[0.2em] text-slate-500 hover:text-[#9D4EDD] transition-colors">Privacy Policy</Link>
            <Link href="/eula" className="[font-family:'Manrope',sans-serif] text-[10px] uppercase tracking-[0.2em] text-slate-500 hover:text-[#9D4EDD] transition-colors">Terms of Service</Link>
          </div>
          <p className="[font-family:'Manrope',sans-serif] text-[10px] uppercase tracking-[0.2em] text-slate-500">
            © 2024 Qworship. Built for the Electric Sanctuary.
          </p>
        </div>
      </footer>
    </div>
  );
};
