"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import { botsApi } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

const DEFAULT_MODELS = [
  { id: "google/gemma-4-27b-it:free", label: "Gemma 4 27B" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron Super 120B" },
  { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "Nemotron Nano 30B" },
  { id: "z-ai/glm-5.2:free", label: "GLM 5.2" },
  { id: "openai/gpt-oss-20b:free", label: "GPT OSS 20B" },
];

export default function EditBotPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState({
    name: "",
    system_prompt: "",
    model: "google/gemma-4-27b-it:free",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [allowedNumbers, setAllowedNumbers] = useState<string[]>([]);
  const [numberInput, setNumberInput] = useState("");
  const [numberError, setNumberError] = useState("");
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([botsApi.get(id), botsApi.models()]).then(([botRes, modelsRes]) => {
      const bot = botRes.data.bot;
      setForm({
        name: bot.name,
        system_prompt: bot.system_prompt,
        model: bot.model,
      });
      setAllowedNumbers(bot.allowed_numbers);
      if (modelsRes.data.models.length > 0) setModels(modelsRes.data.models);
    }).catch(() => {
      toast.error("Failed to load bot");
      router.push("/dashboard/bots");
    }).finally(() => setFetching(false));
  }, [id, router]);

  function addNumber() {
    const cleaned = numberInput.trim().replace(/\D/g, "");
    if (!cleaned) { setNumberError("Enter a number"); return; }
    if (cleaned.length < 10 || cleaned.length > 15) {
      setNumberError("Number must be 10–15 digits");
      return;
    }
    if (allowedNumbers.includes(cleaned)) {
      setNumberError("Number already added");
      return;
    }
    setAllowedNumbers((prev) => [...prev, cleaned]);
    setNumberInput("");
    setNumberError("");
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!form.name.trim()) errs.name = "Bot name is required";
    if (!form.system_prompt.trim() || form.system_prompt.trim().length < 10)
      errs.system_prompt = "System prompt must be at least 10 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await botsApi.update(id, {
        name: form.name.trim(),
        system_prompt: form.system_prompt.trim(),
        model: form.model,
        allowed_numbers: allowedNumbers,
      });
      toast.success("Bot updated successfully!");
      router.push("/dashboard/bots");
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.error ?? "Update failed"
          : "Update failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#6c63ff]" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg bg-[#22263a] flex items-center justify-center text-[#6b7280] hover:text-[#e8eaf0] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Edit Bot</h1>
          <p className="text-xs text-[#6b7280]">Update your bot configuration</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Bot Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
        />

        <Textarea
          label="System Prompt"
          rows={6}
          value={form.system_prompt}
          onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          error={errors.system_prompt}
          hint={`${form.system_prompt.length}/2000 characters`}
        />

        {/* Model Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#e8eaf0]">AI Model</label>
          <div className="grid grid-cols-1 gap-2">
            {models.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                  form.model === m.id
                    ? "border-[#6c63ff] bg-[#6c63ff]/5 text-[#e8eaf0]"
                    : "border-[#2a2f45] bg-[#22263a] text-[#6b7280] hover:border-[#3a4060]"
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={form.model === m.id}
                  onChange={() => setForm({ ...form, model: m.id })}
                  className="sr-only"
                />
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-all ${
                    form.model === m.id
                      ? "border-[#6c63ff] bg-[#6c63ff]"
                      : "border-[#3a4060]"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-[11px] text-[#6b7280] font-mono">
                    {m.id.replace(":free", "")}
                  </p>
                </div>
                <span className="ml-auto text-[10px] bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full font-medium">
                  FREE
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Allowed Numbers */}
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-sm font-medium text-[#e8eaf0]">
              Allowed Numbers{" "}
              <span className="text-[#6b7280] font-normal">(optional)</span>
            </label>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Leave empty to reply to everyone.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="923001234567"
              value={numberInput}
              onChange={(e) => { setNumberInput(e.target.value); setNumberError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNumber(); } }}
              error={numberError}
              hint="Digits only, no + or spaces"
            />
            <Button type="button" variant="outline" size="md" onClick={addNumber} className="shrink-0 self-start">
              <Plus size={15} />
            </Button>
          </div>
          {allowedNumbers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {allowedNumbers.map((n) => (
                <span key={n} className="inline-flex items-center gap-1.5 text-xs bg-[#22263a] text-[#e8eaf0] px-3 py-1 rounded-full border border-[#2a2f45]">
                  +{n}
                  <button type="button" onClick={() => setAllowedNumbers((prev) => prev.filter((x) => x !== n))} className="text-[#6b7280] hover:text-[#ef4444] transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Save Changes</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
