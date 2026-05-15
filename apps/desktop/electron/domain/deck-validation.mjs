import { DEFAULT_TEMPLATE, LAYOUT_IDS, SLIDE_TYPES, TEMPLATE_IDS } from "./deck-constants.mjs";

export function validateDeckCandidate(deck) {
  const errors = [];
  if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
    return ["Deck must be a JSON object."];
  }

  const meta = deck.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return ["meta is required."];
  }
  for (const field of ["title", "language", "theme"]) {
    if (typeof meta[field] !== "string" || !meta[field].trim()) {
      errors.push(`meta.${field} is required.`);
    }
  }
  if (!TEMPLATE_IDS.has(meta.template ?? DEFAULT_TEMPLATE)) {
    errors.push("meta.template must be teaching or clean.");
  }

  const assetIds = new Set(
    Array.isArray(deck.assets)
      ? deck.assets
          .map((asset) => (asset && typeof asset.id === "string" ? asset.id : null))
          .filter(Boolean)
      : [],
  );

  if (!Array.isArray(deck.slides)) {
    errors.push("slides must be an array.");
    return errors;
  }
  if (deck.slides.length === 0) {
    errors.push("slides must include at least one slide.");
  }
  deck.slides.forEach((slide, index) => {
    const label = `slides[${index}]`;
    if (!slide || typeof slide !== "object" || Array.isArray(slide)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    for (const field of ["id", "title"]) {
      if (typeof slide[field] !== "string" || !slide[field].trim()) {
        errors.push(`${label}.${field} is required.`);
      }
    }
    const hasLayout = typeof slide.layout === "string";
    const hasLegacyType = typeof slide.type === "string";
    if (!hasLayout && !hasLegacyType) {
      errors.push(`${label}.layout is required.`);
    }
    if (hasLayout && !LAYOUT_IDS.has(slide.layout)) {
      errors.push(`${label}.layout is not supported.`);
    }
    if (hasLegacyType && !SLIDE_TYPES.has(slide.type)) {
      errors.push(`${label}.type is not supported.`);
    }
    if (
      hasLayout &&
      (!slide.props || typeof slide.props !== "object" || Array.isArray(slide.props))
    ) {
      errors.push(`${label}.props must be an object.`);
    }
    if (
      hasLegacyType &&
      (!slide.content || typeof slide.content !== "object" || Array.isArray(slide.content))
    ) {
      errors.push(`${label}.content must be an object.`);
    }
    if (slide.visual && typeof slide.visual === "object" && !Array.isArray(slide.visual)) {
      const assetId = slide.visual.assetId;
      if (typeof assetId !== "string" || !assetId.trim()) {
        errors.push(`${label}.visual.assetId is required.`);
      } else if (!assetIds.has(assetId)) {
        errors.push(`${label}.visual.assetId does not match a deck asset.`);
      }
    }
  });

  return errors;
}
