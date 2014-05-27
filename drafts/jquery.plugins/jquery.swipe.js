(function($, w){

    var defaults = {
        "onStart":  function(event){},
        "onMove":   function(event, distance){},
        "onEnd":    function(event, distance, swipe){},
        "onCancel": function(event){},
        "gestureDistance": 30,
        "swipeDistance": 49,
        "swipeTime": 200
    };

    $.fn.swipe = function(options){

        var o = $.extend({}, defaults, options, {
            "onStart":  $.isFunction(options.onStart)   ? options.onStart   : null,
            "onMove":   $.isFunction(options.onMove)    ? options.onMove    : null,
            "onEnd":    $.isFunction(options.onEnd)     ? options.onEnd     : null,
            "onCancel": $.isFunction(options.onCancel)  ? options.onCancel  : null
        });

        return this.each(function(){

            var container = $(this);
            var detect = false;
            var gesture = false;
            var moves = null;
            var start = null;
            var swipe = false;
            var touch = null;

            container.on({
                "touchstart": function(event){
                    var e = event.originalEvent || event;
                    if(e.touches.length == 1){

                        detect = true;
                        gesture = ((e.pageX < 30) || (e.pageX > $(w).width() - 30)) ? true : false;
                        swipe = false;
                        touch = null;

                        if(o.onStart){
                            detect = o.onStart(e);
                            if(typeof detect == 'undefined'){
                                detect = true;
                            }
                        }
                        if(detect){
                            touch = e.changedTouches[0];
                            start = {
                                "t": event.timeStamp,
                                "x": touch.pageX,
                                "y": touch.pageY
                            };
                            moves = [start];
                        }
                    }
                },
                "touchmove": function(event){
                    var e = event.originalEvent || event;
                    var dx = 0, dy = 0;
                    if(e.changedTouches[0] === touch){
                        dx = touch.pageX - start.x;
                        dy = touch.pageY - start.y;
                        if(detect){
                            detect = false;
                            if(Math.abs(dx) > Math.abs(dy)){
                                swipe = true;
                            }
                        }
                        if(swipe){
                            e.preventDefault();
                            moves.push({
                                "t": event.timeStamp,
                                "x": touch.pageX,
                                "y": touch.pageY
                            });
                            if(gesture && Math.abs(dx) > o.gestureDistance){
                                gesture = false;
                            }
                            !gesture && o.onMove && o.onMove(e, dx);
                        } else {
                            o.onCancel && o.onCancel(e);
                            moves = null;
                            touch = null;
                        }
                    }
                },
                "touchend": function(event){
                    var e = event.originalEvent || event;
                    var d = 0, f = true, i = 0, l = 0, s = null;

                    if(e.changedTouches[0] === touch){
                        moves.push({
                            "t": event.timeStamp,
                            "x": touch.pageX,
                            "y": touch.pageY
                        });
                        for(i = moves.length - 1; i > 0; i--){
                            if((event.timeStamp - moves[i].t > o.swipeTime) || (d > o.swipeDistance))
                                break;
                            l = moves[i].x - moves[i-1].x;
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
                        if(d > o.swipeDistance){
                            s = f ? 'right' : 'left';
                        }
                        o.onEnd && o.onEnd(e, touch.pageX - start.x, s);
                        touch = null;
                        moves = null;
                    }
                },
                "touchcancel": function(event){
                    var e = event.originalEvent || event;
                    o.onCancel && o.onCancel(e);
                    moves = null;
                    touch = null;
                }
            });
        });
    };

    $.fn.swipe.defaults = defaults;

})(jQuery, window);