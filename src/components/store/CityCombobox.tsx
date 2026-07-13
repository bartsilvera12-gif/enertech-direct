import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PARAGUAY_CITIES, PARAGUAY_CITY_GROUPS } from "@/lib/paraguayCities";
import { cn } from "@/lib/utils";

/** Normaliza para búsqueda sin acentos ni mayúsculas. */
function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type Props = {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  id?: string;
};

/**
 * Selector de ciudad con buscador (Paraguay), agrupado por departamento.
 * Permite entrada libre para localidades no listadas (no bloquea la compra).
 * Se estiliza igual que los inputs del checkout.
 */
export function CityCombobox({ value, onChange, placeholder = "Elegí tu ciudad", id }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const select = (city: string) => {
    onChange(city);
    setQuery("");
    setOpen(false);
  };

  // Match exacto (sin acentos) para decidir si ofrecemos "usar libre".
  const hasExact = useMemo(() => {
    const q = normalize(query);
    return q.length > 0 && PARAGUAY_CITIES.some((c) => normalize(c) === q);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full flex items-center justify-between gap-2 bg-background hairline rounded-xl px-4 py-3 text-sm text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40",
            !value && "text-muted-foreground",
          )}
        >
          <span className="inline-flex items-center gap-2 truncate">
            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command
          filter={(itemValue, search) => (normalize(itemValue).includes(normalize(search)) ? 1 : 0)}
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar ciudad o departamento…"
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {query.trim() ? (
                <button
                  type="button"
                  onClick={() => select(query.trim())}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent"
                >
                  Usar «{query.trim()}»
                </button>
              ) : (
                "Sin resultados."
              )}
            </CommandEmpty>

            {query.trim() && !hasExact && (
              <CommandGroup heading="Otra localidad">
                <CommandItem value={`__free__ ${query}`} onSelect={() => select(query.trim())}>
                  <Check className="mr-2 size-4 opacity-0" />
                  Usar «{query.trim()}»
                </CommandItem>
              </CommandGroup>
            )}

            {PARAGUAY_CITY_GROUPS.map((group) => (
              <CommandGroup key={group.department} heading={group.department}>
                {group.cities.map((city) => (
                  <CommandItem
                    key={`${group.department}-${city}`}
                    value={`${city} ${group.department}`}
                    onSelect={() => select(city)}
                  >
                    <Check className={cn("mr-2 size-4", value === city ? "opacity-100" : "opacity-0")} />
                    {city}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
