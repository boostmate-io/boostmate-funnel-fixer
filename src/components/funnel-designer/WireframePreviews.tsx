/* Wireframe thumbnail previews for funnel node types.
   Each preview is abstract, simplified, and visually distinct. */

type P = { color: string };

/* ── Sales Page: tall vertical layout, multiple sections + CTA ── */
export const SalesPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Hero headline */}
    <div className="h-2.5 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    {/* Video/hero block */}
    <div className="h-8 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
      <div className="w-0 h-0 border-l-[6px] border-t-[4px] border-b-[4px] border-l-current border-t-transparent border-b-transparent" style={{ color: `${color}40` }} />
    </div>
    {/* Text section */}
    <div className="space-y-[2px]">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}18` }} />
      <div className="h-1 rounded-full w-4/5" style={{ backgroundColor: `${color}12` }} />
    </div>
    {/* Feature columns */}
    <div className="flex gap-[3px]">
      <div className="h-4 rounded-sm flex-1" style={{ backgroundColor: `${color}10` }} />
      <div className="h-4 rounded-sm flex-1" style={{ backgroundColor: `${color}10` }} />
      <div className="h-4 rounded-sm flex-1" style={{ backgroundColor: `${color}10` }} />
    </div>
    {/* More text */}
    <div className="space-y-[2px]">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}15` }} />
      <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: `${color}10` }} />
    </div>
    {/* Testimonial block */}
    <div className="h-3 rounded-sm" style={{ backgroundColor: `${color}08` }} />
    {/* CTA */}
    <div className="h-3 rounded-sm w-3/4 mx-auto" style={{ backgroundColor: `${color}50` }} />
  </div>
);

/* ── Thank You Page: big checkmark icon, minimal content ── */
export const ThankYouPreview = ({ color }: P) => (
  <div className="w-full flex flex-col items-center justify-center gap-1.5 px-1.5 py-2">
    {/* Large check circle */}
    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 10l3 3 5-6" stroke={`${color}70`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    {/* Headline */}
    <div className="h-2 rounded-sm w-3/4" style={{ backgroundColor: `${color}25` }} />
    {/* Subtext */}
    <div className="space-y-[2px] w-full">
      <div className="h-1 rounded-full w-4/5 mx-auto" style={{ backgroundColor: `${color}12` }} />
      <div className="h-1 rounded-full w-3/5 mx-auto" style={{ backgroundColor: `${color}10` }} />
    </div>
  </div>
);

/* ── Confirmation Page: order summary / next steps ── */
export const ConfirmationPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Header with small check */}
    <div className="flex items-center gap-1">
      <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}25` }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M2 4l1.5 1.5 2.5-3" stroke={`${color}70`} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="h-2 rounded-sm flex-1" style={{ backgroundColor: `${color}25` }} />
    </div>
    {/* Divider */}
    <div className="h-px w-full" style={{ backgroundColor: `${color}15` }} />
    {/* Summary rows */}
    {[1, 2, 3].map(i => (
      <div key={i} className="flex justify-between items-center">
        <div className="h-1 rounded-full w-2/5" style={{ backgroundColor: `${color}15` }} />
        <div className="h-1 rounded-full w-1/4" style={{ backgroundColor: `${color}20` }} />
      </div>
    ))}
    {/* Divider */}
    <div className="h-px w-full" style={{ backgroundColor: `${color}15` }} />
    {/* Total row */}
    <div className="flex justify-between items-center">
      <div className="h-1.5 rounded-full w-1/3" style={{ backgroundColor: `${color}25` }} />
      <div className="h-1.5 rounded-full w-1/5" style={{ backgroundColor: `${color}35` }} />
    </div>
    {/* Next steps */}
    <div className="space-y-[2px] pt-1">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}10` }} />
      <div className="h-1 rounded-full w-4/5" style={{ backgroundColor: `${color}08` }} />
    </div>
  </div>
);

