/*
 * Contractor Registration Form — behavior
 *
 * This file is organized top to bottom in the order things happen:
 *   1. Grab references to the page elements we'll need repeatedly
 *   2. Dynamic show/hide logic for the two "Yes/No" health & safety questions
 *   3. File attachment handling
 *   4. Input formatting (phone characters, ABN spacing)
 *   5. Regex validation patterns
 *   6. ABN checksum (a second, mathematical check beyond just "is it 11 digits")
 *   7. The mock CAPTCHA widget
 *   8. Per-field validator functions
 *   9. Shared helpers that display/clear error messages and run validation
 *  10. Wiring up events (blur, change, submit)
 *
 * Everything is wrapped in an IIFE (Immediately Invoked Function Expression)
 * so none of these variable names leak into the global scope.
 */
(function () {
  "use strict";


  /* ========================================================================
     1. CORE ELEMENT REFERENCES
     ======================================================================== */

  const form = document.getElementById('reg-form');
  const errorSummary = document.getElementById('error-summary');
  const errorSummaryList = document.getElementById('error-summary-list');
  const successPanel = document.getElementById('success-panel');


  /* ========================================================================
     2a. DYNAMIC FIELD: Health & Safety Policy attachment
     Selecting "Yes" reveals the file-upload field; selecting "No" (or
     switching away from "Yes") hides it again and clears anything selected,
     so a hidden field can never accidentally get submitted.
     ======================================================================== */

  const policyRadios = document.querySelectorAll('input[name="hasPolicy"]');
  const policyWrap = document.getElementById('policy-file-wrap');
  const policyYes = document.getElementById('policy-yes');

  policyRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const isYesSelected = policyYes.checked;

      policyWrap.hidden = !isYesSelected;
      policyYes.setAttribute('aria-expanded', String(isYesSelected)); // tells screen readers this field controls something

      if (!isYesSelected) {
        document.getElementById('policy-file').value = '';
        selectedPolicyFile = null;
        renderPolicyFileList();
        clearFieldError('policyFile');
      }

      validateField('hasPolicy');
    });
  });


  /* ========================================================================
     2b. DYNAMIC FIELD: Health & Safety Representative (HSR) details
     Same pattern as above, applied to the second Yes/No question.
     ======================================================================== */

  const hsrRadios = document.querySelectorAll('input[name="hasHsr"]');
  const hsrWrap = document.getElementById('hsr-details-wrap');
  const hsrYes = document.getElementById('hsr-yes');

  hsrRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const isYesSelected = hsrYes.checked;

      hsrWrap.hidden = !isYesSelected;
      hsrYes.setAttribute('aria-expanded', String(isYesSelected));

      if (!isYesSelected) {
        document.getElementById('hsr-details').value = '';
        clearFieldError('hsrDetails');
      }

      validateField('hasHsr');
    });
  });


  /* ========================================================================
     3. FILE ATTACHMENT HANDLING (policy document upload)
     ======================================================================== */

  const policyFileInput = document.getElementById('policy-file');
  const policyFileList = document.getElementById('policy-file-list');
  let selectedPolicyFile = null; // only one file is allowed for this field

  policyFileInput.addEventListener('change', () => {
    const file = policyFileInput.files && policyFileInput.files[0];
    if (!file) return;

    // File type restriction: only accept .pdf, .doc, .docx (checked by extension via regex)
    if (!REGEX.FILE_TYPE_DOC.test(file.name)) {
      setFieldError('policyFile', '"' + file.name + '" isn\'t an accepted file type. Attach a PDF, DOC or DOCX file.');
      policyFileInput.value = '';
      return;
    }

    // File size restriction: 10MB max
    if (file.size > 10 * 1024 * 1024) {
      setFieldError('policyFile', '"' + file.name + '" is over 10MB.');
      policyFileInput.value = '';
      return;
    }

    selectedPolicyFile = file;
    clearFieldError('policyFile');
    renderPolicyFileList();
  });

  // Shows the currently attached file (with a "Remove" button) below the upload control
  function renderPolicyFileList() {
    policyFileList.innerHTML = '';
    if (!selectedPolicyFile) return;

    const listItem = document.createElement('li');

    const fileName = document.createElement('span');
    fileName.textContent = selectedPolicyFile.name + ' (' + Math.round(selectedPolicyFile.size / 1024) + ' KB)';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.setAttribute('aria-label', 'Remove ' + selectedPolicyFile.name);
    removeButton.addEventListener('click', () => {
      selectedPolicyFile = null;
      policyFileInput.value = '';
      renderPolicyFileList();
    });

    listItem.appendChild(fileName);
    listItem.appendChild(removeButton);
    policyFileList.appendChild(listItem);
  }


  /* ========================================================================
     4a. INPUT FORMATTING: Phone number
     Filters out any character that couldn't possibly belong in a phone
     number (letters, symbols) as the person types, before validation runs.
     ======================================================================== */

  const phoneInput = document.getElementById('p-phone');

  phoneInput.addEventListener('input', () => {
    if (!REGEX.AU_PHONE_CHARS.test(phoneInput.value)) {
      phoneInput.value = phoneInput.value.replace(/[^0-9\s()+-]/g, '');
    }
  });


  /* ========================================================================
     4b. INPUT FORMATTING: ABN
     Auto-inserts spaces as the person types so the number reads as
     "XX XXX XXX XXX" instead of one long unbroken string of digits.
     ======================================================================== */

  const abnInput = document.getElementById('b-abn');

  abnInput.addEventListener('input', () => {
    const digitsOnly = abnInput.value.replace(/\D/g, '').slice(0, 11);

    let formatted = digitsOnly;
    if (digitsOnly.length > 2) formatted = digitsOnly.slice(0, 2) + ' ' + digitsOnly.slice(2);
    if (digitsOnly.length > 5) formatted = formatted.slice(0, 6) + ' ' + formatted.slice(6);
    if (digitsOnly.length > 8) formatted = formatted.slice(0, 10) + ' ' + formatted.slice(10);

    abnInput.value = formatted;
  });


  /* ========================================================================
     5. REGEX VALIDATION PATTERNS
     Every field's validation rule is defined once here, then reused by the
     validator functions in section 8. Keeping them together makes the
     rules easy to find, audit, and adjust without hunting through the file.
     ======================================================================== */

  const REGEX = {
    // Mandatory-field check: fails if the value is empty or only whitespace
    MANDATORY: /\S+/,

    // Email: local-part@domain.tld
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/,

    // Australian phone number, tested against the value with spaces/brackets/hyphens stripped out:
    // mobile → 04XXXXXXXX or +614XXXXXXXX
    // landline → 0[2378]XXXXXXXX or +61[2378]XXXXXXXX
    AU_PHONE: /^(?:\+?61|0)(?:4\d{8}|[2378]\d{8})$/,

    // Characters allowed while typing a phone number (used to filter keystrokes live)
    AU_PHONE_CHARS: /^[0-9\s()+-]*$/,

    // ABN, tested against the digits-only value: exactly 11 digits
    ABN_DIGITS: /^\d{11}$/,

    // Accepted file extensions for the health & safety policy upload
    FILE_TYPE_DOC: /\.(pdf|docx?)$/i
  };

  // Shared helper: true if a value is empty or whitespace-only
  function isBlank(value) {
    return !REGEX.MANDATORY.test(value || '');
  }


  /* ========================================================================
     6. ABN CHECKSUM
     Format alone (11 digits) doesn't guarantee a *valid* ABN — this runs
     the official ABN "modulus 89" checksum algorithm as an extra layer
     on top of the regex format check.
     ======================================================================== */

  function isValidAbnChecksum(elevenDigitString) {
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    const digits = elevenDigitString.split('').map(Number);

    digits[0] = digits[0] - 1; // per the official algorithm, the first digit is reduced by 1 before weighting

    const weightedSum = digits.reduce((total, digit, index) => total + digit * weights[index], 0);

    return weightedSum % 89 === 0;
  }


  /* ========================================================================
     7. MOCK reCAPTCHA WIDGET
     This is a visual stand-in for Google's reCAPTCHA, not the real thing —
     hosted pages here can't load scripts from google.com, so this is a
     styled div that mimics the "I'm not a robot" checkbox and blocks
     submission until "verified". Swap this for the real widget once the
     form is hosted on your own domain with a registered site key.
     ======================================================================== */

  const captchaBox = document.getElementById('captcha-checkbox');
  let captchaVerified = false;

  function runCaptchaVerification() {
    if (captchaVerified || captchaBox.classList.contains('loading')) return;

    captchaBox.classList.add('loading');
    captchaBox.setAttribute('aria-checked', 'false');

    // Simulates the brief delay a real verification call would take
    setTimeout(() => {
      captchaBox.classList.remove('loading');
      captchaVerified = true;
      captchaBox.setAttribute('aria-checked', 'true');
      clearFieldError('captcha');
    }, 800);
  }

  captchaBox.addEventListener('click', runCaptchaVerification);

  // Keyboard support: the widget uses role="checkbox" on a <div>, which isn't
  // natively focusable/operable the way a real <input type="checkbox"> is,
  // so Enter and Space need to be wired up by hand.
  captchaBox.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      runCaptchaVerification();
    }
  });


  /* ========================================================================
     8. FIELD VALIDATORS
     One function per field. Each returns an empty string ('') if the field
     is valid, or an error message string if it isn't.
     ======================================================================== */

  const validators = {

    personalEmail: () => {
      const value = document.getElementById('p-email').value.trim();
      if (isBlank(value)) return 'Enter your email address.';
      return REGEX.EMAIL.test(value) ? '' : 'Enter an email address in the format name@example.com.';
    },

    personalPhone: () => {
      // Optional field — only validated if the person entered something
      const value = document.getElementById('p-phone').value.trim();
      if (value.length === 0) return '';
      const digitsOnly = value.replace(/[\s()-]/g, '');
      return REGEX.AU_PHONE.test(digitsOnly)
        ? ''
        : 'Enter a valid Australian phone number, e.g. 0412 345 678 or (02) 1234 5678.';
    },

    abn: () => {
      const digitsOnly = abnInput.value.replace(/\D/g, '');
      if (isBlank(digitsOnly)) return 'Enter your ABN.';
      if (!REGEX.ABN_DIGITS.test(digitsOnly)) return 'ABN must be 11 digits.';
      return isValidAbnChecksum(digitsOnly) ? '' : 'Enter a valid ABN — the number you entered doesn\'t pass the ABN checksum.';
    },

    hasPolicy: () => {
      const selected = document.querySelector('input[name="hasPolicy"]:checked');
      return selected ? '' : 'Select whether your company has a health and safety policy.';
    },

    policyFile: () => {
      // Conditionally required: only mandatory while the "Yes" branch is visible
      if (!policyYes.checked) return '';
      return selectedPolicyFile ? '' : 'Attach a copy of your health and safety policy.';
    },

    hasHsr: () => {
      const selected = document.querySelector('input[name="hasHsr"]:checked');
      return selected ? '' : 'Select whether your company has a health and safety representative.';
    },

    hsrDetails: () => {
      // Conditionally required: only mandatory while the "Yes" branch is visible
      if (!hsrYes.checked) return '';
      const value = document.getElementById('hsr-details').value;
      return isBlank(value) ? 'Provide details for your health and safety representative.' : '';
    },

    captcha: () => {
      return captchaVerified ? '' : 'Complete the verification step.';
    }
  };

  // Human-readable labels used in the error summary (e.g. "Email: Enter your email address.")
  const fieldLabels = {
    personalEmail: 'Email',
    personalPhone: 'Phone',
    abn: 'ABN',
    hasPolicy: 'Health and safety policy',
    policyFile: 'Policy attachment',
    hasHsr: 'Health and safety representative',
    hsrDetails: 'HSR details',
    captcha: 'Verification'
  };


  /* ========================================================================
     9. VALIDATION & ERROR-DISPLAY HELPERS
     ======================================================================== */

  // Single source of truth mapping each validator key to its actual input id
  // and error-message id. Several keys don't follow a simple "key + '-error'"
  // pattern (e.g. personalEmail's input is #p-email, not #personalEmail),
  // so every lookup below goes through this map instead of guessing the id.
  const FIELD_ELEMENTS = {
    personalEmail: { input: 'p-email', error: 'p-email-error' },
    personalPhone: { input: 'p-phone', error: 'p-phone-error' },
    abn: { input: 'b-abn', error: 'b-abn-error' },
    hasPolicy: { input: null, error: 'hasPolicy-error' },       // radio group: no single input to point to
    policyFile: { input: 'policy-file', error: 'policyFile-error' },
    hasHsr: { input: null, error: 'hasHsr-error' },              // radio group: no single input to point to
    hsrDetails: { input: 'hsr-details', error: 'hsrDetails-error' },
    captcha: { input: 'captcha-checkbox', error: 'captcha-error' }
  };

  // Shows or clears a field's inline error message, and toggles aria-invalid
  // on its input so assistive tech announces the invalid state too.
  function setFieldError(key, message) {
    const ids = FIELD_ELEMENTS[key];
    const errorEl = ids ? document.getElementById(ids.error) : null;
    if (!errorEl) return;

    if (message) {
      errorEl.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>' +
          '<path d="M12 7V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
          '<circle cx="12" cy="16.5" r="1" fill="currentColor"/>' +
        '</svg>' +
        '<span>' + message + '</span>';
      errorEl.classList.add('visible');
    } else {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }

    const inputEl = ids && ids.input ? document.getElementById(ids.input) : null;
    if (inputEl) {
      if (message) inputEl.setAttribute('aria-invalid', 'true');
      else inputEl.removeAttribute('aria-invalid');
    }
  }

  function clearFieldError(key) {
    setFieldError(key, '');
  }

  // Runs one field's validator, updates its on-page error message, and
  // returns the message ('' means the field is valid).
  function validateField(key) {
    const validatorFn = validators[key];
    if (!validatorFn) return '';

    const message = validatorFn();
    setFieldError(key, message);
    return message;
  }

  // Runs every field's validator and collects the ones that failed,
  // for display in the error summary at the top of the form.
  function validateAll() {
    const allKeys = ['personalEmail', 'personalPhone', 'abn', 'hasPolicy', 'policyFile', 'hasHsr', 'hsrDetails', 'captcha'];
    const errors = [];

    allKeys.forEach(key => {
      const message = validateField(key);
      if (message) {
        errors.push({ key, message, label: fieldLabels[key] });
      }
    });

    return errors;
  }

  // Returns the element to focus when someone clicks an error-summary link.
  function focusTargetFor(key) {
    // Radio-group keys focus their first option, since there's no single "the" input to jump to.
    if (key === 'hasPolicy') return document.getElementById('policy-yes');
    if (key === 'hasHsr') return document.getElementById('hsr-yes');

    const ids = FIELD_ELEMENTS[key];
    return ids && ids.input ? document.getElementById(ids.input) : null;
  }

  // Renders the list of errors at the top of the form and moves focus to it,
  // so screen reader users hear about the problem immediately.
  function showErrorSummary(errors) {
    errorSummaryList.innerHTML = '';

    errors.forEach(error => {
      const listItem = document.createElement('li');
      const link = document.createElement('a');

      link.href = '#';
      link.textContent = error.label + ': ' + error.message;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const target = focusTargetFor(error.key);
        if (target) target.focus();
      });

      listItem.appendChild(link);
      errorSummaryList.appendChild(listItem);
    });

    errorSummary.classList.add('visible');
    errorSummary.focus();
  }

  function hideErrorSummary() {
    errorSummary.classList.remove('visible');
    errorSummaryList.innerHTML = '';
  }


  /* ========================================================================
     10. EVENT WIRING
     ======================================================================== */

  // Live validation on blur: catch mistakes the moment someone tabs away
  // from a field, rather than waiting until they hit submit.
  const blurValidatedFields = [
    { inputId: 'p-email', validatorKey: 'personalEmail' },
    { inputId: 'p-phone', validatorKey: 'personalPhone' },
    { inputId: 'b-abn', validatorKey: 'abn' },
    { inputId: 'hsr-details', validatorKey: 'hsrDetails' }
  ];

  blurValidatedFields.forEach(({ inputId, validatorKey }) => {
    document.getElementById(inputId).addEventListener('blur', () => validateField(validatorKey));
  });

  policyRadios.forEach(radio => radio.addEventListener('change', () => validateField('hasPolicy')));
  hsrRadios.forEach(radio => radio.addEventListener('change', () => validateField('hasHsr')));

  // Full validation on submit — the authoritative check, since blur events
  // can be skipped entirely (e.g. pasting a value and clicking submit directly).
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideErrorSummary();

    const errors = validateAll();
    if (errors.length > 0) {
      showErrorSummary(errors);
      return;
    }

    // NOTE: This simulates a submission. No data is actually sent anywhere —
    // see the conversation history / README for how to wire this up to a
    // real endpoint (Formspree, Netlify Forms, your own backend, etc).
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    setTimeout(() => {
      const referenceNumber = 'CR-' + Math.floor(100000 + Math.random() * 900000);
      document.getElementById('ref-number').textContent = referenceNumber;

      form.classList.add('hidden');
      successPanel.classList.add('visible');
      successPanel.focus();

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit registration';
    }, 500);
  });

  // "Start a new registration" button on the success panel: resets
  // everything back to a blank, untouched form.
  document.getElementById('new-report-btn').addEventListener('click', () => {
    form.reset();

    selectedPolicyFile = null;
    renderPolicyFileList();
    policyWrap.hidden = true;
    hsrWrap.hidden = true;

    captchaVerified = false;
    captchaBox.setAttribute('aria-checked', 'false');

    Object.keys(fieldLabels).forEach(clearFieldError);

    successPanel.classList.remove('visible');
    form.classList.remove('hidden');

    document.getElementById('p-name').focus();
  });

})();
