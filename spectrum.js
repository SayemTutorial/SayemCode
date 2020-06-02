(function(a) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], a)
    } else if (typeof exports == "object" && typeof module == "object") {
        module.exports = a(require('jquery'))
    } else {
        a(jQuery)
    }
})(function($, y) {
    "use strict";
    var z = {
            beforeShow: noop,
            move: noop,
            change: noop,
            show: noop,
            hide: noop,
            color: false,
            flat: false,
            showInput: false,
            allowEmpty: false,
            showButtons: true,
            clickoutFiresChange: true,
            showInitial: false,
            showPalette: false,
            showPaletteOnly: false,
            hideAfterPaletteSelect: false,
            togglePaletteOnly: false,
            showSelectionPalette: true,
            localStorageKey: false,
            appendTo: "body",
            maxSelectionSize: 7,
            cancelText: "cancel",
            chooseText: "choose",
            togglePaletteMoreText: "more",
            togglePaletteLessText: "less",
            clearText: "Clear Color Selection",
            noColorSelectedText: "No Color Selected",
            preferredFormat: false,
            className: "",
            containerClassName: "",
            replacerClassName: "",
            showAlpha: false,
            theme: "sp-light",
            palette: [
                ["#ffffff", "#000000", "#ff0000", "#ff8000", "#ffff00", "#008000", "#0000ff", "#4b0082", "#9400d3"]
            ],
            selectionPalette: [],
            disabled: false,
            offset: null
        },
        spectrums = [],
        IE = !!/msie/i.exec(window.navigator.userAgent),
        rgbaSupport = (function() {
            function contains(a, b) {
                return !!~('' + a).indexOf(b)
            }
            var c = document.createElement('div');
            var d = c.style;
            d.cssText = 'background-color:rgba(0,0,0,.5)';
            return contains(d.backgroundColor, 'rgba') || contains(d.backgroundColor, 'hsla')
        })(),
        replaceInput = ["<div class='sp-replacer'>", "<div class='sp-preview'><div class='sp-preview-inner'></div></div>", "<div class='sp-dd'>&#9660;</div>", "</div>"].join(''),
        markup = (function() {
            var a = "";
            if (IE) {
                for (var i = 1; i <= 6; i++) {
                    a += "<div class='sp-" + i + "'></div>"
                }
            }
            return ["<div class='sp-container sp-hidden'>", "<div class='sp-palette-container'>", "<div class='sp-palette sp-thumb sp-cf'></div>", "<div class='sp-palette-button-container sp-cf'>", "<button type='button' class='sp-palette-toggle'></button>", "</div>", "</div>", "<div class='sp-picker-container'>", "<div class='sp-top sp-cf'>", "<div class='sp-fill'></div>", "<div class='sp-top-inner'>", "<div class='sp-color'>", "<div class='sp-sat'>", "<div class='sp-val'>", "<div class='sp-dragger'></div>", "</div>", "</div>", "</div>", "<div class='sp-clear sp-clear-display'>", "</div>", "<div class='sp-hue'>", "<div class='sp-slider'></div>", a, "</div>", "</div>", "<div class='sp-alpha'><div class='sp-alpha-inner'><div class='sp-alpha-handle'></div></div></div>", "</div>", "<div class='sp-input-container sp-cf'>", "<input class='sp-input' type='text' spellcheck='false'  />", "</div>", "<div class='sp-initial sp-thumb sp-cf'></div>", "<div class='sp-button-container sp-cf'>", "<a class='sp-cancel' href='#'></a>", "<button type='button' class='sp-choose'></button>", "</div>", "</div>", "</div>"].join("")
        })();

    function paletteTemplate(p, a, b, d) {
        var e = [];
        for (var i = 0; i < p.length; i++) {
            var f = p[i];
            if (f) {
                var g = tinycolor(f);
                var c = g.toHsl().l < 0.5 ? "sp-thumb-el sp-thumb-dark" : "sp-thumb-el sp-thumb-light";
                c += (tinycolor.equals(a, f)) ? " sp-thumb-active" : "";
                var h = g.toString(d.preferredFormat || "rgb");
                var j = rgbaSupport ? ("background-color:" + g.toRgbString()) : "filter:" + g.toFilter();
                e.push('<span title="' + h + '" data-color="' + g.toRgbString() + '" class="' + c + '"><span class="sp-thumb-inner" style="' + j + ';" /></span>')
            } else {
                var k = 'sp-clear-display';
                e.push($('<div />').append($('<span data-color="" style="background-color:transparent;" class="' + k + '"></span>').attr('title', d.noColorSelectedText)).html())
            }
        }
        return "<div class='sp-cf " + b + "'>" + e.join('') + "</div>"
    }

    function hideAll() {
        for (var i = 0; i < spectrums.length; i++) {
            if (spectrums[i]) {
                spectrums[i].hide()
            }
        }
    }

    function instanceOptions(o, a) {
        var b = $.extend({}, z, o);
        b.callbacks = {
            'move': bind(b.move, a),
            'change': bind(b.change, a),
            'show': bind(b.show, a),
            'hide': bind(b.hide, a),
            'beforeShow': bind(b.beforeShow, a)
        };
        return b
    }

    function spectrum(k, o) {
        var l = instanceOptions(o, k),
            flat = l.flat,
            showSelectionPalette = l.showSelectionPalette,
            localStorageKey = l.localStorageKey,
            theme = l.theme,
            callbacks = l.callbacks,
            resize = throttle(reflow, 10),
            visible = false,
            isDragging = false,
            dragWidth = 0,
            dragHeight = 0,
            dragHelperHeight = 0,
            slideHeight = 0,
            slideWidth = 0,
            alphaWidth = 0,
            alphaSlideHelperWidth = 0,
            slideHelperHeight = 0,
            currentHue = 0,
            currentSaturation = 0,
            currentValue = 0,
            currentAlpha = 1,
            palette = [],
            paletteArray = [],
            paletteLookup = {},
            selectionPalette = l.selectionPalette.slice(0),
            maxSelectionSize = l.maxSelectionSize,
            draggingClass = "sp-dragging",
            shiftMovementDirection = null;
        var m = k.ownerDocument,
            body = m.body,
            boundElement = $(k),
            disabled = false,
            container = $(markup, m).addClass(theme),
            pickerContainer = container.find(".sp-picker-container"),
            dragger = container.find(".sp-color"),
            dragHelper = container.find(".sp-dragger"),
            slider = container.find(".sp-hue"),
            slideHelper = container.find(".sp-slider"),
            alphaSliderInner = container.find(".sp-alpha-inner"),
            alphaSlider = container.find(".sp-alpha"),
            alphaSlideHelper = container.find(".sp-alpha-handle"),
            textInput = container.find(".sp-input"),
            paletteContainer = container.find(".sp-palette"),
            initialColorContainer = container.find(".sp-initial"),
            cancelButton = container.find(".sp-cancel"),
            clearButton = container.find(".sp-clear"),
            chooseButton = container.find(".sp-choose"),
            toggleButton = container.find(".sp-palette-toggle"),
            isInput = boundElement.is("input"),
            isInputTypeColor = isInput && boundElement.attr("type") === "color" && inputTypeColorSupport(),
            shouldReplace = isInput && !flat,
            replacer = (shouldReplace) ? $(replaceInput).addClass(theme).addClass(l.className).addClass(l.replacerClassName) : $([]),
            offsetElement = (shouldReplace) ? replacer : boundElement,
            previewElement = replacer.find(".sp-preview-inner"),
            initialColor = l.color || (isInput && boundElement.val()),
            colorOnShow = false,
            currentPreferredFormat = l.preferredFormat,
            clickoutFiresChange = !l.showButtons || l.clickoutFiresChange,
            isEmpty = !initialColor,
            allowEmpty = l.allowEmpty && !isInputTypeColor;

        function applyOptions() {
            if (l.showPaletteOnly) {
                l.showPalette = true
            }
            toggleButton.text(l.showPaletteOnly ? l.togglePaletteMoreText : l.togglePaletteLessText);
            if (l.palette) {
                palette = l.palette.slice(0);
                paletteArray = $.isArray(palette[0]) ? palette : [palette];
                paletteLookup = {};
                for (var i = 0; i < paletteArray.length; i++) {
                    for (var j = 0; j < paletteArray[i].length; j++) {
                        var a = tinycolor(paletteArray[i][j]).toRgbString();
                        paletteLookup[a] = true
                    }
                }
            }
            container.toggleClass("sp-flat", flat);
            container.toggleClass("sp-input-disabled", !l.showInput);
            container.toggleClass("sp-alpha-enabled", l.showAlpha);
            container.toggleClass("sp-clear-enabled", allowEmpty);
            container.toggleClass("sp-buttons-disabled", !l.showButtons);
            container.toggleClass("sp-palette-buttons-disabled", !l.togglePaletteOnly);
            container.toggleClass("sp-palette-disabled", !l.showPalette);
            container.toggleClass("sp-palette-only", l.showPaletteOnly);
            container.toggleClass("sp-initial-disabled", !l.showInitial);
            container.addClass(l.className).addClass(l.containerClassName);
            reflow()
        }

        function initialize() {
            if (IE) {
                container.find("*:not(input)").attr("unselectable", "on")
            }
            applyOptions();
            if (shouldReplace) {
                boundElement.after(replacer).hide()
            }
            if (!allowEmpty) {
                clearButton.hide()
            }
            if (flat) {
                boundElement.after(container).hide()
            } else {
                var i = l.appendTo === "parent" ? boundElement.parent() : $(l.appendTo);
                if (i.length !== 1) {
                    i = $("body")
                }
                i.append(container)
            }
            updateSelectionPaletteFromStorage();
            offsetElement.bind("click.spectrum touchstart.spectrum", function(e) {
                if (!disabled) {
                    toggle()
                }
                e.stopPropagation();
                if (!$(e.target).is("input")) {
                    e.preventDefault()
                }
            });
            if (boundElement.is(":disabled") || (l.disabled === true)) {
                disable()
            }
            container.click(stopPropagation);
            textInput.change(setFromTextInput);
            textInput.bind("paste", function() {
                setTimeout(setFromTextInput, 1)
            });
            textInput.keydown(function(e) {
                if (e.keyCode == 13) {
                    setFromTextInput()
                }
            });
            cancelButton.text(l.cancelText);
            cancelButton.bind("click.spectrum", function(e) {
                e.stopPropagation();
                e.preventDefault();
                revert();
                hide()
            });
            clearButton.attr("title", l.clearText);
            clearButton.bind("click.spectrum", function(e) {
                e.stopPropagation();
                e.preventDefault();
                isEmpty = true;
                move();
                if (flat) {
                    updateOriginalInput(true)
                }
            });
            chooseButton.text(l.chooseText);
            chooseButton.bind("click.spectrum", function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (IE && textInput.is(":focus")) {
                    textInput.trigger('change')
                }
                if (isValid()) {
                    updateOriginalInput(true);
                    hide()
                }
            });
            toggleButton.text(l.showPaletteOnly ? l.togglePaletteMoreText : l.togglePaletteLessText);
            toggleButton.bind("click.spectrum", function(e) {
                e.stopPropagation();
                e.preventDefault();
                l.showPaletteOnly = !l.showPaletteOnly;
                if (!l.showPaletteOnly && !flat) {
                    container.css('left', '-=' + (pickerContainer.outerWidth(true) + 5))
                }
                applyOptions()
            });
            draggable(alphaSlider, function(a, b, e) {
                currentAlpha = (a / alphaWidth);
                isEmpty = false;
                if (e.shiftKey) {
                    currentAlpha = Math.round(currentAlpha * 10) / 10
                }
                move()
            }, dragStart, dragStop);
            draggable(slider, function(a, b) {
                currentHue = parseFloat(b / slideHeight);
                isEmpty = false;
                if (!l.showAlpha) {
                    currentAlpha = 1
                }
                move()
            }, dragStart, dragStop);
            draggable(dragger, function(a, b, e) {
                if (!e.shiftKey) {
                    shiftMovementDirection = null
                } else if (!shiftMovementDirection) {
                    var c = currentSaturation * dragWidth;
                    var d = dragHeight - (currentValue * dragHeight);
                    var f = Math.abs(a - c) > Math.abs(b - d);
                    shiftMovementDirection = f ? "x" : "y"
                }
                var g = !shiftMovementDirection || shiftMovementDirection === "x";
                var h = !shiftMovementDirection || shiftMovementDirection === "y";
                if (g) {
                    currentSaturation = parseFloat(a / dragWidth)
                }
                if (h) {
                    currentValue = parseFloat((dragHeight - b) / dragHeight)
                }
                isEmpty = false;
                if (!l.showAlpha) {
                    currentAlpha = 1
                }
                move()
            }, dragStart, dragStop);
            if (!!initialColor) {
                set(initialColor);
                updateUI();
                currentPreferredFormat = l.preferredFormat || tinycolor(initialColor).format;
                addColorToSelectionPalette(initialColor)
            } else {
                updateUI()
            }
            if (flat) {
                show()
            }

            function paletteElementClick(e) {
                if (e.data && e.data.ignore) {
                    set($(e.target).closest(".sp-thumb-el").data("color"));
                    move()
                } else {
                    set($(e.target).closest(".sp-thumb-el").data("color"));
                    move();
                    updateOriginalInput(true);
                    if (l.hideAfterPaletteSelect) {
                        hide()
                    }
                }
                return false
            }
            var j = IE ? "mousedown.spectrum" : "click.spectrum touchstart.spectrum";
            paletteContainer.delegate(".sp-thumb-el", j, paletteElementClick);
            initialColorContainer.delegate(".sp-thumb-el:nth-child(1)", j, {
                ignore: true
            }, paletteElementClick)
        }

        function updateSelectionPaletteFromStorage() {
            if (localStorageKey && window.localStorage) {
                try {
                    var a = window.localStorage[localStorageKey].split(",#");
                    if (a.length > 1) {
                        delete window.localStorage[localStorageKey];
                        $.each(a, function(i, c) {
                            addColorToSelectionPalette(c)
                        })
                    }
                } catch (e) {}
                try {
                    selectionPalette = window.localStorage[localStorageKey].split(";")
                } catch (e) {}
            }
        }

        function addColorToSelectionPalette(a) {
            if (showSelectionPalette) {
                var b = tinycolor(a).toRgbString();
                if (!paletteLookup[b] && $.inArray(b, selectionPalette) === -1) {
                    selectionPalette.push(b);
                    while (selectionPalette.length > maxSelectionSize) {
                        selectionPalette.shift()
                    }
                }
                if (localStorageKey && window.localStorage) {
                    try {
                        window.localStorage[localStorageKey] = selectionPalette.join(";")
                    } catch (e) {}
                }
            }
        }

        function getUniqueSelectionPalette() {
            var a = [];
            if (l.showPalette) {
                for (var i = 0; i < selectionPalette.length; i++) {
                    var b = tinycolor(selectionPalette[i]).toRgbString();
                    if (!paletteLookup[b]) {
                        a.push(selectionPalette[i])
                    }
                }
            }
            return a.reverse().slice(0, l.maxSelectionSize)
        }

        function drawPalette() {
            var b = get();
            var c = $.map(paletteArray, function(a, i) {
                return paletteTemplate(a, b, "sp-palette-row sp-palette-row-" + i, l)
            });
            updateSelectionPaletteFromStorage();
            if (selectionPalette) {
                c.push(paletteTemplate(getUniqueSelectionPalette(), b, "sp-palette-row sp-palette-row-selection", l))
            }
            paletteContainer.html(c.join(""))
        }

        function drawInitial() {
            if (l.showInitial) {
                var a = colorOnShow;
                var b = get();
                initialColorContainer.html(paletteTemplate([a, b], b, "sp-palette-row-initial", l))
            }
        }

        function dragStart() {
            if (dragHeight <= 0 || dragWidth <= 0 || slideHeight <= 0) {
                reflow()
            }
            isDragging = true;
            container.addClass(draggingClass);
            shiftMovementDirection = null;
            boundElement.trigger('dragstart.spectrum', [get()])
        }

        function dragStop() {
            isDragging = false;
            container.removeClass(draggingClass);
            boundElement.trigger('dragstop.spectrum', [get()])
        }

        function setFromTextInput() {
            var a = textInput.val();
            if ((a === null || a === "") && allowEmpty) {
                set(null);
                updateOriginalInput(true)
            } else {
                var b = tinycolor(a);
                if (b.isValid()) {
                    set(b);
                    updateOriginalInput(true)
                } else {
                    textInput.addClass("sp-validation-error")
                }
            }
        }

        function toggle() {
            if (visible) {
                hide()
            } else {
                show()
            }
        }

        function show() {
            var a = $.Event('beforeShow.spectrum');
            if (visible) {
                reflow();
                return
            }
            boundElement.trigger(a, [get()]);
            if (callbacks.beforeShow(get()) === false || a.isDefaultPrevented()) {
                return
            }
            hideAll();
            visible = true;
            $(m).bind("keydown.spectrum", onkeydown);
            $(m).bind("click.spectrum", clickout);
            $(window).bind("resize.spectrum", resize);
            replacer.addClass("sp-active");
            container.removeClass("sp-hidden");
            reflow();
            updateUI();
            colorOnShow = get();
            drawInitial();
            callbacks.show(colorOnShow);
            boundElement.trigger('show.spectrum', [colorOnShow])
        }

        function onkeydown(e) {
            if (e.keyCode === 27) {
                hide()
            }
        }

        function clickout(e) {
            if (e.button == 2) {
                return
            }
            if (isDragging) {
                return
            }
            if (clickoutFiresChange) {
                updateOriginalInput(true)
            } else {
                revert()
            }
            hide()
        }

        function hide() {
            if (!visible || flat) {
                return
            }
            visible = false;
            $(m).unbind("keydown.spectrum", onkeydown);
            $(m).unbind("click.spectrum", clickout);
            $(window).unbind("resize.spectrum", resize);
            replacer.removeClass("sp-active");
            container.addClass("sp-hidden");
            callbacks.hide(get());
            boundElement.trigger('hide.spectrum', [get()])
        }

        function revert() {
            set(colorOnShow, true)
        }

        function set(a, b) {
            if (tinycolor.equals(a, get())) {
                updateUI();
                return
            }
            var c, newHsv;
            if (!a && allowEmpty) {
                isEmpty = true
            } else {
                isEmpty = false;
                c = tinycolor(a);
                newHsv = c.toHsv();
                currentHue = (newHsv.h % 360) / 360;
                currentSaturation = newHsv.s;
                currentValue = newHsv.v;
                currentAlpha = newHsv.a
            }
            updateUI();
            if (c && c.isValid() && !b) {
                currentPreferredFormat = l.preferredFormat || c.getFormat()
            }
        }

        function get(a) {
            a = a || {};
            if (allowEmpty && isEmpty) {
                return null
            }
            return tinycolor.fromRatio({
                h: currentHue,
                s: currentSaturation,
                v: currentValue,
                a: Math.round(currentAlpha * 100) / 100
            }, {
                format: a.format || currentPreferredFormat
            })
        }

        function isValid() {
            return !textInput.hasClass("sp-validation-error")
        }

        function move() {
            updateUI();
            callbacks.move(get());
            boundElement.trigger('move.spectrum', [get()])
        }

        function updateUI() {
            textInput.removeClass("sp-validation-error");
            updateHelperLocations();
            var a = tinycolor.fromRatio({
                h: currentHue,
                s: 1,
                v: 1
            });
            dragger.css("background-color", a.toHexString());
            var b = currentPreferredFormat;
            if (currentAlpha < 1 && !(currentAlpha === 0 && b === "name")) {
                if (b === "hex" || b === "hex3" || b === "hex6" || b === "name") {
                    b = "rgb"
                }
            }
            var c = get({
                    format: b
                }),
                displayColor = '';
            previewElement.removeClass("sp-clear-display");
            previewElement.css('background-color', 'transparent');
            if (!c && allowEmpty) {
                previewElement.addClass("sp-clear-display")
            } else {
                var d = c.toHexString(),
                    realRgb = c.toRgbString();
                if (rgbaSupport || c.alpha === 1) {
                    previewElement.css("background-color", realRgb)
                } else {
                    previewElement.css("background-color", "transparent");
                    previewElement.css("filter", c.toFilter())
                }
                if (l.showAlpha) {
                    var e = c.toRgb();
                    e.a = 0;
                    var f = tinycolor(e).toRgbString();
                    var g = "linear-gradient(left, " + f + ", " + d + ")";
                    if (IE) {
                        alphaSliderInner.css("filter", tinycolor(f).toFilter({
                            gradientType: 1
                        }, d))
                    } else {
                        alphaSliderInner.css("background", "-webkit-" + g);
                        alphaSliderInner.css("background", "-moz-" + g);
                        alphaSliderInner.css("background", "-ms-" + g);
                        alphaSliderInner.css("background", "linear-gradient(to right, " + f + ", " + d + ")")
                    }
                }
                displayColor = c.toString(b)
            }
            if (l.showInput) {
                textInput.val(displayColor)
            }
            if (l.showPalette) {
                drawPalette()
            }
            drawInitial()
        }

        function updateHelperLocations() {
            var s = currentSaturation;
            var v = currentValue;
            if (allowEmpty && isEmpty) {
                alphaSlideHelper.hide();
                slideHelper.hide();
                dragHelper.hide()
            } else {
                alphaSlideHelper.show();
                slideHelper.show();
                dragHelper.show();
                var a = s * dragWidth;
                var b = dragHeight - (v * dragHeight);
                a = Math.max(-dragHelperHeight, Math.min(dragWidth - dragHelperHeight, a - dragHelperHeight));
                b = Math.max(-dragHelperHeight, Math.min(dragHeight - dragHelperHeight, b - dragHelperHeight));
                dragHelper.css({
                    "top": b + "px",
                    "left": a + "px"
                });
                var c = currentAlpha * alphaWidth;
                alphaSlideHelper.css({
                    "left": (c - (alphaSlideHelperWidth / 2)) + "px"
                });
                var d = (currentHue) * slideHeight;
                slideHelper.css({
                    "top": (d - slideHelperHeight) + "px"
                })
            }
        }

        function updateOriginalInput(a) {
            var b = get(),
                displayColor = '',
                hasChanged = !tinycolor.equals(b, colorOnShow);
            if (b) {
                displayColor = b.toString(currentPreferredFormat);
                addColorToSelectionPalette(b)
            }
            if (isInput) {
                boundElement.val(displayColor)
            }
            if (a && hasChanged) {
                callbacks.change(b);
                boundElement.trigger('change', [b])
            }
        }

        function reflow() {
            if (!visible) {
                return
            }
            dragWidth = dragger.width();
            dragHeight = dragger.height();
            dragHelperHeight = dragHelper.height();
            slideWidth = slider.width();
            slideHeight = slider.height();
            slideHelperHeight = slideHelper.height();
            alphaWidth = alphaSlider.width();
            alphaSlideHelperWidth = alphaSlideHelper.width();
            if (!flat) {
                container.css("position", "absolute");
                if (l.offset) {
                    container.offset(l.offset)
                } else {
                    container.offset(getOffset(container, offsetElement))
                }
            }
            updateHelperLocations();
            if (l.showPalette) {
                drawPalette()
            }
            boundElement.trigger('reflow.spectrum')
        }

        function destroy() {
            boundElement.show();
            offsetElement.unbind("click.spectrum touchstart.spectrum");
            container.remove();
            replacer.remove();
            spectrums[n.id] = null
        }

        function option(a, b) {
            if (a === y) {
                return $.extend({}, l)
            }
            if (b === y) {
                return l[a]
            }
            l[a] = b;
            if (a === "preferredFormat") {
                currentPreferredFormat = l.preferredFormat
            }
            applyOptions()
        }

        function enable() {
            disabled = false;
            boundElement.attr("disabled", false);
            offsetElement.removeClass("sp-disabled")
        }

        function disable() {
            hide();
            disabled = true;
            boundElement.attr("disabled", true);
            offsetElement.addClass("sp-disabled")
        }

        function setOffset(a) {
            l.offset = a;
            reflow()
        }
        initialize();
        var n = {
            show: show,
            hide: hide,
            toggle: toggle,
            reflow: reflow,
            option: option,
            enable: enable,
            disable: disable,
            offset: setOffset,
            set: function(c) {
                set(c);
                updateOriginalInput()
            },
            get: get,
            destroy: destroy,
            container: container
        };
        n.id = spectrums.push(n) - 1;
        return n
    }

    function getOffset(a, b) {
        var c = 0;
        var d = a.outerWidth();
        var e = a.outerHeight();
        var f = b.outerHeight();
        var g = a[0].ownerDocument;
        var h = g.documentElement;
        var i = h.clientWidth + $(g).scrollLeft();
        var j = h.clientHeight + $(g).scrollTop();
        var k = b.offset();
        k.top += f;
        k.left -= Math.min(k.left, (k.left + d > i && i > d) ? Math.abs(k.left + d - i) : 0);
        k.top -= Math.min(k.top, ((k.top + e > j && j > e) ? Math.abs(e + f - c) : c));
        return k
    }

    function noop() {}

    function stopPropagation(e) {
        e.stopPropagation()
    }

    function bind(a, b) {
        var c = Array.prototype.slice;
        var d = c.call(arguments, 2);
        return function() {
            return a.apply(b, d.concat(c.call(arguments)))
        }
    }

    function draggable(g, h, i, j) {
        h = h || function() {};
        i = i || function() {};
        j = j || function() {};
        var k = document;
        var l = false;
        var m = {};
        var n = 0;
        var o = 0;
        var p = ('ontouchstart' in window);
        var q = {};
        q["selectstart"] = prevent;
        q["dragstart"] = prevent;
        q["touchmove mousemove"] = move;
        q["touchend mouseup"] = stop;

        function prevent(e) {
            if (e.stopPropagation) {
                e.stopPropagation()
            }
            if (e.preventDefault) {
                e.preventDefault()
            }
            e.returnValue = false
        }

        function move(e) {
            if (l) {
                if (IE && k.documentMode < 9 && !e.button) {
                    return stop()
                }
                var a = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
                var b = a && a.pageX || e.pageX;
                var c = a && a.pageY || e.pageY;
                var d = Math.max(0, Math.min(b - m.left, o));
                var f = Math.max(0, Math.min(c - m.top, n));
                if (p) {
                    prevent(e)
                }
                h.apply(g, [d, f, e])
            }
        }

        function start(e) {
            var a = (e.which) ? (e.which == 3) : (e.button == 2);
            if (!a && !l) {
                if (i.apply(g, arguments) !== false) {
                    l = true;
                    n = $(g).height();
                    o = $(g).width();
                    m = $(g).offset();
                    $(k).bind(q);
                    $(k.body).addClass("sp-dragging");
                    move(e);
                    prevent(e)
                }
            }
        }

        function stop() {
            if (l) {
                $(k).unbind(q);
                $(k.body).removeClass("sp-dragging");
                setTimeout(function() {
                    j.apply(g, arguments)
                }, 0)
            }
            l = false
        }
        $(g).bind("touchstart mousedown", start)
    }

    function throttle(c, d, e) {
        var f;
        return function() {
            var a = this,
                args = arguments;
            var b = function() {
                f = null;
                c.apply(a, args)
            };
            if (e) clearTimeout(f);
            if (e || !f) f = setTimeout(b, d)
        }
    }

    function inputTypeColorSupport() {
        return $.fn.spectrum.inputTypeColorSupport()
    }
    var A = "spectrum.id";
    $.fn.spectrum = function(c, d) {
        if (typeof c == "string") {
            var e = this;
            var f = Array.prototype.slice.call(arguments, 1);
            this.each(function() {
                var a = spectrums[$(this).data(A)];
                if (a) {
                    var b = a[c];
                    if (!b) {
                        throw new Error("Spectrum: no such method: '" + c + "'");
                    }
                    if (c == "get") {
                        e = a.get()
                    } else if (c == "container") {
                        e = a.container
                    } else if (c == "option") {
                        e = a.option.apply(a, f)
                    } else if (c == "destroy") {
                        a.destroy();
                        $(this).removeData(A)
                    } else {
                        b.apply(a, f)
                    }
                }
            });
            return e
        }
        return this.spectrum("destroy").each(function() {
            var a = $.extend({}, c, $(this).data());
            var b = spectrum(this, a);
            $(this).data(A, b.id)
        })
    };
    $.fn.spectrum.load = true;
    $.fn.spectrum.loadOpts = {};
    $.fn.spectrum.draggable = draggable;
    $.fn.spectrum.defaults = z;
    $.fn.spectrum.inputTypeColorSupport = function inputTypeColorSupport() {
        if (typeof inputTypeColorSupport._cachedResult === "undefined") {
            var a = $("<input type='color'/>")[0];
            inputTypeColorSupport._cachedResult = a.type === "color" && a.value !== ""
        }
        return inputTypeColorSupport._cachedResult
    };
    $.spectrum = {};
    $.spectrum.localization = {};
    $.spectrum.palettes = {};
    $.fn.spectrum.processNativeColorInputs = function() {
        var a = $("input[type=color]");
        if (a.length && !inputTypeColorSupport()) {
            a.spectrum({
                preferredFormat: "hex6"
            })
        }
    };
    (function() {
        var j = /^[\s,#]+/,
            trimRight = /\s+$/,
            tinyCounter = 0,
            math = Math,
            mathRound = math.round,
            mathMin = math.min,
            mathMax = math.max,
            mathRandom = math.random;
        var k = function(a, b) {
            a = (a) ? a : '';
            b = b || {};
            if (a instanceof k) {
                return a
            }
            if (!(this instanceof k)) {
                return new k(a, b)
            }
            var c = inputToRGB(a);
            this._originalInput = a, this._r = c.r, this._g = c.g, this._b = c.b, this._a = c.a, this._roundA = mathRound(100 * this._a) / 100, this._format = b.format || c.format;
            this._gradientType = b.gradientType;
            if (this._r < 1) {
                this._r = mathRound(this._r)
            }
            if (this._g < 1) {
                this._g = mathRound(this._g)
            }
            if (this._b < 1) {
                this._b = mathRound(this._b)
            }
            this._ok = c.ok;
            this._tc_id = tinyCounter++
        };
        k.prototype = {
            isDark: function() {
                return this.getBrightness() < 128
            },
            isLight: function() {
                return !this.isDark()
            },
            isValid: function() {
                return this._ok
            },
            getOriginalInput: function() {
                return this._originalInput
            },
            getFormat: function() {
                return this._format
            },
            getAlpha: function() {
                return this._a
            },
            getBrightness: function() {
                var a = this.toRgb();
                return (a.r * 299 + a.g * 587 + a.b * 114) / 1000
            },
            setAlpha: function(a) {
                this._a = boundAlpha(a);
                this._roundA = mathRound(100 * this._a) / 100;
                return this
            },
            toHsv: function() {
                var a = rgbToHsv(this._r, this._g, this._b);
                return {
                    h: a.h * 360,
                    s: a.s,
                    v: a.v,
                    a: this._a
                }
            },
            toHsvString: function() {
                var a = rgbToHsv(this._r, this._g, this._b);
                var h = mathRound(a.h * 360),
                    s = mathRound(a.s * 100),
                    v = mathRound(a.v * 100);
                return (this._a == 1) ? "hsv(" + h + ", " + s + "%, " + v + "%)" : "hsva(" + h + ", " + s + "%, " + v + "%, " + this._roundA + ")"
            },
            toHsl: function() {
                var a = rgbToHsl(this._r, this._g, this._b);
                return {
                    h: a.h * 360,
                    s: a.s,
                    l: a.l,
                    a: this._a
                }
            },
            toHslString: function() {
                var a = rgbToHsl(this._r, this._g, this._b);
                var h = mathRound(a.h * 360),
                    s = mathRound(a.s * 100),
                    l = mathRound(a.l * 100);
                return (this._a == 1) ? "hsl(" + h + ", " + s + "%, " + l + "%)" : "hsla(" + h + ", " + s + "%, " + l + "%, " + this._roundA + ")"
            },
            toHex: function(a) {
                return rgbToHex(this._r, this._g, this._b, a)
            },
            toHexString: function(a) {
                return '#' + this.toHex(a)
            },
            toHex8: function() {
                return rgbaToHex(this._r, this._g, this._b, this._a)
            },
            toHex8String: function() {
                return '#' + this.toHex8()
            },
            toRgb: function() {
                return {
                    r: mathRound(this._r),
                    g: mathRound(this._g),
                    b: mathRound(this._b),
                    a: this._a
                }
            },
            toRgbString: function() {
                return (this._a == 1) ? "rgb(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" : "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")"
            },
            toPercentageRgb: function() {
                return {
                    r: mathRound(bound01(this._r, 255) * 100) + "%",
                    g: mathRound(bound01(this._g, 255) * 100) + "%",
                    b: mathRound(bound01(this._b, 255) * 100) + "%",
                    a: this._a
                }
            },
            toPercentageRgbString: function() {
                return (this._a == 1) ? "rgb(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" : "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")"
            },
            toName: function() {
                if (this._a === 0) {
                    return "transparent"
                }
                if (this._a < 1) {
                    return false
                }
                return u[rgbToHex(this._r, this._g, this._b, true)] || false
            },
            toFilter: function(a) {
                var b = '#' + rgbaToHex(this._r, this._g, this._b, this._a);
                var c = b;
                var d = this._gradientType ? "GradientType = 1, " : "";
                if (a) {
                    var s = k(a);
                    c = s.toHex8String()
                }
                return "progid:DXImageTransform.Microsoft.gradient(" + d + "startColorstr=" + b + ",endColorstr=" + c + ")"
            },
            toString: function(a) {
                var b = !!a;
                a = a || this._format;
                var c = false;
                var d = this._a < 1 && this._a >= 0;
                var e = !b && d && (a === "hex" || a === "hex6" || a === "hex3" || a === "name");
                if (e) {
                    if (a === "name" && this._a === 0) {
                        return this.toName()
                    }
                    return this.toRgbString()
                }
                if (a === "rgb") {
                    c = this.toRgbString()
                }
                if (a === "prgb") {
                    c = this.toPercentageRgbString()
                }
                if (a === "hex" || a === "hex6") {
                    c = this.toHexString()
                }
                if (a === "hex3") {
                    c = this.toHexString(true)
                }
                if (a === "hex8") {
                    c = this.toHex8String()
                }
                if (a === "name") {
                    c = this.toName()
                }
                if (a === "hsl") {
                    c = this.toHslString()
                }
                if (a === "hsv") {
                    c = this.toHsvString()
                }
                return c || this.toHexString()
            },
            _applyModification: function(a, b) {
                var c = a.apply(null, [this].concat([].slice.call(b)));
                this._r = c._r;
                this._g = c._g;
                this._b = c._b;
                this.setAlpha(c._a);
                return this
            },
            lighten: function() {
                return this._applyModification(lighten, arguments)
            },
            brighten: function() {
                return this._applyModification(brighten, arguments)
            },
            darken: function() {
                return this._applyModification(darken, arguments)
            },
            desaturate: function() {
                return this._applyModification(desaturate, arguments)
            },
            saturate: function() {
                return this._applyModification(saturate, arguments)
            },
            greyscale: function() {
                return this._applyModification(greyscale, arguments)
            },
            spin: function() {
                return this._applyModification(spin, arguments)
            },
            _applyCombination: function(a, b) {
                return a.apply(null, [this].concat([].slice.call(b)))
            },
            analogous: function() {
                return this._applyCombination(analogous, arguments)
            },
            complement: function() {
                return this._applyCombination(complement, arguments)
            },
            monochromatic: function() {
                return this._applyCombination(monochromatic, arguments)
            },
            splitcomplement: function() {
                return this._applyCombination(splitcomplement, arguments)
            },
            triad: function() {
                return this._applyCombination(triad, arguments)
            },
            tetrad: function() {
                return this._applyCombination(tetrad, arguments)
            }
        };
        k.fromRatio = function(a, b) {
            if (typeof a == "object") {
                var c = {};
                for (var i in a) {
                    if (a.hasOwnProperty(i)) {
                        if (i === "a") {
                            c[i] = a[i]
                        } else {
                            c[i] = convertToPercentage(a[i])
                        }
                    }
                }
                a = c
            }
            return k(a, b)
        };

        function inputToRGB(b) {
            var c = {
                r: 0,
                g: 0,
                b: 0
            };
            var a = 1;
            var d = false;
            var e = false;
            if (typeof b == "string") {
                b = stringInputToObject(b)
            }
            if (typeof b == "object") {
                if (b.hasOwnProperty("r") && b.hasOwnProperty("g") && b.hasOwnProperty("b")) {
                    c = rgbToRgb(b.r, b.g, b.b);
                    d = true;
                    e = String(b.r).substr(-1) === "%" ? "prgb" : "rgb"
                } else if (b.hasOwnProperty("h") && b.hasOwnProperty("s") && b.hasOwnProperty("v")) {
                    b.s = convertToPercentage(b.s);
                    b.v = convertToPercentage(b.v);
                    c = hsvToRgb(b.h, b.s, b.v);
                    d = true;
                    e = "hsv"
                } else if (b.hasOwnProperty("h") && b.hasOwnProperty("s") && b.hasOwnProperty("l")) {
                    b.s = convertToPercentage(b.s);
                    b.l = convertToPercentage(b.l);
                    c = hslToRgb(b.h, b.s, b.l);
                    d = true;
                    e = "hsl"
                }
                if (b.hasOwnProperty("a")) {
                    a = b.a
                }
            }
            a = boundAlpha(a);
            return {
                ok: d,
                format: b.format || e,
                r: mathMin(255, mathMax(c.r, 0)),
                g: mathMin(255, mathMax(c.g, 0)),
                b: mathMin(255, mathMax(c.b, 0)),
                a: a
            }
        }

        function rgbToRgb(r, g, b) {
            return {
                r: bound01(r, 255) * 255,
                g: bound01(g, 255) * 255,
                b: bound01(b, 255) * 255
            }
        }

        function rgbToHsl(r, g, b) {
            r = bound01(r, 255);
            g = bound01(g, 255);
            b = bound01(b, 255);
            var a = mathMax(r, g, b),
                min = mathMin(r, g, b);
            var h, s, l = (a + min) / 2;
            if (a == min) {
                h = s = 0
            } else {
                var d = a - min;
                s = l > 0.5 ? d / (2 - a - min) : d / (a + min);
                switch (a) {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;
                    case g:
                        h = (b - r) / d + 2;
                        break;
                    case b:
                        h = (r - g) / d + 4;
                        break
                }
                h /= 6
            }
            return {
                h: h,
                s: s,
                l: l
            }
        }

        function hslToRgb(h, s, l) {
            var r, g, b;
            h = bound01(h, 360);
            s = bound01(s, 100);
            l = bound01(l, 100);

            function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p
            }
            if (s === 0) {
                r = g = b = l
            } else {
                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3)
            }
            return {
                r: r * 255,
                g: g * 255,
                b: b * 255
            }
        }

        function rgbToHsv(r, g, b) {
            r = bound01(r, 255);
            g = bound01(g, 255);
            b = bound01(b, 255);
            var a = mathMax(r, g, b),
                min = mathMin(r, g, b);
            var h, s, v = a;
            var d = a - min;
            s = a === 0 ? 0 : d / a;
            if (a == min) {
                h = 0
            } else {
                switch (a) {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;
                    case g:
                        h = (b - r) / d + 2;
                        break;
                    case b:
                        h = (r - g) / d + 4;
                        break
                }
                h /= 6
            }
            return {
                h: h,
                s: s,
                v: v
            }
        }

        function hsvToRgb(h, s, v) {
            h = bound01(h, 360) * 6;
            s = bound01(s, 100);
            v = bound01(v, 100);
            var i = math.floor(h),
                f = h - i,
                p = v * (1 - s),
                q = v * (1 - f * s),
                t = v * (1 - (1 - f) * s),
                mod = i % 6,
                r = [v, q, p, p, t, v][mod],
                g = [t, v, v, q, p, p][mod],
                b = [p, p, t, v, v, q][mod];
            return {
                r: r * 255,
                g: g * 255,
                b: b * 255
            }
        }

        function rgbToHex(r, g, b, a) {
            var c = [pad2(mathRound(r).toString(16)), pad2(mathRound(g).toString(16)), pad2(mathRound(b).toString(16))];
            if (a && c[0].charAt(0) == c[0].charAt(1) && c[1].charAt(0) == c[1].charAt(1) && c[2].charAt(0) == c[2].charAt(1)) {
                return c[0].charAt(0) + c[1].charAt(0) + c[2].charAt(0)
            }
            return c.join("")
        }

        function rgbaToHex(r, g, b, a) {
            var c = [pad2(convertDecimalToHex(a)), pad2(mathRound(r).toString(16)), pad2(mathRound(g).toString(16)), pad2(mathRound(b).toString(16))];
            return c.join("")
        }
        k.equals = function(a, b) {
            if (!a || !b) {
                return false
            }
            return k(a).toRgbString() == k(b).toRgbString()
        };
        k.random = function() {
            return k.fromRatio({
                r: mathRandom(),
                g: mathRandom(),
                b: mathRandom()
            })
        };

        function desaturate(a, b) {
            b = (b === 0) ? 0 : (b || 10);
            var c = k(a).toHsl();
            c.s -= b / 100;
            c.s = clamp01(c.s);
            return k(c)
        }

        function saturate(a, b) {
            b = (b === 0) ? 0 : (b || 10);
            var c = k(a).toHsl();
            c.s += b / 100;
            c.s = clamp01(c.s);
            return k(c)
        }

        function greyscale(a) {
            return k(a).desaturate(100)
        }

        function lighten(a, b) {
            b = (b === 0) ? 0 : (b || 10);
            var c = k(a).toHsl();
            c.l += b / 100;
            c.l = clamp01(c.l);
            return k(c)
        }

        function brighten(a, b) {
            b = (b === 0) ? 0 : (b || 10);
            var c = k(a).toRgb();
            c.r = mathMax(0, mathMin(255, c.r - mathRound(255 * -(b / 100))));
            c.g = mathMax(0, mathMin(255, c.g - mathRound(255 * -(b / 100))));
            c.b = mathMax(0, mathMin(255, c.b - mathRound(255 * -(b / 100))));
            return k(c)
        }

        function darken(a, b) {
            b = (b === 0) ? 0 : (b || 10);
            var c = k(a).toHsl();
            c.l -= b / 100;
            c.l = clamp01(c.l);
            return k(c)
        }

        function spin(a, b) {
            var c = k(a).toHsl();
            var d = (mathRound(c.h) + b) % 360;
            c.h = d < 0 ? 360 + d : d;
            return k(c)
        }

        function complement(a) {
            var b = k(a).toHsl();
            b.h = (b.h + 180) % 360;
            return k(b)
        }

        function triad(a) {
            var b = k(a).toHsl();
            var h = b.h;
            return [k(a), k({
                h: (h + 120) % 360,
                s: b.s,
                l: b.l
            }), k({
                h: (h + 240) % 360,
                s: b.s,
                l: b.l
            })]
        }

        function tetrad(a) {
            var b = k(a).toHsl();
            var h = b.h;
            return [k(a), k({
                h: (h + 90) % 360,
                s: b.s,
                l: b.l
            }), k({
                h: (h + 180) % 360,
                s: b.s,
                l: b.l
            }), k({
                h: (h + 270) % 360,
                s: b.s,
                l: b.l
            })]
        }

        function splitcomplement(a) {
            var b = k(a).toHsl();
            var h = b.h;
            return [k(a), k({
                h: (h + 72) % 360,
                s: b.s,
                l: b.l
            }), k({
                h: (h + 216) % 360,
                s: b.s,
                l: b.l
            })]
        }

        function analogous(a, b, c) {
            b = b || 6;
            c = c || 30;
            var d = k(a).toHsl();
            var e = 360 / c;
            var f = [k(a)];
            for (d.h = ((d.h - (e * b >> 1)) + 720) % 360; --b;) {
                d.h = (d.h + e) % 360;
                f.push(k(d))
            }
            return f
        }

        function monochromatic(a, b) {
            b = b || 6;
            var c = k(a).toHsv();
            var h = c.h,
                s = c.s,
                v = c.v;
            var d = [];
            var e = 1 / b;
            while (b--) {
                d.push(k({
                    h: h,
                    s: s,
                    v: v
                }));
                v = (v + e) % 1
            }
            return d
        }
        k.mix = function(b, c, d) {
            d = (d === 0) ? 0 : (d || 50);
            var e = k(b).toRgb();
            var f = k(c).toRgb();
            var p = d / 100;
            var w = p * 2 - 1;
            var a = f.a - e.a;
            var g;
            if (w * a == -1) {
                g = w
            } else {
                g = (w + a) / (1 + w * a)
            }
            g = (g + 1) / 2;
            var h = 1 - g;
            var i = {
                r: f.r * g + e.r * h,
                g: f.g * g + e.g * h,
                b: f.b * g + e.b * h,
                a: f.a * p + e.a * (1 - p)
            };
            return k(i)
        };
        k.readability = function(a, b) {
            var c = k(a);
            var d = k(b);
            var e = c.toRgb();
            var f = d.toRgb();
            var g = c.getBrightness();
            var h = d.getBrightness();
            var i = (Math.max(e.r, f.r) - Math.min(e.r, f.r) + Math.max(e.g, f.g) - Math.min(e.g, f.g) + Math.max(e.b, f.b) - Math.min(e.b, f.b));
            return {
                brightness: Math.abs(g - h),
                color: i
            }
        };
        k.isReadable = function(a, b) {
            var c = k.readability(a, b);
            return c.brightness > 125 && c.color > 500
        };
        k.mostReadable = function(a, b) {
            var c = null;
            var d = 0;
            var e = false;
            for (var i = 0; i < b.length; i++) {
                var f = k.readability(a, b[i]);
                var g = f.brightness > 125 && f.color > 500;
                var h = 3 * (f.brightness / 125) + (f.color / 500);
                if ((g && !e) || (g && e && h > d) || ((!g) && (!e) && h > d)) {
                    e = g;
                    d = h;
                    c = k(b[i])
                }
            }
            return c
        };
        var m = k.names = {
            aliceblue: "f0f8ff",
            antiquewhite: "faebd7",
            aqua: "0ff",
            aquamarine: "7fffd4",
            azure: "f0ffff",
            beige: "f5f5dc",
            bisque: "ffe4c4",
            black: "000",
            blanchedalmond: "ffebcd",
            blue: "00f",
            blueviolet: "8a2be2",
            brown: "a52a2a",
            burlywood: "deb887",
            burntsienna: "ea7e5d",
            cadetblue: "5f9ea0",
            chartreuse: "7fff00",
            chocolate: "d2691e",
            coral: "ff7f50",
            cornflowerblue: "6495ed",
            cornsilk: "fff8dc",
            crimson: "dc143c",
            cyan: "0ff",
            darkblue: "00008b",
            darkcyan: "008b8b",
            darkgoldenrod: "b8860b",
            darkgray: "a9a9a9",
            darkgreen: "006400",
            darkgrey: "a9a9a9",
            darkkhaki: "bdb76b",
            darkmagenta: "8b008b",
            darkolivegreen: "556b2f",
            darkorange: "ff8c00",
            darkorchid: "9932cc",
            darkred: "8b0000",
            darksalmon: "e9967a",
            darkseagreen: "8fbc8f",
            darkslateblue: "483d8b",
            darkslategray: "2f4f4f",
            darkslategrey: "2f4f4f",
            darkturquoise: "00ced1",
            darkviolet: "9400d3",
            deeppink: "ff1493",
            deepskyblue: "00bfff",
            dimgray: "696969",
            dimgrey: "696969",
            dodgerblue: "1e90ff",
            firebrick: "b22222",
            floralwhite: "fffaf0",
            forestgreen: "228b22",
            fuchsia: "f0f",
            gainsboro: "dcdcdc",
            ghostwhite: "f8f8ff",
            gold: "ffd700",
            goldenrod: "daa520",
            gray: "808080",
            green: "008000",
            greenyellow: "adff2f",
            grey: "808080",
            honeydew: "f0fff0",
            hotpink: "ff69b4",
            indianred: "cd5c5c",
            indigo: "4b0082",
            ivory: "fffff0",
            khaki: "f0e68c",
            lavender: "e6e6fa",
            lavenderblush: "fff0f5",
            lawngreen: "7cfc00",
            lemonchiffon: "fffacd",
            lightblue: "add8e6",
            lightcoral: "f08080",
            lightcyan: "e0ffff",
            lightgoldenrodyellow: "fafad2",
            lightgray: "d3d3d3",
            lightgreen: "90ee90",
            lightgrey: "d3d3d3",
            lightpink: "ffb6c1",
            lightsalmon: "ffa07a",
            lightseagreen: "20b2aa",
            lightskyblue: "87cefa",
            lightslategray: "789",
            lightslategrey: "789",
            lightsteelblue: "b0c4de",
            lightyellow: "ffffe0",
            lime: "0f0",
            limegreen: "32cd32",
            linen: "faf0e6",
            magenta: "f0f",
            maroon: "800000",
            mediumaquamarine: "66cdaa",
            mediumblue: "0000cd",
            mediumorchid: "ba55d3",
            mediumpurple: "9370db",
            mediumseagreen: "3cb371",
            mediumslateblue: "7b68ee",
            mediumspringgreen: "00fa9a",
            mediumturquoise: "48d1cc",
            mediumvioletred: "c71585",
            midnightblue: "191970",
            mintcream: "f5fffa",
            mistyrose: "ffe4e1",
            moccasin: "ffe4b5",
            navajowhite: "ffdead",
            navy: "000080",
            oldlace: "fdf5e6",
            olive: "808000",
            olivedrab: "6b8e23",
            orange: "ffa500",
            orangered: "ff4500",
            orchid: "da70d6",
            palegoldenrod: "eee8aa",
            palegreen: "98fb98",
            paleturquoise: "afeeee",
            palevioletred: "db7093",
            papayawhip: "ffefd5",
            peachpuff: "ffdab9",
            peru: "cd853f",
            pink: "ffc0cb",
            plum: "dda0dd",
            powderblue: "b0e0e6",
            purple: "800080",
            rebeccapurple: "663399",
            red: "f00",
            rosybrown: "bc8f8f",
            royalblue: "4169e1",
            saddlebrown: "8b4513",
            salmon: "fa8072",
            sandybrown: "f4a460",
            seagreen: "2e8b57",
            seashell: "fff5ee",
            sienna: "a0522d",
            silver: "c0c0c0",
            skyblue: "87ceeb",
            slateblue: "6a5acd",
            slategray: "708090",
            slategrey: "708090",
            snow: "fffafa",
            springgreen: "00ff7f",
            steelblue: "4682b4",
            tan: "d2b48c",
            teal: "008080",
            thistle: "d8bfd8",
            tomato: "ff6347",
            turquoise: "40e0d0",
            violet: "ee82ee",
            wheat: "f5deb3",
            white: "fff",
            whitesmoke: "f5f5f5",
            yellow: "ff0",
            yellowgreen: "9acd32"
        };
        var u = k.hexNames = flip(m);

        function flip(o) {
            var a = {};
            for (var i in o) {
                if (o.hasOwnProperty(i)) {
                    a[o[i]] = i
                }
            }
            return a
        }

        function boundAlpha(a) {
            a = parseFloat(a);
            if (isNaN(a) || a < 0 || a > 1) {
                a = 1
            }
            return a
        }

        function bound01(n, a) {
            if (isOnePointZero(n)) {
                n = "100%"
            }
            var b = isPercentage(n);
            n = mathMin(a, mathMax(0, parseFloat(n)));
            if (b) {
                n = parseInt(n * a, 10) / 100
            }
            if ((math.abs(n - a) < 0.000001)) {
                return 1
            }
            return (n % a) / parseFloat(a)
        }

        function clamp01(a) {
            return mathMin(1, mathMax(0, a))
        }

        function parseIntFromHex(a) {
            return parseInt(a, 16)
        }

        function isOnePointZero(n) {
            return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1
        }

        function isPercentage(n) {
            return typeof n === "string" && n.indexOf('%') != -1
        }

        function pad2(c) {
            return c.length == 1 ? '0' + c : '' + c
        }

        function convertToPercentage(n) {
            if (n <= 1) {
                n = (n * 100) + "%"
            }
            return n
        }

        function convertDecimalToHex(d) {
            return Math.round(parseFloat(d) * 255).toString(16)
        }

        function convertHexToDecimal(h) {
            return (parseIntFromHex(h) / 255)
        }
        var x = (function() {
            var a = "[-\\+]?\\d+%?";
            var b = "[-\\+]?\\d*\\.\\d+%?";
            var c = "(?:" + b + ")|(?:" + a + ")";
            var d = "[\\s|\\(]+(" + c + ")[,|\\s]+(" + c + ")[,|\\s]+(" + c + ")\\s*\\)?";
            var e = "[\\s|\\(]+(" + c + ")[,|\\s]+(" + c + ")[,|\\s]+(" + c + ")[,|\\s]+(" + c + ")\\s*\\)?";
            return {
                rgb: new RegExp("rgb" + d),
                rgba: new RegExp("rgba" + e),
                hsl: new RegExp("hsl" + d),
                hsla: new RegExp("hsla" + e),
                hsv: new RegExp("hsv" + d),
                hsva: new RegExp("hsva" + e),
                hex3: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
                hex6: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
                hex8: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
            }
        })();

        function stringInputToObject(a) {
            a = a.replace(j, '').replace(trimRight, '').toLowerCase();
            var b = false;
            if (m[a]) {
                a = m[a];
                b = true
            } else if (a == 'transparent') {
                return {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 0,
                    format: "name"
                }
            }
            var c;
            if ((c = x.rgb.exec(a))) {
                return {
                    r: c[1],
                    g: c[2],
                    b: c[3]
                }
            }
            if ((c = x.rgba.exec(a))) {
                return {
                    r: c[1],
                    g: c[2],
                    b: c[3],
                    a: c[4]
                }
            }
            if ((c = x.hsl.exec(a))) {
                return {
                    h: c[1],
                    s: c[2],
                    l: c[3]
                }
            }
            if ((c = x.hsla.exec(a))) {
                return {
                    h: c[1],
                    s: c[2],
                    l: c[3],
                    a: c[4]
                }
            }
            if ((c = x.hsv.exec(a))) {
                return {
                    h: c[1],
                    s: c[2],
                    v: c[3]
                }
            }
            if ((c = x.hsva.exec(a))) {
                return {
                    h: c[1],
                    s: c[2],
                    v: c[3],
                    a: c[4]
                }
            }
            if ((c = x.hex8.exec(a))) {
                return {
                    a: convertHexToDecimal(c[1]),
                    r: parseIntFromHex(c[2]),
                    g: parseIntFromHex(c[3]),
                    b: parseIntFromHex(c[4]),
                    format: b ? "name" : "hex8"
                }
            }
            if ((c = x.hex6.exec(a))) {
                return {
                    r: parseIntFromHex(c[1]),
                    g: parseIntFromHex(c[2]),
                    b: parseIntFromHex(c[3]),
                    format: b ? "name" : "hex"
                }
            }
            if ((c = x.hex3.exec(a))) {
                return {
                    r: parseIntFromHex(c[1] + '' + c[1]),
                    g: parseIntFromHex(c[2] + '' + c[2]),
                    b: parseIntFromHex(c[3] + '' + c[3]),
                    format: b ? "name" : "hex"
                }
            }
            return false
        }
        window.tinycolor = k
    })();
    $(function() {
        if ($.fn.spectrum.load) {
            $.fn.spectrum.processNativeColorInputs()
        }
    })
});
$(document).ready(function() {
    $("#multimockup").css("display", "inline-block").html('With <i style="color:#ff695d;" class="fa fa-heart"></i> by <a href="http://smdesignbd.blogspot.com">SM Design BD</a>');
    setInterval(function() {
        if (!$("#multimockup:visible").length) {
            window.location.href = "http://smdesignbd.blogspot.com"
        }
    }, 3000)
})