/* ── Opt-in Page: input fields + strong CTA ── */
export const OptInPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Headline */}
    <div className="h-2.5 rounded-sm w-full" style={{ backgroundColor: `${color}28` }} />
    {/* Sub headline */}
    <div className="h-1.5 rounded-sm w-3/4 mx-auto" style={{ backgroundColor: `${color}12` }} />
    {/* Spacer */}
    <div className="pt-1" />
    {/* Input fields */}
    <div className="h-3 rounded-sm w-full border" style={{ borderColor: `${color}25` }} />
    <div className="h-3 rounded-sm w-full border" style={{ borderColor: `${color}25` }} />
    {/* CTA button - strong */}
    <div className="h-3.5 rounded-sm w-full" style={{ backgroundColor: `${color}55` }} />
    {/* Privacy text */}
    <div className="h-0.5 rounded-full w-2/3 mx-auto" style={{ backgroundColor: `${color}08` }} />
  </div>
);

/* ── Application Page: long form, many stacked inputs ── */
export const ApplicationPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Headline */}
    <div className="h-2 rounded-sm w-3/4" style={{ backgroundColor: `${color}25` }} />
    {/* Many form fields */}
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="space-y-[1px]">
        <div className="h-0.5 rounded-full w-1/3" style={{ backgroundColor: `${color}18` }} />
        <div className="h-2.5 rounded-sm w-full border" style={{ borderColor: `${color}20` }} />
      </div>
    ))}
    {/* Submit CTA */}
    <div className="h-3 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}45` }} />
  </div>
);

/* ── Booking / Calendar Page: calendar grid layout ── */
export const BookingPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Headline */}
    <div className="h-2 rounded-sm w-2/3" style={{ backgroundColor: `${color}25` }} />
    {/* Month nav */}
    <div className="flex items-center justify-between">
      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: `${color}15` }} />
      <div className="h-1.5 rounded-sm w-1/3" style={{ backgroundColor: `${color}18` }} />
      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: `${color}15` }} />
    </div>
    {/* Calendar grid */}
    <div className="grid grid-cols-7 gap-[1px]">
      {Array.from({ length: 21 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-[1px]"
          style={{
            backgroundColor: i === 10 ? `${color}45` : `${color}${i % 5 === 0 ? '06' : '12'}`,
          }}
        />
      ))}
    </div>
    {/* Time slots */}
    <div className="flex gap-[2px]">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-2 rounded-sm flex-1" style={{ backgroundColor: `${color}${i === 2 ? '30' : '12'}` }} />
      ))}
    </div>
    {/* CTA */}
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}40` }} />
  </div>
);

/* ── Order Form: split layout with form + pricing sidebar ── */
export const OrderFormPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Headline */}
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}25` }} />
    {/* Split layout */}
    <div className="flex gap-1">
      {/* Left: form fields */}
      <div className="flex-1 space-y-[2px]">
        <div className="h-2 rounded-sm w-full border" style={{ borderColor: `${color}20` }} />
        <div className="h-2 rounded-sm w-full border" style={{ borderColor: `${color}20` }} />
        <div className="flex gap-[2px]">
          <div className="h-2 rounded-sm flex-1 border" style={{ borderColor: `${color}20` }} />
          <div className="h-2 rounded-sm flex-1 border" style={{ borderColor: `${color}20` }} />
        </div>
        <div className="h-2 rounded-sm w-full border" style={{ borderColor: `${color}20` }} />
      </div>
      {/* Right: pricing summary */}
      <div className="w-[45%] rounded-sm p-[3px] space-y-[2px]" style={{ backgroundColor: `${color}08` }}>
        <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: `${color}20` }} />
        <div className="h-px w-full" style={{ backgroundColor: `${color}12` }} />
        <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}12` }} />
        <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}12` }} />
        <div className="h-px w-full" style={{ backgroundColor: `${color}12` }} />
        <div className="h-1.5 rounded-full w-2/3" style={{ backgroundColor: `${color}30` }} />
      </div>
    </div>
    {/* CTA */}
    <div className="h-3 rounded-sm w-full" style={{ backgroundColor: `${color}50` }} />
  </div>
);

