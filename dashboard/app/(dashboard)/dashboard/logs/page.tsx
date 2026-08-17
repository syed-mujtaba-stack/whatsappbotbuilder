"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MessageSquare, RefreshCw } from "lucide-react";
import { whatsappApi, MessageLog } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLogs(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await whatsappApi.logs(100);
      setLogs(data.logs);
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#e8eaf0]">
            Message Logs
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            {logs.length} message{logs.length !== 1 ? "s" : ""} handled
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => fetchLogs(true)}
        >
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-[#1a1d27] border border-[#2a2f45] animate-pulse"
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#22263a] flex items-center justify-center">
            <MessageSquare size={20} className="text-[#6b7280]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#e8eaf0]">
              No messages yet
            </p>
            <p className="text-xs text-[#6b7280] mt-1">
              Messages will appear here once your bot starts replying
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log) => (
            <Card key={log.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#6c63ff] bg-[#6c63ff]/10 px-2.5 py-1 rounded-lg">
                  +{log.from_number.replace(/@c\.us$/, "")}
                </span>
                <span className="text-[11px] text-[#6b7280]">
                  {timeAgo(log.replied_at)}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {/* Incoming message */}
                <div className="bg-[#22263a] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#6b7280] mb-1 font-medium">
                    USER
                  </p>
                  <p className="text-sm text-[#e8eaf0] leading-5">
                    {log.message}
                  </p>
                </div>

                {/* Bot reply */}
                {log.reply && (
                  <div className="bg-[#6c63ff]/5 border border-[#6c63ff]/20 rounded-xl px-3 py-2.5">
                    <p className="text-[11px] text-[#6c63ff] mb-1 font-medium">
                      BOT
                    </p>
                    <p className="text-sm text-[#e8eaf0] leading-5">
                      {log.reply}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
