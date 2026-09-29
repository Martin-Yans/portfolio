/*
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║              carousel.js — Carousel Logic                                ║
  ╚══════════════════════════════════════════════════════════════════════════╝
*/

export class CarouselController {
  constructor() {
    this.carouselEl = document.querySelector('.carousel');
    if (!this.carouselEl) return;

    this.viewport = this.carouselEl.querySelector('.carousel-track');
    if (!this.viewport) return;

    this.scroller = this.findScrollable(this.viewport);
    this.prevBtn = this.carouselEl.querySelector('.carousel-btn.prev');
    this.nextBtn = this.carouselEl.querySelector('.carousel-btn.next');
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.cachedScrollAmount = null;
    this.isLayoutStable = false;
    this.targetScroll = this.scroller.scrollLeft;
    this.rafId = null;
    this.maxScroll = 0;
    this.isMobile = false;
    this.scrollDuration = 0;
    this.centeredCard = null;

    this.isDragging = false;
    this.dragStartX = 0;
    this.hasDragStarted = false;
    this.lastX = 0;
    this.startX = 0;
    this.lastT = 0;
    this.scrollStartX = 0;
    this.velocity = 0;
    this.clickedCard = null;

    this.friction = 0.99;
    this.minVelocity = 0.5;

    this.init();
    this.recalculateLayout();
  }

  recalculateLayout() {
    this.maxScroll = this.scroller.scrollWidth - this.scroller.clientWidth;
    this.isMobile = window.innerWidth < 1000;
    this.scrollDuration = this.isMobile ? 350 : 300;
    this.updateButtons();
  }

