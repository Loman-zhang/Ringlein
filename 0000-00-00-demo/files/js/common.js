'use strict';
window.GM || (window.GM = {});
if(!window.console){
  window.console = {
    log: function(){

    }
  }
}
;(function($, global){
  /* 自适应页面布局 */
    !function(){
      var $html = $('html');
      var $window = $(window);
      var fitPage = function(){
        var w = $html.width();
        w = w > 640 ? 640: w;
        w = w / 640;
        w = w * 100;
        $html.css({
          fontSize: w
        });
      }
      fitPage();

      var t;
      var func = function(){
        clearTimeout(t);
        t = setTimeout(fitPage, 25);
      }
      $window.on('resize', function(){
        func();
      });
    }();
    var touchStart, touchEnd;
  touchStart = touchEnd = 'click';

  // appVersion
  var appVersion = window.navigator && window.navigator.appVersion;
  var appVersionLowerCase;
  var device; // 设备
  if(appVersion){
    appVersionLowerCase = appVersion.toLowerCase();
    if(appVersionLowerCase.indexOf('iphone') > -1){
      device = 'iphone';
    }else if(appVersionLowerCase.indexOf('android') > -1){
      device = 'android';
    }else if(appVersionLowerCase.indexOf('windows phone') > -1){
      device = 'windows-phone';
    }
  }
  /* html 添加 class */
  var $html = $('html');
  //当前设备
  if(device){
    $html.addClass('page-device-' + device);
    GM.device = device;
  }

  // 判断是否手持设备
  if('ontouchend' in document){
    $html.addClass('page-handDevice');
    GM.isHandDevice = true;
    touchStart = 'touchstart';
    touchEnd = 'touchend';
  }
  GM.touchStart = touchStart;
  GM.touchEnd = touchEnd;
})(window.jQuery, this);
/* Observer */
;(function(global){
  function Observer(){
    this.fns = [];
  }

  Observer.prototype = {
    constructor: Observer,
    subscribe: function(fn){
      if(typeof fn === 'function'){
        this.fns.push(fn);
      }

      return this;
    },
    subscribeOnce: function(fn){
      if(typeof fn === 'function'){
        fn.EXCUTED_ONCE = true;
        this.fns.push(fn);
      }

      return this;
    },
    unsubscribe: function(fn){
      if(arguments.length === 0){
        this.fns = [];
        return;
      }
      
      if(typeof fn !== 'function'){
        return;
      }

      var fns = this.fns;
      for(var i = 0, len = fns.length; i < len; i++){
        if(fns[i] === fn){
          fns.splice(i, 1);
          i--;
          len--;
        }
      }

      return this;
    },
    fire: function(){
      var fns = this.fns;
      var item;
      for(var i = 0, len = fns.length; i < len; i++){
        item = fns[i];
        item.apply(null, arguments);
        if(item.EXCUTED_ONCE === true){
          this.unsubscribe(item);
          i--;
          len--;
        }
      }

      return this;
    }
  }

  global.GM || (global.GM = {});
  global.GM.ui || (global.GM.ui = {});
  global.GM.ui.Observer = Observer;
}(this));

