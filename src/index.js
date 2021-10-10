'use strict';

const _ = require('./lodash'); // our local, smaller version

const DEFAULT_SETTINGS = {
   escape: /<%-([\s\S]+?)%>/g,
   interpolate: /<%=([\s\S]+?)%>/g,
   loop: /<%\[([^\]]+?)\sas\s([^\]]+?)]([\s\S]+?);%>/g,
};

const ESCAPE_ENTITIES = {
   '&': '&amp;',
   '<': '&lt;',
   '>': '&gt;',
   '"': '&quot;',
   "'": '&#x27;', // eslint-disable-line quotes
   '`': '&#x60;',
};

function getValue(path, data) {
   return _.get(data, _.trim(path), '');
}

function escapeHTML(str) {
   let pattern = '(?:' + _.keys(ESCAPE_ENTITIES).join('|') + ')',
       testRegExp = new RegExp(pattern),
       replaceRegExp = new RegExp(pattern, 'g');

   if (testRegExp.test(str)) {
      return str.replace(replaceRegExp, function(match) {
         return ESCAPE_ENTITIES[match];
      });
   }

   return str;
}

function compile(text, userSettings) {
   let parts = [],
       index = 0,
       settings = _.defaults({}, userSettings, DEFAULT_SETTINGS),
       regExpPattern, matcher;

   regExpPattern = [
      settings.escape.source,
      settings.interpolate.source,
      settings.loop.source,
   ];
   matcher = new RegExp(regExpPattern.join('|') + '|$', 'g');

   // eslint-disable-next-line max-params
   text.replace(matcher, function(match, escape, interpolate, loop, alias, template, offset) {
      parts.push(text.slice(index, offset));
      index = offset + match.length;

      if (escape) {
         parts.push(function(data) {
            return escapeHTML(getValue(escape, data));
         });
      } else if (interpolate) {
         parts.push(getValue.bind(null, interpolate));
      } else if (loop && alias) {
         let subTemplate = compile(template, userSettings);

         parts.push(function(data) {
            let raw = getValue(loop, data),
                list = Array.isArray(raw) ? raw : Object.values(raw);

            return _.reduce(list, function(str, item) {
               let value = _.defaults({}, data);

               value[alias] = item;
               return str + subTemplate(value);
            }, '');
         });
      }
   });

   return function(data) {
      return _.reduce(parts, function(str, part) {
         return str + (_.isFunction(part) ? part(data) : part);
      }, '');
   };
}

module.exports = compile;
