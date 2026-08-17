"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Bot,
  Unplug,
} from "lucide-react";
import { botsApi, whatsappApi, Bot as BotType, SessionStatus } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function ConnectPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const preselectedBot = searchParams.get("bot");

  const [bots, setBots] = useState<BotType[]>([]);
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [selectedBot, setSelectedBot] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "disconnected">("idle");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // ── Load bots + current session ──────────────────────────────────────────────
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
          preselectedBot ??
          statusRes.data.bot_id ??
          botsRes.data.bots[0]?.id ??
          "";
        setSelectedBot(defaultBot);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [preselectedBot]);

  // ── WebSocket connection ──────────────────────────────────────────────────────
  const openWs = useCallback(() => {
    if (!token) return;
    const wsBase =
      process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";
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
            setConnecting(false);
            toast.success("WhatsApp connected successfully!");
          }
          if (data.status === "disconnected") {
            setConnecting(false);
          }
        }
      } catch {}
    };
  }, [token]);

  useEffect(() => {
    openWs();
    return () => wsRef.current?.close();
  }, [openWs]);

  // ── Connect handler ───────────────────────────────────────────────────────────
  async function handleConnect() {
    if (!selectedBot) { toast.error("Select a bot first"); return; }
    setConnecting(true);
    setQrDataUrl(null);
    try {
      await whatsappApi.connect(selectedBot);
      // QR will arrive via WebSocket
    } catch {
      toast.error("Failed to start session");
      setConnecting(false);
    }
  }

  // ── Disconnect handler ────────────────────────────────────────────────────────
  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await whatsappApi.disconnect();
      setSession((prev) => prev ? { ...prev, status: "disconnected", phone: null } : null);
      setQrDataUrl(null);
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
        <h1 className="text-2xl font-semibold text-[#e8eaf0]">
          Connect WhatsApp
        </h1>
        <p className="text-sm text-[#6b7280] mt-1">
          Scan the QR code with WhatsApp to activate your bot
        </p>
      </div>

      {/* Current status */}
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
          label={
            isConnected
              ? "Connected"
              : isConnecting
              ? "Connecting…"
              : "Disconnected"
          }
          variant={
            isConnected ? "success" : isConnecting ? "warning" : "default"
          }
          dot
        />
      </Card>

      {/* Bot selector */}
      {!isConnected && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#e8eaf0]">
            Select Bot
          </label>
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
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                      selectedBot === bot.id
                        ? "border-[#6c63ff] bg-[#6c63ff]"
                        : "border-[#3a4060]"
                    }`}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <Bot size={14} className="text-[#6c63ff] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#e8eaf0] truncate">
                        {bot.name}
                      </p>
                      <p className="text-[11px] text-[#6b7280] truncate">
                        {bot.model.split("/")[1]?.replace(":free", "")}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Code area */}
      {!isConnected && (
        <Card className="flex flex-col items-center gap-5 py-8">
          {qrDataUrl ? (
            <>
              <div className="p-3 bg-white rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="WhatsApp QR Code"
                  className="w-52 h-52"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#e8eaf0]">
                  Scan with WhatsApp
                </p>
                <p className="text-xs text-[#6b7280] mt-1">
                  Open WhatsApp → Linked Devices → Link a Device
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleConnect}>
                <RefreshCw size={13} /> Regenerate QR
              </Button>
            </>
          ) : isConnecting ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-[#6c63ff]/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-[#6c63ff] animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#e8eaf0]">
                  Launching WhatsApp…
                </p>
                <p className="text-xs text-[#6b7280] mt-1">
                  Starting browser on server — this takes 30–60s on first run
                </p>
              </div>
              {/* Progress hint steps */}
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {[
                  "Starting Chrome browser",
                  "Loading WhatsApp Web",
                  "Generating QR code",
                ].map((step, i) => (
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
                <Smartphone size={26} className="text-[#6b7280]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#e8eaf0]">
                  Not connected
                </p>
                <p className="text-xs text-[#6b7280] mt-1">
                  Select a bot and click Connect to get your QR code
                </p>
              </div>
              <Button
                onClick={handleConnect}
                disabled={!selectedBot || bots.length === 0}
              >
                <Smartphone size={15} /> Connect WhatsApp
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Connected state */}
      {isConnected && (
        <Card className="flex flex-col items-center gap-5 py-8">
          <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-[#22c55e]" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#e8eaf0]">
              WhatsApp Connected
            </p>
            {session?.phone && (
              <p className="text-sm text-[#6b7280] mt-1">+{session.phone}</p>
            )}
            {session?.bot_id && (
              <p className="text-xs text-[#6c63ff] mt-2">
                Active Bot:{" "}
                {bots.find((b) => b.id === session.bot_id)?.name ?? "Unknown"}
              </p>
            )}
          </div>

          {/* Change bot while connected */}
          {bots.length > 1 && (
            <div className="w-full flex flex-col gap-2">
              <p className="text-xs font-medium text-[#6b7280] text-center">
                Switch active bot without reconnecting
              </p>
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

          <Button
            variant="danger"
            loading={disconnecting}
            onClick={handleDisconnect}
          >
            <Unplug size={15} /> Disconnect
          </Button>
        </Card>
      )}

      {/* WS status indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            wsStatus === "connected" ? "bg-[#22c55e]" : "bg-[#6b7280]"
          }`}
        />
        <span className="text-[11px] text-[#6b7280]">
          {wsStatus === "connected" ? "Real-time updates active" : "Connecting to server…"}
        </span>
      </div>
    </div>
  );
}