  findScrollable(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      if (cur.scrollWidth > cur.clientWidth) return cur;
      cur = cur.parentElement;
    }
    return el;
  }

  init() {
    this.setupButtons();
    this.setupEventHandlers();
    this.setupResizeObserver();
    requestAnimationFrame(() => this.updateButtons());
  }

  getScrollAmount() {
    const items = Array.from(this.scroller.querySelectorAll('.project-card'));
    if (!items.length) return 0;
    const itemWidth = items[0].offsetWidth;
    const gap = parseInt(getComputedStyle(this.scroller).gap || 16);
    const result = itemWidth + gap;
    this.cachedScrollAmount = result;
    return result;
  }

  handleScrollButton(direction) {
    if (this.prefersReducedMotion) return;
    
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.velocity = 0;
    
    const amount = this.getScrollAmount();
    if (amount === 0) return;
    const newTarget = this.scroller.scrollLeft + direction * amount;
    this.targetScroll = Math.max(0, Math.min(newTarget, this.maxScroll));
    if (Math.abs(this.targetScroll - this.scroller.scrollLeft) > 1) this.startRAF();
  }

  setupButtons() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.handleScrollButton(-1));
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.handleScrollButton(1));
    }
  }

  updateButtons() {
    this.updateCenteredCard();

    const threshold = 5;
    if (this.prevBtn) this.prevBtn.disabled = this.scroller.scrollLeft <= threshold;
    if (this.nextBtn) {
      this.nextBtn.disabled = 
        this.scroller.scrollLeft + this.scroller.clientWidth >= this.scroller.scrollWidth - threshold;
    }
  }

  updateCenteredCard() {
    const cards = Array.from(this.scroller.querySelectorAll('.project-card'));
    if (!cards.length) return;

    const viewportCenter = this.scroller.getBoundingClientRect().left + this.scroller.clientWidth / 2;
    const centeredCard = cards.reduce((closest, card) => {
      const cardRect = card.getBoundingClientRect();
      const closestRect = closest.getBoundingClientRect();
      return Math.abs(cardRect.left + cardRect.width / 2 - viewportCenter)
        < Math.abs(closestRect.left + closestRect.width / 2 - viewportCenter)
        ? card
        : closest;
    });

    if (centeredCard === this.centeredCard) return;
    this.centeredCard?.classList.remove('is-centered');
    centeredCard.classList.add('is-centered');
    this.centeredCard = centeredCard;
  }

  throttledUpdateButtons = (() => {
    let scheduled = false;
    return () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          this.updateButtons();
          scheduled = false;
        });
      }
    };
  })();

  setupEventHandlers() {
    this.viewport.addEventListener('scroll', 
      () => this.throttledUpdateButtons(), 
      { passive: true }
    );
    window.addEventListener('resize', 
      () => this.onResize(), 
      { passive: true }
    );
    this.viewport.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: true });
    window.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: true });
    window.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: true });
  }

  setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      window.addEventListener('load', () => {
        const resizeObserver = new ResizeObserver(() => {
          this.cachedScrollAmount = null;
          this.recalculateLayout();
          this.throttledUpdateButtons();
        });
        resizeObserver.observe(this.viewport);
        resizeObserver.observe(this.scroller);
      }, { once: true });
    }
  }

  onResize() {
    this.cachedScrollAmount = null;
    this.recalculateLayout();
  }

  clamp(value) {
    return Math.max(0, Math.min(value, this.maxScroll));
  }

  easeScroll(t) {
    return Math.sin((t * Math.PI) / 2);
  }

  startRAF() {
    if (this.rafId) return;
    const scrollStartTime = performance.now();
    const scrollStartPosition = this.scroller.scrollLeft;
    const delta = this.targetScroll - scrollStartPosition;

    if (Math.abs(delta) < 1) {
      this.scroller.scrollLeft = this.targetScroll;
      this.updateButtons();
      return;
    }

    const oneOverDuration = 1 / this.scrollDuration;
    let lastScrollLeft = Math.round(scrollStartPosition);

    const step = (now) => {
      const elapsed = now - scrollStartTime;
      if (elapsed >= this.scrollDuration) {
        this.scroller.scrollLeft = this.targetScroll;
        this.rafId = null;
        this.updateButtons();
        return;
      }
      const progress = elapsed * oneOverDuration;
      const eased = this.easeScroll(progress);
      const newScrollLeft = scrollStartPosition + delta * eased;
      const clamped = Math.max(0, Math.min(newScrollLeft, this.maxScroll));
      const rounded = Math.round(clamped);
      if (rounded !== lastScrollLeft) {
        this.scroller.scrollLeft = rounded;
        lastScrollLeft = rounded;
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.carousel-btn') || e.target.closest('a')) return;
    if (!e.target.closest('.carousel-viewport')) return;

    this.clickedCard = e.target.closest('.project-card');
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.hasDragStarted = false;
    this.lastX = e.clientX;
    this.startX = e.clientX;
    this.lastT = performance.now();
    this.scrollStartX = this.scroller.scrollLeft;
    this.velocity = 0;

    if (this.rafId) cancelAnimationFrame(this.rafId);
    try { this.viewport.setPointerCapture(e.pointerId); } catch (_) { }
  }

  onPointerMove(e) {
    if (!this.isDragging) return;
    
    const movedDistance = Math.abs(e.clientX - this.dragStartX);
    if (movedDistance < 5) return;
    
    if (!this.hasDragStarted) {
      this.hasDragStarted = true;
    }

    const now = performance.now();
    const dx = e.clientX - this.lastX;
    const dt = Math.max(1, now - this.lastT);
    if (dt > 0) this.velocity = dx / dt;
    this.lastX = e.clientX;
    this.lastT = now;
    const moved = e.clientX - this.startX;
    this.scroller.scrollLeft = this.clamp(this.scrollStartX - moved);
    this.targetScroll = this.scroller.scrollLeft;
  }

  onPointerUp(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    if (!this.hasDragStarted && this.clickedCard) {
      this.clickedCard.click();
      this.clickedCard = null;
      return;
    }

    this.clickedCard = null;
    
    if (Math.abs(this.velocity) > this.minVelocity) {
      this.applyInertia();
    } else {
      this.updateButtons();
    }
  }

  applyInertia() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    
    const animate = () => {
      this.velocity *= this.friction;
      
      const newScroll = this.scroller.scrollLeft - this.velocity;
      this.scroller.scrollLeft = this.clamp(newScroll);
      
      if (Math.abs(this.velocity) > this.minVelocity) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.velocity = 0;
        this.updateButtons();
      }
    };
    
    this.rafId = requestAnimationFrame(animate);
  }

  cancelAnimation() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
