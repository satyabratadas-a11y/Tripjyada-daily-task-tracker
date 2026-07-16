'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';
import { MAX_IMAGE_DIMENSION, IMAGE_QUALITY, downscaleImage } from '@/lib/imageResize';

type FormState = {
  name: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  state: string;
  pincode: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  company: '',
  jobTitle: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  state: '',
  pincode: '',
  notes: '',
};

const FIELD_LABELS: Record<keyof FormState, string> = {
  name: 'Name',
  company: 'Business name *',
  jobTitle: 'Job title',
  phone: 'Phone *',
  email: 'Email *',
  website: 'Website',
  address: 'Address *',
  state: 'State *',
  pincode: 'Pincode *',
  notes: 'Notes',
};

// Required for every contact regardless of entry path — matches the server-side check in
// contact.controller.js, which is the actual enforcement; this is just so the form tells the
// agent what's missing before they hit save instead of after a rejected request.
const MANDATORY_FIELDS: (keyof FormState)[] = ['company', 'phone', 'email', 'address', 'state', 'pincode'];

function missingFields(form: FormState) {
  return MANDATORY_FIELDS.filter((key) => !form[key].trim());
}

const SCAN_FIELDS: (keyof FormState)[] = [
  'name',
  'company',
  'jobTitle',
  'phone',
  'email',
  'website',
  'address',
  'state',
  'pincode',
];

interface DuplicateInfo {
  id: string;
  name: string;
  company: string;
  capturedBy: string;
  createdAt: string;
}

type Step = 'capture-front' | 'ask-back' | 'capture-back' | 'review';
type Side = 'front' | 'back';
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchConstraintSet = MediaTrackConstraintSet & { torch: boolean };

