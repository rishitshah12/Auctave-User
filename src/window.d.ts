// Extend the Window interface to include custom methods
interface Window {
  showToast?: (message: string, type?: 'success' | 'error') => void;
}
