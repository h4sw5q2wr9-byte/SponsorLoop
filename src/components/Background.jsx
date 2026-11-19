/** Zachte, zwevende kleurvlekken achter de tracker */
export default function Background() {
  const blob = 'absolute rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-float';
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none opacity-40 dark:opacity-5 transition-opacity duration-500">
      <div className={`${blob} top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-200 dark:bg-blue-900`} />
      <div className={`${blob} top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-200 dark:bg-indigo-900`} style={{ animationDelay: '1s' }} />
      <div className={`${blob} bottom-[-10%] left-[20%] w-[60vw] h-[60vw] bg-purple-200 dark:bg-purple-900`} style={{ animationDelay: '2s' }} />
    </div>
  );
}
