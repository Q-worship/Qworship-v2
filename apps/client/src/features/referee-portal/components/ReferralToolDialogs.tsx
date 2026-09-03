/** Quiet Momentum referral tools: branded QR export, approved message sharing, and attributable campaign-link creation. */
import { ICON_URL } from "./BrandLockup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Image,
  Link2,
  Mail,
  MessageCircle,
  MessageSquareText,
  MousePointer2,
  Palette,
  Plus,
  QrCode,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import * as QRCode from "qrcode";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "../lib/toast";
import { getReferralLink } from "../lib/referralCode";

export type ReferralTool = "qr" | "share" | "campaign" | null;

type Props = {
  active: ReferralTool;
  onClose: () => void;
  referralLink: string;
  referralCode: string;
};

const shareTemplates = [
  {
    id: "introduction",
    title: "Church introduction",
    note: "A warm first message for a pastor or church leader.",
    subject: "A presentation tool I think your church should see",
    message: "Hello Pastor, I would love to introduce you to Q-Worship — a church presentation platform that helps teams search and project Bible passages using voice commands, manage songs and media, and run live services with confidence. You can learn more and begin through my representative link:",
  },
  {
    id: "demo",
    title: "Demo invitation",
    note: "Invite a church team to a guided product demonstration.",
    subject: "Invitation to a Q-Worship demonstration",
    message: "Hello, I am arranging a short Q-Worship demonstration for church leaders and media teams. We will explore voice-powered Bible search, service planning, live projection, and broadcast integration. Use my link to review Q-Worship before the session:",
  },
  {
    id: "follow-up",
    title: "Pastor follow-up",
    note: "A concise follow-up after an initial conversation.",
    subject: "Following up on Q-Worship",
    message: "Hello Pastor, thank you for taking the time to discuss Q-Worship. Here is the representative link we spoke about. It will connect your church to Q-Worship and allow the team to support your onboarding journey:",
  },
];

interface CampaignRow {
  id: string;
  name: string;
  slug: string;
  source: string;
  destination: string;
  createdAt: string;
}

