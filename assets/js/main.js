(function () {
  'use strict';

  const YOUTUBE_ID = 'fa-DIfjbbPg';
  const THANK_YOU_URL = 'https://alexyanovsky.com/recommendation/thnx/';

  const yearEl = document.getElementById('copyYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const videoCover = document.getElementById('videoCover');
  const playButton = document.getElementById('playButton');

  function playVideo() {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', 'https://www.youtube-nocookie.com/embed/' + YOUTUBE_ID + '?autoplay=1&rel=0');
    iframe.setAttribute('title', 'YouTube video player');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    videoCover.innerHTML = '';
    videoCover.appendChild(iframe);
  }

  if (videoCover && playButton) {
    videoCover.addEventListener('click', playVideo);
  }

  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function readUtm() {
    const params = new URLSearchParams(window.location.search);
    let stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('utm') || '{}'); } catch (e) { stored = {}; }

    const utm = {};
    UTM_KEYS.forEach(function (key) {
      utm[key] = params.get(key) || stored[key] || '';
    });

    try { sessionStorage.setItem('utm', JSON.stringify(utm)); } catch (e) {}
    return utm;
  }

  const utmValues = readUtm();
  UTM_KEYS.forEach(function (key) {
    const input = document.getElementById(
      'utm' + key.replace('utm_', '').replace(/^./, function (c) { return c.toUpperCase(); })
    );
    if (input) input.value = utmValues[key];
  });

  const form = document.getElementById('leadForm');

  function digitsOnly(value) { return (value || '').replace(/\D/g, ''); }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const name = document.getElementById('fieldName').value.trim();
      const email = document.getElementById('fieldEmail').value.trim();
      const phone = document.getElementById('fieldPhone').value.trim();
      const consent = document.getElementById('fieldConsent').checked;

      if (!name || !email || digitsOnly(phone).length < 10 || !consent) {
        form.reportValidity();
        return;
      }

      const payload = {
        name: name,
        email: email,
        phone: phone,
        task: 'Контакты МБР+тренинг (ПК1)',
        utm: utmValues,
        page_url: window.location.href,
        submitted_at: new Date().toISOString()
      };

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) submitBtn.setAttribute('disabled', 'disabled');

      console.log('Lead payload (CRM wiring pending):', payload);
      window.location.href = THANK_YOU_URL;
    });
  }

  document.querySelectorAll('.js-scroll-to-form').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = document.getElementById('fieldName');
      if (target) {
        document.getElementById('top').scrollIntoView({ behavior: 'smooth' });
        setTimeout(function () { target.focus({ preventScroll: true }); }, 400);
      }
    });
  });

  const track = document.getElementById('galleryTrack');
  const dotsWrap = document.getElementById('galleryDots');
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');

  if (track && dotsWrap) {
    const slides = track.children;
    let index = 0;

    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement('button');
      dot.className = 'gallery__dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Фото ' + (i + 1));
      dot.addEventListener('click', (function (n) { return function () { goTo(n); }; })(i));
      dotsWrap.appendChild(dot);
    }

    function goTo(n) {
      index = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      const dots = dotsWrap.children;
      for (let d = 0; d < dots.length; d++) {
        dots[d].classList.toggle('is-active', d === index);
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(index + 1); });

    track.style.transition = 'transform .4s ease';
  }
})();
