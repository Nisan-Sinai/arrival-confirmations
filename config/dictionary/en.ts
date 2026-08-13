import type { Dictionary } from './types';

/**
 * English.
 *
 * Guest-facing copy addresses the reader directly and stays warm rather than
 * transactional: the Hebrew says "we are waiting to see you", not "your response has
 * been recorded", and the English should not be colder than the invitation it belongs
 * to. Host-facing admin copy is plainer, because that reader is working.
 */
export const en: Dictionary = {
  rsvp: {
    submitting: 'Sending…',
    submit: 'Send my reply',
    successTitle: 'Thank you!',
    successAttending: "Your reply is in. We can't wait to see you!",
    successNotAttending: "You've let us know you can't make it. Thank you for telling us.",
    successMaybe: "We've got your reply. Let us know once you're sure.",
    updated: 'Your update has been saved.',
    genericAcknowledgement: 'Your reply has been received. Thank you!',
    networkError: "The request didn't go through because of a network problem. You can try again.",
    rateLimited: 'Too many requests. Please try again in a few minutes.',
    unknownError:
      'Something went wrong saving your reply. Please try again, and get in touch if it keeps happening.',
  },
  invite: {
    invalidToken:
      'This link is not valid or has expired. Please ask the hosts for an up-to-date one.',
    sessionExpired: 'Your session has expired. Please open your personal link again.',
  },
  admin: {
    loginFailed: 'Those sign-in details are not correct.',
    notAuthorized: 'You do not have permission to view this page.',
    saved: 'Your changes have been saved.',
    deleted: 'The record has been deleted.',
    linkCopied: 'Link copied.',
    linkRevoked: 'The link has been revoked.',
    linkRegenerated: 'A new link has been created. The previous one no longer works.',
    exportEmpty: 'There is nothing to export.',
    responseRateUnavailable: 'Not available',
    actionFailed: 'That did not work. Please try again.',
  },
  validation: {
    required: 'Required',
    fullNameTooShort: 'Please enter a full name (at least 2 characters)',
    fullNameTooLong: 'That name is too long',
    phoneInvalid: 'That is not a valid Israeli phone number',
    attendanceRequired: 'Please choose whether you are coming',
    countNegative: 'This cannot be a negative number',
    countTooLarge: 'That number is too high',
    consentRequired: 'Please agree to your details being used before sending',
    notesTooLong: 'That note is too long',
    dietaryTooLong: 'That is too long',
  },
  errors: {
    notFoundTitle: 'Page not found',
    notFoundBody: 'The link may be wrong, or the page may have been removed.',
    genericTitle: 'Something went wrong',
    genericBody: 'A temporary problem. Try refreshing the page.',
    offlineTitle: 'No internet connection',
    offlineBody: 'The page will load again once you are back online.',
  },
  a11y: {
    skipToContent: 'Skip to main content',
    loading: 'Loading…',
    requiredField: 'Required',
    externalLink: 'Opens in a new window',
  },
  languageSwitch: {
    label: 'עב',
    ariaLabel: 'מעבר לעברית',
  },
};
