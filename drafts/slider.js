/**
 * Image Slider
 *    based on jQuery framework
  *
 * Blue Fountain Media
 *
 * NOTICE OF LICENSE
 *
 * <notice_of_license>
 *
 * @category    BFM
 * @package     BFM_SLIDER
 * @copyright   Copyright (c) 2014 Blue Fountain Media (http://www.bluefountainmedia.com/). All Rights Reserved.
 * @license     <license_url>
 * @version     0.3.0
 *
 *
 * TODO:
 * - fix rotate/shift animation easing hangs
 */
;
(function($, window){

    /**
     * Create console object if browser doesn't support console output
     *
     */
    if(typeof console == "undefined"){
        console = {
            log: function(msg){
                //alert(msg);
            }
        };
    }

    /**
     * Check if mobile device
     */
    var isMobile = ($.browser && $.browser.mobile) || (/iphone|ipad|ipod|android/i.test(window.navigator.userAgent.toLowerCase()));

    /**
     * Default slider options
     *
     * Internal auto-calculated options:
     * - order
     * - visible
     * - width
     */
    var slider_defaults = {
        "buttonNext": null,         // next slide button: string or jQuery element
        "buttonPrev": null,         // prev slide button: string or jQuery element
        "classDisabled":"disabled", // class for disabled prev-next buttons
        "container":"ul:first",     // sliders container selector or jQuery element
        "easing":"swing",           // [linear|swing] by default. use jquery easing plugin for more effects
        "effect":"change",          // [change|fade|fadeInOut|lift|rotate|slide|shift]
        "effectSwipe":true,         // [false|null|true|swipe name] effect for mobile devices
        "interval":0,               // in ms, [0|null|false] to slide manually
        "offset":0,                 // current slide offset for rotate effect. in px or "center" to auto calculate offset
        "onInit":null,              // init function, called before slide initialization
        "onSlide":null,             // function(index, slides, isNext) run before slide change
        "onSlideEnd":null,          // function(index) run after slider was changed to "index" slide
        "rotate":true,              // move to the first slider after the last one and vice versa
        "scroll":null,              // scroll value in pixels for shift effect
        "slideElement":"> li",      // slide html element
        "speed":600,                // slide effect speed in ms
        "start":0,                  // slide number to start sliding from
        "stopOnChange":false,       // stop animation on manual slide change
        "stopOnMouseHover":false,   // stop auto slide change if mouse is over the slide
        "stopOnWindowBlur":false,   // stop slider animation on window/tab lost focus
        "useHashAttr":"data-hash",  // slide attribute name for url hash update
        "useQueue":true,            // use sliding queue
        "wrapper":null              // slider container jQuery object
    };

    /**
     * Default thumbnails options
     *
     */
    var thumbs_defaults = {
        "buttonNext": null,         // next slide button: string or jQuery element
        "buttonPrev": null,         // prev slide button: string or jQuery element
        "classActive":"active",     // class, added to current slide's thumbnail
        "classDisabled":"disabled", // class for disabled prev-next buttons
        "container":"ul:first",     // thumbnails container or jQuery element
        "current":"center",         // center | visible | null
        "direction":null,           // null | h | v
        "element":"> li",             // thumb element selector
        "onScroll":null,            // function(begin, end) that called when thumbs are scrolled
        "scroll":null,              // scroll [<=>] distance in px
        "height":null,              // fixed thumbnail height in pixels
        "wrapper":null,             // thumbnails container jQuery object
        "width":null                // fixed thumbnail width in pixels
    };


    bfmSlider = function(slider_options, thumbs_options) {

        this.animate = 0;  // intervalId for animation
        this.data    = {}; // any custom data
        this.index   = 0;  // current slide index
        this.length  = 1;  // at least 1 slide
        this.queue   = [];

        this.slider = $.extend({}, slider_defaults);
        this.thumbs = $.extend({}, thumbs_defaults);

        if(slider_options){
            this.init(slider_options, thumbs_options);
        } else {
            return this;
        }
    };



    bfmSlider.prototype = {

        /*
         * destroy
         * effects: [change|fade|lift|rotate|shift|slide]
         * init
         * next
         * prev
         * queueNext
         * restart
         * show
         * start
         * stop
         * thumbsInit
         * thumbsScroll
         * thumbsSet
         */
        destroy: function(){

            this.stop();

            this.slider.slides.off('click');

            this.slider.buttonNext && this.slider.buttonNext.off('click').off('mousedown', disableSelection);
            this.slider.buttonPrev && this.slider.buttonPrev.off('click').off('mousedown', disableSelection);

            if(this.thumbs && this.thumbs.wrapper){
                this.thumbs.container.find(this.thumbs.element).off('click');
                this.thumbs.buttonNext && this.thumbs.buttonNext.off('click').off('mousedown', disableSelection);
                this.thumbs.buttonPrev && this.thumbs.buttonPrev.off('click').off('mousedown', disableSelection);
            }

            if(isMobile){
                this.slider.container.off('.bfmslider');
            }
        },



        effects: {

            change: function(index, isNext){
                this.slider.slides.hide();
                this.slider.slides.eq(index).show();
                this.queueNext();
            },

            fade: function(index, isNext){
                this.slider.slides.eq(index).show().css({
                    "left": "0",
                    "position": "absolute",
                    "top": 0,
                    "z-index": "-1"
                });
                this.slider.slides.eq(this.index).css("z-index", 1)
                .fadeOut(this.slider.speed, this.proxy(function(){
                    this.slider.slides.eq(index).css({
                        "left": "",
                        "position": "",
                        "top": "",
                        "z-index": ""
                    });
                    this.queueNext();
                }));
            },

            fadeInOut: function(index, isNext){
                this.slider.slides.eq(index).css("z-index", 0).hide();
                this.slider.slides.eq(this.index).css("z-index", 1)
                .fadeOut(this.slider.speed, this.proxy(function(){
                    this.slider.slides.eq(index).fadeIn(this.slider.speed, this.proxy('queueNext'));
                }));
            },

            lift: function(index, isNext){
                this.effects.slide.apply(this, [index, isNext, true]);
            },

            liftByOne: function(index, isNext){

                var forward = isNext ? index < this.index : index > this.index;
                var slides = this.slider.slides;

                var current = slides.eq(this.index);

                if(forward){
                    this.slider.container.animate({
                        "margin-top": -1 * current.outerHeight() + 'px'
                    },
                    this.slider.speed,
                    this.slider.easing,
                    this.proxy(function(){
                        current.appendTo(this.slider.container);
                        this.slider.container.css({
                            "margin-top": 0
                        });
                        this.queueNext();
                    }));
                } else {
                    var prev = slides.eq(this.index == 0 ? slides.length-1 : this.index-1);
                    this.slider.container.css({
                        "margin-top": -1 * prev.outerHeight(true) + 'px'
                    }).prepend(prev).animate({
                        "margin-top": 0
                    },
                    this.slider.speed,
                    this.slider.easing,
                    this.proxy(function(){
                        this.queueNext();
                    }));
                }
            },

            rotate: function(index, isNext){

                var self = this;
                var slider = this.slider;
                var order = slider.order.slice();
                order.unshift(order.pop());
                var forward = $.inArray(index, order) > $.inArray(this.index, order);
                var i, marginLeft, offset = 0, slide;

                while(order[0] != index)
                    order.push(order.shift());

                if(slider.offset){
                    offset = slider.offset != 'center' ? parseInt(slider.offset) :
                    Math.round((slider.visible - slider.slides.eq(0).outerWidth(true)) / 2);
                }

                if(offset){
                    while(offset > 0) {
                        order.unshift(order.pop());
                        offset -= slider.slides.eq(order[0]).outerWidth(true);
                    }
                }

                marginLeft = parseInt(slider.container.css('margin-left'));

                if(forward){
                    for(i=0; i<slider.order.length; i++){
                        if(slider.order[i] == order[0]) break;
                        slide = slider.slides.eq(slider.order[i]);
                        slide.clone().insertBefore(slide).addClass('slide-clone');
                        slide.appendTo(slider.container);
                        marginLeft -= slide.outerWidth(true);
                    }
                } else {
                    for(i=slider.order.length-1; i>=0; i--){
                        slide = slider.slides.eq(slider.order[i]);
                        slide.clone().insertBefore(slide).addClass('slide-clone');
                        slide.prependTo(slider.container);
                        marginLeft -= slide.outerWidth(true);
                        if(slider.order[i] == order[0]) break;
                    }
                    slider.container.css({
                        "margin-left": marginLeft + "px"
                    });
                    marginLeft = offset;
                }

                slider.container.delay(100).animate(
                {
                    "margin-left": marginLeft + "px"
                },
                this.slider.speed,
                this.slider.easing,
                function(){
                    slider.container.css({
                        "margin-left": offset + "px"
                    });
                    slider.container.find('.slide-clone').remove();
                    slider.order = order;
                    self.queueNext();
                });
            },

            shift: function(index){

                var i, offset = Math.max(this.slider.width - this.slider.visible, 0);

                if(this.slider.slides[index].offset < offset){
                    offset = this.slider.slides[index].offset;
                } else {
                    if(index > this.index){
                        for(i=0; i<this.queue.length; i++){
                            if(this.queue[i] < index) break;
                            index = this.queue[i];
                            this.queue[i] = this.length - 1;
                        }
                    } else {
                        for(i=this.length-1; i>=0; i--){
                            if(this.slider.slides[i].offset < offset){
                                offset = this.slider.slides[i].offset;
                                this.queue[0] = i;
                                break;
                            }
                        }
                    }
                }

                this.slider.container.animate(
                {
                    "margin-left":"-"+offset+"px"
                },
                this.slider.speed,
                this.slider.easing,
                this.proxy('queueNext'));

                var isFirst = offset <= 0;
                var isLast  = offset >= this.slider.width - this.slider.visible;
                this.updateButtons(this.slider, isFirst, isLast);
            },

            slide: function(index, isNext, isLift){

                var css = {
                    "animate": {},
                    "next": {
                        "position": "absolute",
                        "top": 0
                    },
                    "reset": {
                        "height": "",
                        "left": "",
                        "position": "",
                        "top": ""
                    }
                };
                var container = this.slider.container;
                var forward = isNext ? index < this.index : index > this.index;
                var slides = this.slider.slides.hide();

                var current = slides.eq(this.index).show();
                var next = slides.eq(index).show();

                if(forward){
                    css.animate.left = "-100%";
                    css.next.left = "100%";
                } else {
                    css.animate.left = "100%";
                    css.next.left = "-100%";
                }

                next.css(css.next);
                container.animate(css.animate, this.slider.speed, this.slider.easing, this.proxy(function(){
                    current.hide();
                    container.css(css.reset);
                    next.css(css.reset);
                    this.queueNext();
                }));
            }
        },

        /**
         * Swipe effect for mobile devices
         *  if swiped, event contains option swipe: [left|right]
         *
         * @param string type: start, move, end, cancel
         * @param object event
         */
        swipe: {
            "inherit": function(type, event){
                switch(type){
                    case 'start':
                        this.data.options = {
                            "interval": this.slider.interval,
                            "useQueue": this.slider.useQueue
                        };
                        this.slider.useQueue = false;
                        this.stop();
                        break;
                    case 'move':
                        // do nothing
                        break;
                    case 'end':
                        if(event.swipe){
                            if(event.swipe == 'right'){
                                this.prev();
                            } else {
                                this.next();
                            }
                        }
                    case 'cancel':
                        $.extend(this.slider, this.data.options);
                        this.start();
                        break;
                }
            },
            "slide": function(type, event, touchmoves){
                var slider = this;
                switch(type){
                    case 'start':
                        (function(slider, options, data){
                            data.options = {
                                "interval": options.interval,
                                "useQueue": options.useQueue
                            };
                            options.interval = 0;
                            options.useQueue = false;
                            slider.stop();

                            var css = {
                                "next": {
                                    "display": "",
                                    "position": "absolute",
                                    "top": "0"
                                }
                            };
                            var indexes = {
                                "current": slider.index,
                                "next": (slider.length + slider.index + 1) % slider.length,
                                "prev": (slider.length + slider.index - 1) % slider.length
                            };
                            var slides = {
                                "current": options.slides.eq(slider.index),
                                "next": (options.rotate || indexes.next > indexes.current) ? options.slides.eq(indexes.next) : null,
                                "prev": (options.rotate || indexes.prev < indexes.current) ? options.slides.eq(indexes.prev) : null
                            };

                            slides.next && slides.next.css($.extend({}, css.next, {"left": "100%"}));
                            slides.prev && slides.prev.css($.extend({}, css.next, {"left": "-100%"}));

                            data.indexes = indexes;
                            data.slides = slides;
                            data.width = slides.current.width();

                        })(this, this.slider, this.data);
                        break;

                    case 'move':
                        (function(slider, options, data){
                            var offset = touchmoves.getTouch().x - touchmoves.getFirst().x;
                            options.container.css({
                                "left": (offset * 100 / data.width) + "%"
                            });
                        })(this, this.slider, this.data);
                        break;

                    case 'end':
                        (function(slider, options, data){
                            var css = {
                                "animateTo": {
                                    "left": "0%"
                                },
                                "reset": {
                                    "left": "",
                                    "position": "",
                                    "top": ""
                                }
                            };
                            var easing = 'swing';
                            var offset = {
                                "current": touchmoves.getTouch().x,
                                "init": touchmoves.getFirst().x
                            };

                            if(event.swipe || (Math.abs(offset.current - offset.init) > data.width / 2)){
                                if(event.swipe){
                                    easing = 'easeOutCubic';
                                } else {
                                    event.swipe = (offset.current > offset.init) ? 'right' : 'left';
                                }
                                if(event.swipe == 'right' && data.slides.prev){
                                    css.animateTo.left = "100%";
                                    data.indexes.current = data.indexes.prev;
                                }
                                if(event.swipe == 'left' && data.slides.next){
                                    css.animateTo.left = "-100%";
                                    data.indexes.current = data.indexes.next;
                                }
                            }
                            slider.queue.push(data.indexes.current);
                            options.container.animate(css.animateTo, 300, easing, slider.proxy(function(){
                                options.container.css(css.reset);
                                options.slides.hide().css(css.reset).eq(data.indexes.current).show();

                                data.options.effect = options.effect;
                                options.effect = 'change';
                                slider.queueNext(data.indexes.current);

                                $.extend(options, data.options);
                                slider.index = data.indexes.current;
                                slider.start();
                            }));
                        })(this, this.slider, this.data);
                        break;

                    case 'cancel':
                        (function(slider, options, data){
                            var css = {
                                "reset": {
                                    "left": "",
                                    "position": "",
                                    "top": ""
                                }
                            };
                            options.container.css(css.reset);
                            options.slides.hide().css(css.reset).eq(data.indexes.current).show();
                            $.extend(options, data.options);
                            slider.start();
                        })(this, this.slider, this.data);
                        break;
                }
            },
            "slideOut": function(type, event, touchmoves){

                var slider = this;

                switch(type){
                    case 'start':
                        slider.data.options = {
                            "interval": slider.slider.interval,
                            "useQueue": slider.slider.useQueue
                        };
                        slider.data.reset = function(){
                            $.extend(this.slider, this.data.options);
                            this.start();
                        };
                        slider.slider.useQueue = false;
                        slider.stop();

                        slider.data.indexes = {
                            "current": slider.index,
                            "next": (slider.length + slider.index + 1) % slider.length,
                            "prev": (slider.length + slider.index - 1) % slider.length
                        };
                        slider.data.slides = {
                            "current": slider.slider.slides.eq(slider.index),
                            "next": slider.slider.slides.eq(slider.data.indexes.next),
                            "prev": slider.slider.slides.eq(slider.data.indexes.prev)
                        };
                        slider.data.slides.current.css({
                            "position": "relative",
                            "z-index": 10
                        });
                        slider.data.slides.next.add(slider.data.slides.prev).css({
                            "display": "none",
                            "left": 0,
                            "position": "absolute",
                            "top": 0,
                            "z-index": 9
                        });
                        break;

                    case 'move':
                        if(touchmoves.getTouch().x > touchmoves.getFirst().x){ // show previous one
                            slider.data.slides.next.hide(); // hide first as prev maybe equal to next
                            slider.data.slides.prev.show();
                        } else { // show next one
                            slider.data.slides.prev.hide(); // hide first as prev maybe equal to next
                            slider.data.slides.next.show();
                        }
                        slider.data.slides.current.css("left", touchmoves.getTouch().x - touchmoves.getFirst().x + 'px');
                        break;

                    case 'end':
                        (function(){
                            var animateTo = {"left": 0};
                            var duration = 200;
                            var indexes = slider.data.indexes;
                            var initOffset = touchmoves.getFirst().x;
                            var offset = touchmoves.getTouch().x;
                            var slides = slider.data.slides;
                            var width = slides.current.outerWidth(true);

                            if(event.swipe || (Math.abs(offset - initOffset) > width / 2)){
                                if(!event.swipe){
                                    event.swipe = (offset > initOffset) ? 'right' : 'left';
                                }
                                if(event.swipe == 'right'){
                                    slides.next.hide(); // hide first as prev maybe equal to next
                                    slides.prev.show();
                                    animateTo.left = width;
                                    indexes.current = indexes.prev;
                                } else {
                                    slides.prev.hide(); // hide first as prev maybe equal to next
                                    slides.next.show();
                                    animateTo.left = width * -1;
                                    indexes.current = indexes.next;
                                }
                            }
                            slider.queue.push(indexes.current);
                            slides.current.animate(animateTo, duration, slider.proxy(function(){
                                slider.slider.slides.hide().css({
                                    "left": "",
                                    "position": "",
                                    "top": "",
                                    "z-index": ""
                                });
                                this.slider.slides.eq(indexes.current).show();
                                this.data.options.effect = this.slider.effect;
                                this.slider.effect = 'change';
                                this.queueNext();

                                $.extend(this.slider, this.data.options);
                                this.start();
                            }));
                        })();
                        break;
                    case 'cancel':

                        $.each(slider.data.slides, function(){
                            this.css({
                                "display": "none",
                                "left": "",
                                "position": "",
                                "top": "",
                                "z-index": ""
                            });
                        });
                        slider.data.slides.current.show();

                        $.extend(this.slider, this.data.options);
                        this.start();
                        break;
                }
            }
        },



        init: function(slider_options, thumbs_options){

            var buttonNext, buttonPrev;
            var self = this;

            this.slider = $.extend(this.slider, slider_options);
            this.thumbs = $.extend({}, thumbs_defaults, this.thumbs, thumbs_options);

            // SLIDES
            if(!this.slider.wrapper){
                console.log("Slider wrapper container is not set!");
                return this;
            }

            if(typeof this.slider.container == "string"){
                this.slider.container = this.slider.wrapper.find(this.slider.container);
            }

            this.slider.slides  = this.slider.container.find(this.slider.slideElement);
            this.slider.visible = this.slider.container.parent().width();
            this.slider.width   = 0;

            this.length = this.slider.slides.length;

            if(this.length == 0){
                console.log("Slider is empty!");
                return this;
            }

            // bind prev <=> next buttons
            buttonNext = !!this.slider.buttonNext ? $(this.slider.buttonNext) : this.slider.wrapper.find('.next');
            buttonNext.off('click').click(this.proxy('next')).off('mousedown', disableSelection).mousedown(disableSelection);
            buttonPrev = !!this.slider.buttonPrev ? $(this.slider.buttonPrev) : this.slider.wrapper.find('.prev');
            buttonPrev.off('click').click(this.proxy('prev')).off('mousedown', disableSelection).mousedown(disableSelection);

            this.slider.buttonNext = buttonNext;
            this.slider.buttonPrev = buttonPrev;

            // EFFECT DEPENDABLE OPTIONS
            if(!this.effects[this.slider.effect]) this.slider.effect = 'change';
            this.init[this.slider.effect] && this.init[this.slider.effect].apply(this);

            isMobile && this.slider.effectSwipe && this.initSwipe();

            // THUMBNAILS PANEL
            this.thumbsInit();

            // DEFINE START SLIDE IF HASH USED
            if(this.slider.useHashAttr && location.hash){
                this.slider.slides.invoke(function(slide, i){
                    var hash = slide.attr(this.slider.useHashAttr);
                    if(hash && location.hash == '#' + hash){
                        this.slider.start = i;
                    }
                }, this);
            }

            // HANDLE TAB/PAGE SWITCH
            this.slider.stopOnWindowBlur && $(window)
            .blur(function(){
                clearTimeout(self.animate);
            })
            .focus(function(){
                if(self.animate){
                    self.start();
                }
            });

            // INIT FUNCTION
            isFunc(this.slider.onInit) && this.slider.onInit.apply(this);

            // STOP AUTO SLIDE CHANGES ON MOUSE HOVER
            this.slider.stopOnMouseHover && this.slider.slides.hover(this.proxy('stop'), this.proxy('start'));

            // SCROLL TO INIT SLIDE IF DEFINED
            if(this.slider.start > 0 || this.index){
                var speed = this.slider.speed;
                this.slider.speed = 0;
                this.show(this.index || this.slider.start);
                this.slider.speed = speed;
            }

            // START SLIDER
            this.start();

            return this;
        },

        initSwipe: function(){

            var swipeEffect = this.slider.effect;
            if(this.swipe[this.slider.effectSwipe])
                swipeEffect = this.slider.effectSwipe;
            if(!this.swipe[swipeEffect])
                swipeEffect = 'inherit';
            swipeEffect = this.swipe[swipeEffect];

            var detect = false;
            var swipe = false;
            var swipeDistance = 49;
            var swipeTime = 200;
            var touch = null;
            var touchmoves = [];

            this.slider.container.on({
                "touchstart.bfmslider": this.proxy(function(event){
                    if(this.queue.length > 0){
                        return;
                    }
                    var e = event.originalEvent || event;
                    if(e.touches.length == 1){
                        touch = e.changedTouches[0];
                        touchmoves = [{
                            "t": event.timeStamp,
                            "x": touch.pageX,
                            "y": touch.pageY
                        }];
                        touchmoves.getFirst = function(){return this[0];};
                        touchmoves.getTouch = function(){return this[this.length - 1];};
                        detect = true;
                        swipe = false;
                        swipeEffect.apply(this, ['start', event, touchmoves]);
                    }
                }),
                "touchmove.bfmslider": this.proxy(function(event){
                    var e = event.originalEvent || event;
                    if(detect){
                        detect = false;
                        if(Math.abs(touchmoves[0].x - touch.pageX) > Math.abs(touchmoves[0].y - touch.pageY)){
                            swipe = true;
                        } else {
                            swipeEffect.apply(this, ['cancel', event, touchmoves]);
                            touch = null; touchmoves = null;
                        }
                    }
                    if(swipe && e.changedTouches[0] === touch){
                        e.preventDefault();
                        touchmoves.push({
                            "t": event.timeStamp,
                            "x": touch.pageX,
                            "y": touch.pageY
                        });
                        swipeEffect.apply(this, ['move', event, touchmoves]);
                    }
                }),
                "touchend.bfmslider": this.proxy(function(event){
                    var e = event.originalEvent || event;
                    var d = 0, f = true, i = 0, l = 0;
                    if(swipe && e.changedTouches[0] === touch){
                        touchmoves.push({
                            "t": event.timeStamp,
                            "x": touch.pageX,
                            "y": touch.pageY
                        });
                        for(i = touchmoves.length - 1; i > 0; i--){
                            if((event.timeStamp - touchmoves[i].t > swipeTime) || (d > swipeDistance))
                                break;
                            l = touchmoves[i].x - touchmoves[i-1].x;
                            if(f){
                                if(l >= 0){
                                    d += l;
                                } else {
                                    f = false;
                                    d = Math.abs(l);
                                }
                            } else {
                                if(l >= 0){
                                    f = true;
                                    d = Math.abs(l);
                                } else {
                                    d += Math.abs(l);
                                }
                            }
                        }
                        if(d > swipeDistance){
                            event.swipe = f ? 'right' : 'left';
                        }
                        swipeEffect.apply(this, ['end', event, touchmoves]);
                        touch = null; touchmoves = null;
                    }
                }),
                "touchcancel.bfmslider": this.proxy(function(event){
                    var e = event.originalEvent || event;
                    if(swipe && e.changedTouches[0] === touch){
                        swipeEffect.apply(this, ['cancel', event, touchmoves]);
                        touch = null; touchmoves = null;
                    }
                })
            });
        },



        next: function(queued){
            var index = this.queue.length ? this.queue[this.queue.length-1] : this.index;
            if(!this.slider.rotate && index == this.length-1) return false;
            queued ? this.stop() : this.restart();
            this.show(index == this.length ? 1 : index+1);
            return false;
        },



        prev: function(){
            var index = this.queue.length ? this.queue[this.queue.length-1] : this.index;
            if(!this.slider.rotate && index == 0) return false;
            this.restart();
            this.show(index == -1 ? this.length-2 : index-1);
            return false;
        },



        queueNext: function(){
            this.index = this.queue.shift();
            isFunc(this.slider.onSlideEnd) && this.slider.onSlideEnd.apply(this, [this.index]);
            if(this.queue.length){
                this.show(this.queue.shift(), true);
            } else {
                this.start();
            }
        },



        restart: function(){
            if(this.slider.stopOnChange){
                this.slider.interval = 0;
            }
            this.start();
            return false;
        },


        /**
         * @param {int} slide index number
         * @param {bool} is it queued. false by default
         */
        show: function(index, queue){

            var next = false;

            if(!queue && this.queue.length > 0){
                this.slider.useQueue && this.queue.push(index);
                return;
            }

            if(index >= this.length){
                index = this.slider.rotate ? index % this.length : this.length - 1;
                next = (index == 0);
            }

            if(index < 0){
                index = this.slider.rotate ? this.length + (index % this.length) : 0;
                next = (index == this.length - 1);
            }

            if(index == this.index){
                this.queue.length && this.queueNext();
            } else {
                this.queue.unshift(index);
                if(this.slider.useHashAttr && this.slider.slides.eq(index).attr(this.slider.useHashAttr))
                    location.hash = this.slider.slides.eq(index).attr(this.slider.useHashAttr);
                isFunc(this.slider.onSlide) && this.slider.onSlide.apply(this, [index, this.slider.slides, next]);
                !this.slider.rotate && this.updateButtons(this.slider, index == 0, index == (this.length - 1));
                this.effects[this.slider.effect].apply(this, [index, next]);
                this.thumbs && this.thumbsSet(index);
            }
        },



        start: function(){
            this.animate && this.stop();
            if(this.slider.interval)
                this.animate = setTimeout(this.proxy('next', [true]), this.slider.interval);
        },



        stop: function(){
            clearTimeout(this.animate);
            this.animate = 0;
        },



        /**
         * init thumbnails if they set
         *
         */
        thumbsInit: function(){

            if(!this.thumbs.wrapper || this.thumbs.wrapper.length == 0){
                this.thumbs = null;
                return;
            }

            this.thumbs['animate'] = false;
            this.thumbs['elements'] = [];
            this.thumbs['offset'] = 0;
            this.thumbs['visible'] = 0;

            if(typeof this.thumbs.container == "string"){
                this.thumbs.container = this.thumbs.wrapper.find(this.thumbs.container);
            }

            // bind prev <=> next buttons
            buttonNext = this.thumbs.buttonNext ? $(this.thumbs.buttonNext) : this.thumbs.wrapper.find('.next');
            buttonNext.off('click').click(this.proxy('thumbsScroll', [true])).off('mousedown', disableSelection).mousedown(disableSelection);
            buttonPrev = this.thumbs.buttonPrev ? $(this.thumbs.buttonPrev) : this.thumbs.wrapper.find('.prev');
            buttonPrev.off('click').click(this.proxy('thumbsScroll', [false])).off('mousedown', disableSelection).mousedown(disableSelection);

            this.thumbs.buttonNext = buttonNext;
            this.thumbs.buttonPrev = buttonPrev;

            var d = this.thumbs.direction;
            var offset = 0;
            var wrapper = this.thumbs.container.parent();

            this.thumbs.visible = (d == "h") ? wrapper.width() : wrapper.height();
            this.thumbs.container.find(this.thumbs.element).invoke(function(thumb, index){

                // bind thumbnail click handler
                thumb.off('click').click(this.proxy('show', [index])).click(this.proxy('restart'));

                this.thumbs.elements[index] = thumb;
                this.thumbs.elements[index].offsetStart = offset;
                if(d == "h"){
                    thumb.css("width", thumb.width() + 'px');
                    offset += this.thumbs.width || thumb.outerWidth(true);
                }
                if(d == "v"){
                    thumb.css("height", thumb.height() + 'px');
                    offset += this.thumbs.height || thumb.outerHeight(true);
                }
                this.thumbs.elements[index].offsetEnd = offset;
            }, this);

            if(d == "h") this.thumbs.container.css("width", offset + 'px');
            if(d == "v") this.thumbs.container.css("height", offset + 'px');
            this.thumbs.container.size = offset;

            this.thumbsSet(this.index, false); // do not scroll thumbnails on re-init !
        },



        /**
         * @param {boolean} slide forward; false by default
         */
        thumbsScroll: function(forward){

            var d = this.thumbs.direction;
            var o = this.thumbs.offset;
            var e = null;

            if(!d || (!this.slider.useQueue && this.thumbs.animate)) return false;

            if(this.thumbs.scroll){
                o = forward ? o + this.thumbs.scroll : o - this.thumbs.scroll;
            } else {
                if(forward){
                    o += this.thumbs.visible;
                    for(var i=0; i<this.thumbs.elements.length; i++){
                        if(this.thumbs.elements[i].offsetEnd > o){
                            e = this.thumbs.elements[i];
                            break;
                        }
                    }
                    o = e ? e.offsetEnd - this.thumbs.visible : this.thumbs.offset;
                } else {
                    for(var i=(this.thumbs.elements.length-1); i>=0; i--){
                        if(this.thumbs.elements[i].offsetStart < o){
                            e = this.thumbs.elements[i];
                            break;
                        }
                    }
                    o = e ? e.offsetStart : o;
                }
            }

            var max = this.thumbs.container.size - this.thumbs.visible;
            if(o > max) o = max;
            if(o < 0) o = 0;

            this.thumbs.animate = true;
            var margin = (this.thumbs.direction == "h") ? {
                "margin-left":"-"+o+"px"
            } : {
                "margin-top":"-"+o+"px"
            };
            this.thumbs.container.animate(margin, this.proxy(function(){
                this.thumbs.animate = false;
            }));
            this.thumbs.offset = o;

            this.updateButtons(this.thumbs, o <= 0, o >= max);
            this.thumbs.onScroll && this.thumbs.onScroll(o <= 0, o >= max);

            return false;
        },



        /**
         *
         * @param {int} slide thumbnail index
         * @param {boolean} scroll to thumbnail; true by default
         */
        thumbsSet: function(index, scroll){

            // if slider does not have thumbnails
            if(!this.thumbs){
                return false;
            }

            // do not generate error when required thumbnail does not exist
            if(!this.thumbs.elements[index]){
                return false;
            }

            // add active class to the current thumbnail
            this.thumbs.container.find(this.thumbs.element).removeClass(this.thumbs.classActive);
            this.thumbs.elements[index].addClass(this.thumbs.classActive);

            // slide to selected thumbnail
            if(this.thumbs.current && this.thumbs.direction){

                var o = this.thumbs.offset;
                var v = this.thumbs.visible;
                var s = this.thumbs.elements[index].offsetStart;
                var e = this.thumbs.elements[index].offsetEnd;
                var c = (e - s) / 2 + s;
                var w = this.thumbs.container.size;

                if(typeof scroll == 'undefined' || scroll){
                    this.thumbs.container.stop();

                    switch (this.thumbs.current){
                        case "visible":
                            if(s < o) o = s; // bug with thumb border in ff with vertical direction
                            if(e > (o+v)) o = e-v;
                            break;
                        default: // center current slide thumbnail
                            o = c - v/2;
                            if(c > (w - v/2)) o = w - v;
                            if(c < (v/2)) o = 0;
                    }
                }

                var margin = (this.thumbs.direction == "h") ? {
                    "margin-left":"-"+o+"px"
                } : {
                    "margin-top":"-"+o+"px"
                };
                this.thumbs.container.animate(margin);
                this.thumbs.offset = o;

                this.updateButtons(this.thumbs, o <= 0, o >= w-v);
                this.thumbs.onScroll && this.thumbs.onScroll(o <= 0, o >= w-v);
            }
        },

        updateButtons: function(slider, isFirst, isLast){
            slider.buttonNext[isLast  ? 'addClass' : 'removeClass'](slider.classDisabled);
            slider.buttonPrev[isFirst ? 'addClass' : 'removeClass'](slider.classDisabled);
        },


        /**
         * Proxy to call function in context of current object
         * @param {mixed} function or string
         * @param {array} function arguments; use null to define incoming arguments
         * @param {object} context
         */
        proxy: function(func, args, context){
            context = context || this;
            args = args || [];
            if(typeof func == 'string')
                func = context[func];
            return function(){
                var a = args.slice();
                for(var i=0; i<arguments.length; i++)
                    if(typeof a[i]=='undefined' || a[i]===null)
                        a[i] = arguments[i];
                return func.apply(context, a);
            };
        }
    };



    /**
     * Slider extensions: change init function
     */
    bfmSlider.prototype.init.change = function(){
        this.slider.slides.hide().eq(0).show();
        !this.slider.rotate && this.updateButtons(this.slider, true, this.length == 1);
    };



    bfmSlider.prototype.init.fade = bfmSlider.prototype.init.change;
    bfmSlider.prototype.init.fadeInOut = bfmSlider.prototype.init.change;
    bfmSlider.prototype.init.lift = bfmSlider.prototype.init.change;
    bfmSlider.prototype.init.slide = bfmSlider.prototype.init.change;



    /**
     * Slider extensions: rotate init function
     */
    bfmSlider.prototype.init.rotate = function(){

        $.extend(this.slider, {
            "offset": this.slider.offset || 0,
            "order":[],
            "rotate": true
        });

        this.slider.slides.invoke(function(slide, i){
            slide.css("width", slide.width() + 'px'); // overwrite slide width to fix float values
            this.slider.width += this.slider.scroll || slide.outerWidth(true);
            this.slider.order.push(i);
        }, this);

        var offset = 0;
        if(this.slider.offset){
            offset = this.slider.offset != 'center' ? parseInt(this.slider.offset) :
            Math.round((this.slider.visible - this.slider.slides.eq(0).outerWidth(true)) / 2);
        }

        var slide;
        if(offset){
            while(offset > 0) {
                this.slider.order.unshift(this.slider.order.pop());
                slide = this.slider.slides.eq(this.slider.order[0]);
                this.slider.container.prepend(slide);
                offset -= this.slider.scroll || slide.outerWidth(true);
            }
        }

        this.slider.container.css({
            "margin-left": offset + 'px',
            "width": this.slider.width * 2 + "px"
        });
    };



    /**
     * Slider extensions: shift init function
     *    if slides <li> width is not set in css - it can be float value, so scroll callculation may work incorrectly.
     * @param {object} slider options object
     * @param {object} thumbnails options object
     */
    bfmSlider.prototype.init.shift = function(slider, thumbs){

        $.extend(this.slider, {
            "rotate": false
        });

        this.slider.slides.invoke(function(slide, i){
            slide.css("width", slide.width() + 'px'); // overwrite slide width to fix float values
            this.slider.slides[i].offset = this.slider.scroll * i || this.slider.width;
            this.slider.width += this.slider.scroll || slide.outerWidth(true);
        }, this);

        this.slider.container.css({
            "width": this.slider.width + 'px'
        });
        this.updateButtons(this.slider, true, this.slider.width <= this.slider.visible);
    };



    /**
     * Extend jQuery as plugin
     * @param {object|string} slider options or slider command to execute
     * @param {object|array} thumbnails or command arguments as array []
     */
    $.fn.bfmSlider = function(options, args){
        return this.each(function() {
            var wrapper = $(this);
            var slider = wrapper.data('bfmSlider');
            if(options == 'destroy' && !slider) return;
            if(slider){
                options = (typeof options == "string" && slider[options]) ? options : 'init';
                slider[options].apply(slider, $.isArray(args) ? args : []);
                options == 'destroy' && wrapper.removeData('bfmSlider');
            } else {
                options = $.extend({
                    "effect":   wrapper.attr('data-effect')   || slider_defaults.effect,
                    "interval": parseInt(wrapper.attr('data-interval')) || slider_defaults.interval,
                    "speed":    parseInt(wrapper.attr('data-speed'))    || slider_defaults.speed,
                    "start":    wrapper.attr('data-start')    || slider_defaults.start
                }, options, {
                    "wrapper":wrapper
                });
                slider = new bfmSlider(options, $.extend({}, args));
                wrapper.data('bfmSlider', slider);
            }
        });
    };

    /**
     * $.invoke(elements, func, context, extend)
     *
     * @param {array|object} list of elements to iterate
     * @param {function} function with arguments(element, name)
     * @param {context} applied this; default: current element
     * @param {boolean} extend each element as jQuery object
     */
    $.invoke = function(elements, func, context, extend){
        return $.each(elements, function(name, elem){
            func.apply(context || this, [extend ? $(elem) : elem, name]);
        });
    };

    /**
     * $('elements').invoke(function(elem, name){}, context)
     *
     * @param {function} function with arguments(element, name)
     * @param {context} applied this; default: current element
     */
    $.fn.invoke = function(func, context){
        return $.invoke(this, func, context, true);
    };

    if(!$.easing.easeOutCubic){
        $.easing.easeOutCubic = function (x, t, b, c, d) {
            return c*((t=t/d-1)*t*t + 1) + b;
        };
    }

    /**
     * Disable selection on doubleclick
     *
     * Usage: bind on element mousedown
     */
    function disableSelection(){
        this.onselectstart = function(){
            return false;
        };
        return false;
    }

    /**
     * Check if argument is function
     * @return {bool} is function
     */
    function isFunc(o){
        return Object.prototype.toString.call(o) === "[object Function]";
    }

})(jQuery, window);