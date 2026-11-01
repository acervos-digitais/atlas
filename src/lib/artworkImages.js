export function normalizeArtworkImage(value) {
  return typeof value === 'string'
    ? value.trim().replace(/^http:\/\/commons\.wikimedia\.org\//, 'https://commons.wikimedia.org/')
    : '';
}

export function validateImageCatalog(catalog) {
  if (!catalog || catalog.version !== 1 || !catalog.artworks || typeof catalog.artworks !== 'object' || Array.isArray(catalog.artworks)) {
    throw new Error('Catálogo de imagens alternativas inválido');
  }
  for (const [id, entry] of Object.entries(catalog.artworks)) {
    if (!entry || typeof entry.originalImage !== 'string' || !Array.isArray(entry.images)) {
      throw new Error(`Registro de imagens alternativas inválido: ${id}`);
    }
    for (const image of entry.images) {
      if (typeof image !== 'string' || !/^https?:\/\/\S+$/.test(image)) {
        throw new Error(`URL de imagem alternativa inválida: ${id}`);
      }
      try {
        const url = new URL(image);
        if (url.username || url.password) throw new Error('credentials');
      } catch {
        throw new Error(`URL de imagem alternativa inválida: ${id}`);
      }
    }
  }
}

export function artworkImageSources(id, image, catalog) {
  const original = normalizeArtworkImage(image);
  const entry = catalog?.artworks[id];
  if (entry && entry.originalImage === original) {
    return [...new Set(entry.images.map(normalizeArtworkImage).filter(source => source !== original))];
  }
  return original ? [original] : [];
}

export function imageSourceKey(art) {
  return JSON.stringify(art.imageSources ?? (art.image ? [art.image] : []));
}

export function availableArtworkImage(art, failure) {
  const sources = art.imageSources ?? (art.image ? [art.image] : []);
  const failed = failure?.key === imageSourceKey(art) ? failure.sources : new Set();
  return sources.find(source => !failed.has(source)) ?? '';
}

export function recordImageFailure(art, source, failure) {
  const key = imageSourceKey(art);
  return { key, sources: new Set(failure?.key === key ? failure.sources : []).add(source) };
}
