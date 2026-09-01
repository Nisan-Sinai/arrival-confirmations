/** The copy one credential form needs: its heading, its buttons and its footer link. */
export type AuthModeCopy = {
  title: string;
  subtitle: string;
  submit: string;
  pending: string;
  footerPrompt: string;
  footerLink: string;
};

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
  /** The public site header — the brand link and the marketing navigation. */
  header: {
    /** Accessible name of the logo link back to the home page. */
    homeAria: string;
    /** Accessible name of the navigation region. */
    navAria: string;
    pricing: string;
    login: string;
    signup: string;
  };
  /**
   * The three-step explainer under the hero: what a guest does after the link
   * reaches them.
   */
  flow: {
    eyebrow: string;
    title: string;
    steps: readonly [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
  };
  /** The plan cards — the copy around the catalogue data, not the plans themselves. */
  pricing: {
    /** Ribbon on the highlighted plan. */
    highlightedBadge: string;
    /** Sub-price line for the free trial. */
    trialNote: string;
    /** Sub-price line for a paid plan. */
    oneTimeNote: string;
    /** Call to action on the trial card. */
    trialCta: string;
    /** Call to action on a paid card. `{plan}` is the plan name. */
    choosePlan: string;
    /** The WhatsApp message a paid card opens. `{plan}` is the plan name. */
    whatsappIntro: string;
  };
  /**
   * The notice that surfaces a Supabase auth failure reported in the URL fragment.
   * Keyed by the `error` / `error_code` Supabase returns, with a fallback.
   */
  authNotice: {
    otpExpired: string;
    accessDenied: string;
    generic: string;
    requestNewLink: string;
  };
  /**
   * The credential forms — sign-in, sign-up, password recovery and reset — and the
   * server-action messages they show. One block because the four pages share a shell;
   * `{min}` is filled with the minimum password length.
   */
  auth: {
    fields: {
      email: string;
      password: string;
      newPassword: string;
      confirmPassword: string;
      /** Hint under a new-password field. `{min}` is the minimum length. */
      passwordHint: string;
    };
    /** The "forgot password" link on the sign-in form. */
    forgotPassword: string;
    /** Confirmation-screen heading after a mail has been sent. */
    checkInbox: string;
    /** Link back to sign-in from a confirmation screen. */
    backToLogin: string;
    /** Per-mode page copy. `setPassword` has no footer link. */
    modes: {
      signIn: AuthModeCopy;
      signUp: AuthModeCopy;
      requestReset: AuthModeCopy;
      setPassword: Omit<AuthModeCopy, 'footerPrompt' | 'footerLink'>;
    };
    /** Server-action rejections. `{min}` is the minimum password length. */
    errors: {
      loginFailed: string;
      invalidEmail: string;
      passwordTooShort: string;
      passwordsMismatch: string;
      linkExpired: string;
    };
    /** Server-action "we sent a mail" acknowledgements, deliberately non-committal. */
    sent: {
      signupMaybe: string;
      signupConfirm: string;
      resetLink: string;
    };
    /** The alerts the sign-in page raises from an `?error=` the callback appended. */
    loginNotice: {
      expiredLead: string;
      expiredLink: string;
      authFailed: string;
    };
    /** The expired-link card the reset page shows without a recovery session. */
    resetExpired: {
      title: string;
      body: string;
      cta: string;
    };
    /** The interstitial that completes an implicit-flow link in the browser. */
    callback: {
      heading: string;
      subtitle: string;
      verifyingSr: string;
      failedSr: string;
      noscript: string;
    };
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
    /**
     * What the studio behind the product does, for the `Organization` node.
     *
     * Google's generative summary asserted that Nisan Sinai Technologies is a
     * metalworking plant in Karmiel and "is not connected to RSVP systems" — an
     * unrelated business sharing the name, picked because the site published no entity
     * data of its own. This sentence is the correction, and it has to say the category
     * out loud rather than implying it.
     */
    publisherDescription: string;
  };
  footer: {
    /** The prose before the studio name, e.g. "Designed and built by". */
    builtBy: string;
    builderName: string;
    navAria: string;
    /**
     * The plans link.
     *
     * It lives here so the header can drop it on a phone without stranding the page:
     * below `sm` the header has room for the mark, the language switch, sign-in and
     * the call to action, and nothing more.
     */
    pricing: string;
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
