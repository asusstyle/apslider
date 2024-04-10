# APSlider
Carousel / Slider - built using vanilla javascript. Library is framework independent and can be used with any framework/ platform.

## Features & Benefits

- Vanilla Javascript based carousel/ slider.
- Uses Javascript ES6 version based Web Component structure.
- Superfast performance, no third-party framework needed.
- Framework independent, use with any framework (react, angular, etc...).
- Very easy to integrate in any framework.
- Fully responsive. Scales with its container.
- Separate settings per breakpoint.
- Uses CSS3. Fully functional.
- Swipe enabled. Or disabled, if you prefer.
- Desktop mouse dragging.
- Infinite looping.
- Fully accessible with arrow key navigation.
- Add, remove, filter & unfilter slides.
- Autoplay, dots, arrows, callbacks, etc...

## Demos & Documentation
Documentation is available @ [https://apslider.devamish.com/](https://apslider.devamish.com/)

# Settings

## accessibility
type: boolean
default: true
- Enables tabbing and arrow key navigation

## adaptiveHeight
type: boolean
default: false
- Enables adaptive height for single slide horizontal carousels

## autoplay
type: boolean
default: false
- Enables Autoplay

## autoplaySpeed
type: int(ms)
default: 3000
- Autoplay Speed in milliseconds

## arrows
type: boolean
default: true
- Prev/Next Arrows

## asNavFor
type: string
default: null
- Set the slider to be the navigation of other slider (Class or ID Name)

## appendArrows
type: string
default: document.querySelector(element)
- Change where the navigation arrows are attached (Selector, htmlString, Array, Element)

## appendDots
type: string
default: document.querySelector(element)
- Change where the navigation dots are attached (Selector, htmlString, Array, Element)

## prevArrow
type: string (html selector) | object (DOM node)
default: &lt;button class="apslider-prev" aria-label="Previous" type="button">Previous&lt;/button>
- Allows you to select a node or customize the HTML for the "Previous" arrow

## nextArrow
type: string (html selector) | object (DOM node)
default: &lt;button class="apslider-next" aria-label="Next" type="button">Next&lt;/button>
- Allows you to select a node or customize the HTML for the "Next" arrow

## centerMode
type: boolean
default: false
- Enables centered view with partial prev/next slides. Use with odd numbered slidesToShow counts

## centerPadding
type: string
default: '50px'
- Side padding when in center mode (px or %)

## cssEase
type: string
default: 'ease'
- CSS3 Animation Easing

## customPaging
type: function
default: n/a
- Custom paging templates. See source for use example

## dots
type: boolean
default: false
- Show dot indicators

## dotsClass
type: string
default: 'apslider-dots'
- Class for slide indicator dots container

## draggable
type: boolean
default: true
- Enable mouse dragging

## fade
type: boolean
default: false
- Enable fade

## focusOnSelect
type: boolean
default: false
- Enable focus on selected element (click)

## easing
type: string
default: 'linear'
- Add easing for jQuery animate. Use with easing libraries or default easing methods

## edgeFriction
type: integer
default: 0.15
- Resistance when swiping edges of non-infinite carousels

## infinite
type: boolean
default: true
- Infinite loop sliding

## initialSlide
type: integer
default: 0
- Slide to start on

## lazyLoad
type: string
default: 'ondemand'
- Set lazy loading technique. Accepts 'ondemand' or 'progressive'

## mobileFirst
type: boolean
default: false
- Responsive settings use mobile first calculation

## pauseOnFocus
type: boolean
default: true
- Pause Autoplay On Focus

## pauseOnHover
type: boolean
default: true
- Pause Autoplay On Hover

## pauseOnDotsHover
type: boolean
default: false
- Pause Autoplay when a dot is hovered

## respondTo
type: string
default: 'window'
- Width that responsive object responds to. Can be 'window', 'slider' or 'min' (the smaller of the two)

## responsive
type: object
default: none
- Object containing breakpoints and settings objects (see demo). Enables settings sets at given screen width. Set settings to "destroyed" instead of an object to disable apslider at a given breakpoint

## rows
type: int
default: 1
- Setting this to more than 1 initializes grid mode. Use slidesPerRow to set how many slides should be in each row

## slide
type: element
default: ''
- Element query to use as slide

## slidesPerRow
type: int
default: 1
- With grid mode intialized via the rows option, this sets how many slides are in each grid row

## slidesToShow
type: int
default: 1
- \# of slides to show

## slidesToScroll
type: int
default: 1
- \# of slides to scroll

## speed
type: int(ms)
default: 300
- Slide/Fade animation speed

## swipe
type: boolean
default: true
- Enable swiping

## swipeToSlide
type: boolean
default: false
- Allow users to drag or swipe directly to a slide irrespective of slidesToScroll

## touchMove
type: boolean
default: true
- Enable slide motion with touch

## touchThreshold
type: int
default: 5
- To advance slides, the user must swipe a length of (1/touchThreshold) * the width of the slider

## variableWidth
type: boolean
default: false
- Variable width slides

## vertical
type: boolean
default: false
- Vertical slide mode

## verticalSwiping
type: boolean
default: false
- Vertical swipe mode

## rtl
type: boolean
default: false
- Change the slider's direction to become right-to-left

## waitForAnimate
type: boolean
default: true
- Ignores requests to advance the slide while animating

## zIndex
type: number
default: 1000
- Set the zIndex values for slides, useful for IE9 and lower