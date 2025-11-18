import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const LoadingBar = () => {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (navigation.state === 'loading') {
      setIsVisible(true);
      setProgress(10);
      
      // Simulate progress
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(timer);
    } else {
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 300);
    }
  }, [navigation.state]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent">
      <div
        className={cn(
          "h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-300 ease-out",
          progress === 100 && "opacity-0"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
