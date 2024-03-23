let apSliderInstanceUid = 0;

class APSlider extends HTMLElement {
    constructor() {
        super();

        this.slides = this.children.length ? [...this.children] : [];
        this.settings = {};
        this.dataSettings = JSON.parse(this.getAttribute('data-apslider'));
        this.noInit = this.getAttribute('data-no-init');

        this.originalSlides = null;
        this.activeBreakpoint = null;
        this.animType = null;
        this.animProp = null;
        this.breakpoints = [];
        this.breakpointSettings = [];
        // this.cssTransitions = false;
        this.focussed = false;
        this.interrupted = false;
        this.hide = 'hidden';
        this.paused = true;
        this.positionProp = null;
        this.respondTo = null;
        this.rowCount = 1;
        this.shouldClick = true;
        this.slidesCache = null;
        this.transformType = null;
        this.transitionType = null;
        this.visibilityChange = 'visibilitychange';
        this.windowWidth = 0;
        this.windowTimer = null;
    }

    connectedCallback() {
        this.defaults = {
            accessibility: true,
            adaptiveHeight: false,
            appendArrows: this,
            appendDots: this,
            arrows: true,
            asNavFor: null,
            autoplay: false,
            autoplaySpeed: 3000,
            centerMode: false,
            centerPadding: '50px',
            cssEase: 'ease',
            customPaging: function (slider, i) {
                const btn = this.createElement('button', null, { type: 'button' });
                btn.innerText = i + 1;
                return btn;
            },
            dots: true,
            dotsClass: 'apslider-dots',
            draggable: false,
            easing: 'linear',
            edgeFriction: 0.35,
            fade: false,
            focusOnSelect: false,
            focusOnChange: false,
            infinite: false,
            initialSlide: 0,
            lazyLoad: 'ondemand',
            mobileFirst: false,
            pauseOnHover: true,
            pauseOnFocus: true,
            pauseOnDotsHover: false,
            prevArrow: '<button class="apslider-prev" aria-label="Previous" type="button">Previous</button>',
            nextArrow: '<button class="apslider-next" aria-label="Next" type="button">Next</button>',
            respondTo: 'window',
            responsive: null,
            rows: 1,
            rtl: false,
            slide: '',
            slidesPerRow: 1,
            slidesToShow: 1,
            slidesToScroll: 1,
            speed: 500,
            swipe: true,
            swipeToSlide: false,
            touchMove: true,
            touchThreshold: 5,
            // useCSS: true,
            // useTransform: true,
            variableWidth: false,
            vertical: false,
            verticalSwiping: false,
            waitForAnimate: true,
            zIndex: 1000
        };

        this.initials = {
            animating: false,
            dragging: false,
            autoPlayTimer: null,
            currentDirection: 0,
            currentLeft: null,
            currentSlide: 0,
            direction: 1,
            dots: null,
            listWidth: null,
            listHeight: null,
            loadIndex: 0,
            prevArrow: null,
            nextArrow: null,
            scrolling: false,
            slideCount: null,
            slideWidth: null,
            slideTrack: null,
            sliding: false,
            slideOffset: 0,
            swipeLeft: null,
            swiping: false,
            list: null,
            touchObject: {},
            // transformsEnabled: false,
            destroyed: false
        };

        Object.assign(this, this.initials);

        this.options = { ...this.defaults, ...this.settings, ...this.dataSettings };
        this.currentSlide = this.options.initialSlide;
        this.originalSettings = {...this.options};

        if (typeof document.mozHidden !== 'undefined') {
            this.hide = 'mozHidden';
            this.visibilityChange = 'mozvisibilitychange';
        } else if (typeof document.webkitHidden !== 'undefined') {
            this.hide = 'webkitHidden';
            this.visibilityChange = 'webkitvisibilitychange';
        }

        this.autoPlay = this.autoPlay.bind(this);
        this.autoPlayClear = this.autoPlayClear.bind(this);
        this.autoPlayIterator = this.autoPlayIterator.bind(this);
        this.changeSlide = this.changeSlide.bind(this);
        this.clickHandler = this.clickHandler.bind(this);
        this.selectHandler = this.selectHandler.bind(this);
        this.setPosition = this.setPosition.bind(this);
        this.swipeHandler = this.swipeHandler.bind(this);
        this.keyHandler = this.keyHandler.bind(this);

        this.instanceUid = apSliderInstanceUid++;

        // A simple way to check for HTML strings
        // Strict HTML recognition (must start with <)
        // Extracted from jQuery v1.11 source
        this.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/;

        
        this.basicStyleAppender();
        this.registerBreakpoints();

        if (this.noInit === 'true') return;
        
        this.init(true);
    }

    /**
     * @method toNodeList
     * @param {array} arrayOfNodes - Array of Nodes
     * @returns 
     */
    toNodeList = (arrayOfNodes) => {
        const fragment = document.createDocumentFragment();

        arrayOfNodes.forEach((item) => {
            fragment.appendChild(item.cloneNode());
        });
        return fragment.childNodes;
    };


    /**
     * @method easeInOutQuad
     * @param {number} progress 
     * @returns 
     */
    easeInOutQuad = (progress) => {
        progress /= 0.5;

        if (progress < 1) return 0.5 * progress * progress;
        
        return -0.5 * (--progress * (progress - 2) - 1);
    }

    /**
     * @method animate
     * @param {HTMLElement} element //The DOM element to animate.
     * @param {Object} properties // An object containing CSS properties and their target values to animate to.
     * @param {miliseconds} duration // The duration of the animation in milliseconds.
     * @param {Function} easing //A function that defines the easing algorithm. You can use one of the predefined easing functions like easeInOutQuad, or define your own.
     * @param {Function} callback // (Optional) A function to be called when the animation is complete.
     */
    animate = (element, properties, duration = 1000, easing = this.easeInOutQuad, callback) => {
        const start = performance.now();
        const initialStyles = {};
        const propertyNames = Object.keys(properties);

        propertyNames.forEach(function (propertyName) {
            initialStyles[propertyName] = element.style[propertyName];
        });

        function step(timestamp) {
            const timePassed = timestamp - start;
            let progress = timePassed / duration;

            if (progress > 1) {
                progress = 1;
            }

            const easedProgress = easing(progress);

            propertyNames.forEach(function (propertyName) {
                const initialValue = parseFloat(initialStyles[propertyName]);
                const targetValue = parseFloat(properties[propertyName]);
                const currentValue = initialValue + (targetValue - initialValue) * easedProgress;
                element.style[propertyName] = currentValue + (propertyName === 'opacity' ? '' : 'px');
            });

            if (progress < 1) {
                requestAnimationFrame(step);
            } else if (typeof callback === 'function') {
                callback();
            }
        }

        requestAnimationFrame(step);
    }
    
    cssAppender = (el, styles) => {
        Object.keys(styles).forEach((t) => {
            el.style[t] = styles[t];
        });
    }

    basicStyleAppender = () => {
        const styleTemplate = document.createElement('style');
        styleTemplate.id = 'slider-styles';
        styleTemplate.innerHTML = `
            /* Slider */
            @keyframes l23 {
                100% {
                    transform: rotate(1turn)
                }
            }
            ap-slider {
                display: block;
                position: relative;
                overflow: hidden;
            }
            ap-slider .apslider-loading .apslider-list {
                animation: l23 1s infinite steps(12);
                aspect-ratio: 1;
                background:
                    linear-gradient(0deg, rgb(0 0 0/50%) 30%, #0000 0 70%, rgb(0 0 0/100%) 0) 50%/8% 100%,
                    linear-gradient(90deg, rgb(0 0 0/25%) 30%, #0000 0 70%, rgb(0 0 0/75%) 0) 50%/100% 8%;
                background-repeat: no-repeat;
                border-radius: 50%;
                display: grid;
                width: 50px;
            }
            ap-slider .apslider-loading .apslider-list::before,
            ap-slider .apslider-loading .apslider-list::after {
                background: inherit;
                border-radius: 50%;
                content: "";
                grid-area: 1/1;
                opacity: 0.915;
                transform: rotate(30deg);
            }
            ap-slider .apslider-loading .apslider-list::after {
                opacity: 0.83;
                transform: rotate(60deg);
            }
            /* Arrows */
            ap-slider .apslider-arrow {
                border: none;
                background: transparent;
                cursor: pointer;
                display: block;
                font-size: 0;
                height: 15px;
                line-height: 0;
                padding: 0;
                position: absolute;
                top: calc(50% - var(--dotsHeight)/2);
                transform: translate(0, -50%);
                width: 15px;
                z-index: 10;
            }
            ap-slider .apslider-prev {
                left: 0;
            }
            ap-slider[dir='rtl'] .apslider-prev,
            [dir='rtl'] ap-slider .apslider-prev {
                right: 0;
                left: auto;
            }
            ap-slider[dir='rtl'] .apslider-next:before,
            [dir='rtl'] ap-slider .apslider-next:before,
            ap-slider .apslider-prev:before {
                content: '←';
            }
            ap-slider .apslider-next:before,
            [dir='rtl'] ap-slider .apslider-prev:before,
            ap-slider[dir='rtl'] .apslider-prev:before {
                content: '→';
            }
            ap-slider .apslider-next {
                right: 0;
            }
            ap-slider[dir='rtl'] .apslider-next,
            [dir='rtl'] ap-slider .apslider-next {
                right: auto;
                left: 0;
            }
            ap-slider .apslider-arrow:focus:before,
            ap-slider .apslider-arrow:hover:before {
                opacity: 1;
            }
            ap-slider .apslider-arrow.apslider-disabled:before {
                opacity: .20;
            }
            ap-slider .apslider-disabled {
                pointer-events: none;
            }
            ap-slider .apslider-arrow:before {
                display: block;
                font-size: 15px;
                line-height: 1;
                opacity: .75;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            /* Dots */
            ap-slider .apslider-dotted.apslider-slider {
                margin-bottom: 30px;
            }
            ap-slider .apslider-dots {
                display: block;
                list-style: none;
                margin: 0;
                padding: 0;
                text-align: center;
                width: 100%;
            }
            ap-slider .apslider-dots li {
                cursor: pointer;
                display: inline-block;
                height: 20px;
                margin: 0 5px;
                padding: 0;
                position: relative;
                width: 20px;
            }
            ap-slider .apslider-dots li button {
                background-color: transparent;
                border: 0;
                color: transparent;
                cursor: pointer;
                display: block;
                font-size: 0;
                height: 20px;
                line-height: 0;
                outline: none;
                padding: 5px;
                width: 20px;
            }
            ap-slider .apslider-dots li button:hover,
            ap-slider .apslider-dots li button:focus {
                outline: none;
            }
            ap-slider .apslider-dots li button:hover:before,
            ap-slider .apslider-dots li button:focus:before {
                opacity: 1;
            }
            ap-slider .apslider-dots li button:before {
                content: '•';
                color: black;
                font-size: 10px;
                height: 20px;
                left: 0;
                line-height: 20px;
                opacity: .25;
                position: absolute;
                text-align: center;
                top: 0;
                width: 20px;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            ap-slider .apslider-dots li.apslider-active button:before {
                opacity: .75;
                color: black;
            }
            ap-slider .apslider-list {
                box-sizing: border-box;
                margin: 0 auto;
                max-width: calc(100% - 50px);
                overflow: hidden;
                position: relative;
            }
            ap-slider .apslider-track {
                display: flex;
                position: relative;
            }
            ap-slider.apslider-adaptive-height .apslider-track {
                align-items: flex-start;
            }
            ap-slider .apslider-track .apslider-slide {
                flex: 0 0 auto;
            }
            ap-slider .apslider-track .apslider-slide img {
                height: 100%;
                object-fit: cover;
                width: 100%;
            }
        `;
        if (!document.head.querySelectorAll('#apslider-styles').length) document.head.insertBefore(styleTemplate, document.head.querySelector('link'));
    }

