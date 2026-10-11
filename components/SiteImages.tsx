import Image from "next/image";

// Site imagery (all AI-generated, no people), in three roles:
//   - dark cinematic stills: heroes and feature bands (the main look)
//   - gold line art: beside list items such as the Six Disciplines
//   - bright architectural photos: darkened behind a few page headers only

/** Page header with a darkened background photo behind the copy. */
export function PhotoHero({ src, children, position = "center" }: { src: string; children: React.ReactNode; position?: string }) {
  return (
    <section className="page-hero photo-hero">
      <Image src={src} alt="" fill priority sizes="100vw" className="photo-hero-img" style={{ objectPosition: position }} />
      <div className="photo-hero-shade" aria-hidden="true" />
      <div className="wrap photo-hero-copy">{children}</div>
    </section>
  );
}

/** Wide cinematic image band between sections. */
export function FeatureImage({ src, alt = "", caption }: { src: string; alt?: string; caption?: string }) {
  return (
    <figure className="feature-img">
      <Image src={src} alt={alt} width={1280} height={720} sizes="(max-width: 1180px) 100vw, 1180px" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
