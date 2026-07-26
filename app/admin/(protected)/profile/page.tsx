"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to update password.");
        return;
      }

      setMessage("Password updated successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">

      <PageHeader
        title="Administrator Profile"
        subtitle="Manage administrator credentials and account security."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <Card
          title="Account"
          value="Administrator"
        />

        <Card
          title="Authentication"
          value="Password Protected"
        />

        <Card
          title="Session"
          value="Active"
        />

      </div>

      <div className="rounded-xl border bg-white p-8 max-w-2xl">

        <h2 className="text-xl font-semibold mb-6">
          Change Password
        </h2>

        <form onSubmit={save} className="space-y-5">

          <input
            type="password"
            className="w-full rounded-lg border px-4 py-3"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <input
            type="password"
            className="w-full rounded-lg border px-4 py-3"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <input
            type="password"
            className="w-full rounded-lg border px-4 py-3"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>

        </form>

      </div>

      <div className="rounded-xl border bg-white p-6 max-w-2xl">

        <h2 className="text-lg font-semibold mb-3">
          Password Guidelines
        </h2>

        <ul className="list-disc space-y-2 pl-6 text-sm text-gray-600">
          <li>Use at least 8 characters.</li>
          <li>Include uppercase and lowercase letters.</li>
          <li>Include numbers and special characters.</li>
          <li>Avoid reusing previous passwords.</li>
        </ul>

      </div>

    </div>
  );
}