    init = (creation) => {
        const _ = this;

        if (!_.slides.length) return;

        if (!_.classList.contains('apslider-initialized')) {
            _.classList.add('apslider');
            _.classList.add('apslider-initialized');

            _.getAttribute('data-no-init') && _.setAttribute('data-no-init', false);

            _.destroyed = false;

            if (_.options.variableWidth === true) {
                _.options.slidesToShow = _.options.slidesToShow < 2 ? 2 : _.options.slidesToShow;
            }

            _.buildOut();
            _.setProps();
            _.startLoad();
            _.loadSlider();
            _.initializeEvents();            
            _.updateArrows();
            _.updateDots();
            _.checkResponsive(true);
            _.focusHandler();
        }

        _.options.adaptiveHeight ? _.classList.add('apslider-adaptive-height') : _.classList.remove('apslider-adaptive-height');

        if (creation) {
            const triggerInit = new CustomEvent('init', { detail: { apslider: _ } });
            _.dispatchEvent(triggerInit);
        }

        if (_.options.accessibility === true) {
            _.initADA();
        }

        if (_.options.autoplay) {
            _.paused = false;
            _.autoPlay();
        }
    }

    addSlide = (markup, index, addBefore) => {
        const _ = this;

        if (typeof (index) === 'boolean') {
            addBefore = index;
            index = null;
        } else if (index < 0 || (index >= _.slideCount)) {
            return false;
        }

        _.unload();

        if (typeof (index) === 'number') {
            if (index === 0 && _.slides.length === 0) {
                _.slideTrack.append(markup);
            } else if (addBefore) {
                _.slides[index].before(markup);
            } else {
                _.slides[index].after(markup);
            }
        } else {
            if (addBefore === true) {
                _.slideTrack.prepand(markup);
            } else {
                _.slideTrack.append(markup);
            }
        }

        _.slides = _.options.slide ? [..._.slideTrack.querySelectorAll(_.options.slide)] : [..._.slideTrack.childNodes];

        _.slideTrack.childNodes.forEach((item) => {
            item.remove();
        });

        _.slides.forEach((item) => {
            _.slideTrack.appendChild(item);
        })

        _.slides.forEach((element, index) => {
            element.setAttribute('data-slide-index', index);
        });

        _.slidesCache = [..._.slides];

        _.reinit();
    };

    registerBreakpoints = () => {
        const _ = this;
        let breakpoint, currentBreakpoint, l,
            responsiveSettings = _.options.responsive || null;

        if (Array.isArray(responsiveSettings) && responsiveSettings.length) {
            _.respondTo = _.options.respondTo || 'window';

            for (breakpoint in responsiveSettings) {
                l = _.breakpoints.length - 1;

                if (responsiveSettings.hasOwnProperty(breakpoint)) {
                    currentBreakpoint = responsiveSettings[breakpoint].breakpoint;

                    // loop through the breakpoints and cut out any existing
                    // ones with the same breakpoint number, we don't want dupes.
                    while (l >= 0) {
                        if (_.breakpoints[l] && _.breakpoints[l] === currentBreakpoint) {
                            _.breakpoints.splice(l, 1);
                        }
                        l--;
                    }
                    _.breakpoints.push(currentBreakpoint);
                    _.breakpointSettings[currentBreakpoint] = responsiveSettings[breakpoint].settings;
                }
            }
            _.breakpoints.sort((a, b) => ((_.options.mobileFirst) ? a - b : b - a));
        }
    }

    focusHandler = () => {
        const _ = this;

        function triggerFocusBlur(event) {
            event.stopImmediatePropagation();

            const sf = this;

            setTimeout(() => {
                if (_.options.pauseOnFocus) {
                    _.focussed = sf.matches(':focus');
                    _.autoPlay();
                }
            }, 0);
        }

        _.removeEventListener('focus', triggerFocusBlur);
        _.removeEventListener('blur', triggerFocusBlur);
        _.addEventListener('focus', triggerFocusBlur);
        _.addEventListener('blur', triggerFocusBlur);
    }

    filterSlides = (filter) => {
        const _ = this;

        if (filter !== null) {
            _.slidesCache = [..._.slides];
            _.originalSlides = [..._.slides];

            _.unload();

            _.slideTrack.childNodes.forEach((item) => {
                item.remove();
            });

            if (filter === ':even') {
                _.slidesCache = [..._.slidesCache.filter((item, i) => i % 2 === 0)];
            } else if (filter === ':odd') {
                _.slidesCache = [..._.slidesCache.filter((item, i) => i % 2 !== 0)];
            } else {
                const slidesCacheNodes = [..._.slidesCache.filter(item => item.classList.contains(filter))];
                _.slidesCache = [...slidesCacheNodes];
            }

            _.slidesCache.forEach((item) => {
                _.slideTrack.appendChild(item);
            });

            _.reinit(false, _.slidesCache);
        }
    };
    
    getCurrentSlide = () => {
        const _ = this;
        return _.currentSlide;
    };

    getOption = (option) => {
        const _ = this;
        return _.options[option];
    };

    goTo = (slide, dontAnimate) => {
        const _ = this;

        _.changeSlide({
            data: {
                message: 'index',
                index: parseInt(slide)
            }
        }, dontAnimate);
    };

    unFilterSlides = () => {
        const _ = this;

        if (_.slidesCache !== null) {
            _.unload();
            _.slideTrack.childNodes.forEach((item) => {
                item.remove();
            });

            _.slidesCache.forEach((item) => {
                _.slideTrack.appendChild(item);
            });

            _.reinit(false, _.originalSlides);
        }
    };

    unload = () => {
        const _ = this;

        _.querySelectorAll('.apslider-cloned').forEach((item) => {
            item.remove();
        });

        if (_.dots) {
            _.dots.remove();
        }

        if (_.prevArrow && _.htmlExpr.test(_.options.prevArrow)) {
            _.prevArrow.remove();
        }

        if (_.nextArrow && _.htmlExpr.test(_.options.nextArrow)) {
            _.nextArrow.remove();
        }

        _.slides.forEach((item) => {
            item.classList.remove('apslider-slide');
            item.classList.remove('apslider-active');
            item.classList.remove('apslider-visible');
            item.classList.remove('apslider-current');
            item.setAttribute('aria-hidden', 'true');
            item.style.width = '';
        });
    };

    interrupt = (toggle) => {
        const _ = this;

        if (!toggle) {
            _.autoPlay();
        }
        _.interrupted = toggle;
    }

    getAPSlider = () => {
        return this;
    }

    refresh = (initializing) => {
        const _ = this;
        let currentSlide, lastVisibleIndex;

        lastVisibleIndex = _.slideCount - _.options.slidesToShow;

        // in non-infinite sliders, we don't want to go past the
        // last visible index.
        if (!_.options.infinite && (_.currentSlide > lastVisibleIndex)) {
            _.currentSlide = lastVisibleIndex;
        }

        // if less slides than to show, go to start.
        if (_.slideCount <= _.options.slidesToShow) {
            _.currentSlide = 0;
        }

        currentSlide = _.currentSlide;

        _.destroy(true);

        Object.assign(_, _.initials, { currentSlide: currentSlide });
        _.init();

        if (!initializing) {
            _.changeSlide({
                data: {
                    message: 'index',
                    index: currentSlide
                }
            }, false);
        }
    }

    cleanUpEvents = () => {
        const _ = this;

        if (_.options.dots && _.dots !== null) {
            _.dots.querySelector('li').removeEventListener('click', _.changeSlide);
            _.dots.querySelector('li').removeEventListener('mouseenter', _.interrupt.bind(this, true));
            _.dots.querySelector('li').removeEventListener('mouseleave', _.interrupt.bind(this, false));

            if (_.options.accessibility === true) {
                _.dots.removeEventListener('keydown', _.keyHandler);
            }
        }

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.prevArrow && _.prevArrow.removeEventListener('click', _.changeSlide);
            _.nextArrow && _.nextArrow.removeEventListener('click', _.changeSlide);

            if (_.options.accessibility === true) {
                _.prevArrow && _.prevArrow.removeEventListener('keydown', _.keyHandler);
                _.nextArrow && _.nextArrow.removeEventListener('keydown', _.keyHandler);
            }
        }

        _.list.removeEventListener('touchstart', _.swipeHandler);
        _.list.removeEventListener('mousedown', _.swipeHandler);
        _.list.removeEventListener('touchmove', _.swipeHandler);
        _.list.removeEventListener('mousemove', _.swipeHandler);
        _.list.removeEventListener('touchend', _.swipeHandler);
        _.list.removeEventListener('mouseup', _.swipeHandler);
        _.list.removeEventListener('touchcancel', _.swipeHandler);
        _.list.removeEventListener('mouseleave', _.swipeHandler);

        _.list.removeEventListener('click', _.clickHandler);

        document.removeEventListener(_.visibilityChange, _.visibility);

        _.cleanUpSlideEvents();

        if (_.options.accessibility === true) {
            _.list.removeEventListener('keydown', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            _.slideTrack.childNodes.forEach((child) => {
                child.removeEventListener('click', _.selectHandler);
            });
        }

        window.removeEventListener('orientationchange', _.orientationChange);
        window.removeEventListener('resize', _.resize);

        _.slideTrack.querySelectorAll('[draggable]').forEach((item) => {
            item.removeEventListener('dragstart', _.preventDefault);
        });
        window.removeEventListener('load', _.setPosition);
    };

    cleanUpSlideEvents = () => {
        const _ = this;
        _.list.removeEventListener('mouseenter', _.interrupt.bind(this, true));
        _.list.removeEventListener('mouseleave', _.interrupt.bind(this, false));
    };

