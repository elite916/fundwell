import { LoadingSpinner } from './loading-spinner';

export function PageLoader() {
  return (
    <div className='fixed inset-0 flex animate-in items-center justify-center bg-zinc-900/80 duration-300 fade-in'>
      <LoadingSpinner size='lg' text='Loading...' />
    </div>
  );
}
