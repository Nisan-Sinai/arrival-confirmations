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
  site: {
    name: 'Arrival Confirmations',
    description: 'A digital invitation and RSVP for your event',
  },
  footer: {
    builtBy: 'Designed and built by',
    builderName: 'Nisan Sinai Technologies',
    navAria: 'Required links',
    privacy: 'Privacy policy',
    accessibility: 'Accessibility statement',
  },
  landing: {
    meta: {
      title: 'RSVPs for your event | Nisan Sinai Technologies',
      description:
        'A digital invitation and RSVPs for your event. Start with a free trial run, then choose Basic at ₪99, Premium at ₪199 or Pro at ₪349 — paid once.',
      ogTitle: 'RSVPs for your event | Nisan Sinai Technologies',
      ogDescription:
        'Build an invitation, try it for free, and pay once when you activate the event.',
    },
    hero: {
      eyebrow: 'RSVPs for your event',
      titleLead: 'Manage your guest list',
      titleAccent: 'without chasing replies',
      lead: 'Build a digital invitation, share it on WhatsApp, and see every reply in one place. Start with a free trial run and only pay when you activate the event.',
      ctaPrimary: 'Create a trial event',
      ctaSecondary: 'See the plans',
      facts: ['10 free replies', 'Paid once', 'No monthly billing'],
    },
    invitationPreview: {
      // A mock Jewish-Israeli wedding invitation. The Hebrew opens with the
      // traditional blessing; the English keeps the ceremony without transliterating
      // abbreviations that would mean nothing to an English reader.
      blessing: 'With God’s help',
      introFirstLine: 'With praise and thanks to the Almighty',
      introSecondLine: 'we joyfully invite you to the wedding of',
      occasion: 'Wedding',
      dateLabel: 'Date',
      dateValue: '14 Elul',
      timeLabel: 'Time',
      timeValue: '19:00',
      placeLabel: 'Venue',
      placeValue: 'Hadar Hall',
      countdownDays: 'days',
      countdownHours: 'hours',
      countdownMinutes: 'minutes',
      captionLead: 'This is the invitation',
      captionAccent: 'that goes out on WhatsApp',
    },
    benefits: {
      eyebrow: 'What you get',
      title: 'Everything a well-run event needs',
      items: [
        {
          title: 'A designed digital invitation',
          body: 'Hebrew date, a countdown, Waze and Google Maps — on a page that looks like an invitation rather than a form.',
        },
        {
          title: 'A live dashboard',
          body: 'See who is coming, how many adults and children, dietary needs and notes — from any phone.',
        },
        {
          title: 'Hebrew and RTL from the ground up',
          body: 'The forms, tables and screens were built for an Israeli audience and for reading comfortably inside WhatsApp.',
        },
      ],
    },
    plans: {
      eyebrow: 'Plans',
      title: 'Start free, activate when you are ready',
      lead: 'Basic at ₪99, Premium at ₪199 or Pro at ₪349 — paid once, per event.',
    },
    faq: {
      eyebrow: 'Common questions',
      title: 'Before you start',
      items: [
        {
          question: 'Can I try it before paying?',
          answer:
            'Yes. Build a complete event and collect up to 10 replies as a trial run. Payment is only needed to open it up beyond that.',
        },
        {
          question: 'Is this a monthly subscription?',
          answer: 'No. You pay once per event, with no commitment and no recurring charge.',
        },
        {
          question: 'How do I pay?',
          answer:
            'Get in touch by phone or WhatsApp and pay directly. The plan is then activated for your event.',
        },
        {
          question: 'Do guests need to register?',
          answer:
            'No. Guests open the link, fill in their details and confirm — no account, nothing to install.',
        },
      ],
    },
  },
};
