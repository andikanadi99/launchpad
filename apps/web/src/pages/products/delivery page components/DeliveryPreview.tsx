import { DeliveryData } from '../DeliveryBuilder';

interface DeliveryPreviewProps {
  data: DeliveryData;
  productName: string;
}

export default function DeliveryPreview({ data, productName }: DeliveryPreviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Preview & Save</h2>
        <p className="text-neutral-400 mt-1">
          Placeholder - Building this component next...
        </p>
      </div>
      
      <div className="bg-neutral-800 rounded-lg p-8 text-center">
        <p className="text-neutral-400">
          🚧 DeliveryPreview Component - Coming Soon
        </p>
      </div>
    </div>
  );
}