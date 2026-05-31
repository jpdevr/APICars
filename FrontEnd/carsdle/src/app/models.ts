export interface SearchCar {
  id: string;
  nome: string;
  marca?: string;
  foto?: string;
}

export function mapSearchCar(item: unknown): SearchCar | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const source = item as Record<string, unknown>;
  const id = pickString(source, ['id', '_id', 'carId']);
  const nome = pickString(source, ['nome', 'name', 'modelo']);

  if (!id || !nome) {
    return null;
  }

  const fotosValue = source['fotos'];
  let fotoFromArray: string | null = null;
  if (Array.isArray(fotosValue)) {
    const firstPhoto = fotosValue.find((item) => typeof item === 'string' && item.trim());
    if (typeof firstPhoto === 'string') {
      fotoFromArray = firstPhoto.trim();
    }
  }

  return {
    id,
    nome,
    marca: pickString(source, ['marca', 'brand']) ?? undefined,
    foto:
      fotoFromArray ??
      pickString(source, [
        'foto',
        'imageUrl',
        'imagem',
        'image',
        'img',
        'thumbnail',
        'thumb',
        'photo',
        'photoUrl',
        'urlFoto'
      ]) ?? undefined
  };
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function carDisplay(car: SearchCar): string {
  return car.marca ? `${car.marca} ${car.nome}` : car.nome;
}
