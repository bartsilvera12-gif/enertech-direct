import { Check, MessageCircle } from "lucide-react";

const UPS_IMAGE_URL =
  "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=960&q=80";

const WA_SERVICE_URL = `https://wa.me/595971472716?text=${encodeURIComponent(
  "Hola, solicito servicio técnico para UPS.",
)}`;

const ITEMS = [
  "Diagnóstico técnico",
  "Cambio de baterías",
  "Mantenimiento preventivo",
  "Reparación de fallas",
  "Soporte para equipos UPS",
];

export function UpsTechnicalServiceSection() {
  return (
    <section className="border-b border-border/50 bg-muted/25 py-14 md:py-20">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-16 lg:items-center">
          <div className="space-y-5 lg:space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Servicios</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Servicio técnico especializado en UPS
            </h2>
            <p className="text-muted-foreground leading-relaxed md:text-lg max-w-xl">
              Mantenimiento, diagnóstico y reparación profesional para sistemas de respaldo energético. Ayudamos a mantener
              tus equipos operativos con atención técnica especializada.
            </p>
            <ul className="space-y-3 pt-1">
              {ITEMS.map((label) => (
                <li key={label} className="flex items-start gap-3 text-foreground/95">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check className="size-3.5" aria-hidden strokeWidth={2.5} />
                  </span>
                  <span className="leading-snug">{label}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <a
                href={WA_SERVICE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(37,211,102,0.55)] transition-colors hover:bg-[#20bd5a]"
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden />
                Solicitar servicio
              </a>
            </div>
          </div>

          <div className="relative lg:justify-self-end w-full max-w-xl mx-auto lg:max-w-none">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_48px_-28px_rgba(0,0,0,0.22)] lg:rounded-3xl">
              <img
                src={UPS_IMAGE_URL}
                alt="Técnico especializado en sistemas eléctricos y respaldo energético"
                className="aspect-[4/3] w-full object-cover md:aspect-[16/11]"
                width={960}
                height={660}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
