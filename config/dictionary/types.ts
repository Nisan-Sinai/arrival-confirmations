/**
 * The shape every locale must satisfy (§12).
 *
 * One type, two implementations. A translation that is missing from a locale is a
 * missing property, and a missing property is a compile error — so an untranslated
 * string cannot reach production as a blank space on the page. This is the whole
 * reason the dictionary is typed rather than a loose record of strings.
 */
export type Dictionary = {
  rsvp: {
    submitting: string;
    submit: string;
    successTitle: string;
    successAttending: string;
    successNotAttending: string;
    successMaybe: string;
    updated: string;
    genericAcknowledgement: string;
    networkError: string;
    rateLimited: string;
    unknownError: string;
  };
  invite: {
    invalidToken: string;
    sessionExpired: string;
  };
  admin: {
    loginFailed: string;
    notAuthorized: string;
    saved: string;
    deleted: string;
    linkCopied: string;
    linkRevoked: string;
    linkRegenerated: string;
    exportEmpty: string;
    responseRateUnavailable: string;
    actionFailed: string;
  };
  validation: {
    required: string;
    fullNameTooShort: string;
    fullNameTooLong: string;
    phoneInvalid: string;
    attendanceRequired: string;
    countNegative: string;
    countTooLarge: string;
    consentRequired: string;
    notesTooLong: string;
    dietaryTooLong: string;
  };
  errors: {
    notFoundTitle: string;
    notFoundBody: string;
    genericTitle: string;
    genericBody: string;
    offlineTitle: string;
    offlineBody: string;
  };
  a11y: {
    skipToContent: string;
    loading: string;
    requiredField: string;
    externalLink: string;
  };
  /** The control that moves between the two languages. */
  languageSwitch: {
    /** Label on the control, written in the language it switches *to*. */
    label: string;
    ariaLabel: string;
  };
  /**
   * How the product names and describes itself, for the document title, the share
   * card and the footer. Written natively in each language rather than
   * transliterated: "Arrival confirmations" is what an English reader would call
   * this, and a romanised "Ishurei Hagaa" would mean nothing to them.
   */
  site: {
    name: string;
    description: string;
  };
  footer: {
    /** The prose before the studio name, e.g. "Designed and built by". */
    builtBy: string;
    builderName: string;
    navAria: string;
    privacy: string;
    accessibility: string;
  };
  landing: {
    meta: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
    };
    hero: {
      eyebrow: string;
      /** The headline is two lines, the second one accented. */
      titleLead: string;
      titleAccent: string;
      lead: string;
      ctaPrimary: string;
      ctaSecondary: string;
      /** Three short reassurances under the buttons. */
      facts: readonly [string, string, string];
    };
    /**
     * The mock invitation beside the headline. It is decorative — `aria-hidden` — but
     * it is the clearest picture of what the product makes, so it is translated rather
     * than left in Hebrew on an English page.
     */
    invitationPreview: {
      blessing: string;
      introFirstLine: string;
      introSecondLine: string;
      occasion: string;
      dateLabel: string;
      dateValue: string;
      timeLabel: string;
      timeValue: string;
      placeLabel: string;
      placeValue: string;
      countdownDays: string;
      countdownHours: string;
      countdownMinutes: string;
      captionLead: string;
      captionAccent: string;
    };
    benefits: {
      eyebrow: string;
      title: string;
      items: readonly [
        { title: string; body: string },
        { title: string; body: string },
        { title: string; body: string },
      ];
    };
    plans: {
      eyebrow: string;
      title: string;
      lead: string;
    };
    faq: {
      eyebrow: string;
      title: string;
      items: readonly [
        { question: string; answer: string },
        { question: string; answer: string },
        { question: string; answer: string },
        { question: string; answer: string },
      ];
    };
  };
};
