/**
 * POI PHOTO GALLERY — Horizontal carousel with dot pagination
 *
 * Usage:
 * const gallery = new PhotoGallery(photos);
 * const html = gallery.render();
 */

class PhotoGallery {
  constructor(photos = []) {
    this.photos = Array.isArray(photos) ? photos : [];
    this.currentIndex = 0;
  }

  /**
   * Render gallery HTML + embedded styles + JS
   * Returns complete HTML string with styles and interactivity
   */
  render() {
    if (!this.photos || this.photos.length === 0) {
      return this.renderEmpty();
    }

    const galleryId = `gallery-${Date.now()}`;
    const photoUrls = this.photos
      .map(p => p.url || p)
      .filter(url => url && typeof url === 'string');

    if (photoUrls.length === 0) {
      return this.renderEmpty();
    }

    // Single photo: no carousel needed
    if (photoUrls.length === 1) {
      return `
        <div style="
          width: 100%;
          height: 260px;
          border-radius: 12px 12px 0 0;
          overflow: hidden;
          margin-bottom: 16px;
        ">
          <img
            src="${photoUrls[0]}"
            alt="POI photo"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            "
          >
        </div>
      `;
    }

    // Multiple photos: carousel with pagination
    const slides = photoUrls.map((url, idx) => `
      <img
        src="${url}"
        alt="Photo ${idx + 1}"
        class="${galleryId}-slide"
        data-index="${idx}"
        style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: ${idx === 0 ? 'block' : 'none'};
          position: absolute;
          top: 0;
          left: 0;
        "
      >
    `).join('');

    const dots = Array.from({ length: photoUrls.length }, (_, idx) => `
      <button
        class="${galleryId}-dot ${idx === 0 ? 'active' : ''}"
        data-index="${idx}"
        aria-label="Photo ${idx + 1}"
        style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${idx === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)'};
          border: none;
          cursor: pointer;
          margin: 0 4px;
          transition: background 0.3s;
          padding: 0;
        "
      ></button>
    `).join('');

    const html = `
      <div id="${galleryId}" style="
        position: relative;
        width: 100%;
        height: 260px;
        border-radius: 12px 12px 0 0;
        overflow: hidden;
        margin-bottom: 16px;
        background: #000;
      ">
        <!-- Slides -->
        <div style="position: relative; width: 100%; height: 100%;">
          ${slides}
        </div>

        <!-- Pagination dots -->
        <div style="
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0;
          z-index: 10;
          background: rgba(0, 0, 0, 0.3);
          padding: 6px 10px;
          border-radius: 20px;
          backdrop-filter: blur(8px);
        ">
          ${dots}
        </div>

        <!-- Navigation arrows -->
        <button class="${galleryId}-prev" aria-label="Previous" style="
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9;
          backdrop-filter: blur(8px);
          transition: background 0.2s;
        ">←</button>

        <button class="${galleryId}-next" aria-label="Next" style="
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9;
          backdrop-filter: blur(8px);
          transition: background 0.2s;
        ">→</button>
      </div>

      <script>
        (function() {
          const galleryId = '${galleryId}';
          let currentIndex = 0;
          const totalPhotos = ${photoUrls.length};

          function showSlide(index) {
            // Wrap around
            currentIndex = (index + totalPhotos) % totalPhotos;

            // Update slides
            document.querySelectorAll('.' + galleryId + '-slide').forEach((slide, i) => {
              slide.style.display = i === currentIndex ? 'block' : 'none';
            });

            // Update dots
            document.querySelectorAll('.' + galleryId + '-dot').forEach((dot, i) => {
              const isActive = i === currentIndex;
              dot.classList.toggle('active', isActive);
              dot.style.background = isActive
                ? 'rgba(255, 255, 255, 0.9)'
                : 'rgba(255, 255, 255, 0.4)';
            });
          }

          // Previous button
          document.querySelector('.' + galleryId + '-prev')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showSlide(currentIndex - 1);
          });

          // Next button
          document.querySelector('.' + galleryId + '-next')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showSlide(currentIndex + 1);
          });

          // Dot buttons
          document.querySelectorAll('.' + galleryId + '-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
              e.stopPropagation();
              showSlide(parseInt(dot.dataset.index, 10));
            });
          });

          // Keyboard navigation
          document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') showSlide(currentIndex - 1);
            if (e.key === 'ArrowRight') showSlide(currentIndex + 1);
          });
        })();
      </script>
    `;

    return html;
  }

  /**
   * Render empty state when no photos available
   * Elegante stato vuoto con icona categoria o torii
   */
  renderEmpty() {
    return `
      <div style="
        width: 100%;
        height: 260px;
        border-radius: 12px 12px 0 0;
        background: linear-gradient(135deg, rgba(74, 91, 168, 0.08), rgba(74, 91, 168, 0.04));
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        flex-direction: column;
        gap: 12px;
        backdrop-filter: blur(8px);
      ">
        <div style="
          font-size: 56px;
          opacity: 0.6;
          line-height: 1;
        ">⛩️</div>
        <div style="
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          text-align: center;
          font-weight: 500;
        ">
          Nessuna foto disponibile
        </div>
      </div>
    `;
  }
}

// Export
window.PhotoGallery = PhotoGallery;
console.log('[PhotoGallery] Module loaded');
