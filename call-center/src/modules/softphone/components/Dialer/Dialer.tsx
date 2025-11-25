/**
 * Dialer Component
 *
 * Number input and dial pad for making calls
 */

import { useState } from 'react';
import { Phone, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DialerProps {
  onCall: (number: string) => void;
  disabled?: boolean;
}

const DIAL_PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

export function Dialer({ onCall, disabled = false }: DialerProps) {
  const [number, setNumber] = useState('');

  const handleDigitClick = (digit: string) => {
    setNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (number.trim()) {
      onCall(number.trim());
      setNumber(''); // Clear after calling
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && number.trim()) {
      handleCall();
    }
  };

  return (
    <div className="space-y-4">
      {/* Number Input */}
      <div className="relative">
        <Input
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Entrez un numéro"
          className="text-xl text-center pr-10"
          disabled={disabled}
        />
        {number && (
          <button
            onClick={handleBackspace}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <Delete className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dial Pad */}
      <div className="grid grid-cols-3 gap-2">
        {DIAL_PAD.map((row, rowIndex) =>
          row.map((digit) => (
            <Button
              key={`${rowIndex}-${digit}`}
              variant="outline"
              size="lg"
              onClick={() => handleDigitClick(digit)}
              disabled={disabled}
              className="text-xl font-semibold h-14"
            >
              {digit}
            </Button>
          ))
        )}
      </div>

      {/* Call Button */}
      <Button
        onClick={handleCall}
        disabled={disabled || !number.trim()}
        className="w-full"
        size="lg"
      >
        <Phone className="h-5 w-5 mr-2" />
        Appeler
      </Button>
    </div>
  );
}
