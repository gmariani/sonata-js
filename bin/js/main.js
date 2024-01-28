/*
Problems:
IE9 doesn't support box-model
IE9 doesn't support some fonts for @font-face
Canvas can't measure text height
*/

// TODO: Fix player colors
// TODO: Fix bug where numbers are hidden

var FPS = 20,
	Timer = {},
	Spiral = {},
	Particles = {},
	Expo = {},
	canvas,
	canvasParticles,
	canvasLines,
	canvasSpiral,
	audio,
	stage,
	world,
	img,
	bmp,
	tween,
	lastVisual = 0.
	visualIndex = 0.
	playlistIndex = 0;
	
Particles.bars = [];
Timer.maxSize = 100;
Timer.minSize = 14;
Timer.color = '#fff';
Timer.fonts = [
		['BlackJack',57],
		['Bonveno',55],
		['CartoGothic',70],
		['ChunkFive',73],
		['CicleFina',70],
		['NuvoWeb',73]
	];

///////////////////////////////////////////////////////////////
// Init / Ticker
///////////////////////////////////////////////////////////////
 
$(document).ready(function() {
	// Init stage
	canvas = $("canvas").get(0);
	canvasParticles = $("canvas").get(1);
	canvasLines = $("canvas").get(2);
	canvasSpiral = $("canvas").get(2);
	
	var ctx = canvas.getContext('2d');
	ctx.shadowOffsetX = 2;
	ctx.shadowOffsetY = 2;
	ctx.shadowBlur = 3;
	ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';/**/
	canvas.onclick = onClickCanvas;
	
	stage = new Stage(canvas);
	
	initAudio();
	
	initPhysics();
	
	initSpiral();
	
	initParticles();
	
	initTimer();
	
	// Pinned Site detection
	try {
		if (external.msIsSiteMode()) {
			initThumbBar();
		} else {
			$('#divPinSite').show();
			$('#divPinSite').bind('click', function() {
				$('#divPinSite').hide();
			});
		}
	} catch (e) { }
	
	// Start framerate
	tick();
});

function tick() {
	updateTimer();
	
	updatePhysics();
	
	// Visualizations
	if (!audio.paused) {
		fadeCanvas(canvasParticles);
		//if (visualIndex < 2) fadeCanvas(canvasLines);
		//if (visualIndex != 2) fadeCanvas(canvasLines);
		//if (visualIndex != 3) fadeCanvas(canvasSpiral);
		
		var now = new Date();
		if (now - lastVisual > 15 * 1000) {
			lastVisual = now;
			 visualIndex++;
			 if (visualIndex > 3) visualIndex = 0;
			 stopParticles();
			 if (visualIndex == 0) playParticles();
			 resetSpiral();
			 canvasLines.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
		}
		
		var song = playlist[playlistIndex],
		idx = parseInt(audio.currentTime * FPS);//) * 2;
		switch(visualIndex) {
			case 0 : updateParticles(canvasParticles.getContext('2d'), idx, song); break;
			case 1 : updateCircles(canvasParticles.getContext('2d'), idx, song); break;
			case 2 : updateLines(canvasLines.getContext('2d'), idx, song); break;
			case 3 : updateSpiral(canvasLines.getContext('2d'), idx, song); break;
		}
	}
	
	stage.update();
	requestAnimationFrame(tick);
}

function fadeCanvas(can) {
	var ctx = can.getContext('2d');
	ctx.globalAlpha = 0.2;
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.globalAlpha = 1.0;
}

///////////////////////////////////////////////////////////////
// Audio
///////////////////////////////////////////////////////////////

