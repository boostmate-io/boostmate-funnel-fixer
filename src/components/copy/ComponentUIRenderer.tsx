import GenericComponentUI from "./interfaces/GenericComponentUI";

interface ComponentUIRendererProps {
  uiInterfaceSlug: string;
  componentSlug: string;
  aiActionSlug: string;
  componentInstructions: string;
  context: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
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
  // When we add dedicated UIs, add cases here:
  // case "big_promise_ui": return <BigPromiseUI {...props} />;
  // case "credibility_ui": return <CredibilityUI {...props} />;
  // case "faq_ui": return <FaqUI {...props} />;

  switch (uiInterfaceSlug) {
    // All components fall through to generic for now (dummy phase)
    default:
      return <GenericComponentUI {...props} />;
  }
};

export default ComponentUIRenderer;
