export type DifficultyLevel = 1 | 2 | 3;

export type TaskMode = 'symbolic_matrix';

export type TaskClass =
  | 'attribute_reasoning'
  | 'row_column_factorization'
  | 'quantity_reasoning'
  | 'spatial_movement'
  | 'grid_bitmask'
  | 'logical_set_reasoning'
  | 'structural_composition'
  | 'regional_texture_reasoning'
  | 'vector_primitive_reasoning';

export type SceneTopology =
  | 'center'
  | 'grid_2x2'
  | 'grid_3x3'
  | 'out_in_center'
  | 'regional_square'
  | 'radial_center';

export type ComponentModel =
  | 'single_object'
  | 'context_object'
  | 'position_object'
  | 'grid_bitmask'
  | 'nested_object'
  | 'radial_components'
  | 'regional_texture'
  | 'regional_overlay'
  | 'vector_primitives';

export type AttributeType =
  | 'nominal'
  | 'ordinal'
  | 'numeric'
  | 'cyclic'
  | 'spatial'
  | 'set'
  | 'relation'
  | 'regional';

export type RuleFamily =
  | 'constant'
  | 'progression'
  | 'distribution'
  | 'permutation'
  | 'addition'
  | 'subtraction'
  | 'and'
  | 'or'
  | 'xor'
  | 'set_difference'
  | 'movement'
  | 'rotation'
  | 'reflection'
  | 'nesting'
  | 'overlay'
  | 'region_overlay'
  | 'primitive_union';

export type DistractorFamily =
  | 'correct'
  | 'repetition'
  | 'wrong_attribute'
  | 'wrong_step'
  | 'wrong_operation'
  | 'missing_component'
  | 'extra_component'
  | 'wrong_position'
  | 'mirror_error'
  | 'rotation_error'
  | 'wrong_layer'
  | 'wrong_axis'
  | 'wrong_region'
  | 'wrong_texture';

export type ShapeKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star4'
  | 'star5'
  | 'plus'
  | 'cross';

export type MarkerKind = 'dot' | 'star4' | 'square' | 'triangle' | 'diamond';

export type ColorKind = 'navy' | 'blue' | 'teal' | 'orange' | 'purple' | 'red';

export type TextureKind =
  | 'empty'
  | 'solidBlack'
  | 'lightGray'
  | 'darkGray'
  | 'diagonalHatchA'
  | 'diagonalHatchB'
  | 'crossHatch'
  | 'verticalStripes'
  | 'horizontalStripes'
  | 'dotFill'
  | 'checker';

export type RegionKind =
  | 'full'
  | 'leftHalf'
  | 'rightHalf'
  | 'topHalf'
  | 'bottomHalf'
  | 'topLeftQuadrant'
  | 'topRightQuadrant'
  | 'bottomLeftQuadrant'
  | 'bottomRightQuadrant'
  | 'center';

export type CellElement =
  | {
      type: 'shape';
      id: string;
      shape: ShapeKind;
      cx: number;
      cy: number;
      size: number;
      rotation?: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      texture?: TextureKind;
      opacity?: number;
    }
  | {
      type: 'dot';
      id: string;
      x: number;
      y: number;
      r?: number;
      fill?: string;
    }
  | {
      type: 'line';
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke?: string;
      strokeWidth?: number;
      dash?: string;
    }
  | {
      type: 'petal';
      id: string;
      angle: number;
      variant?: 'petal' | 'bar' | 'triangle';
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      type: 'region';
      id: string;
      region: RegionKind;
      texture: TextureKind;
    };

export type CellSpec = {
  id: string;
  elements: CellElement[];
  frame?: boolean;
};

export type RuleSpec = {
  id: string;
  family: RuleFamily;
  target: string;
  attribute: string;
  attributeType: AttributeType;
  axis: 'row' | 'column' | 'both' | 'global' | 'position_group';
  skillTags: string[];
  params?: Record<string, unknown>;
};

export type MissingCellPolicy = 'bottom_right' | 'random_safe';
export type ColorPolicy = 'uniform' | 'rule';

export type DifficultyProfile = {
  intendedLevel?: DifficultyLevel;
  estimatedLevel: DifficultyLevel;
  estimatedScore: number;
  variant: string;
  colorPolicy: ColorPolicy;
  missingCellPolicy: MissingCellPolicy;
  factors: {
    ruleComplexity: number;
    compositionDepth: number;
    objectComplexity: number;
    attributeComplexity: number;
    topologyComplexity: number;
    visualDensity: number;
    distractorCloseness: number;
    axisAmbiguity: number;
    layerAmbiguity: number;
    workingMemoryLoad: number;
    perceptualLoad: number;
  };
  flags: {
    hasMultipleRules: boolean;
    hasNestedObjects: boolean;
    hasGridBitmask: boolean;
    hasSetLogic: boolean;
    hasColorRule: boolean;
    hasNearMissDistractors: boolean;
    hasWrongAxisDistractor: boolean;
    hasWrongLayerDistractor: boolean;
    hasHighVisualDensity: boolean;
  };
};

export type RavenAnswerOption = {
  id: string;
  cell: CellSpec;
  family: DistractorFamily;
};

export type GeneratedRavenTask = {
  id: string;
  seed: string;
  taskIndex: number;
  generatorVersion: string;

  taskMode: TaskMode;
  taskClass: TaskClass;
  matrixSize: '3x3';
  sceneTopology: SceneTopology;
  componentModel: ComponentModel;

  cells: CellSpec[];
  missingIndex: number;
  answerOptions: RavenAnswerOption[];
  correctIndex: number;

  rules: RuleSpec[];
  objectsUsed: string[];
  distractorFamilies: DistractorFamily[];
  difficulty: DifficultyProfile;

  analytics: {
    skillTags: string[];
    primarySkill: string;
    secondarySkills: string[];
  };

  explanation: string;
};

export type RavenGenerationOptions = {
  seed?: string;
  mode?: 'default' | 'diagnostic' | 'by_difficulty' | 'by_skill' | 'by_task_class' | 'custom';
  difficulty?: {
    min?: DifficultyLevel;
    max?: DifficultyLevel;
    exact?: DifficultyLevel;
  };
  allowedTaskClasses?: TaskClass[];
  allowedRules?: RuleFamily[];
  excludedTaskClasses?: TaskClass[];
  excludedRules?: RuleFamily[];
  distractorPolicy?: 'easy' | 'balanced' | 'near_miss' | 'adversarial';
  answerCount?: number;
};

export type RavenTestGenerationOptions = RavenGenerationOptions & {
  count?: number;
};

export type RavenAnswerRecord = {
  taskId: string;
  taskIndex: number;
  taskClass: TaskClass;
  difficultyLevel: DifficultyLevel;
  difficultyScore: number;
  rules: RuleFamily[];
  skillTags: string[];
  selectedIndex: number | null;
  correctIndex: number;
  selectedFamily: DistractorFamily | null;
  isCorrect: boolean;
  responseTimeMs: number;
  seed: string;
};

export type RavenFullResult = {
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  totalDurationMs: number;
  averageResponseTimeMs: number;
  answers: RavenAnswerRecord[];
};
