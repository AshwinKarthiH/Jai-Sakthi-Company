import { useEffect, useState } from 'react';

export function Countdown({ eta, status }: { eta?: number; status: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (!eta || status !== 'in_progress') return;
    
    const interval = setInterval(() => {
      const remaining = eta - Date.now();
      if (remaining <= 0) {
        setTimeLeft('00:00');
        setIsLate(true);
        clearInterval(interval);
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        setIsLate(false);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [eta, status]);

  if (!eta) return <span className="text-text-muted">—</span>;
  if (status === 'completed' || status === 'ready_for_dispatch' || status === 'loaded' || status === 'delivered') return <span className="text-[#059669] font-medium text-xs">Done</span>;
  if (status === 'on_hold') return <span className="text-xs text-[#EA580C] font-medium animate-pulse">Paused</span>;
  if (status !== 'in_progress') return <span className="text-text-muted">—</span>;

  return (
    <span className={`font-mono font-bold text-sm ${isLate ? 'text-red-500 animate-pulse' : 'text-[#1E3A5F]'}`}>
      {timeLeft || '00:00'}
    </span>
  );
}