function initAudio() {
	audio = $('.player audio').get(0);
	var manualSeek = false,
		loaded = false,
		playBar = $('.player #playBar'),
		playThumb = $('.player #playThumb'),
		volumeBar = $('.player #volumeBar'),
		playtoggle = $('#playtoggle');
	
	// Play Toggle
	playtoggle.click(function() {
		if (audio.paused) {
			audio.play();
		} else {
			audio.pause();
		}
	});
	
	// Play Slider
	//if ((audio.buffered != undefined) && (audio.buffered.length != 0)) {
		$(audio).bind('progress', function(e) {
			var loaded = 0;
			if (audio.buffered.length != 0) loaded = ~~((audio.buffered.end(0) / audio.duration) * 100);
			playBar.css({ width: loaded + '%' });
		});
	//} else {
	//	playBar.remove();
	//}
	
	// Event Handler
	$(audio).bind('timeupdate', function() {
		var s = audio.currentTime,
				m = ~~(s / 60);
			s = ~~(s % 60);
		var time = zero(m) + ":" + zero(s),
			arr = time.split(''),
			pos = (audio.currentTime / audio.duration) * 100;
		
		updateNumber('txtMin1', arr[0]);
		updateNumber('txtMin2', arr[1]);
		updateNumber('txtColon', arr[2]);
		updateNumber('txtSec1', arr[3]);
		updateNumber('txtSec2', arr[4]);
		////////////////////
		
		if (!manualSeek) playThumb.css({ left: pos + '%' });
		if (!loaded) {
			loaded = true;

			$('.player #playTrack').slider({
				value: 0,
				step: 0.01,
				orientation: "horizontal",
				range: "min",
				max: audio.duration,
				animate: true,
				slide: function(e, ui) {
					manualSeek = true;
					audio.currentTime = ui.value;
				},
				stop: function(e, ui) {
					manualSeek = false;
				}
			});
		}
	}).bind('volumechange', function() {
		updateNumber('txtMin1');
		updateNumber('txtMin2');
		updateNumber('txtColon');
		updateNumber('txtSec1');
		updateNumber('txtSec2');
	}).bind('play', function() {
		playtoggle.addClass('playing');
		
		try {
			if (external.msIsSiteMode()) {
				external.msSiteModeShowButtonStyle(ThumbBar.btnPlayPause, external.msSiteModeAddButtonStyle(ThumbBar.btnPlayPause, 'img/pause.ico', 'Pause'));
			}
		} catch (e) { console.log(e) }
	}).bind('pause ended', function() {
		playtoggle.removeClass('playing');
		
		try {
			if (external.msIsSiteMode()) {
				external.msSiteModeShowButtonStyle(ThumbBar.btnPlayPause, 0);
			}
		} catch (e) { console.log(e) }
	}).bind('ended', function() {
		playlistIndex = playlistIndex == 0 ? 1 : 0;
		loadSong();
	});
	
	// Volume Slider
	$('.player #volumeTrack').slider({
		value: 0.5,
		step: 0.01,
		orientation: "horizontal",
		range: "min",
		max: 1,
		animate: true,
		slide: function(e, ui) {
			audio.volume = ui.value;
			volumeBar.css({ width: ~~(ui.value * 100) + '%' });
		}
	});
	audio.volume = 0.5;
	volumeBar.css({ width: '50%' });
	
	loadSong();
}

function onClickCanvas(e) {
	// Clicking on band image doesn't work in IE9
	if (e.x > 10 && e.x < 225 && e.y > 390 && e.y < 500) {
		console.log('clicked on canvas');
		window.open(playlist[playlistIndex].websiteURL,'band','location=yes, menubar=yes, scrollbars=yes, status=yes');
	}
}

function loadImage(url) {
	if (!img) {
		img = new Image();
		img.onload = function() {
			bmp = new Bitmap(img);
			// testHit broken in IE9
			bmp.mouseEnabled = true;
			bmp.onClick = function(evt) {
				console.log('clicked on bmp');
				window.open(playlist[playlistIndex].websiteURL,'band','location=yes, menubar=yes, scrollbars=yes, status=yes');
			}
			bmp.rotation = -90;
			bmp.x = -img.width;
			bmp.y = canvas.height - img.height - 20;
			bmp.alpha = 0;
			stage.addChild(bmp);
			
			// Remove old one
			Tween._tweens = [];
			tween = Tween.get(bmp)
								.wait(500)
								.to({x:0, alpha:0.5, rotation:-90}, 1000, Expo.easeOut)
								.wait(200)
								.to({rotation:0, alpha:1}, 500, Expo.easeOut);
		};
		img.src = url;
	} else {
			// Remove old one
			Tween._tweens = [];
			tween = Tween.get(bmp)
								.wait(500)
								.to({rotation:-90, alpha:0.5}, 2000, Expo.easeOut)
								.call(tween2, [url], this);
								/*.wait(200)
								.to({x:-img.width, alpha:0}, 1000, Expo.easeOut)
								.wait(200)
								.call(unloadImage, [url], this);*/
	}
}