/* ── Upsell Page: bold offer + highlighted CTA decision ── */
export const UpsellPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Bold headline */}
    <div className="h-3 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    {/* Offer image/block */}
    <div className="h-8 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
      <div className="w-6 h-5 rounded-sm" style={{ backgroundColor: `${color}20` }} />
    </div>
    {/* Price */}
    <div className="h-2 rounded-sm w-1/2 mx-auto" style={{ backgroundColor: `${color}22` }} />
    {/* YES CTA - prominent */}
    <div className="h-3.5 rounded-sm w-full" style={{ backgroundColor: `${color}55` }} />
    {/* No thanks link */}
    <div className="h-1 rounded-full w-1/2 mx-auto" style={{ backgroundColor: `${color}15` }} />
  </div>
);

/* ── Downsell Page: simpler offer, less emphasis ── */
export const DownsellPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Lighter headline */}
    <div className="h-2 rounded-sm w-3/4 mx-auto" style={{ backgroundColor: `${color}20` }} />
    {/* Smaller offer block */}
    <div className="h-5 rounded-sm" style={{ backgroundColor: `${color}08` }} />
    {/* Reduced price */}
    <div className="flex items-center justify-center gap-1">
      <div className="h-1 w-4 rounded-full" style={{ backgroundColor: `${color}15`, textDecoration: 'line-through' }} />
      <div className="h-1.5 w-5 rounded-full" style={{ backgroundColor: `${color}30` }} />
    </div>
    {/* CTA - less prominent than upsell */}
    <div className="h-3 rounded-sm w-3/4 mx-auto" style={{ backgroundColor: `${color}40` }} />
    {/* No thanks */}
    <div className="h-1 rounded-full w-1/3 mx-auto" style={{ backgroundColor: `${color}12` }} />
  </div>
);

/* ── Webinar Page: video player + registration ── */
export const WebinarPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Headline */}
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}25` }} />
    {/* Video player */}
    <div className="h-10 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <div className="w-0 h-0 border-l-[5px] border-t-[3px] border-b-[3px] border-l-current border-t-transparent border-b-transparent ml-0.5" style={{ color: `${color}50` }} />
      </div>
    </div>
    {/* Text */}
    <div className="space-y-[2px]">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}12` }} />
      <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: `${color}08` }} />
    </div>
    {/* CTA */}
    <div className="h-3 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}40` }} />
  </div>
);

/* ── Survey Page: radio/checkbox options ── */
export const SurveyPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Question */}
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}22` }} />
    {/* Options */}
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="flex items-center gap-1 py-[1px]">
        <div className="w-2 h-2 rounded-full border flex-shrink-0" style={{ borderColor: `${color}35` }}>
          {i === 2 && <div className="w-1 h-1 rounded-full m-auto" style={{ backgroundColor: `${color}50` }} />}
        </div>
        <div className="h-1 rounded-full flex-1" style={{ backgroundColor: `${color}${i === 2 ? '20' : '12'}` }} />
      </div>
    ))}
    {/* Progress bar */}
    <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}08` }}>
      <div className="h-1 rounded-full w-2/3" style={{ backgroundColor: `${color}25` }} />
    </div>
    {/* CTA */}
    <div className="h-2.5 rounded-sm w-1/2 mx-auto" style={{ backgroundColor: `${color}40` }} />
  </div>
);

/* ── Membership / Course: grid of modules ── */
export const MembershipPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Nav bar */}
    <div className="flex gap-1 items-center">
      <div className="h-1.5 rounded-sm w-1/4" style={{ backgroundColor: `${color}25` }} />
      <div className="flex-1" />
      <div className="h-1 rounded-full w-1/6" style={{ backgroundColor: `${color}12` }} />
      <div className="h-1 rounded-full w-1/6" style={{ backgroundColor: `${color}12` }} />
    </div>
    {/* Welcome banner */}
    <div className="h-4 rounded-sm" style={{ backgroundColor: `${color}10` }} />
    {/* Module grid */}
    <div className="grid grid-cols-2 gap-[2px]">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-sm p-[2px] space-y-[1px]" style={{ backgroundColor: `${color}08` }}>
          <div className="h-2.5 rounded-[1px]" style={{ backgroundColor: `${color}15` }} />
          <div className="h-0.5 rounded-full w-3/4" style={{ backgroundColor: `${color}12` }} />
        </div>
      ))}
    </div>
    {/* Progress */}
    <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}08` }}>
      <div className="h-1 rounded-full w-1/3" style={{ backgroundColor: `${color}30` }} />
    </div>
  </div>
);

/* ── VSL Page: Video Sales Letter ── */
export const VSLPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Headline */}
    <div className="h-2.5 rounded-sm w-full" style={{ backgroundColor: `${color}28` }} />
    {/* Large video */}
    <div className="h-12 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}08` }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <div className="w-0 h-0 border-l-[7px] border-t-[5px] border-b-[5px] border-l-current border-t-transparent border-b-transparent ml-0.5" style={{ color: `${color}40` }} />
      </div>
    </div>
    {/* CTA below video */}
    <div className="h-3.5 rounded-sm w-3/4 mx-auto" style={{ backgroundColor: `${color}50` }} />
  </div>
);

