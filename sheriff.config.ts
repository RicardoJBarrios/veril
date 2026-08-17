import { SheriffConfig } from '@softarc/sheriff-core';

const contexts = [
  'aquarium-management',
  'care',
  'measurements',
  'observations',
  'timeline',
  'livestock',
  'equipment',
  'maintenance',
  'species-knowledge',
] as const;

const layers = ['domain', 'application', 'infrastructure', 'ui'] as const;

const modules: Record<string, string[]> = {};

for (const context of contexts) {
  for (const layer of layers) {
    modules[`apps/veril/src/app/${context}/${layer}`] = [
      `context:${context}`,
      `layer:${layer}`,
    ];
  }
}

for (const layer of layers) {
  modules[`apps/veril/src/app/shared/${layer}`] = [
    'context:shared',
    `layer:${layer}`,
  ];
}

modules['apps/veril/src/app/shells/<shell>'] = [
  'context:shells',
  'layer:composition',
];
modules['apps/veril/src/app/composition/integration-tests'] = [
  'context:composition',
  'layer:integration',
];
modules['apps/veril/src/app/composition/editorial'] = [
  'context:composition',
  'layer:composition',
];
modules['apps/veril/src/app/composition/<feature>'] = [
  'context:composition',
  'layer:ui',
];

export const config: SheriffConfig = {
  entryPoints: {
    veril: './apps/veril/src/main.ts',
  },
  enableBarrelLess: true,
  modules,
  depRules: {
    root: [
      'layer:ui',
      'layer:composition',
      'context:shared',
      'context:composition',
      'context:shells',
    ],
    'context:aquarium-management': [
      'context:aquarium-management',
      'context:shared',
    ],
    'context:care': ['context:care', 'context:shared'],
    'context:measurements': ['context:measurements', 'context:shared'],
    'context:observations': ['context:observations', 'context:shared'],
    'context:timeline': ['context:timeline', 'context:shared'],
    'context:livestock': ['context:livestock', 'context:shared'],
    'context:equipment': ['context:equipment', 'context:shared'],
    'context:maintenance': ['context:maintenance', 'context:shared'],
    'context:species-knowledge': [
      'context:species-knowledge',
      'context:shared',
    ],
    'context:shared': ['context:shared'],
    'context:composition': [
      'context:composition',
      'context:aquarium-management',
      'context:care',
      'context:measurements',
      'context:observations',
      'context:timeline',
      'context:livestock',
      'context:equipment',
      'context:maintenance',
      'context:species-knowledge',
      'context:shared',
    ],
    'context:shells': [
      'context:shells',
      'context:aquarium-management',
      'context:care',
      'context:measurements',
      'context:observations',
      'context:timeline',
      'context:livestock',
      'context:equipment',
      'context:maintenance',
      'context:species-knowledge',
      'context:shared',
      'context:composition',
    ],
    'layer:domain': ['layer:domain', 'context:shared'],
    'layer:application': [
      'layer:application',
      'layer:domain',
      'context:shared',
    ],
    'layer:infrastructure': [
      'layer:infrastructure',
      'layer:application',
      'layer:domain',
      'context:shared',
    ],
    'layer:composition': [
      'layer:composition',
      'layer:ui',
      'layer:application',
      'layer:domain',
      'layer:infrastructure',
      'context:shared',
    ],
    'layer:integration': [
      'layer:integration',
      'layer:infrastructure',
      'layer:application',
      'layer:domain',
      'context:shared',
    ],
    'layer:ui': [
      'layer:ui',
      'layer:application',
      'layer:domain',
      'context:shared',
    ],
  },
};
