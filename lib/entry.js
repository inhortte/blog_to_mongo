'use strict';

function Entry() {
  var that = this;

  // private
  var created_at = function() {
    if('date' in that) {
      var re = that.date.length === 10 ? /^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/ : /^(\d\d\d\d)(\d\d)(\d\d)$/;
      var m = re.exec(that.date);
      if(m) {
        if(m[4] === undefined) {
          return(new Date(m[1], m[2], m[3]));
        } else {
          return(new Date(m[1], m[2], m[3], m[4], m[5]));
        }
      } else {
        return(new Date());
      }
    } else {
      return(new Date());
    }
  };

  // privileged
  this.regurgitate = function() {
    var doc = {created_at: created_at(), entry: this.entry, subject: this.subject};
    if('_id' in this) { doc._id = this._id; }
    return doc;
  };
}
Entry.prototype.add = function(key, value) {
  this[key] = value;
};
Entry.prototype.delete = function(key) {
  delete this[key];
};

module.exports = new Entry();
