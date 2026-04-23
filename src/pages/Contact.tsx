import { useEffect } from "react";
import { Mail, MapPin, Phone } from "lucide-react";

const CONTACT_IMAGE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776954098/5831ce01-7004-46d3-84ed-230092d3e485.png";

/** Misma ubicación que el pie de página (Google Maps). */
const MAPS_LOCATION_URL = "https://maps.app.goo.gl/51UiUXYHW1KkYynF8";

const Contact = () => {
  useEffect(() => {
    document.title = "Contacto — Enertech";
  }, []);

  return (
    <div className="container py-16 md:py-24">
      <div className="grid max-w-6xl mx-auto lg:grid-cols-2 gap-10 lg:gap-14 xl:gap-16 items-center">
        <div className="order-2 lg:order-1 space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Contacto</p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6 text-balance">
              Hablemos de tu próximo equipamiento
            </h1>
            <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
              Atención comercial y soporte técnico para empresas. Respondemos por WhatsApp y correo en horario hábil.
            </p>
          </div>
          <ul className="space-y-8">
            <li className="flex gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Phone className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-base">Teléfono / WhatsApp</div>
                <a href="https://wa.me/595971472716" className="text-primary hover:underline text-base">
                  0971 472 716
                </a>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Mail className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-base">Email</div>
                <a href="mailto:hola@enertech.py" className="text-primary hover:underline text-base">
                  hola@enertech.py
                </a>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MapPin className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-base">Ubicación</div>
                <a
                  href={MAPS_LOCATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-base inline-flex items-center gap-1"
                >
                  CDE - Paraguay
                </a>
              </div>
            </li>
          </ul>
        </div>

        <div className="order-1 lg:order-2 w-full max-w-md mx-auto lg:max-w-none">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.18)]">
            <img
              src={CONTACT_IMAGE_URL}
              alt="Contacto y mensajería — Enertech"
              className="size-full object-cover object-center"
              width={800}
              height={800}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
