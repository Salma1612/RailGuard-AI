// Inference policy. These mirror railguard/config.py (LOW_CONFIDENCE 0.60, MIN_TOP2_MARGIN 0.10).
export const LOW_CONFIDENCE_THRESHOLD = 0.6;
export const MIN_TOP2_MARGIN = 0.1;

// Client-side limits (there is no server upload limit because images never leave the device).
export const MAX_FILE_MB = 20;
export const MAX_PIXELS = 40_000_000; // ~40 megapixels; larger images can exhaust phone memory
export const MIN_SIDE_PX = 32;
