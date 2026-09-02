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
  header: {
    homeAria: 'Home — Arrival Confirmations',
    navAria: 'Main navigation',
    pricing: 'Pricing',
    login: 'Log in',
    signup: 'Create an event',
  },
  flow: {
    eyebrow: 'What happens after you send the link?',
    title: 'Three simple steps to an RSVP',
    demoPlay: 'Play the demo clip',
    demoCaption: 'Tap to watch · 20 seconds',
    demoClose: 'Close the clip',
    steps: [
      {
        title: 'Your guest opens it from WhatsApp',
        body: 'No sign-up and nothing to install.',
      },
      {
        title: 'They fill in a reply',
        body: 'Name, phone, how many are coming and the preferences that matter.',
      },
      {
        title: 'The reply lands on your dashboard',
        body: 'Everything updates at once, ready to total up and export.',
      },
    ],
  },
  pricing: {
    highlightedBadge: 'The advanced plan',
    trialNote: 'No credit card',
    oneTimeNote: 'Paid once, per event',
    trialCta: 'Create a trial event',
    choosePlan: 'Choose {plan}',
    whatsappIntro:
      'Hi Nisan, I would like to activate the {plan} plan for my event on Arrival Confirmations.',
  },
  authNotice: {
    otpExpired:
      'This link has expired or has already been used. Reset links work once and only for a limited time.',
    accessDenied:
      'The request was denied. If you asked to reset your password, request a new link.',
    generic: 'Something went wrong during sign-in. Please try again.',
    requestNewLink: 'Request a new link',
  },
  auth: {
    fields: {
      email: 'Email address',
      password: 'Password',
      newPassword: 'New password',
      confirmPassword: 'Confirm the new password',
      passwordHint: 'At least {min} characters',
    },
    forgotPassword: 'Forgot your password?',
    checkInbox: 'Check your inbox',
    backToLogin: 'Back to sign in',
    modes: {
      signIn: {
        title: 'Sign in to your account',
        subtitle: 'Manage your events and the replies that come in.',
        submit: 'Sign in',
        pending: 'Signing in…',
        footerPrompt: 'No account yet?',
        footerLink: 'Sign up free',
      },
      signUp: {
        title: 'Create an account',
        subtitle: 'Free, no credit card, with up to 10 trial replies.',
        submit: 'Create an account',
        pending: 'Creating…',
        footerPrompt: 'Already have an account?',
        footerLink: 'Sign in',
      },
      requestReset: {
        title: 'Reset your password',
        subtitle:
          "Enter the account's email address and we'll send a link to choose a new password.",
        submit: 'Send a reset link',
        pending: 'Sending…',
        footerPrompt: 'Remembered it?',
        footerLink: 'Back to sign in',
      },
      setPassword: {
        title: 'Choose a new password',
        subtitle: 'Once you save, you will be signed in automatically.',
        submit: 'Save the password',
        pending: 'Saving…',
      },
    },
    errors: {
      loginFailed: 'Those sign-in details are not correct.',
      invalidEmail: 'That email address is not valid',
      passwordTooShort: 'The password must be at least {min} characters',
      passwordsMismatch: 'The two passwords do not match',
      linkExpired: 'The link has expired. Request a new reset link.',
    },
    sent: {
      signupMaybe:
        'If the address is available, we have sent it a confirmation email. Check your inbox.',
      signupConfirm:
        'We have sent a confirmation email to the address you entered. Confirm it to sign in.',
      resetLink: 'If an account exists for this address, we have sent it a password-reset link.',
    },
    loginNotice: {
      expiredLead:
        'This link has expired or has already been used. Reset links work once and only for a limited time —',
      expiredLink: 'request a new one',
      authFailed:
        "We couldn't complete the sign-in. Please try again, and request a new link if it keeps happening.",
    },
    resetExpired: {
      title: 'The link has expired',
      body: 'Reset links work once and only for a limited time. Request a new one and we will send it again.',
      cta: 'Request a new link',
    },
    callback: {
      heading: 'One moment…',
      subtitle: 'Verifying the link',
      verifyingSr: 'Verifying the link…',
      failedSr: 'Verification failed',
      noscript:
        'Completing the link requires JavaScript. Enable it in your browser and open the link again.',
    },
  },
  languageSwitch: {
    label: 'עב',
    ariaLabel: 'מעבר לעברית',
  },
  site: {
    name: 'Arrival Confirmations',
    description: 'A digital invitation and RSVP for your event',
    publisherDescription:
      'An Israeli software studio building websites, management systems and automations for businesses, and the operator of this event RSVP service.',
  },
  footer: {
    builtBy: 'Designed and built by',
    builderName: 'Nisan Sinai Technologies',
    navAria: 'Required links',
    pricing: 'Plans and pricing',
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