// Had to be broken apart for tween to work.
function tween2(url) {
	// Remove old one
	Tween._tweens = [];
	tween = Tween.get(bmp)
				.wait(200)
				.to({x:-img.width, alpha:0}, 1000, Expo.easeOut)
				.wait(200)
				.call(unloadImage, [url], this);
}

function unloadImage(url) {
	if (bmp) stage.removeChild(bmp);
	img.src = url || playlist[1].imgURL;
}

function loadSong() {
	var song = playlist[playlistIndex],
		ext = audio.canPlayType("audio/mpeg") ? '.mp3' : '.ogg';
	
	// Load song
	audio.src = song.url + ext;
	
	// Load band image
	loadImage(song.imgURL);
}

///////////////////////////////////////////////////////////////
// Timer
///////////////////////////////////////////////////////////////

function initTimer() {
	var tf = getTextFormat('ChunkFive'),
		c = Timer.color;
	Timer.txtMin1 = new Text('0', tf, c);
	Timer.txtMin1.y = getMeasuredHeight(Timer.txtMin1) + 50;
	Timer.txtMin2 = new Text('0', tf, c);
	Timer.txtMin2.y = Timer.txtMin1.y;
	Timer.txtColon = new Text(':', tf, c);
	Timer.txtColon.y = Timer.txtMin1.y;
	Timer.txtSec1 = new Text('0', tf, c);
	Timer.txtSec1.y = Timer.txtMin1.y;
	Timer.txtSec2 = new Text('0', tf, c);
	Timer.txtSec2.y = Timer.txtMin1.y;
	
	// Test Font height
	/*var txtTest = new Text('0', tf, c);
	txtTest.x = 200;
	txtTest.y = 100 + 73;
	var shpTest = new Shape();
	shpTest.graphics.beginFill('#f00');
	shpTest.graphics.drawRect(0, 0, txtTest.getMeasuredWidth(), 1);
	shpTest.graphics.endFill();
	shpTest.x = 200;
	shpTest.y = 100;
	stage.addChild(shpTest);
	stage.addChild(txtTest);*/
	//
	
	stage.addChild(Timer.txtMin1);
	stage.addChild(Timer.txtMin2);
	stage.addChild(Timer.txtColon);
	stage.addChild(Timer.txtSec1);
	stage.addChild(Timer.txtSec2);
}

function updateTimer() {
	// Position Numbers
	var width = Timer.txtMin1.getMeasuredWidth() + Timer.txtMin2.getMeasuredWidth() + Timer.txtColon.getMeasuredWidth() + Timer.txtSec1.getMeasuredWidth() + Timer.txtSec2.getMeasuredWidth();
	Timer.txtMin1.x = (canvas.width / 2) - (width / 2);
	Timer.txtMin2.x = Timer.txtMin1.x + Timer.txtMin1.getMeasuredWidth();
	Timer.txtColon.x = Timer.txtMin2.x + Timer.txtMin2.getMeasuredWidth();
	Timer.txtSec1.x = Timer.txtColon.x + Timer.txtColon.getMeasuredWidth();
	Timer.txtSec2.x = Timer.txtSec1.x + Timer.txtSec1.getMeasuredWidth();
}

