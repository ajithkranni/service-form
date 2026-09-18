(function () {
  "use strict";

  const form = document.getElementById('reg-form');
  const errorSummary = document.getElementById('error-summary');
  const errorSummaryList = document.getElementById('error-summary-list');
  const successPanel = document.getElementById('success-panel');

  // ---- Dynamic show/hide: Health & Safety Policy ----
  const policyRadios = document.querySelectorAll('input[name="hasPolicy"]');
  const policyWrap = document.getElementById('policy-file-wrap');
  const policyYes = document.getElementById('policy-yes');

  policyRadios.forEach(r => r.addEventListener('change', () => {
    const show = policyYes.checked;
    policyWrap.hidden = !show;
    policyYes.setAttribute('aria-expanded', String(show));
    if (!show) {
      document.getElementById('policy-file').value = '';
      selectedPolicyFile = null;
      renderPolicyFileList();
      clearFieldError('policyFile');
    }
    validateField('hasPolicy');
  }));

  // ---- Dynamic show/hide: HSR details ----
  const hsrRadios = document.querySelectorAll('input[name="hasHsr"]');
  const hsrWrap = document.getElementById('hsr-details-wrap');
  const hsrYes = document.getElementById('hsr-yes');

  hsrRadios.forEach(r => r.addEventListener('change', () => {
    const show = hsrYes.checked;
    hsrWrap.hidden = !show;
    hsrYes.setAttribute('aria-expanded', String(show));
    if (!show) {
      document.getElementById('hsr-details').value = '';
      clearFieldError('hsrDetails');
    }
    validateField('hasHsr');
  }));

  // ---- Policy file attachment ----
  const policyFileInput = document.getElementById('policy-file');
  const policyFileList = document.getElementById('policy-file-list');
  let selectedPolicyFile = null;

  policyFileInput.addEventListener('change', () => {
    const file = policyFileInput.files && policyFileInput.files[0];
    if (!file) return;
    if (!REGEX.FILE_TYPE_DOC.test(file.name)) {
      setFieldError('policyFile', '"' + file.name + '" isn\'t an accepted file type. Attach a PDF, DOC or DOCX file.');
      policyFileInput.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldError('policyFile', '"' + file.name + '" is over 10MB.');
      policyFileInput.value = '';
      return;
    }
    selectedPolicyFile = file;
    clearFieldError('policyFile');
    renderPolicyFileList();
  });

  function renderPolicyFileList() {
    policyFileList.innerHTML = '';
    if (!selectedPolicyFile) return;
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = selectedPolicyFile.name + ' (' + Math.round(selectedPolicyFile.size / 1024) + ' KB)';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('aria-label', 'Remove ' + selectedPolicyFile.name);
    removeBtn.addEventListener('click', () => {
      selectedPolicyFile = null;
      policyFileInput.value = '';
      renderPolicyFileList();
    });
    li.appendChild(name);
    li.appendChild(removeBtn);
    policyFileList.appendChild(li);
  }

  // ---- Regex validation library ----
  // Centralised so every field's pattern is defined once and reused by its validator.
  const REGEX = {
    // Mandatory (not-blank) check: fails on empty string or whitespace-only input.
    MANDATORY: /\S+/,

    // RFC-5322-lite email pattern: local-part@domain.tld
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/,

    // Australian phone numbers, tested against the digits-only (+ kept) value:
    // mobile 04XXXXXXXX / +614XXXXXXXX, or landline 0[2378]XXXXXXXX / +61[2378]XXXXXXXX
    AU_PHONE: /^(?:\+?61|0)(?:4\d{8}|[2378]\d{8})$/,

    // Characters allowed while typing a phone number (letters/other symbols rejected outright)
    AU_PHONE_CHARS: /^[0-9\s()+-]*$/,

    // ABN, tested against the digits-only value: exactly 11 digits
    ABN_DIGITS: /^\d{11}$/,

    // ABN display format as the user types it: "XX XXX XXX XXX"
    ABN_DISPLAY: /^\d{2}\s\d{3}\s\d{3}\s\d{3}$/,

    // Accepted file types for the H&S policy upload: .pdf, .doc, .docx only
    FILE_TYPE_DOC: /\.(pdf|docx?)$/i
  };

  function isBlank(value) {
    return !REGEX.MANDATORY.test(value || '');
  }

  // ---- Phone: restrict keystrokes to digits/space/()+- while typing ----
  const phoneInput = document.getElementById('p-phone');
  phoneInput.addEventListener('input', () => {
    if (!REGEX.AU_PHONE_CHARS.test(phoneInput.value)) {
      phoneInput.value = phoneInput.value.replace(/[^0-9\s()+-]/g, '');
    }
  });

  // ---- ABN formatting (XX XXX XXX XXX) ----
  const abnInput = document.getElementById('b-abn');
  abnInput.addEventListener('input', () => {
    let digits = abnInput.value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + ' ' + digits.slice(2);
    if (digits.length > 5) formatted = formatted.slice(0, 6) + ' ' + formatted.slice(6);
    if (digits.length > 8) formatted = formatted.slice(0, 10) + ' ' + formatted.slice(10);
    abnInput.value = formatted;
  });

  // Official ABN checksum (modulus 89) for realistic validation
  function isValidAbnChecksum(digitsStr) {
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    const digits = digitsStr.split('').map(Number);
    digits[0] = digits[0] - 1;
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    return sum % 89 === 0;
  }

  // ---- Mock reCAPTCHA widget ----
  const captchaBox = document.getElementById('captcha-checkbox');
  let captchaVerified = false;

  function runCaptcha() {
    if (captchaVerified || captchaBox.classList.contains('loading')) return;
    captchaBox.classList.add('loading');
    captchaBox.setAttribute('aria-checked', 'false');
    setTimeout(() => {
      captchaBox.classList.remove('loading');
      captchaVerified = true;
      captchaBox.setAttribute('aria-checked', 'true');
      clearFieldError('captcha');
    }, 800);
  }
  captchaBox.addEventListener('click', runCaptcha);
  captchaBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); runCaptcha(); }
  });

  // ---- Validation ----
  const validators = {
    personalEmail: () => {
      // Mandatory field
      const val = document.getElementById('p-email').value.trim();
      if (isBlank(val)) return 'Enter your email address.';
      // Email format
      return REGEX.EMAIL.test(val) ? '' : 'Enter an email address in the format name@example.com.';
    },
    personalPhone: () => {
      // Optional field, but if provided must be a valid Australian number
      const val = document.getElementById('p-phone').value.trim();
      if (val.length === 0) return '';
      const digitsOnly = val.replace(/[\s()-]/g, '');
      return REGEX.AU_PHONE.test(digitsOnly)
        ? ''
        : 'Enter a valid Australian phone number, e.g. 0412 345 678 or (02) 1234 5678.';
    },
    abn: () => {
      // Mandatory field
      const raw = abnInput.value.replace(/\D/g, '');
      if (isBlank(raw)) return 'Enter your ABN.';
      // ABN format: exactly 11 digits
      if (!REGEX.ABN_DIGITS.test(raw)) return 'ABN must be 11 digits.';
      // ABN checksum (modulus 89) on top of the format check
      return isValidAbnChecksum(raw) ? '' : 'Enter a valid ABN — the number you entered doesn\'t pass the ABN checksum.';
    },
    hasPolicy: () => {
      // Mandatory: one of the two radios must be selected
      const checked = document.querySelector('input[name="hasPolicy"]:checked');
      return checked ? '' : 'Select whether your company has a health and safety policy.';
    },
    policyFile: () => {
      // Conditionally mandatory: required only while the "Yes" branch is visible.
      // File type is checked separately, on selection, against REGEX.FILE_TYPE_DOC.
      if (!policyYes.checked) return '';
      return selectedPolicyFile ? '' : 'Attach a copy of your health and safety policy.';
    },
    hasHsr: () => {
      // Mandatory: one of the two radios must be selected
      const checked = document.querySelector('input[name="hasHsr"]:checked');
      return checked ? '' : 'Select whether your company has a health and safety representative.';
    },
    hsrDetails: () => {
      // Conditionally mandatory: required only while the "Yes" branch is visible
      if (!hsrYes.checked) return '';
      const val = document.getElementById('hsr-details').value;
      return isBlank(val) ? 'Provide details for your health and safety representative.' : '';
    },
    captcha: () => {
      return captchaVerified ? '' : 'Complete the verification step.';
    }
  };

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

  function focusTargetFor(key) {
    // Radio-group keys focus their first option rather than a (non-existent) direct input.
    if (key === 'hasPolicy') return document.getElementById('policy-yes');
    if (key === 'hasHsr') return document.getElementById('hsr-yes');
    const ids = FIELD_ELEMENTS[key];
    return ids && ids.input ? document.getElementById(ids.input) : null;
  }

  // Single source of truth mapping each validator key to its actual input id and error-message id.
  // (These intentionally aren't always key + '-suffix' — e.g. personalEmail's input is #p-email —
  // so every lookup goes through this map rather than string-guessing the id.)
  const FIELD_ELEMENTS = {
    personalEmail: { input: 'p-email', error: 'p-email-error' },
    personalPhone: { input: 'p-phone', error: 'p-phone-error' },
    abn: { input: 'b-abn', error: 'b-abn-error' },
    hasPolicy: { input: null, error: 'hasPolicy-error' },
    policyFile: { input: 'policy-file', error: 'policyFile-error' },
    hasHsr: { input: null, error: 'hasHsr-error' },
    hsrDetails: { input: 'hsr-details', error: 'hsrDetails-error' },
    captcha: { input: 'captcha-checkbox', error: 'captcha-error' }
  };

  function setFieldError(key, message) {
    const ids = FIELD_ELEMENTS[key];
    const errorEl = ids ? document.getElementById(ids.error) : null;
    if (!errorEl) return;
    if (message) {
      errorEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 7V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg><span>' + message + '</span>';
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

  function clearFieldError(key) { setFieldError(key, ''); }

  // Returns the validation message ('' if valid) and updates the field's error UI as a side effect.
  function validateField(key) {
    const fn = validators[key];
    if (!fn) return '';
    const message = fn();
    setFieldError(key, message);
    return message;
  }

  ['p-email', 'p-phone', 'b-abn', 'hsr-details'].forEach(id => {
    const el = document.getElementById(id);
    const keyMap = { 'p-email': 'personalEmail', 'p-phone': 'personalPhone', 'b-abn': 'abn', 'hsr-details': 'hsrDetails' };
    el.addEventListener('blur', () => validateField(keyMap[id]));
  });
  policyRadios.forEach(r => r.addEventListener('change', () => validateField('hasPolicy')));
  hsrRadios.forEach(r => r.addEventListener('change', () => validateField('hasHsr')));

  function validateAll() {
    const keys = ['personalEmail', 'personalPhone', 'abn', 'hasPolicy', 'policyFile', 'hasHsr', 'hsrDetails', 'captcha'];
    const errors = [];
    keys.forEach(key => {
      const message = validateField(key);
      if (message) {
        errors.push({ key, message, label: fieldLabels[key] });
      }
    });
    return errors;
  }

  function showErrorSummary(errors) {
    errorSummaryList.innerHTML = '';
    errors.forEach(err => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = err.label + ': ' + err.message;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = focusTargetFor(err.key);
        if (target) target.focus();
      });
      li.appendChild(a);
      errorSummaryList.appendChild(li);
    });
    errorSummary.classList.add('visible');
    errorSummary.focus();
  }

  function hideErrorSummary() {
    errorSummary.classList.remove('visible');
    errorSummaryList.innerHTML = '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hideErrorSummary();
    const errors = validateAll();

    if (errors.length > 0) {
      showErrorSummary(errors);
      return;
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    setTimeout(() => {
      const refNumber = 'CR-' + Math.floor(100000 + Math.random() * 900000);
      document.getElementById('ref-number').textContent = refNumber;
      form.classList.add('hidden');
      successPanel.classList.add('visible');
      successPanel.focus();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit registration';
    }, 500);
  });

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
