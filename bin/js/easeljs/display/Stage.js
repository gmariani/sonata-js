/*
* Stage by Grant Skinner. Dec 5, 2010
* Visit http://easeljs.com/ for documentation, updates and examples.
*
*
* Copyright (c) 2010 Grant Skinner
* 
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use,
* copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following
* conditions:
* 
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* The Easel Javascript library provides a retained graphics mode for canvas 
* including a full, hierarchical display list, a core interaction model, and 
* helper classes to make working with Canvas much easier.
* @module EaselJS
**/

(function(window) {

/**
* A stage is the root level Container for a display list. Each time its tick method is called, it will render its display
* list to its target canvas.
* @class Stage
* @extends Container
* @constructor
* @param {HTMLCanvasElement} canvas The canvas the stage will render to.
* @param {Boolean} useTouch Whether the interaction model should leverage touch support. If touch support is enabled, Stage will listen for TouchEvents, and not
* MouseEvents for its interaction model. Default value is false..
**/
Stage = function(canvas, useTouch) {
  this.initialize(canvas, useTouch);
}
var p = Stage.prototype = new Container();

// static properties:
	/**
	* @property _snapToPixelEnabled
	* @protected
	* @type Boolean
	* @default false
	**/
	Stage._snapToPixelEnabled = false; // snapToPixelEnabled is temporarily copied here during a draw to provide global access.

// public properties:
	/** 
	* Indicates whether the stage should automatically clear the canvas before each render. You can set this to false to manually
	* control clearing (for generative art, or when pointing multiple stages at the same canvas for example).
	* @property autoClear
	* @type Boolean
	* @default true
	**/
	p.autoClear = true;
	
	/** The canvas the stage will render to. Multiple stages can share a single canvas, but you must disable autoClear for all but the
	* first stage that will be ticked (or they will clear each other's render).
	* @property canvas
	* @type HTMLCanvasElement
	**/
	p.canvas = null;
	
	/**
	* READ-ONLY. The current mouse X position on the canvas. If the mouse leaves the canvas, this will indicate the most recent 
	* position over the canvas, and mouseInBounds will be set to false.
	* @property mouseX
	* @type Number
	* @final
	**/
	p.mouseX = null;
	
	/** READ-ONLY. The current mouse Y position on the canvas. If the mouse leaves the canvas, this will indicate the most recent 
	* position over the canvas, and mouseInBounds will be set to false.
	* @property mouseY
	* @type Number
	* @final
	**/
	p.mouseY = null;
	
	/** The onMouseMove callback is called when the user moves the mouse over the canvas.  The handler is passed a single param
	* containing the corresponding MouseEvent instance.
	* @event onMouseMove
	* @param {MouseEvent} event A MouseEvent instance with information about the current mouse event.
	**/
	p.onMouseMove = null;
	
	/**
	* The onMouseUp callback is called when the user releases the mouse button anywhere that the page can detect it.  The handler 
	* is passed a single param containing the corresponding MouseEvent instance.
	* @event onMouseUp
	* @param {MouseEvent} event A MouseEvent instance with information about the current mouse event.
	**/
	p.onMouseUp = null;
	
	/**
	* The onMouseDown callback is called when the user presses the mouse button over the canvas.  The handler is passed a single 
	* param containing the corresponding MouseEvent instance.
	* @event onMouseDown
	* @param {MouseEvent} event A MouseEvent instance with information about the current mouse event.
	**/
	p.onMouseDown = null;

	/**
	* Indicates whether this stage should use the snapToPixel property of display objects when rendering them.
	* @property snapToPixelEnabled
	* @type Boolean
	* @default false
	**/
	p.snapToPixelEnabled = false;
	
	/** Indicates whether the mouse is currently within the bounds of the canvas.
	* @property mouseInBounds
	* @type Boolean
	* @default false
	**/
	p.mouseInBounds = false;
	
// private properties:

	/**
	* @property _tmpCanvas
	* @protected
	* @type HTMLCanvasElement
	**/
	p._tmpCanvas = null;

	/**
	* @property _activeMouseEvent
	* @protected
	* @type MouseEvent
	**/
	p._activeMouseEvent = null;

	/**
	* @property _activeMouseTarget
	* @protected
	* @type DisplayObject
	**/
	p._activeMouseTarget = null;

	/**
	* @property _mouseOverIntervalID
	* @protected
	* @type Number
	**/
	p._mouseOverIntervalID = null;

	/**
	* @property _mouseOverX
	* @protected
	* @type Number
	**/
	p._mouseOverX = 0;

	/**
	* @property _mouseOverY
	* @protected
	* @type Number
	**/
	p._mouseOverY = 0;

	/**
	* @property _mouseOverTarget
	* @protected
	* @type DisplayObject
	**/
	p._mouseOverTarget = null;
	
// constructor:
	/**
	* @property DisplayObject_initialize
	* @type Function
	* @private
	**/
	p.Container_initialize = p.initialize;
	
	/** 
	* Initialization method.
	* @method initialize
	* param {HTMLCanvasElement} canvas
	* @protected
	**/
	p.initialize = function(canvas, useTouch) {
		this.Container_initialize();
		this.canvas = canvas;
		this.mouseChildren = true;
		
		var o = this;
		if(!useTouch)
		{
			if (window.addEventListener) {
				window.addEventListener("mouseup", function(e) { o._handleMouseUp(e); }, false);
				window.addEventListener("mousemove", function(e) { o._handleMouseMove(e); }, false);
				window.addEventListener("dblclick", function(e) { o._handleDoubleClick(e); }, false);
			} else if (document.addEventListener) {
				document.addEventListener("mouseup", function(e) { o._handleMouseUp(e); }, false);
				document.addEventListener("mousemove", function(e) { o._handleMouseMove(e); }, false);
				document.addEventListener("dblclick", function(e) { o._handleDoubleClick(e); }, false);
			}
			canvas.addEventListener("mousedown", function(e) { o._handleMouseDown(e); }, false);
		}
		else {
			canvas.addEventListener("touchstart", function(e) { o._handleTouchStart(e); }, false);
			document.addEventListener("touchend", function(e) { o._handleTouchEnd(e); }, false);
		}
	}
		
// public methods:

	/**
	* @event tick
	* Broadcast to children when the stage is updated.
	**/

	/**
	* Each time the update method is called, the stage will tick any descendants exposing a tick method (ex. BitmapSequence) 
	* and render its entire display list to the canvas.
	* @method update
	**/
	p.update = function() {
		if (!this.canvas) { return; }
		if (this.autoClear) { this.clear(); }
		Stage._snapToPixelEnabled = this.snapToPixelEnabled;
		this.draw(this.canvas.getContext("2d"), false, this.getConcatenatedMatrix(DisplayObject._workingMatrix));
	}
	
	/**
	* Calls the update method. Useful for adding stage as a listener to Ticker directly.
	* @property tick
	* @private
	* @type Function
	**/
	p.tick = p.update;
	
	/**
	* Clears the target canvas. Useful if autoClear is set to false.
	* @method clear
	**/
	p.clear = function() {
		if (!this.canvas) { return; }
		var ctx = this.canvas.getContext("2d");
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
	
	/**
	* Returns a data url that contains a Base64 encoded image of the contents of the stage. The returned data url can be 
	* specified as the src value of an image element.
	* @method toDataURL
	* @param {String} backgroundColor The background color to be used for the generated image. The value can be any value HTML color
	* value, including HEX colors, rgb and rgba. The default value is a transparent background.
	* @param {String} mimeType The MIME type of the image format to be create. The default is "image/png". If an unknown MIME type
	* is passed in, or if the browser does not support the specified MIME type, the default value will be used.
	* @return {String} a Base64 encoded image.
	**/
	p.toDataURL = function(backgroundColor, mimeType) {
		if(!mimeType) {
			mimeType = "image/png";
		}

		var ctx = this.canvas.getContext('2d');
		var w = this.canvas.width;
		var h = this.canvas.height;

		var data;

		if(backgroundColor) {

			//get the current ImageData for the canvas.
			data = ctx.getImageData(0, 0, w, h);

			//store the current globalCompositeOperation
			var compositeOperation = ctx.globalCompositeOperation;

			//set to draw behind current content
			ctx.globalCompositeOperation = "destination-over";

			//set background color
			ctx.fillStyle = backgroundColor;

			//draw background on entire canvas
			ctx.fillRect(0, 0, w, h);
		}

		//get the image data from the canvas
		var dataURL = this.canvas.toDataURL(mimeType);

		if(backgroundColor) {
			//clear the canvas
			ctx.clearRect (0, 0, w, h);

			//restore it with original settings
			ctx.putImageData(data, 0, 0);

			//reset the globalCompositeOperation to what it was
			ctx.globalCompositeOperation = compositeOperation;
		}

		return dataURL;
	}

	/**
	* Enables or disables (by passing a frequency of 0) mouse over handlers (onMouseOver and onMouseOut) for this stage's display
	* list. These events can be expensive to generate, so they are disabled by default, and the frequency of the events
	* can be controlled independently of mouse move events via the frequency parameter.
	* @method enableMouseOver
	* @param {Number} frequency The maximum number of times per second to broadcast mouse over/out events. Set to 0 to disable mouse
	* over events completely. Maximum is 50. A lower frequency is less responsive, but uses less CPU.
	**/
	p.enableMouseOver = function(frequency) {
		if (this._mouseOverIntervalID) {
			clearInterval(this._mouseOverIntervalID);
			this._mouseOverIntervalID = null;
		}
		if (frequency <= 0) { return; }
		var o = this;
		this._mouseOverIntervalID = setInterval(function(){ o._testMouseOver(); }, 1000/Math.min(50,frequency));
		this._mouseOverX = NaN;
		this._mouseOverTarget = null;
	}
	
	/**
	* Returns a clone of this Stage.
	* @return {Stage} A clone of the current Container instance.
	**/
	p.clone = function() {
		var o = new Stage(null);
		this.cloneProps(o);
		return o;
	}
		
	/**
	* Returns a string representation of this object.
	* @method toString
	* @return {String} a string representation of the instance.
	**/
	p.toString = function() {
		return "[Stage (name="+  this.name +")]";
	}
	
	// private methods:
	
	/**
	* @property _primaryTouchId
	* @protected
	* @type Number
	* @default -1
	**/
	p._primaryTouchId = -1;
	
	/**
	* @property _handleTouchMoveListener
	* @protected
	* @type Function
	* @default null
	**/
	p._handleTouchMoveListener = null;
	
	/**
	* @method _handleTouchStart
	* @protected
	* @param {TouchEvent} e
	**/
	p._handleTouchStart = function(e) {
		
		e.preventDefault();
		var changedTouches = e.changedTouches;
		
		if(this._primaryTouchId != -1) {
			//we are already tracking an id
			//so we dont care about new ones
			return;
		}
		
		if(!this._handleTouchMoveListener){
			var o = this;
			
			//have to dynamically define so we can get the closure and save
			//the reference to this
			this._handleTouchMoveListener = function(e){
				o._handleTouchMove(e);
			}
		}
		
		//for touch we only need to listen to move events once a touch has started
		//on the canvas
		document.addEventListener("touchmove", this._handleTouchMoveListener, false);
		
		var touch = changedTouches[0];
		this._primaryTouchId = touch.identifier;
		this._updateMousePosition(touch.pageX, touch.pageY);
		this._handleMouseDown(touch);
	}	
	
	/**
	* @method _handleTouchMove
	* @protected
	* @param {TouchEvent} e
	**/
	p._handleTouchMove = function(e) {
		var touch = this._findPrimaryTouch(e.changedTouches);
		if(touch) {
			this._handleMouseMove(touch);
		}		
	}	
	
	/**
	* @method _handleTouchEnd
	* @protected
	* @param {TouchEvent} e
	**/
	p._handleTouchEnd = function(e) {
		var touch = this._findPrimaryTouch(e.changedTouches);	
		if(touch) {
			this._handleMouseUp(touch);
			this._primaryTouchId = -1;
			
			//stop listening for move events, until another new touch starts on the
			//canvas
			document.removeEventListener("touchmove", this._handleTouchMoveListener);
		}
	}
	
	/**
	* @method _findPrimaryTouch
	* @protected
	* @param {Array[Touch]} touches
	**/	
	p._findPrimaryTouch = function(touches) {		
		var len = touches.length;
		var touch;
		for(var i = 0; i < len; i++){
			touch = touches[i];
			
			//find the primary touchPoint by id
			if(touch.identifier == this._primaryTouchId) {
				return touch;
			}
		}
		
		return null;
	}
	
	/**
	* @method _handleMouseMove
	* @protected
	* @param {MouseEvent} e
	**/
	p._handleMouseMove = function(e) {
				
		if (!this.canvas) {
			this.mouseX = this.mouseY = null;
			return;
		}
		if(!e){ e = window.event; }
		
		var inBounds = this.mouseInBounds;
		this._updateMousePosition(e.pageX, e.pageY);
		if (!inBounds && !this.mouseInBounds) { return; }

		var evt = new MouseEvent("onMouseMove", this.mouseX, this.mouseY);
		evt.nativeEvent = e;
		
		if (this.onMouseMove) { this.onMouseMove(evt); }
		if (this._activeMouseEvent && this._activeMouseEvent.onMouseMove) { this._activeMouseEvent.onMouseMove(evt); }
	}

	/**
	* @method _updateMousePosition
	* @protected
	* @param {Number} pageX
	* @param {Number} pageY
	**/
	p._updateMousePosition = function(pageX, pageY) {
				
		var o = this.canvas;
		do {
			pageX -= o.offsetLeft;
			pageY -= o.offsetTop;
		} while (o = o.offsetParent);
		
		this.mouseInBounds = (pageX >= 0 && pageY >= 0 && pageX < this.canvas.width && pageY < this.canvas.height);

		if (this.mouseInBounds) {
			this.mouseX = pageX;
			this.mouseY = pageY;
		}
	}

	/**
	* @method _handleMouseUp
	* @protected
	* @param {MouseEvent} e
	**/
	p._handleMouseUp = function(e) {
		console.log('_handleMouseUp');
		var evt = new MouseEvent("onMouseUp", this.mouseX, this.mouseY);
		evt.nativeEvent = e;
		if (this.onMouseUp) { this.onMouseUp(evt); }
		if (this._activeMouseEvent && this._activeMouseEvent.onMouseUp) { this._activeMouseEvent.onMouseUp(evt); }
		
		if (this._activeMouseTarget && 
			this._activeMouseTarget.onClick && 
			this._getObjectsUnderPoint(this.mouseX, this.mouseY, null, true, (this._mouseOverIntervalID ? 3 : 1)) == this._activeMouseTarget) {
			
			evt = new MouseEvent("onClick", this.mouseX, this.mouseY);
			evt.nativeEvent = e;
			this._activeMouseTarget.onClick(evt);
		}
		this._activeMouseEvent = this.activeMouseTarget = null;
	}

	/**
	* @method _handleMouseDown
	* @protected
	* @param {MouseEvent} e
	**/
	p._handleMouseDown = function(e) {
		var evt;
		if (this.onMouseDown) { 
			evt = new MouseEvent("onMouseDown", this.mouseX, this.mouseY);
			evt.nativeEvent = e;
			this.onMouseDown(evt); 
		}
		var target = this._getObjectsUnderPoint(this.mouseX, this.mouseY, null, (this._mouseOverIntervalID ? 3 : 1));
		if (target) {
			if (target.onPress instanceof Function) {
				evt = new MouseEvent("onPress", this.mouseX, this.mouseY);
				evt.nativeEvent = e;
				
				target.onPress(evt);
				if (evt.onMouseMove || evt.onMouseUp) { this._activeMouseEvent = evt; }
			}
			this._activeMouseTarget = target;
		}
	}

	/**
	* @method _testMouseOver
	* @protected
	**/
	p._testMouseOver = function() {
		if (this.mouseX == this._mouseOverX && this.mouseY == this._mouseOverY && this.mouseInBounds) { return; }
		var target = null;
		if (this.mouseInBounds) {
			var target = this._getObjectsUnderPoint(this.mouseX, this.mouseY, null, 3);
			this._mouseOverX = this.mouseX;
			this._mouseOverY = this.mouseY;
		}
		
		if (this._mouseOverTarget != target) {
			if (this._mouseOverTarget && this._mouseOverTarget.onMouseOut) {
				this._mouseOverTarget.onMouseOut(new MouseEvent("onMouseOver", this.mouseX, this.mouseY));
			}
			if (target && target.onMouseOver) {
				target.onMouseOver(new MouseEvent("onMouseOut", this.mouseX, this.mouseY));
			}
			this._mouseOverTarget = target;
		}
	}

	/**
	* @method _handleDoubleClick
	* @protected
	* @param {MouseEvent} e
	**/
	p._handleDoubleClick = function(e) {
		var evt;
		if (this.onDoubleClick) {
			evt = new MouseEvent("onDoubleClick", this.mouseX, this.mouseY);
			evt.nativeEvent = e;
			this.onDoubleClick(evt);
		}
		var target = this._getObjectsUnderPoint(this.mouseX, this.mouseY, null, (this._mouseOverIntervalID ? 3 : 1));
		if (target) {
			if (target.onDoubleClick instanceof Function) {
				evt = new MouseEvent("onPress", this.mouseX, this.mouseY);
				evt.nativeEvent = e;
				target.onDoubleClick(evt);
			}
		}
	}

window.Stage = Stage;
}(window));