function updateNumber(name, value) {
	var txt = Timer[name];
	
	// onVolumeChange
	if (!value) value = txt.text;
	
	if (txt.text != value) {	
		// Add a new number
		Timer[name] = new Text(value, getTextFormat(), Timer.color);
		Timer[name].x = txt.x;
		Timer[name].y = txt.y;
		stage.addChild(Timer[name]);
		
		// Turn into a rigid body
		var boxBd = new b2BodyDef(),
			boxSd = new b2BoxDef(),
			b;
		txt.width = txt.getMeasuredWidth();
		txt.height = getMeasuredHeight(txt);
		txt.regX = txt.width / 2;
		txt.regY = -(txt.height / 2);
		txt.x += txt.width + (txt.width / 2);
		txt.y -= txt.height;
		boxSd.density = 1.0;
		boxSd.extents.Set(txt.width / 2, txt.height / 2);
		boxBd.AddShape(boxSd);
		boxBd.position.Set(txt.x, txt.y);
		b = world.CreateBody(boxBd);
		b.text = txt; // save ref
		//stage.removeChild(txt);
	} else {
		// Adjust size if volume was changed
		var tf = getTextFormat(getTextFont(txt));
		if (tf != txt.font) txt.font = tf;
	}
}

function getTextFont(txt) {
	return txt.font.split(' ')[1];
}

function getTextFormat(oldFont) {
	var font = oldFont ? oldFont : Timer.fonts[random(0, Timer.fonts.length - 1)][0],
		size = (audio.volume * (Timer.maxSize - Timer.minSize)); // 0.0 - 1.0
	return (size + Timer.minSize) + 'px ' + font;
}

function getMeasuredHeight(txt) {
	var font = getTextFont(txt),
		size = audio.volume;
	for (var i = 0, l = Timer.fonts.length; i < l; i++) {
        if (Timer.fonts[i][0] === font) break
    }
	
	if (size < 0.14) size = 0.14;
	return size * Timer.fonts[i][1];
}

///////////////////////////////////////////////////////////////
// Box2D
///////////////////////////////////////////////////////////////

function initPhysics() {
	var worldAABB = new b2AABB(),
		groundSd = new b2BoxDef(),
		groundBd = new b2BodyDef();
		
	worldAABB.minVertex.Set(-1000, -1000);
	worldAABB.maxVertex.Set(1000, 1000);
	// world, gravity, doSleep
	world = new b2World(worldAABB, new b2Vec2(0, 300), true);
	
	// Create Ground
	groundSd.extents.Set(500 / 2, 100 / 2);
	groundSd.restitution = 0.2;
	groundBd.AddShape(groundSd);
	groundBd.position.Set(canvas.width / 2, canvas.height + 5);
	world.CreateBody(groundBd);
}

function updatePhysics() {
	// timeStep, iteration
	world.Step(1.0 / FPS, 1);
	for (var b = world.m_bodyList; b; b = b.m_next) {
		if (!b.text) continue;
		
		if (b.text.y > (canvas.height + 30)) {
			b.text.parent.removeChild(b.text);
			delete b.text;
			world.DestroyBody(b);
		} else {
			var center = b.GetCenterPosition();
			b.text.rotation = b.GetRotation() * 180 / Math.PI; // radians to degrees
			b.text.x = center.x - b.text.width;
			b.text.y = center.y + b.text.height;
		}
	}
}

///////////////////////////////////////////////////////////////
// Visual - Particles
///////////////////////////////////////////////////////////////

function initParticles() {
	var i = 20;
	while (i--) {
		var pg = new ParticleGenerator();
		pg.x = i * 50 + 25;
		pg.y = 500;
		pg.angleDeg = -90;
		Particles.bars.push(pg);
	}
}

function stopParticles() {
	var i = 20;
	while (i--) {
		var bar = Particles.bars[i];
		if (bar) {
			bar.stop();
		}
	}
}

function playParticles() {
	var i = 20;
	while (i--) {
		var bar = Particles.bars[i];
		if (bar) {
			bar.play();
		}
	}
}

function updateParticles(ctx, idx, song) {
	var i = 20,
		time = audio.currentTime / 25;
	while (i--) {
		var idx2 = idx + i,
			newHeight = ((song.amplitudeLeft[idx2]) + (song.amplitudeRight[idx2])) / 2,
			bar = Particles.bars[i];
		if (bar) {
			bar.update(ctx, time);
			bar.speed = newHeight / 5;
		}
	}
}

