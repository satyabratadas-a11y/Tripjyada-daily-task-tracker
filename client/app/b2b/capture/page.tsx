import CardScanner from '@/components/b2b/CardScanner';

export default function CapturePage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold dark:text-gray-100">Scan business card</h1>
      <p className="mb-4 text-sm text-gray-500">Point the camera at a card, capture it, review the auto-filled details, then save.</p>
      <CardScanner />
    </div>
  );
}
