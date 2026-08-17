"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import {
  Bot,
  Plus,
  Smartphone,
  MessageSquare,
  Trash2,
  Pencil,
  ChevronRight,
  Zap,
} from "lucide-react";
import { botsApi, whatsappApi, Bot as BotType, SessionStatus } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [bots, setBots] = useState<BotType[]>([]);
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [logs, setLogs] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [botsRes, statusRes, logsRes] = await Promise.all([
          botsApi.list(),
          whatsappApi.status(),
          whatsappApi.logs(200),
        ]);
        setBots(botsRes.data.bots);
        setSession(statusRes.data);
        setLogs(logsRes.data.logs.length);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDelete(botId: string) {
    setDeletingId(botId);
    try {
      await botsApi.delete(botId);
      setBots((prev) => prev.filter((b) => b.id !== botId));
      toast.success("Bot deleted");
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.error ?? "Delete failed"
          : "Delete failed";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  const statusVariant =
    session?.status === "connected"
      ? "success"
      : session?.status === "connecting"
      ? "warning"
      : "default";

  const statusLabel =
    session?.status === "connected"
      ? `Connected${session.phone ? ` · ${session.phone}` : ""}`
      : session?.status === "connecting"
      ? "Connecting…"
      : "Disconnected";

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#e8eaf0]">
            Hey, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Manage your bots and WhatsApp connection from here.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/bots/new")}>
          <Plus size={15} />
          New Bot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center shrink-0">
            <Bot size={18} className="text-[#6c63ff]" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#e8eaf0]">
              {loading ? "—" : bots.length}
            </p>
            <p className="text-xs text-[#6b7280] mt-0.5">Total Bots</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center shrink-0">
            <Smartphone size={18} className="text-[#22c55e]" />
          </div>
          <div>
            <Badge label={statusLabel} variant={statusVariant} dot />
            <p className="text-xs text-[#6b7280] mt-1">WhatsApp Status</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center shrink-0">
            <MessageSquare size={18} className="text-[#f59e0b]" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#e8eaf0]">
              {loading ? "—" : logs}
            </p>
            <p className="text-xs text-[#6b7280] mt-0.5">Messages Handled</p>
          </div>
        </Card>
      </div>

      {/* WhatsApp CTA if disconnected */}
      {!loading && session?.status === "disconnected" && (
        <Card className="flex items-center justify-between gap-4 border-dashed border-[#6c63ff]/30 bg-[#6c63ff]/5">
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-[#6c63ff] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#e8eaf0]">
                Connect your WhatsApp
              </p>
              <p className="text-xs text-[#6b7280]">
                Scan a QR code to activate your bot
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push("/dashboard/connect")}
          >
            Connect <ChevronRight size={14} />
          </Button>
        </Card>
      )}

      {/* Bot List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#e8eaf0]">Your Bots</h2>
          <Link
            href="/dashboard/bots"
            className="text-xs text-[#6b7280] hover:text-[#6c63ff] transition-colors"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-[#1a1d27] border border-[#2a2f45] animate-pulse"
              />
            ))}
          </div>
        ) : bots.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#22263a] flex items-center justify-center">
              <Bot size={22} className="text-[#6b7280]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#e8eaf0]">No bots yet</p>
              <p className="text-xs text-[#6b7280] mt-1">
                Create your first bot to get started
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/bots/new")}
            >
              <Plus size={13} /> Create Bot
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bots.slice(0, 4).map((bot) => (
              <Card key={bot.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#6c63ff]/10 flex items-center justify-center shrink-0">
                      <Bot size={15} className="text-[#6c63ff]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#e8eaf0] truncate">
                        {bot.name}
                      </p>
                      <p className="text-[11px] text-[#6b7280] truncate">
                        {bot.model.split("/")[1]?.replace(":free", "")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    label={bot.is_active ? "Active" : "Inactive"}
                    variant={bot.is_active ? "success" : "default"}
                    dot
                  />
                </div>

                <p className="text-xs text-[#6b7280] line-clamp-2 leading-5">
                  {bot.system_prompt}
                </p>

                {bot.allowed_numbers.length > 0 && (
                  <p className="text-[11px] text-[#6b7280]">
                    {bot.allowed_numbers.length} allowed number
                    {bot.allowed_numbers.length > 1 ? "s" : ""}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-[#2a2f45]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      router.push(`/dashboard/bots/${bot.id}/edit`)
                    }
                  >
                    <Pencil size={13} /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deletingId === bot.id}
                    onClick={() => handleDelete(bot.id)}
                  >
                    <Trash2 size={13} /> Delete
                  </Button>
                  {session?.status === "connected" &&
                    session.bot_id !== bot.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await whatsappApi.changeBot(bot.id);
                            setSession((s) =>
                              s ? { ...s, bot_id: bot.id } : s
                            );
                            toast.success(`Switched to "${bot.name}"`);
                          } catch {
                            toast.error("Failed to switch bot");
                          }
                        }}
                      >
                        <Zap size={13} /> Use this
                      </Button>
                    )}
                  {session?.bot_id === bot.id && (
                    <Badge label="Active bot" variant="purple" dot />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