function ParticleGenerator() {
	var _particles = [],
		timeoutId;
	this.x = 0;
	this.y = 0;
	this.speed = 0;
	this.angleDeg = 0;
	
	this.stop = function() {
		clearTimeout(timeoutId);
		timeoutId = null;
	}
	
	// every 10th of a second
	this.play = function() {
		this.addParticle();
		this.addParticle();
		var t = this;
		timeoutId = setTimeout(function() { t.play(); }, 100);
	}
	
	this.addParticle = function() {
		var shape = {},
			spread = (Math.random() * 6) - 3;
		shape.color = 0xffffff;
		shape.radius = 2;
		shape.x = 0;
		shape.y = 0;
		shape.gravSpeed = 0;
		shape.angle = (this.angleDeg + spread) / 180 * Math.PI;
		shape.age = 0;
		shape.speed = Math.random() * (this.speed * .2) + this.speed * .8;
		_particles.push(shape);
	};
	
	this.update = function(ctx, time) {
		var gravAcc = 0.8,
			i = _particles.length,
			color = 'rgb(' + ~~(255 - 42.5 * time) + ',' + ~~(255 - 12.5 * time) + ',' + ~~(255 - 12.5 * time) + ')';//~~(t.color * Math.random());
		while (i--) {
			var t = _particles[i];
			t.gravSpeed += gravAcc;
			t.x += Math.cos(t.angle) * t.speed;
			t.y += Math.sin(t.angle) * t.speed;
			t.y += Math.sin(90) * t.gravSpeed;
			t.age++;
			t.alpha = 1 - (t.age / 30);
			if (t.age > 30 || t.y > 0) {
				_particles[i] = null;
				_particles.splice(i, 1);
			} else {
				ctx.fillStyle = color;
				ctx.beginPath();
				drawCircle(ctx, t.x + this.x, t.y + this.y, t.radius);
				ctx.fill();
			}
		}
	};
}

///////////////////////////////////////////////////////////////
// Visual - Lines
///////////////////////////////////////////////////////////////

function updateLines(ctx, idx, song) {
	var i = 200;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.strokeStyle = Graphics.getRGB(255, 255, 255, 1.0);
	for (i = 0; i < 50; i++) {
		var origin = convertTo2D(30 * i - 250, canvas.height, 0);
		ctx.beginPath();
		ctx.strokeStyle = i == 25 ? Graphics.getRGB(255, 0, 0, 1.0) : Graphics.getRGB(255, 255, 255, 1.0);
		ctx.moveTo(origin.x, origin.y);
		for (var j = 0; j < 20; j++) {
			var idx2 = idx + j,
				newX = 600 * j + origin.x,
				newY = -song.amplitudeRight[idx++] + canvas.height,
				newZ = 200 * j,
				pt = convertTo2D(newX, newY, newZ);
			ctx.lineTo(pt.x, pt.y);
		}
		ctx.stroke();
	}
}

///////////////////////////////////////////////////////////////
// Visual - Spiral
///////////////////////////////////////////////////////////////

function initSpiral() {
	Spiral.reverse = false;
	Spiral.maxRadius = 50;
	Spiral.minRadius = 5;
	Spiral.radius = 5;
	Spiral.strokeAlpha = 0.4;
	Spiral.angle = 0;
	Spiral.spread = 0.5;
    Spiral.x = canvas.width / 2;
    Spiral.y = canvas.height / 2;
}