function downloadFile(contents: BlobPart, type: string, filename: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copyText(value: string, success: string) {
  navigator.clipboard.writeText(value).then(() => toast.success(success));
}

function QRCodeDialog({ open, onClose, referralLink, referralCode }: Omit<Props, "active"> & { open: boolean }) {
  const [format, setFormat] = useState("png");
  const [size, setSize] = useState("512");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [includeLabel, setIncludeLabel] = useState(true);
  const [dataUrl, setDataUrl] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGenerating(true);
    QRCode.toDataURL(referralLink, {
      width: Number(size),
      margin: 2,
      errorCorrectionLevel: "H",
      color: theme === "dark" ? { dark: "#FFFFFF", light: "#282330" } : { dark: "#201C26", light: "#FFFFFF" },
    })
      .then(setDataUrl)
      .catch(() => toast.error("The QR preview could not be generated."))
      .finally(() => setGenerating(false));
  }, [open, referralLink, size, theme]);

  async function downloadQr() {
    const fileBase = `qworship-referral-${referralCode.toLowerCase()}`;
    if (format === "svg") {
      const svg = await QRCode.toString(referralLink, {
        type: "svg",
        width: Number(size),
        margin: 2,
        errorCorrectionLevel: "H",
        color: theme === "dark" ? { dark: "#FFFFFF", light: "#282330" } : { dark: "#201C26", light: "#FFFFFF" },
      });
      downloadFile(svg, "image/svg+xml", `${fileBase}.svg`);
      toast.success("SVG QR code downloaded");
      return;
    }
    if (!dataUrl) return;
    const qrSize = Number(size);
    const captionHeight = includeLabel ? Math.max(112, qrSize * 0.24) : 0;
    const canvas = document.createElement("canvas");
    canvas.width = qrSize;
    canvas.height = qrSize + captionHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = theme === "dark" ? "#282330" : "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const image = new window.Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, qrSize, qrSize);
      if (includeLabel) {
        context.textAlign = "center";
        context.fillStyle = theme === "dark" ? "#FFFFFF" : "#201C26";
        context.font = `700 ${Math.max(18, qrSize * 0.043)}px sans-serif`;
        context.fillText("Q-Worship Referrer", qrSize / 2, qrSize + captionHeight * 0.38);
        context.fillStyle = theme === "dark" ? "#CABDFA" : "#8054F6";
        context.font = `700 ${Math.max(14, qrSize * 0.032)}px monospace`;
        context.fillText(referralCode, qrSize / 2, qrSize + captionHeight * 0.69);
      }
      canvas.toBlob((blob) => {
        if (!blob) return;
        downloadFile(blob, "image/png", `${fileBase}.png`);
        toast.success("PNG QR code downloaded");
      }, "image/png");
    };
    image.src = dataUrl;
  }

  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="referee-portal-dialog max-h-[92vh] overflow-y-auto rounded-[26px] p-0 sm:max-w-[920px]">
      <div className="grid lg:grid-cols-[.92fr_1.08fr]">
        <div className="relative grid min-h-[390px] place-items-center overflow-hidden rounded-t-[26px] bg-[#eeeafd] p-8 lg:rounded-l-[26px] lg:rounded-tr-none">
          <div className="absolute left-0 top-0 h-[3px] w-full bg-gradient-to-r from-[#ff2e91] via-[#8054F6] to-[#c8baff]" />
          <div className={`relative w-full max-w-[330px] rounded-[26px] p-5 shadow-[0_22px_60px_rgba(52,39,91,.16)] transition-colors ${theme === "dark" ? "bg-[#282330]" : "bg-white"}`}>
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><img src={ICON_URL} alt="" className="h-8 w-8 object-contain"/><div><div className={`text-sm font-extrabold ${theme === "dark" ? "text-white" : "text-[#24202a]"}`}>Q-Worship</div><div className="text-[8px] font-extrabold tracking-[.18em] text-[#8054F6]">REFERRER</div></div></div><span className={`rounded-full px-2 py-1 font-mono text-[9px] font-bold ${theme === "dark" ? "bg-white/10 text-white" : "bg-[#f1edff] text-[#6843c8]"}`}>{referralCode}</span></div>
            <div className={`aspect-square overflow-hidden rounded-[18px] p-3 ${theme === "dark" ? "bg-[#282330]" : "bg-white"}`}>{generating ? <div className="grid h-full place-items-center text-xs text-[#827b8b]">Generating secure QR…</div> : <img src={dataUrl} alt={`QR code for ${referralLink}`} className="h-full w-full object-contain"/>}</div>
            {includeLabel && <div className="mt-4 text-center"><div className={`text-sm font-extrabold ${theme === "dark" ? "text-white" : "text-[#27232e]"}`}>Scan to explore Q-Worship</div><div className={`mt-1 truncate text-[10px] ${theme === "dark" ? "text-[#b9b1c3]" : "text-[#8b8491]"}`}>{referralLink}</div></div>}
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#efeaff] text-[#8054F6]"><QrCode size={21}/></div><DialogTitle className="text-2xl">Your branded QR code</DialogTitle><DialogDescription>Use it on presentation slides, printed materials, social graphics, and event displays. Scans remain attributed to your representative code.</DialogDescription></DialogHeader>
          <div className="mt-6 space-y-5">
            <div><Label className="text-xs font-bold">File format</Label><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => setFormat("png")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${format === "png" ? "border-[#8054F6] bg-[#f3efff] text-[#6840ce]" : "border-[#e8e4ef] bg-white"}`}><Image size={16}/>PNG</button><button onClick={() => setFormat("svg")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${format === "svg" ? "border-[#8054F6] bg-[#f3efff] text-[#6840ce]" : "border-[#e8e4ef] bg-white"}`}><FileCode2 size={16}/>SVG</button></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><label><Label className="text-xs font-bold">Output size</Label><Select value={size} onValueChange={setSize}><SelectTrigger className="mt-2 h-11 bg-[#f8f7fb]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="320">320 × 320</SelectItem><SelectItem value="512">512 × 512</SelectItem><SelectItem value="1024">1024 × 1024</SelectItem></SelectContent></Select></label><div><Label className="text-xs font-bold">Card style</Label><div className="mt-2 grid h-11 grid-cols-2 rounded-xl bg-[#f3f1f7] p-1"><button onClick={() => setTheme("light")} className={`rounded-lg text-xs font-bold ${theme === "light" ? "bg-white text-[#8054F6] shadow-sm" : "text-[#77717e]"}`}>Light</button><button onClick={() => setTheme("dark")} className={`rounded-lg text-xs font-bold ${theme === "dark" ? "bg-[#282330] text-white shadow-sm" : "text-[#77717e]"}`}>Dark</button></div></div></div>
            <div className="flex items-center justify-between rounded-xl border border-[#ebe7f1] p-4"><div><div className="flex items-center gap-2 text-sm font-bold"><Palette size={15} className="text-[#8054F6]"/>Include branded label</div><p className="mt-1 text-xs text-[#8b8491]">Adds the Q-Worship name and your code below PNG exports.</p></div><Switch checked={includeLabel} onCheckedChange={setIncludeLabel}/></div>
            <div className="rounded-xl bg-[#f7f5ff] p-3 text-xs leading-5 text-[#6f6879]"><ShieldCheck className="mr-2 inline text-[#8054F6]" size={15}/>The QR value is your exact referral URL. No church data is stored inside the code.</div>
          </div>
          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row"><Button variant="outline" className="bg-white" onClick={() => copyText(referralLink, "Referral link copied")}><Copy className="mr-2" size={16}/>Copy link</Button><Button className="violet-button" onClick={downloadQr} disabled={generating}><Download className="mr-2" size={16}/>Download {format.toUpperCase()}</Button></DialogFooter>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}

function ShareMessageDialog({ open, onClose, referralLink, referralCode }: Omit<Props, "active"> & { open: boolean }) {
  const [templateId, setTemplateId] = useState(shareTemplates[0].id);
  const activeTemplate = shareTemplates.find((item) => item.id === templateId) || shareTemplates[0];
  const [subject, setSubject] = useState(activeTemplate.subject);
  const [message, setMessage] = useState(activeTemplate.message);
  const finalMessage = useMemo(() => `${message.trim()}\n\n${referralLink}`, [message, referralLink]);

  function applyTemplate(id: string) {
    const template = shareTemplates.find((item) => item.id === id);
    if (!template) return;
    setTemplateId(id);
    setSubject(template.subject);
    setMessage(template.message);
  }

  function share(channel: "whatsapp" | "email" | "sms") {
    const encodedMessage = encodeURIComponent(finalMessage);
    if (channel === "whatsapp") window.open(`https://wa.me/?text=${encodedMessage}`, "_blank", "noopener,noreferrer");
    if (channel === "email") window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodedMessage}`;
    if (channel === "sms") window.location.href = `sms:?&body=${encodedMessage}`;
    toast.success(`${channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "Email" : "SMS"} share prepared`, { description: "You will review the message before sending." });
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: subject, text: message.trim(), url: referralLink });
        toast.success("Share sheet opened");
      } catch (error) {
        if ((error as Error).name !== "AbortError") copyText(finalMessage, "Message copied instead");
      }
    } else copyText(finalMessage, "Message copied — your browser has no share sheet");
  }

  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="referee-portal-dialog max-h-[94vh] overflow-y-auto rounded-[26px] sm:max-w-[1080px]">
      <DialogHeader><div className="flex items-start justify-between gap-4 pr-8"><div><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#efeaff] text-[#8054F6]"><MessageSquareText size={21}/></div><DialogTitle className="text-2xl">Prepare a share message</DialogTitle><DialogDescription className="mt-2 max-w-2xl">Choose an approved starting point, make it personal, then open the channel you prefer. You always review the message before sending it.</DialogDescription></div><span className="hidden rounded-full bg-[#f2eff9] px-3 py-1.5 font-mono text-[10px] font-bold text-[#6c6377] sm:block">{referralCode}</span></div></DialogHeader>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <Label className="text-xs font-bold">Message purpose</Label><div className="mt-2 grid gap-2 sm:grid-cols-3">{shareTemplates.map((template) => <button key={template.id} onClick={() => applyTemplate(template.id)} className={`rounded-xl border p-3 text-left transition ${templateId === template.id ? "border-[#8054F6] bg-[#f4f0ff]" : "border-[#e9e5ef] bg-white hover:bg-[#faf9fd]"}`}><div className={`text-xs font-extrabold ${templateId === template.id ? "text-[#6942ce]" : "text-[#39343f]"}`}>{template.title}</div><p className="mt-1 text-[10px] leading-4 text-[#8a8490]">{template.note}</p></button>)}</div>
          <div className="mt-5 space-y-4"><label><Label className="text-xs font-bold">Subject</Label><Input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 h-11 bg-[#f8f7fb]"/></label><label><div className="flex items-center justify-between"><Label className="text-xs font-bold">Message</Label><span className="text-[10px] text-[#98929e]">{message.length} characters</span></div><Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 min-h-[170px] resize-none bg-[#f8f7fb] leading-6"/></label><div className="flex items-start gap-2 rounded-xl bg-[#f7f5ff] p-3 text-xs leading-5 text-[#716a79]"><Link2 className="mt-0.5 shrink-0 text-[#8054F6]" size={15}/><span>Your attributable link is locked to the end of every prepared message: <b>{referralLink}</b></span></div><Button variant="ghost" size="sm" className="font-bold text-[#8054F6]" onClick={() => applyTemplate(templateId)}><RotateCcw className="mr-2" size={14}/>Reset this template</Button></div>
        </div>
        <div className="rounded-[22px] bg-[#eeebf8] p-4 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold tracking-[.13em] text-[#8c8497] uppercase">Message preview</p><p className="mt-1 text-xs text-[#716a79]">Recipient view</p></div><Smartphone size={19} className="text-[#8054F6]"/></div><div className="mx-auto mt-4 max-w-[340px] rounded-[28px] bg-[#27232e] p-3 shadow-xl"><div className="rounded-[20px] bg-[#f8f7fb] p-4"><div className="flex items-center gap-2"><img src={ICON_URL} alt="" className="h-8 w-8 object-contain"/><div><div className="text-xs font-extrabold">Q-Worship introduction</div><div className="text-[9px] text-[#9a94a0]">Prepared by your account</div></div></div><div className="mt-4 rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm"><p className="text-[11px] leading-[1.55] text-[#59535f]">{message}</p><p className="mt-3 break-all text-[10px] font-bold text-[#8054F6]">{referralLink}</p></div><div className="mt-3 flex items-center gap-2 text-[9px] font-semibold text-emerald-600"><Check size={12}/>Referral link included</div></div></div><div className="mt-5 grid grid-cols-3 gap-2"><Button variant="outline" className="h-auto flex-col gap-1.5 rounded-xl bg-white py-3 text-[10px] font-bold" onClick={() => share("whatsapp")}><MessageCircle size={17} className="text-emerald-600"/>WhatsApp</Button><Button variant="outline" className="h-auto flex-col gap-1.5 rounded-xl bg-white py-3 text-[10px] font-bold" onClick={() => share("email")}><Mail size={17} className="text-[#8054F6]"/>Email</Button><Button variant="outline" className="h-auto flex-col gap-1.5 rounded-xl bg-white py-3 text-[10px] font-bold" onClick={() => share("sms")}><Smartphone size={17} className="text-[#ff2e91]"/>SMS</Button></div></div>
      </div>
      <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row"><Button variant="outline" className="bg-white" onClick={() => copyText(`${subject}\n\n${finalMessage}`, "Share message copied")}><Copy className="mr-2" size={16}/>Copy message</Button><Button className="violet-button" onClick={nativeShare}><Send className="mr-2" size={16}/>Open share options</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function CampaignLinkDialog({ open, onClose, referralCode }: Omit<Props, "active"> & { open: boolean }) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("whatsapp");
  const [destination, setDestination] = useState("plans");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const slug = useMemo(() => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 42), [name]);
  const previewUrl = getReferralLink(referralCode, slug || "campaign-name");

  const { data } = useQuery<{ campaigns: CampaignRow[] }>({ queryKey: ["/api/referrals/campaigns"], enabled: open });
  const campaigns = data?.campaigns || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const sourceLabel = source === "whatsapp" ? "WhatsApp" : source === "email" ? "Email" : source === "event" ? "Event QR" : "Social";
      const response = await apiRequest("POST", "/api/referrals/campaigns", { name: name.trim(), source: sourceLabel, destination });
      return response.json() as Promise<{ campaign: CampaignRow }>;
    },
    onSuccess: ({ campaign }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/campaigns"] });
      setCreatedUrl(getReferralLink(referralCode, campaign.slug));
      setError("");
      toast.success("Campaign link created", { description: "New visits will appear separately in Analytics." });
    },
    onError: (mutationError: any) => setError(mutationError?.message?.replace(/^\d+:\s*/, "") || "Unable to create campaign link"),
  });

  function createCampaign(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 3) { setError("Enter a campaign name with at least three characters."); return; }
    if (campaigns.some((campaign) => campaign.name.toLowerCase() === name.trim().toLowerCase())) { setError("A campaign with this name already exists. Choose a distinct name."); return; }
    createMutation.mutate();
  }

  function reset() { setName(""); setContext(""); setSource("whatsapp"); setDestination("plans"); setError(""); setCreatedUrl(""); }

  return <Dialog open={open} onOpenChange={(value) => { if (!value) { onClose(); window.setTimeout(reset, 250); } }}>
    <DialogContent className="referee-portal-dialog max-h-[94vh] overflow-y-auto rounded-[26px] sm:max-w-[1040px]">
      {!createdUrl ? <><DialogHeader><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#efeaff] text-[#8054F6]"><MousePointer2 size={21}/></div><DialogTitle className="text-2xl">Create a campaign link</DialogTitle><DialogDescription>Name a sharing effort so you can compare its visits, trials, and paid churches without changing referral ownership.</DialogDescription></DialogHeader>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.04fr_.96fr]"><form id="campaign-form" onSubmit={createCampaign} className="space-y-5"><label><Label className="text-xs font-bold">Campaign name</Label><Input value={name} onChange={(event) => { setName(event.target.value); setError(""); }} className={`mt-2 h-11 bg-[#f8f7fb] ${error ? "border-rose-400 focus-visible:ring-rose-300" : ""}`} placeholder="e.g. September pastors conference"/><div className="mt-2 flex justify-between text-[10px]"><span className={error ? "font-semibold text-rose-600" : "text-[#99929e]"}>{error || "Use a name you will recognise in Analytics."}</span><span className="text-[#aaa4b0]">{name.length}/60</span></div></label><div className="grid gap-4 sm:grid-cols-2"><label><Label className="text-xs font-bold">Primary channel</Label><Select value={source} onValueChange={setSource}><SelectTrigger className="mt-2 h-11 bg-[#f8f7fb]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="event">Event QR</SelectItem><SelectItem value="social">Social post</SelectItem></SelectContent></Select></label><label><Label className="text-xs font-bold">Destination</Label><Select value={destination} onValueChange={setDestination}><SelectTrigger className="mt-2 h-11 bg-[#f8f7fb]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="plans">Plans and pricing</SelectItem><SelectItem value="demo">Book a demonstration</SelectItem><SelectItem value="product">Product overview</SelectItem><SelectItem value="home">Q-Worship home</SelectItem></SelectContent></Select></label></div><label><Label className="text-xs font-bold">Internal context <span className="font-normal text-[#99929e]">(optional)</span></Label><Textarea value={context} onChange={(event) => setContext(event.target.value)} className="mt-2 min-h-24 resize-none bg-[#f8f7fb]" placeholder="Event, audience, territory, or follow-up note. This is not shown to the visitor."/></label><div className="rounded-[18px] border border-[#e8e3f1] bg-[#faf9fd] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold tracking-[.12em] text-[#8e8796] uppercase">Live link preview</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Attribution protected</span></div><div className="mt-3 break-all rounded-xl bg-white p-3 font-mono text-[11px] leading-5 text-[#6844c7] shadow-sm">{previewUrl}</div><p className="mt-3 flex gap-2 text-[10px] leading-4 text-[#7f7886]"><ShieldCheck className="shrink-0 text-[#8054F6]" size={14}/>Your representative code remains the owner. Campaign parameters only separate performance reporting.</p></div></form>
      <aside className="rounded-[22px] bg-[#f1eef8] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold tracking-[.12em] text-[#8e8796] uppercase">Recent campaign links</p><h3 className="mt-1 text-lg font-extrabold">Your active sharing paths</h3></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#8054F6] shadow-sm"><Link2 size={18}/></span></div><div className="mt-5 space-y-3">{campaigns.length === 0 ? <p className="rounded-[16px] bg-white p-4 text-[11px] leading-5 text-[#918a97]">No campaign links yet. Create one and it will show up here.</p> : campaigns.slice(0, 4).map((campaign) => <article key={campaign.id} className="rounded-[16px] bg-white p-4 shadow-[0_8px_24px_rgba(54,42,86,.05)]"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-extrabold">{campaign.name}</div><div className="mt-1 text-[10px] text-[#918a97]">{campaign.source} · Created {new Date(campaign.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</div></div></div><div className="mt-3 flex items-center justify-end border-t border-[#f0edf5] pt-3"><button type="button" onClick={() => copyText(getReferralLink(referralCode, campaign.slug), `${campaign.name} link copied`)} className="text-[10px] font-extrabold text-[#8054F6]">Copy link</button></div></article>)}</div><div className="mt-4 flex gap-2 rounded-xl bg-white/65 p-3 text-[10px] leading-4 text-[#746d7b]"><Sparkles className="mt-0.5 shrink-0 text-[#ff2e91]" size={14}/>Campaign-level visits and conversion will appear in Analytics once activity is recorded.</div></aside></div>
      <DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button form="campaign-form" type="submit" className="violet-button" disabled={createMutation.isPending}><Plus className="mr-2" size={16}/>{createMutation.isPending ? "Creating…" : "Create campaign link"}</Button></DialogFooter></> : <div className="py-8 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={29}/></div><DialogTitle className="mt-5 text-2xl">Campaign link is ready</DialogTitle><DialogDescription className="mx-auto mt-2 max-w-md">"{name}" will now appear as a separate source in Referral Analytics. Your ownership code remains unchanged.</DialogDescription><div className="mx-auto mt-6 max-w-2xl rounded-[18px] bg-[#f5f2fb] p-4 text-left"><p className="text-[10px] font-bold tracking-[.12em] text-[#8e8796] uppercase">Campaign URL</p><div className="mt-2 break-all font-mono text-xs leading-5 text-[#6844c7]">{createdUrl}</div></div><div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row"><Button variant="outline" className="bg-white" onClick={() => copyText(createdUrl, "Campaign link copied")}><Copy className="mr-2" size={16}/>Copy link</Button><Button variant="outline" className="bg-white" onClick={() => { setCreatedUrl(""); setName(""); }}><Plus className="mr-2" size={16}/>Create another</Button><Button className="violet-button" onClick={() => { onClose(); window.setTimeout(reset, 250); }}><Check className="mr-2" size={16}/>Done</Button></div></div>}
    </DialogContent>
  </Dialog>;
}

export default function ReferralToolDialogs({ active, onClose, referralLink, referralCode }: Props) {
  return <>
    <QRCodeDialog open={active === "qr"} onClose={onClose} referralLink={referralLink} referralCode={referralCode}/>
    <ShareMessageDialog open={active === "share"} onClose={onClose} referralLink={referralLink} referralCode={referralCode}/>
    <CampaignLinkDialog open={active === "campaign"} onClose={onClose} referralLink={referralLink} referralCode={referralCode}/>
  </>;
}