    destroy = (refresh, breakpoint) => {
        const _ = this;

        _.autoPlayClear();
        _.touchObject = {};

        _.cleanUpEvents();

        _.querySelectorAll('.apslider-cloned').forEach((clone) => {
            clone.remove();
        });

        if (_.dots) {
            _.dots.remove();
        }

        if (_.prevArrow) {
            _.prevArrow.classList.remove('apslider-disabled');
            _.prevArrow.classList.remove('apslider-arrow');
            _.prevArrow.classList.remove('apslider-hidden');
            _.prevArrow.removeAttribute('aria-hidden');
            _.prevArrow.removeAttribute('aria-disabled');
            _.prevArrow.removeAttribute('tabindex');
            _.prevArrow.style.display = '';

            if (_.htmlExpr.test(_.options.prevArrow)) {
                _.prevArrow.remove();
            }
        }

        if (_.nextArrow) {
            _.nextArrow.classList.remove('apslider-disabled');
            _.nextArrow.classList.remove('apslider-arrow');
            _.nextArrow.classList.remove('apslider-hidden');
            _.nextArrow.removeAttribute('aria-hidden');
            _.nextArrow.removeAttribute('aria-disabled');
            _.nextArrow.removeAttribute('tabindex');
            _.nextArrow.style.display = '';

            if (_.htmlExpr.test(_.options.nextArrow)) {
                _.nextArrow.remove();
            }
        }

        if (_.slides) {
            _.slides.forEach(item => {
                item.classList.remove('apslider-slide');
                item.classList.remove('apslider-active');
                item.classList.remove('apslider-center');
                item.classList.remove('apslider-visible');
                item.classList.remove('apslider-current');
                item.removeAttribute('aria-hidden');
                item.removeAttribute('data-slide-index');

                item.style = item.dataset.originalStyling;
            });
        
            _.slideTrack.childNodes.forEach((child) => {
                child.remove();
            });
            _.slideTrack.remove();
            _.list.remove();

            _.slides.forEach((item) => {
                _.append(item);
            })
        }

        _.cleanUpRows();

        _.classList.remove('apslider-slider');
        _.classList.remove('apslider-initialized');
        _.classList.remove('apslider-dotted');
        _.classList.remove('apslider');
        _.getAttribute('data-no-init') && _.setAttribute('data-no-init', true);

        _.destroyed = true;

        if (!refresh) {
            const triggerDestroy = new CustomEvent('destroyed', { detail: { apslider: _, breakpoint } });
            _.dispatchEvent(triggerDestroy);
        }
    }

    cleanUpRows = () => {
        const _ = this;
        let originalSlides;

        if (_.options.rows > 0) {
            originalSlides = [..._.slides];

            originalSlides.forEach(item => {
                item.removeAttribute('style');
            });

            while (_.firstChild) _.removeChild(_.firstChild);

            originalSlides.forEach(item => {
                _.appendChild(item);
            });
        }
    }

    initADA = () => {
        const _ = this,
            numDotGroups = Math.ceil(_.slideCount / _.options.slidesToShow),
            tabControlIndexes = _.getNavigableIndexes().filter((val) => {
                return (val >= 0) && (val < _.slideCount);
            });
        
        [..._.slides, ..._.querySelectorAll('.apslider-cloned')].forEach((item) => {
            item.setAttribute('aria-hidden', true);
            item.setAttribute('tabindex', -1);

            item.querySelectorAll('a, input, button, select').forEach((child) => {
                child.setAttribute('tabindex', -1);
            });
        });

        if (_.dots !== null) {
            const originalSlides = _.querySelectorAll('.apslider-slide:not(.apslider-cloned)');

            originalSlides.forEach((item, i) => {
                const slideControlIndex = tabControlIndexes.indexOf(i);

                item.setAttribute('role', 'tabpanel');
                item.setAttribute('id', `apslider-slide${_.instanceUid}${i}`);
                item.setAttribute('tabindex', -1);

                if (slideControlIndex !== -1) {
                    const ariaButtonControl = `apslider-slide-control${_.instanceUid}${slideControlIndex}`;

                    if (_.querySelectorAll(`#${ariaButtonControl}`).length) {
                        item.setAttribute('aria-describedby', ariaButtonControl);
                    }
                }
            });

            _.dots.setAttribute('role', 'tablist');

            _.dots.querySelectorAll('li').forEach((item, i) => {
                const mappedSlideIndex = tabControlIndexes[i];

                item.setAttribute('role', 'presentation');
                item.querySelector('button').setAttribute('role', 'tab');
                item.querySelector('button').setAttribute('id', `apslider-slide-control${_.instanceUid}${i}`);
                item.querySelector('button').setAttribute('aria-controls', `apslider-slide${_.instanceUid}${mappedSlideIndex}`);
                item.querySelector('button').setAttribute('aria-label', `${i + 1} of ${numDotGroups}`);
                item.querySelector('button').setAttribute('aria-selected', false);
                item.querySelector('button').setAttribute('tabindex', -1);

                if (item.classList.contains('apslider-active')) {
                    item.querySelector('button').setAttribute('aria-selected', true);
                    item.querySelector('button').setAttribute('tabindex', 0);
                }
            });
        }

        for (let i = _.currentSlide, max = i + _.options.slidesToShow; i < max; i++) {
            if (_.options.focusOnChange) {
                _.slides[i]?.setAttribute('tabindex', 0);
            } else {
                _.slides[i]?.removeAttribute('tabindex');
            }
        }

        _.activateADA();
    };

    activateADA = () => {
        const _ = this;
        const activeSlide = _.slideTrack.querySelectorAll('.apslider-active');

        activeSlide.forEach((item) => {
            item.setAttribute('aria-hidden', false);

            item.querySelectorAll('a, input, button, select').forEach((child) => {
                child.setAttribute('tabindex', 0);
            });
        });
    };

    checkResponsive = (initial, forceUpdate) => {
        const _ = this;
        let breakpoint, targetBreakpoint, respondToWidth, triggerBreakpoint = false;
        const sliderWidth = _.clientWidth;
        const windowWidth = window.innerWidth;

        if (_.respondTo === 'window') {
            respondToWidth = windowWidth;
        } else if (_.respondTo === 'slider') {
            respondToWidth = sliderWidth;
        } else if (_.respondTo === 'min') {
            respondToWidth = Math.min(windowWidth, sliderWidth);
        }

        if (_.options.responsive && _.options.responsive.length && _.options.responsive !== null) {
            targetBreakpoint = null;

            for (breakpoint in _.breakpoints) {
                if (_.breakpoints.hasOwnProperty(breakpoint)) {
                    if (_.originalSettings.mobileFirst === false) {
                        if (respondToWidth < _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    } else {
                        if (respondToWidth > _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    }
                }
            }

            if (targetBreakpoint !== null) {
                if (_.activeBreakpoint !== null) {
                    if (targetBreakpoint !== _.activeBreakpoint || forceUpdate) {
                        _.activeBreakpoint = targetBreakpoint;

                        if (_.breakpointSettings[targetBreakpoint] === 'destroyed') {
                            _.destroy(null, targetBreakpoint);
                        } else {
                            _.options = { ..._.originalSettings, ..._.breakpointSettings[targetBreakpoint] };
                            
                            if (initial === true) {
                                _.currentSlide = _.options.initialSlide;
                            }
                            _.refresh(initial);
                        }
                        triggerBreakpoint = targetBreakpoint;
                    }
                } else {
                    _.activeBreakpoint = targetBreakpoint;
                    if (_.breakpointSettings[targetBreakpoint] === 'destroyed') {
                        _.destroy(null, targetBreakpoint);
                    } else {
                        _.options = { ..._.originalSettings, ..._.breakpointSettings[targetBreakpoint] };
                        if (initial === true) {
                            _.currentSlide = _.options.initialSlide;
                        }
                        _.refresh(initial);
                    }
                    triggerBreakpoint = targetBreakpoint;
                }
            } else {
                if (_.activeBreakpoint !== null) {
                    _.activeBreakpoint = null;
                    _.options = {..._.originalSettings};
                    if (initial === true) {
                        _.currentSlide = _.options.initialSlide;
                    }
                    _.refresh(true);
                    triggerBreakpoint = targetBreakpoint;
                }
            }

            // only trigger breakpoints during an actual break. not on initialize.
            if (!initial && triggerBreakpoint !== false) {
                const trgrBreakpoint = new CustomEvent('breakpoint', { detail: { apslider: _, breakpoint: triggerBreakpoint } });
                _.dispatchEvent(trgrBreakpoint);
            }
        }
    }

    postSlide = (index) => {
        const _ = this;

        if (!_.destroyed) {
            const triggerAfterChange = new CustomEvent('afterChange', { detail: { apslider: _, currentSlide: index } });
            _.dispatchEvent(triggerAfterChange);

            _.animating = false;

            if (_.slideCount > _.options.slidesToShow) {
                _.setPosition();
            }
            _.swipeLeft = null;

            if (_.options.autoplay) {
                _.autoPlay();
            }

            if (_.options.accessibility === true) {
                _.initADA();

                if (_.options.focusOnChange) {
                    const currentSlide = _.slides.querySelector(_.slides[_.currentSlide]);
                    currentSlide.setAttribute('tabindex', 0);
                    currentSlide.focus();
                }
            }
        }
    }

    setOption = (opt, val, reload) => {
        /**
         * accepts arguments in format of:
         *
         *  - for changing a single option's value:
         *     .setOption(option, value, refresh)
         *
         *  - for changing a set of responsive options:
         *     .setOption('responsive', [{}, ...], refresh)
         *
         *  - for updating multiple values at once (not responsive)
         *     .setOption({ 'option': value, ... }, refresh)
         */

        const _ = this;
        let l, item, option, value, refresh = false, type;

        if (typeof opt === 'object') {
            option = opt;
            refresh = val;
            type = 'multiple';

        } else if (typeof opt === 'string') {
            option = opt;
            value = val;
            refresh = reload;

            if (opt === 'responsive' && typeof val === 'array') {
                type = 'responsive';

            } else if (typeof val !== 'undefined') {
                type = 'single';

            }
        }

        if (type === 'single') {
            _.options[option] = value;

        } else if (type === 'multiple') {
            option.forEach((val, opt) => {
                _.options[opt] = val;
            });

        } else if (type === 'responsive') {
            for (item in value) {
                if (typeof _.options.responsive !== 'array') {
                    _.options.responsive = [value[item]];
                } else {
                    l = _.options.responsive.length - 1;

                    // loop through the responsive object and splice out duplicates.
                    while (l >= 0) {
                        if (_.options.responsive[l].breakpoint === value[item].breakpoint) {
                            _.options.responsive.splice(l, 1);
                        }
                        l--;
                    }
                    _.options.responsive.push(value[item]);
                }
            }
        }

        if (refresh) {
            _.unload();
            _.reinit();
        }
    };

    changeSlide = (event, dontAnimate) => {
        const _ = this;
        let target = event.currentTarget,
            indexOffset, slideOffset, unevenOffset;

        // If target is a link, prevent default action.
        if (target?.matches('a')) {
            event.preventDefault();
        }

        // If target is not the <li> element (ie: a child), find the <li>.
        if (!target?.matches('li')) {
            target = target?.closest('li');
        }

        unevenOffset = (_.slideCount % _.options.slidesToScroll !== 0);
        indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll;

        switch (event.data.message) {
            case 'previous':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide - slideOffset, false, dontAnimate);
                }
                break;

            case 'next':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide + slideOffset, false, dontAnimate);
                }
                break;

