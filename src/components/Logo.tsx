// Brand wordmark, served responsively. The Cloudflare image loader 403s on
// same-origin /public files, so we hand-roll the srcset (160 / 320 / 480w)
// instead of next/image — each device pulls only the size it needs. A single
// dark-ink asset is recoloured to white in dark mode via the filter classes
// passed in `className` (dark:brightness-0 dark:invert), so no separate dark
// file ships. `loading="eager"` keeps it out of lazy-loading (it's above the fold
// and the mobile LCP element).
export const LOGO_SRCSET = "/logo-160.png 160w, /logo.png 320w, /logo-480.png 480w";

export function Logo({ className, sizes }: { className: string; sizes: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional responsive srcset (see note above)
    <img
      src="/logo.png"
      srcSet={LOGO_SRCSET}
      sizes={sizes}
      width={320}
      height={106}
      alt="CNP Gallery"
      loading="eager"
      decoding="async"
      className={className}
    />
  );
}
