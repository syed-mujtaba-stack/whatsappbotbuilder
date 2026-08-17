"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { Bot, Plus, Pencil, Trash2, Zap } from "lucide-react";
import { botsApi, Bot as BotType } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function BotsPage() {
  const router = useRouter();
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    botsApi
      .list()
      .then((r) => setBots(r.data.bots))
      .catch(() => toast.error("Failed to load bots"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await botsApi.delete(id);
      setBots((prev) => prev.filter((b) => b.id !== id));
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#e8eaf0]">My Bots</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            {bots.length} bot{bots.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/bots/new")}>
          <Plus size={15} /> New Bot
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-[#1a1d27] border border-[#2a2f45] animate-pulse"
            />
          ))}
        </div>
      ) : bots.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#22263a] flex items-center justify-center">
            <Bot size={24} className="text-[#6b7280]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#e8eaf0]">No bots yet</p>
            <p className="text-xs text-[#6b7280] mt-1">
              Create your first AI bot and connect it to WhatsApp
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/bots/new")}>
            <Plus size={14} /> Create your first bot
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {bots.map((bot) => (
            <Card key={bot.id} className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-[#6c63ff]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#e8eaf0] truncate">
                      {bot.name}
                    </p>
                    <p className="text-xs text-[#6b7280] truncate">
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

              {/* Prompt preview */}
              <div className="bg-[#22263a] rounded-xl px-3 py-2.5">
                <p className="text-xs text-[#6b7280] line-clamp-3 leading-5 font-mono">
                  {bot.system_prompt}
                </p>
              </div>

              {/* Allowed numbers */}
              <div className="flex flex-wrap gap-1.5">
                {bot.allowed_numbers.length === 0 ? (
                  <span className="text-xs text-[#6b7280]">
                    All numbers allowed
                  </span>
                ) : (
                  bot.allowed_numbers.slice(0, 3).map((n) => (
                    <span
                      key={n}
                      className="text-[11px] bg-[#22263a] text-[#6b7280] px-2 py-0.5 rounded-full"
                    >
                      +{n}
                    </span>
                  ))
                )}
                {bot.allowed_numbers.length > 3 && (
                  <span className="text-[11px] text-[#6b7280]">
                    +{bot.allowed_numbers.length - 3} more
                  </span>
                )}
              </div>

              {/* Actions */}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/dashboard/connect?bot=${bot.id}`)
                  }
                >
                  <Zap size={13} /> Connect
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
