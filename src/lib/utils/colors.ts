export const COLORS = {
  bg:           "#111111",
  surface:      "#1a1a1a",
  elevated:     "#222222",
  border:       "#2e2e2e",
  text:         "#e2e2e2",
  muted:        "#707070",
  dim:          "#444444",

  tan:          "#c9a96e",
  tanDim:       "#8a6e3e",
  purple:       "#9b72cf",
  purpleDim:    "#5c3f8a",
  red:          "#cf6679",
  green:        "#5faa7a",
  blue:         "#5b8dee",
  cyan:         "#4aadad",

  // Ghost overlay palette (desaturated)
  ghost1:       "rgba(201, 169, 110, 0.25)",
  ghost2:       "rgba(155, 114, 207, 0.25)",
  ghost3:       "rgba(95, 170, 122, 0.25)",
} as const;

// Sequential scale for heatmaps (dark purple → bright tan)
export const HEATMAP_SCALE = [
  "#111111", "#1f1530", "#2d1c4f", "#4a2878",
  "#6b3a9b", "#8a56b8", "#a878d0", "#c9a96e",
] as const;

// Diverging scale for transition matrices
export const MATRIX_SCALE = [
  "#1a1a2e", "#2d2d5a", "#4a4a8a", "#7070aa",
  "#9090bb", "#c9a96e", "#e8c080", "#fff0c0",
] as const;

export const GHOST_COLORS = [COLORS.ghost1, COLORS.ghost2, COLORS.ghost3];
export const GHOST_STROKE_COLORS = [COLORS.tan, COLORS.purple, COLORS.green];
