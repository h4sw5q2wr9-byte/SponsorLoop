const BASE = 'font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
const VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20',
  secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700',
  danger: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40',
  ghost: 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
};
const SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg', xl: 'px-8 py-4 text-xl' };

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button type="button" className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
