/**
 * Blue Fountain Media
 *
 * NOTICE OF LICENSE
 *
 * <notice_of_license>
 *
 * @category    BFM
 * @package     BFM_COLORPICKER
 * @copyright   Copyright (c) 2012 Blue Fountain Media (http://www.bluefountainmedia.com/). All Rights Reserved.
 * @license     <license_url>
 */

;
(function($){

    var url = "";

    var urls = {
        "arrow": url + "js/libs/colorpicker/arrow.gif",
        "cross": url + "js/libs/colorpicker/cross.gif",
        "palette": url + "js/libs/colorpicker/palette.jpg"
    };

    var standardColors = [
    ["#ffffff", "#f2f2f2", "#d8d8d8", "#bfbfbf", "#a5a5a5", "#7f7f7f"],
    ["#000000", "#7f7f7f", "#595959", "#3f3f3f", "#262626", "#0c0c0c"],
    ["#bf0000", "#eaa8a8", "#d67575", "#c94c4c", "#be0000", "#6d0000"],
    ["#ff0000", "#ffafaf", "#ff7f7f", "#ff4c4c", "#fe0000", "#a50000"],
    ["#ffb700", "#ffe6a5", "#ffdb7f", "#ffc93f", "#feb700", "#d89c00"],
    ["#f9ff00", "#fdffc9", "#f0f298", "#eaed55", "#f9fe00", "#ccd100"],
    ["#90d14f", "#dcf4c3", "#c5e8a2", "#aee27a", "#90d14e", "#6cb227"],
    ["#00af5b", "#abf2d0", "#7ee5b3", "#3bce88", "#00ae5b", "#038245"],
    ["#00b6ef", "#a7e6f9", "#7cd8f4", "#46c8f2", "#00b6ee", "#018ab5"],
    ["#006ebf", "#a6d3f4", "#7dbbe8", "#3b95d6", "#006ebe", "#015089"],
    ["#002060", "#95acdb", "#5071af", "#274c96", "#002061", "#000f2d"],
    ["#6f30a0", "#c6a6e0", "#ad7cd3", "#8c56b7", "#6e30a0", "#4c1c72"]
    ];

    /**
   * @param {string} color #15f4e0
   * @return {object} {r:21,g:244,b:224}
   */
    function color2rgb(color) {
        if (color.indexOf('#') != -1) {
            color = color.replace(new RegExp('[^0-9A-F]', 'gi'), '');
            return {
                r:parseInt(color.substring(0, 2), 16),
                g:parseInt(color.substring(2, 4), 16),
                b:parseInt(color.substring(4, 6), 16)
            };
        }
        return null;
    }

    function getMouseOffset(e){
        return {
            x: e.srcElement ? e.srcElement.offsetLeft + e.offsetX : e.target.offsetLeft + e.layerX,
            y: e.srcElement ? e.srcElement.offsetTop + e.offsetY : e.target.offsetTop + e.layerY
        };
    }

    function hex(v){
        v = parseInt(v).toString(16);
        return v.length > 1 ? v : '0'+v;
    }

    /**
    * @param {float} 0-1
    * @param {float} 0-1
    * @param {float} 0-1
    */
    function hsv2rgb(hsv) {
        var h = hsv.h;
        var s = hsv.s;
        var v = hsv.v;
        var r, g, b;
        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);
        switch(i % 6){
            case 0:
                r = v, g = t, b = p;
                break;
            case 1:
                r = q, g = v, b = p;
                break;
            case 2:
                r = p, g = v, b = t;
                break;
            case 3:
                r = p, g = q, b = v;
                break;
            case 4:
                r = t, g = p, b = v;
                break;
            case 5:
                r = v, g = p, b = q;
                break;
        }
        return {
            r:r*255,
            g:g*255,
            b:b*255
        };
    }

    /**
    * @param {int} 0-255
    * @param {int} 0-255
    * @param {int} 0-255
    */
    function rgb2hsv(rgb) {
        var r = rgb.r/255, g = rgb.g/255, b = rgb.b/255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max, d = max - min;
        s = max == 0 ? 0 : d / max;

        if(max == min){
            h = 0;
        } else {
            switch(max){
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return {
            h:h,
            s:s,
            v:v
        };
    }


    colorpicker = function(options){

        var o = $.extend({
            "color":null,
            "onChange":function(){},
            "x":0,
            "y":0,
            "height":112,
            "width":180
        }, options);

        var color = o.color ? rgb2hsv(color2rgb(o.color)) : {
            h:0,
            s:0,
            v:0
        };

        var sliderOver = false;


        // FUNCTIONS

        /**
         * @param {float} i: height in %
         * @param {rgb} c: color
         * @return {rgb}
         */
        function getSlideColor(i, c){
            var d, fc = {}, h2=50;
            if(i < h2){
                d = i / h2;
                fc.r = 255 - (255 - c.r) * d;
                fc.g = 255 - (255 - c.g) * d;
                fc.b = 255 - (255 - c.b) * d;
            } else {
                d = 2 - i / h2;
                fc.r = c.r * d;
                fc.g = c.g * d;
                fc.b = c.b * d;
            }
            return fc;
        }

        function setPalette(e, setOnly){
            var offset = getMouseOffset(e);
            if(offset.x < 0) offset.x = 0;
            if(offset.y < 0) offset.y = 0;
            if(offset.x > o.width) offset.x = o.width;
            if(offset.y > o.height) offset.y = o.height;

            cross.css({
                left:offset.x-7+'px',
                top:offset.y-7+'px'
            });

            color.h = offset.x / o.width;
            color.s = 1 - offset.y / o.height;

            var c = hsv2rgb({
                h:color.h,
                s:color.s,
                v:1
            });

            var bg, fc, h=o.height;
            for(var i=0; i<h; i++){
                fc = getSlideColor(i/h*100, c);
                bg = '#'+hex(fc.r)+hex(fc.g)+hex(fc.b);
                stripes[i].css('background-color', bg);
            }
            fc = getSlideColor(color.v, hsv2rgb({
                h:color.h,
                s:color.s,
                v:1
            }));
            if(!setOnly){
                o.onChange('#'+hex(fc.r)+hex(fc.g)+hex(fc.b));
            }
        }

        function setSlider(e, setOnly){

            var offset = getMouseOffset(e);
            if(offset.y < 0) offset.y = 0;
            if(offset.y > o.height) offset.y = o.height;

            arrow.css({
                top: offset.y - 6 + 'px'
            });

            color.v = offset.y / o.height * 100; // it's not BRIGHTNESS !!!
            var fc = getSlideColor(color.v, hsv2rgb({
                h:color.h,
                s:color.s,
                v:1
            }));
            if(!setOnly){
                o.onChange('#'+hex(fc.r)+hex(fc.g)+hex(fc.b));
            }
        }

        var wrapper = $('<div>')
        .addClass('colorpicker')
        .appendTo('body')
        .bind('mousedown', function(e){
            e.stopPropagation();
        })
        .css({
            "left":o.x + 'px',
            "top":o.y + 'px',
            "width":"204px"
        });

        var std = $('<div>').appendTo(wrapper);
        $('<div class="title">Standard Colors:</div>').appendTo(std);

        $.each(standardColors, function(i, row){
            var ul = $('<ul></ul>').appendTo(std);
            $.each(row, function(i, color){
                $('<li></li>').appendTo(ul)
                .addClass(color == o.color ? 'active' : '')
                .click(function(){
                    o.onChange(color);
                    std.find('li.active').removeClass('active');
                    $(this).addClass('active');
                })
                .css({
                    "background-color":color
                });
            });
        });

        var more = $('<div>')
        .appendTo(wrapper)
        .css({
            "background-color":"#ffffff",
            "clear":"both",
            "height":"140px",
            "position":"relative"
        });
        $('<div class="title">More Colors</div>').appendTo(more);

        var palette = $('<div>')
        .appendTo(more)
        .css({
            "height":o.height + "px",
            "position":"absolute",
            "width":o.width + "px"
        });

        var cross = $('<div>')
        .appendTo(palette)
        .css({
            "background":"transparent url("+urls.cross+") no-repeat center center",
            "height":"15px",
            "left":color.h * o.width - 7 + 'px',
            "position":"absolute",
            "top":color.s * o.height - 7 + 'px',
            "width":"15px",
            "z-index":1
        })
        ;

        $('<img>')
        .attr('src', urls.palette)
        .appendTo(palette)
        .css({
            "height":"100%",
            "width":"100%"
        })
        ;

        var slider = $('<div>')
        .appendTo(more)
        .css({
            "border":"solid 1px #AAAAAA",
            "height":o.height + "px",
            "left":o.width + 6 + "px",
            "top":0,
            "position":"relative",
            "width":"12px"
        })
        ;

        var hover = $('<div>')
            .appendTo(slider)
            .css({
                "height":"100%",
                "left":0,
                "position":"absolute",
                "top":0,
                "width":"100%",
                "z-index":2
            });

        var arrow = $('<img>')
        .appendTo(slider)
        .attr('src', urls.arrow)
        .css({
            "left":"14px",
            "position":"absolute",
            "top":"-5px"
        });

        var stripes = [];
        for(var i=0; i<o.height; i++){
            stripes[i] = $('<div>')
            .appendTo(slider)
            .css({
                "height":"1px",
                "overflow":"hidden",
                "width":"100%"
            });
        }


        var pickerRemove = function(){
            $(document).unbind('mousedown', pickerRemove);
            wrapper.remove();
        };

        $(document)
        .bind('mousedown', pickerRemove)
        .bind('mouseup', function(){
            $(document).unbind('dragstart');
            $('body').unbind('selectstart');
            palette.unbind('mousemove', setPalette);
            hover.unbind('mousemove', setSlider);
        });

        palette.bind('mousedown', function(e){
            $(document).bind('dragstart', false);
            $('body').bind('selectstart', false);
            palette.bind('mousemove', setPalette);
            setPalette(e);
            return false;
        });

        hover.bind('mousedown', function(e){
            $(document).bind('dragstart', false);
            $('body').bind('selectstart', false);
            hover.bind('mousemove', setSlider);
            setSlider(e);
            return false;
        });

        setPalette({
            target:{
                offsetLeft:0,
                offsetTop:0
            },
            layerX: color.h * o.width,
            layerY: o.height - color.s * o.height
        }, true);
        setSlider({
            target:{
                offsetLeft:0,
                offsetTop:0
            },
            layerX: 0,
            layerY: o.height/2 + (1 - color.v) * o.height / 2
        }, true);

    }

})(jQuery);