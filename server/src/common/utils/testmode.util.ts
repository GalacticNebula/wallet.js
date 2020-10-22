
export function is_testMode(): boolean {
  return process.env.NODE_ENV === 'development';
}
