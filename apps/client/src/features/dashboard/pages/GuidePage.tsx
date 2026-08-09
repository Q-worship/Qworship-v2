import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Link as LinkIcon,
  Copy,
  Download,
  Monitor,
  MonitorStop,
  SlidersHorizontal,
  FileText,
  Info,
  X,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth.store";
import { useToast } from "@/hooks/use-toast";
import qworshipLogo from "@assets/Group 1_1754122708985.png";

const NDI_BRIDGE_WINDOWS_URL =
  "https://pub-3fc3537dae154068a167de3a3c875c3e.r2.dev/executables/QWorship-NDI-Bridge-Setup-1.0.0.exe";

const guideTopics = [{ id: "ndi-bridge", label: "Qworship NDI Bridge" }];

export function GuidePage() {
  const [, setLocation] = useLocation();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [ltBase, setLtBase] = useState("http://localhost:3400");
  const [activeTopic, setActiveTopic] = useState("ndi-bridge");
  const [installTab, setInstallTab] = useState<"windows" | "macos">("windows");

  useEffect(() => {
    fetch("/api/lower-third/config", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ltBaseUrl) setLtBase(d.ltBaseUrl);
      })
      .catch(() => {});
  }, []);

  const userId = user?.id || "me";
  const audienceUrl = `${ltBase}/p/${userId}`;
  const lowerThirdUrl = `${ltBase}/r/${userId}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const goBack = () => setLocation("/dashboard");

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#131419]">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#8B5CF6] flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src={qworshipLogo} alt="Q-Worship" className="w-6 h-6" />
          <span className="text-white font-semibold">Q-Worship</span>
        </div>
        <button
          onClick={goBack}
          className="text-white/80 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10"
          aria-label="Back to dashboard"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Banner */}
      <div className="px-8 py-6 bg-[#131419] flex-shrink-0">
        <h2 className="text-white text-2xl font-bold mb-1.5">
          Q-worship Guides, Resources &amp; Downloads
        </h2>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Welcome to Qworship Guides, resources and downloads. Here we provide you with tools
          and resources to make your Qworship experience the best. Please click any of the
          guide topics below to get started
        </p>
      </div>

      <div className="h-px bg-white/10 flex-shrink-0" />

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-[#61459D] pt-8 px-4 pb-4 overflow-y-auto flex-shrink-0">
          <h3 className="text-white font-semibold text-xs uppercase tracking-wide mb-3">
            Guide Topics
          </h3>
          <div className="space-y-1">
            {guideTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveTopic(topic.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTopic === topic.id
                    ? "bg-[#CEA2FD] text-[#3a2260]"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTopic === "ndi-bridge" && (
            <>
              <h1 className="text-[#8B5CF6] text-2xl font-bold mb-1.5">
                Q-worship NDI Bridge Configuration
              </h1>
              <p className="text-slate-400 text-sm mb-6">
                Download and set up your Qworship NDI Bridge here for seamless live streaming
                and broadcast overlays.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Browser Source Links */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[#8B5CF6]" />
                    Browser Source Links
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">
                        Audience Screen URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          type="text"
                          value={audienceUrl}
                          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(audienceUrl, "Audience Screen URL")}
                          className="shrink-0 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">
                        Lower Third URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          type="text"
                          value={lowerThirdUrl}
                          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(lowerThirdUrl, "Lower Third URL")}
                          className="shrink-0 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Download Plugins */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#8B5CF6]" />
                    Download Plugins
                  </h3>
                  <div className="space-y-2">
                    <a
                      href={NDI_BRIDGE_WINDOWS_URL}
                      download="QWorship-NDI-Bridge-Setup-1.0.0.exe"
                      className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 px-3 py-3 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Monitor className="w-4 h-4 text-[#8B5CF6]" />
                      For Windows
                    </a>
                    <div className="w-full flex items-center gap-2 bg-white/5 border border-white/5 text-slate-500 px-3 py-3 rounded-lg text-xs font-semibold cursor-not-allowed">
                      <MonitorStop className="w-4 h-4" />
                      For macOS — coming soon
                    </div>
                  </div>
                </div>

                {/* Output Parameters */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#8B5CF6]" />
                    Output Parameters
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">
                        NDI Output Resolution
                      </label>
                      <select
                        defaultValue="1920x1080"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="1280x720">1280x720 (720p)</option>
                        <option value="1920x1080">1920x1080 (1080p)</option>
                        <option value="3840x2160">3840x2160 (4K)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Frame Rate</label>
                      <select
                        defaultValue="30"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="24">24 fps</option>
                        <option value="30">30 fps</option>
                        <option value="60">60 fps</option>
                      </select>
                    </div>
                  </div>
                  <label className="block text-xs text-slate-400 mb-1.5">Network Interface</label>
                  <select
                    defaultValue="auto"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="auto">Auto-detect (recommended)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    Select the network adapter for NDI discovery and transmission within the
                    NDI Bridge app.
                  </p>
                </div>

                {/* Installation Guide */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#8B5CF6]" />
                    Installation Guide
                  </h3>
                  <div className="flex border-b border-white/10 mb-3">
                    <button
                      type="button"
                      onClick={() => setInstallTab("windows")}
                      className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors ${
                        installTab === "windows"
                          ? "border-[#8B5CF6] text-[#8B5CF6]"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Windows
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallTab("macos")}
                      className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors ${
                        installTab === "macos"
                          ? "border-[#8B5CF6] text-[#8B5CF6]"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      macOS
                    </button>
                  </div>

                  {installTab === "windows" ? (
                    <ol className="space-y-2.5">
                      <li className="flex gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] text-[10px] flex items-center justify-center font-bold mt-0.5">
                          1
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Download the Q-worship NDI Bridge Windows application above.
                        </p>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] text-[10px] flex items-center justify-center font-bold mt-0.5">
                          2
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Follow the on-screen prompts to install the application.
                        </p>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] text-[10px] flex items-center justify-center font-bold mt-0.5">
                          3
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Copy your Audience screen and lower third screen URLs from the
                          Browser Source Links section and enter them in the allocated fields
                          of your NDI Bridge.
                        </p>
                      </li>
                    </ol>
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      The macOS NDI Bridge is coming soon. In the meantime, macOS users can add
                      the Browser Source Links above directly as a Browser Source in OBS, vMix,
                      or another NDI-compatible application.
                    </p>
                  )}

                  <Link
                    href="/guides/first-sunday-checklist"
                    className="inline-block mt-4 text-[11px] font-semibold text-[#CEA2FD] hover:underline"
                  >
                    View full documentation →
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 rounded-lg px-4 py-3">
                <Info className="w-4 h-4 text-[#CEA2FD] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Please note that the Qworship NDI Bridge is only for Qworship Cloud users. If
                  you are using the Qworship Live Console you do not need the NDI Bridge.
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default GuidePage;
