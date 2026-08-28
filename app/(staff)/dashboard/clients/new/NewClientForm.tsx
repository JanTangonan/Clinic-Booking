"use client";

import { useState } from "react";
import { createClientRecord } from "../actions";
import SignaturePad from "@/components/SignaturePad";

// ⚠️ PLACEHOLDER LEGAL TEXT — this is a reasonable draft based on
// general Philippine Data Privacy Act (RA 10173) consent conventions,
// written so the feature works end-to-end. It has NOT been reviewed
// by a lawyer and should not be treated as finished copy. Replace
// with wording the clinic's own legal counsel has approved before
// this collects real client signatures.
const PRIVACY_CONSENT_TEXT = `By checking this box, I acknowledge that this clinic collects and processes my personal and health-related information (including my contact details, appointment history, and treatment records) for the purpose of providing facial and dermatological services, scheduling appointments, and maintaining accurate clinic records, in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).

I understand that my information will be kept confidential and will not be shared with third parties without my consent, except as required by law. I understand I have the right to access, correct, or request deletion of my personal data by contacting the clinic directly.`;

const CONSENT_VERSION = "v1-draft";

export default function NewClientForm() {
  const [consentChecked, setConsentChecked] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const canSubmit = consentChecked && !!signature;

  return (
    <form action={createClientRecord} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
              Full name <span className="text-rose-500">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              placeholder="e.g. Maria Santos"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              placeholder="e.g. 0917 123 4567"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="e.g. maria@email.com"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="General notes — allergies to be aware of, preferences, etc. Not clinical treatment notes."
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none"
        />
        <p className="mt-2 text-xs text-slate-500">
          Optional details that help the team provide a better experience.
        </p>
      </div>

      <div className="rounded border border-gray-200 p-4 space-y-3 bg-gray-50">
        <p className="text-sm font-medium text-gray-700">Data privacy agreement</p>
        <div className="max-h-40 overflow-y-auto rounded border border-gray-200 bg-white p-3 text-xs text-gray-600 whitespace-pre-line">
          {PRIVACY_CONSENT_TEXT}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5"
          />
          <span>The client has read and agrees to this data privacy agreement.</span>
        </label>

        {consentChecked && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Client signature *</p>
            <SignaturePad onChange={setSignature} />
          </div>
        )}
      </div>

      {/* Hidden fields carry the consent decision into the server
          action's FormData — this is still a real, progressively
          submitted form, just with two fields populated by React
          state instead of typed input. */}
      <input type="hidden" name="privacy_consent" value={consentChecked ? "true" : ""} />
      <input type="hidden" name="privacy_consent_signature" value={signature ?? ""} />
      <input type="hidden" name="privacy_consent_version" value={CONSENT_VERSION} />

      {!canSubmit && (
        <p className="text-xs text-amber-600">
          Client must agree to the privacy agreement and sign before this can be saved.
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Required fields are marked with an asterisk.</p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Save client
        </button>
      </div>
    </form>
  );
}
