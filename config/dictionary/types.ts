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
};
