import { useEffect, useState } from "react";
import { api } from "../services/api";

function StatCard({ label, value, tone = "text-zinc-100" }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">{label}</div>
      <div className={`text-2xl ${tone}`}>{value}</div>
    </div>
  );
}

function formatCooldown(seconds) {
  if (!seconds) return "Now";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ username: "", display_name: "", preferences: { default_symbol: "AAPL", timezone: "UTC", compact_mode: false } });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError("");
    try {
      const data = await api.getProfile();
      setProfile(data);
      setForm({
        username: data.username ?? "",
        display_name: data.display_name ?? "",
        preferences: {
          default_symbol: data.preferences?.default_symbol ?? "AAPL",
          timezone: data.preferences?.timezone ?? "UTC",
          compact_mode: Boolean(data.preferences?.compact_mode),
        },
      });
    } catch (err) {
      setError(err?.message ?? "Unable to load profile");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    setError("");
    try {
      const updated = await api.updateProfile(form);
      setProfile(updated);
      setStatus("Profile updated");
    } catch (err) {
      setError(err?.message ?? "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    setError("");
    try {
      await api.changePassword(passwords);
      setPasswords({ current_password: "", new_password: "" });
      setStatus("Password updated");
    } catch (err) {
      setError(err?.message ?? "Unable to change password");
    } finally {
      setSaving(false);
    }
  };

  const refill = async (mode) => {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      await api.refillDemoBalance(mode);
      await load();
      setStatus(mode === "free" ? "Free refill applied" : "Paid-style refill simulated");
    } catch (err) {
      setError(err?.message ?? "Unable to refill demo balance");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-500">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-3">Profile</div>
        <h1 className="text-4xl font-light text-zinc-100">{profile.display_name}</h1>
        <p className="text-zinc-400 mt-2">Manage your identity, preferences, password, and demo account recovery in one place.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Simulated Profit" value={`$${Number(profile.statistics?.total_simulated_profit ?? 0).toFixed(2)}`} tone={(profile.statistics?.total_simulated_profit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"} />
        <StatCard label="Trades Completed" value={profile.statistics?.trades_completed ?? 0} />
        <StatCard label="Strategies Used" value={(profile.statistics?.strategies_used ?? []).length} tone="text-cyan-300" />
        <StatCard label="Learning Progress" value={`${profile.statistics?.learning_progress ?? 0}%`} tone="text-amber-300" />
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <form onSubmit={saveProfile} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <div className="text-zinc-100 text-lg">Account Settings</div>
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} placeholder="Username" />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100" value={form.display_name} onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))} placeholder="Display name" />
          <div className="grid md:grid-cols-2 gap-3">
            <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100" value={form.preferences.default_symbol} onChange={(e) => setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, default_symbol: e.target.value.toUpperCase() } }))} placeholder="Default symbol" />
            <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100" value={form.preferences.timezone} onChange={(e) => setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, timezone: e.target.value } }))} placeholder="Timezone" />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.preferences.compact_mode} onChange={(e) => setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, compact_mode: e.target.checked } }))} />
            <span>Prefer compact UI panels</span>
          </label>
          <button disabled={saving} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50">Save profile</button>
        </form>

        <form onSubmit={changePassword} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <div className="text-zinc-100 text-lg">Security</div>
          <input type="password" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100" value={passwords.current_password} onChange={(e) => setPasswords((prev) => ({ ...prev, current_password: e.target.value }))} placeholder="Current password" />
          <input type="password" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100" value={passwords.new_password} onChange={(e) => setPasswords((prev) => ({ ...prev, new_password: e.target.value }))} placeholder="New password" />
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400">
            Signed in as <span className="text-zinc-100">{profile.email}</span>
          </div>
          <button disabled={saving} className="rounded-lg border border-zinc-700 px-5 py-3 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-50">Change password</button>
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-zinc-100 text-lg">Demo Balance Refill</div>
            <div className="text-zinc-500 text-sm mt-1">If your learning account runs low, use the free cooldown refill or a simulated low-cost top-up.</div>
          </div>
          <div className="text-sm text-zinc-400">Free refill available in <span className="text-zinc-100">{formatCooldown(profile.statistics?.free_refill_cooldown_seconds)}</span></div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button disabled={saving || !(profile.statistics?.free_refill_cooldown_seconds === 0 || profile.statistics?.free_refill_cooldown_seconds == null)} onClick={() => refill("free")} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50">Free refill</button>
          <button disabled={saving} onClick={() => refill("paid")} className="rounded-lg border border-zinc-700 px-5 py-3 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-50">Simulate $0.25 refill</button>
        </div>
      </div>

      {(status || error) && (
        <div className={`rounded-xl border p-4 ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
          {error || status}
        </div>
      )}
    </div>
  );
}
