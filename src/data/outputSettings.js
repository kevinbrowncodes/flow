/**
 * The mock backend's capabilities — Google Flow's output-settings matrix,
 * verbatim from RECON-04 §7. Strings stay Google's per D7 so the pixel
 * conformance suite keeps measuring the real thing.
 *
 * Real backends describe themselves the same way over HTTP
 * (`GET /flow/capabilities`, see protocol/PROTOCOL.md). This file is the
 * worked example of that document.
 */
export const MOCK_CAPABILITIES = {
  protocol: 1,
  name: 'Google Flow',
  default_mode: 'image', // matches the observed chip: "Nano Banana 2 x2" while video clips existed
  modes: [
    {
      key: 'image',
      label: 'Image',
      icon: '🍌',
      fields: [
        { key: 'aspect', label: 'Aspect ratio', type: 'choice', role: 'aspect', options: ['16:9', '4:3', '1:1', '3:4', '9:16'], default: '16:9' },
        { key: 'model', label: 'Model', type: 'choice', role: 'model', options: ['Nano Banana Pro', 'Nano Banana 2', 'Nano Banana 2 Lite'], default: 'Nano Banana 2' },
        { key: 'count', label: 'Outputs', type: 'choice', role: 'count', options: [1, 2, 3, 4], default: 2 },
      ],
    },
    {
      key: 'video',
      label: 'Video',
      fields: [
        { key: 'subMode', label: null, type: 'choice', options: ['Frames', 'Ingredients'], default: 'Frames' },
        { key: 'aspect', label: 'Aspect ratio', type: 'choice', role: 'aspect', options: ['9:16', '16:9'], default: '16:9' },
        { key: 'model', label: 'Model', type: 'choice', role: 'model', options: ['Omni Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'], default: 'Omni Flash' },
        { key: 'duration', label: 'Duration', type: 'choice', role: 'duration', options: [4, 6, 8, 10], default: 8 },
        { key: 'count', label: 'Outputs', type: 'choice', role: 'count', options: [1, 2, 3, 4], default: 2 },
      ],
    },
  ],
  reference: 'optional',
  reference_kinds: ['image', 'video'],
  progress: 'percent',
  credits: true,
  strings: {
    footer: 'Google Flow can make mistakes, so double check it', // RECON-04 §10 verbatim
  },
  // Rendered inert for layout fidelity (D4/D6). Real backends leave these off.
  surfaces: { agent: true, characters: true, scenes: true, tools: true, trash: true },
}

/**
 * Credit cost. Observed anchors: image = 0 credits (ULTRA), video Omni Flash
 * 8s x2 = 24 credits. Per-second rates for Veo are MOCK (unobserved).
 */
const PER_SECOND = {
  'Omni Flash': 1.5,
  'Veo 3.1 - Lite': 1, // EST: unobserved
  'Veo 3.1 - Fast': 2.5, // EST: unobserved
  'Veo 3.1 - Quality': 5, // EST: unobserved
}

export function estimateCost(mode, values) {
  if (mode !== 'video') return 0
  return Math.round((PER_SECOND[values.model] ?? 1.5) * Number(values.duration ?? 8) * Number(values.count ?? 1))
}
