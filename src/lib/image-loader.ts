interface LoaderArgs { src: string; width: number; quality?: number }

export default function cfLoader({ src, width, quality }: LoaderArgs): string {
  const q = quality ?? 75;
  return `/cdn-cgi/image/width=${width},quality=${q},format=auto/${src}`;
}
