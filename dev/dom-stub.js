/* Minimal DOM stub so app.js can be executed headlessly via osascript -l JavaScript.
   It is deliberately strict: any unknown element lookup or missing node throws,
   which is exactly the class of bug we want to catch. */

var __log = [];
function __out(s) { __log.push(s); }

function ClassList(el) {
  this._el = el;
  this._set = {};
}
ClassList.prototype.add = function (c) { this._set[c] = true; this._sync(); };
ClassList.prototype.remove = function (c) { delete this._set[c]; this._sync(); };
ClassList.prototype.contains = function (c) { return !!this._set[c]; };
ClassList.prototype.toggle = function (c) { if (this._set[c]) this.remove(c); else this.add(c); };
ClassList.prototype._sync = function () { this._el._className = Object.keys(this._set).join(" "); };

function Element(tag) {
  this.tagName = String(tag).toUpperCase();
  this.children = [];
  this.parentNode = null;
  this.attributes = {};
  this.dataset = {};
  this.style = {
    setProperty: function (k, v) { this[k] = v; },
    _props: {},
  };
  this._text = "";
  this._className = "";
  this._listeners = {};
  this.classList = new ClassList(this);
  this.hidden = false;
  this.disabled = false;
  this.type = "";
  this.value = "";
  this.checked = false;
}

Object.defineProperty(Element.prototype, "className", {
  get: function () { return this._className; },
  set: function (v) {
    this._className = v;
    var self = this;
    this.classList._set = {};
    var bits = String(v).split(/\s+/);
    for (var i = 0; i < bits.length; i++) { if (bits[i]) self.classList._set[bits[i]] = true; }
  },
});

Object.defineProperty(Element.prototype, "textContent", {
  get: function () { return this._text; },
  set: function (v) {
    this._text = String(v);
    this.children = [];
  },
});

Element.prototype.appendChild = function (child) {
  child.parentNode = this;
  this.children.push(child);
  return child;
};
Element.prototype.append = function () {
  for (var i = 0; i < arguments.length; i++) this.appendChild(arguments[i]);
};
Element.prototype.replaceChildren = function () {
  this.children = [];
  for (var i = 0; i < arguments.length; i++) this.appendChild(arguments[i]);
};
Element.prototype.scrollIntoView = function () {};
Element.prototype.focus = function () {};
Element.prototype.click = function () {};
Element.prototype.remove = function () {
  if (this.parentNode) {
    var idx = this.parentNode.children.indexOf(this);
    if (idx !== -1) this.parentNode.children.splice(idx, 1);
    this.parentNode = null;
  }
};
Element.prototype.addEventListener = function (type, fn) {
  (this._listeners[type] = this._listeners[type] || []).push(fn);
};
Element.prototype.removeEventListener = function () {};
Element.prototype.setAttribute = function (k, v) { this.attributes[k] = String(v); };
Element.prototype.getAttribute = function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; };
Element.prototype.hasAttribute = function (k) { return this.attributes[k] !== undefined; };
Element.prototype.removeAttribute = function (k) { delete this.attributes[k]; };
Element.prototype.closest = function (sel) {
  var node = this;
  while (node) {
    if (node._matches(sel)) return node;
    node = node.parentNode;
  }
  return null;
};
Element.prototype._matches = function (sel) {
  var self = this;
  /* Compound selectors like [data-step="2"][data-delta="-1"] are one part but
     several simple selectors — all must match. */
  var compound = String(sel).match(/^(?:\[[^\]]*\]){2,}$/);
  if (compound) {
    var groups = String(sel).match(/\[[^\]]*\]/g);
    for (var g = 0; g < groups.length; g++) {
      if (!self._matches(groups[g])) return false;
    }
    return true;
  }
  var parts = String(sel).split(",");
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    var hit = false;
    if (part.charAt(0) === "[") {
      var m = part.match(/^\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]$/);
      if (m) {
        /* Browsers expose data-foo-bar as dataset.fooBar; mirror that here,
           otherwise attribute selectors silently fail to match. */
        var key = m[1].replace(/^data-/, "").replace(/-([a-z])/g, function (_, c) {
          return c.toUpperCase();
        });
        hit = (m[2] === undefined)
          ? (self.dataset[key] !== undefined)
          : (String(self.dataset[key]) === m[2]);
      }
    } else if (part.charAt(0) === "#") {
      hit = (self.attributes.id === part.slice(1));
    } else if (part === "*") {
      hit = true;
    } else {
      hit = self.classList.contains(part.slice(1)) || self.tagName === part.toUpperCase();
    }
    if (hit) return true;
  }
  return false;
};
Object.defineProperty(Element.prototype, "options", {
  get: function () {
    var out = [];
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i].tagName === "OPTION") out.push(this.children[i]);
    }
    return out;
  },
});
Element.prototype.querySelector = function (sel) {
  var parts = String(sel).trim().split(/\s+/);
  var stack = this.children.slice();
  while (stack.length) {
    var node = stack.shift();
    if (node._matches(parts[parts.length - 1])) {
      if (parts.length === 1) return node;
      var anc = node.parentNode, ok = true;
      for (var p = parts.length - 2; p >= 0; p--) {
        if (!anc || !anc._matches(parts[p])) { ok = false; break; }
        anc = anc.parentNode;
      }
      if (ok) return node;
    }
    stack = stack.concat(node.children);
  }
  return null;
};
Element.prototype.querySelectorAll = function (sel) {
  var out = [];
  var parts = String(sel).trim().split(/\s+/);
  var stack = this.children.slice();
  while (stack.length) {
    var node = stack.shift();
    if (node._matches(parts[parts.length - 1])) {
      if (parts.length === 1) out.push(node);
      else {
        var anc = node.parentNode, ok = true;
        for (var p = parts.length - 2; p >= 0; p--) {
          if (!anc || !anc._matches(parts[p])) { ok = false; break; }
          anc = anc.parentNode;
        }
        if (ok) out.push(node);
      }
    }
    stack = stack.concat(node.children);
  }
  return out;
};
/* depth-first text extraction, for asserting rendered content */
Element.prototype.__text = function () {
  var out = this._text;
  for (var i = 0; i < this.children.length; i++) out += " " + this.children[i].__text();
  return out;
};

function Document() { Element.call(this, "#document"); }
Document.prototype = Object.create(Element.prototype);
Document.prototype.constructor = Document;
Document.prototype.createElement = function (tag) { return new Element(tag); };

function buildDocument(ids) {
  var doc = new Document();
  for (var i = 0; i < ids.length; i++) {
    var el = new Element("div");
    el.setAttribute("id", ids[i]);
    doc.appendChild(el);
  }
  return doc;
}
