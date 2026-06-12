import type { DifficultyLevel, DifficultyProfile, GeneratedRavenTask } from '../types';

export function estimateDifficulty(
  task: Omit<GeneratedRavenTask, 'difficulty'>,
  intendedLevel: DifficultyLevel,
  variant: string,
  colorPolicy: 'uniform' | 'rule',
  missingCellPolicy: 'bottom_right' | 'random_safe'
): DifficultyProfile {
  const visibleElements = task.cells.reduce((sum, cell, index) => (index === task.missingIndex ? sum : sum + cell.elements.length), 0);
  const nearMissCount = task.distractorFamilies.filter((f) =>
    ['wrong_operation', 'wrong_step', 'wrong_position', 'missing_component', 'extra_component', 'wrong_layer', 'wrong_axis', 'wrong_texture', 'wrong_region'].includes(f)
  ).length;
  const hasWrongAxis = task.distractorFamilies.includes('wrong_axis');
  const hasWrongLayer = task.distractorFamilies.includes('wrong_layer');
  const hasSetLogic = task.rules.some((r) => r.attributeType === 'set');
  const hasGridBitmask = task.componentModel === 'grid_bitmask';
  const hasNestedObjects = task.componentModel === 'nested_object';
  const visualDensity = visibleElements > 42 ? 3 : visibleElements > 24 ? 2 : 1;
  const compositionDepth = Math.max(1, task.rules.length);
  const ruleComplexity = Math.min(6, task.rules.length + (hasSetLogic ? 2 : 0) + (colorPolicy === 'rule' ? 1 : 0));
  const objectComplexity =
    task.componentModel === 'regional_overlay' || task.componentModel === 'regional_texture'
      ? 3
      : task.componentModel === 'grid_bitmask' || task.componentModel === 'radial_components'
        ? 2
        : 1;
  const attributeComplexity = task.rules.some((r) => ['set', 'regional', 'relation'].includes(r.attributeType)) ? 3 : task.rules.length > 1 ? 2 : 1;
  const topologyComplexity = task.sceneTopology === 'grid_3x3' ? 3 : task.sceneTopology === 'grid_2x2' ? 2 : 1;
  const distractorCloseness = nearMissCount >= 4 ? 3 : nearMissCount >= 2 ? 2 : 1;
  const axisAmbiguity = hasWrongAxis || missingCellPolicy === 'random_safe' ? 2 : 1;
  const layerAmbiguity = hasWrongLayer || hasNestedObjects || task.componentModel === 'regional_overlay' ? 2 : 1;
  const workingMemoryLoad = Math.min(3, Math.ceil((compositionDepth + visibleElements / 16) / 2));
  const perceptualLoad = task.componentModel === 'regional_texture' || task.componentModel === 'regional_overlay' ? 3 : visualDensity;

  const score = Math.max(
    1,
    Math.round(
      intendedLevel * 4 +
        (compositionDepth - 1) +
        (visualDensity - 1) +
        (distractorCloseness - 1) +
        (colorPolicy === 'rule' ? 1 : 0) +
        (missingCellPolicy === 'random_safe' ? 1 : 0)
    )
  );

  return {
    intendedLevel,
    estimatedLevel: intendedLevel,
    estimatedScore: score,
    variant,
    colorPolicy,
    missingCellPolicy,
    factors: {
      ruleComplexity,
      compositionDepth,
      objectComplexity,
      attributeComplexity,
      topologyComplexity,
      visualDensity,
      distractorCloseness,
      axisAmbiguity,
      layerAmbiguity,
      workingMemoryLoad,
      perceptualLoad
    },
    flags: {
      hasMultipleRules: task.rules.length > 1,
      hasNestedObjects,
      hasGridBitmask,
      hasSetLogic,
      hasColorRule: colorPolicy === 'rule',
      hasNearMissDistractors: nearMissCount >= 2,
      hasWrongAxisDistractor: hasWrongAxis,
      hasWrongLayerDistractor: hasWrongLayer,
      hasHighVisualDensity: visualDensity >= 3
    }
  };
}
