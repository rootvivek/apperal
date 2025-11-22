import { getColorHex } from '@/utils/productHelpers';

interface ColorSelectorProps {
  availableColors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
  showLabel?: boolean;
}

export default function ColorSelector({
  availableColors,
  selectedColor,
  onSelect,
  showLabel = true,
}: ColorSelectorProps) {
  if (availableColors.length === 0) return null;

  return (
    <div>
      {showLabel && (
        <label className="block text-[14px] font-medium text-gray-900 mb-3">
          {selectedColor ? `Colour: ${selectedColor}` : 'Select Colour'} <span className="text-red-500">*</span>
        </label>
      )}
      <div className="flex flex-wrap gap-3">
        {availableColors.map((color) => {
          const isSelected = selectedColor === color;
          const colorHex = getColorHex(color);
          return (
            <button
              key={color}
              type="button"
              onClick={() => onSelect(color)}
              aria-pressed={isSelected}
              className={`relative w-10 h-10 rounded-full transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-black ring-offset-1' 
                  : 'border border-gray-300 hover:border-gray-400'
              }`}
              style={{ 
                backgroundColor: colorHex,
                ...(isSelected && {
                  boxShadow: 'inset 0 0 0 2px white, 0 0 0 3px black'
                })
              }}
              aria-label={`Select ${color}`}
              title={color}
            />
          );
        })}
      </div>
    </div>
  );
}

