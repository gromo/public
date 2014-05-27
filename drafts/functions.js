/**
 * Fix IE console
 *
 */
if(typeof console == "undefined"){
    console = {
        log: function(msg){
            var debug = document.getElementById('console');
            if(debug) debug.innerHTML = debug.innerHTML + msg;
        }
    };
}



/**
 * Disable selection on element doubleclick
 *
 * Usage: $('element').mousedown(disableSelection);
 */
function disableSelection(){
    this.onselectstart = function(){
        return false;
    };
    return false;
}



function dispatchEvent(obj, evt, doc) {
    var doc = doc || document;
    if(obj!==undefined || obj!==null) {
        if (doc.createEvent) {
            var evObj = doc.createEvent('MouseEvents');
            evObj.initEvent(evt, true, false);
            obj.dispatchEvent(evObj);
        } else if (doc.createEventObject) {
            var evObj = doc.createEventObject();
            obj.fireEvent('on' + evt, evObj);
        }
    }
}


/**
 * Advanced extend functionality - make array duplicate instead of copying reference
 *
 */
function extend(){

    function isArray(o){
        return Object.prototype.toString.call(o) === "[object Array]";
    }

    function isFunc(o){
        return Object.prototype.toString.call(o) === "[object Function]";
    }

    var target = arguments[0] || {};
    for(var i=1; i<arguments.length; i++){
        if(arguments[i] && typeof arguments[i] == 'object'){
            for(var name in arguments[i]){
                if(typeof arguments[i][name] === "object"){
                    target[name] = isArray(arguments[i][name]) ?
                    arguments[i][name].slice() : extend(arguments[i][name]);
                } else {
                    target[name] = arguments[i][name];
                }
            }
        }
    }
    return target;
}

/**
 * Parse URL/HASH to get url params,
 *      extending them with provided data
 *      and removing empty values (both from link & data)
 * @param {string} url to parse
 * @param {array} data to replace in url
 * @return {array} url params
 */
function getLinkParams(link, data){

    data = $.extend({}, data);

    if(link.match(/\?.+/))
        link = link.replace(/^.*\?/, '');

    var params = {};
    $.each(link.split(/[&?]/), function(i, value){
        value = value.split('=', 2);
        if(typeof data[value[0]] != 'undefined')
            return;
        if(!isEmpty(value[0]) && !isEmpty(value[1]))
            params[value[0]] = decodeURIComponent(value[1]);
    });

    $.each(data, function(name, value){
        if(!isEmpty(name) && !isEmpty(value))
            params[name] = value;
    });

    return params;
}


/********************** AJAX VARIEN FORM **********************/

/**
 * @param {string|DOM} form element or it's id
 * @param {hash} callbacks for
 *   - beforeValidate:
 *   - onValidate:      form, data
 *   - onError:         form
 *   - onSuccess:       form, json
 *   - onComplete:      form
 */
function initAjaxVarienForm(formId, callbacks){

    var reviewForm = new VarienForm(formId);
    var form = reviewForm.form;

    // unbind events
    Event.stopObserving(form, 'submit');
    Form.getElements(form).each(function(input){
        Event.stopObserving(input, 'blur');
        Event.stopObserving(input, 'click');
    //            Event.stopObserving(input, 'change');
    });

    // redefine onSubmit method
    reviewForm.validator.onSubmit = function(ev){

        callbacks = $.extend({}, callbacks);

        callbacks.beforeValidate && callbacks.beforeValidate();

        if(this.validate()){
            var data = form.serialize(true);
            var submit = true;

            if($.isFunction(callbacks.onValidate))
                submit = callbacks.onValidate(form, data);

            if(typeof submit == 'undefined' || submit){
                $(form).addClass('form-loading');
                $.ajax({
                    "complete": function(){
                        $(form).removeClass('form-loading');
                        callbacks.onComplete && callbacks.onComplete(form);
                    },
                    "data": data,
                    "dataType": "json",
                    "error": function(){
                        callbacks.onError && callbacks.onError(form);
                    },
                    "success": function(json){
                        callbacks.onSuccess && callbacks.onSuccess(form, json);
                    },
                    "type": $(form).attr('method') || "get",
                    "url": $(form).attr('action')
                });
            }
        }
        Event.stop(ev);
    };
    reviewForm.validator.initialize(form);
}
window.initAjaxVarienForm = initAjaxVarienForm;

/**
 * Preload images.
 *  Callback is called when all images are loaded succesfully or with error.
 * @param {array} images src
 * @param {func} callback(loaded, errors)
 */
