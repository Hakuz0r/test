'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  initHeroSlider();
  document.querySelectorAll('[data-carousel]').forEach(initCarousel);
  initShop();
  initQA();
  initModals();
  initForms();
  initSubscribe();
  initToTop();
  restoreUser();
});

/* ---------- Хранилище (с защитой от ошибок) ---------- */
const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* хранилище недоступно — работаем без него */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ничего */ }
  }
};

/* ---------- Уведомление ---------- */
let toastTimer;
function showToast(text) {
  const toast = document.querySelector('[data-toast]');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500);
}

/* ---------- Меню: бургер и выпадающий список ---------- */
function initMenu() {
  const burger = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const dropBtn = document.querySelector('[data-dropdown-toggle]');

  burger?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.classList.toggle('is-active', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });

  if (dropBtn) {
    const item = dropBtn.closest('.menu__item--drop');
    dropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = item.classList.toggle('is-open');
      dropBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!item.contains(e.target)) {
        item.classList.remove('is-open');
        dropBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

/* ---------- Главный слайдер ---------- */
function initHeroSlider() {
  const slider = document.querySelector('[data-slider]');
  if (!slider) return;

  const slides = [...slider.querySelectorAll('.hero__slide')];
  const dotsWrap = slider.querySelector('[data-slider-dots]');
  const DELAY = 5000;
  let current = 0;
  let timer;

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero__dot';
    dot.setAttribute('aria-label', `Слайд ${i + 1}`);
    dot.addEventListener('click', () => { goTo(i); restart(); });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === current));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), DELAY);
  }

  slider.querySelector('[data-slider-prev]').addEventListener('click', () => { goTo(current - 1); restart(); });
  slider.querySelector('[data-slider-next]').addEventListener('click', () => { goTo(current + 1); restart(); });
  slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider.addEventListener('mouseleave', restart);

  addSwipe(slider, () => { goTo(current + 1); restart(); }, () => { goTo(current - 1); restart(); });

  goTo(0);
  restart();
}

/* ---------- Карусели (товары, отзывы) ---------- */
function initCarousel(root) {
  const track = root.querySelector('[data-carousel-track]');
  const prev = root.querySelector('[data-carousel-prev]');
  const next = root.querySelector('[data-carousel-next]');
  const items = [...track.children];
  let index = 0;

  const perView = () => {
    const viewport = track.parentElement.offsetWidth;
    const itemWidth = items[0].offsetWidth || viewport;
    return Math.max(1, Math.round(viewport / itemWidth));
  };

  function update() {
    const maxIndex = Math.max(0, items.length - perView());
    index = Math.min(Math.max(index, 0), maxIndex);
    track.style.transform = `translateX(-${index * items[0].offsetWidth}px)`;
    prev.disabled = index === 0;
    next.disabled = index === maxIndex;
  }

  prev.addEventListener('click', () => { index -= 1; update(); });
  next.addEventListener('click', () => { index += 1; update(); });
  addSwipe(root, () => { index += 1; update(); }, () => { index -= 1; update(); });
  window.addEventListener('resize', update);
  update();
}

/* Свайп для тач-устройств */
function addSwipe(el, onLeft, onRight) {
  let startX = 0;
  let startY = 0;
  el.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? onLeft() : onRight();
    }
  });
}

/* ---------- Избранное и корзина ---------- */
function initShop() {
  const favCount = document.querySelector('[data-fav-count]');
  const cartCount = document.querySelector('[data-cart-count]');
  const cartSum = document.querySelector('[data-cart-sum]');

  let favorites = storage.get('ihappy-fav', []);
  let cart = storage.get('ihappy-cart', {});

  function render() {
    favCount.textContent = favorites.length;
    const ids = Object.keys(cart);
    cartCount.textContent = ids.reduce((sum, id) => sum + cart[id].qty, 0);
    cartSum.textContent = ids.reduce((sum, id) => sum + cart[id].qty * cart[id].price, 0);

    document.querySelectorAll('[data-product]').forEach((card) => {
      const id = card.dataset.id;
      card.querySelector('[data-fav]').classList.toggle('is-active', favorites.includes(id));
      card.querySelector('[data-to-cart]').classList.toggle('is-added', Boolean(cart[id]));
    });
  }

  document.addEventListener('click', (e) => {
    const favBtn = e.target.closest('[data-fav]');
    const cartBtn = e.target.closest('[data-to-cart]');
    if (!favBtn && !cartBtn) return;

    const card = e.target.closest('[data-product]');
    const id = card.dataset.id;
    const name = card.querySelector('.product__name').textContent.trim();

    if (favBtn) {
      if (favorites.includes(id)) {
        favorites = favorites.filter((f) => f !== id);
        showToast('Удалено из избранного');
      } else {
        favorites.push(id);
        showToast('Добавлено в избранное');
      }
      storage.set('ihappy-fav', favorites);
    }

    if (cartBtn) {
      const price = Number(card.dataset.price);
      cart[id] = { price, qty: (cart[id]?.qty || 0) + 1 };
      storage.set('ihappy-cart', cart);
      showToast(`«${name}» добавлен в корзину`);
    }

    render();
  });

  render();
}

