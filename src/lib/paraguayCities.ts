/**
 * Ciudades de Paraguay agrupadas por departamento, para el selector del checkout.
 * El valor guardado (shipping_city) es el nombre de la ciudad. El departamento
 * se muestra como contexto en el combobox. La lista cubre las localidades más
 * relevantes para envío; el combobox además permite entrada libre para cualquier
 * localidad no listada (no bloquea la compra).
 */
export type CityGroup = { department: string; cities: string[] };

export const PARAGUAY_CITY_GROUPS: CityGroup[] = [
  {
    department: "Asunción",
    cities: ["Asunción"],
  },
  {
    department: "Central",
    cities: [
      "Areguá", "Capiatá", "Fernando de la Mora", "Guarambaré", "Itá", "Itauguá",
      "J. Augusto Saldívar", "Lambaré", "Limpio", "Luque", "Mariano Roque Alonso",
      "Nueva Italia", "Ñemby", "San Antonio", "San Lorenzo", "Villa Elisa",
      "Villeta", "Ypacaraí", "Ypané",
    ],
  },
  {
    department: "Alto Paraná",
    cities: [
      "Ciudad del Este", "Presidente Franco", "Hernandarias", "Minga Guazú",
      "Santa Rita", "Naranjal", "San Alberto", "Doctor Juan León Mallorquín",
      "Los Cedrales", "Itakyry", "Yguazú", "Ñacunday", "Domingo Martínez de Irala",
    ],
  },
  {
    department: "Itapúa",
    cities: [
      "Encarnación", "Cambyretá", "Capitán Miranda", "Hohenau", "Obligado",
      "Bella Vista", "Coronel Bogado", "Carmen del Paraná", "General Artigas",
      "Fram", "Jesús", "Trinidad", "María Auxiliadora", "Natalio", "San Juan del Paraná",
    ],
  },
  {
    department: "Caaguazú",
    cities: [
      "Coronel Oviedo", "Caaguazú", "Doctor Juan Eulogio Estigarribia (Campo 9)",
      "Repatriación", "San José de los Arroyos", "Carayaó", "Yhú", "Vaquería",
      "Cecilio Báez", "R. I. 3 Corrales",
    ],
  },
  {
    department: "San Pedro",
    cities: [
      "San Pedro de Ycuamandiyú", "San Estanislao (Santaní)", "Choré", "Guayaibí",
      "General Elizardo Aquino", "Tacuatí", "Villa del Rosario", "Antequera",
      "Nueva Germania", "Yataity del Norte",
    ],
  },
  {
    department: "Cordillera",
    cities: [
      "Caacupé", "Tobatí", "Piribebuy", "Eusebio Ayala", "Atyrá", "Altos",
      "Arroyos y Esteros", "Caraguatay", "Emboscada", "Isla Pucú",
      "Itacurubí de la Cordillera", "Juan de Mena", "Loma Grande", "Nueva Colombia",
      "Primero de Marzo", "San Bernardino", "Santa Elena", "Valenzuela",
    ],
  },
  {
    department: "Guairá",
    cities: [
      "Villarrica", "Independencia", "Borja", "Coronel Martínez", "Félix Pérez Cardozo",
      "Itapé", "Iturbe", "José Fassardi", "Mbocayaty", "Natalicio Talavera", "Ñumí",
      "Paso Yobái", "San Salvador", "Yataity",
    ],
  },
  {
    department: "Caazapá",
    cities: [
      "Caazapá", "San Juan Nepomuceno", "Yuty", "Abaí", "Buena Vista",
      "Doctor Moisés Bertoni", "Fulgencio Yegros", "General Higinio Morínigo",
      "Maciel", "Tavaí", "Tres de Mayo",
    ],
  },
  {
    department: "Misiones",
    cities: [
      "San Juan Bautista", "Ayolas", "Santa Rosa", "San Ignacio", "Santiago",
      "San Patricio", "San Miguel", "Villa Florida", "Yabebyry",
    ],
  },
  {
    department: "Paraguarí",
    cities: [
      "Paraguarí", "Carapeguá", "Ybycuí", "Quiindy", "Acahay", "Caapucú", "Escobar",
      "General Bernardino Caballero", "La Colmena", "Mbuyapey", "Pirayú", "Sapucai",
      "Yaguarón", "Ybytymí", "Roque González de Santa Cruz",
    ],
  },
  {
    department: "Ñeembucú",
    cities: [
      "Pilar", "Alberdi", "Cerrito", "General José Eduvigis Díaz", "Guazú Cuá",
      "Humaitá", "Isla Umbú", "Laureles", "Mayor José de Jesús Martínez",
      "Paso de Patria", "San Juan Bautista del Ñeembucú", "Tacuaras", "Villa Franca",
      "Villa Oliva", "Villalbín",
    ],
  },
  {
    department: "Amambay",
    cities: ["Pedro Juan Caballero", "Capitán Bado", "Bella Vista Norte", "Zanja Pytã", "Karapaí"],
  },
  {
    department: "Canindeyú",
    cities: [
      "Salto del Guairá", "Curuguaty", "Villa Ygatimí", "Katueté",
      "La Paloma del Espíritu Santo", "Nueva Esperanza", "Corpus Christi",
      "Yby Yaú", "Yasy Cañy", "Ybyrarobaná",
    ],
  },
  {
    department: "Concepción",
    cities: [
      "Concepción", "Horqueta", "Belén", "Loreto", "San Lázaro", "Yby Yaú",
      "Azotey", "San Carlos del Apa", "Paso Barreto",
    ],
  },
  {
    department: "Presidente Hayes",
    cities: [
      "Villa Hayes", "Benjamín Aceval", "Nanawa", "Puerto Pinasco", "Pozo Colorado",
      "General José María Bruguez",
    ],
  },
  {
    department: "Boquerón",
    cities: ["Filadelfia", "Loma Plata", "Mariscal Estigarribia", "Neuland"],
  },
  {
    department: "Alto Paraguay",
    cities: ["Fuerte Olimpo", "Puerto Casado", "Carmelo Peralta", "Bahía Negra"],
  },
];

/** Lista plana de nombres de ciudad (para validación / búsqueda rápida). */
export const PARAGUAY_CITIES: string[] = PARAGUAY_CITY_GROUPS.flatMap((g) => g.cities);
