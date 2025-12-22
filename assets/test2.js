/**
 * DoodleGames - Main JavaScript
 * Handles theme toggle, play button, search, ratings, sharing, and Disqus lazy loading
 */

(function() {
    'use strict';

    // Theme Management
    const ThemeManager = {
        init() {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            this.setTheme(savedTheme);

            const toggle = document.getElementById('themeToggle');
            if (toggle) {
                toggle.addEventListener('click', () => this.toggle());
            }
        },

        setTheme(theme) {
            document.body.classList.remove('dark', 'light');
            document.body.classList.add(theme);
            localStorage.setItem('theme', theme);
            this.updateIcons(theme);
        },

        updateIcons(theme) {
            const sunIcon = document.querySelector('.sun-icon');
            const moonIcon = document.querySelector('.moon-icon');
            if (sunIcon && moonIcon) {
                sunIcon.style.display = theme === 'light' ? 'block' : 'none';
                moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
            }
        },

        toggle() {
            const current = document.body.classList.contains('dark') ? 'dark' : 'light';
            const newTheme = current === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        }
    };

    // Play Counter Management
    const PlayCounter = {
        getKey() {
            return 'playCount_' + window.location.pathname;
        },

        get() {
            const key = this.getKey();
            let value = parseInt(localStorage.getItem(key), 10);

            // If no value OR very low value → reset to 45M
            if (!value || value < 45 _000_000) {
                value = 45 _010_000; // your starting number
                localStorage.setItem(key, value.toString());
            }

            return value;
        },


        increment() {
            const count = this.get() + 1;
            localStorage.setItem(this.getKey(), count.toString());
            return count;
        },

        display() {
            const el = document.getElementById('playCount');
            if (!el) return;

            const count = this.get();

            el.textContent = this.formatShort(count);
        },

        formatShort(num) {
            if (num >= 1 _000_000) {
                return (num / 1 _000_000).toFixed(1).replace(/\.0$/, '') + 'M';
            }
            if (num >= 1 _000) {
                return (num / 1 _000).toFixed(1).replace(/\.0$/, '') + 'K';
            }
            return num.toString();
        }


    };

    // Game Iframe Lazy Loading
    const GameLoader = {
        init() {
            const overlay = document.getElementById('playOverlay');
            const playBtn = document.getElementById('playBtn');
            const iframe = document.getElementById('gameIframe');
            const fullscreenBtn = document.getElementById('fullscreenBtn');

            if (overlay && playBtn && iframe) {
                const loadGame = () => {
                    const src = iframe.getAttribute('data-src');
                    if (src) {
                        iframe.src = src;
                        overlay.classList.add('hidden');
                        if (fullscreenBtn) {
                            fullscreenBtn.href = src;
                            fullscreenBtn.classList.add('visible');
                        }
                        PlayCounter.increment();
                        PlayCounter.display();
                    }
                };

                playBtn.addEventListener('click', loadGame);
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) loadGame();
                });
            }

            PlayCounter.display();
        }
    };

    // Star Rating System (Local Storage based)
    const RatingSystem = {
        getKey() {
            return 'rating_' + window.location.pathname;
        },

        getUserRating() {
            return parseInt(localStorage.getItem(this.getKey()) || '0', 10);
        },

        setUserRating(rating) {
            localStorage.setItem(this.getKey(), rating.toString());
        },

        init() {
            const starsContainer = document.getElementById('ratingStars');
            if (!starsContainer) return;

            const stars = starsContainer.querySelectorAll('svg');
            const userRating = this.getUserRating();

            // Display existing rating
            this.updateStars(stars, userRating);

            // Hover effects
            stars.forEach((star, index) => {
                star.addEventListener('mouseenter', () => {
                    this.updateStars(stars, index + 1, true);
                });

                star.addEventListener('mouseleave', () => {
                    this.updateStars(stars, this.getUserRating());
                });

                star.addEventListener('click', () => {
                    const rating = index + 1;
                    this.setUserRating(rating);
                    this.updateStars(stars, rating);
                });
            });
        },

        updateStars(stars, rating, isHover = false) {
            stars.forEach((star, index) => {
                star.classList.remove('filled', 'hovered');
                if (index < rating) {
                    star.classList.add(isHover ? 'hovered' : 'filled');
                }
            });
        }
    };

    // Social Sharing
    const ShareManager = {
        init() {
            document.querySelectorAll('.share-btn').forEach(btn => {
                btn.addEventListener('click', () => this.share(btn.dataset.share));
            });
        },

        share(platform) {
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);

            const urls = {
                facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
                twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
                whatsapp: `https://wa.me/?text=${title}%20${url}`,
                telegram: `https://t.me/share/url?url=${url}&text=${title}`,
                copy: null
            };

            if (platform === 'copy') {
                this.copyToClipboard(window.location.href);
                return;
            }

            if (platform === 'native') {
                if (navigator.share) {
                    navigator.share({ title: document.title, url: window.location.href }).catch(() => {});
                } else {
                    this.copyToClipboard(window.location.href);
                }
                return;
            }

            if (!urls[platform]) return;
            window.open(urls[platform], '_blank', 'width=600,height=400,noopener,noreferrer');
        },

        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                const btn = document.querySelector('[data-share="copy"]');
                if (btn) {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                    }, 2000);
                }
            });
        }
    };

    // Embed Code Copy
    const EmbedManager = {
        init() {
            const copyBtn = document.getElementById('copyEmbed');
            const textarea = document.getElementById('embedCode');

            if (copyBtn && textarea) {
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(textarea.value).then(() => {
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = 'Copied!';
                        copyBtn.classList.add('copied');
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.classList.remove('copied');
                        }, 2000);
                    });
                });
            }
        }
    };

    // Search Functionality (for games list pages only)
    const SearchManager = {
        init() {
            const searchInput = document.getElementById('searchInput');
            const gamesGrid = document.getElementById('gamesGrid');
            const searchResultsInfo = document.getElementById('searchResultsInfo');
            const noResults = document.getElementById('noResults');

            if (!searchInput || !gamesGrid) return;

            const cards = gamesGrid.querySelectorAll('.game-card');

            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filter(e.target.value.toLowerCase().trim(), cards, searchResultsInfo, noResults);
                }, 200);
            });
        },

        filter(query, cards, infoEl, noResultsEl) {
            let visibleCount = 0;

            cards.forEach(card => {
                const title = card.dataset.title.toLowerCase();
                const category = card.dataset.category.toLowerCase();
                const matches = !query || title.includes(query) || category.includes(query);

                card.classList.toggle('hidden', !matches);
                if (matches) visibleCount++;
            });

            // Update results info
            if (infoEl) {
                if (query) {
                    document.getElementById('resultCount').textContent = visibleCount;
                    document.getElementById('searchTerm').textContent = query;
                    infoEl.classList.add('visible');
                } else {
                    infoEl.classList.remove('visible');
                }
            }

            // Show no results message
            if (noResultsEl) {
                noResultsEl.classList.toggle('visible', visibleCount === 0 && query);
            }
        }
    };


    const DisqusManager = {
        loaded: false,
        init() {
            const wrapper = document.getElementById('comments-wrapper');
            const thread = document.getElementById('disqus_thread');
            if (!wrapper || !thread) return;
            const load = () => {
                if (this.loaded) return;
                this.loaded = true;
                const d = document;
                const s = d.createElement('script');
                s.src = 'https://doodlesnake.disqus.com/embed.js';
                s.setAttribute('data-timestamp', +new Date());
                s.async = true;
                (d.head || d.body).appendChild(s);
            };
            if ('IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            load();
                            io.disconnect();
                        }
                    });
                }, { rootMargin: '300px' });
                io.observe(wrapper);
            } else {
                let ticking = false;
                const onScroll = () => {
                    if (ticking) return;
                    ticking = true;
                    requestAnimationFrame(() => {
                        const rect = wrapper.getBoundingClientRect();
                        if (rect.top < (window.innerHeight + 300)) {
                            window.removeEventListener('scroll', onScroll);
                            load();
                        }
                        ticking = false;
                    });
                };
                window.addEventListener('scroll', onScroll, { passive: true });
            }
        }
    };

    // Initialize all modules on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        GameLoader.init();
        RatingSystem.init();
        ShareManager.init();
        EmbedManager.init();
        SearchManager.init();
        DisqusManager.init();
        const PWAManager = {
            installPromptEvent: null,
            init() {
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/sw.js').catch(() => {});
                }
                window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                    this.installPromptEvent = e;
                });
            },
            promptIfAvailable() {
                if (this.installPromptEvent) {
                    const p = this.installPromptEvent.prompt();
                    p && p.catch(() => {});
                    this.installPromptEvent = null;
                }
            }
        };
        PWAManager.init();
        const overlay = document.getElementById('playOverlay');
        const playBtn = document.getElementById('playBtn');
        if (overlay && playBtn) {
            const handler = () => PWAManager.promptIfAvailable();
            playBtn.addEventListener('click', handler);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) handler(); });
        }
    });
})();