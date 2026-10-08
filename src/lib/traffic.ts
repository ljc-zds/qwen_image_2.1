export const trafficPaths = [
  '/',
  '/image-generator',
  '/image-editor',
  '/transparent-png',
  '/prompts',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
];
export function isTrafficPath(path: string) {
  const base = path === '/zh' ? '/' : path.replace(/^\/zh\//, '/');
  return trafficPaths.includes(base);
}
export interface TrafficReport {
  days: number;
  path: string;
  visitors: number;
  views: number;
  daily: { day: string; visitors: number; views: number }[];
  pages: { path: string; visitors: number; views: number }[];
}
