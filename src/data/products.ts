import type { Category, Product } from "@/types";

export const img = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const HERO_IMAGE = img("photo-1749132387922-b60477db1ce1", 2000);
export const BANNER_IMAGE = img("photo-1593935890446-2f13f143f363", 1600);

export const CATEGORIES: { slug: Category; label: string; image: string }[] = [
  { slug: "camisetas", label: "Camisetas", image: img("photo-1526086754506-a57f69b4700a", 600) },
  { slug: "shorts", label: "Shorts", image: img("photo-1688760117976-e3a339becff1", 600) },
  { slug: "zapatillas", label: "Zapatillas", image: img("photo-1631984564919-1f6b2313a71c", 600) },
  { slug: "buzos", label: "Buzos", image: img("photo-1652823780977-b22c0ed84c97", 600) },
  { slug: "camperas", label: "Camperas", image: img("photo-1643622782660-30dedcd8d75a", 600) },
  { slug: "accesorios", label: "Accesorios", image: img("photo-1627627256672-027a4613d028", 600) },
];

const ROPA = ["S", "M", "L", "XL", "XXL"];
const CALZADO = ["39", "40", "41", "42", "43", "44", "45"];

const NEGRO = { name: "Negro", hex: "#111111" };
const BLANCO = { name: "Blanco", hex: "#f2f2f2" };
const GRIS = { name: "Gris", hex: "#6b7280" };
const NARANJA = { name: "Naranja", hex: "#ff6a13" };
const MORADO = { name: "Morado", hex: "#8b3dff" };
const ROJO = { name: "Rojo", hex: "#d62828" };
const OLIVA = { name: "Verde oliva", hex: "#5b6b3a" };