            case 'index':
                const index = event.data.index === 0 ? 0 : event.data.index || Array.prototype.slice.call(_.dots.querySelectorAll('li')).indexOf(target) * _.options.slidesToScroll;

                _.slideHandler(_.checkNavigable(index), false, dontAnimate);
                if (target) {
                    for (const child of target.childNodes) {
                        child.focus();
                    }
                }
                break;

            default:
                return;
        }
    }

    checkNavigable = (index) => {
        const _ = this;
        let navigables, prevNavigable;

        navigables = _.getNavigableIndexes();
        prevNavigable = 0;
        if (index > navigables[navigables.length - 1]) {
            index = navigables[navigables.length - 1];
        } else {
            for (let n in navigables) {
                if (index < navigables[n]) {
                    index = prevNavigable;
                    break;
                }
                prevNavigable = navigables[n];
            }
        }
        return index;
    }

    getNavigableIndexes = () => {
        const _ = this;
        let breakPoint = 0,
            counter = 0,
            indexes = [],
            max;

        if (_.options.infinite === false) {
            max = _.slideCount;
        } else {
            breakPoint = _.options.slidesToScroll * -1;
            counter = _.options.slidesToScroll * -1;
            max = _.slideCount * 2;
        }

        while (breakPoint < max) {
            indexes.push(breakPoint);
            breakPoint = counter + _.options.slidesToScroll;
            counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
        }

        return indexes;
    }

    slideHandler = (index, sync, dontAnimate) => {
        const _ = this;
        let targetSlide, animSlide, oldSlide, slideLeft, targetLeft = null, navTarget;

        sync = sync || false;

        if (_.animating === true && _.options.waitForAnimate === true) {
            return;
        }

        if (_.options.fade === true && _.currentSlide === index) {
            return;
        }

        if (sync === false) {
            _.asNavFor(index);
        }

        targetSlide = index;
        targetLeft = _.getLeft(targetSlide);
        slideLeft = _.getLeft(_.currentSlide);

        _.currentLeft = _.swipeLeft === null ? slideLeft : _.swipeLeft;

        if (_.options.infinite === false && _.options.centerMode === false && (index < 0 || index > _.getDotCount() * _.options.slidesToScroll)) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;
                if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
                    _.animateSlide(slideLeft, () => {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        } else if (_.options.infinite === false && _.options.centerMode === true && (index < 0 || index > (_.slideCount - _.options.slidesToScroll))) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;
                if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
                    _.animateSlide(slideLeft, () => {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        }

        if (_.options.autoplay) {
            clearInterval(_.autoPlayTimer);
        }

        if (targetSlide < 0) {
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = _.slideCount - (_.slideCount % _.options.slidesToScroll);
            } else {
                animSlide = _.slideCount + targetSlide;
            }
        } else if (targetSlide >= _.slideCount) {
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = 0;
            } else {
                animSlide = targetSlide - _.slideCount;
            }
        } else {
            animSlide = targetSlide;
        }

        _.animating = true;

        const triggerBeforeChange = new CustomEvent('beforeChange', { detail: { apslider: _, currentSlide: _.currentSlide, nextSlide: animSlide } });
        _.dispatchEvent(triggerBeforeChange);

        oldSlide = _.currentSlide;
        _.currentSlide = animSlide;

        _.setSlideClasses(_.currentSlide);

        if (_.options.asNavFor) {
            navTarget = _.getNavTarget();

            navTarget.forEach((item) => {
                item.getAPSlider();

                if (item.slideCount >= item.options.slidesToShow) {
                    item.setSlideClasses(_.currentSlide);
                }
            });
        }

        _.updateDots();
        _.updateArrows();

        if (_.options.fade === true) {
            if (dontAnimate !== true) {
                _.fadeSlideOut(oldSlide);

                _.fadeSlide(animSlide, () => {
                    _.postSlide(animSlide);
                });

            } else {
                _.postSlide(animSlide);
            }
            _.animateHeight();
            return;
        }

        if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
            _.animateSlide(targetLeft, () => {
                _.postSlide(animSlide);
            });
        } else {
            _.postSlide(animSlide);
        }
    }

    next = () => {
        const _ = this;

        _.changeSlide({
            data: {
                message: 'next'
            }
        });
    };

    pause = () => {
        const _ = this;

        _.autoPlayClear();
        _.paused = true;
    };

    play = () => {
        const _ = this;

        _.autoPlay();
        _.options.autoplay = true;
        _.paused = false;
        _.focussed = false;
        _.interrupted = false;
    };

    prev = () => {
        const _ = this;

        _.changeSlide({
            data: {
                message: 'previous'
            }
        });
    };

    preventDefault = (event) => {
        event.preventDefault();
    };

    reinit = (extrnalReinit, originalSlides) => {
        const _ = this;

        if (extrnalReinit) _.options = { ..._.options, ..._.settings };

        _.slides = _.options.slide ? [..._.slideTrack.querySelectorAll(_.options.slide)] : originalSlides ? [...originalSlides] : [..._.slides];
        _.slideCount = _.slides.length;

        if (_.currentSlide >= _.slideCount && _.currentSlide !== 0) {
            _.currentSlide = _.currentSlide - _.options.slidesToScroll;
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.currentSlide = 0;
        }

        _.registerBreakpoints();
        _.setProps();
        /**
         * TODO: Work on fixing reinit function
         *
        _.setupInfinite();
        _.buildArrows();
        _.updateArrows();
        _.initArrowEvents();
        _.buildDots();
        _.updateDots();
        _.initDotEvents();
        _.cleanUpSlideEvents();
        _.initSlideEvents();

        _.checkResponsive(false, true);

        if (_.options.focusOnSelect === true) {
            _.slideTrack.childNodes.forEach((item) => {
                item.addEventListener('click', _.selectHandler);
            });
        }

        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        _.setPosition();
        _.focusHandler();

        _.paused = !_.options.autoplay;
        _.autoPlay();
        /**
         * END
         */

        _.destroy(true);
        _.init(false);

        const reInitEvent = new CustomEvent('reInit', { detail: { apslider: _ } });
        _.dispatchEvent(reInitEvent);
    };

    removeSlide = (index, removeBefore, removeAll) => {
        const _ = this;

        if (typeof index === 'boolean') {
            removeBefore = index;
            index = removeBefore === true ? 0 : _.slideCount - 1;
        } else {
            index = removeBefore === true ? --index : index;
        }

        if (_.slideCount < 1 || index < 0 || index > _.slideCount - 1) {
            return false;
        }

        _.unload();

        if (removeAll === true) {
            _.slideTrack.childNodes.forEach((item) => {
                item.remove();
            });
        } else {
            _.options.slide
                ? _.slideTrack.querySelectorAll(_.options.slide)[index].remove()
                : _.slideTrack.childNodes[index].remove();
        }

        _.slides = _.options.slide ? [..._.slideTrack.querySelectorAll(_.options.slide)] : [..._.slideTrack.childNodes];

        _.slidesCache = [..._.slides];

        _.reinit();
    };

    animateHeight = () => {
        const _ = this;

        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            const targetHeight = _.slides[_.currentSlide].clientHeight;

            _.animate(_.list, { height: `${targetHeight}px` }, _.options.speed);
        }
    }

    disableTransition = (slide) => {
        const _ = this,
            transition = {};

        transition[_.transitionType] = '';

        if (_.options.fade === false) {
            _.cssAppender(_.slideTrack, transition);
        } else {
            _.cssAppender(_.slides[slide], transition);
        }
    }

    fadeSlide = (slideIndex, callback) => {
        const _ = this;

        // if (_.cssTransitions === false) {
        //     _.slides[slideIndex].style['z-index'] = _.options.zIndex;
        //     _.animate(_.slides[slideIndex], { opacity: 1 }, _.options.speed, _.options.easing, callback);
        // } else {
            _.applyTransition(slideIndex);
            _.cssAppender(_.slides[slideIndex], { opacity: 1, zIndex: _.options.zIndex });

            if (callback) {
                setTimeout(() => {
                    _.disableTransition(slideIndex);

                    callback.call();
                }, _.options.speed);
            }
        // }
    }

    fadeSlideOut = (slideIndex) => {
        const _ = this;

        // if (_.cssTransitions === false) {
        //     _.animate(_.slides[slideIndex], { opacity: 0, zIndex: _.options.zIndex - 2 }, _.options.speed, _.options.easing);
        // } else {
            _.applyTransition(slideIndex);
            _.cssAppender(_.slides[slideIndex], { opacity: 0, zIndex: _.options.zIndex - 2 });
        // }
    }

    applyTransition = (slide) => {
        const _ = this,
            transition = {};

        if (_.options.fade === false) {
            transition[_.transitionType] = _.transformType + ' ' + _.options.speed + 'ms ' + _.options.cssEase;
        } else {
            transition[_.transitionType] = 'opacity ' + _.options.speed + 'ms ' + _.options.cssEase;
        }

        if (_.options.fade === false) {
            _.cssAppender(_.slideTrack, transition);
        } else {
            _.cssAppender(_.slides[slide], transition);
        }
    }

    animateSlide = (targetLeft, callback) => {
        const _ = this,
            animProps = {};

        _.animateHeight();

        if (_.options.rtl === true && _.options.vertical === false) {
            targetLeft = -targetLeft;
        }
        // if (_.transformsEnabled === false) {
        //     if (_.options.vertical === false) {
        //         _.animate(_.slideTrack, { left: targetLeft }, _.options.speed, _.options.easing, callback);
        //     } else {
        //         _.animate(_.slideTrack, { top: targetLeft }, _.options.speed, _.options.easing, callback);
        //     }

        // } else {
            // if (_.cssTransitions === false) {
            //     if (_.options.rtl === true) {
            //         _.currentLeft = -(_.currentLeft);
            //     }

            //     _.animate({ animStart: _.currentLeft }, { animStart: targetLeft }, _.options.speed, _.options.easing, callback);
            // } else {
                _.applyTransition();
                targetLeft = Math.ceil(targetLeft);

                if (_.options.vertical === false) {
                    animProps[_.animType] = 'translate3d(' + targetLeft + 'px, 0px, 0px)';
                } else {
                    animProps[_.animType] = 'translate3d(0px,' + targetLeft + 'px, 0px)';
                }

                _.cssAppender(_.slideTrack, animProps);

                if (callback) {
                    setTimeout(() => {
                        _.disableTransition();
                        callback.call();
                    }, _.options.speed);
                }
            // }
        // }
    }

    keyHandler = (event) => {
        const _ = this;

        //Dont slide if the cursor is inside the form fields and arrow keys are pressed
        if (!event.target.tagName.match('TEXTAREA|INPUT|SELECT')) {
            if (event.keyCode === 37 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: _.options.rtl === true ? 'next' : 'previous'
                    }
                });
            } else if (event.keyCode === 39 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: _.options.rtl === true ? 'previous' : 'next'
                    }
                });
            }
        }
    }

    selectHandler = (event) => {
        const _ = this;
        const targetElement = event.target.classList.contains('apslider-slide') ? event.target : event.target.closest('.apslider-slide');
        let index = parseInt(targetElement.getAttribute('data-slide-index'));

        if (!index) index = 0;

        if (_.slideCount <= _.options.slidesToShow) {
            _.slideHandler(index, false, true);
            return;
        }
        _.slideHandler(index);
    }

    clickHandler = (event) => {
        const _ = this;

        if (_.shouldClick === false) {
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
        }
    }

    swipeHandler = (evt) => {
        const _ = this;
        const event = evt.originalEvent ? evt.originalEvent : evt;

        if ((_.options.swipe === false) || ('ontouchend' in document && _.options.swipe === false)) {
            return;
        } else if (_.options.draggable === false && event.type.indexOf('mouse') !== -1) {
            return;
        }

        _.touchObject.fingerCount = event && event.touches !== undefined ? event.touches.length : 1;

        _.touchObject.minSwipe = _.listWidth / _.options.touchThreshold;

        if (_.options.verticalSwiping === true) {
            _.touchObject.minSwipe = _.listHeight / _.options.touchThreshold;
        }

        switch (event.data.action) {
            case 'start':
                _.swipeStart(event);
                break;

            case 'move':
                _.swipeMove(event);
                break;

            case 'end':
                _.swipeEnd(event);
                break;
        }
    }

    getSlideCount = () => {
        const _ = this;
        let slidesTraversed, swipedSlide, centerOffset;

        centerOffset = _.options.centerMode === true ? _.slideWidth * Math.floor(_.options.slidesToShow / 2) : 0;

        if (_.options.swipeToSlide === true) {
            _.slideTrack.querySelectorAll('.apslider-slide').each((index, slide) => {
                if (slide.offsetLeft - centerOffset + (_.querySelector(slide).outerWidth() / 2) > (_.swipeLeft * -1)) {
                    swipedSlide = slide;
                    return false;
                }
            });

            slidesTraversed = Math.abs(_.querySelector(swipedSlide).getAttribute('data-slide-index') - _.currentSlide) || 1;

            return slidesTraversed;

        } else {
            return _.options.slidesToScroll;
        }
    }

    swipeDirection = () => {
        let xDist, yDist, r, swipeAngle, _ = this;

        xDist = _.touchObject.startX - _.touchObject.curX;
        yDist = _.touchObject.startY - _.touchObject.curY;
        r = Math.atan2(yDist, xDist);

        swipeAngle = Math.round(r * 180 / Math.PI);
        if (swipeAngle < 0) {
            swipeAngle = 360 - Math.abs(swipeAngle);
        }
        if ((swipeAngle <= 45) && (swipeAngle >= 0)) {
            return (_.options.rtl === false ? 'left' : 'right');
        }
        if ((swipeAngle <= 360) && (swipeAngle >= 315)) {
            return (_.options.rtl === false ? 'left' : 'right');
        }
        if ((swipeAngle >= 135) && (swipeAngle <= 225)) {
            return (_.options.rtl === false ? 'right' : 'left');
        }
        if (_.options.verticalSwiping === true) {
            if ((swipeAngle >= 35) && (swipeAngle <= 135)) {
                return 'down';
            } else {
                return 'up';
            }
        }
        return 'vertical';
    }

    swipeEnd = (event) => {
        const _ = this;
        let slideCount, direction;

        _.dragging = false;
        _.swiping = false;

        if (_.scrolling) {
            _.scrolling = false;
            return false;
        }

        _.interrupted = false;
        _.shouldClick = (_.touchObject.swipeLength > 10) ? false : true;

        if (_.touchObject.curX === undefined) {
            return false;
        }
        if (_.touchObject.edgeHit === true) {
            const triggerEdge = new CustomEvent('edge', { detail: { apslider: _, direction: _.swipeDirection() } });
            _.dispatchEvent(triggerEdge);
        }
        if (_.touchObject.swipeLength >= _.touchObject.minSwipe) {
            direction = _.swipeDirection();

            switch (direction) {
                case 'left':
                case 'down':
                    slideCount = _.options.swipeToSlide ? _.checkNavigable(_.currentSlide + _.getSlideCount()) : _.currentSlide + _.getSlideCount();

                    _.currentDirection = 0;

                    break;

                case 'right':
                case 'up':
                    slideCount = _.options.swipeToSlide ? _.checkNavigable(_.currentSlide - _.getSlideCount()) : _.currentSlide - _.getSlideCount();

                    _.currentDirection = 1;

                    break;

                default:
            }
            if (direction != 'vertical') {
                _.slideHandler(slideCount);
                _.touchObject = {};

                const triggerSwipe = new CustomEvent('swipe', { detail: { apslider: _, direction } });
                _.dispatchEvent(triggerSwipe);
            }
        } else {
            if (_.touchObject.startX !== _.touchObject.curX) {
                _.slideHandler(_.currentSlide);
                _.touchObject = {};
            }
        }
    }

    swipeMove = (evt) => {
        const _ = this, edgeWasHit = false;
        const event = evt.originalEvent ? evt.originalEvent : evt;
        
        let curLeft, swipeDirection, swipeLength, positionOffset, touches, verticalSwipeLength;

        touches = event !== undefined ? event.touches : null;

        if (!_.dragging || _.scrolling || touches && touches.length !== 1) {
            return false;
        }

        curLeft = _.getLeft(_.currentSlide);

        _.touchObject.curX = touches !== undefined ? touches[0].pageX : event.clientX;
        _.touchObject.curY = touches !== undefined ? touches[0].pageY : event.clientY;

        _.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(_.touchObject.curX - _.touchObject.startX, 2)));

        verticalSwipeLength = Math.round(Math.sqrt(Math.pow(_.touchObject.curY - _.touchObject.startY, 2)));

        if (!_.options.verticalSwiping && !_.swiping && verticalSwipeLength > 4) {
            _.scrolling = true;
            return false;
        }

        if (_.options.verticalSwiping === true) {
            _.touchObject.swipeLength = verticalSwipeLength;
        }

        swipeDirection = _.swipeDirection();

        if (event !== undefined && _.touchObject.swipeLength > 4) {
            _.swiping = true;
            event.preventDefault();
        }

        positionOffset = (_.options.rtl === false ? 1 : -1) * (_.touchObject.curX > _.touchObject.startX ? 1 : -1);
        if (_.options.verticalSwiping === true) {
            positionOffset = _.touchObject.curY > _.touchObject.startY ? 1 : -1;
        }

        swipeLength = _.touchObject.swipeLength;

        _.touchObject.edgeHit = false;

        if (_.options.infinite === false) {
            if ((_.currentSlide === 0 && swipeDirection === 'right') || (_.currentSlide >= _.getDotCount() && swipeDirection === 'left')) {
                swipeLength = _.touchObject.swipeLength * _.options.edgeFriction;
                _.touchObject.edgeHit = true;
            }
        }

        if (_.options.vertical === false) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        } else {
            _.swipeLeft = curLeft + (swipeLength * (_.list.clientHeight / _.listWidth)) * positionOffset;
        }
        if (_.options.verticalSwiping === true) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        }

        if (_.options.fade === true || _.options.touchMove === false) {
            return false;
        }

        if (_.animating === true) {
            _.swipeLeft = null;
            return false;
        }

        _.setCSS(_.swipeLeft);
    }

    swipeStart = (evt) => {
        const _ = this;
        const event = evt.originalEvent ? evt.originalEvent : evt;
        let touches;

        _.interrupted = true;

        if (_.touchObject.fingerCount !== 1 || _.slideCount <= _.options.slidesToShow) {
            _.touchObject = {};
            return false;
        }

        if (event !== undefined && event.touches !== undefined) {
            touches = event.touches[0];
        }

        _.touchObject.startX = _.touchObject.curX = touches !== undefined ? touches.pageX : event.clientX;
        _.touchObject.startY = _.touchObject.curY = touches !== undefined ? touches.pageY : event.clientY;

        _.dragging = true;
    }

    initArrowEvents = () => {
        const _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.prevArrow.removeEventListener('click', _.changeSlide);
            _.prevArrow.addEventListener('click', (e) => {
                e.data = { message: 'previous' };
                _.changeSlide(e);
            });

            _.nextArrow.removeEventListener('click', _.changeSlide);
            _.nextArrow.addEventListener('click', (e) => {
                e.data = { message: 'next' };
                _.changeSlide(e);
            });

            if (_.options.accessibility === true) {
                _.prevArrow.addEventListener('keydown', _.keyHandler);
                _.nextArrow.addEventListener('keydown', _.keyHandler);
            }
        }
    }

    initDotEvents = () => {
        const _ = this;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
            _.dots.querySelectorAll('li').forEach(liItem => {
                liItem.addEventListener('click', (e) => {
                    e.data = { message: 'index' };
                    _.changeSlide(e);
                });
            });

            if (_.options.accessibility === true) {
                _.dots.addEventListener('keydown', _.keyHandler);
            }
        }

        if (_.options.dots === true && _.options.pauseOnDotsHover === true && _.slideCount > _.options.slidesToShow) {
            _.dots.querySelectorAll('li').forEach(liItem => {
                liItem.addEventListener('mouseenter', _.interrupt.bind(_, true));
                liItem.addEventListener('mouseleave', _.interrupt.bind(_, false));
            });
        }
    }

    initSlideEvents = () => {
        const _ = this;

        if (_.options.pauseOnHover) {
            _.list.addEventListener('mouseenter', _.interrupt.bind(_, true));
            _.list.addEventListener('mouseleave', _.interrupt.bind(_, false));
        }
    }

    visibility = () => {
        const _ = this;

        if (_.options.autoplay) {
            if (document[_.hide]) {
                _.interrupted = true;
            } else {
                _.interrupted = false;
            }
        }
    }

    initializeEvents = () => {
        const _ = this;

        _.initArrowEvents();

        _.initDotEvents();
        _.initSlideEvents();

        _.list.addEventListener('touchstart', (e) => {
            e.data = { action: 'start' };
            _.swipeHandler(e);
        });
        _.list.addEventListener('mousedown', (e) => {
            e.data = { action: 'start' };
            _.swipeHandler(e);
        });

        _.list.addEventListener('touchmove', (e) => {
            e.data = { action: 'move' };
            _.swipeHandler(e);
        });
        _.list.addEventListener('mousemove', (e) => {
            e.data = { action: 'move' };
            _.swipeHandler(e);
        });

        _.list.addEventListener('touchend', (e) => {
            e.data = { action: 'end' };
            _.swipeHandler(e);
        });
        _.list.addEventListener('mouseup', (e) => {
            e.data = { action: 'end' };
            _.swipeHandler(e);
        });

        _.list.addEventListener('touchcancel', (e) => {
            e.data = { action: 'end' };
            _.swipeHandler(e);
        });
        _.list.addEventListener('mouseleave', (e) => {
            e.data = { action: 'end' };
            _.swipeHandler(e);
        });

        _.list.addEventListener('click', _.clickHandler);

        this.addEventListener(_.visibilityChange, _.visibility.bind(_));

        if (_.options.accessibility === true) {
            _.list.addEventListener('keydown', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            _.slideTrack.childNodes.forEach(item => {
                item.addEventListener('click', _.selectHandler);
            });
        }

        window.addEventListener('orientationchange', _.orientationChange.bind(_));
        window.addEventListener('resize', _.resize.bind(_));
        _.slideTrack.querySelectorAll('[draggable]').forEach(item => {
            if (item.getAttribute('draggable') != true) {
                item.addEventListener('dragstart', _.preventDefault);
            }
        });

        window.addEventListener('load', _.setPosition);
        
        // TODO:
        // $(_.setPosition);
    }

    orientationChange = () => {
        const _ = this;

        _.checkResponsive();
        _.setPosition();
    }

    resize = () => {
        const _ = this;

        if (window.innerWidth !== _.windowWidth) {
            clearTimeout(_.windowDelay);
            _.windowDelay = window.setTimeout(() => {
                _.windowWidth = window.innerWidth;
                _.checkResponsive();
                if (!_.destroyed) { _.setPosition(); }
            }, 50);
        }
    }

    buildRows = () => {
        const _ = this;
        let a, b, c, newSlides, numOfSlides, originalSlides, slidesPerSection;

        newSlides = document.createDocumentFragment();
        originalSlides = Array.from(_.childNodes).slice();

        if (_.options.rows > 0) {
            slidesPerSection = _.options.slidesPerRow * _.options.rows;
            numOfSlides = Math.ceil(originalSlides.length / slidesPerSection);

            for (a = 0; a < numOfSlides; a++) {
                const slide = this.createElement('div');

                for (b = 0; b < _.options.rows; b++) {
                    const row = this.createElement('div');

                    for (c = 0; c < _.options.slidesPerRow; c++) {
                        const target = (a * slidesPerSection + ((b * _.options.slidesPerRow) + c));

                        originalSlides.forEach(item => {
                            if (item[target]) {
                                row.appendChild(item[target]);
                            }
                        });
                    }
                    slide.appendChild(row);
                }
                newSlides.appendChild(slide);
            }

            while (_.firstChild) _.removeChild(_.firstChild);
            
            newSlides.forEach(item => {
                _.appendChild(item);
            });

            _.querySelectorAll('.apslider-slide').forEach(item => {
                _.cssAppender(item, {
                    width: 100 / _.options.slidesPerRow + '%',
                    display: 'inline-block'
                });
            });
        }
    }

    progressiveLazyLoad = (tryCount) => {
        tryCount = tryCount || 1;

        const _ = this;
        let imgsToLoad = _.querySelectorAll('img[data-lazy]'),
            image,
            imageSource,
            imageSrcSet,
            imageSizes,
            imageToLoad;

        if (imgsToLoad.length) {
            image = imgsToLoad[0];
            imageSource = image.getAttribute('data-lazy');
            imageSrcSet = image.getAttribute('data-srcset');
            imageSizes = image.getAttribute('data-sizes') || _.getAttribute('data-sizes');
            imageToLoad = _.createElement('img');

            imageToLoad.onload = () => {
                if (imageSrcSet) {
                    image.setAttribute('srcset', imageSrcSet);

                    if (imageSizes) {
                        image.setAttribute('sizes', imageSizes);
                    }
                }

                image.setAttribute('src', imageSource);
                image.removeAttribute('data-lazy');
                image.removeAttribute('data-srcset');
                image.removeAttribute('data-sizes');
                image.classList.remove('apslider-loading');

                if (_.options.adaptiveHeight === true) {
                    _.setPosition();
                }
                const triggerLazyLoaded = new CustomEvent('lazyLoaded', { detail: { apslider: _, image, imageSource } });
                _.dispatchEvent(triggerLazyLoaded);
                _.progressiveLazyLoad();
            };

            imageToLoad.onerror = () => {
                if (tryCount < 3) {
                    /**
                     * try to load the image 3 times,
                     * leave a slight delay so we don't get
                     * servers blocking the request.
                     */
                    setTimeout(() => {
                        _.progressiveLazyLoad(tryCount + 1);
                    }, 500);

                } else {
                    image.removeAttribute('data-lazy');
                    image.classList.remove('apslider-loading');
                    image.classList.add('apslider-lazyload-error');

                    const triggerLazyLoadError = new CustomEvent('lazyLoadError', { detail: { apslider: _, image, imageSource } });
                    _.dispatchEvent(triggerLazyLoadError);
                    _.progressiveLazyLoad();
                }
            }
            imageToLoad.src = imageSource;

        } else {
            const triggerAllImagesLoaded = new CustomEvent('allImagesLoaded', { detail: { apslider: _ } });
            _.dispatchEvent(triggerAllImagesLoaded);
        }
    }

    lazyLoad = () => {
        const _ = this;
        let loadRange, cloneRange, rangeStart, rangeEnd;

        function loadImages(imagesScope) {
            imagesScope.forEach(item => {
                if (item.querySelectorAll('img[data-lazy]').length) {
                    const images = item.querySelectorAll('img');

                    images.forEach(image => {
                        const imageSource = image.getAttribute('data-lazy'),
                            imageSrcSet = image.getAttribute('data-srcset'),
                            imageSizes = image.getAttribute('data-sizes') || _.getAttribute('data-sizes'),
                            imageToLoad = _.createElement('img');

                        imageToLoad.onload = () => {
                            _.animate(image, { opacity: 0 }, 100, () => {
                                if (imageSrcSet) {
                                    image.setAttribute('srcset', imageSrcSet);
                                    if (imageSizes) {
                                        image.setAttribute('sizes', imageSizes);
                                    }
                                }
                                image.setAttribute('src', imageSource);
                                _.animate(image, { opacity: 1 }, 200, () => {
                                    image.removeAttribute('data-lazy');
                                    image.removeAttribute('data-srcset');
                                    image.removeAttribute('data-sizes');
                                    image.classList.remove('apslider-loading');
                                });
                                const triggerLazyLoaded = new CustomEvent('lazyLoaded', { detail: { apslider: _, image, imageSource } });
                                _.dispatchEvent(triggerLazyLoaded);
                            });
                        };

                        imageToLoad.onerror = () => {
                            image.removeAttribute('data-lazy');
                            image.classList.remove('apslider-loading');
                            image.classList.add('apslider-lazyload-error');

                            const triggerLazyLoadError = new CustomEvent('lazyLoadError', { detail: { apslider: _, image, imageSource } });
                            _.dispatchEvent(triggerLazyLoadError);
                        };

                        imageToLoad.src = imageSource;
                    });
                }
            });
        }

        if (_.options.centerMode === true) {
            if (_.options.infinite === true) {
                rangeStart = _.currentSlide + (_.options.slidesToShow / 2 + 1);
                rangeEnd = rangeStart + _.options.slidesToShow + 2;
            } else {
                rangeStart = Math.max(0, _.currentSlide - (_.options.slidesToShow / 2 + 1));
                rangeEnd = 2 + (_.options.slidesToShow / 2 + 1) + _.currentSlide;
            }
        } else {
            rangeStart = _.options.infinite ? _.options.slidesToShow + _.currentSlide : _.currentSlide;
            rangeEnd = Math.ceil(rangeStart + _.options.slidesToShow);
            if (_.options.fade === true) {
                if (rangeStart > 0) rangeStart--;
                if (rangeEnd <= _.slideCount) rangeEnd++;
            }
        }
        loadRange = Array.from(_.querySelectorAll('.apslider-slide')).slice(rangeStart, rangeEnd);

        if (_.options.lazyLoad === 'anticipated') {
            const prevSlide = rangeStart - 1,
                nextSlide = rangeEnd,
                slides = _.querySelectorAll('.apslider-slide');

            for (let i = 0; i < _.options.slidesToScroll; i++) {
                if (prevSlide < 0) prevSlide = _.slideCount - 1;
                loadRange = [...loadRange, slides[prevSlide]];
                loadRange = [...loadRange, slides[nextSlide]];
                prevSlide--;
                nextSlide++;
            }
        }

        loadImages(loadRange);

        if (_.slideCount <= _.options.slidesToShow) {
            cloneRange = _.querySelectorAll('.apslider-slide');
            loadImages(cloneRange);
        } else {
            if (_.currentSlide >= _.slideCount - _.options.slidesToShow) {
                cloneRange = Array.from(_.querySelectorAll('.apslider-cloned')).slice(0, _.options.slidesToShow);
                loadImages(cloneRange);
            } else if (_.currentSlide === 0) {
                cloneRange = Array.from(_.querySelectorAll('.apslider-cloned')).slice(_.options.slidesToShow * -1);

                loadImages(cloneRange);
            }
        }
    }

    setSlideClasses = (index) => {
        const _ = this;
        let centerOffset, allSlides, indexOffset, remainder;

        allSlides = Array.from(_.querySelectorAll('.apslider-slide')).map(item => {
            item.classList.remove('apslider-active');
            item.classList.remove('apslider-center');
            item.classList.remove('apslider-current');
            item.setAttribute('aria-hidden', 'true');
            return item;
        });
        this.slides[index].classList.add('apslider-current');

        if (_.options.centerMode === true) {
            const evenCoef = _.options.slidesToShow % 2 === 0 ? 1 : 0;
            centerOffset = Math.floor(_.options.slidesToShow / 2);

            if (_.options.infinite === true) {
                if (index >= centerOffset && index <= (_.slideCount - 1) - centerOffset) {
                    const slides = _.slides.slice(index - centerOffset + evenCoef, index + centerOffset + 1);

                    slides.forEach((item) => {
                        item.classList.add('apslider-active');
                        item.setAttribute('aria-hidden', 'false');
                    });

                } else {
                    indexOffset = _.options.slidesToShow + index;
                    const slides = allSlides.slice(indexOffset - centerOffset + 1 + evenCoef, indexOffset + centerOffset + 2);

                    slides.forEach((item) => {
                        item.classList.add('apslider-active');
                        item.setAttribute('aria-hidden', 'false');
                    });
                }

                if (index === 0) {
                    allSlides[allSlides.length - 1 - _.options.slidesToShow].classList.add('apslider-center');
                } else if (index === _.slideCount - 1) {
                    allSlides[_.options.slidesToShow].classList.add('apslider-center');
                }
            }
            _.slides[index].classList.add('apslider-center');
        } else {
            if (index >= 0 && index <= (_.slideCount - _.options.slidesToShow)) {
                const slides = _.slides.slice(index, index + _.options.slidesToShow);

                slides.forEach((item) => {
                    item.classList.add('apslider-active');
                    item.setAttribute('aria-hidden', 'false');
                });

            } else if (allSlides.length <= _.options.slidesToShow) {
                allSlides.forEach((item) => {
                    item.classList.add('apslider-active');
                    item.setAttribute('aria-hidden', 'false');
                })
            } else {
                remainder = _.slideCount % _.options.slidesToShow;
                indexOffset = _.options.infinite === true ? _.options.slidesToShow + index : index;

                if (_.options.slidesToShow == _.options.slidesToScroll && (_.slideCount - index) < _.options.slidesToShow) {
                    const slides = allSlides.slice(indexOffset - (_.options.slidesToShow - remainder), indexOffset + remainder);

                    slides.forEach((item) => {
                        item.classList.add('apslider-active');
                        item.setAttribute('aria-hidden', 'false');
                    });
                } else {
                    const slides = allSlides.slice(indexOffset, indexOffset + _.options.slidesToShow);

                    slides.forEach((item) => {
                        item.classList.add('apslider-active');
                        item.setAttribute('aria-hidden', 'false');
                    });
                }
            }
        }

        // TODO:
        if (_.options.lazyLoad === 'ondemand' || _.options.lazyLoad === 'anticipated') {
            _.lazyLoad();
        }
    }

    initUI = () => {
        const _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.prevArrow.style.display = 'block';
            _.nextArrow.style.display = 'block';
        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
            _.dots.style.display = 'block';
        }
    }

    getLeft = (slideIndex) => {
        const _ = this;
        let targetLeft,
            verticalHeight,
            verticalOffset = 0,
            targetSlide,
            coef;

        _.slideOffset = 0;
        verticalHeight = _.slides[0].clientHeight;

        if (_.options.infinite === true) {
            if (_.slideCount > _.options.slidesToShow) {
                _.slideOffset = ((_.slideWidth * _.options.slidesToShow) * -1);
                coef = -1;

                if (_.options.vertical === true && _.options.centerMode === true) {
                    if (_.options.slidesToShow === 2) {
                        coef = -1.5;
                    } else if (_.options.slidesToShow === 1) {
                        coef = -2;
                    }
                }
                verticalOffset = (verticalHeight * _.options.slidesToShow) * coef;
            }
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                if (slideIndex + _.options.slidesToScroll > _.slideCount && _.slideCount > _.options.slidesToShow) {
                    if (slideIndex > _.slideCount) {
                        _.slideOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * _.slideWidth) * -1;
                        verticalOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * verticalHeight) * -1;
                    } else {
                        _.slideOffset = ((_.slideCount % _.options.slidesToScroll) * _.slideWidth) * -1;
                        verticalOffset = ((_.slideCount % _.options.slidesToScroll) * verticalHeight) * -1;
                    }
                }
            }
        } else {
            if (slideIndex + _.options.slidesToShow > _.slideCount) {
                _.slideOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * _.slideWidth;
                verticalOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * verticalHeight;
            }
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.slideOffset = 0;
            verticalOffset = 0;
        }

        if (_.options.centerMode === true && _.slideCount <= _.options.slidesToShow) {
            _.slideOffset = ((_.slideWidth * Math.floor(_.options.slidesToShow)) / 2) - ((_.slideWidth * _.slideCount) / 2);
        } else if (_.options.centerMode === true && _.options.infinite === true) {
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2) - _.slideWidth;
        } else if (_.options.centerMode === true) {
            _.slideOffset = 0;
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2);
        }

        if (_.options.centerMode === true) {
            _.slideOffset -= parseInt(_.options.centerPadding);
        }

        if (_.options.vertical === false) {
            targetLeft = ((slideIndex * _.slideWidth) * -1) + _.slideOffset;
        } else {
            targetLeft = ((slideIndex * verticalHeight) * -1) + verticalOffset;
        }

        if (_.options.variableWidth === true) {
            if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                targetSlide = _.slideTrack.querySelectorAll('.apslider-slide')[slideIndex];
            } else {
                targetSlide = _.slideTrack.querySelectorAll('.apslider-slide')[slideIndex + _.options.slidesToShow];
            }

            if (_.options.rtl === true) {
                if (targetSlide[0]) {
                    targetLeft = (_.slideTrack.getBoundingClientRect().width - targetSlide[0].offsetLeft - targetSlide.getBoundingClientRect().width) * -1;
                } else {
                    targetLeft = 0;
                }
            } else {
                targetLeft = targetSlide ? targetSlide.offsetLeft * -1 : 0;
            }

            if (_.options.centerMode === true) {
                if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                    targetSlide = _.slideTrack.querySelectorAll('.apslider-slide')[slideIndex];
                } else {
                    targetSlide = _.slideTrack.querySelectorAll('.apslider-slide')[slideIndex + _.options.slidesToShow + 1];
                }

                if (_.options.rtl === true) {
                    if (targetSlide[0]) {
                        targetLeft = (_.slideTrack.getBoundingClientRect().width - targetSlide[0].offsetLeft - targetSlide.getBoundingClientRect().width) * -1;
                    } else {
                        targetLeft = 0;
                    }
                } else {
                    targetLeft = targetSlide ? targetSlide.offsetLeft * -1 : 0;
                }
                targetLeft += (_.list.getBoundingClientRect().width - targetSlide.clientWidth) / 2;
            }
        }
        return targetLeft;
    }

    setCSS = (position) => {
        const _ = this;
        let positionProps = {}, x, y;

        if (_.options.rtl === true) {
            position = -position;
        }
        x = _.positionProp == 'left' ? Math.ceil(position) + 'px' : '0px';
        y = _.positionProp == 'top' ? Math.ceil(position) + 'px' : '0px';

        positionProps[_.positionProp] = position;

        // if (_.transformsEnabled === false) {
        //     _.cssAppender(_.slideTrack, positionProps);
        // } else {
            positionProps = {};
            // if (_.cssTransitions === false) {
            //     positionProps[_.animType] = 'translate(' + x + ', ' + y + ')';
            // } else {
                positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
            // }
            _.cssAppender(_.slideTrack, positionProps);
        // }
    }

    setFade = () => {
        const _ = this;
        let targetLeft;

        _.slides.forEach((element, index) => {
            targetLeft = (_.slideWidth * index) * -1;

            if (_.options.rtl === true) {
                _.cssAppender(element, { position: 'relative', right: `${targetLeft}px`, top: '0', zIndex: _.options.zIndex - 2, opacity: '0' });
            } else {
                _.cssAppender(element, { position: 'relative', left: `${targetLeft}px`, top: '0', zIndex: _.options.zIndex - 2, opacity: '0' });
            }
        });
        _.cssAppender(_.slides[_.currentSlide], { zIndex: _.options.zIndex - 1, opacity: '1' });
    }

    asNavFor = (index) => {
        const _ = this,
            asNavFor = _.getNavTarget();

        if (asNavFor !== null && typeof asNavFor === 'object') {
            asNavFor.forEach((item) => {
                const target = item.getAPSlider();
                if (!target.destroyed) {
                    target.slideHandler(index, true);
                }
            });
        }
    }

    getNavTarget = () => {
        const _ = this;
        let asNavFor = _.options.asNavFor;

        if (asNavFor && asNavFor !== null) {
            asNavFor = document.querySelectorAll(asNavFor);
        }
        return asNavFor;
    }

    setDimensions = () => {
        const _ = this;

        if (_.options.vertical === false) {
            if (_.options.centerMode === true) {
                _.cssAppender(_.list, { padding: ('0px ' + _.options.centerPadding) });
            }
        } else {
            _.list.style.height = (_.slides[0].clientHeight * _.options.slidesToShow) + 'px';

            if (_.options.centerMode === true) {
                _.cssAppender(_.list, { padding: (_.options.centerPadding + ' 0px') });
            }
        }

        _.listWidth = _.list.getBoundingClientRect().width;
        _.listHeight = _.list.getBoundingClientRect().height;

        if (_.options.vertical === false && _.options.variableWidth === false) {
            _.slideWidth = Math.ceil(_.listWidth / _.options.slidesToShow);
            _.slideTrack.style.width = Math.ceil((_.slideWidth * _.slideTrack.querySelectorAll('.apslider-slide').length)) + 'px';

        } else if (_.options.variableWidth === true) {
            _.slideTrack.style.width = (5000 * _.slideCount) + 'px'
        } else {
            _.slideWidth = Math.ceil(_.listWidth);
            _.slideTrack.style.height = (Math.ceil((_.slides[0].clientHeight * _.slideTrack.querySelectorAll('.apslider-slide').length))) + 'px';
        }

        const offset = _.slides[0].clientWidth - _.slides[0].getBoundingClientRect().width;
        if (_.options.variableWidth === false) {
            _.slideTrack.querySelectorAll('.apslider-slide').forEach(item => {
                item.style.width = (_.slideWidth - offset) + 'px';
            });
        }
    }

    setHeight = () => {
        const _ = this;

        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            const targetHeight = _.slides[_.currentSlide].clientHeight;
            _.list.style.height = targetHeight + 'px';
        }
    }

    setPosition = () => {
        const _ = this;

        _.setDimensions();
        _.setHeight();

        if (_.options.fade === false) {
            _.setCSS(_.getLeft(_.currentSlide));
        } else {
            _.setFade();
        }
        const triggerSetPosition = new CustomEvent('setPosition', { detail: { apslider: _ } });
        _.dispatchEvent(triggerSetPosition);
    }

    loadSlider = () => {
        const _ = this;

        _.setPosition();

        _.slideTrack.style.opacity = 1;
        _.classList.remove('apslider-loading');

        _.initUI();

        if (_.options.lazyLoad === 'progressive') {
            _.progressiveLazyLoad();
        }
    }

    startLoad = () => {
        const _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.prevArrow.style.display = 'none';
            _.nextArrow.style.display = 'none';
        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
            _.dots.style.display = 'none';
        }
        _.classList.add('apslider-loading');
    }

    setProps = () => {
        const _ = this,
            bodyStyle = document.body.style;

        _.positionProp = _.options.vertical === true ? 'top' : 'left';

        if (_.positionProp === 'top') {
            _.classList.add('apslider-vertical');
        } else {
            _.classList.remove('apslider-vertical');
        }

        //NOTE: Disabled non-css transition because as of now each of the css animation properties are supported in all browsers
        // if (bodyStyle.WebkitTransition !== undefined || bodyStyle.MozTransition !== undefined || bodyStyle.msTransition !== undefined) {
        //     if (_.options.useCSS === true) {
        //         _.cssTransitions = true;
        //     }
        // }

        if (_.options.fade) {
            if (typeof _.options.zIndex === 'number') {
                if (_.options.zIndex < 3) {
                    _.options.zIndex = 3;
                }
            } else {
                _.options.zIndex = _.defaults.zIndex;
            }
        }

        // if (bodyStyle.OTransform !== undefined) {
        //     _.animType = 'OTransform';
        //     _.transformType = '-o-transform';
        //     _.transitionType = 'OTransition';
        //     if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        // }
        // if (bodyStyle.MozTransform !== undefined) {
        //     _.animType = 'MozTransform';
        //     _.transformType = '-moz-transform';
        //     _.transitionType = 'MozTransition';
        //     if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) _.animType = false;
        // }
        // if (bodyStyle.webkitTransform !== undefined) {
        //     _.animType = 'webkitTransform';
        //     _.transformType = '-webkit-transform';
        //     _.transitionType = 'webkitTransition';
        //     if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        // }
        // if (bodyStyle.msTransform !== undefined) {
        //     _.animType = 'msTransform';
        //     _.transformType = '-ms-transform';
        //     _.transitionType = 'msTransition';
        //     if (bodyStyle.msTransform === undefined) _.animType = false;
        // }
        // if (bodyStyle.transform !== undefined && _.animType !== false) {
        //     _.animType = 'transform';
        //     _.transformType = 'transform';
        //     _.transitionType = 'transition';
        // }
        _.animType = 'transform';
        _.transformType = 'transform';
        _.transitionType = 'transition';
        // _.transformsEnabled = _.options.useTransform && (_.animType !== null && _.animType !== false);
    }

    getDotCount = () => {
        const _ = this;
        let breakPoint = 0,
            counter = 0,
            pagerQty = 0;

        if (_.options.infinite === true) {
            if (_.slideCount <= _.options.slidesToShow) {
                ++pagerQty;
            } else {
                while (breakPoint < _.slideCount) {
                    ++pagerQty;
                    breakPoint = counter + _.options.slidesToScroll;
                    counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
                }
            }
        } else if (_.options.centerMode === true) {
            pagerQty = _.slideCount;
        } else if (!_.options.asNavFor) {
            pagerQty = 1 + Math.ceil((_.slideCount - _.options.slidesToShow) / _.options.slidesToScroll);
        } else {
            while (breakPoint < _.slideCount) {
                ++pagerQty;
                breakPoint = counter + _.options.slidesToScroll;
                counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
            }
        }
        return pagerQty - 1;
    }

    createElement = (elName, elClass, options) => {
        // create HTML Element
        const el = document.createElement(elName);
        // Add class name(s) on the element
        elClass && el.classList.add(...elClass.split(','));

        // If options available
        if (options) {
            // iterate through the object
            for (const key in options) {
                // if the property is from the object add it on element
                if (Object.prototype.hasOwnProperty.call(options, key)) {
                    if (!key.includes('data-')) el[key] = options[key];
                    if (key.includes('data-')) el.setAttribute(key, options[key]);
                }
            }
        }
        return el;
    }

    autoPlay = () => {
        const _ = this;

        _.autoPlayClear();
        if (_.slideCount > _.options.slidesToShow) {
            _.autoPlayTimer = setInterval(_.autoPlayIterator, _.options.autoplaySpeed);
        }
    }

    autoPlayIterator = () => {
        const _ = this;
        let slideTo = _.currentSlide + _.options.slidesToScroll;

        if (!_.paused && !_.interrupted && !_.focussed) {
            if (_.options.infinite === false) {
                if (_.direction === 1 && (_.currentSlide + 1) === (_.slideCount - 1)) {
                    _.direction = 0;
                }
                else if (_.direction === 0) {
                    slideTo = _.currentSlide - _.options.slidesToScroll;

                    if (_.currentSlide - 1 === 0) {
                        _.direction = 1;
                    }
                }
            }
            _.slideHandler(slideTo);
        }
    }

    autoPlayClear = () => {
        const _ = this;

        if (_.autoPlayTimer) {
            clearInterval(_.autoPlayTimer);
        }
    }

    setupInfinite = () => {
        const _ = this;
        let i, slideIndex, infiniteCount;

        if (_.options.fade === true) {
            _.options.centerMode = false;
        }

        if (_.options.infinite === true && _.options.fade === false) {
            slideIndex = null;

            if (_.slideCount > _.options.slidesToShow) {

                if (_.options.centerMode === true) {
                    infiniteCount = _.options.slidesToShow + 1;
                } else {
                    infiniteCount = _.options.slidesToShow;
                }

                if (_.slideTrack.querySelectorAll('.apslider-cloned').length < 1) {
                    for (i = _.slideCount; i > (_.slideCount - infiniteCount); i -= 1) {
                        slideIndex = i - 1;
    
                        const cloneSlide = _.slides[slideIndex].cloneNode(true);
                        cloneSlide.classList.add('apslider-cloned');
                        cloneSlide.setAttribute('id', '');
                        cloneSlide.setAttribute('data-slide-index', slideIndex - _.slideCount);
                        _.slideTrack.prepend(cloneSlide);
                    }
                    
                    for (i = 0; i < infiniteCount; i += 1) {
                        slideIndex = i;
    
                        const cloneSlide = _.slides[slideIndex].cloneNode(true);
                        cloneSlide.classList.add('apslider-cloned');
                        cloneSlide.setAttribute('id', '');
                        cloneSlide.setAttribute('data-slide-index', slideIndex + _.slideCount);
                        _.slideTrack.append(cloneSlide);
                    }
                }

                _.slideTrack.querySelectorAll('.apslider-cloned').forEach((item) => {
                    item.setAttribute('id', '');
                });
            }
        }
    }

    updateDots = () => {
        const _ = this;

        if (_.dots !== null) {
            _.dots.querySelectorAll('li').forEach(item => {
                item.classList.remove('apslider-active');
            });
            _.dots.querySelectorAll('li')[Math.floor(_.currentSlide / _.options.slidesToScroll)].classList.add('apslider-active');
        }
    }

    buildDots = () => {
        const _ = this;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
            _.classList.add('apslider-dotted');

            const dot = _.createElement('ul', _.options.dotsClass);

            for (let i = 0; i <= _.getDotCount(); i += 1) {
                const li = _.createElement('li');
                li.appendChild(_.options.customPaging.call(this, _, i));
                dot.appendChild(li);
            }

            _.dots = _.options.appendDots.appendChild(dot);
            _.dots.querySelectorAll('li')[0].classList.add('apslider-active');

            _.style.setProperty('--dotsHeight', `${_.dots.getBoundingClientRect().height}px`);
        }
    }

    updateArrows = () => {
        const _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow && !_.options.infinite) {
            _.prevArrow.classList.remove('apslider-disabled');
            _.prevArrow.setAttribute('aria-disabled', 'false');
            _.nextArrow.classList.remove('apslider-disabled');
            _.nextArrow.setAttribute('aria-disabled', 'false');

            if (_.currentSlide === 0) {
                _.prevArrow.classList.add('apslider-disabled');
                _.prevArrow.setAttribute('aria-disabled', 'true');
                _.nextArrow.classList.remove('apslider-disabled');
                _.nextArrow.setAttribute('aria-disabled', 'false');
            } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow && _.options.centerMode === false) {
                _.nextArrow.classList.add('apslider-disabled');
                _.nextArrow.setAttribute('aria-disabled', 'true');
                _.prevArrow.classList.remove('apslider-disabled');
                _.prevArrow.setAttribute('aria-disabled', 'false');
            } else if (_.currentSlide >= _.slideCount - 1 && _.options.centerMode === true) {
                _.nextArrow.classList.add('apslider-disabled');
                _.nextArrow.setAttribute('aria-disabled', 'true');
                _.prevArrow.classList.remove('apslider-disabled');
                _.prevArrow.setAttribute('aria-disabled', 'false');
            }
        }
    }

    buildArrows = () => {
        const _ = this;

        if (_.options.arrows) {
            _.prevArrow = _.createElement('span');
            _.nextArrow = _.createElement('span');

            _.prevArrow.innerHTML = _.options.prevArrow;
            _.nextArrow.innerHTML = _.options.nextArrow;

            _.prevArrow = _.prevArrow.firstChild;
            _.nextArrow = _.nextArrow.firstChild;

            _.prevArrow.classList.add('apslider-arrow');
            _.nextArrow.classList.add('apslider-arrow');
    
            if (_.slideCount > _.options.slidesToShow) {
                _.prevArrow.classList.remove('apslider-hidden');
                _.prevArrow.removeAttribute('aria-hidden');
                _.prevArrow.removeAttribute('tabindex');

                _.nextArrow.classList.remove('apslider-hidden');
                _.nextArrow.removeAttribute('aria-hidden');
                _.nextArrow.removeAttribute('tabindex');

                if (_.htmlExpr.test(_.options.prevArrow)) {
                    _.prepend(_.prevArrow);
                }
                if (_.htmlExpr.test(_.options.nextArrow)) {
                    _.append(_.nextArrow);
                }

                if (_.options.infinite !== true) {
                    _.prevArrow.classList.add('apslider-disabled');
                    _.prevArrow.setAttribute('aria-disabled', true);
                }
            } else {
                _.prevArrow.classList.add('apslider-hidden');
                _.prevArrow.setAttribute('aria-hidden', true);
                _.prevArrow.setAttribute('tabindex', '-1');

                _.nextArrow.classList.add('apslider-hidden');
                _.nextArrow.setAttribute('aria-hidden', true);
                _.nextArrow.setAttribute('tabindex', '-1');
            }
        }
    }

    buildOut = () => {
        const _ = this;
        // Create a new div element to wrap the elements
        const trackWrapper = _.createElement('div', 'apslider-track,slides', { "role": "listbox" });
        const listWrapper = _.createElement('div', 'apslider-list', { "ariaLive": "polite" });
 
        _.slideCount = _.slides.length;

        // Add the slides to the track
        _.slides.forEach((slide, i) => {
            slide.classList.add('apslider-slide');
            slide.setAttribute('data-slide-index', i);
            slide.dataset.originalStyling = slide.getAttribute('style') || '';
            trackWrapper.appendChild(slide);
        });
        
        listWrapper.appendChild(trackWrapper);
        _.appendChild(listWrapper);
        _.classList.add('apslider-slider');

        _.slideTrack = trackWrapper;
        _.list = listWrapper;
        trackWrapper.style.opacity = 0;

        if (_.options.centerMode === true || _.options.swipeToSlide === true) {
            _.options.slidesToScroll = 1;
        }

        _.querySelectorAll('img[data-lazy]:not([src])').forEach(item => {
            item.classList.add('apslider-loading');
        });

        _.setupInfinite();
        _.buildArrows();
        _.buildDots();
        _.updateDots();

        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        if (_.options.draggable === true) {
            _.list.classList.add('draggable');
        }
    }
}

customElements.define('ap-slider', APSlider);