/* throttle */
;(function(global){
  function throttle(func, time, context, callback){
    if(typeof func !== 'function'){
      return;
    }

    var length = arguments.length;
    switch(length){
      case 2:
        if(typeof time === 'function'){
          callback = time;
          time = undefined;
        }
        break;

      case 3:
        if(typeof context === 'function'){
          callback = context;
          context = undefined;
        }
        break;
      default:
        break;
    }

    clearTimeout(func.timeId);
    func.timeId = setTimeout(function(){
      func.call(context || window);
      if(typeof callback === 'function'){
        callback();
      }
    }, time || 25);
    return this;
  }
  
  global.GM || (global.GM = {});
  global.GM.ui || (global.GM.ui = {});
  global.GM.ui.throttle = throttle;
}(this));
/* Lightbox */
;(function(global, $){
  var Observer = GM.ui.Observer;
  var throttle = GM.ui.throttle;
  var toInt = function(str){
    return parseInt(str, 10);
  }
  var zDom = 999;
  var zMask = zDom - 1;
  var touchEnd = GM.touchEnd;
  
  function Lightbox(option){
    var defaultOption = {
      maskShow: true,
      isFixed: true,
      clickMask: false,
      targetClass: null,
      maskClass: null,
      bindResize: true, // 页面缩放的时候是否绑定事件
      position: true // 是否需要用JS进行定位
    }
    this._option = $.extend({}, defaultOption, option);
    
    this._$dom = this._option.target;
    if(this._$dom === undefined || this._$dom.length < 1){
      throw new Error("Can't find the target element");
    }
    
    this._$mask = $('<div></div>');
    this._domHeight = null;
    this._domWidth = null;
    this._oParentLeft = 0;
    this._oParentTop = 0;
    this._eventObj = null;
    
    this._shown = new Observer();
    this._hidden = new Observer();
    this._disposed = new Observer();
    this._showing = new Observer();
    this._showingAfter = new Observer();
    this._hiding = new Observer();
    this._hidingAfter = new Observer();

    this._init();
  }
  
  Lightbox.prototype = {
    constructor: Lightbox,
    hideDelay: function(time){
      time = time || 3000;
      var me = this;
      var t = setTimeout(function(){
        me.hide();
      }, time);
      me.hookHidingOnce(function(){
        clearTimeout(t);
      });
      return this;
    },
    getDom: function(){
      return this._$dom;
    },
    _createEvent: function(){
      var me = this,
        option = me._option,
        page = me._page,
        $window = page.$window,
        $mask = me._$mask,
        position = me._position;

      var bindResize = option.bindResize;

      var resizeFun = function (){
        position.call(me);
      }

      var fun = function(){
        if(option.position){
          throttle(resizeFun, 200);
        }
      }

      return {
        bind: function(){
          if(bindResize){
            $window.on('resize', fun);
          }
        },
        unbind: function(){
          if(bindResize){
            $window.off('resize', fun);
          }
        }
      }
    },
    _event: function(){
      var me = this;
      if(!me._eventObj){
        me._eventObj = me._createEvent();
      }

      return me._eventObj;
    },
    _page: {
      $window: null,
      $document: null,
      $body: null,
      winHeight: null,
      winWidth: null,
      isWinSizeChange: false
    },
    _position: function(){
      var me = this,
        $dom = me._$dom,
        option = me._option,
        page = me._page;

      var $window = page.$window,
          $document = page.$document;
      var isFixed = option.isFixed;
      var domHeight = me._domHeight, 
          domWidth = me._domWidth,
          oParentLeft = me._oParentLeft,
          oParentTop = me._oParentTop;

      var winHeight, winWidth;
      var isWinSizeChange = page.isWinSizeChange;
      // 是否有改过 window 的宽度
      if(isWinSizeChange){
        page.isWinSizeChange = false;
        page.winHeight = winHeight = $window.height();
        page.winWidth = winWidth = $window.width();
      }else{
        winHeight = page.winHeight;
        winWidth = page.winWidth;
      }

      var top = winHeight - domHeight;
      var left = winWidth - domWidth;

      var overBt, overRt,
          winST, winSL,
          docHeight, docWidth;

      if(top < 0){ // 说明有被截断
        winST = $window.scrollTop();
        docHeight = $document.height();
        overBt =  winST + domHeight - docHeight;
        /*
          top 刚好等于winHeight - domHeight, 不处理
          下面被截断 但是整体高度不大于 docHeight, 否则会看不见上面的
        */
        if(overBt > 0 && domHeight < docHeight){
          
        }else{ // 下面没有被截断
          top = 0;
        }
      }else{
        top = top / 2;
      }

      if(left < 0){ // 说明有被截断
        winSL = $window.scrollLeft();
        docWidth = $document.width();
        overRt = winSL + domWidth - docWidth;
        if(overRt > 0 && domWidth < docWidth){
         
        }else{
          left = 0;
        }
      }else{
        left = left / 2;
      }

      // 减去父级的 距离上左的距离
      top -= oParentTop;
      left -= oParentLeft;

      // 若position 是 absolute, 则得加上滚动条的高度
      if(!isFixed){
        winST = winST || $window.scrollTop();
        winSL = winSL || $window.scrollLeft();
        top += winST;
        left += winSL;
      }

      $dom.css({
        top: top,
        left: left
      });
    },
    _init: function(){
      var me = this,
          option = me._option,
          $dom = me._$dom;

      var clickMask = option.clickMask;
      if(clickMask){
        $mask.on(touchEnd, function(){
          me.hide();
        });
      }

      $dom.on(touchEnd, '*', function(){
        var $this = $(this);
        if($this.attr('data-pa-lightbox') === 'close'){
          me.hide();
        }
      });

      /* 
        手机端部分 android 和 ios会有穿透问题,
        所以阻止整个弹窗的默认行为，对于a 的链接让它跳转
      */
      $dom.on('touchstart', function(e){
        var $target = $(e.target);
        // 如果是关闭按钮，则阻止默认行为，并且用 location.href 跳转
        if($target.attr('data-pa-lightbox') === 'close'){
          e.preventDefault();
          var tagName = $target.prop('tagName');
          var href = $target.attr('href'); // '防止 javascript:void'
          if(tagName
              && tagName.toLowerCase() === 'a'
              && typeof href === 'string'
              && href.indexOf('http') > -1 ){
            location.href = href;
          }
        }
      });
    },
    _initLazy: function(){
      var me = this,
        $dom = me._$dom,
        $mask = me._$mask,
        page = me._page,
        option = me._option;

      var $body = page.$body;
      var oParentObj;
      var isFixed = option.isFixed;

      $dom.hide();
      if(option.maskShow){
        $mask.hide()
          .css({
            position: 'fixed',
            height: '100%',
            width: '100%',
            left: 0,
            top: 0,
            opacity: '0.5',
            backgroundColor: '#000'
          })
          .addClass(option.maskClass)
          .appendTo($body);
      }

      $dom.addClass(option.targetClass);
      if(isFixed){
        $dom.css({
          position: 'fixed'
        });
      }else{
        $dom.css({
          position: 'absolute'
        });
      }

      /*
        If the dom is not in the document, then append to body,
        as we want to get its height and width.
      */
      if($dom.parent().length < 1){
        $dom.appendTo($body);
      }

      $dom.show();
      //注意zepto.js 版本, height() 相当于 jquery outerHeight(false), 包含border 和 padding,但不包含margin
      me._domHeight = $dom.height();
      me._domWidth = $dom.width();
      /*
        when $dom's position is absolute,
        only can get offsetParent when $dom.show()
      */
      if(!isFixed){
        oParentObj = $dom.offsetParent().offset();
        me._oParentTop = oParentObj.top;
        me._oParentLeft = oParentObj.left;
      }
      $dom.hide();
    },
    _initPage: function(){
      var me = this,
        page = me._page;

      if(page.$window){
        return;
      }
      var $winTemp;
      page.$body = $('body');
      page.$document = $(document);
      page.$window = $winTemp = $(window);
      page.winHeight = $winTemp.height();
      page.winWidth = $winTemp.width();

      var resizeFun = function(){
        page.isWinSizeChange = true;
      }
      var fun = function(){
        throttle(resizeFun, 200);
      }
      $winTemp.on('resize', fun);
    },
    show: function(para){
      var me = this,
        $dom = me._$dom,
        $mask = me._$mask,
        page = me._page,
        option = me._option;

      para = para || {};
      if(typeof para === 'function'){
        para = {
          callback: para
        }
      }
      var callback = para.callback;
      /* fire showing */
      me._showing.fire();

      zDom += 2;
      zMask += 2;
      var zDomN = zDom;
      var zMaskN = zMask;

      // init page
      me._initPage();

      /* it execute only one time*/
      if(!me._eventObj){
        me._initLazy();
      }

      if(option.position){ // 如果不需要定位，则不需要初始化位置属性
        me._position();
      }

      // still need to bind, determined by option.bindResize not option.position
      // 生成 me._eventObj
      me._event().bind();

      /* fire showingAfter */
      me._showingAfter.fire();

      var ajDone = function(){
        me._shown.fire();
        if(typeof callback === 'function'){
            callback();
        }
      }
      /* if maskShow from init option is true */
      if(option.maskShow){
        $mask.css({
          zIndex: zMaskN
        })
        .show();
      }
      $dom.css({
        zIndex: zDomN
      })
      .show();
      ajDone();
      
      return this;
    },
    hide: function(para){
      var me = this,
        option = me._option,
        $dom = me._$dom,
        $mask = me._$mask;

      para = para || {};
      if(typeof para === 'function'){
        para = {
          callback: para
        }
      }
      var callback = para.callback;

      me._hiding.fire();

      // init page
      me._initPage();
      
      /* it execute only one time*/
      if(!me._eventObj){
        me._initLazy();
      }
      
      me._event().unbind();

      me._hidingAfter.fire();

      var ajDone = function(){
        me._hidden.fire();
        if(typeof callback === 'function'){
            callback();
        }
      }
      /* if maskShow from init option is true */
      if(option.maskShow){
        $mask.hide();
      }
      $dom.hide();
      ajDone();

      return this;
    },
    dispose: function(callback){
      var me = this;
      me._event().unbind();
      me._$mask.remove();
      me._$dom.remove();
      me._disposed.fire();
      if(typeof callback === 'function'){
        callback();
      }

      return this;
    },
    hookShown: function(callback){
      this._shown.subscribe(callback);
      return this;
    },
    hookShownOnce: function(callback){
      this._shown.subscribeOnce(callback);
      return this;
    },
    unHookShown: function(callback){
      if(arguments.length === 0){
        this._shown.unsubscribe();
      }else{
        this._shown.unsubscribe(callback);
      }
      return this;
    },
    hookHidden: function(callback){
      this._hidden.subscribe(callback);
      return this;
    },
    hookHiddenOnce: function(callback){
      this._hidden.subscribeOnce(callback);
      return this;
    },
    unHookHidden: function(callback){
      if(arguments.length === 0){
        this._hidden.unsubscribe();
      }else{
        this._hidden.unsubscribe(callback);
      }
      return this;
    },
    hookShowing: function(callback){
      this._showing.subscribe(callback);
      return this;
    },
    hookShowingOnce: function(callback){
      this._showing.subscribeOnce(callback);
      return this;
    },
    unHookShowing: function(callback){
      if(arguments.length === 0){
        this._showing.unsubscribe();
      }else{
        this._showing.unsubscribe(callback);
      }
      return this;
    },
    hookShowingAfter: function(callback){
      this._showingAfter.subscribe(callback);
      return this;
    },
    hookShowingAfterOnce: function(callback){
      this._showingAfter.subscribeOnce(callback);
      return this;
    },
    unHookShowingAfter: function(callback){
      if(arguments.length === 0){
        this._showingAfter.unsubscribe();
      }else{
        this._showingAfter.unsubscribe(callback);
      }
      return this;
    },
    hookHiding: function(callback){
      this._hiding.subscribe(callback);
      return this;
    },
    hookHidingOnce: function(callback){
      this._hiding.subscribeOnce(callback);
      return this;
    },
    unHookHiding: function(callback){
      if(arguments.length === 0){
        this._hiding.unsubscribe();
      }else{
        this._hiding.unsubscribe(callback);
      }
      return this;
    },
    hookHidingAfter: function(callback){
      this._hidingAfter.subscribe(callback);
      return this;
    },
    hookHidingAfterOnce: function(callback){
      this._hidingAfter.subscribeOnce(callback);
      return this;
    },
    unHookHidingAfter: function(callback){
      if(arguments.length === 0){
        this._hidingAfter.unsubscribe();
      }else{
        this._hidingAfter.unsubscribe(callback);
      }
      return this;
    },
    hookDisposed: function(callback){
      this._disposed.subscribe(callback);
      return this;
    },
    unHookDisposed: function(callback){
      if(arguments.length === 0){
        this._disposed.unsubscribe();
      }else{
        this._disposed.unsubscribe(callback);
      }
      return this;
    }
  }
  
  global.GM || (global.GM = {});
  global.GM.ui || (global.GM.ui = {});
  global.GM.ui.Lightbox = Lightbox;
}(this, jQuery));