export const PRODUCTS: Product[] = [
  {
    id: "r01",
    slug: "jersey-rebound-07",
    name: "Jersey Rebound 07",
    description:
      "Jersey de juego en mesh respirable con números sublimados. Sisa amplia para moverte sin límites y terminaciones en ribb.",
    category: "camisetas",
    price: 42999,
    images: [img("photo-1526086754506-a57f69b4700a")],
    sizes: ROPA,
    colors: [MORADO, NEGRO],
    highlights: [
      "Mesh que respira y no se pega al cuerpo",
      "Números sublimados: no se cuartean ni se despegan",
      "Sisa amplia para tirar sin que te tire",
    ],
    isNew: true,
  },
  {
    id: "r02",
    slug: "camiseta-practice-reversible",
    name: "Camiseta Practice Reversible",
    description:
      "Camiseta reversible de entrenamiento: un lado claro, otro oscuro. Tela liviana de secado rápido, ideal para la práctica.",
    category: "camisetas",
    price: 29999,
    compareAtPrice: 36999,
    images: [img("photo-1749743823062-df9d9de55e94")],
    sizes: ROPA,
    colors: [BLANCO, NEGRO],
    highlights: [
      "Dos camisetas en una: clara y oscura",
      "Seca rápido, ideal para entrenar",
      "No se deforma con los lavados",
    ],
  },
  {
    id: "r03",
    slug: "jersey-street-league",
    name: "Jersey Street League",
    description:
      "Jersey de corte clásico para la liga del barrio. Mesh doble capa en hombros y laterales con paneles ventilados.",
    category: "camisetas",
    price: 38999,
    images: [img("photo-1561781019-31d9dd448a61")],
    sizes: ROPA,
    colors: [NARANJA, NEGRO],
    highlights: [
      "Paneles ventilados en laterales",
      "Doble capa en hombros: más resistente",
      "Corte clásico que queda bien en la calle",
    ],
  },
  {
    id: "r04",
    slug: "musculosa-training-dry",
    name: "Musculosa Training Dry",
    description:
      "Musculosa de entrenamiento con tecnología de secado rápido. Calce atlético y costuras planas anti-roce.",
    category: "camisetas",
    price: 21999,
    images: [img("photo-1666121363164-17a59d227812")],
    sizes: ROPA,
    colors: [OLIVA, NEGRO],
    highlights: [
      "Secado rápido, no se empapa",
      "Costuras planas: cero roce",
      "Calce atlético, no ajustado",
    ],
  },
  {
    id: "r05",
    slug: "remera-oversize-court",
    name: "Remera Oversize Court",
    description:
      "Remera oversize de algodón pesado 24/1 para el post-partido. Cuello reforzado, caída amplia y hombros caídos.",
    category: "camisetas",
    price: 24999,
    images: [img("photo-1726140872004-850c80900ae3")],
    sizes: ROPA,
    colors: [NEGRO, BLANCO],
    highlights: [
      "Algodón pesado que no transparenta",
      "No se achica ni se deforma al lavar",
      "Caída oversize, estilo post-partido",
    ],
    isNew: true,
  },
  {
    id: "r06",
    slug: "short-mesh-pro",
    name: "Short Mesh Pro",
    description:
      "Short de mesh largo hasta la rodilla, cintura elástica con cordón y bolsillos laterales. El clásico de la cancha.",
    category: "shorts",
    price: 27999,
    images: [img("photo-1688760117976-e3a339becff1")],
    sizes: ROPA,
    colors: [NARANJA, NEGRO, MORADO],
    highlights: [
      "Largo hasta la rodilla, como los de la cancha",
      "Cintura elástica con cordón: no se baja",
      "Bolsillos laterales profundos",
    ],
    isNew: true,
  },
  {
    id: "r07",
    slug: "short-swingman",
    name: "Short Swingman",
    description:
      "Short de juego con paneles laterales contrastantes y tela de punto liviana. Libertad total de movimiento.",
    category: "shorts",
    price: 25999,
    compareAtPrice: 31999,
    images: [img("photo-1742473531981-12c925e98c19")],
    sizes: ROPA,
    colors: [NEGRO, BLANCO],
    highlights: [
      "Tela liviana: libertad total de movimiento",
      "Paneles laterales contrastantes",
      "Cintura elástica cómoda todo el día",
    ],
  },
  {
    id: "r08",
    slug: "short-night-run",
    name: "Short Night Run",
    description:
      "Short liviano para jugar de noche o salir a correr. Calza interna y bolsillo trasero con cierre.",
    category: "shorts",
    price: 23999,
    images: [img("photo-1763740355836-a26addadfbbd")],
    sizes: ROPA,
    colors: [ROJO, NEGRO],
    highlights: [
      "Calza interna para jugar tranquilo",
      "Bolsillo trasero con cierre para las llaves",
      "Ultraliviano para jugar o correr",
    ],
  },
  {
    id: "r09",
    slug: "zapatillas-court-flight-mid",
    name: "Zapatillas Court Flight Mid",
    description:
      "Caña media con soporte de tobillo, amortiguación reactiva y suela de goma con patrón espiga para máximo agarre.",
    category: "zapatillas",
    price: 149999,
    images: [img("photo-1631984564919-1f6b2313a71c")],
    sizes: CALZADO,
    colors: [NEGRO, NARANJA],
    highlights: [
      "Caña media que sostiene el tobillo",
      "Suela espiga: agarre en cemento y parquet",
      "Amortiguación reactiva en cada salto",
    ],
    isNew: true,
  },
  {
    id: "r10",
    slug: "zapatillas-fastbreak-low",
    name: "Zapatillas Fastbreak Low",
    description:
      "Caña baja liviana para jugadores rápidos. Capellada de cuero sintético y entresuela de espuma para la calle y la cancha.",
    category: "zapatillas",
    price: 119999,
    compareAtPrice: 139999,
    images: [img("photo-1603808033192-082d6919d3e1"), img("photo-1603808033176-9d134e6f2c74")],
    sizes: CALZADO,
    colors: [BLANCO],
    highlights: [
      "Livianas para jugadores rápidos",
      "Capellada fácil de limpiar",
      "De la cancha a la calle sin cambiarte",
    ],
  },
  {
    id: "r11",
    slug: "zapatillas-blaze-runner",
    name: "Zapatillas Blaze Runner",
    description:
      "Running lifestyle con detalles en naranja, unidad de aire visible en el talón y malla transpirable.",
    category: "zapatillas",
    price: 129999,
    images: [img("photo-1600185365483-26d7a4cc7519"), img("photo-1600185365926-3a2ce3cdb9eb")],
    sizes: CALZADO,
    colors: [BLANCO, NARANJA],
    highlights: [
      "Aire visible en el talón",
      "Malla transpirable",
      "Cómodas para usar todo el día",
    ],
  },
  {
    id: "r12",
    slug: "zapatillas-canvas-hi-top",
    name: "Zapatillas Canvas Hi-Top",
    description:
      "La bota de lona de siempre: caña alta, puntera de goma y suela vulcanizada. Un clásico del streetball.",
    category: "zapatillas",
    price: 69999,
    images: [img("photo-1679736468688-a394f6a1646f")],
    sizes: CALZADO,
    colors: [NEGRO],
    highlights: [
      "Clásico del streetball que no pasa de moda",
      "Puntera de goma resistente",
      "Suela vulcanizada durable",
    ],
  },
  {
    id: "r13",
    slug: "hoodie-rebound-heavy",
    name: "Hoodie Rebound Heavy",
    description:
      "Buzo con capucha de frisa pesada 400 g, bolsillo canguro y puños acanalados. Para el calentamiento y la calle.",
    category: "buzos",
    price: 54999,
    images: [img("photo-1652823780977-b22c0ed84c97")],
    sizes: ROPA,
    colors: [NEGRO, GRIS],
    highlights: [
      "Frisa pesada 400 g: abriga de verdad",
      "No hace bolitas con los lavados",
      "Puños y cintura que no se estiran",
    ],
    isNew: true,
  },
  {
    id: "r14",
    slug: "hoodie-essential",
    name: "Hoodie Essential",
    description:
      "Buzo con capucha de frisa invisible, calce regular. El básico que combina con cualquier short o jogger.",
    category: "buzos",
    price: 44999,
    compareAtPrice: 54999,
    images: [img("photo-1677538537484-324385aff147")],
    sizes: ROPA,
    colors: [GRIS, NEGRO],
    highlights: [
      "El básico que combina con todo",
      "Frisa suave por dentro",
      "Calce regular, ni chico ni gigante",
    ],
  },
  {
    id: "r15",
    slug: "campera-warm-up",
    name: "Campera Warm-Up",
    description:
      "Campera de entrada en calor con franjas laterales, cierre completo y cuello alto. Estilo retro de banco de suplentes.",
    category: "camperas",
    price: 74999,
    compareAtPrice: 89999,
    images: [img("photo-1643622782660-30dedcd8d75a")],
    sizes: ROPA,
    colors: [ROJO, NEGRO],
    highlights: [
      "Estilo retro de banco de suplentes",
      "Cuello alto que corta el viento",
      "Cierre completo y bolsillos laterales",
    ],
  },
  {
    id: "r16",
    slug: "campera-shooting-windbreaker",
    name: "Campera Shooting Windbreaker",
    description:
      "Rompevientos liviano con paneles en bloque, capucha guardable y bolsillos con cierre. Repele el agua.",
    category: "camperas",
    price: 69999,
    images: [img("photo-1611308725032-74f0a551d018")],
    sizes: ROPA,
    colors: [NEGRO, BLANCO],
    highlights: [
      "Repele el agua",
      "Capucha guardable en el cuello",
      "Pesa casi nada: entra en la mochila",
    ],
  },
  {
    id: "r17",
    slug: "pelota-street-outdoor",
    name: "Pelota Street Outdoor",
    description:
      "Pelota de goma de alto agarre para canchas de cemento. Canales profundos y bote parejo. Tamaño oficial.",
    category: "accesorios",
    price: 34999,
    images: [img("photo-1627627256672-027a4613d028")],
    sizes: ["Nº 7", "Nº 6"],
    colors: [NARANJA],
    highlights: [
      "Goma de alto agarre para cemento",
      "Bote parejo y canales profundos",
      "Tamaño oficial",
    ],
  },
  {
    id: "r18",
    slug: "medias-elite-crew",
    name: "Medias Elite Crew x3",
    description:
      "Pack de 3 pares de medias caña media con planta acolchada y zona de compresión en el arco.",
    category: "accesorios",
    price: 12999,
    images: [img("photo-1589895869111-cab6bf8354c8")],
    sizes: ["39-42", "43-46"],
    colors: [BLANCO, NEGRO],
    highlights: [
      "Planta acolchada contra ampollas",
      "Compresión en el arco",
      "Pack de 3 pares",
    ],
  },
  {
    id: "r19",
    slug: "bolso-gym-duffle",
    name: "Bolso Gym Duffle",
    description:
      "Bolso deportivo con compartimento para zapatillas, correa regulable y tela resistente al agua.",
    category: "accesorios",
    price: 39999,
    compareAtPrice: 47999,
    images: [img("photo-1708622833152-924c6e364138")],
    sizes: ["Único"],
    colors: [NEGRO],
    highlights: [
      "Compartimento separado para zapatillas",
      "Tela resistente al agua",
      "Correa regulable y acolchada",
    ],
  },
];