/* ---------- Вопросы специалисту ---------- */
function initQA() {
  const root = document.querySelector('[data-qa]');
  if (!root) return;

  const items = [...root.querySelectorAll('[data-qa-item]')];
  const pagesWrap = root.querySelector('[data-qa-pages]');
  const allBtn = root.querySelector('[data-qa-all]');
  let current = 0;

  const pages = items.map((_, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qa__page';
    btn.textContent = i + 1;
    btn.addEventListener('click', () => show(i));
    pagesWrap.appendChild(btn);
    return btn;
  });

  function show(i) {
    current = (i + items.length) % items.length;
    items.forEach((item, n) => item.classList.toggle('is-active', n === current));
    pages.forEach((p, n) => p.classList.toggle('is-active', n === current));
  }

  root.querySelector('[data-qa-prev]').addEventListener('click', () => show(current - 1));
  root.querySelector('[data-qa-next]').addEventListener('click', () => show(current + 1));

  allBtn.addEventListener('click', () => {
    const all = root.classList.toggle('is-all');
    allBtn.textContent = all ? 'Свернуть' : 'Показать все';
  });

  show(0);
}

/* ---------- Модальные окна ---------- */
function initModals() {
  let lastFocused = null;

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener.dataset.modalOpen);
      return;
    }
    if (e.target.closest('[data-modal-close]')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  window.openModal = function (name) {
    closeModal(true);
    const modal = document.querySelector(`[data-modal="${name}"]`);
    if (!modal) return;
    lastFocused = lastFocused || document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const input = modal.querySelector('input, textarea');
    setTimeout(() => input?.focus(), 50);
  };

  window.closeModal = function (keepFocus) {
    const opened = document.querySelector('.modal.is-open');
    if (!opened) return;
    opened.classList.remove('is-open');
    opened.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    resetForm(opened.querySelector('form'));
    if (!keepFocus && lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  };

  function resetForm(form) {
    if (!form) return;
    form.reset();
    form.querySelectorAll('.is-error').forEach((el) => el.classList.remove('is-error'));
    form.querySelectorAll('.form__error').forEach((el) => { el.textContent = ''; });
    const success = form.querySelector('.form__success');
    if (success) {
      success.remove();
      [...form.children].forEach((el) => { el.hidden = false; });
    }
  }
}

/* ---------- Валидация форм ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateField(input, form) {
  const value = input.value.trim();
  let error = '';

  if (input.required && !value) {
    error = 'Заполните поле';
  } else if (input.type === 'email' && value && !EMAIL_RE.test(value)) {
    error = 'Введите корректный email';
  } else if (input.minLength > 0 && value.length < input.minLength) {
    error = `Минимум ${input.minLength} символов`;
  } else if (input.dataset.match) {
    const other = form.querySelector(`[name="${input.dataset.match}"]`);
    if (other && value !== other.value.trim()) error = 'Пароли не совпадают';
  }

  input.classList.toggle('is-error', Boolean(error));
  const errorEl = input.parentElement.querySelector('.form__error');
  if (errorEl) errorEl.textContent = error;
  return !error;
}

function initForms() {
  document.querySelectorAll('[data-form]').forEach((form) => {
    const inputs = [...form.querySelectorAll('.form__input')];

    inputs.forEach((input) => {
      input.addEventListener('blur', () => { if (input.value) validateField(input, form); });
      input.addEventListener('input', () => {
        if (input.classList.contains('is-error')) validateField(input, form);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valid = inputs.map((input) => validateField(input, form)).every(Boolean);
      if (!valid) {
        form.querySelector('.is-error')?.focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form));
      const type = form.dataset.form;

      if (type === 'register') {
        setUser({ name: data.name.trim(), email: data.email.trim() });
        closeModal();
        showToast('Регистрация прошла успешно!');
      } else if (type === 'login') {
        const saved = storage.get('ihappy-user', null);
        const name = saved && saved.email === data.email.trim() ? saved.name : data.email.split('@')[0];
        setUser({ name, email: data.email.trim() });
        closeModal();
        showToast('Вы вошли в аккаунт');
      } else if (type === 'question') {
        [...form.children].forEach((el) => { el.hidden = true; });
        const msg = document.createElement('p');
        msg.className = 'form__success';
        msg.textContent = 'Спасибо! Специалист ответит вам на email в течение дня.';
        form.appendChild(msg);
      }
    });
  });
}

/* ---------- Авторизация (демо, без сервера) ---------- */
function setUser(user) {
  storage.set('ihappy-user', user);
  storage.set('ihappy-logged', true);
  renderUser(user);
}

function renderUser(user) {
  const guest = document.querySelector('[data-auth-guest]');
  const logged = document.querySelector('[data-auth-user]');
  guest.hidden = Boolean(user);
  logged.hidden = !user;
  if (user) document.querySelector('[data-user-name]').textContent = user.name;
}

function restoreUser() {
  const user = storage.get('ihappy-user', null);
  renderUser(storage.get('ihappy-logged', false) ? user : null);

  document.querySelector('[data-logout]')?.addEventListener('click', () => {
    storage.set('ihappy-logged', false);
    renderUser(null);
    showToast('Вы вышли из аккаунта');
  });
}

/* ---------- Подписка на рассылку ---------- */
function initSubscribe() {
  const form = document.querySelector('[data-subscribe]');
  if (!form) return;
  const input = form.querySelector('input');
  const msg = form.querySelector('[data-subscribe-msg]');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = EMAIL_RE.test(input.value.trim());
    input.classList.toggle('is-error', !ok);
    msg.classList.toggle('is-error', !ok);
    msg.classList.toggle('is-ok', ok);
    msg.textContent = ok ? 'Вы подписались на рассылку!' : 'Введите корректный email';
    if (ok) form.reset();
  });
}

/* ---------- Кнопка «наверх» ---------- */
function initToTop() {
  const btn = document.querySelector('[data-to-top]');
  if (!btn) return;
  const toggle = () => btn.classList.toggle('is-visible', window.scrollY > 400);
  window.addEventListener('scroll', toggle, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  toggle();
}