/* ── Checkout Page: compact payment form ── */
export const CheckoutPreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    {/* Steps indicator */}
    <div className="flex justify-center gap-1 py-[2px]">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-[2px]">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `${color}${i === 2 ? '40' : '15'}` }} />
          {i < 3 && <div className="w-2 h-px" style={{ backgroundColor: `${color}15` }} />}
        </div>
      ))}
    </div>
    {/* Card fields */}
    <div className="space-y-[2px]">
      <div className="h-2.5 rounded-sm w-full border" style={{ borderColor: `${color}20` }} />
      <div className="flex gap-[2px]">
        <div className="h-2.5 rounded-sm flex-1 border" style={{ borderColor: `${color}20` }} />
        <div className="h-2.5 rounded-sm w-1/3 border" style={{ borderColor: `${color}20` }} />
      </div>
    </div>
    {/* Order summary */}
    <div className="rounded-sm p-[3px] space-y-[2px]" style={{ backgroundColor: `${color}06` }}>
      <div className="flex justify-between">
        <div className="h-1 rounded-full w-1/3" style={{ backgroundColor: `${color}15` }} />
        <div className="h-1 rounded-full w-1/5" style={{ backgroundColor: `${color}20` }} />
      </div>
      <div className="h-px" style={{ backgroundColor: `${color}10` }} />
      <div className="flex justify-between">
        <div className="h-1.5 rounded-full w-1/4" style={{ backgroundColor: `${color}25` }} />
        <div className="h-1.5 rounded-full w-1/6" style={{ backgroundColor: `${color}35` }} />
      </div>
    </div>
    {/* Pay CTA */}
    <div className="h-3 rounded-sm w-full" style={{ backgroundColor: `${color}50` }} />
  </div>
);

/* ── Default fallback ── */
export const DefaultPagePreview = ({ color }: P) => (
  <div className="w-full space-y-[3px] px-1.5">
    <div className="h-2.5 rounded-sm w-full" style={{ backgroundColor: `${color}25` }} />
    <div className="h-6 rounded-sm" style={{ backgroundColor: `${color}10` }} />
    <div className="space-y-[2px]">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}15` }} />
      <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: `${color}10` }} />
      <div className="h-1 rounded-full w-5/6" style={{ backgroundColor: `${color}10` }} />
    </div>
    <div className="h-3 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}35` }} />
  </div>
);

/* ── Type → Component mapping ── */
export const getWireframeForType = (pageType: string) => {
  switch (pageType) {
    case "opt-in":
    case "squeeze":
    case "lead-magnet":
    case "chatbot-optin":
      return OptInPreview;
    case "sales":
    case "webinar-sales":
      return SalesPreview;
    case "vsl":
      return VSLPreview;
    case "order-form":
    case "2step-order":
    case "tripwire":
      return OrderFormPreview;
    case "checkout":
      return CheckoutPreview;
    case "thank-you":
      return ThankYouPreview;
    case "confirmation":
      return ConfirmationPreview;
    case "webinar-register":
    case "webinar-live":
    case "webinar-replay":
      return WebinarPreview;
    case "upsell":
    case "oto":
      return UpsellPreview;
    case "downsell":
      return DownsellPreview;
    case "survey":
      return SurveyPreview;
    case "application":
      return ApplicationPreview;
    case "booking":
    case "calendar":
      return BookingPreview;
    case "membership":
    case "course-dashboard":
    case "community":
      return MembershipPreview;
    default:
      return DefaultPagePreview;
  }
};
