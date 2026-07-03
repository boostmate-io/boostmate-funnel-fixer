import GenericComponentUI from "./interfaces/GenericComponentUI";
import BigPromiseHeroUI from "./interfaces/BigPromiseHeroUI";
import CredibilityStatsUI from "./interfaces/CredibilityStatsUI";
import ProblemAmplifierUI from "./interfaces/ProblemAmplifierUI";
import PainPointsUI from "./interfaces/PainPointsUI";
import FounderStoryUI from "./interfaces/FounderStoryUI";
import DesiredOutcomesUI from "./interfaces/DesiredOutcomesUI";

interface ComponentUIRendererProps {
  uiInterfaceSlug: string;
  componentSlug: string;
  aiActionSlug: string;
  componentInstructions: string;
  context: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  outputStructure?: Array<{ key: string; label: string; type: string; item_schema?: any[] }>;
  onInputsChange: (inputs: Record<string, any>) => void;
  onOutputsChange: (outputs: Record<string, any>) => void;
  onGenerated: () => void;
}

/**
 * Renders the correct UI interface based on the ui_interface_slug.
 * Each component maps to one predefined interface.
 * The generic UI is used as fallback for components without a dedicated interface.
 */
const ComponentUIRenderer = ({
  uiInterfaceSlug,
  ...props
}: ComponentUIRendererProps) => {
  switch (uiInterfaceSlug) {
    case "big_promise_hero_ui":
    case "hero_section_ui":
      return <BigPromiseHeroUI {...props} />;
    case "credibility_stats_ui":
      return <CredibilityStatsUI {...props} />;
    case "problem_amplifier_ui":
      return <ProblemAmplifierUI {...props} />;
    case "pain_points_ui":
      return <PainPointsUI {...props} />;
    case "founder_story_ui":
      return <FounderStoryUI {...props} />;
    case "desired_outcomes_ui":
      return <DesiredOutcomesUI {...props} />;
    default:
      return <GenericComponentUI {...props} />;
  }
};

export default ComponentUIRenderer;