export default function CardScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unmountedRef = useRef(false);
  // Bumped on every startCamera() call so an older, superseded call can tell it's no longer the
  // "current" one once its getUserMedia() promise resolves (React's dev-mode double-invoked
  // effects, or a fast double-tap on a button, can otherwise start two overlapping requests —
  // the older one would silently overwrite streamRef and leak its own camera stream forever).
  const cameraGenerationRef = useRef(0);
  // Which side the next "Upload photo" file picker selection belongs to — set right before the
  // hidden <input> is clicked, since the change event itself carries no side information.
  const uploadSideRef = useRef<Side>('front');

  const [cameraError, setCameraError] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchError, setTorchError] = useState('');
  const [step, setStep] = useState<Step>('capture-front');
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [frontUrl, setFrontUrl] = useState('');
  const [backBlob, setBackBlob] = useState<Blob | null>(null);
  const [backUrl, setBackUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  useEffect(() => {
    unmountedRef.current = false;
    startCamera();

    // Belt-and-braces beyond React's own cleanup: releases the camera immediately if the tab is
    // hidden/closed/navigated away from in a way that doesn't cleanly unmount this component.
    const releaseOnHide = () => {
      if (document.visibilityState === 'hidden') stopCamera();
    };
    document.addEventListener('visibilitychange', releaseOnHide);
    window.addEventListener('pagehide', stopCamera);

    return () => {
      unmountedRef.current = true;
      stopCamera();
      document.removeEventListener('visibilitychange', releaseOnHide);
      window.removeEventListener('pagehide', stopCamera);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    const myGeneration = ++cameraGenerationRef.current;
    setCameraError('');
    setTorchError('');
    setTorchSupported(false);
    setTorchOn(false);
    if (!window.isSecureContext) {
      setCameraError('Camera access requires HTTPS (or localhost). This page is loaded over an insecure connection.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support camera access.');
      return;
    }
    // Guard against ever having two live streams at once (e.g. a stray double-click on "Try
    // again") — always release whatever's currently held before requesting a new one.
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Stale if we've unmounted, OR a newer startCamera() call has started since this one did
      // (e.g. React's double-invoked dev-mode effects) — either way this stream must never be
      // kept, or it leaks and the camera light stays on with nothing referencing it anymore.
      if (unmountedRef.current || cameraGenerationRef.current !== myGeneration) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack?.getCapabilities?.() as TorchCapabilities | undefined;
      setTorchSupported(Boolean(capabilities?.torch));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Can still legitimately reject if superseded again between the checks above and here —
        // that's not an error worth surfacing, the stream is already being torn down elsewhere.
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission is blocked for this site. Click the camera/lock icon in the address bar, allow camera access, then click "Try again" below — or upload a photo instead.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('No camera was found on this device. Connect a webcam, open this page on a phone, or upload a photo instead.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setCameraError('The camera is already in use by another app. Close other apps/tabs using the camera, or upload a photo instead.');
      } else {
        const detail = err instanceof Error ? err.message : String(err);
        setCameraError(`Camera access failed (${name || 'unknown error'}): ${detail}`);
      }
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTorchSupported(false);
    setTorchOn(false);
    setTorchError('');
    // Stopping the tracks releases the hardware, but on some mobile browsers the camera-in-use
    // indicator doesn't clear until the <video> element's srcObject is detached too.
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function toggleTorch() {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack || !torchSupported) return;

    const nextTorchState = !torchOn;
    setTorchError('');
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: nextTorchState } as TorchConstraintSet],
      });
      setTorchOn(nextTorchState);
    } catch {
      setTorchOn(false);
      setTorchSupported(false);
      setTorchError('The flashlight could not be enabled on this camera.');
    }
  }

  function retake() {
    if (frontUrl) URL.revokeObjectURL(frontUrl);
    if (backUrl) URL.revokeObjectURL(backUrl);
    setFrontBlob(null);
    setFrontUrl('');
    setBackBlob(null);
    setBackUrl('');
    setForm(EMPTY_FORM);
    setConfirmed(false);
    setError('');
    setDuplicate(null);
    setStep('capture-front');
    startCamera();
  }

  function handleCaptured(side: Side, blob: Blob) {
    stopCamera();
    const url = URL.createObjectURL(blob);
    if (side === 'front') {
      setFrontBlob(blob);
      setFrontUrl(url);
      setStep('ask-back');
    } else {
      setBackBlob(blob);
      setBackUrl(url);
      setStep('review');
      if (frontBlob) scanCard(frontBlob, blob);
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    // Downscale directly at capture time (rather than draw full-res then resize after) — no need
    // for an intermediate full-resolution blob when this is the only place it'd be used.
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        handleCaptured(step === 'capture-back' ? 'back' : 'front', blob);
      },
      'image/jpeg',
      IMAGE_QUALITY
    );
  }

  function openUpload(side: Side) {
    uploadSideRef.current = side;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Uploaded files (unlike camera captures) can be arbitrarily large — a modern phone photo is
    // often 4000px+ wide — so these always need downscaling before they're sent anywhere.
    try {
      const resized = await downscaleImage(file);
      handleCaptured(uploadSideRef.current, resized);
    } catch {
      handleCaptured(uploadSideRef.current, file);
    }
  }

  function addBackSide() {
    setStep('capture-back');
    startCamera();
  }

  function skipBackSide() {
    setStep('review');
    if (frontBlob) scanCard(frontBlob, null);
  }

  async function scanCard(front: Blob, back: Blob | null) {
    setScanning(true);
    setError('');
    setDuplicate(null);
    try {
      const formData = new FormData();
      formData.append('image', front, 'card-front.jpg');
      if (back) formData.append('backImage', back, 'card-back.jpg');

      const res = await fetch(`${API_URL}/api/contacts/scan`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not read the card');
      }
      const { fields, duplicate: dup } = (await res.json()) as {
        fields: Partial<FormState>;
        duplicate: DuplicateInfo | null;
      };
      setForm((f) => {
        const next = { ...f };
        for (const key of SCAN_FIELDS) {
          if (fields[key]) next[key] = fields[key] as string;
        }
        return next;
      });
      setDuplicate(dup || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not auto-read the card — fill the fields in manually below.');
    } finally {
      setScanning(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setConfirmed(false);
  }

  async function handleSave() {
    if (!frontBlob) return;
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', frontBlob, 'card-front.jpg');
      if (backBlob) formData.append('backImage', backBlob, 'card-back.jpg');
      (Object.keys(form) as (keyof FormState)[]).forEach((key) => formData.append(key, form[key]));

      const res = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save contact');
      }
      setSavedMessage('Saved. Ready to scan the next card.');
      retake();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  const inCaptureStep = step === 'capture-front' || step === 'capture-back';
  const showReviewActions = step === 'review' && !scanning;
  const fixedBarVisible = inCaptureStep || step === 'ask-back' || showReviewActions;
  const missing = missingFields(form);

  return (
    <div className="mx-auto max-w-xl">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      {/* Bottom padding reserves room so the fixed action bar never covers the last field. */}
      <div className={`space-y-4 ${fixedBarVisible ? 'pb-24' : ''}`}>
        {savedMessage && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            {savedMessage}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {inCaptureStep && (
          <div className="card space-y-3">
            <p className="text-xs text-gray-500">
              {step === 'capture-front' ? 'Capture the front of the card.' : 'Now capture the back of the card (optional info like address is often here).'}
            </p>
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <i className="fa-solid fa-circle-info mr-1" />
              Hold steady and fill the frame — a sharp, well-lit, glare-free photo reads far more accurately than a blurry one.
            </p>
            {cameraError ? (
              <p className="text-sm text-red-600">{cameraError}</p>
            ) : (
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video ref={videoRef} muted playsInline className="w-full" />
                {torchSupported && (
                  <button
                    type="button"
                    className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm shadow-md transition ${
                      torchOn
                        ? 'border-brand bg-brand text-white'
                        : 'border-white/40 bg-black/60 text-white hover:bg-black/75'
                    }`}
                    onClick={toggleTorch}
                    aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                    aria-pressed={torchOn}
                    title={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                  >
                    <i className="fa-solid fa-bolt" />
                  </button>
                )}
              </div>
            )}
            {torchError && <p className="text-xs text-red-600">{torchError}</p>}
            {cameraError && (
              <button type="button" className="btn-secondary w-full" onClick={startCamera}>
                <i className="fa-solid fa-rotate-right" />
                Try again
              </button>
            )}
            {step === 'capture-back' && (
              <button type="button" className="text-sm text-gray-500 underline" onClick={skipBackSide}>
                Skip back side
              </button>
            )}
          </div>
        )}

        {step === 'ask-back' && (
          <div className="card space-y-4">
            <img src={frontUrl} alt="Captured front of business card" className="w-full rounded-lg border border-gray-200 dark:border-white/10" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add the back of the card?</p>
                <p className="text-xs text-gray-500">Optional — useful when the address or extra details are printed on the back.</p>
              </div>
              <button type="button" className="shrink-0 text-sm text-gray-500 underline" onClick={retake}>
                Retake
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="card space-y-4">
            <div className={`grid gap-3 ${backUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <img src={frontUrl} alt="Front of business card" className="w-full rounded-lg border border-gray-200 dark:border-white/10" />
              {backUrl && (
                <img src={backUrl} alt="Back of business card" className="w-full rounded-lg border border-gray-200 dark:border-white/10" />
              )}
            </div>

            {scanning ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <i className="fa-solid fa-circle-notch fa-spin" />
                Reading card with AI…
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500">Auto-filled from the scan — review and correct before saving.</p>
                {duplicate && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    <i className="fa-solid fa-triangle-exclamation mr-1" />
                    Possible duplicate — matches {duplicate.name || duplicate.company || 'a contact'} captured by{' '}
                    {duplicate.capturedBy || 'someone'} on {new Date(duplicate.createdAt).toLocaleDateString()}. Saving will be
                    blocked if this is the same contact.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(Object.keys(EMPTY_FORM) as (keyof FormState)[]).map((key) => (
                    <div key={key} className={key === 'notes' || key === 'address' ? 'sm:col-span-2' : ''}>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                        {FIELD_LABELS[key]}
                      </label>
                      <input className="input" value={form[key]} onChange={(e) => updateField(key, e.target.value)} />
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    className="accent-brand"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I&apos;ve reviewed these details and they&apos;re correct
                </label>

                {missing.length > 0 && (
                  <p className="text-xs text-status-flagged">
                    Still needed: {missing.map((key) => FIELD_LABELS[key].replace(' *', '')).join(', ')}
                  </p>
                )}

                {error && (
                  <button type="button" className="btn-secondary w-full" onClick={() => frontBlob && scanCard(frontBlob, backBlob)}>
                    <i className="fa-solid fa-rotate-right" />
                    Retry scan
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom action bar, mobile-app style — always reachable without scrolling. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-ink-light">
        <div className="mx-auto flex max-w-xl gap-2">
          {step === 'capture-front' && (
            <>
              {!cameraError && (
                <button type="button" className="btn-primary flex-1" onClick={capture}>
                  <i className="fa-solid fa-camera" />
                  Capture card
                </button>
              )}
              <button type="button" className="btn-secondary flex-1" onClick={() => openUpload('front')}>
                <i className="fa-solid fa-upload" />
                Upload photo
              </button>
            </>
          )}
          {step === 'capture-back' && (
            <>
              {!cameraError && (
                <button type="button" className="btn-primary flex-1" onClick={capture}>
                  <i className="fa-solid fa-camera" />
                  Capture back
                </button>
              )}
              <button type="button" className="btn-secondary flex-1" onClick={() => openUpload('back')}>
                <i className="fa-solid fa-upload" />
                Upload photo
              </button>
            </>
          )}
          {step === 'ask-back' && (
            <>
              <button type="button" className="btn-secondary flex-1" onClick={skipBackSide}>
                Skip — scan now
              </button>
              <button type="button" className="btn-primary flex-1" onClick={addBackSide}>
                Add back side
              </button>
            </>
          )}
          {showReviewActions && (
            <>
              <button type="button" className="btn-secondary flex-1" onClick={retake} disabled={saving}>
                Retake
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleSave}
                disabled={!confirmed || saving || missing.length > 0}
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    Saving…
                  </>
                ) : (
                  'Save contact'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
