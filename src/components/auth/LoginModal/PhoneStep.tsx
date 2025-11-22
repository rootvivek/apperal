'use client';

interface PhoneStepProps {
  phone: string;
  onPhoneChange: (value: string) => void;
  onSendOtp: () => void;
  isSending: boolean;
  error?: string;
}

export default function PhoneStep({
  phone,
  onPhoneChange,
  onSendOtp,
  isSending,
  error,
}: PhoneStepProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onPhoneChange(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only allow numbers
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
      e.preventDefault();
    }
    
    // Submit on Enter if phone is valid
    if (e.key === 'Enter' && phone.length === 10) {
      e.preventDefault();
      onSendOtp();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <div className="mt-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-700 sm:text-sm font-medium">+91 -</span>
            </div>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="tel"
              required
              value={phone}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className="appearance-none block w-full pl-14 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
              placeholder="Enter 10-digit mobile number"
              maxLength={10}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {phone && phone.length >= 10
              ? 'Press Enter or click Send OTP' 
              : 'Enter your 10-digit mobile number'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSendOtp}
        disabled={isSending || phone.length !== 10}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isSending ? 'Sending OTP...' : 'Send OTP'}
      </button>
    </div>
  );
}

