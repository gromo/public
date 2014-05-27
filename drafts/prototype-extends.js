/**
 * Extend Magento Prototype to add events support
 *
 *  Add jQuery events for window:
 *    - checkout (for tracking checkout sections in GA)
 *    - initProductConfig
 *    - loadCheckout
 *    - loadPayment
 *    - loadProduct
 *    - loadRegionUpdater
 *
 *  Add product option events support
 *    - change
 *    - state-update
 *
 *  Add validation classes to parent container
 *
 *  Add method to product config
 *    - getAttributeSelectByCode
 *    - getColorSelect (shortcut to getAttributeSelectByCode for 'color')
 *
 * @version 1.6
 */
;
(function($, _$, window){

    var debug = false;
    var events = [];
    var isDocumentReady = false;
    var isWindowLoaded = false;

    function log(){
        if(debug){
            if(window.console && $.isFunction(console.log)){
                console.log.apply(console, arguments);
            } else if(typeof arguments[0] == 'string') {
                alert(arguments[0]);
            }
        }
    }

    function onLoad(name, func){
        var check = function(){
            if(window[name]){
                log(name + ' initialized');
                func();
                triggerGlobalEvent('load' + name.charAt(0).toUpperCase() + name.slice(1));
            } else if(!isWindowLoaded){
                setTimeout(check, 200);
            }
        };
        check();
    }

    function trackCheckout(section){
        log('GA: "checkout:' + section + '"');
        triggerGlobalEvent('checkout', section);
    }

    function triggerGlobalEvent(){
        var args = [].slice.call(arguments);
        if(isDocumentReady){
            $.fn.trigger.apply($(window), args);
        } else {
            events.push(args);
        }
    }



    $(document).ready(function(){

        // Apply all events after document is ready
        isDocumentReady = true;
        setTimeout(function(){
            for(var i=0; i<events.length; i++){
                triggerGlobalEvent.apply(this, events[i]);
            }
        }, 100);

        // stop all events after window is loaded
        $(window).load(function(){
            isWindowLoaded = true;
        });

        if($('body').hasClass('checkout-onepage-success')){
            trackCheckout('success');
        }
        $('#checkoutSteps .section').filter('.active').each(function(){
            trackCheckout($(this).attr('id').replace('opc-', ''));
        });

    });

    onLoad('checkout', function(){
        checkout.accordion.openSection = function(section){
            section = _$(section);

            var sectionName = section.id.replace('opc-', '');
            var sectionElement = $('#opc-' + sectionName);

            if(sectionElement.hasClass('allow') && !sectionElement.hasClass('active')){
                trackCheckout(sectionName);
            }
            Accordion.prototype.openSection.apply(this, arguments);
            if($.fn.coreUISelect){
                sectionElement.find("select:hidden").coreUISelect("destroy");
                sectionElement.find("select:visible").coreUISelect("update");
            }
        };
    });

    onLoad('payment', function(){
        payment.switchMethod = function(){
            Payment.prototype.switchMethod.apply(this, arguments);
            $('select').coreUISelect('destroy').coreUISelect();
        };
    });

    /* CONFIGURABLE PRODUCT OPTIONS */
    onLoad('Product', function(){
        var Config = Product.Config;

        var initialize = Config.prototype.initialize;
        Config.prototype.initialize = function(){
            var productConfig = this;
            var output = initialize.apply(this, arguments);
            this.settings.each(function(element){
                Event.stopObserving(element, 'change');
                $(element).off('change').on('change', function(event){
                    var originalEvent = event.originalEvent || event;
                    if(!originalEvent.srcElement){
                        originalEvent.srcElement = event.target || this;
                    }
                    productConfig.configure(originalEvent);
                });
                $(element).trigger('state-update');
            }.bind(this));

            triggerGlobalEvent('initProductConfig', this);
            return output;
        };

        var fillSelect = Config.prototype.fillSelect;
        Config.prototype.fillSelect = function(element){
            var output = fillSelect.apply(this, arguments);
            $(element).trigger('state-update');
            return output;
        };

        var resetChildren = Config.prototype.resetChildren;
        Config.prototype.resetChildren = function(element){
            var output = resetChildren.apply(this, arguments);
            if(element.childSettings) {
                for(var i=0;i<element.childSettings.length;i++){
                    $(element.childSettings[i]).trigger('state-update');
                }
            }
            return output;
        };

        Config.prototype.getAttributeSelectByCode = function(code){
            var select = null;
            $.each(this.settings, function(){
                if(this.config.code == code){
                    select = this;
                    return false;
                }
            });
            return select;
        };

        Config.prototype.getColorSelect = function(){
            return this.getAttributeSelectByCode('color');
        };

    });

    onLoad('RegionUpdater', function(){
        var update = RegionUpdater.prototype.update;
        RegionUpdater.prototype.update = function(){
            if($.fn.coreUISelect){
                var select = $(this.regionSelectEl).coreUISelect('destroy');
                update.apply(this, arguments);
                this.disableAction=='hide' && select.is(':visible') && select.coreUISelect();
            } else {
                update.apply(this, arguments);
            }
        };
    });

    /* ADD ERROR-VALIDATION CLASSES TO PARENT ELEMENT */
    onLoad('Validation', function(){
        Validation.defaultOptions.addClassNameToContainer = true;
    });



})(jQuery, $, window);