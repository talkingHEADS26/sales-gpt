"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

const LEAD_FORM_OPEN_EVENT = "abschlussio:lead-form-open";

type InquiryType = "demo" | "enterprise";

type EnterpriseInquiryFormProps = {
  buttonLabel: string;
  className: string;
  inquiryType: InquiryType;
};

type InquiryResponse = {
  error?: string;
  success?: boolean;
};

function getInquiryHeading(inquiryType: InquiryType) {
  return inquiryType === "demo" ? "Demo buchen" : "Enterprise anfragen";
}

function getInquiryHelperText(inquiryType: InquiryType) {
  return inquiryType === "demo"
    ? "Hinterlasse deine Kontaktdaten für eine persönliche Demo von talkingHEADS Sales Trainer."
    : "Hinterlasse deine Kontaktdaten für eine Enterprise-Anfrage zu talkingHEADS Sales Trainer.";
}

export function EnterpriseInquiryForm({
  buttonLabel,
  className,
  inquiryType,
}: EnterpriseInquiryFormProps) {
  const instanceId = useId();
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    const handleExternalOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ instanceId: string }>;

      if (customEvent.detail.instanceId !== instanceId) {
        setIsOpen(false);
      }
    };

    window.addEventListener(LEAD_FORM_OPEN_EVENT, handleExternalOpen);

    return () => {
      window.removeEventListener(LEAD_FORM_OPEN_EVENT, handleExternalOpen);
    };
  }, [instanceId]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleOpen = () => {
    window.dispatchEvent(
      new CustomEvent(LEAD_FORM_OPEN_EVENT, {
        detail: { instanceId },
      })
    );
    setSubmitError("");
    setIsOpen(true);
  };

  const handleClose = () => {
    setSubmitError("");
    setIsOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/enterprise-inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          inquiryType,
          message,
          name,
          phone,
        }),
      });

      const responseBody = (await response.json()) as InquiryResponse;

      if (!response.ok || !responseBody.success) {
        throw new Error(
          responseBody.error ?? "Die Anfrage konnte nicht versendet werden."
        );
      }

      setSubmitSuccess("Danke, wir melden uns zeitnah bei dir.");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
      setIsOpen(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Die Anfrage konnte nicht versendet werden."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {buttonLabel}
      </button>

      {submitSuccess ? (
        <p
          className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {submitSuccess}
        </p>
      ) : null}

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[80]">
              <button
                type="button"
                onClick={handleClose}
                className="absolute inset-0 bg-[#0f172a]/28"
                aria-label="Formular schließen"
              />

              <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center p-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  className="relative z-[81] w-full max-w-lg rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_28px_80px_rgba(15,23,42,0.16)] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-[#707070]">
                        {getInquiryHeading(inquiryType)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {getInquiryHelperText(inquiryType)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#707070] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
                      aria-label="Formular schließen"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4.5 w-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      >
                        <path d="M6 6L18 18" />
                        <path d="M18 6L6 18" />
                      </svg>
                    </button>
                  </div>

                  <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                    {submitError ? (
                      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {submitError}
                      </p>
                    ) : null}

                    <div>
                      <label
                        htmlFor={`${instanceId}-name`}
                        className="mb-2 block text-sm font-medium text-[#707070]"
                      >
                        Name
                      </label>
                      <input
                        id={`${instanceId}-name`}
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        disabled={isSubmitting}
                        className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${instanceId}-phone`}
                        className="mb-2 block text-sm font-medium text-[#707070]"
                      >
                        Telefon
                      </label>
                      <input
                        id={`${instanceId}-phone`}
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        required
                        disabled={isSubmitting}
                        className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${instanceId}-email`}
                        className="mb-2 block text-sm font-medium text-[#707070]"
                      >
                        E-Mail
                      </label>
                      <input
                        id={`${instanceId}-email`}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        disabled={isSubmitting}
                        className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${instanceId}-message`}
                        className="mb-2 block text-sm font-medium text-[#707070]"
                      >
                        Nachricht
                      </label>
                      <textarea
                        id={`${instanceId}-message`}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={4}
                        required
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="th-reference-cta w-full"
                    >
                      {isSubmitting ? "Sende Anfrage...!" : "Anfrage senden!"}
                    </button>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