function resetSpiral() {
	Spiral.x = canvas.width / 2;
	Spiral.y = canvas.height / 2;
	Spiral.angle = 0;
	//ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateSpiral(ctx, idx, song) {
	if (song.amplitudeLeft.length <= idx) return;
	var newHeight = ((song.amplitudeLeft[idx]) + (song.amplitudeRight[idx])) / 2;
		
	// Filled screen, reset
	if (Spiral.x > canvas.width) resetSpiral();
	
	Spiral.radius = Spiral.maxRadius * (newHeight / 100);
	Spiral.angle += 0.1;
	Spiral.x += Spiral.spread * Spiral.angle * Math.cos(Spiral.angle);
	Spiral.y += Spiral.spread * Spiral.angle * Math.sin(Spiral.angle);	
	if(Spiral.maxRadius != Spiral.minRadius) {
		if(Spiral.radius > Spiral.maxRadius || Spiral.radius < Spiral.minRadius) Spiral.reverse = !Spiral.reverse;
		var mod = (Spiral.reverse) ? -1 : 1;
		Spiral.radius += mod;
	}
	
	ctx.beginPath();
	ctx.strokeStyle = Graphics.getRGB(255, 255, 255, Spiral.strokeAlpha);
	drawCircle(ctx, Spiral.x, Spiral.y, Spiral.radius);
	ctx.stroke();	
}

///////////////////////////////////////////////////////////////
// Visual - Circles
///////////////////////////////////////////////////////////////

function updateCircles(ctx, idx, song) {
	// Left
	var i = 200, idx2, newRadius, newX, newY;
	ctx.strokeStyle = Graphics.getRGB(255, 255, 255, 0.4);
	while (i--) {
		idx2 = idx + i,
		newRadius = song.amplitudeLeft[idx2],
		newX = 5 * i,
		newY = 5 * i;
		if (!newRadius) continue;
		
		// Draw circle	
		ctx.beginPath();
		// drawCircle(context, x, y, radius)
		drawCircle(ctx, newX, newY, newRadius);
		ctx.stroke();
	}
	
	// Right
	for (i = 0; i < 200; i++) {
		idx2 = idx + i,
		newRadius = song.amplitudeRight[idx2],
		newX = 5 * -i + 1000,
		newY = (5 * -i) + canvas.height;
		if (!newRadius) continue;
			
		ctx.beginPath();
		drawCircle(ctx, newX, newY, newRadius);
		ctx.stroke();
	}
}

///////////////////////////////////////////////////////////////
// Pinned Site
///////////////////////////////////////////////////////////////
var ThumbBar = {};
function initThumbBar() {
	ThumbBar.btnPrev = external.msSiteModeAddThumbBarButton('img/prev.ico', 'Previous');
	ThumbBar.btnPlayPause = external.msSiteModeAddThumbBarButton('img/play.ico', 'Play');
	ThumbBar.btnNext = external.msSiteModeAddThumbBarButton('img/next.ico', 'Next');
	
	external.msSiteModeShowThumbBar();

    if (document.addEventListener) {
        document.addEventListener('msthumbnailclick', onClickThumbBar, false);
    } else if (document.attachEvent) {
        document.attachEvent('onmsthumbnailclick', onClickThumbBar);
    }
}

function onClickThumbBar(btn) {
	switch (btn.buttonID) {
		case ThumbBar.btnPrev:
			playlistIndex = playlistIndex == 0 ? 1 : 0;
			loadSong();
			break;
		case ThumbBar.btnPlayPause:
			if (audio.paused) {
				audio.play();
			} else {
				audio.pause();
			}
			break;
		case ThumbBar.btnNext:
			playlistIndex = playlistIndex == 0 ? 1 : 0;
			loadSong();
			break;
	}
}

///////////////////////////////////////////////////////////////
// Util
///////////////////////////////////////////////////////////////

Expo.easeIn = function(t, b, c, d) {
	return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b - c * 0.001;
}

Expo.easeOut = function(t, b, c, d) {
	return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
}

Expo.easeInOut = function(t, b, c, d) {
	if (t==0) return b;
	if (t==d) return b+c;
	if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
	return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
}

function convertTo2D(x, y, z) {
	var focalLength = 200,
		perspective = focalLength / (focalLength + z);
	return {x:x * perspective, y:y * perspective};
}

function drawCircle(ctx, x, y, radius) {
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	return ctx;
}

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function zero(n) {
	if (n < 10) return "0" + n;
	return "" + n;
}

/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */

if (!window.requestAnimationFrame) {
	window.requestAnimationFrame = (function() {
		return window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
			window.setTimeout(callback, 1000 / FPS);
		};
	} )();
}