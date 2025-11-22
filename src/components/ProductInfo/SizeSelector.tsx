import { getSizeAbbreviation } from '@/utils/productHelpers';

interface SizeSelectorProps {
  availableSizes: string[];
  selectedSize: string;
  onSelect: (size: string) => void;
}

export default function SizeSelector({
  availableSizes,
  selectedSize,
  onSelect,
}: SizeSelectorProps) {
  if (availableSizes.length === 0) return null;

  return (
    <div>
      <label className="block text-[14px] font-medium text-gray-900 mb-3">
        Select Size <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => {
          const isSelected = selectedSize === size;
          const displaySize = getSizeAbbreviation(size);
          
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelect(size)}
              aria-pressed={isSelected}
              className={`px-4 py-2 rounded-md border font-medium text-sm transition-all duration-200 ${
                isSelected
                  ? 'bg-black text-white border-black shadow-md'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400 cursor-pointer'
              }`}
            >
              {displaySize}
            </button>
          );
        })}
      </div>
    </div>
  );
}

