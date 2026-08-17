"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  Smartphone,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Bot,
  Unplug,
  QrCode,
  Hash,
} from "lucide-react";
import { botsApi, whatsappApi, Bot as BotType, SessionStatus } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

type LinkMethod = "qr" | "phone";

export default function ConnectPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const preselectedBot = searchParams.get("bot");

  const [bots, setBots] = useState<BotType[]>([]);
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [selectedBot, setSelectedBot] = useState<string>("");
  const [linkMethod, setLinkMethod] = useState<LinkMethod>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "disconnected">("idle");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // ── Load bots + session ───────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [botsRes, statusRes] = await Promise.all([
          botsApi.list(),
          whatsappApi.status(),
        ]);
        setBots(botsRes.data.bots);
        setSession(statusRes.data);
        const defaultBot =
          preselectedBot ?? statusRes.data.bot_id ?? botsRes.data.bots[0]?.id ?? "";
        setSelectedBot(defaultBot);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [preselectedBot]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const openWs = useCallback(() => {
    if (!token) return;
    const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";
    const ws = new WebSocket(`${wsBase}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => setWsStatus("disconnected");

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string) as {
          type: "qr" | "status";
          qr?: string;
          status?: SessionStatus["status"];
          phone?: string;
        };

        if (data.type === "qr" && data.qr) {
          setQrDataUrl(data.qr);
          setConnecting(false);
        }

        if (data.type === "status") {
          setSession((prev) => ({
            status: data.status ?? "disconnected",
            phone: data.phone ?? prev?.phone ?? null,
            bot_id: prev?.bot_id ?? null,
          }));
          if (data.status === "connected") {
            setQrDataUrl(null);
            setPairingCode(null);
            setConnecting(false);
            toast.success("WhatsApp connected!");
          }
          if (data.status === "disconnected") {
            setConnecting(false);
          }
        }
      } catch { /* ignore parse errors */ }
    };
  }, [token]);

  useEffect(() => {
    openWs();
    return () => wsRef.current?.close();
  }, [openWs]);

  // ── Start session ─────────────────────────────────────────────────────────
  async function handleConnect() {
    if (!selectedBot) { toast.error("Select a bot first"); return; }
    setConnecting(true);
    setQrDataUrl(null);
    setPairingCode(null);
    try {
      await whatsappApi.connect(selectedBot);
      // For phone method: after session starts, request pairing code
      if (linkMethod === "phone") {
        const cleaned = phoneInput.replace(/\D/g, "");
        if (cleaned.length < 10) {
          setPhoneError("Enter full number with country code e.g. 923001234567");
          setConnecting(false);
          return;
        }
        // Wait a moment for client to initialize before requesting code
        setTimeout(() => requestCode(cleaned), 5_000);
      }
    } catch {
      toast.error("Failed to start session");
      setConnecting(false);
    }
  }

  // ── Request pairing code ──────────────────────────────────────────────────
  async function requestCode(phone?: string) {
    const num = (phone ?? phoneInput).replace(/\D/g, "");
    if (num.length < 10) {
      setPhoneError("Enter full number with country code e.g. 923001234567");
      return;
    }
    setPhoneError("");
    setPairingLoading(true);
    try {
      const { data } = await whatsappApi.pairingCode(num);
      setPairingCode(data.code);
      setConnecting(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? "Failed to get pairing code";
      toast.error(msg);
      setConnecting(false);
    } finally {
      setPairingLoading(false);
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await whatsappApi.disconnect();
      setSession((prev) => prev ? { ...prev, status: "disconnected", phone: null } : null);
      setQrDataUrl(null);
      setPairingCode(null);
      toast.success("WhatsApp disconnected");
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  const isConnected = session?.status === "connected";
  const isConnecting = session?.status === "connecting" || connecting;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#6c63ff]" size={28} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#e8eaf0]">Connect WhatsApp</h1>
        <p className="text-sm text-[#6b7280] mt-1">
          Link your WhatsApp number to activate your bot
        </p>
      </div>

      {/* Status bar */}
      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Smartphone size={18} className="text-[#6b7280]" />
          <div>
            <p className="text-sm font-medium text-[#e8eaf0]">Connection Status</p>
            {isConnected && session?.phone && (
              <p className="text-xs text-[#6b7280] mt-0.5">+{session.phone}</p>
            )}
          </div>
        </div>
        <Badge
          label={isConnected ? "Connected" : isConnecting ? "Connecting…" : "Disconnected"}
          variant={isConnected ? "success" : isConnecting ? "warning" : "default"}
          dot
        />
      </Card>

      {!isConnected && (
        <>
          {/* Bot selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#e8eaf0]">Select Bot</label>
            {bots.length === 0 ? (
              <p className="text-sm text-[#6b7280]">
                No bots found.{" "}
                <a href="/dashboard/bots/new" className="text-[#6c63ff] hover:underline">
                  Create one first →
                </a>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {bots.map((bot) => (
                  <label
                    key={bot.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                      selectedBot === bot.id
                        ? "border-[#6c63ff] bg-[#6c63ff]/5"
                        : "border-[#2a2f45] bg-[#22263a] hover:border-[#3a4060]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bot"
                      value={bot.id}
                      checked={selectedBot === bot.id}
                      onChange={() => setSelectedBot(bot.id)}
                      className="sr-only"
                    />
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                      selectedBot === bot.id ? "border-[#6c63ff] bg-[#6c63ff]" : "border-[#3a4060]"
                    }`} />
                    <Bot size={14} className="text-[#6c63ff] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#e8eaf0] truncate">{bot.name}</p>
                      <p className="text-[11px] text-[#6b7280] truncate">
                        {bot.model.split("/")[1]?.replace(":free", "")}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Link method toggle */}
          <div className="flex gap-2 p-1 bg-[#22263a] rounded-xl">
            <button
              onClick={() => { setLinkMethod("phone"); setPairingCode(null); setQrDataUrl(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                linkMethod === "phone"
                  ? "bg-[#6c63ff] text-white"
                  : "text-[#6b7280] hover:text-[#e8eaf0]"
              }`}
            >
              <Hash size={14} /> Phone Number
            </button>
            <button
              onClick={() => { setLinkMethod("qr"); setPairingCode(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                linkMethod === "qr"
                  ? "bg-[#6c63ff] text-white"
                  : "text-[#6b7280] hover:text-[#e8eaf0]"
              }`}
            >
              <QrCode size={14} /> QR Code
            </button>
          </div>

          {/* ── Phone Number method ── */}
          {linkMethod === "phone" && (
            <Card className="flex flex-col gap-5">
              <div>
                <p className="text-sm font-medium text-[#e8eaf0] mb-1">
                  Link with Phone Number
                </p>
                <p className="text-xs text-[#6b7280]">
                  Enter your WhatsApp number with country code. A code will appear here — enter it in your WhatsApp app.
                </p>
              </div>

              <Input
                label="WhatsApp Number"
                placeholder="923001234567"
                value={phoneInput}
                onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(""); }}
                error={phoneError}
                hint="Include country code, digits only — e.g. 923001234567"
              />

              {/* Show pairing code */}
              {pairingCode ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <p className="text-xs text-[#6b7280] text-center">
                    Enter this code in WhatsApp mobile:
                    <br />
                    <span className="text-[#6c63ff]">
                      Settings → Linked Devices → Link a Device → Link with phone number
                    </span>
                  </p>

                  {/* Code display — split into 2 groups of 4 */}
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {pairingCode.slice(0, 4).split("").map((ch, i) => (
                        <div
                          key={i}
                          className="w-10 h-12 rounded-xl bg-[#22263a] border border-[#6c63ff]/40 flex items-center justify-center text-xl font-bold text-[#6c63ff]"
                        >
                          {ch}
                        </div>
                      ))}
                    </div>
                    <span className="text-[#6b7280] text-lg font-bold">—</span>
                    <div className="flex gap-1.5">
                      {pairingCode.slice(4, 8).split("").map((ch, i) => (
                        <div
                          key={i}
                          className="w-10 h-12 rounded-xl bg-[#22263a] border border-[#6c63ff]/40 flex items-center justify-center text-xl font-bold text-[#6c63ff]"
                        >
                          {ch}
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6b7280]">
                    Code expires in ~60 seconds
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    loading={pairingLoading}
                    onClick={() => requestCode()}
                  >
                    <RefreshCw size={13} /> Get new code
                  </Button>
                </div>
              ) : isConnecting || pairingLoading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-[#6c63ff]/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#6c63ff] animate-spin" />
                  </div>
                  <p className="text-sm text-[#6b7280]">
                    {pairingLoading ? "Generating code…" : "Starting session…"}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleConnect}
                  disabled={!selectedBot || bots.length === 0 || !phoneInput.trim()}
                  className="w-full"
                >
                  <Smartphone size={15} /> Get Pairing Code
                </Button>
              )}
            </Card>
          )}

          {/* ── QR Code method ── */}
          {linkMethod === "qr" && (
            <Card className="flex flex-col items-center gap-5 py-8">
              {qrDataUrl ? (
                <>
                  <div className="p-3 bg-white rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-52 h-52" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#e8eaf0]">Scan with WhatsApp</p>
                    <p className="text-xs text-[#6b7280] mt-1">
                      Open WhatsApp → Linked Devices → Link a Device
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleConnect}>
                    <RefreshCw size={13} /> Regenerate QR
                  </Button>
                </>
              ) : isConnecting ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-[#6c63ff]/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#6c63ff] animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#e8eaf0]">Launching WhatsApp…</p>
                    <p className="text-xs text-[#6b7280] mt-1">
                      Starting browser — takes 30–60s on first run
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    {["Starting Chrome browser", "Loading WhatsApp Web", "Generating QR code"].map((step, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#6c63ff]/40 shrink-0" />
                        <p className="text-xs text-[#6b7280]">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#22263a] flex items-center justify-center">
                    <QrCode size={26} className="text-[#6b7280]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#e8eaf0]">QR Code</p>
                    <p className="text-xs text-[#6b7280] mt-1">
                      Click connect to generate a QR code
                    </p>
                  </div>
                  <Button onClick={handleConnect} disabled={!selectedBot || bots.length === 0}>
                    <QrCode size={15} /> Generate QR
                  </Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ── Connected state ── */}
      {isConnected && (
        <Card className="flex flex-col items-center gap-5 py-8">
          <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-[#22c55e]" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#e8eaf0]">WhatsApp Connected</p>
            {session?.phone && (
              <p className="text-sm text-[#6b7280] mt-1">+{session.phone}</p>
            )}
            {session?.bot_id && (
              <p className="text-xs text-[#6c63ff] mt-2">
                Active Bot: {bots.find((b) => b.id === session.bot_id)?.name ?? "Unknown"}
              </p>
            )}
          </div>

          {/* Switch bot */}
          {bots.length > 1 && (
            <div className="w-full flex flex-col gap-2">
              <p className="text-xs font-medium text-[#6b7280] text-center">Switch active bot</p>
              <div className="flex flex-col gap-2">
                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={async () => {
                      try {
                        await whatsappApi.changeBot(bot.id);
                        setSession((s) => s ? { ...s, bot_id: bot.id } : s);
                        toast.success(`Switched to "${bot.name}"`);
                      } catch {
                        toast.error("Failed to switch bot");
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                      session?.bot_id === bot.id
                        ? "border-[#6c63ff] bg-[#6c63ff]/5 text-[#e8eaf0]"
                        : "border-[#2a2f45] bg-[#22263a] text-[#6b7280] hover:border-[#3a4060]"
                    }`}
                  >
                    <Bot size={14} className="text-[#6c63ff] shrink-0" />
                    <span className="text-sm">{bot.name}</span>
                    {session?.bot_id === bot.id && (
                      <Badge label="Active" variant="purple" className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button variant="danger" loading={disconnecting} onClick={handleDisconnect}>
            <Unplug size={15} /> Disconnect
          </Button>
        </Card>
      )}

      {/* WS indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === "connected" ? "bg-[#22c55e]" : "bg-[#6b7280]"}`} />
        <span className="text-[11px] text-[#6b7280]">
          {wsStatus === "connected" ? "Real-time updates active" : "Connecting to server…"}
        </span>
      </div>
    </div>
  );
}
