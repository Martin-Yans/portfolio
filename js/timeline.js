document.addEventListener('DOMContentLoaded', () => {

    const timelineContainer = document.querySelector('.timeline-container');

    /**
     * Charge les données de la timeline depuis le fichier JSON
     * et génère les éléments HTML correspondants.
     */
    const loadTimelineData = async () => {
        try {
            const response = await fetch('data/timeline.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            data.forEach((item, index) => {
                const side = index % 2 === 0 ? 'left' : 'right';
                const timelineItem = createTimelineItem(item, side);
                timelineContainer.appendChild(timelineItem);
            });

            // Une fois les éléments ajoutés, on active l'animation au scroll
            setupScrollAnimation();
            setupCenterHighlight();

        } catch (error) {
            console.error("Impossible de charger les données de la timeline:", error);
            timelineContainer.innerHTML = "<p class='error'>Impossible de charger le parcours. Veuillez réessayer plus tard.</p>";
        }
    };

    /**
     * Crée un élément de la timeline.
     * @param {object} item - L'objet contenant les données de l'élément.
     * @param {string} side - Le côté où afficher l'élément ('left' or 'right').
     * @returns {HTMLElement} L'élément HTML de la timeline.
     */
    const createTimelineItem = (item, side) => {
        const itemElement = document.createElement('div');
        // Ajoute une classe pour l'animation et le positionnement
        itemElement.className = `timeline-item timeline-item-${side} reveal`; 

        let statusHtml = '';
        if (item.status) {
            const statusClass = `status-${item.status.toLowerCase().replace(/\s+/g, '-')}`;
            statusHtml = `<span class="timeline-badge ${statusClass}">${item.status}</span>`;
        }

        let imageHtml = '';
        if (item.image) {
            imageHtml = `<img src="${item.image}" alt="" class="timeline-img">`;
        }

        let subtitleHtml = '';
        if (item.subtitle) {
            subtitleHtml = `<h4 class="timeline-subtitle">${item.subtitle}</h4>`;
        }

        let descriptionHtml = '';
        if (Array.isArray(item.description)) {
            descriptionHtml = `<ul class="timeline-list">
                ${item.description.map(desc => `<li>${desc}</li>`).join('')}
            </ul>`;
        } else if (item.description) {
            descriptionHtml = `<p>${item.description}</p>`;
        }

        itemElement.innerHTML = `
            <div class="timeline-content">
                <span class="timeline-date">${item.date}</span>
                <h3>${item.title}</h3>
                ${subtitleHtml}
                ${descriptionHtml}
                ${statusHtml}
            </div>
            ${imageHtml}
        `;
        return itemElement;
    };

    /**
     * Configure l'Intersection Observer pour animer les éléments
     * lorsqu'ils deviennent visibles à l'écran.
     */
    const setupScrollAnimation = () => {
        const elementsToReveal = document.querySelectorAll('.reveal');

        const observerOptions = {
            root: null, // observe par rapport au viewport
            rootMargin: '0px',
            threshold: 0.1 // se déclenche quand 10% de l'élément est visible
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // On arrête d'observer l'élément une fois qu'il est visible
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        elementsToReveal.forEach(element => {
            observer.observe(element);
        });
    };

    const setupCenterHighlight = () => {
        const timelineItems = Array.from(timelineContainer.querySelectorAll('.timeline-item'));
        const mobileViewport = window.matchMedia('(max-width: 699px)');
        let centeredItem = null;
        let frameId = null;

        const updateCenterHighlight = () => {
            let closestItem = null;
            let closestDistance = Infinity;

            if (mobileViewport.matches) {
                const viewportCenter = window.innerHeight / 2;
                timelineItems.forEach(item => {
                    const rect = item.getBoundingClientRect();
                    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

                    const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportCenter);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestItem = item;
                    }
                });
            }

            if (closestItem === centeredItem) return;
            centeredItem?.classList.remove('is-centered');
            closestItem?.classList.add('is-centered');
            centeredItem = closestItem;
        };

        const scheduleUpdate = () => {
            if (frameId !== null) return;
            frameId = requestAnimationFrame(() => {
                frameId = null;
                updateCenterHighlight();
            });
        };

        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate, { passive: true });
        scheduleUpdate();
    };

    // Charge les données au chargement de la page
    if (timelineContainer) {
        loadTimelineData();
    }
});
