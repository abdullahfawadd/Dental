(() => {
  'use strict';

  const root = new URL('../', document.currentScript.src);
  const bookingEndpoint = document.currentScript.dataset.bookingEndpoint;
  const request = window.fetch.bind(window);
  const servicePaths = new Set([
    'esthetic-dentistry', 'restorative-dentistry', 'preventive-care', 'beyond-the-smile',
  ]);
  const replayApis = new Set([
    '/api/common-data',
    '/api/main-page',
    '/api/about-page',
    '/api/contact-page',
    '/api/faq-page',
    '/api/laboratory-page',
    '/api/technology-page',
  ]);

  window.fetch = (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    const path = url.pathname.startsWith(root.pathname) ? '/' + url.pathname.slice(root.pathname.length) : url.pathname;
    const method = options?.method ?? (input instanceof Request ? input.method : 'GET');
    if (url.origin === location.origin && replayApis.has(path) && method.toUpperCase() === 'GET') {
      return request(new URL('content' + path.slice(4) + '.json', root), options);
    }
    if (url.origin === location.origin && path === '/api/log-client-error') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    if (url.origin === location.origin && path === '/api/form/footer') {
      return Promise.resolve(new Response(null, { status: 503 }));
    }
    return request(input, options);
  };

  function normalizeServiceLink(link) {
    const slug = link.getAttribute('href');
    if (servicePaths.has(slug)) link.href = new URL('service/' + slug, root).href;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href]').forEach(normalizeServiceLink);
    new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === 'attributes') normalizeServiceLink(change.target);
        for (const node of change.addedNodes) {
          if (node instanceof HTMLAnchorElement) normalizeServiceLink(node);
          if (node instanceof Element) node.querySelectorAll('a[href]').forEach(normalizeServiceLink);
        }
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
  }, { once: true });

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('play', (event) => {
    const video = event.target;
    if (reducedMotion.matches && video instanceof HTMLVideoElement && video.autoplay && video.muted) video.pause();
  }, { capture: true });

  function bookingFields(form) {
    const message = form.querySelector('textarea[name="message"]');
    const [name, phone] = form.querySelectorAll('label.wrap-input input');
    return name && phone && { name, phone, message };
  }

  function setStatus(form, text) {
    let status = form.querySelector('.dental-form-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'dental-form-status';
      status.setAttribute('role', 'status');
      form.append(status);
    }
    status.textContent = text;
    return status;
  }

  function contactLink(status) {
    const contact = document.createElement('a');
    contact.textContent = 'View clinic phone numbers';
    contact.href = new URL('contact', root).href;
    status.append(' ', contact, '.');
  }

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.type === 'tel') {
      input.value = input.value.replace(/\D/g, '').slice(0, 10);
    }
    if (input instanceof HTMLElement) input.removeAttribute('aria-invalid');
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const fields = bookingFields(form);
    if (!fields) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (form.hasAttribute('aria-busy')) return;

    const name = fields.name.value.trim();
    const phone = fields.phone.value.replace(/\D/g, '');
    const locations = [...form.parentElement.querySelectorAll('input[type="radio"]')];
    const selected = locations.find((input) => input.checked);
    const invalid = [
      [name.length < 2, fields.name, 'Enter your name.'],
      [phone.length < 9 || phone.length > 10, fields.phone, 'Enter a valid phone number.'],
      [locations.length && !selected, locations[0], 'Choose a clinic location.'],
    ].find(([failed]) => failed);
    if (invalid) {
      const [, field, message] = invalid;
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      setStatus(form, message);
      return;
    }

    if (!bookingEndpoint) {
      const status = setStatus(form, 'Online booking is unavailable on this site. Call the clinic to book.');
      contactLink(status);
      return;
    }

    const locationName = selected?.labels?.[0]?.textContent.trim() ?? selected?.value ?? '';
    const buttons = [...form.querySelectorAll('button[type="submit"], input[type="submit"]')].filter((button) => !button.disabled);
    form.setAttribute('aria-busy', 'true');
    buttons.forEach((button) => { button.disabled = true; });
    setStatus(form, 'Sending your request…');
    try {
      const response = await request(bookingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, location: locationName, message: fields.message?.value.trim() ?? '' }),
      });
      if (!response.ok) throw new Error('Booking request failed');
      const result = await response.json();
      if (result.accepted !== true) throw new Error('Booking confirmation was missing');
      for (const field of Object.values(fields)) {
        if (field) {
          field.value = '';
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      setStatus(form, 'Your request was sent. The clinic will call you back.');
    } catch {
      const status = setStatus(form, 'Your request could not be sent. Try again or call the clinic.');
      contactLink(status);
    } finally {
      form.removeAttribute('aria-busy');
      buttons.forEach((button) => { button.disabled = false; });
    }
  }, { capture: true });
})();