var preloadImages = function(images, callback){
    var errors = [];
    var loaded = [];
    $.each(images, function(){
        var image = new Image();
        image.data = this;
        image.onload = function(){
            loaded.push(image);
            if(loaded.length + errors.length == images.length){
                callback(loaded, errors);
            }
        };
        image.onerror = function(){
            errors.push(image);
            if(loaded.length + errors.length == images.length){
                callback(loaded, errors);
            }
        };
        image.src = this.src || this;
    });
};

function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


    /**
         * Proxy to call function in context of current object
         * @param {mixed} function or string
         * @param {array} function arguments; use null to define incoming arguments
         * @param {object} context
         */
    proxy: function(func, args, context){
        context = context || this;
        args = args || [];
        return function(){
            var a = args.slice();
            for(var i=0; i<arguments.length; i++)
                if(typeof a[i]=='undefined' || a[i]===null)
                    a[i] = arguments[i];
            if(typeof func == 'string')
                func = context[func];
            return func.apply(context, a);
        };
    }




function ajaxAutoComplete(input, container, options){

    var ajaxInstance = 0;
    var o = $.extend({
        "classCurrent": "hover",
        "classElement": "element",
        "classLoading": "loading",
        "getContent": function(data){
            return data;
        },
        "getData": function(value){
            return {
                "q": value
            };
        },
        "minChars": 2,
        "method": "post",
        "onElementSelect": function(element){

        },
        "url": ""
    }, options);
    var timer = 0;

    $(input).off('.ajaxAutocomplete')
    .on('keydown.ajaxAutocomplete', function(e){

        var currentElement = container.find('.' + o.classCurrent);
        var elements = container.find('.' + o.classElement);

        switch(e.keyCode){
            case 13:
                if(elements.length == 0){
                    currentElement = elements.eq(0);
                }
                if(currentElement.length){
                    o.onElementSelect(currentElement);
                    return false;
                }
                break;
            case 38: // UP
                if(container.is(':visible') && currentElement.length > 0){
                    elements.removeClass(o.classCurrent);
                    currentElement.prev('.' + o.classElement).addClass(o.classCurrent);
                }
                break;
            case 40: // DOWN
                if(container.is(':visible')){
                    if(currentElement.length == 0){
                        elements.eq(0).addClass(o.classCurrent);
                    } else {
                        currentElement = currentElement.next('.' + o.classElement);
                        if(currentElement.length > 0){
                            elements.removeClass(o.classCurrent);
                            currentElement.addClass(o.classCurrent);
                        }
                    }
                }
                break;
            default:
                if(e.keyCode > 40 || e.keyCode == 8){
                    clearTimeout(timer);
                    timer = setTimeout(function(){
                        var value = $.trim(input.val());
                        if(value.length >= o.minChars){
                            var instance = ++ajaxInstance;
                            container.addClass(o.classLoading);
                            $.ajax({
                                "data": o.getData(value),
                                "success": function(data){
                                    if(instance == ajaxInstance){
                                        container.removeClass(o.classLoading).empty().append(o.getContent(data)).show();
                                    }
                                },
                                "type": o.method,
                                "url": o.url
                            });
                        } else {
                            container.empty().hide().removeClass(o.classLoading);
                        }
                    }, 300);
                }
        }
    })
    .on('focus.ajaxAutocomplete', function(){
        if(container.html() != ''){
            container.show();
        }
    })
    .on('blur.ajaxAutocomplete', function(){
        setTimeout(function(){
            container.hide();
        }, 100);
    });

    container.off('.ajaxAutocomplete')
    .on('mouseenter.ajaxAutocomplete', '.' + o.classElement, function(){
        container.find('.' + o.classElement).removeClass(o.classCurrent);
        $(this).addClass(o.classCurrent);
    })
    .on('click.ajaxAutocomplete', '.' + o.classElement, function(){
        o.onElementSelect(this);
    });
}


function getRandomColor()
{
    return '#' + Math.random().toString(16).substring(2, 8);
}
/**
 * Get inscribed area size
 *
 * @param int oW outer width
 * @param int oH outer height
 * @param int iW inner width
 * @param int iH inner height
 * @param bool R resize if smaller
 */
function getInscribedArea(oW, oH, iW, iH, R){
    if(!R && iW < oW && iH < oH){
        return {
            "h": iH,
            "w": iW
        };
    }
    if((oW / oH) > (iW / iH)){
        return {
            "h": oH,
            "w": Math.round(oH * iW / iH)
        }
    } else {
        return {
            "h": Math.round(oW * iH / iW),
            "w": oW
        };
    }
}

/**
 * Format number as 45,444,333.00
 */
num = num.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");


var isMobile = ($.browser && $.browser.mobile) || (/iphone|ipad|ipod|android/i.test(navigator.userAgent.toLowerCase()));